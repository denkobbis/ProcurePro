import { chromium } from "playwright";
import { renameSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "footage");
const finalDir = path.join(__dirname, "..", "assets", "videos");
const authFile = path.join(outDir, "auth-state.json");

const BASE_URL = process.env.DEMO_BASE_URL || "http://localhost:3000";
const EMAIL = "admin@procurepro.test";
const PASSWORD = "Passw0rd!123";

// NOTE: uses waitUntil "load" everywhere, not "networkidle" — this app keeps
// persistent WebSocket connections open (Next.js dev's HMR client, at
// minimum), which "networkidle" waits forever for and hangs indefinitely.
async function goto(page, url, opts = {}) {
  await page.goto(url, { waitUntil: "load", timeout: 20000, ...opts });
  await page.waitForTimeout(400);
}

// Routes to hit once, unrecorded, before filming — Next.js dev (Turbopack)
// compiles each route on first request, and that compile time was previously
// getting baked into the start of every recorded clip. Warming them here is
// what actually fixes the long loading pauses, not just skipping login.
const AUTHED_ROUTES_TO_WARM = ["/dashboard", "/requests/new", "/requests", "/rfqs", "/purchase-orders", "/budgets"];

async function warmUp(browser) {
  // Unauthenticated: compile the public landing page + login page.
  const publicCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const publicPage = await publicCtx.newPage();
  await goto(publicPage, `${BASE_URL}/`);
  await goto(publicPage, `${BASE_URL}/login`);

  // Authenticated: log in, compile every route we'll film, then save the
  // session so recorded shots can skip the login screen entirely.
  await publicPage.fill('input[name="email"]', EMAIL);
  await publicPage.fill('input[name="password"]', PASSWORD);
  await publicPage.click('button[type="submit"]');
  await publicPage.waitForURL(/\/dashboard/, { timeout: 15000 });

  for (const route of AUTHED_ROUTES_TO_WARM) {
    await goto(publicPage, `${BASE_URL}${route}`);
  }
  // Also warm one dynamic detail route of each kind (request/rfq/PO) since
  // [id] pages compile separately from their list pages.
  for (const listPath of ["/requests", "/rfqs", "/purchase-orders"]) {
    await goto(publicPage, `${BASE_URL}${listPath}`);
    const first = publicPage.locator(`a[href^="${listPath}/"]`).first();
    if (await first.count()) {
      await first.click({ timeout: 10000 });
      await publicPage.waitForLoadState("load", { timeout: 20000 });
      await publicPage.waitForTimeout(400);
    }
  }

  await publicCtx.storageState({ path: authFile });
  await publicCtx.close();
}

async function recordShot(browser, name, holdMs, fn, { authenticated = true } = {}) {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: authenticated ? authFile : undefined,
    recordVideo: { dir: outDir, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();
  await fn(page);
  await page.waitForTimeout(holdMs);
  await context.close();
  const rawPath = await page.video().path().catch(() => null);
  if (rawPath) {
    const finalPath = path.join(finalDir, `${name}.webm`);
    renameSync(rawPath, finalPath);
    console.log(`shot "${name}" ->`, finalPath);
  }
}

async function main() {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();

  console.log("Warming up routes (compiles pages + saves auth session)...");
  await warmUp(browser);
  console.log("Warm-up done — recording should now start on already-loaded pages.");

  await recordShot(browser, "01_dashboard", 6000, async (page) => {
    await goto(page, `${BASE_URL}/dashboard`);
  });

  await recordShot(browser, "02_new_request", 9000, async (page) => {
    await goto(page, `${BASE_URL}/requests/new`);
    await page.fill('textarea[name="description"]', "5x Toyota Hilux replacement tyres, 265/65R17");
    await page.fill('input[name="category"]', "Equipment & Tools");
    await page.fill('input[name="qty"]', "5");
    await page.fill('input[name="est_unit_cost"]', "185000");
    // Scoped to the request form — a generic button[type="submit"] selector
    // also matches the Header's "Sign out" button (same type, earlier in DOM).
    await page.click('#new-request-form button[type="submit"]', { timeout: 10000 });
    await page.waitForLoadState("load", { timeout: 20000 });
    await page.waitForTimeout(400);
  });

  await recordShot(browser, "03_request_detail", 6000, async (page) => {
    await goto(page, `${BASE_URL}/requests`);
    const first = page.locator('a[href^="/requests/"]').first();
    await first.click({ timeout: 10000 });
    await page.waitForLoadState("load", { timeout: 20000 });
    await page.waitForTimeout(400);
  });

  await recordShot(browser, "04_rfq_detail", 6000, async (page) => {
    await goto(page, `${BASE_URL}/rfqs`);
    const first = page.locator('a[href^="/rfqs/"]').first();
    await first.click({ timeout: 10000 });
    await page.waitForLoadState("load", { timeout: 20000 });
    await page.waitForTimeout(400);
  });

  await recordShot(browser, "05_po_detail", 10000, async (page) => {
    await goto(page, `${BASE_URL}/purchase-orders`);
    const first = page.locator('a[href^="/purchase-orders/"]').first();
    await first.click({ timeout: 10000 });
    await page.waitForLoadState("load", { timeout: 20000 });
    await page.waitForTimeout(400);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(1500);
    await page.mouse.wheel(0, 600);
  });

  await recordShot(browser, "06_budgets", 6000, async (page) => {
    await goto(page, `${BASE_URL}/budgets`);
  });

  await recordShot(
    browser,
    "07_landing_pricing",
    5000,
    async (page) => {
      await goto(page, `${BASE_URL}/`);
      const pricing = page.locator("#pricing");
      if (await pricing.count()) await pricing.scrollIntoViewIfNeeded();
    },
    { authenticated: false }
  );

  await browser.close();
}

const HARD_TIMEOUT_MS = 300000;
Promise.race([
  main(),
  new Promise((_, reject) => setTimeout(() => reject(new Error(`Hard timeout after ${HARD_TIMEOUT_MS}ms — script is stuck somewhere`)), HARD_TIMEOUT_MS)),
]).catch((err) => {
  console.error(err);
  process.exit(1);
});
