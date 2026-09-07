// UI verification: boots a production server (next dev holds a per-project
// lock, and the launch-managed dev server owns it) in mock-metadata mode on a
// scratch SQLite DB, then drives the full admin flow (login, search, log,
// privacy, edit, delete) and the public SSR pages at desktop + iPhone 13
// viewports. Run: npm run verify-ui (builds first)   Shots: /tmp/almanac-shots/
import { spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { chromium, devices } from "playwright";

const PORT = 4311;
const BASE = `http://localhost:${PORT}`;
const SHOTS = "/tmp/almanac-shots";
const DB = `/tmp/almanac-verify.db`;
const CREDS = { username: "admin", password: "verify-pass" };

let failures = 0;
const pass = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => {
  failures++;
  console.error(`  ✗ ${msg}`);
};
const check = async (msg, fn) => {
  try {
    await fn();
    pass(msg);
  } catch (e) {
    fail(`${msg} — ${e.message.split("\n")[0]}`);
  }
};

function startServer() {
  for (const f of [DB, `${DB}-wal`, `${DB}-shm`]) rmSync(f, { force: true });
  const proc = spawn("npm", ["run", "start", "--", "-p", String(PORT)], {
    env: {
      ...process.env,
      METADATA_MOCK: "1",
      DATABASE_PATH: DB,
      ADMIN_USERNAME: CREDS.username,
      ADMIN_PASSWORD: CREDS.password,
    },
    stdio: "ignore",
    detached: true,
  });
  return proc;
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(BASE);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`server never came up on :${PORT}`);
}

async function login(page) {
  await page.goto(`${BASE}/admin`);
  await page.getByLabel("Username").fill(CREDS.username);
  await page.getByLabel("Password").fill(CREDS.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("heading", { name: "Log" }).waitFor();
}

async function desktopFlow(browser) {
  console.log("desktop (1280×800):");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  await check("anon home shows empty diary, no Log nav", async () => {
    await page.goto(BASE);
    await page.getByRole("heading", { name: "Diary" }).waitFor();
    await page.getByText("Nothing logged yet").waitFor();
    if (await page.getByRole("link", { name: "Log" }).isVisible())
      throw new Error("Log nav visible while anonymous");
  });

  await check("/admin redirects to login; login succeeds", async () => {
    await page.goto(`${BASE}/admin`);
    await page.waitForURL("**/admin/login");
    await login(page);
  });

  await check("mock film search + log with 4.5-star rating", async () => {
    await page.getByLabel("Search titles").fill("blade");
    await page.getByRole("button", { name: "Log Blade Runner 2049" }).click();
    await page.getByRole("radio", { name: "Rate 4.5 stars" }).click();
    await page.getByRole("button", { name: "Log it" }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
  });

  await check("TV drills into seasons; private log", async () => {
    await page.getByLabel("Media type").click();
    await page.getByRole("option", { name: "TV" }).click();
    await page.getByLabel("Search titles").fill("severance");
    await page.getByRole("button", { name: "Seasons of Severance" }).click();
    await page.getByRole("button", { name: "Log Severance Season 1" }).click();
    await page.getByText("Private — hide from the public site").click();
    await page.getByRole("button", { name: "Log it" }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
  });

  await check("admin diary shows both entries, private badge", async () => {
    await page.goto(BASE);
    await page.getByRole("link", { name: "Blade Runner 2049" }).waitFor();
    await page.getByRole("link", { name: "Severance — Season 1" }).waitFor();
    await page.getByLabel("Private entry").waitFor();
    await page.screenshot({ path: `${SHOTS}/desktop-diary-admin.png` });
  });

  await check("filter routes split by type", async () => {
    await page.goto(`${BASE}/movies`);
    await page.getByRole("link", { name: "Blade Runner 2049" }).waitFor();
    if (await page.getByRole("link", { name: "Severance — Season 1" }).isVisible())
      throw new Error("season leaked into /movies");
    await page.goto(`${BASE}/shows`);
    await page.getByRole("link", { name: "Severance — Season 1" }).waitFor();
  });

  await check("item page renders details + external ratings", async () => {
    await page.goto(BASE);
    await page.getByRole("link", { name: "Blade Runner 2049" }).first().click();
    await page.getByText("A mock synopsis").waitFor();
    await page.getByText("IMDb 8.0/10").waitFor();
    await page.getByText("Rotten Tomatoes 88%").waitFor();
    await page.screenshot({ path: `${SHOTS}/desktop-item.png` });
  });

  await check("anon sees public entry but not private one", async () => {
    const anon = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const anonPage = await anon.newPage();
    await anonPage.goto(BASE);
    await anonPage.getByRole("link", { name: "Blade Runner 2049" }).waitFor();
    if (await anonPage.getByRole("link", { name: "Severance — Season 1" }).isVisible())
      throw new Error("private entry visible to anonymous");
    await anonPage.screenshot({ path: `${SHOTS}/desktop-diary-anon.png` });
    await anon.close();
  });

  await check("edit entry: bump rating to 5", async () => {
    await page.goto(BASE);
    await page.getByLabel("Edit entry for Blade Runner 2049").click();
    await page.getByRole("radio", { name: "Rate 5 stars" }).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.getByText("Rated 5 out of 5").waitFor();
  });

  await check("delete entry with inline confirm", async () => {
    await page.getByLabel("Edit entry for Severance — Season 1").click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("button", { name: "Confirm delete" }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page
      .getByRole("link", { name: "Severance — Season 1" })
      .waitFor({ state: "detached" });
  });

  await ctx.close();
}

async function mobileFlow(browser) {
  console.log("mobile (iPhone 13):");
  const ctx = await browser.newContext(devices["iPhone 13"]);
  const page = await ctx.newPage();

  await check("home renders with filter pills", async () => {
    await page.goto(BASE);
    await page.getByRole("heading", { name: "Diary" }).waitFor();
    await page.getByRole("navigation", { name: "Filter by media type" }).waitFor();
    await page.getByRole("link", { name: "Blade Runner 2049" }).waitFor();
    await page.screenshot({ path: `${SHOTS}/mobile-diary.png` });
  });

  await check("item page fits viewport", async () => {
    await page.getByRole("link", { name: "Blade Runner 2049" }).first().click();
    await page.getByText("A mock synopsis").waitFor();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    if (overflow) throw new Error("horizontal overflow on item page");
    await page.screenshot({ path: `${SHOTS}/mobile-item.png` });
  });

  await ctx.close();
}

mkdirSync(SHOTS, { recursive: true });
const server = startServer();
try {
  await waitForServer();
  const browser = await chromium.launch();
  await desktopFlow(browser);
  await mobileFlow(browser);
  await browser.close();
} finally {
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {}
}

console.log(failures === 0 ? `\nall checks passed — shots in ${SHOTS}` : `\n${failures} check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
