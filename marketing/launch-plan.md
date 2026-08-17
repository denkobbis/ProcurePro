# ProcurePro 30-Day Launch Plan

A working plan to go from pre-launch to first paying customers. Everything below
is honest per `PRODUCT.md`: no fabricated social proof, no invented traction.
The goal of month one is **conversations**, not volume — a handful of real
procurement/finance leads who see their own workflow in a live demo.

## The funnel we're filling

```
Visitor ──► signup trial (primary CTA)
   └──► demo request (new: marketing_leads table via the landing page form) ──► 20-min call
                                    └──► lead qualifies ──► trial start ──► paid
```

Both paths feed the same end state: a live trial with their own data.

## Pre-flight (do this before day 1)

- [ ] Apply migration `0034_marketing_leads` (`supabase db push`).
- [ ] Confirm a test submission lands in the table (Supabase SQL editor:
      `select * from marketing_leads order by created_at desc limit 5;`).
- [ ] Verify the whole subscribe → trial → pay flow end to end with a test card
      on Paystack. **If a paying lead stalls at checkout, ads and posts just buy
      you frustrated people.** (Webhook registration / `/api` routing must be
      live before real money moves.)
- [ ] Decide the demo calendar: you run the `sales/one-pager.html` + the 20-min
      walkthrough from `sales/sales-playbook.md`. Block 2 slots/day from day 3.
- [ ] Set up a Google Sheets export of `marketing_leads` (or query it directly)
      so you can mark `new → contacted → won/lost`.

## Week 1 — Foundation: put the story in front of warm people

Goal: 10 demo requests, 5 trial signups, both from relationships, not ads.

- Days 1–2: **LinkedIn presence.** Fill out your profile headline with the
  positioning line ("Full enterprise procure-to-pay depth, priced for mid-market
  Nigerian companies — not SAP cost, not a vendor-list toy"). Publish posts 1–3
  from `marketing/linkedin-content.md`.
- Days 3–4: **Personal outreach.** List 25 Nigerian oil & gas / heavy-industry
  companies in Lagos/PHC (supply-chain and finance directors). Use email template
  A or B from `sales/sales-playbook.md`. Add a call-to-action that routes to the
  new demo form or a direct intro call link.
- Days 5–7: **Follow up.** First follow-up on non-responders (template C).
  Run the first 2–3 demo calls if anyone bites. Publish post 4.

## Week 2 — Turn the process into proof

Goal: 15 demo requests, 8 trials, 3 demos done.

- Days 8–9: Publish posts 5–6 (the invoice-catch story and the NCDMB angle —
  both are true, specific, and unlike anything a generic tool can claim).
- Days 10–11: **First ads impressions.** Start Google search ads small —
  see `marketing/google-search-ads.md` for geo/budget. Send traffic only to the
  page with UTM tracking, so every signup is attributable.
- Days 12–14: Re-run outreach to a second 25-company list (different vertical
  slice: trading/construction if oil & gas is slow). Second follow-up to everyone
  who opened but didn't reply.

## Week 3 — What works, do more of it

Goal: 20 demo requests, 12 trials, 6 demos done.

- Days 15–16: **Measure.** Read `marketing_leads` by `utm_source` and the
  `/?utm_*` query on trial signups. Kill whatever gets zero clicks for a week;
  double the budget on whatever converts.
- Days 17–18: Publish posts 7–8. Amplify your best post with a paid LinkedIn boost
  (small — ₦10k–20k) targeting Lagos/PHC oil-and-gas specifier titles.
- Days 19–21: Demo blocks full time. Ask every demo the closing question from the
  playbook: "What would you need to see to run this with your team for the next
  two weeks?" — and get a date.

## Week 4 — Close the trial, not the pitch

Goal: 25 demo requests, 15 trials, 2–3 paid.

- Days 22–24: **Trial care.** For everyone mid-trial: a personal weekly check-in
  (WhatsApp/call), offer to configure their approval rules with them. People don't
  churn from a bad product at this stage — they churn from a trial they forgot.
- Days 25–26: Post 9–10 (recap the month with numbers you actually have — leads,
  trials, the invoice-catch demo reaction — still no invented testimonials).
- Days 27–29: Convert: offer a 30-day first-invoice grace if they pay now; make
  the handoff to a paid account frictionless (single flat plan, one Paystack
  checkout).
- Day 30: Write down what worked (channel, message, list) into this file's
  "Lessons" section below. Rinse and repeat.

## Budget tiers (NGN, per month)

| Tier | Google search ads | LinkedIn boost | Total | Expectation |
|---|---|---|---|---|
| Lean | ₦30,000 (≈₦1,000/day) | ₦20,000 | ₦50k | Brand + a handful of demo requests; revenue not the goal yet |
| Focused | ₦70,000 (≈₦2,300/day) | ₦30,000 | ₦100k | Enough click volume to validate / kill keywords by week 3 |
| Not yet | > ₦200k | — | — | Scale only after cost-per-demo-request is shown to drop with optimization |

Rule of thumb: you need ~1 paid month of continuous search ads before judging
cost per lead — single-day bursts on search ads don't work; set it to run daily
and leave it alone for two weeks.

## KPI sheet (update weekly)

| Metric | Week 1 | Week 2 | Week 3 | Week 4 | Target |
|---|---|---|---|---|---|
| Demo requests (`marketing_leads`) | | | | | 25 |
| Trial signups (orgs created) | | | | | 15 |
| Demos delivered | | | | | 6 |
| Trials → paid | | | | | 2–3 |

## Lessons (fill at day 30)

1. Which headline/message got replies?
2. Which vertical and which list performed?
3. What was the #1 objection in five demos — and does it go in the playbook?
4. What did a demo request that became a trial look like (source, company size)?