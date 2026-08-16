// One-off production verification: logs into the live site and screenshots
// the redesigned screens to confirm the deploy landed.
import { chromium } from "playwright";
import path from "node:path";

const BASE_URL = "https://procurepro-woad.vercel.app";
const PASSWORD = "Passw0rd!123";
const OUT_DIR = path.join(process.cwd(), "screenshot", "wip", "prod");
const paths = process.argv.slice(2);

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("caret-color")) console.log("BROWSER ERROR:", msg.text());
  });
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

  await page.goto(`${BASE_URL}/login`, { waitUntil: "load", timeout: 60000 });
  await page.fill('input[name="email"]', "admin@procurepro.test");
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
  console.log("login ok on production");

  for (const p of paths) {
    await page.goto(`${BASE_URL}${p}`, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(600);
    const name = p.replace(/^\//, "").replace(/[/?&=]/g, "_") || "root";
    await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: true });
    console.log(`captured ${name}`);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
