# ProcurePro Sales Playbook

A working document: demo script, outreach templates, and competitive positioning. Fill in the bracketed placeholders (your name, contact details, prospect names) before sending anything.

---

## 1. Demo Script (~20 minutes)

**Goal:** the prospect should leave believing ProcurePro replaces their spreadsheet/WhatsApp process without the SAP-level cost or implementation weight, and sees themselves in the screens.

### Opening (2 min)
- "Thanks for the time — before I show anything, tell me: how does a purchase request move through your team today? Email, WhatsApp, a shared sheet?"
- Listen for: who approves, how budgets get checked, how vendor documents (NCDMB certs, quotes) are tracked, how customs/freight costs get added to a PO.
- Bridge: "That's exactly the gap ProcurePro closes — let me show you with real data, not a slide."

### Live walkthrough (12–14 min)
Follow the loop in this order — it mirrors how the product itself is structured, so it reads as one coherent story, not a feature tour:

1. **Today dashboard** — "This is what your team sees every morning: what's drafted, what's awaiting approval, what's open. Nothing sits in an inbox unnoticed." Point out the "Needs you today" queue ranked by cost of waiting (an FX-exposed PO, an aging approval).
2. **New request + AI extract** — Upload a sample vendor quote/invoice live. "Your team doesn't retype line items — upload the document, review what's extracted, submit."
3. **Approval routing** — Show `/approval-rules`. "You set who signs off by department and amount, and in what order — not us, not a support ticket."
4. **Purchase order + landed cost** — Open a multi-currency PO. "Freight, customs duty, FX rate — rolled up automatically. If the Naira moves against an open order, you're warned, not surprised."
5. **Receiving + invoice matching** — This is the moment to slow down. Record or show a sample invoice with a price bump. "Watch — the invoice says ₦49,000 a unit, the PO says ₦45,000. ProcurePro catches that before it's paid, not after." This is the single most memorable proof point — don't rush it.
6. **Vendor compliance** — Show the vendor record with NCDMB local content % and certificate expiry. "This lives on the vendor, not in someone's inbox waiting for an audit."
7. **Reports** — Spend by department/category, and the natural-language spend copilot if there's time.

### Objection handling (see section 3 below)

### Close (2–3 min)
- "It's one flat plan — ₦25,000 a month, everything included, no tiers to negotiate. 14-day trial, no card required."
- Ask directly: "What would you need to see to run this with your team for the next two weeks?"
- Next step: get a date for either a trial start or a follow-up with whoever owns budget sign-off.

---

## 2. Outreach Email Templates

Keep these short — a Nigerian ops/finance lead reading on a phone between meetings won't read past four short paragraphs.

### A. Cold email — Procurement / Operations Director

> **Subject: Still tracking POs over WhatsApp?**
>
> Hi [Name],
>
> Quick one — if purchase approvals at [Company] still move through email threads and WhatsApp, you already know the real cost: nobody can say who approved what, or whether a vendor's NCDMB certificate quietly expired last month.
>
> ProcurePro is a procurement platform built specifically for Nigerian oil & gas and heavy-industry teams — multi-step approvals, landed-cost tracking on multi-currency POs, and vendor compliance that doesn't live in someone's inbox. We also catch invoice overcharges automatically — one recent test caught a vendor invoicing 8.9% above the agreed PO price.
>
> Worth 20 minutes to see it against your own workflow? No obligation, and the trial doesn't need a card.
>
> [Your name]
> [Phone / email]

### B. Cold email — Finance / Admin lead

> **Subject: Budget visibility that doesn't wait for a spreadsheet**
>
> Hi [Name],
>
> If your team finds out a budget's blown days after the money's gone, that's usually a process gap, not a discipline one — spend visibility means someone has to remember to send you a spreadsheet.
>
> ProcurePro gives finance real-time budget tracking by department and category, landed-cost visibility on every import (freight + customs, not just the PO line), and 3-way invoice matching that flags a price or quantity mismatch before you pay it — not after.
>
> One flat plan, ₦25,000/month, 14-day trial. Happy to run through it with your actual numbers rather than a demo dataset — 20 minutes?
>
> [Your name]
> [Phone / email]

### C. Follow-up (no response after ~5 business days)

> **Subject: Re: [original subject]**
>
> Hi [Name] — following up in case this got buried (fair, if procurement runs through your inbox already).
>
> One thing I didn't mention last time: the trial is genuinely free for 14 days, no card on file, and you can bring your own POs/vendors into it rather than a canned demo. If procurement isn't the right priority right now, no worries — just say the word and I'll leave it there.
>
> [Your name]

---

## 3. Objection Handling

| Objection | Response |
|---|---|
| "We already use [Excel / a shared drive / WhatsApp groups]." | "That's basically every prospect we talk to — the cost isn't the tool, it's what happens when someone's on leave and nobody else knows the approval status of a ₦2M order. ProcurePro doesn't ask you to give up structure, it gives you the structure your spreadsheet can't enforce." |
| "We looked at SAP/NetSuite before — too expensive, too much implementation." | "Right — that's exactly the gap. Full approval chains, landed cost, and audit logging, but no SAP-level implementation project. You can be running this with your team inside a day." |
| "Is this built for Nigeria specifically, or a generic tool with NGN added?" | "Built specifically for it — NCDMB local content and certificate tracking is a first-class field on the vendor record, not a workaround. Multi-currency landed cost (FX + freight + customs) is core to how POs work, not bolted on." |
| "How do we know the numbers/data are real, not a staged demo?" | Be honest: "We're pre-launch — no case studies yet. What I can show you is the product actually working end to end, with real figures, not a slide deck. That 8.9% invoice catch I mentioned is a real thing the matching logic caught in testing, not a marketing number." Don't oversell traction that doesn't exist — it's the fastest way to lose trust with this audience. |
| "What if we need [feature X] you don't have?" | Note it, don't promise a timeline you can't keep. "That's not built today — I'd rather tell you that now than after you've onboarded. Is it a blocker for a 14-day trial, or something we could revisit once you've seen the core workflow?" |
| "Can vendors get paid directly through this?" | "Yes — Paystack and Flutterwave transfer, bank-verified before sending. Note: we haven't had a live customer transfer through it yet, so if that's a hard requirement day one, be upfront that we'd want to test it carefully together first." |

---

## 4. Competitive Positioning (internal reference — not for prospects)

Quick-reference framing for where ProcurePro wins and where it's honestly behind. Use to anticipate objections, not to disparage competitors by name in front of a prospect unless they bring one up first.

**Where ProcurePro wins:**
- **Nigeria-specific depth**: NCDMB compliance, NGN-first multi-currency with landed cost (freight + customs duty), Paystack/Flutterwave payout rails — none of the international players (Precoro, Procurify, Kissflow, Spendflo, ProcureDesk) build this in natively.
- **Price and simplicity vs. enterprise tools**: full requisition-to-payment depth (approvals, budgets, RFQ comparison, 3-way matching, audit log) without SAP/NetSuite's cost or implementation weight.
- **Depth vs. lightweight tools**: unlike bare-bones vendor trackers in the same price bracket, ProcurePro enforces real approval chains and budget checks, not just a list.

**Where ProcurePro is honestly behind (know these before a prospect asks):**
- **No case studies or customer logos yet** — pre-launch. Be upfront rather than caught out.
- **No completed live payment/payout transaction yet** — the rails are built and bank-verified, but say so plainly if asked about production track record.
- **Smaller company, less brand recognition** than Precoro/Procurify/Kissflow — the pitch has to win on specificity (NCDMB, landed cost, price) since it can't win on brand trust yet.
- **No mobile app** — web-only today (responsive, but not a native app).

**One-line positioning to keep in your head on every call:**
"Full enterprise procure-to-pay depth, priced and built for mid-market Nigerian companies — not the SAP cost, not the stripped-down vendor-list toy."
