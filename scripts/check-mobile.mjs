// Ad-hoc mobile-viewport checker: logs in and screenshots one or more paths at 390px width.
// Usage: node scripts/check-mobile.mjs /dashboard /requests ...
import { chromium } from "playwright";
import path from "node:path";

const BASE_URL = process.env.DEMO_BASE_URL || "http://localhost:3000";
const PASSWORD = "Passw0rd!123";
const OUT_DIR = path.join(process.cwd(), "screenshot", "wip");
const paths = process.argv.slice(2);

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("BROWSER ERROR:", msg.text());
  });

  await page.goto(`${BASE_URL}/login`, { waitUntil: "load", timeout: 60000 });
  await page.fill('input[name="email"]', "admin@procurepro.test");
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });

  for (const p of paths) {
    await page.goto(`${BASE_URL}${p}`, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(500);
    const name = "mobile_" + (p.replace(/^\//, "").replace(/[/?&=]/g, "_") || "root");
    await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    console.log(`captured ${name}${overflow ? "  ⚠ horizontal overflow" : ""}`);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
