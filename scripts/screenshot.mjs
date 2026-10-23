// Renders the built panel against a mocked `chrome` API and saves screenshots to docs/.
// Usage: npm run build && npm run screenshot  (needs Google Chrome; override with CHROME_PATH)
import { createServer } from "node:http";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "dist");
const chromePath = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };
const server = createServer((req, res) => {
  const rel = normalize(new URL(req.url, "http://x").pathname).replace(/^(\.\.[/\\])+/, "");
  const file = join(dist, rel);
  if (!file.startsWith(dist) || !existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "content-type": mime[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const { port } = server.address();

function installMock(theme) {
  const day = 86400;
  const t0 = Date.UTC(2026, 9, 23) / 1000;
  const mk = (name, value, o = {}) => ({
    name,
    value,
    domain: ".example.com",
    path: "/",
    secure: false,
    httpOnly: false,
    sameSite: "unspecified",
    session: o.expirationDate === undefined,
    hostOnly: false,
    storeId: "0",
    ...o,
  });
  const cookies = [
    mk("_ga", "GA1.2.1843726512.1761177600", { expirationDate: t0 + 400 * day }),
    mk("_gid", "GA1.2.920114358.1761177600", { expirationDate: t0 + day }),
    mk("session_id", "9f2b7c1e5a4d4c0b8e6f3a21d7c95b10", {
      domain: "www.example.com",
      hostOnly: true,
      secure: true,
      httpOnly: true,
      sameSite: "lax",
    }),
    mk("access_token", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MjQyIiwibmFtZSI6IkpvbiJ9.sig", {
      secure: true,
      httpOnly: true,
      sameSite: "strict",
      expirationDate: t0 + 7 * day,
    }),
    mk("csrftoken", "kP3x9QfWm2LzR8vYb1NcA6dTe0HsUj4G", { secure: true, sameSite: "lax", expirationDate: t0 + 365 * day }),
    mk("theme", "dark", { domain: "www.example.com", hostOnly: true, path: "/dashboard", expirationDate: t0 + 180 * day }),
    mk("locale", "zh-CN", { expirationDate: t0 + 365 * day }),
    mk("consent", "analytics%3Dtrue%26ads%3Dfalse", { sameSite: "no_restriction", secure: true, expirationDate: t0 + 180 * day }),
    mk("__Host-pref", "compact", { domain: "www.example.com", hostOnly: true, secure: true, sameSite: "lax" }),
    mk("ab_bucket", "variant-b", { expirationDate: t0 + 30 * day }),
  ];
  const partitioned = mk("widget_state", "open", {
    domain: ".embed.example.net",
    secure: true,
    sameSite: "no_restriction",
    partitionKey: { topLevelSite: "https://www.example.com" },
  });
  const ev = () => ({ addListener() {}, removeListener() {} });
  window.chrome = {
    devtools: {
      inspectedWindow: { tabId: 1 },
      panels: { themeName: theme },
      network: { onNavigated: ev() },
    },
    tabs: { get: async () => ({ id: 1, url: "https://www.example.com/dashboard" }), onUpdated: ev() },
    cookies: {
      getAllCookieStores: async () => [{ id: "0", tabIds: [1] }],
      getAll: async (q) => (q.partitionKey ? [partitioned] : cookies),
      onChanged: ev(),
      set: async () => null,
      remove: async () => null,
    },
    runtime: {},
  };
}

mkdirSync(join(root, "docs"), { recursive: true });
const browser = await puppeteer.launch({ executablePath: chromePath, headless: true });
try {
  for (const theme of ["dark", "default"]) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 640, deviceScaleFactor: 2 });
    await page.evaluateOnNewDocument(installMock, theme);
    await page.goto(`http://127.0.0.1:${port}/panel.html`);
    await page.waitForSelector("tbody tr");
    await page.evaluate(() => {
      const row = [...document.querySelectorAll("tbody tr")].find((r) => r.firstElementChild?.textContent === "session_id");
      row.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    await page.waitForSelector(".detail");
    await page.focus(".table-wrap");
    const name = theme === "dark" ? "screenshot-dark.png" : "screenshot-light.png";
    await page.screenshot({ path: join(root, "docs", name) });
    console.log("saved docs/" + name);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
