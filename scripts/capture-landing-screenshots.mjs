// Recaptures the landing page's product screenshots against the now much
// richer demo data (Smart flags, real budgets, real spend charts, 7
// vendors, varied PO statuses) — the originals were captured before any of
// that existed. Same target files as before, so page.tsx needs no changes
// for the refresh itself. Also captures a new smart-flags-focused crop for
// a new feature card.
//
// Usage: node scripts/capture-landing-screenshots.mjs
// Requires the dev server running at http://localhost:3000.

import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "landing");

const BASE_URL = process.env.DEMO_BASE_URL || "http://localhost:3000";
const EMAIL = "admin@procurepro.test";
const PASSWORD = "Passw0rd!123";
const WIDTH = 2880;

async function scrollThrough(page) {
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 400) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(80);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
}

async function shot(page, path_, file, { height = 2000 } = {}) {
  await page.setViewportSize({ width: WIDTH, height });
  await page.goto(`${BASE_URL}${path_}`, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(600);
  await scrollThrough(page);
  await page.screenshot({ path: path.join(outDir, file) });
  console.log("captured", file);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(`${BASE_URL}/login`, { waitUntil: "load", timeout: 60000 });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });

  await shot(page, "/dashboard", "landing_dashboard.png", { height: 1250 });
  await shot(page, "/budgets", "landing_budgets.png", { height: 1150 });
  await shot(page, "/reports", "landing_reports.png", { height: 2400 });
  await shot(page, "/vendors", "landing_vendors.png", { height: 1150 });
  await shot(page, "/purchase-orders", "landing_po_list.png", { height: 1150 });

  // Two new AI-feature crops, screenshotting the specific panel element
  // directly for a clean, focused image rather than a full-page top-crop.
  console.log("Capturing AI feature panels...");
  await page.setViewportSize({ width: WIDTH, height: 1200 });
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(600);
  // Class-based, not text-based: :has-text() matches every ancestor div
  // containing the text, and .first() in document order grabs the
  // OUTERMOST match (e.g. <main>), not the specific card.
  const smartFlagsPanel = page.locator(".border-amber-200.bg-amber-50");
  await smartFlagsPanel.screenshot({ path: path.join(outDir, "landing_smart_flags.png") });
  console.log("captured landing_smart_flags.png");

  await page.goto(`${BASE_URL}/requests/new`, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(600);
  const aiWidget = page.locator(".border-dashed.border-brand-300");
  await aiWidget.screenshot({ path: path.join(outDir, "landing_ai_extract.png") });
  console.log("captured landing_ai_extract.png");

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
