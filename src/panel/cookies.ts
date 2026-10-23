export type Cookie = chrome.cookies.Cookie;
export type SameSite = Cookie["sameSite"];

export interface TabContext {
  url: string;
  storeId?: string;
}

export type Scope = "url" | "site";

/** Editable representation of a cookie. */
export interface CookieDraft {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: SameSite;
  /** Seconds since epoch; undefined for session cookies. */
  expirationDate?: number;
  storeId?: string;
  partitionKey?: chrome.cookies.CookiePartitionKey;
}

export function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function cookieKey(c: Cookie): string {
  return [
    c.storeId,
    c.partitionKey ? JSON.stringify(c.partitionKey) : "",
    c.domain,
    c.path,
    c.name,
  ].join("\u0000");
}

export function cookieSize(c: Pick<Cookie, "name" | "value">): number {
  const enc = new TextEncoder();
  return enc.encode(c.name).length + enc.encode(c.value).length;
}

export function toDraft(c: Cookie): CookieDraft {
  return {
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path,
    secure: c.secure,
    httpOnly: c.httpOnly,
    sameSite: c.sameSite,
    expirationDate: c.session ? undefined : c.expirationDate,
    storeId: c.storeId,
    partitionKey: c.partitionKey,
  };
}

/** URL that the cookie API accepts as the cookie's origin. */
export function draftUrl(
  d: Pick<CookieDraft, "domain" | "path" | "secure">,
): string {
  const host = d.domain.replace(/^\./, "");
  const path = d.path.startsWith("/") ? d.path : `/${d.path}`;
  return `${d.secure ? "https" : "http"}://${host}${path}`;
}

export function sameSiteLabel(s: SameSite | undefined): string {
  switch (s) {
    case "no_restriction":
      return "None";
    case "lax":
      return "Lax";
    case "strict":
      return "Strict";
    default:
      return "";
  }
}

export async function getTabContext(tabId: number): Promise<TabContext> {
  const tab = await chrome.tabs.get(tabId);
  let storeId: string | undefined;
  try {
    const stores = await chrome.cookies.getAllCookieStores();
    storeId = stores.find((s) => s.tabIds.includes(tabId))?.id;
  } catch {
    // Fall back to the default store.
  }
  return { url: tab.url ?? "", storeId };
}

export async function fetchCookies(
  ctx: TabContext,
  scope: Scope,
): Promise<Cookie[]> {
  if (!isHttpUrl(ctx.url)) return [];
  const base = ctx.storeId ? { storeId: ctx.storeId } : {};
  const u = new URL(ctx.url);
  const queries: chrome.cookies.GetAllDetails[] = [{ ...base, url: ctx.url }];
  // Partitioned (CHIPS) cookies are only returned when the partition key is given.
  queries.push({
    ...base,
    url: ctx.url,
    partitionKey: { topLevelSite: u.origin },
  });
  if (scope === "site") {
    queries.push({ ...base, domain: u.hostname });
  }
  const results = await Promise.all(
    queries.map((q) => chrome.cookies.getAll(q).catch(() => [] as Cookie[])),
  );
  const map = new Map<string, Cookie>();
  for (const c of results.flat()) map.set(cookieKey(c), c);
  return [...map.values()];
}

export async function removeCookie(c: Cookie): Promise<void> {
  await chrome.cookies.remove({
    url: draftUrl(c),
    name: c.name,
    storeId: c.storeId,
    partitionKey: c.partitionKey,
  });
}

/**
 * Creates or updates a cookie. When the identity (name/domain/path) of an
 * existing cookie changes, the old one is removed after the new one is written.
 */
export async function saveCookie(
  draft: CookieDraft,
  original?: Cookie,
): Promise<Cookie> {
  if (!draft.name.trim()) throw new Error("Name is required");
  if (!draft.domain.trim()) throw new Error("Domain is required");
  if (!draft.path.startsWith("/")) throw new Error("Path must start with '/'");

  const hostOnly = !draft.domain.startsWith(".");
  const details: chrome.cookies.SetDetails = {
    url: draftUrl(draft),
    name: draft.name,
    value: draft.value,
    path: draft.path,
    secure: draft.secure,
    httpOnly: draft.httpOnly,
    sameSite: draft.sameSite,
    storeId: draft.storeId,
    partitionKey: draft.partitionKey,
  };
  if (!hostOnly) details.domain = draft.domain;
  if (draft.expirationDate !== undefined)
    details.expirationDate = draft.expirationDate;

  const saved = await chrome.cookies.set(details);
  if (!saved)
    throw new Error(
      chrome.runtime.lastError?.message ?? "Chrome rejected the cookie",
    );

  if (original) {
    const sameIdentity =
      original.name === saved.name &&
      original.domain === saved.domain &&
      original.path === saved.path &&
      JSON.stringify(original.partitionKey ?? null) ===
        JSON.stringify(saved.partitionKey ?? null);
    if (!sameIdentity) await removeCookie(original);
  }
  return saved;
}
