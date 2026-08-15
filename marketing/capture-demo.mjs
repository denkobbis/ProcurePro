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

// Routes to hit once, unrecorded, before filming — Next.js dev (Turbopack)
// compiles each route on first request, and that compile time was previously
// getting baked into the start of every recorded clip. Warming them here is
// what actually fixes the long loading pauses, not just skipping login.
const AUTHED_ROUTES_TO_WARM = ["/dashboard", "/requests/new", "/requests", "/rfqs", "/purchase-orders", "/budgets"];

async function warmUp(browser) {
  // Unauthenticated: compile the public landing page + login page.
  const publicCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const publicPage = await publicCtx.newPage();
  await publicPage.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
  await publicPage.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });

  // Authenticated: log in, compile every route we'll film, then save the
  // session so recorded shots can skip the login screen entirely.
  await publicPage.fill('input[name="email"]', EMAIL);
  await publicPage.fill('input[name="password"]', PASSWORD);
  await publicPage.click('button[type="submit"]');
  await publicPage.waitForURL(/\/dashboard/, { timeout: 15000 });

  for (const route of AUTHED_ROUTES_TO_WARM) {
    await publicPage.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle" });
  }
  // Also warm one dynamic detail route of each kind (request/rfq/PO) since
  // [id] pages compile separately from their list pages.
  for (const listPath of ["/requests", "/rfqs", "/purchase-orders"]) {
    await publicPage.goto(`${BASE_URL}${listPath}`, { waitUntil: "networkidle" });
    const first = publicPage.locator(`a[href^="${listPath}/"]`).first();
    if (await first.count()) {
      await first.click();
      await publicPage.waitForLoadState("networkidle");
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
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
  });

  await recordShot(browser, "02_new_request", 9000, async (page) => {
    await page.goto(`${BASE_URL}/requests/new`, { waitUntil: "networkidle" });
    await page.fill('textarea[name="description"]', "5x Toyota Hilux replacement tyres, 265/65R17");
    await page.fill('input[name="category"]', "Equipment & Tools");
    await page.fill('input[name="qty"]', "5");
    await page.fill('input[name="est_unit_cost"]', "185000");
    // Scoped to the request form — a generic button[type="submit"] selector
    // also matches the Header's "Sign out" button (same type, earlier in DOM).
    await page.click('#new-request-form button[type="submit"]');
    await page.waitForLoadState("networkidle");
  });

  await recordShot(browser, "03_request_detail", 6000, async (page) => {
    await page.goto(`${BASE_URL}/requests`, { waitUntil: "networkidle" });
    const first = page.locator('a[href^="/requests/"]').first();
    await first.click();
    await page.waitForLoadState("networkidle");
  });

  await recordShot(browser, "04_rfq_detail", 6000, async (page) => {
    await page.goto(`${BASE_URL}/rfqs`, { waitUntil: "networkidle" });
    const first = page.locator('a[href^="/rfqs/"]').first();
    await first.click();
    await page.waitForLoadState("networkidle");
  });

  await recordShot(browser, "05_po_detail", 10000, async (page) => {
    await page.goto(`${BASE_URL}/purchase-orders`, { waitUntil: "networkidle" });
    const first = page.locator('a[href^="/purchase-orders/"]').first();
    await first.click();
    await page.waitForLoadState("networkidle");
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(1500);
    await page.mouse.wheel(0, 600);
  });

  await recordShot(browser, "06_budgets", 6000, async (page) => {
    await page.goto(`${BASE_URL}/budgets`, { waitUntil: "networkidle" });
  });

  await recordShot(
    browser,
    "07_landing_pricing",
    5000,
    async (page) => {
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
      const pricing = page.locator("#pricing");
      if (await pricing.count()) await pricing.scrollIntoViewIfNeeded();
    },
    { authenticated: false }
  );

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
