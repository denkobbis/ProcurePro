// Follow-up to generate-full-demo-data.mjs: finishes clearing remaining
// approvals (leaving exactly 2 pending on purpose, for the bottleneck-alert
// demo), then creates RFQs/quotes/awards (2 in foreign currency, for the FX
// exposure flag) and varies PO shipping status. Split out because the first
// full run's RFQ/PO section hit two selector bugs (fixed here) after
// everything else had already succeeded.

import { chromium } from "playwright";

const BASE_URL = process.env.DEMO_BASE_URL || "http://localhost:3000";
const PASSWORD = "Passw0rd!123";
const NAV_TIMEOUT = 90000;

async function goto(page, path) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "load", timeout: NAV_TIMEOUT });
  await page.waitForTimeout(400);
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

async function submitAndWait(page, buttonLocator) {
  await buttonLocator.click({ timeout: 10000 });
  await page.waitForLoadState("load", { timeout: NAV_TIMEOUT });
  await page.waitForTimeout(400);
  if (page.url().includes("/login")) {
    throw new Error("Landed on /login after submit — the click likely hit Sign Out, not the intended button.");
  }
}

async function main() {
  const browser = await chromium.launch();

  console.log("Clearing remaining approvals (leaving 2 pending on purpose)...");
  {
    const { context, page } = await loginAsNewContext(browser, "admin@procurepro.test");
    await goto(page, "/approvals");
    let approved = 0;
    while (true) {
      const rows = page.locator("table tbody tr");
      const count = await rows.count();
      if (count <= 2) break;
      const btn = rows.first().locator('form:has(input[value="approved"]) button');
      if (!(await btn.count())) break;
      await btn.click({ timeout: 10000 });
      await page.waitForLoadState("load", { timeout: NAV_TIMEOUT });
      await page.waitForTimeout(400);
      approved++;
      if (approved > 30) break;
    }
    console.log(`  approved ${approved}, left the rest pending`);
    await context.close();
  }

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
    console.log(`  found ${requestHrefs.length} approved requests to convert`);

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
        // Fixed: text-based selector instead of form:has(input[name="request_id"]),
        // which also (unexpectedly) matched the attachment-upload and comment
        // forms on the same page, both of which carry a hidden request_id field.
        await submitAndWait(page, page.locator('button:has-text("Start RFQ")'));

        const rfqUrl = page.url();

        await page.selectOption('select[name="vendor_id"]', { label: plan.vendor1 });
        await page.fill('input[name="unit_price"]', String(plan.price1));
        await page.selectOption('select[name="currency"]', plan.currency1);
        await page.fill('input[name="lead_time_days"]', "21");
        await submitAndWait(page, page.locator('form:has(select[name="vendor_id"]) button[type="submit"]'));

        await page.selectOption('select[name="vendor_id"]', { label: plan.vendor2 });
        await page.fill('input[name="unit_price"]', String(plan.price2));
        await page.selectOption('select[name="currency"]', plan.currency2);
        await page.fill('input[name="lead_time_days"]', "14");
        await submitAndWait(page, page.locator('form:has(select[name="vendor_id"]) button[type="submit"]'));

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

    console.log("Varying PO shipping status...");
    try {
      await goto(page, "/purchase-orders");
      // Fixed: scoped to the table — a bare a[href^="/purchase-orders/"]
      // also matched the "Export CSV" link in the page header, which sits
      // before the table in the DOM and triggers a file download, not a
      // navigation.
      const firstPoHref = await page.locator('table a[href^="/purchase-orders/"]').first().getAttribute("href");
      if (firstPoHref) {
        await goto(page, firstPoHref);
        const sendBtn = page.locator('button:has-text("Mark sent")');
        if (await sendBtn.count()) await submitAndWait(page, sendBtn);
        const transitBtn = page.locator('button:has-text("Mark in transit")');
        if (await transitBtn.count()) await submitAndWait(page, transitBtn);
        console.log(`  varied PO status at ${firstPoHref}`);
      }

      // Second PO: push further to customs-cleared + partial receipt.
      await goto(page, "/purchase-orders");
      const secondPoHref = await page.locator('table a[href^="/purchase-orders/"]').nth(1).getAttribute("href");
      if (secondPoHref) {
        await goto(page, secondPoHref);
        const sendBtn = page.locator('button:has-text("Mark sent")');
        if (await sendBtn.count()) await submitAndWait(page, sendBtn);
        const transitBtn = page.locator('button:has-text("Mark in transit")');
        if (await transitBtn.count()) await submitAndWait(page, transitBtn);
        const customsInput = page.locator('input[name="customs_reference"]');
        if (await customsInput.count()) {
          await customsInput.fill("BL-DEMO-2026-0142");
          await submitAndWait(page, page.locator('form:has(input[name="customs_reference"]) button[type="submit"]'));
        }
        const qtyInput = page.locator('input[name="received_qty"]').first();
        if (await qtyInput.count()) {
          const max = await qtyInput.getAttribute("max");
          await qtyInput.fill(String(Math.max(1, Math.floor(Number(max || 1) / 2))));
          await submitAndWait(page, page.locator('form:has(input[name="received_qty"])').first().locator('button[type="submit"]'));
        }
        console.log(`  varied PO status further at ${secondPoHref}`);
      }
    } catch (err) {
      console.log(`  FAILED PO status variation: ${err.message}`);
    }

    await context.close();
  }

  console.log("Done.");
  await browser.close();
}

const HARD_TIMEOUT_MS = 400000;
Promise.race([
  main(),
  new Promise((_, reject) => setTimeout(() => reject(new Error(`Hard timeout after ${HARD_TIMEOUT_MS}ms`)), HARD_TIMEOUT_MS)),
]).catch((err) => {
  console.error(err);
  process.exit(1);
});
