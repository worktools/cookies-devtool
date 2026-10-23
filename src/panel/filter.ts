import { cookieSize, sameSiteLabel, type Cookie } from "./cookies";

type Matcher = (c: Cookie) => boolean;

const FIELDS: Record<string, (c: Cookie) => string> = {
  name: (c) => c.name,
  value: (c) => c.value,
  domain: (c) => c.domain,
  path: (c) => c.path,
  samesite: (c) => sameSiteLabel(c.sameSite),
  size: (c) => String(cookieSize(c)),
  secure: (c) => String(c.secure),
  httponly: (c) => String(c.httpOnly),
  session: (c) => String(c.session),
};

/** Splits on whitespace but keeps "quoted phrases" together. */
function tokenize(input: string): string[] {
  const out: string[] = [];
  const re = /(?:[^\s"]+|"[^"]*")+/g;
  for (const m of input.matchAll(re)) out.push(m[0].replace(/"/g, ""));
  return out;
}

function compile(token: string): Matcher | null {
  let negate = false;
  if (token.startsWith("-") && token.length > 1) {
    negate = true;
    token = token.slice(1);
  }
  const wrap = (m: Matcher): Matcher => (negate ? (c) => !m(c) : m);

  const colon = token.indexOf(":");
  if (colon > 0) {
    const key = token.slice(0, colon).toLowerCase();
    const want = token.slice(colon + 1).toLowerCase();
    const getter = FIELDS[key];
    if (getter) {
      if (!want) return null;
      const exact =
        key === "secure" ||
        key === "httponly" ||
        key === "session" ||
        key === "size";
      return wrap((c) => {
        const v = getter(c).toLowerCase();
        return exact ? v === want : v.includes(want);
      });
    }
  }
  const needle = token.toLowerCase();
  return wrap((c) =>
    [c.name, c.value, c.domain, c.path].some((s) =>
      s.toLowerCase().includes(needle),
    ),
  );
}

/**
 * Filter syntax: free text matches name/value/domain/path; `field:text`
 * restricts to one field (name, value, domain, path, samesite, size, secure,
 * httponly, session); a leading `-` negates a term. Terms are AND-ed.
 */
export function buildFilter(input: string): Matcher {
  const matchers = tokenize(input.trim())
    .map(compile)
    .filter((m): m is Matcher => m !== null);
  if (!matchers.length) return () => true;
  return (c) => matchers.every((m) => m(c));
}
