// Tight, legible crops of the real (redesigned) app UI for the landing page —
// element/region screenshots instead of shrinking full-page captures, so text
// stays readable at the display size the landing page actually uses.
import { chromium } from "playwright";
import path from "node:path";

const BASE_URL = process.env.DEMO_BASE_URL || "http://localhost:3000";
const PASSWORD = "Passw0rd!123";
const OUT_DIR = path.join(process.cwd(), "public", "landing");
const PO_ID = "1d8349cb-321d-4792-b85d-e09542aa7148"; // PO-000006, has an FX flag

async function goto(page, p) {
  await page.goto(`${BASE_URL}${p}`, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(500);
}

async function clipShot(page, name, selector, { maxHeight, pad = 0 } = {}) {
  const el = page.locator(selector).first();
  await el.waitFor({ state: "visible", timeout: 15000 });
  const box = await el.boundingBox();
  if (!box) throw new Error(`No bounding box for ${selector} on ${name}`);
  const clip = {
    x: Math.max(0, box.x - pad),
    y: Math.max(0, box.y - pad),
    width: box.width + pad * 2,
    height: maxHeight ? Math.min(box.height, maxHeight) + pad * 2 : box.height + pad * 2,
  };
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), clip });
  console.log(`captured ${name} (${Math.round(clip.width)}x${Math.round(clip.height)})`);
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  await goto(page, "/login");
  await page.fill('input[name="email"]', "admin@procurepro.test");
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });

  // Hero: the full "Today" content column (loop + needs-you-today + rail),
  // sidebar/topbar excluded since we target the content div directly.
  await goto(page, "/dashboard");
  await clipShot(page, "v2_hero_today", "main > div");

  // Card: request list — tabs, stage bars, a handful of rows.
  await goto(page, "/requests");
  await clipShot(page, "v2_requests_list", "main .rounded-lg.border.border-zinc-200.bg-white.shadow-sm", { maxHeight: 460 });

  // Card: AI autofill widget on the new-request form.
  await goto(page, "/requests/new");
  await clipShot(page, "v2_ai_extract", "main .border-dashed.border-brand-300");

  // Card: "Needs you today" ranked queue (the smart-alerts merge).
  await goto(page, "/dashboard");
  await clipShot(page, "v2_needs_you_today", "div.rounded-lg.border.border-zinc-200.bg-white.shadow-sm:has-text('Needs you today')", { maxHeight: 360 });

  // Card: PO landed-cost plate + FX warning (the reference record screen's aside).
  await goto(page, `/purchase-orders/${PO_ID}`);
  await clipShot(page, "v2_landed_cost", "div.bg-brand-950");

  // Card: RFQ quote comparison — Recommended/Cheapest/Fastest badges.
  await goto(page, "/rfqs/9e8240e8-80ba-48b8-bdfe-df4ffceab201");
  await clipShot(page, "v2_quote_compare", "main .rounded-lg.border.border-zinc-200.bg-white.shadow-sm");

  // Card: vendor list — NCDMB + shared-account badges.
  await goto(page, "/vendors");
  await clipShot(page, "v2_vendors", "main .rounded-lg.border.border-zinc-200.bg-white.shadow-sm", { maxHeight: 420 });

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
