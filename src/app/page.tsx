import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/Button";
import {
  LogoMarkIcon,
  DocumentIcon,
  CheckCircleIcon,
  ScaleIcon,
  CartIcon,
  TruckIcon,
  InboxIcon,
  WalletIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
} from "@/components/icons";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 rounded-sm";

const STATS = [
  { value: "6", label: "stages, one system — request to receiving" },
  { value: "2", label: "payout rails built in — Paystack & Flutterwave" },
  { value: "₦25k", label: "flat per month, 14-day trial, no card required" },
];

const INDUSTRIES = ["Oil & Gas", "Construction / EPC", "Trading & Distribution", "General B2B"];

const PROBLEMS = [
  {
    icon: DocumentIcon,
    title: "Approvals buried in email and WhatsApp",
    description: "By the time a purchase order gets sign-off, nobody remembers who approved what, or why it was urgent.",
  },
  {
    icon: WalletIcon,
    title: "Budgets discovered after they're blown",
    description: "Spend visibility means asking finance for a spreadsheet, days after the money's already gone.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Vendor compliance lives in someone's head",
    description: "NCDMB certificates, local content percentages, bank details — tracked nowhere, until an audit or a payment asks.",
  },
];

const WORKFLOW = [
  { icon: DocumentIcon, label: "Request" },
  { icon: CheckCircleIcon, label: "Approval" },
  { icon: ScaleIcon, label: "RFQ" },
  { icon: CartIcon, label: "Purchase order" },
  { icon: TruckIcon, label: "Shipping & customs" },
  { icon: InboxIcon, label: "Receiving" },
];

const FEATURES = [
  {
    icon: ChartBarIcon,
    title: "One dashboard, the whole team's queue",
    description:
      "Every request, approval, and open purchase order in one place — no more chasing status updates across email threads.",
    image: "/landing/landing_dashboard.png",
  },
  {
    icon: WalletIcon,
    title: "Budgets that stop overspend before it happens",
    description:
      "Department and category budgets enforce themselves. Set a hard block and the system refuses submission once a budget's exhausted — no more finding out after the fact.",
    image: "/landing/landing_budgets.png",
  },
  {
    icon: ChartBarIcon,
    title: "Spend visibility finance actually trusts",
    description:
      "Spend by department, category, and vendor, plus a live trend — normalized across currencies so a landed-cost import and a local NGN purchase report the same way.",
    image: "/landing/landing_reports.png",
  },
  {
    icon: ShieldCheckIcon,
    title: "Vendor compliance, built in — not bolted on",
    description:
      "NCDMB local content percentage, certificate numbers, and expiry dates live on the vendor record itself, with alerts before a certificate lapses.",
    image: "/landing/landing_vendors.png",
  },
  {
    icon: CartIcon,
    title: "Purchase orders with landed cost, not just a PO number",
    description:
      "Multi-currency purchase orders track FX rate, freight, and customs duty automatically — so the number finance sees is what the order actually costs to land.",
    image: "/landing/landing_po_list.png",
  },
];

const PRICING_INCLUDES = [
  "Full requisition-to-payment workflow",
  "Multi-step approvals & budget enforcement",
  "Multi-currency POs with landed-cost tracking",
  "NCDMB vendor compliance tracking",
  "Vendor payments via Paystack & Flutterwave",
  "Role-based access & full audit log",
];

export default function LandingPage() {
  return (
    <div className="flex-1">
      <nav className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-2 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <LogoMarkIcon className="h-7 w-7 text-brand-600" />
            <span className="text-lg font-semibold tracking-tight text-zinc-900">ProcurePro</span>
          </div>
          <div className="flex items-center gap-5 sm:gap-6">
            <a href="#features" className={`text-sm font-medium text-zinc-600 hover:text-zinc-900 ${focusRing}`}>
              Features
            </a>
            <a href="#pricing" className={`text-sm font-medium text-zinc-600 hover:text-zinc-900 ${focusRing}`}>
              Pricing
            </a>
            <Link href="/login" className={`text-sm font-medium text-zinc-600 hover:text-zinc-900 ${focusRing}`}>
              Sign in
            </Link>
            <ButtonLink href="/signup" size="sm">
              Start free trial
            </ButtonLink>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-950">
        <div className="bg-brand-glow pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:py-28">
          <div>
            <h1 className="animate-reveal text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl">
              Procurement control, without the SAP-sized budget.
            </h1>
            <p
              className="animate-reveal mt-6 max-w-lg text-base leading-relaxed text-brand-200 sm:text-lg"
              style={{ animationDelay: "0.08s" }}
            >
              ProcurePro replaces spreadsheets and WhatsApp threads with real approval chains, budget
              enforcement, and vendor compliance — built for Nigerian oil &amp; gas and heavy-industry
              teams who need enterprise depth, not enterprise cost.
            </p>
            <div className="animate-reveal mt-8 flex flex-wrap items-center gap-4" style={{ animationDelay: "0.16s" }}>
              <ButtonLink href="/signup" size="lg" className="gap-2">
                Start 14-day free trial
                <ArrowRightIcon className="h-4 w-4" />
              </ButtonLink>
              <Link
                href="/login"
                className={`inline-flex items-center justify-center rounded-md border border-white/20 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-white/10 ${focusRing}`}
              >
                Sign in
              </Link>
            </div>
            <p className="animate-reveal mt-5 text-sm text-brand-300" style={{ animationDelay: "0.22s" }}>
              No credit card required to start · Built for NCDMB-regulated procurement
            </p>

            <ul className="mt-8 flex flex-wrap gap-2">
              {INDUSTRIES.map((industry) => (
                <li
                  key={industry}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-brand-200"
                >
                  {industry}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="aspect-[2880/1000] overflow-hidden rounded-xl border border-white/10 shadow-2xl shadow-black/40">
              <Image
                src="/landing/landing_dashboard.png"
                alt="ProcurePro dashboard showing requests, approvals, and open purchase orders"
                width={2880}
                height={1800}
                priority
                className="h-full w-full object-cover object-top"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stat strip */}
      <section className="border-b border-zinc-100 bg-white px-4 py-10 sm:px-6">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-3">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex items-baseline gap-3">
              <span className="text-3xl font-semibold tracking-tight text-brand-700">{stat.value}</span>
              <span className="text-sm leading-snug text-zinc-500">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Problem */}
      <section className="bg-white px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-zinc-900">
            The way most teams still run procurement
          </h2>
          <div className="mt-12 divide-y divide-zinc-100 border-t border-zinc-100">
            {PROBLEMS.map((p, i) => (
              <div key={p.title} className="flex flex-col gap-4 py-8 sm:flex-row sm:items-start sm:gap-8">
                <div className="flex items-baseline gap-4 sm:w-64 sm:shrink-0">
                  <span className="text-sm tabular-nums text-zinc-300">{String(i + 1).padStart(2, "0")}</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <p.icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-semibold text-zinc-900">{p.title}</h3>
                </div>
                <p className="max-w-lg text-sm leading-relaxed text-zinc-500 sm:pt-1">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="border-t border-zinc-100 bg-zinc-50 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">One system, the whole purchase lifecycle</h2>
          <p className="mt-3 max-w-xl text-base text-zinc-500">
            From the first request to the goods arriving at your yard, every step is tracked, approved,
            and auditable.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            {WORKFLOW.map((step, i) => (
              <div key={step.label} className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-zinc-200 bg-white text-brand-600 shadow-sm">
                  <step.icon className="h-5 w-5" />
                </div>
                <div className="mt-3 text-sm font-medium text-zinc-900">
                  <span className="tabular-nums text-zinc-400">{String(i + 1).padStart(2, "0")}</span>{" "}
                  {step.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-24">
          {FEATURES.map((feature, i) => (
            <div key={feature.title} className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className={i % 2 === 1 ? "lg:order-2" : ""}>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900">{feature.title}</h3>
                <p className="mt-3 max-w-md text-base leading-relaxed text-zinc-500">{feature.description}</p>
              </div>
              <div className={i % 2 === 1 ? "lg:order-1" : ""}>
                <div className="aspect-[2880/1150] overflow-hidden rounded-xl border border-zinc-200 shadow-lg shadow-zinc-200/60">
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    width={2880}
                    height={1800}
                    className="h-full w-full object-cover object-top"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative overflow-hidden bg-brand-950 px-4 py-20 sm:px-6">
        <div className="bg-brand-glow pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-4xl grid-cols-1 items-center gap-12 lg:grid-cols-[auto_1fr]">
          <div className="mx-auto shrink-0 lg:mx-0">
            <svg viewBox="0 0 140 140" className="h-32 w-32 sm:h-36 sm:w-36" aria-hidden="true">
              <circle cx="70" cy="70" r="58" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
              <circle
                cx="70"
                cy="70"
                r="58"
                fill="none"
                stroke="var(--color-brand-400)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 58}
                strokeDashoffset={0}
                transform="rotate(-90 70 70)"
              />
              <text x="70" y="66" textAnchor="middle" fontSize="26" fontWeight="600" fill="white">
                100%
              </text>
              <text x="70" y="86" textAnchor="middle" fontSize="10" fill="var(--color-brand-300)">
                included
              </text>
            </svg>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-semibold tracking-tight text-white">One plan. Everything included.</h2>
            <p className="mt-3 text-base text-brand-200">
              No tiers to compare, no features held back for a higher plan.
            </p>

            <div className="mt-10 rounded-xl border border-white/10 bg-white/[0.04] p-8 text-left">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight text-white">₦25,000</span>
                <span className="text-base text-brand-300">/ month</span>
              </div>
              <p className="mt-1 text-sm text-brand-300">14-day free trial. No credit card required.</p>

              <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {PRICING_INCLUDES.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-brand-100">
                    <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                    {item}
                  </li>
                ))}
              </ul>

              <ButtonLink href="/signup" size="lg" className="mt-8 w-full justify-center gap-2">
                Start your free trial
                <ArrowRightIcon className="h-4 w-4" />
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <LogoMarkIcon className="h-6 w-6 text-brand-600" />
            <span className="text-sm font-semibold text-zinc-900">ProcurePro</span>
            <span className="text-sm text-zinc-400">— Procurement control for heavy industry.</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <Link href="/login" className={`hover:text-zinc-900 ${focusRing}`}>
              Sign in
            </Link>
            <Link href="/signup" className={`hover:text-zinc-900 ${focusRing}`}>
              Start free trial
            </Link>
            <span>&copy; {new Date().getFullYear()} ProcurePro</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
