# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: procurement, finance, and operations teams at Nigerian oil & gas and heavy-industry companies (10–200 employees) — requesters, approvers, procurement officers, and finance/admin roles inside one organization. The app also supports construction, trading, and general-B2B-procurement organizations via a per-org industry toggle, but oil & gas is the flagship vertical and the one with the deepest feature fit (NCDMB compliance, customs/freight tracking, equipment leasing).

The landing page is written for two audiences at once, by request: the **buyer/decision-maker** (ops director, finance lead, or founder evaluating procurement software) leads the hero and framing — cost control, compliance risk, ROI, replacing spreadsheets/WhatsApp-based purchasing. The **day-to-day user** (procurement officer, requester) is served by feature sections that show the actual workflow and interface in use, not just abstract claims — reassures both "will my team actually adopt this" and "will this work for me."

## Product Purpose

ProcurePro is a full requisition-to-payment procurement platform: purchase request → multi-step approval → RFQ/vendor quote comparison → purchase order → shipping/customs tracking → receiving, with department/category budgets, audit logging, and reporting. It also handles the money on both sides of the relationship: ProcurePro can pay a PO's vendor directly (Paystack/Flutterwave transfer), and customers pay ProcurePro via subscription (also Paystack).

Success = a company stops running procurement through email/WhatsApp/spreadsheets and gets: enforced approval chains, real-time budget visibility, vendor compliance tracking, and an audit trail — without adopting SAP/NetSuite-level complexity or cost.

## Positioning

Full enterprise procure-to-pay depth (multi-step approvals, RFQ comparison, landed-cost/multi-currency, budget enforcement, audit logging) at a price and simplicity point built for mid-market Nigerian companies — not the stripped-down "just track a vendor list" tools in this price bracket, and not SAP/NetSuite's cost or implementation weight. The oil & gas / heavy-industry specialization (NCDMB local-content compliance, customs/freight/landed-cost tracking, equipment leasing) is the mechanism a horizontal procurement SaaS could not truthfully copy without rebuilding it — it comes from the workflow, not a labeled checkbox.

## Operating Context

Nigerian business context: NGN is the default currency; purchase orders support multi-currency (USD/EUR/GBP) with FX-rate and landed-cost (freight + customs duty) tracking for imported parts and equipment. NCDMB (Nigerian Content Development and Monitoring Board) compliance — local-content percentage and certificate tracking — is a real regulatory requirement for oil & gas vendors, not decorative. Vendor payments and customer subscription billing both run through Paystack (primary) and Flutterwave (vendor payments only).

## Capabilities and Constraints

- Next.js 16 (App Router, Server Actions) + Supabase (Postgres, Auth, Storage), deployed on Vercel.
- Multi-tenant: each customer is an `organization` with row-level-security-isolated data; self-serve signup at `/signup` creates an org and its first `super_admin`; teammates are added via admin invite.
- Subscription: one flat plan, ₦25,000/month, 14-day trial, Paystack hosted checkout, server-enforced read-only lockout on lapse. **No completed live checkout yet** — pricing is real and committed, but nobody has gone through the actual payment flow end to end.
- Vendor payments: real money movement via Paystack/Flutterwave transfer APIs, bank-verified before sending. **No completed live transfer yet.**
- Five roles: requester, approver, procurement_officer, finance_admin, super_admin.
- Per-org industry toggle (oil_gas / construction / trading / general) gates Equipment leasing and NCDMB compliance UI on/off.

## Brand Commitments

Name: **ProcurePro**. Existing shipped visual identity: a deep navy "engineering blueprint" color system (custom Tailwind theme tokens, not a stock palette), Geist Sans throughout, a hand-drawn stroke icon set (no external icon library), an abstract rounded-square "P" logomark. This identity is approved and should be kept — new landing-page work adopts structural/layout inspiration from a reference SaaS dashboard (donut/ring data visualizations, stat cards with trend deltas, chip-style filters, a problem→solution→feature case-study narrative structure) without adopting that reference's own teal color identity.

## Evidence on Hand

The real, live product itself (in-app screenshots exist in `/screenshot`). **No real customer testimonials, logos, press mentions, or case studies exist yet** — the one organization with real data in the system (referenced internally) is confirmed test/seed data, not a citable customer, and must not be named, quoted, or implied as a customer anywhere on the landing page. Any social-proof section must either use real, generic claims the product can back up (e.g., specific built capabilities) or be omitted — never fabricated logos, quotes, or user counts.

## Product Principles

1. Depth over breadth: procurement teams need real workflow enforcement (approvals, budgets, audit trail), not a glorified spreadsheet — don't undersell this as "simple," undersell the alternative (spreadsheets/email) instead.
2. Compliance and landed cost are the vertical's real teeth: NCDMB tracking and customs/freight cost visibility are regulatory/financial necessities for this audience, not feature-list filler — they deserve concrete, specific treatment, not a generic checkmark icon.
3. No fabricated social proof, ever — a pre-launch product's landing page should earn trust through specificity about what it does, not invented traction.
4. Speak to two readers in one page without splitting into two pages: the buyer needs to be convinced to try it; the eventual user needs to recognize their own job in the screenshots.
5. Keep the existing navy brand identity; this is a maturity/structure upgrade to the landing experience, not a rebrand.

## Accessibility & Inclusion

No product-specific requirement established beyond standard web accessibility (the existing app already themes focus rings, contrast, and keyboard navigation from the brand palette).
