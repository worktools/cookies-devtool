import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import {
  fetchCookies,
  getTabContext,
  type Cookie,
  type Scope,
  type TabContext,
} from "./cookies";

export interface CookieData {
  ctx: TabContext | null;
  cookies: Cookie[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Loads cookies of the inspected tab and keeps them in sync with the browser. */
export function useCookieData(scope: Scope): CookieData {
  const tabId = chrome.devtools.inspectedWindow.tabId;
  const [ctx, setCtx] = useState<TabContext | null>(null);
  const [cookies, setCookies] = useState<Cookie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const reload = useCallback(async () => {
    const id = ++seq.current;
    try {
      const c = await getTabContext(tabId);
      const list = await fetchCookies(c, scope);
      if (id !== seq.current) return;
      setCtx(c);
      setCookies(list);
      setError(null);
    } catch (e) {
      if (id === seq.current)
        setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [tabId, scope]);

  useEffect(() => {
    reload();
    let timer: number | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = window.setTimeout(reload, 80);
    };
    const onTab = (id: number, info: chrome.tabs.OnUpdatedInfo) => {
      if (id === tabId && (info.url || info.status === "complete")) schedule();
    };
    chrome.cookies.onChanged.addListener(schedule);
    chrome.tabs.onUpdated.addListener(onTab);
    chrome.devtools.network.onNavigated.addListener(schedule);
    return () => {
      clearTimeout(timer);
      chrome.cookies.onChanged.removeListener(schedule);
      chrome.tabs.onUpdated.removeListener(onTab);
      chrome.devtools.network.onNavigated.removeListener(schedule);
    };
  }, [reload, tabId]);

  return { ctx, cookies, loading, error, reload };
}
