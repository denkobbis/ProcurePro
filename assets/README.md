# ProcurePro asset kit

All generated marketing/brand assets in one place, categorized. Everything here
is built from real product facts and real screenshots — no fabricated data or
customer claims (see `../PRODUCT.md`).

- **logos/** — mark (icon only) and lockup (icon + wordmark), each in navy and
  white-on-dark variants, as source SVG and rasterized PNG. `favicon.svg` is the
  in-app favicon source.
- **social/** — static exports of the app's dynamic OG/share images: `apple-icon`
  (180×180, iOS home-screen icon) and `opengraph-image` (1200×630, link previews
  for LinkedIn/Twitter/Slack/etc).
- **screenshots/landing/** — the images used on the live landing page.
- **screenshots/product/** — broader raw captures of each main screen (login,
  dashboard, purchase orders, reports, vendors, equipment, RFQs, PO detail).
- **ads/** — rendered LinkedIn ad creative (landscape 1200×627, square
  1200×1200). Regenerate with `../marketing/render-ads.mjs`.
- **videos/** — raw, unnarrated demo footage, one clip per shot in
  `../marketing/demo-script.md`. Regenerate with `../marketing/capture-demo.mjs`.

Source scripts and copy docs (demo script, Google Search ad copy) live in
`../marketing/` — this folder holds only the generated output.
