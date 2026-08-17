# Google Search Ads — ProcurePro

Responsive Search Ad (RSA) format: Google mixes headlines (≤30 chars) and
descriptions (≤90 chars) automatically, so each one below is written to stand
alone. All claims are real product facts — no invented numbers.

## Suggested keyword themes

- procurement software Nigeria
- purchase order software Nigeria
- vendor management software
- NCDMB compliance software
- oil and gas procurement software
- RFQ software
- spend management software Nigeria

Match type: start with phrase match on the above, add exact-match once search
term data comes in. Exclude broad "procurement" alone — too generic, will burn
budget on unrelated results (consulting firms, government tenders, etc).

## Headlines (max 30 characters each — count shown)

| # | Headline | Chars |
|---|----------|-------|
| 1 | Procurement Software Nigeria | 29 |
| 2 | Stop Buying Over WhatsApp | 26 |
| 3 | ₦25,000/Month, Flat | 20 |
| 4 | 14-Day Free Trial | 18 |
| 5 | Built for Oil & Gas Teams | 26 |
| 6 | NCDMB-Ready Procurement | 24 |
| 7 | Requests, Approvals, POs | 25 |
| 8 | Track Landed Cost Easily | 25 |
| 9 | Enterprise Depth, Not Cost | 27 |
| 10 | End Spreadsheet Purchasing | 27 |
| 11 | Real Approval Chains | 21 |
| 12 | Vendor RFQs in Minutes | 23 |
| 13 | Purchase Orders, Simplified | 28 |
| 14 | Heavy Industry Procurement | 27 |
| 15 | ProcurePro — Try It Free | 25 |

## Descriptions (max 90 characters each — count shown)

| # | Description | Chars |
|---|-------------|-------|
| 1 | Requests, approvals, RFQs, and POs in one place. ₦25k/month flat. 14-day trial. | 81 |
| 2 | Built for Nigerian oil & gas and heavy-industry teams. Landed cost, not sticker price. | 88 |
| 3 | Multi-step approval chains and budget checks — no more sign-off over WhatsApp. | 80 |
| 4 | NCDMB reference tracking, customs clearance, and per-line receiving, built in. | 80 |
| 5 | Full procurement workflow at a fraction of SAP/Oracle cost and setup time. | 76 |

## Landing page / UTM

Send traffic to `https://procurepro-woad.vercel.app/?utm_source=google&utm_medium=cpc&utm_campaign=search_procurement`
— the root `/` landing page leads with the trial CTA and pricing, and the demo-request
form on that page now stores the UTM values into `marketing_leads` (migration 0034),
so every lead is attributable to the exact ad that produced it.

Recommended campaign structure (start small, one campaign):
- Campaign: `search_procurement`
- Ad group 1: `procurement / purchase order / vendor` keywords (phrase match)
- Ad group 2: `NCDMB / oil & gas` keywords (phrase match)
- Shared final URL suffix: `&utm_source=google&utm_medium=cpc&utm_campaign=search_procurement`
- Also tag signups: App is on `/signup` — set a conversion goal on signup URL so Ads
  can optimize toward it, not just clicks.

## Go-live defaults (decide once, then don't touch for 2 weeks)

- **Geography:** Lagos + Port Harcourt (city-level) to start. Only expand to
  "all Nigeria" after cost-per-lead is reasonable — PHC/Edo-based oil & gas
  operations and Lagos HQ buyers are the densest audience per NGN.
- **Budget:** start daily at **₦1,000/day (≈₦30,000/month)** per the launch-plan
  lean tier. Raise only after week 3 if cost per lead supports it.
- **Schedule:** run daily, all hours (B2B searches happen in bursts, don't pause
  nights/weekends prematurely).
- **Device:** all — decision-makers search on phones here.
- **Exclusions:** add negative keywords from day 1: `free`, `download`, `template`,
  `course`, `consulting`, `tender`, `jobs`, `salary`. Exclude country education/
  .gov searches where they burn budget.

## Go-live checklist (before enabling ads)

1. Apply `0034_marketing_leads` and confirm a test submission shows up with your
   `?utm_source=google...` params attached.
2. Verify `/signup` → org creation → trial works from an incognito browser
   (ad traffic is often incognito/desktop; don't discover friction after paying for clicks).
3. Set up the conversion goal in Google Ads on the `/signup` and `/pricing`-adjacent
   funnel (at minimum, signup URL hit).
4. Connect billing + a spend cap that sends you an alert at 80% of daily budget.
5. Confirm you have a human checking `marketing_leads` daily during the first week
   (a lead you don't call in 24h is a lead you paid for and lost).

## Not included (needs your input before launch)

- Whether the Google Ads account + billing (in NGN) already exists.
- The exact landing URL is currently the Vercel preview domain — if you move to a
  custom domain, update the `URL` field and every `?utm_source=...` link in the
  LinkedIn pack.
