import { useMemo, useRef, useState } from "preact/hooks";
import { CookieDetail } from "./CookieDetail";
import { CookieTable, sortCookies, type SortState } from "./CookieTable";
import {
  cookieKey,
  isHttpUrl,
  removeCookie,
  type Cookie,
  type CookieDraft,
  type Scope,
} from "./cookies";
import { buildFilter } from "./filter";
import { useCookieData } from "./hooks";
import {
  ClearIcon,
  CloseIcon,
  CookieIcon,
  CopyIcon,
  GithubIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  TrashIcon,
} from "./icons";

const NEW = "\u0000new";
const REPO_URL = "https://github.com/worktools/cookies-devtool";

export function App() {
  const [scope, setScope] = useState<Scope>("url");
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<SortState>({ id: "name", desc: false });
  const [selected, setSelected] = useState<string | null>(null);
  const [detailHeight, setDetailHeight] = useState(260);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const { ctx, cookies, loading, error, reload } = useCookieData(scope);
  const bodyRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => {
    const match = buildFilter(filter);
    return sortCookies(cookies.filter(match), sort);
  }, [cookies, filter, sort]);

  const selectedCookie = useMemo(
    () =>
      selected && selected !== NEW
        ? cookies.find((c) => cookieKey(c) === selected)
        : undefined,
    [cookies, selected],
  );
  const adding = selected === NEW;

  const supported = ctx ? isHttpUrl(ctx.url) : true;
  const host = ctx && supported ? new URL(ctx.url).hostname : "";

  const defaults = useMemo<CookieDraft>(
    () => ({
      name: "",
      value: "",
      domain: host,
      path: "/",
      secure: ctx?.url.startsWith("https:") ?? false,
      httpOnly: false,
      sameSite: "unspecified",
      storeId: ctx?.storeId,
    }),
    [host, ctx],
  );

  const run = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await fn();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  };

  const deleteOne = (c: Cookie) =>
    run(async () => {
      await removeCookie(c);
      if (selected === cookieKey(c)) setSelected(null);
    });

  const deleteAllShown = () => {
    setConfirmClear(false);
    run(async () => {
      await Promise.all(visible.map(removeCookie));
      setSelected(null);
    });
  };

  const copyJson = () =>
    run(() => navigator.clipboard.writeText(JSON.stringify(visible, null, 2)));

  const startResize = (e: PointerEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = detailHeight;
    const max = (bodyRef.current?.clientHeight ?? 600) - 80;
    const move = (ev: PointerEvent) =>
      setDetailHeight(
        Math.min(max, Math.max(120, startH + startY - ev.clientY)),
      );
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const emptyMessage = loading
    ? "Loading\u2026"
    : !supported
      ? "Cookies are not available for this page."
      : cookies.length
        ? "No cookies match the filter."
        : "This page has no cookies.";

  const showDetail = adding || selectedCookie !== undefined;
  const bannerError = error ?? actionError;

  return (
    <div class="app">
      <div class="toolbar">
        <button class="icon-btn" title="Refresh" onClick={reload}>
          <RefreshIcon />
        </button>
        <button
          class="icon-btn"
          title="Add cookie"
          disabled={!supported}
          onClick={() => setSelected(NEW)}
        >
          <PlusIcon />
        </button>
        <button
          class="icon-btn"
          title="Delete selected cookie"
          disabled={!selectedCookie}
          onClick={() => selectedCookie && deleteOne(selectedCookie)}
        >
          <TrashIcon />
        </button>
        <button
          class="icon-btn"
          title={
            filter.trim() ? "Delete all filtered cookies" : "Delete all cookies"
          }
          disabled={!visible.length}
          onClick={() => setConfirmClear(true)}
        >
          <ClearIcon />
        </button>
        <button
          class="icon-btn"
          title="Copy shown cookies as JSON"
          disabled={!visible.length}
          onClick={copyJson}
        >
          <CopyIcon />
        </button>
        <span class="separator" />
        <div class="filter">
          <SearchIcon />
          <input
            type="text"
            spellcheck={false}
            placeholder="Filter  (e.g. session  domain:example  -name:_ga  secure:true)"
            value={filter}
            onInput={(e) => setFilter(e.currentTarget.value)}
          />
          {filter && (
            <button
              class="icon-btn small"
              title="Clear filter"
              onClick={() => setFilter("")}
            >
              <CloseIcon />
            </button>
          )}
        </div>
        <select
          title="Which cookies to list"
          value={scope}
          onChange={(e) => setScope(e.currentTarget.value as Scope)}
        >
          <option value="url">Sent to this URL</option>
          <option value="site">Including subdomains</option>
        </select>
        <span class="spacer" />
        <a
          class="icon-btn gh-link"
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Open source on GitHub"
        >
          <GithubIcon />
        </a>
      </div>

      {confirmClear && (
        <div class="banner confirm">
          <span>
            {filter.trim()
              ? `Delete ${visible.length} filtered cookies?`
              : `Delete all ${visible.length} cookies?`}
          </span>
          <span class="spacer" />
          <button class="danger" onClick={deleteAllShown}>
            Delete
          </button>
          <button onClick={() => setConfirmClear(false)}>Cancel</button>
        </div>
      )}

      {bannerError && (
        <div class="banner">
          <span>{bannerError}</span>
          <button class="icon-btn small" onClick={() => setActionError(null)}>
            <CloseIcon />
          </button>
        </div>
      )}

      <div class="body" ref={bodyRef}>
        <CookieTable
          cookies={visible}
          selectedKey={selected}
          sort={sort}
          onSort={setSort}
          onSelect={setSelected}
          onDelete={deleteOne}
          emptyMessage={emptyMessage}
        />
        {showDetail && (
          <>
            <div class="splitter" onPointerDown={startResize} />
            <div style={{ height: `${detailHeight}px` }} class="detail-wrap">
              <CookieDetail
                key={selected}
                cookie={selectedCookie}
                defaults={defaults}
                onSaved={(c) => setSelected(cookieKey(c))}
                onDelete={deleteOne}
                onClose={() => setSelected(null)}
              />
            </div>
          </>
        )}
      </div>

      <div class="statusbar">
        <CookieIcon />
        <span>
          {visible.length === cookies.length
            ? `${cookies.length} cookies`
            : `${visible.length} of ${cookies.length} cookies`}
        </span>
        {host && <span class="host">{host}</span>}
      </div>
    </div>
  );
}
