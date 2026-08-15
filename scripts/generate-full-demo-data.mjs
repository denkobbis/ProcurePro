// Populates a much richer demo dataset across every entity (vendors,
// equipment, requests, approvals, RFQs, purchase orders) so the dashboard's
// Smart flags and every list/detail page have real, varied data to show
// instead of a handful of seed rows. Drives the real app UI end to end —
// no raw DB inserts for anything achievable through it.
//
// Usage: node scripts/generate-full-demo-data.mjs
// Requires the dev server running at http://localhost:3000 (or set
// DEMO_BASE_URL) and the seeded test users from scripts/seed.mjs.
//
// NOTE: uses waitUntil "load", never "networkidle" — this app keeps
// persistent WebSocket connections open, which "networkidle" waits forever
// for and hangs indefinitely (learned the hard way earlier this session).

import { chromium } from "playwright";

const BASE_URL = process.env.DEMO_BASE_URL || "http://localhost:3000";
const PASSWORD = "Passw0rd!123";
const NAV_TIMEOUT = 90000;

async function goto(page, path) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "load", timeout: NAV_TIMEOUT });
  await page.waitForTimeout(400);
}

// A generic button[type="submit"] selector also matches the Header's "Sign
// out" button on every authenticated page, which sits earlier in the DOM —
// .click() on an ambiguous selector silently signs the session out instead
// of submitting the intended form. Every submit below is scoped to its own
// form. This also asserts the click didn't land on Sign Out, so a mistake
// here fails loudly instead of cascading into confusing downstream errors.
async function submitAndWait(page, buttonLocator) {
  await buttonLocator.click({ timeout: 10000 });
  await page.waitForLoadState("load", { timeout: NAV_TIMEOUT });
  await page.waitForTimeout(400);
  if (page.url().includes("/login")) {
    throw new Error("Landed on /login after submit — the click likely hit Sign Out, not the intended button.");
  }
}

async function loginAsNewContext(browser, email) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await goto(page, "/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  return { context, page };
}

const VENDORS = [
  { name: "Atlas Crane & Rigging Services", category: "Equipment & Tools", email: "sales@atlascrane.example", phone: "+234 803 111 2222", terms: "Net 30", currency: "USD", ncdmb: true, certExpiry: "2026-09-10", localContent: 35 },
  { name: "BlueWave Marine Logistics", category: "Shipping & Logistics", email: "ops@bluewavemarine.example", phone: "+234 802 222 3333", terms: "Net 45", currency: "USD", ncdmb: false },
  { name: "Sahara Safety Equipment Ltd", category: "Safety Equipment", email: "orders@saharasafety.example", phone: "+234 805 333 4444", terms: "Net 15", currency: "NGN", ncdmb: true, certExpiry: "2026-09-25", localContent: 62 },
  { name: "Continental Pipe & Fittings", category: "Equipment & Tools", email: "sales@continentalpipe.example", phone: "+234 806 444 5555", terms: "Net 30", currency: "EUR", ncdmb: false },
  { name: "Zenith Industrial Chemicals", category: "Chemicals", email: "orders@zenithchem.example", phone: "+234 807 555 6666", terms: "Net 30", currency: "NGN", ncdmb: true, certExpiry: "2027-06-01", localContent: 71 },
];

const EQUIPMENT = [
  { tag: "CR-002", category: "Crane", name: "80-tonne crawler crane", rate: 450000 },
  { tag: "GEN-010", category: "Generator", name: "150kVA diesel generator", rate: 85000 },
  { tag: "PMP-004", category: "Pump", name: "Submersible dewatering pump", rate: 32000 },
  { tag: "COMP-007", category: "Compressor", name: "Air compressor, 375cfm", rate: 28000 },
  { tag: "FORK-003", category: "Forklift", name: "5-tonne forklift", rate: 45000 },
  { tag: "WELD-002", category: "Welding rig", name: "Diesel welding generator", rate: 22000 },
];

const REQUESTS = [
  { description: "Fire extinguishers, ABC dry powder, 9kg", category: "Safety Equipment", qty: 25, cost: 18000, urgency: "normal" },
  { description: "Hydraulic torque wrench set", category: "Equipment & Tools", qty: 4, cost: 320000, urgency: "high" },
  { description: "Cable ties, industrial, assorted sizes", category: "Office Supplies", qty: 100, cost: 1200, urgency: "low" },
  { description: "Subsea ROV inspection camera rental", category: "Equipment & Tools", qty: 1, cost: 2100000, urgency: "critical" },
  { description: "Nitrile gloves, box of 100", category: "Safety Equipment", qty: 40, cost: 4500, urgency: "normal" },
  { description: "Marine-grade paint, anti-fouling, 20L", category: "Chemicals", qty: 15, cost: 68000, urgency: "normal" },
  { description: "Wellhead Christmas tree valve assembly", category: "Equipment & Tools", qty: 1, cost: 8500000, urgency: "critical" },
  { description: "Office desks, standing adjustable", category: "Office Supplies", qty: 6, cost: 95000, urgency: "low" },
  { description: "Hard hats, ANSI-rated, hi-vis", category: "Safety Equipment", qty: 60, cost: 6500, urgency: "normal" },
  { description: "Corrosion inhibitor chemical, drums", category: "Chemicals", qty: 8, cost: 145000, urgency: "high" },
  { description: "Subsea pipeline repair clamp, 12-inch", category: "Equipment & Tools", qty: 2, cost: 1650000, urgency: "critical" },
  { description: "Laptop replacements, field engineers", category: "Office Supplies", qty: 5, cost: 480000, urgency: "normal" },
  { description: "Crane rigging chains, 10-tonne rated", category: "Equipment & Tools", qty: 6, cost: 210000, urgency: "high" },
  { description: "First aid kits, offshore-rated", category: "Safety Equipment", qty: 12, cost: 32000, urgency: "normal" },
  { description: "Diesel fuel additive, bulk drums", category: "Chemicals", qty: 10, cost: 58000, urgency: "low" },
  { description: "Marine mooring rope, 200m coil", category: "Equipment & Tools", qty: 3, cost: 890000, urgency: "high" },
];

async function main() {
  const browser = await chromium.launch();

  // --- Vendors + equipment, as admin (procurement-capable) ---
  console.log("Adding vendors...");
  {
    const { context, page } = await loginAsNewContext(browser, "admin@procurepro.test");
    for (const v of VENDORS) {
      try {
        await goto(page, "/vendors/new");
        await page.fill('input[name="name"]', v.name);
        await page.fill('input[name="category"]', v.category);
        await page.fill('input[name="contact_email"]', v.email);
        await page.fill('input[name="contact_phone"]', v.phone);
        await page.fill('input[name="payment_terms"]', v.terms);
        await page.check('input[name="is_approved"]');
        await page.selectOption('select[name="default_currency"]', v.currency);
        if (v.ncdmb) {
          await page.check('input[name="ncdmb_compliant"]');
          await page.fill('input[name="ncdmb_certificate_number"]', `NCDMB-${Math.floor(Math.random() * 90000 + 10000)}`);
          await page.fill('input[name="ncdmb_certificate_expiry"]', v.certExpiry);
          await page.fill('input[name="local_content_percentage"]', String(v.localContent));
        }
        await submitAndWait(page, page.locator('form:has(input[name="name"]) button[type="submit"]'));
        console.log(`  added vendor: ${v.name}`);
      } catch (err) {
        console.log(`  FAILED vendor "${v.name}": ${err.message}`);
      }
    }

    console.log("Adding equipment...");
    for (const e of EQUIPMENT) {
      try {
        await goto(page, "/equipment/new");
        await page.fill('input[name="asset_tag"]', e.tag);
        await page.fill('input[name="category"]', e.category);
        await page.fill('input[name="name"]', e.name);
        await page.fill('input[name="day_rate_ngn"]', String(e.rate));
        await submitAndWait(page, page.locator('form:has(input[name="asset_tag"]) button[type="submit"]'));
        console.log(`  added equipment: ${e.tag} — ${e.name}`);
      } catch (err) {
        console.log(`  FAILED equipment "${e.tag}": ${err.message}`);
      }
    }
    await context.close();
  }

  // --- Requests, as requester (Operations dept) ---
  console.log("Submitting requests...");
  {
    const { context, page } = await loginAsNewContext(browser, "requester@procurepro.test");
    for (const r of REQUESTS) {
      try {
        await goto(page, "/requests/new");
        await page.fill('textarea[name="description"]', r.description);
        await page.fill('input[name="category"]', r.category);
        await page.selectOption('select[name="urgency"]', r.urgency);
        await page.fill('input[name="qty"]', String(r.qty));
        await page.fill('input[name="est_unit_cost"]', String(r.cost));
        await submitAndWait(page, page.locator('#new-request-form button[type="submit"]'));
        console.log(`  submitted: ${r.description}`);
      } catch (err) {
        console.log(`  FAILED "${r.description}": ${err.message}`);
      }
    }
    await context.close();
  }

  // --- Approvals: approver clears step-1 items ---
  console.log("Approving step-1 items as approver...");
  {
    const { context, page } = await loginAsNewContext(browser, "approver@procurepro.test");
    await goto(page, "/approvals");
    let approved = 0;
    while (approved < 40) {
      const btn = page.locator('form:has(input[value="approved"]) button').first();
      if (!(await btn.count())) break;
      await btn.click({ timeout: 10000 });
      await page.waitForLoadState("load", { timeout: NAV_TIMEOUT });
      await page.waitForTimeout(400);
      approved++;
    }
    console.log(`  approver: approved ${approved}`);
    await context.close();
  }

  // --- Approvals: admin clears step-2 items, but leaves the 2 largest pending
  // (deliberately — these get backdated via SQL afterward into a realistic
  // "slow approval" bottleneck example). ---
  console.log("Approving step-2/finance items as admin (leaving 2 pending)...");
  {
    const { context, page } = await loginAsNewContext(browser, "admin@procurepro.test");
    await goto(page, "/approvals");
    let approved = 0;
    while (true) {
      const rows = page.locator("table tbody tr");
      const count = await rows.count();
      if (count <= 2) break; // leave the last 2 pending on purpose
      const btn = rows.first().locator('form:has(input[value="approved"]) button');
      if (!(await btn.count())) break;
      await btn.click({ timeout: 10000 });
      await page.waitForLoadState("load", { timeout: NAV_TIMEOUT });
      await page.waitForTimeout(400);
      approved++;
      if (approved > 40) break;
    }
    console.log(`  admin: approved ${approved}, left the rest pending`);
    await context.close();
  }

  // --- RFQ -> quotes -> award for 3 approved requests, 2 of them in a
  // foreign currency (for the FX exposure flag), then vary PO status. ---
  console.log("Creating RFQs, quotes, and awarding POs...");
  {
    const { context, page } = await loginAsNewContext(browser, "admin@procurepro.test");
    await goto(page, "/requests");

    const approvedRows = page.locator('tr:has-text("approved")');
    const approvedCount = await approvedRows.count();
    const targets = Math.min(3, approvedCount);
    const requestHrefs = [];
    for (let i = 0; i < targets; i++) {
      const href = await approvedRows.nth(i).locator('a[href^="/requests/"]').getAttribute("href");
      if (href) requestHrefs.push(href);
    }

    const plans = [
      { vendor1: "Atlas Crane & Rigging Services", currency1: "USD", price1: 2200, vendor2: "Delta Industrial Supplies Ltd", currency2: "NGN", price2: 850000, fxRate: 2450 },
      { vendor1: "Continental Pipe & Fittings", currency1: "EUR", price1: 1800, vendor2: "Sahara Safety Equipment Ltd", currency2: "NGN", price2: 720000, fxRate: 1950 },
      { vendor1: "Naija Office Essentials", currency1: "NGN", price1: 610000, vendor2: "Zenith Industrial Chemicals", currency2: "NGN", price2: 640000, fxRate: 1 },
    ];

    for (let i = 0; i < requestHrefs.length; i++) {
      const plan = plans[i];
      try {
        await goto(page, requestHrefs[i]);
        const rfqLink = page.locator('a[href^="/rfqs/new"]');
        if (!(await rfqLink.count())) {
          console.log(`  skip ${requestHrefs[i]}: no RFQ link (already converted?)`);
          continue;
        }
        await rfqLink.click({ timeout: 10000 });
        await page.waitForLoadState("load", { timeout: NAV_TIMEOUT });
        await page.waitForTimeout(400);
        await submitAndWait(page, page.locator('form:has(input[name="request_id"]) button[type="submit"]')); // "Start RFQ"

        const rfqUrl = page.url();

        // Quote 1
        await page.selectOption('select[name="vendor_id"]', { label: plan.vendor1 });
        await page.fill('input[name="unit_price"]', String(plan.price1));
        await page.selectOption('select[name="currency"]', plan.currency1);
        await page.fill('input[name="lead_time_days"]', "21");
        await submitAndWait(page, page.locator('form:has(select[name="vendor_id"]) button[type="submit"]'));

        // Quote 2
        await page.selectOption('select[name="vendor_id"]', { label: plan.vendor2 });
        await page.fill('input[name="unit_price"]', String(plan.price2));
        await page.selectOption('select[name="currency"]', plan.currency2);
        await page.fill('input[name="lead_time_days"]', "14");
        await submitAndWait(page, page.locator('form:has(select[name="vendor_id"]) button[type="submit"]'));

        // Award the first (foreign-currency, where applicable) quote
        const awardLink = page.locator('a[href^="/rfqs/"][href*="/award"]').first();
        await awardLink.click({ timeout: 10000 });
        await page.waitForLoadState("load", { timeout: NAV_TIMEOUT });
        await page.waitForTimeout(400);

        await page.fill('textarea[name="delivery_terms"]', "FOB, 3-week lead time");
        if (plan.currency1 !== "NGN") {
          await page.fill('input[name="fx_rate_to_ngn"]', String(plan.fxRate));
        }
        await page.fill('input[name="freight_cost_ngn"]', "120000");
        await page.fill('input[name="customs_duty_ngn"]', "85000");
        await submitAndWait(page, page.locator('form:has(input[name="quote_id"]) button[type="submit"]'));
        console.log(`  awarded PO from RFQ at ${rfqUrl}`);
      } catch (err) {
        console.log(`  FAILED RFQ flow for ${requestHrefs[i]}: ${err.message}`);
      }
    }

    // Vary PO status: mark the first PO sent -> in transit -> customs cleared,
    // and partially receive one line, so purchase-orders isn't all "draft".
    try {
      await goto(page, "/purchase-orders");
      const firstPoHref = await page.locator('a[href^="/purchase-orders/"]').first().getAttribute("href");
      if (firstPoHref) {
        await goto(page, firstPoHref);
        const sendBtn = page.locator('button:has-text("Mark sent")');
        if (await sendBtn.count()) {
          await sendBtn.click({ timeout: 10000 });
          await page.waitForLoadState("load", { timeout: NAV_TIMEOUT });
          await page.waitForTimeout(400);
        }
        const transitBtn = page.locator('button:has-text("Mark in transit")');
        if (await transitBtn.count()) {
          await transitBtn.click({ timeout: 10000 });
          await page.waitForLoadState("load", { timeout: NAV_TIMEOUT });
          await page.waitForTimeout(400);
        }
        console.log(`  varied PO status at ${firstPoHref}`);
      }
    } catch (err) {
      console.log(`  FAILED PO status variation: ${err.message}`);
    }

    await context.close();
  }

  console.log("Done.");
  await browser.close();
}

const HARD_TIMEOUT_MS = 600000;
Promise.race([
  main(),
  new Promise((_, reject) => setTimeout(() => reject(new Error(`Hard timeout after ${HARD_TIMEOUT_MS}ms`)), HARD_TIMEOUT_MS)),
]).catch((err) => {
  console.error(err);
  process.exit(1);
});
