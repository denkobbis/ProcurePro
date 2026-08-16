// Captures a full-page screenshot of every screen in the app (public pages
// + every authenticated route, using a real record for each [id] detail
// page) into screenshot/all-screens/.
//
// Usage: node scripts/capture-all-screens.mjs
// Requires the dev server running at http://localhost:3000 (or set
// DEMO_BASE_URL) and the seeded test users from scripts/seed.mjs.
//
// NOTE: uses waitUntil "load", never "networkidle" — this app keeps
// persistent WebSocket connections open, which "networkidle" waits forever
// for and hangs indefinitely (learned the hard way earlier this session).

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

const BASE_URL = process.env.DEMO_BASE_URL || "http://localhost:3000";
const PASSWORD = "Passw0rd!123";
const NAV_TIMEOUT = 90000;
const OUT_DIR = path.join(process.cwd(), "screenshot", "all-screens");

mkdirSync(OUT_DIR, { recursive: true });

async function goto(page, url) {
  await page.goto(url, { waitUntil: "load", timeout: NAV_TIMEOUT });
  await page.waitForTimeout(500);
}

async function shoot(page, name) {
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: true });
  console.log(`captured ${name}`);
}

async function firstRowHref(page, prefix) {
  const link = page.locator(`table a[href^="${prefix}"]`).first();
  if ((await link.count()) === 0) return null;
  return link.getAttribute("href");
}

async function main() {
  const browser = await chromium.launch();

  // --- Public pages ---
  const publicCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const publicPage = await publicCtx.newPage();
  await goto(publicPage, `${BASE_URL}/`);
  await shoot(publicPage, "00_landing");
  await goto(publicPage, `${BASE_URL}/login`);
  await shoot(publicPage, "01_login");
  await goto(publicPage, `${BASE_URL}/signup`);
  await shoot(publicPage, "02_signup");
  await publicCtx.close();

  // --- Authenticated pages (super_admin sees every nav item) ---
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await goto(page, `${BASE_URL}/login`);
  await page.fill('input[name="email"]', "admin@procurepro.test");
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });

  const screens = [
    { name: "03_dashboard", path: "/dashboard" },
    { name: "04_requests_list", path: "/requests" },
    { name: "05_request_new", path: "/requests/new" },
    { name: "06_approvals", path: "/approvals" },
    { name: "07_rfqs_list", path: "/rfqs" },
    { name: "08_rfq_new", path: "/rfqs/new" },
    { name: "09_purchase_orders_list", path: "/purchase-orders" },
    { name: "10_purchase_order_new", path: "/purchase-orders/new" },
    { name: "11_vendors_list", path: "/vendors" },
    { name: "12_vendor_new", path: "/vendors/new" },
    { name: "13_equipment_list", path: "/equipment" },
    { name: "14_equipment_new", path: "/equipment/new" },
    { name: "15_budgets", path: "/budgets" },
    { name: "16_reports", path: "/reports" },
    { name: "17_users", path: "/users" },
    { name: "18_billing", path: "/billing" },
    { name: "19_notifications", path: "/notifications" },
  ];

  for (const s of screens) {
    await goto(page, `${BASE_URL}${s.path}`);
    await shoot(page, s.name);
  }

  // --- Detail pages: find a real row from each list ---
  const detailTargets = [
    { listPath: "/requests", prefix: "/requests/", name: "20_request_detail" },
    { listPath: "/rfqs", prefix: "/rfqs/", name: "21_rfq_detail" },
    { listPath: "/purchase-orders", prefix: "/purchase-orders/", name: "22_purchase_order_detail" },
    { listPath: "/vendors", prefix: "/vendors/", name: "23_vendor_detail" },
    { listPath: "/equipment", prefix: "/equipment/", name: "24_equipment_detail" },
  ];

  for (const t of detailTargets) {
    await goto(page, `${BASE_URL}${t.listPath}`);
    const href = await firstRowHref(page, t.prefix);
    if (!href) {
      console.log(`skipped ${t.name} — no rows found`);
      continue;
    }
    await goto(page, `${BASE_URL}${href}`);
    await shoot(page, t.name);
  }

  await ctx.close();
  await browser.close();
  console.log(`\nDone. Screenshots saved to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
