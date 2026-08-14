# ProcurePro AI feature roadmap

Research snapshot from 2026-08-14, covering what established procurement/spend
platforms ship today and what's actually worth building next for this
product's users. First AI feature (upload a quote/invoice, auto-fill a new
request, human review before save) shipped the same day — see
`src/lib/extract.ts` / `src/components/RequestAutoFill.tsx`. Everything below
follows the same philosophy: **accelerator with mandatory human review**, not
autonomous action, especially anywhere money or compliance is involved.

## What established players actually ship (not marketing fluff)

- **SAP Ariba**: rolling out "Joule" agents through 2026, including a **Bid
  Analysis Agent** that auto-compares supplier bids (unit price + shipping +
  payment terms) and generates trade-off summaries — directly analogous to
  ProcurePro's RFQ/quote-comparison workflow.
- **Coupa**: "Compass," a natural-language copilot for querying spend data
  across the whole platform.
- **Precoro**: AI-powered OCR/IDP that turns quotes/invoices/receipts into
  structured drafts in ~3 seconds, plus a chat assistant for spend/supplier
  questions — same document-extraction lane ProcurePro just shipped, but
  extended to invoices and a query layer on top.
- **Zip**: "Superagents" — 50+ specialized agents doing real-time budget
  enforcement *before* spend occurs, a trade-policy/tariff-impact analyzer,
  and increasingly autonomous execution with audit trails and human-in-the-loop
  gates as the stated safety net (a sign even aggressive vendors treat full
  autonomy as needing heavy guardrails).
- **AP/fraud tooling broadly**: statistical anomaly detection for
  duplicate/near-duplicate invoices and off-pattern pricing (fuzzy matching
  beyond exact invoice-number matches) is now standard in AP automation.
- **Vendor risk AI**: real-time risk re-scoring is common, but research flags
  a real failure mode — models trained on large, established suppliers can
  systematically underscore legitimate emerging-market/SME vendors. Relevant
  given ProcurePro's Nigerian vendor base.

Sources: [SAP Ariba AI updates](https://sapinsider.org/articles/sap-ariba-updates-embed-ai-deeper-into-procurement-supplier-management/), [SAP Business AI](https://www.sap.com/products/spend-management/ai-for-procurement.html), [Coupa AI review](https://procurementaiagents.com/agents/coupa-ai), [Precoro AI capabilities](https://precoro.com/blog/ai-procurement-capabilities/), [Precoro AI assistant](https://precoro.com/blog/ai-assistant/), [Zip P2P AI agents](https://pulse2.com/zip-launches-ai-agents-to-automate-accounting-workflows-and-accelerate-procure-to-pay-processes/), [Zip Superagents](https://zip.com/capabilities/superagents), [Zip 2026 guide](https://ziphq.com/blog/ai-in-procurement), [invoice fraud/duplicate detection](https://www.phacetlabs.com/blog/invoice-fraud-detection-ai), [Coupa duplicate invoice AI](https://www.coupa.com/blog/technology-innovation-finding-duplicate-invoices-flight-ai/), [AI vendor risk & emerging-market bias](https://authbridge.com/blog/role-of-ai-in-vendor-risk-management/), [RFQ automation](https://www.workus.ai/blog/rfq-automation)

---

## Tier 1 — Quick wins (accelerator + human review, matches shipped design)

**1. AI bid/quote comparison assistant**
Extend the existing extraction pipeline: when 3+ vendor quotes come in against
one RFQ, auto-normalize them (unit price, MOQ, lead time, landed cost incl.
freight/duty) into ProcurePro's existing comparison table and flag cheapest
vs. best-landed-cost vs. fastest. Mirrors SAP's Joule Bid Analysis Agent but
scoped to what ProcurePro already tracks.
*Why it matters here*: RFQ-to-vendor comparison is a core existing workflow —
this removes the manual spreadsheet step without touching who gets awarded.
*Complexity*: M. *Risk*: none new — purely presentational, award stays human.

**2. Natural-language spend copilot**
"How much have we spent with Vendor X this quarter?" / "Which departments are
over budget?" answered against Postgres data, scoped by the same RLS the user
already has.
*Why it matters*: budget tracking and vendor management already exist as
structured data; this just makes it queryable.
*Complexity*: M — must use constrained query templates or a tool-calling
layer, not free-form text-to-SQL, to avoid RLS bypass or injection.
*Risk*: read-only, low risk if the query surface is tightly scoped.

**3. Freeform-text purchase request intake**
Let a user paste an email or type "need 50 gate valves like the last order
from Delta Engineering" and have Claude draft a structured PR (extending the
current document-upload extractor to free text), still landing in the same
mandatory human-review-before-save step.
*Why it matters*: natural extension of the feature that just shipped — same
guardrail, wider input surface, immediate daily-use value for buyers who work
over email/WhatsApp.
*Complexity*: S–M. *Risk*: none new — same review gate as today.

**4. Vendor performance/reliability scorecard**
Aggregate on-time delivery, quote responsiveness, price stability, and
receiving discrepancies (data ProcurePro already captures) into a per-vendor
score shown when building an RFQ invite list.
*Why it matters*: helps buyers pick reliable vendors in a market where
informal/undocumented supplier performance is common.
*Complexity*: M (mostly SQL aggregation + light scoring, minimal LLM).
*Risk*: low — advisory ranking, not a gate.

**5. Approval bottleneck prediction**
Flag PRs/POs likely to stall in the multi-step approval chain based on
historical patterns (approver, amount, category) and nudge the right person.
*Why it matters*: directly addresses a known pain point of multi-step
approval chains slowing procurement cycles.
*Complexity*: S–M. *Risk*: none — notification only.

## Tier 2 — Bigger bets (more build effort, and/or touch money or compliance)

**6. Invoice/PO 3-way-match anomaly detection**
Before a payout is queued via Paystack/Flutterwave, flag duplicate invoices,
near-duplicates (OCR/format variance), and price jumps vs. that vendor's
history.
*Why it matters*: real money moves through this app — highest-leverage
anti-fraud feature, standard in every serious AP platform.
*Complexity*: M (rule-based fuzzy matching + historical baselines; LLM only
for the summary/explanation).
**Risk: touches money.** Must be advisory-block (holds payout for reviewer
sign-off), never a silent auto-block or auto-release. Log every flag and
override for audit.

**7. Vendor onboarding fraud/duplicate check**
Before enabling a vendor for bank-verified payouts, check for duplicate bank
accounts/tax IDs across vendors (same account under different company
names) — a known payment-diversion pattern.
*Why it matters*: vendor payouts are bank-verified but that step doesn't
inherently catch collusion or fake-vendor fraud.
*Complexity*: M. **Risk: touches money.** Advisory flag only, blocking
payout enablement until a human clears it — never an autonomous
account-linking decision.

**8. NCDMB local-content compliance assistant**
Given ProcurePro already tracks NCDMB compliance fields, use AI to review
PR/PO line items and flag when local-content percentages look likely to
breach thresholds, and draft (not file) supporting compliance narrative text.
*Why it matters*: genuinely differentiated vs. every generalist competitor
above — NCDMB compliance is a real regulatory cost/penalty risk unique to
Nigerian oil & gas.
*Complexity*: M–L (needs codified NCDMB rules, not just an LLM guess).
**Risk: compliance.** Strictly a drafting/flagging aid reviewed by a
compliance officer — never auto-submitted or treated as legal certification.

**9. Landed-cost/customs-duty estimator**
Predict likely freight + duty for a new PO line based on category/HS-code/
origin/incoterm, using ProcurePro's own historical landed-cost data as
training signal, to pre-populate (not replace) the existing landed-cost
fields.
*Why it matters*: landed-cost tracking already exists; this turns it from
record-keeping into forward-looking budgeting.
*Complexity*: M (needs enough historical volume; cold-start risk). *Risk*:
low — pre-fill suggestion, actuals still entered on receiving.

**10. FX exposure flag for multi-currency POs**
Since multi-currency/landed-cost is already tracked, flag open USD/EUR-
denominated POs where Naira movement since order date has materially changed
the landed cost, so budget owners aren't surprised at receiving.
*Why it matters*: Naira volatility is a real, recurring cost-overrun source
for this user base.
*Complexity*: S–M (mostly rate-lookup + threshold rules; LLM just narrates).
*Risk*: keep strictly to internal budget-exposure reporting — never framed as
trading/hedging advice.

---

## Explicitly not recommended yet: autonomous agentic actions

Zip's "Superagents" trend (auto-executing approvals, auto-issuing POs,
agent-initiated communications) is where the market is heading, but for
ProcurePro specifically — real Paystack/Flutterwave money movement plus
NCDMB regulatory exposure — autonomous action is the wrong next step. Every
feature above should stay "accelerator with mandatory human review." If
autonomy is pursued later, start with the lowest-stakes case only (e.g.,
auto-approving sub-threshold, non-flagged, already-budgeted POs) with hard
caps, full audit trail, and an instant kill-switch — never extended to
anything touching vendor payouts or compliance filings.
