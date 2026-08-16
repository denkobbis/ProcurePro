// Comprehensive QA sweep: every route, console-error-clean, plus a handful
// of real interactive flows. Reports a pass/fail summary at the end.
import { chromium } from "playwright";

const BASE_URL = process.env.DEMO_BASE_URL || "http://localhost:3000";
const PASSWORD = "Passw0rd!123";

const findings = [];
function note(area, msg) {
  findings.push(`[${area}] ${msg}`);
  console.log(`[${area}] ${msg}`);
}

async function login(page, email = "admin@procurepro.test") {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "load", timeout: 60000 });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
}

function attachErrorTracking(page, label) {
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("caret-color")) note("console", `${label}: ${m.text().slice(0, 300)}`);
  });
  page.on("pageerror", (e) => note("pageerror", `${label}: ${e.message.slice(0, 300)}`));
  page.on("response", (r) => {
    if (r.status() >= 500) note("http5xx", `${label}: ${r.status()} ${r.url()}`);
  });
}

async function main() {
  const browser = await chromium.launch();

  // --- 1. Public pages ---
  let ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  let page = await ctx.newPage();
  attachErrorTracking(page, "public");
  for (const p of ["/", "/login", "/signup"]) {
    await page.goto(`${BASE_URL}${p}`, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(300);
  }
  await ctx.close();

  // --- 2. Every authenticated route, super_admin ---
  ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await ctx.newPage();
  attachErrorTracking(page, "authed-super_admin");
  await login(page);
  const routes = [
    "/dashboard", "/requests", "/requests/new", "/approvals", "/purchase-orders", "/purchase-orders/new",
    "/vendors", "/vendors/new", "/rfqs", "/rfqs/new", "/equipment", "/equipment/new",
    "/budgets", "/reports", "/billing", "/users", "/notifications",
  ];
  for (const r of routes) {
    await page.goto(`${BASE_URL}${r}`, { waitUntil: "load", timeout: 30000 }).catch((e) => note("nav-fail", `${r}: ${e.message}`));
    await page.waitForTimeout(250);
  }

  // detail pages via real rows
  for (const [listPath, prefix, label] of [
    ["/requests", "/requests/", "request-detail"],
    ["/purchase-orders", "/purchase-orders/", "po-detail"],
    ["/vendors", "/vendors/", "vendor-detail"],
    ["/equipment", "/equipment/", "equipment-detail"],
    ["/rfqs", "/rfqs/", "rfq-detail"],
  ]) {
    await page.goto(`${BASE_URL}${listPath}`, { waitUntil: "load" });
    const href = await page.locator(`table a[href^="${prefix}"]`).first().getAttribute("href").catch(() => null);
    if (href) {
      await page.goto(`${BASE_URL}${href}`, { waitUntil: "load", timeout: 30000 }).catch((e) => note("nav-fail", `${label}: ${e.message}`));
      await page.waitForTimeout(250);
    } else {
      note("no-data", `${label}: no rows found to open`);
    }
  }
  console.log("super_admin route sweep done");

  // --- 3. Interactive: tab switching, mobile drawer, sign-out ---
  await page.goto(`${BASE_URL}/requests`, { waitUntil: "load" });
  const allCount = await page.locator("button:has-text('Open')").first().textContent().catch(() => null);
  await page.locator("button:has-text('Converted to PO')").click().catch((e) => note("interaction", `tab click failed: ${e.message}`));
  await page.waitForTimeout(200);
  const rowsAfter = await page.locator("table tbody tr").count();
  note("interaction", `requests tab switch: Open tab label="${allCount}", rows after clicking Converted to PO=${rowsAfter}`);

  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "load" });
  const menuBtn = page.locator('button[aria-label="Account menu"]');
  await menuBtn.click();
  await page.waitForTimeout(200);
  const signOutVisible = await page.locator('button:has-text("Sign out")').first().isVisible().catch(() => false);
  note("interaction", `account menu opens, Sign out visible: ${signOutVisible}`);
  await page.keyboard.press("Escape").catch(() => {});

  await ctx.close();

  // --- 4. Other roles ---
  for (const [email, role] of [
    ["requester@procurepro.test", "requester"],
    ["approver@procurepro.test", "approver"],
  ]) {
    ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    page = await ctx.newPage();
    attachErrorTracking(page, `authed-${role}`);
    await login(page, email);
    for (const r of ["/dashboard", "/requests", "/requests/new", "/budgets", "/billing", "/notifications"]) {
      await page.goto(`${BASE_URL}${r}`, { waitUntil: "load", timeout: 30000 }).catch((e) => note("nav-fail", `${role} ${r}: ${e.message}`));
      await page.waitForTimeout(200);
    }
    // confirm role-gated routes correctly redirect/block for a plain requester
    if (role === "requester") {
      await page.goto(`${BASE_URL}/purchase-orders`, { waitUntil: "load" });
      const url = page.url();
      note("role-gating", `requester visiting /purchase-orders landed on: ${url}`);
      await page.goto(`${BASE_URL}/users`, { waitUntil: "load" });
      note("role-gating", `requester visiting /users landed on: ${page.url()}`);
    }
    console.log(`${role} sweep done`);
    await ctx.close();
  }

  // --- 5. Mobile viewport sanity ---
  ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  page = await ctx.newPage();
  attachErrorTracking(page, "mobile");
  await login(page);
  for (const r of ["/dashboard", "/requests", "/purchase-orders"]) {
    await page.goto(`${BASE_URL}${r}`, { waitUntil: "load" });
    await page.waitForTimeout(250);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    if (overflow) note("mobile-overflow", `${r}: horizontal overflow detected`);
  }
  await ctx.close();

  await browser.close();

  console.log("\n=== SUMMARY ===");
  if (findings.length === 0) console.log("No issues found.");
  else findings.forEach((f) => console.log(f));
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
