import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "assets", "ads");
const brandDir = path.join(__dirname, "..", "public", "brand");
const landingDir = path.join(__dirname, "..", "public", "landing");

function b64(filePath) {
  const ext = path.extname(filePath).slice(1);
  const mime = ext === "svg" ? "image/svg+xml" : "image/png";
  return `data:${mime};base64,${readFileSync(filePath).toString("base64")}`;
}

const lockupWhite = b64(path.join(brandDir, "procurepro-lockup-white.svg"));
const dashboard = b64(path.join(landingDir, "landing_dashboard.png"));

const NAVY_BG = "linear-gradient(135deg, #1a2c5c 0%, #0e1830 75%)";

function landscapeHtml() {
  return `
  <html><body style="margin:0;">
    <div style="width:1200px;height:627px;background:${NAVY_BG};display:flex;align-items:stretch;font-family:Arial,Helvetica,sans-serif;overflow:hidden;">
      <div style="flex:0 0 620px;padding:56px 40px 56px 56px;display:flex;flex-direction:column;justify-content:space-between;">
        <img src="${lockupWhite}" style="height:34px;width:auto;" />
        <div>
          <div style="color:#fff;font-size:46px;font-weight:700;line-height:1.15;letter-spacing:-0.5px;">
            Procurement control,<br/>without the SAP-sized budget.
          </div>
          <div style="margin-top:20px;color:#aab8dd;font-size:19px;line-height:1.5;max-width:480px;">
            Requests, approvals, RFQs, and purchase orders — one system built for Nigerian oil &amp; gas and heavy-industry teams.
          </div>
        </div>
        <div style="display:inline-flex;align-self:flex-start;align-items:center;gap:10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.16);border-radius:999px;padding:10px 20px;color:#fff;font-size:16px;font-weight:600;">
          ₦25,000/month flat &nbsp;·&nbsp; 14-day free trial
        </div>
      </div>
      <div style="flex:1;position:relative;">
        <div style="position:absolute;inset:40px 40px 40px 0;border-radius:14px;overflow:hidden;box-shadow:0 30px 60px rgba(0,0,0,0.45);border:1px solid rgba(255,255,255,0.12);">
          <img src="${dashboard}" style="width:100%;height:100%;object-fit:cover;object-position:top;" />
        </div>
      </div>
    </div>
  </body></html>`;
}

function squareHtml() {
  return `
  <html><body style="margin:0;">
    <div style="width:1200px;height:1200px;background:${NAVY_BG};display:flex;flex-direction:column;font-family:Arial,Helvetica,sans-serif;overflow:hidden;padding:64px;box-sizing:border-box;">
      <img src="${lockupWhite}" style="height:38px;width:auto;" />
      <div style="margin-top:48px;color:#fff;font-size:52px;font-weight:700;line-height:1.15;letter-spacing:-0.5px;">
        Stop running procurement over WhatsApp.
      </div>
      <div style="margin-top:20px;color:#aab8dd;font-size:21px;line-height:1.5;max-width:900px;">
        Real approval chains, RFQs, and landed-cost tracking — built for Nigerian oil &amp; gas and heavy-industry teams.
      </div>
      <div style="flex:1;margin-top:40px;border-radius:16px;overflow:hidden;box-shadow:0 30px 60px rgba(0,0,0,0.45);border:1px solid rgba(255,255,255,0.12);">
        <img src="${dashboard}" style="width:100%;height:100%;object-fit:cover;object-position:top;" />
      </div>
      <div style="margin-top:36px;display:inline-flex;align-self:flex-start;align-items:center;gap:10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.16);border-radius:999px;padding:12px 24px;color:#fff;font-size:19px;font-weight:600;">
        ₦25,000/month flat &nbsp;·&nbsp; 14-day free trial
      </div>
    </div>
  </body></html>`;
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.setViewportSize({ width: 1200, height: 627 });
  await page.setContent(landscapeHtml());
  await page.waitForTimeout(150);
  await (await page.$("div")).screenshot({ path: path.join(outDir, "linkedin-landscape-1200x627.png") });
  console.log("exported linkedin-landscape-1200x627.png");

  await page.setViewportSize({ width: 1200, height: 1200 });
  await page.setContent(squareHtml());
  await page.waitForTimeout(150);
  await (await page.$("div")).screenshot({ path: path.join(outDir, "linkedin-square-1200x1200.png") });
  console.log("exported linkedin-square-1200x1200.png");

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
