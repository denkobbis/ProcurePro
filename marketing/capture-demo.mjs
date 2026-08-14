import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "footage");

const BASE_URL = process.env.DEMO_BASE_URL || "http://localhost:3000";
const EMAIL = "admin@procurepro.test";
const PASSWORD = "Passw0rd!123";

async function login(page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

async function recordShot(browser, name, holdMs, fn, { skipLogin = false } = {}) {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: outDir, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();
  if (!skipLogin) await login(page);
  await fn(page);
  await page.waitForTimeout(holdMs);
  await context.close();
  const video = await page.video().path().catch(() => null);
  console.log(`shot "${name}" ->`, video);
}

async function main() {
  const browser = await chromium.launch();

  await recordShot(browser, "01_dashboard", 6000, async (page) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState("networkidle");
  });

  await recordShot(browser, "02_new_request", 9000, async (page) => {
    await page.goto(`${BASE_URL}/requests/new`);
    await page.waitForLoadState("networkidle");
    await page.fill('textarea[name="description"]', "5x Toyota Hilux replacement tyres, 265/65R17");
    await page.fill('input[name="category"]', "Equipment & Tools");
    await page.fill('input[name="qty"]', "5");
    await page.fill('input[name="est_unit_cost"]', "185000");
    await page.click('button[type="submit"]');
    await page.waitForLoadState("networkidle");
  });

  await recordShot(browser, "03_request_detail", 6000, async (page) => {
    await page.goto(`${BASE_URL}/requests`);
    await page.waitForLoadState("networkidle");
    const first = page.locator('a[href^="/requests/"]').first();
    await first.click();
    await page.waitForLoadState("networkidle");
  });

  await recordShot(browser, "04_rfq_detail", 6000, async (page) => {
    await page.goto(`${BASE_URL}/rfqs`);
    await page.waitForLoadState("networkidle");
    const first = page.locator('a[href^="/rfqs/"]').first();
    await first.click();
    await page.waitForLoadState("networkidle");
  });

  await recordShot(browser, "05_po_detail", 10000, async (page) => {
    await page.goto(`${BASE_URL}/purchase-orders`);
    await page.waitForLoadState("networkidle");
    const first = page.locator('a[href^="/purchase-orders/"]').first();
    await first.click();
    await page.waitForLoadState("networkidle");
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(1500);
    await page.mouse.wheel(0, 600);
  });

  await recordShot(browser, "06_budgets", 6000, async (page) => {
    await page.goto(`${BASE_URL}/budgets`);
    await page.waitForLoadState("networkidle");
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
    { skipLogin: true }
  );

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
