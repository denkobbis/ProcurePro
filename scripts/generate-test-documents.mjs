// Generates realistic-looking (fully fictional) vendor quote/invoice/spec
// sheet documents to test the AI extraction feature (src/lib/extract.ts)
// against real PDF and image inputs instead of only hand-typed text.
//
// Usage: node scripts/generate-test-documents.mjs

import { chromium } from "playwright";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "test-fixtures");

const DOC_STYLES = `
  body { font-family: Arial, Helvetica, sans-serif; color: #18181b; padding: 48px; font-size: 13px; }
  .letterhead { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2c4f9e; padding-bottom: 16px; margin-bottom: 24px; }
  .company { font-size: 20px; font-weight: 700; color: #2c4f9e; }
  .company-sub { font-size: 11px; color: #71717a; margin-top: 2px; }
  .doc-title { text-align: right; }
  .doc-title h1 { font-size: 18px; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
  .doc-title p { margin: 2px 0 0; font-size: 11px; color: #71717a; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: #f4f4f5; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; color: #52525b; border-bottom: 1px solid #e4e4e7; }
  td { padding: 10px; border-bottom: 1px solid #f0f0f1; vertical-align: top; }
  .totals { margin-top: 12px; width: 280px; margin-left: auto; }
  .totals td { border: none; padding: 4px 10px; }
  .totals .grand { font-weight: 700; border-top: 2px solid #18181b; }
  .meta { margin-top: 20px; font-size: 12px; }
  .meta div { margin-bottom: 4px; }
  .terms { margin-top: 24px; font-size: 11px; color: #71717a; border-top: 1px solid #e4e4e7; padding-top: 12px; }
`;

const DOCS = [
  {
    file: "quote-trident-valves.pdf",
    type: "pdf",
    html: `
      <div class="letterhead">
        <div>
          <div class="company">Trident Valve &amp; Fittings Ltd</div>
          <div class="company-sub">Plot 14B, Trans-Amadi Industrial Layout, Port Harcourt, Rivers State</div>
          <div class="company-sub">sales@tridentvalve.example &middot; +234 803 555 0142</div>
        </div>
        <div class="doc-title">
          <h1>Quotation</h1>
          <p>Ref: TVF-Q-20260812</p>
          <p>Date: 12 Aug 2026</p>
        </div>
      </div>
      <div class="meta">
        <div><strong>To:</strong> Procurement Department, Denbis Global Resources</div>
        <div><strong>Attn:</strong> Chinedu Okafor</div>
        <div><strong>Valid until:</strong> 12 Sep 2026</div>
      </div>
      <table>
        <thead><tr><th>Description</th><th>Part No.</th><th>Qty</th><th>Unit Price (NGN)</th><th>Total</th></tr></thead>
        <tbody>
          <tr>
            <td>Wellhead isolation gate valve, 5,000 psi WP, API 6A monogrammed, 4-1/16in bore, flanged ends</td>
            <td>TVF-GV-4116-5K</td>
            <td>2</td>
            <td>1,850,000.00</td>
            <td>3,700,000.00</td>
          </tr>
        </tbody>
      </table>
      <table class="totals">
        <tr><td>Subtotal</td><td style="text-align:right">NGN 3,700,000.00</td></tr>
        <tr><td>VAT (7.5%)</td><td style="text-align:right">NGN 277,500.00</td></tr>
        <tr class="grand"><td>Total</td><td style="text-align:right">NGN 3,977,500.00</td></tr>
      </table>
      <div class="terms">
        Lead time: 6-8 weeks ex-works. Payment terms: 50% advance, 50% on delivery. Prices exclude freight and customs duty.
        This quote is for a critical wellhead component pending scheduled maintenance shutdown.
      </div>
    `,
  },
  {
    file: "invoice-naija-office.pdf",
    type: "pdf",
    html: `
      <div class="letterhead">
        <div>
          <div class="company">Naija Office Essentials</div>
          <div class="company-sub">12 Adeola Odeku Street, Victoria Island, Lagos</div>
          <div class="company-sub">orders@naijaoffice.example &middot; +234 802 345 6789</div>
        </div>
        <div class="doc-title">
          <h1>Invoice</h1>
          <p>Invoice #: NOE-2026-0871</p>
          <p>Date: 10 Aug 2026</p>
        </div>
      </div>
      <div class="meta">
        <div><strong>Bill to:</strong> Denbis Global Resources, Operations Department</div>
        <div><strong>PO reference:</strong> Verbal order — office refurbishment</div>
      </div>
      <table>
        <thead><tr><th>Description</th><th>Brand</th><th>Qty</th><th>Unit Price (NGN)</th><th>Total</th></tr></thead>
        <tbody>
          <tr>
            <td>Ergonomic office chair, adjustable armrest &amp; lumbar support, mesh back</td>
            <td>ErgoSeat</td>
            <td>12</td>
            <td>38,000.00</td>
            <td>456,000.00</td>
          </tr>
        </tbody>
      </table>
      <table class="totals">
        <tr><td>Subtotal</td><td style="text-align:right">NGN 456,000.00</td></tr>
        <tr><td>VAT (7.5%)</td><td style="text-align:right">NGN 34,200.00</td></tr>
        <tr class="grand"><td>Total due</td><td style="text-align:right">NGN 490,200.00</td></tr>
      </table>
      <div class="terms">Payment terms: Net 15. Delivery within 5 working days of order confirmation.</div>
    `,
  },
  {
    file: "spec-sheet-generator.png",
    type: "image",
    html: `
      <div class="letterhead">
        <div>
          <div class="company">PowerGuard Nigeria</div>
          <div class="company-sub">Industrial power solutions &middot; Ikeja, Lagos</div>
        </div>
        <div class="doc-title">
          <h1>Spec Sheet &amp; Price List</h1>
          <p>PG-2026-GEN60</p>
        </div>
      </div>
      <table>
        <thead><tr><th>Model</th><th>Description</th><th>Unit Price (NGN)</th></tr></thead>
        <tbody>
          <tr>
            <td>PG-60SC</td>
            <td>Diesel generator, 60kVA prime power, sound-attenuated canopy, auto transfer switch ready</td>
            <td>4,200,000.00</td>
          </tr>
        </tbody>
      </table>
      <div class="meta">
        <div><strong>Lead time:</strong> 3 weeks</div>
        <div><strong>Warranty:</strong> 12 months or 2,000 hours</div>
        <div><strong>Note:</strong> Requested for backup power at the Operations site — current unit is past its service life.</div>
      </div>
    `,
  },
];

async function main() {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const doc of DOCS) {
    await page.setContent(`<html><head><style>${DOC_STYLES}</style></head><body>${doc.html}</body></html>`);
    const outPath = path.join(outDir, doc.file);
    if (doc.type === "pdf") {
      const buffer = await page.pdf({ format: "A4", printBackground: true });
      writeFileSync(outPath, buffer);
    } else {
      await page.setViewportSize({ width: 900, height: 700 });
      await page.screenshot({ path: outPath, fullPage: true });
    }
    console.log("generated", doc.file);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
