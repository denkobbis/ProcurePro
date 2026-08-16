import { chromium } from "playwright";
import path from "node:path";

const BASE_URL = "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "screenshot", "wip");

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("caret-color")) console.log("BROWSER ERROR:", msg.text());
  });
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

  await page.goto(`${BASE_URL}/`, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT_DIR, "landing_light.png"), fullPage: true });
  console.log("captured landing_light");

  // toggle dark mode
  await page.evaluate(() => {
    document.documentElement.classList.add("dark");
    localStorage.setItem("theme", "dark");
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT_DIR, "landing_dark.png"), fullPage: true });
  console.log("captured landing_dark");

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
