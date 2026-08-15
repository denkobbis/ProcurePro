// Adds 10 more realistic purchase requests through the real app (not raw
// DB inserts) so request numbering, budget checks, and approval-chain
// materialization all run exactly as they would for a real user. Approves a
// few along the way so requests/rfqs/purchase-orders/budgets pages have more
// than one or two rows to show in demos and screenshots.
//
// Usage: node scripts/generate-test-data.mjs
// Requires the dev server running at http://localhost:3000 (or set
// DEMO_BASE_URL) and the seeded test users from scripts/seed.mjs.
//
// NOTE: uses waitUntil "load" everywhere, not "networkidle" — this app keeps
// persistent WebSocket connections open (Next.js dev HMR client, at least),
// which "networkidle" waits forever for and hangs indefinitely.

import { chromium } from "playwright";

const BASE_URL = process.env.DEMO_BASE_URL || "http://localhost:3000";
const PASSWORD = "Passw0rd!123";
const NAV_TIMEOUT = 20000;

const REQUESTS = [
  { description: "3x Diesel generator, 60kVA, silent canopy", category: "Equipment & Tools", qty: 3, est_unit_cost: 4200000, urgency: "high" },
  { description: "Flexible hose coupling set, 4-inch, Camlock", category: "Equipment & Tools", qty: 20, est_unit_cost: 45000, urgency: "normal" },
  { description: "Safety helmets, ANSI Z89.1 rated, hi-vis orange", category: "Office Supplies", qty: 50, est_unit_cost: 8500, urgency: "low" },
  { description: "A4 printer paper, 80gsm, box of 5 reams", category: "Office Supplies", qty: 15, est_unit_cost: 6200, urgency: "low" },
  { description: "Pipeline pressure gauge, 0-5000psi, 316SS body", category: "Equipment & Tools", qty: 8, est_unit_cost: 62000, urgency: "normal" },
  { description: "Portable gas detector, 4-gas, calibration kit included", category: "Equipment & Tools", qty: 6, est_unit_cost: 195000, urgency: "high" },
  { description: "Office chairs, ergonomic, adjustable armrest", category: "Office Supplies", qty: 12, est_unit_cost: 38000, urgency: "normal" },
  { description: "Wellhead isolation valve, 5000psi, API 6A", category: "Subsea Fittings", qty: 2, est_unit_cost: 1850000, urgency: "critical" },
  { description: "Anti-corrosion pipe coating, 20L drum", category: "Equipment & Tools", qty: 10, est_unit_cost: 78000, urgency: "normal" },
  { description: "Laptop docking stations, dual monitor support", category: "Office Supplies", qty: 8, est_unit_cost: 54000, urgency: "low" },
];

async function goto(page, path) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "load", timeout: NAV_TIMEOUT });
  await page.waitForTimeout(400);
}

// Each login gets its own fresh context — reusing one page/context across
// different users breaks, because the middleware redirects an already-
// authenticated session away from /login before the form ever renders.
async function loginAsNewContext(browser, email) {
  const context = await browser.newContext();
  const page = await context.newPage();
  console.log(`  [debug] navigating to /login for ${email}`);
  await goto(page, "/login");
  console.log(`  [debug] login page loaded, filling form`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]', { timeout: 10000 });
  console.log(`  [debug] submitted login, waiting for /dashboard`);
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  console.log(`  [debug] logged in as ${email}`);
  return { context, page };
}

async function approveAll(page, label, limit = Infinity) {
  console.log(`  [debug] navigating to /approvals`);
  await goto(page, "/approvals");
  console.log(`  [debug] /approvals loaded`);
  let approved = 0;
  while (approved < limit) {
    const btn = page.locator('form:has(input[value="approved"]) button').first();
    const n = await btn.count();
    console.log(`  [debug] approve buttons visible: ${n}`);
    if (!n) break;
    await btn.click({ timeout: 10000 });
    console.log(`  [debug] clicked approve #${approved + 1}, waiting for reload`);
    await page.waitForLoadState("load", { timeout: NAV_TIMEOUT });
    await page.waitForTimeout(400);
    approved++;
  }
  console.log(`  ${label}: approved ${approved} request(s)`);
}

async function main() {
  const browser = await chromium.launch();

  if (process.env.SKIP_SUBMIT !== "1") {
    console.log("Submitting 10 new requests as requester@procurepro.test...");
    const { context: requesterCtx, page } = await loginAsNewContext(browser, "requester@procurepro.test");
    for (const r of REQUESTS) {
      try {
        await goto(page, "/requests/new");
        await page.fill('textarea[name="description"]', r.description, { timeout: 10000 });
        await page.fill('input[name="category"]', r.category);
        await page.selectOption('select[name="urgency"]', r.urgency);
        await page.fill('input[name="qty"]', String(r.qty));
        await page.fill('input[name="est_unit_cost"]', String(r.est_unit_cost));
        // Scoped to the request form specifically — a generic button[type="submit"]
        // selector also matches the Header's "Sign out" button, which sits earlier
        // in the DOM and was intermittently getting clicked instead.
        await page.click('#new-request-form button[type="submit"]');
        await page.waitForLoadState("load", { timeout: NAV_TIMEOUT });
        await page.waitForTimeout(400);
        console.log(`  submitted: ${r.description}`);
      } catch (err) {
        console.log(`  FAILED on "${r.description}": ${err.message}`);
      }
    }
    await requesterCtx.close();
  } else {
    console.log("SKIP_SUBMIT=1 — skipping request submission, running approvals only.");
  }

  console.log("Approving step-1 items as approver@procurepro.test...");
  const { context: approverCtx, page: approverPage } = await loginAsNewContext(browser, "approver@procurepro.test");
  await approveAll(approverPage, "approver step");
  await approverCtx.close();

  console.log("Approving step-2/finance items as admin@procurepro.test...");
  const { context: adminCtx, page: adminPage } = await loginAsNewContext(browser, "admin@procurepro.test");
  await approveAll(adminPage, "finance step");
  await adminCtx.close();

  console.log("Done. Reports, budgets, and approvals pages now have more data.");
  await browser.close();
}

const HARD_TIMEOUT_MS = 90000;
Promise.race([
  main(),
  new Promise((_, reject) => setTimeout(() => reject(new Error(`Hard timeout after ${HARD_TIMEOUT_MS}ms — script is stuck somewhere`)), HARD_TIMEOUT_MS)),
]).catch((err) => {
  console.error(err);
  process.exit(1);
});
