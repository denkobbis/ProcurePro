# ProcurePro Product Demo — Script & Shot List

**Goal:** a 90–100 second walkthrough for the landing page hero, YouTube, and as raw
footage to cut into LinkedIn/Google video ads.
**Audience:** procurement/ops/finance leads at Nigerian oil & gas and heavy-industry
companies (per `PRODUCT.md`) evaluating whether to leave spreadsheets/WhatsApp.
**Data shown:** internal seeded test org only (per `PRODUCT.md` — no real customer
data or names are ever shown or implied).

Each shot below maps to a real route in the app and a real feature — nothing here
is staged or mocked beyond using seeded demo data.

| # | Time | Screen / Route | Narration | Action to capture |
|---|------|-----------------|-----------|--------------------|
| 1 | 0:00–0:08 | `/dashboard` | "This is ProcurePro — procurement control for teams still running purchasing over spreadsheets and WhatsApp." | Land on dashboard, let stat cards and recent activity render. |
| 2 | 0:08–0:18 | `/requests/new` → `/requests/[id]` | "A request starts here. It routes through a real, multi-step approval chain — no more chasing sign-off over chat." | Fill a request, submit, show status moving to pending approval. |
| 3 | 0:18–0:30 | `/rfqs/new` → `/rfqs/[id]` | "Need competing quotes? Send an RFQ to your vendor list and compare bids side by side." | Create RFQ from the approved request, show vendor list and quote comparison. |
| 4 | 0:30–0:40 | `/rfqs/[id]/award` | "Award the RFQ to a vendor, and a purchase order is generated automatically." | Award to a vendor, show PO created. |
| 5 | 0:40–0:55 | `/purchase-orders/[id]` | "The PO tracks landed cost — PO value, freight, and customs duty — not just the sticker price." | Scroll PO detail showing landed-cost breakdown line. |
| 6 | 0:55–1:08 | `/purchase-orders/[id]` (Shipping/Customs) | "Mark it sent, in transit, and customs-cleared, right on the PO — with a customs reference number, built for NCDMB compliance." | Click through "Mark sent" → "Mark in transit" → "Mark cleared customs" actions. |
| 7 | 1:08–1:20 | `/purchase-orders/[id]` (Receive items) | "Receive against each line item individually — partial shipments included — so what's on the PO matches what actually showed up." | Enter a received qty on one line, submit. |
| 8 | 1:20–1:30 | `/budgets` or `/reports` | "Every request ties back to a budget, so finance sees commitments before they become invoices." | Show budget page with committed vs. actual, or a report export. |
| 9 | 1:30–1:35 | Landing page hero / pricing | "ProcurePro. ₦25,000 a month, flat. 14-day free trial." | Cut to landing page pricing card. |

## Production notes

- **Footage:** captured directly from the live app against seeded test data
  (`admin@procurepro.test`), via `marketing/capture-demo.mjs` (Playwright, records
  `.webm` per shot at 1920×1080).
- **Voiceover:** the narration column above is the read-aloud script. I don't have
  an audio/TTS tool in this environment — record it yourself, or run it through a
  TTS service (e.g. ElevenLabs, Descript) and sync to the captured clips in a video
  editor (CapCut, Premiere, DaVinci Resolve).
- **Cutting:** raw per-shot clips are separate files so you can trim/reorder freely;
  they're intentionally captured a few seconds longer than their target runtime to
  leave trim room.
