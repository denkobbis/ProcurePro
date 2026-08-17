import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/Button";
import Reveal from "@/components/landing/Reveal";
import FeatureCarousel from "@/components/landing/FeatureCarousel";
import { DemoRequestForm } from "@/components/landing/DemoRequestForm";
import {
  MockupFrame,
  FloatingBadge,
  ListRowsCard,
  StatPlateCard,
  CompareCard,
  ChatExtractCard,
  RuleTableCard,
  MatchPanelCard,
  HeroDashboardCard,
} from "@/components/landing/mockups";
import {
  LogoMarkIcon,
  DocumentIcon,
  CheckCircleIcon,
  ScaleIcon,
  CartIcon,
  InboxIcon,
  WalletIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  SparkleIcon,
} from "@/components/icons";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 rounded-sm";

const STATS = [
  { value: "6", label: "stages, one system — request to receiving" },
  { value: "9", label: "AI-assisted checks running quietly in the background" },
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

const LOOP = [
  { icon: DocumentIcon, label: "Drafted & submitted" },
  { icon: CheckCircleIcon, label: "Awaiting approval" },
  { icon: CartIcon, label: "Open purchase orders" },
  { icon: InboxIcon, label: "Awaiting receipt" },
];

const FEATURES: { icon: typeof DocumentIcon; title: string; description: string; render: () => ReactNode }[] = [
  {
    icon: DocumentIcon,
    title: "Every request tracked, staged, and searchable",
    description: "Submission through receiving, at a glance — stage bars instead of a status pill, and age that turns amber the moment something's slower than this org's own average.",
    render: () => (
      <ListRowsCard
        title="Requests"
        rows={[
          { label: "REQ-000034 approved, ready for PO", sub: "Moved this morning", barPercent: 85 },
          { label: "REQ-000033 approved, ready for PO", sub: "Moved yesterday", barPercent: 85 },
          { label: "REQ-000041 moved to review", sub: "Awaiting approval", barPercent: 45 },
        ]}
      />
    ),
  },
  {
    icon: SparkleIcon,
    title: "Upload a quote, skip the retyping",
    description: "Upload a vendor quote, invoice, or spec sheet and Claude fills in the request for you — description, quantity, cost, part number. You review and submit; nothing saves itself.",
    render: () => (
      <ChatExtractCard
        fields={[
          { label: "Invoice", value: "DIS-4471" },
          { label: "Vendor", value: "Delta Industrial" },
          { label: "Qty", value: "5" },
          { label: "Unit price", value: "₦49,000" },
        ]}
      />
    ),
  },
  {
    icon: SparkleIcon,
    title: "The alerts a busy team would otherwise miss",
    description: "Slow approvals, FX moves, expiring certificates, vendors sharing a bank account — ranked by cost of waiting and surfaced the moment you sign in, computed from your own data.",
    render: () => (
      <ListRowsCard
        title="Needs you today"
        rows={[
          { label: "PO-000005 Atlas Crane & Rigging", value: "$220,000", sub: "USD down 45% since pricing", flagged: true },
          { label: "REQ-000032 Hard hats, ANSI-rated", value: "₦390,000", sub: "13 days waiting", flagged: true },
          { label: "PO-000006 Continental Pipe & Fittings", value: "€7,200", sub: "EUR down 19% since pricing" },
        ]}
      />
    ),
  },
  {
    icon: WalletIcon,
    title: "Landed cost you can trust, not just a PO number",
    description: "Multi-currency purchase orders track FX rate, freight, and customs duty automatically, with a warning the moment the Naira moves against an open order.",
    render: () => (
      <StatPlateCard
        label="Landed cost"
        value="₦14,245,000.00"
        rows={[
          { label: "PO value", value: "₦4,040,000.00" },
          { label: "Freight", value: "₦120,000.00" },
          { label: "Customs duty", value: "₦85,000.00" },
        ]}
      />
    ),
  },
  {
    icon: ScaleIcon,
    title: "Quotes ranked for you, not just collected",
    description: "Vendor quotes on an RFQ are auto-ranked by total price and lead time, so picking a winner isn't a spreadsheet exercise.",
    render: () => (
      <CompareCard
        options={[
          { label: "Naija Office Essentials", price: "₦75,000", detail: "5-day lead time", recommended: true },
          { label: "Delta Industrial Supplies", price: "$45.00", detail: "21-day lead time" },
        ]}
      />
    ),
  },
  {
    icon: ShieldCheckIcon,
    title: "Vendor compliance, built in — not bolted on",
    description: "NCDMB local content and certificate expiry live on the vendor record itself, and a shared bank account across two vendors gets flagged before it becomes a payment mistake.",
    render: () => (
      <ListRowsCard
        title="Vendors"
        rows={[
          { label: "Zenith Industrial Chemicals", value: "71% local", sub: "NCDMB compliant" },
          { label: "Sahara Safety Equipment", value: "62% local", sub: "NCDMB compliant" },
          { label: "BlueWave Marine Logistics", sub: "Shares a bank account with Zenith", flagged: true },
        ]}
      />
    ),
  },
  {
    icon: DocumentIcon,
    title: "Every invoice checked against what was ordered and received",
    description: "Upload the vendor's invoice and it's matched line by line against the PO and what actually arrived — a quiet price bump or a quantity that's not backed by a receipt gets flagged before it's paid.",
    render: () => <MatchPanelCard invoice="DIS-4471" amount="₦245,000.00" flag="Unit price is up 8.9% vs. the PO's ₦45,000.00." />,
  },
  {
    icon: ShieldCheckIcon,
    title: "Approval routing you configure, not we hardcode",
    description: "Set who signs off by department and amount, and in what order, from a settings screen — no waiting on us to change a threshold buried in code.",
    render: () => (
      <RuleTableCard
        rows={[
          { dept: "Operations", range: "₦0 – ₦500,000", step: "1", role: "Approver" },
          { dept: "All departments", range: "₦500,000+", step: "2", role: "Finance / Admin" },
        ]}
      />
    ),
  },
];

const PRICING_INCLUDES = [
  "Full requisition-to-payment workflow",
  "Multi-step approvals & budget enforcement",
  "Multi-currency POs with landed-cost tracking",
  "NCDMB vendor compliance tracking",
  "Vendor payments via Paystack & Flutterwave",
  "3-way invoice matching, exportable to Xero",
  "Role-based access & full audit log",
];

const REAL_INTEGRATIONS = ["Paystack", "Flutterwave", "Xero"];

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ utm_source?: string; utm_medium?: string; utm_campaign?: string }>;
}) {
  const { utm_source, utm_medium, utm_campaign } = await searchParams;
  return (
    <div id="marketing-root" className="flex-1 bg-white">
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
            <a href="#demo" className={`text-sm font-medium text-zinc-600 hover:text-zinc-900 ${focusRing}`}>
              Request a demo
            </a>
            <Link href="/login" className={`text-sm font-medium text-zinc-600 hover:text-zinc-900 ${focusRing}`}>
              Sign in
            </Link>
            <ButtonLink href="/signup" variant="accent" size="sm">
              Start free trial
            </ButtonLink>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-950">
        <div className="bg-brand-glow pointer-events-none absolute inset-0" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -right-32 top-1/4 h-96 w-96 rounded-full opacity-20 blur-[100px]"
          style={{ background: "radial-gradient(circle, var(--color-accent-glow), transparent 70%)" }}
          aria-hidden="true"
        />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:py-28">
          <div>
            <h1 className="animate-reveal text-[40px] font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-[62px]">
              Procurement control, without the SAP-sized budget.
            </h1>
            <p className="animate-reveal mt-6 max-w-lg text-base leading-relaxed text-brand-200 sm:text-lg" style={{ animationDelay: "0.08s" }}>
              ProcurePro replaces spreadsheets and WhatsApp threads with real approval chains, budget
              enforcement, and vendor compliance — built for Nigerian oil &amp; gas and heavy-industry
              teams who need enterprise depth, not enterprise cost.
            </p>
            <div className="animate-reveal mt-8 flex flex-wrap items-center gap-4" style={{ animationDelay: "0.16s" }}>
              <ButtonLink href="/signup" variant="accent" size="lg" className="gap-2">
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
                <li key={industry} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-brand-200">
                  {industry}
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-reveal relative flex justify-center lg:justify-end" style={{ animationDelay: "0.1s" }}>
            <div
              className="pointer-events-none absolute -inset-8 rounded-full opacity-25 blur-[80px]"
              style={{ background: "radial-gradient(circle, var(--color-accent-500), transparent 70%)" }}
              aria-hidden="true"
            />
            <div className="relative">
              <HeroDashboardCard />
              <FloatingBadge position="bottom-left" tone="accent">
                11 things need a decision
              </FloatingBadge>
            </div>
          </div>
        </div>
      </section>

      {/* Stat strip */}
      <section className="border-b border-zinc-100 bg-white px-4 py-10 sm:px-6">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-sm leading-relaxed text-zinc-600">
              <span className="text-xl font-semibold tracking-tight text-brand-700">{stat.value}</span> {stat.label}
            </div>
          ))}
        </div>
      </section>

      {/* Problem */}
      <section className="bg-white px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-zinc-900">The way most teams still run procurement</h2>
          </Reveal>
          <div className="mt-12 divide-y divide-zinc-100 border-t border-zinc-100">
            {PROBLEMS.map((p, i) => (
              <Reveal key={p.title} delay={i * 80}>
                <div className="flex flex-col gap-4 py-8 sm:flex-row sm:items-start sm:gap-8">
                  <div className="flex items-baseline gap-4 sm:w-64 sm:shrink-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <p.icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-base font-semibold text-zinc-900">{p.title}</h3>
                  </div>
                  <p className="max-w-lg text-sm leading-relaxed text-zinc-500 sm:pt-1">{p.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* The loop, end to end */}
      <section className="border-t border-zinc-100 bg-zinc-50 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">The loop, end to end</h2>
            <p className="mt-3 max-w-xl text-base text-zinc-500">
              The same four stages your team sees on their own &ldquo;Today&rdquo; screen every morning — nothing sits in an inbox waiting to be noticed.
            </p>
          </Reveal>
          <div className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-4">
            {LOOP.map((step, i) => (
              <Reveal key={step.label} delay={i * 70}>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-zinc-200 bg-white text-brand-600 shadow-sm">
                  <step.icon className="h-5 w-5" />
                </div>
                <div className="mt-3 text-sm font-medium text-zinc-900">{step.label}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-zinc-900">Designed around how your team actually works</h2>
            <p className="mt-3 max-w-xl text-base text-zinc-500">Every card below reflects a real screen and real figures from the product — illustrated, not screenshotted, so the shape of the work stays legible at a glance.</p>
          </Reveal>

          <div className="mt-12">
            <FeatureCarousel>
              {FEATURES.map((feature) => (
                <div key={feature.title} data-card className="flex w-[320px] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm sm:w-[340px]">
                  <MockupFrame>{feature.render()}</MockupFrame>
                  <div className="p-6">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <feature.icon className="h-4 w-4" />
                    </div>
                    <h3 className="mt-3 text-lg font-semibold tracking-tight text-zinc-900">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-500">{feature.description}</p>
                  </div>
                </div>
              ))}
            </FeatureCarousel>
          </div>
        </div>
      </section>

      {/* Trust / proof — a real person doing real work, not a logo wall of tools we don't integrate with */}
      <section className="relative overflow-hidden bg-brand-950 px-4 py-20 sm:px-6">
        <div className="bg-brand-glow pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tight text-white">Built for the team that actually runs the purchase.</h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-brand-200">
              From the first request to the vendor getting paid, every step is routed, tracked, and backed by
              real data — not a spreadsheet somebody has to remember to update.
            </p>
            <div className="mt-8 flex items-center gap-6">
              {REAL_INTEGRATIONS.map((name) => (
                <span key={name} className="text-sm font-semibold tracking-tight text-brand-300">
                  {name}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-brand-400">Live payout rails and export formats — not aspirational integrations.</p>
          </Reveal>
          <Reveal delay={100} className="relative">
            <div className="relative overflow-hidden rounded-2xl shadow-2xl shadow-black/40">
              <Image
                src="/landing/hero-photo.jpg"
                alt="A procurement professional reviewing a purchase on a laptop"
                width={1600}
                height={1067}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-950/70 via-transparent to-transparent" />
            </div>
            <FloatingBadge position="top-left" tone="accent">
              8.9% variance caught
            </FloatingBadge>
          </Reveal>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative overflow-hidden bg-brand-950 px-4 py-20 sm:px-6">
        <div className="bg-brand-glow pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-4xl grid-cols-1 items-center gap-12 lg:grid-cols-[auto_1fr]">
          <Reveal className="mx-auto shrink-0 lg:mx-0">
            <svg viewBox="0 0 140 140" className="h-32 w-32 sm:h-36 sm:w-36" aria-hidden="true">
              <circle cx="70" cy="70" r="58" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
              <circle
                cx="70"
                cy="70"
                r="58"
                fill="none"
                stroke="var(--color-accent-400)"
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
          </Reveal>

          <Reveal delay={80} className="text-center lg:text-left">
            <h2 className="text-3xl font-semibold tracking-tight text-white">One plan. Everything included.</h2>
            <p className="mt-3 text-base text-brand-200">No tiers to compare, no features held back for a higher plan.</p>

            <div className="mt-10 rounded-xl border border-white/10 bg-white/[0.04] p-8 text-left">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight text-white">₦25,000</span>
                <span className="text-base text-brand-300">/ month</span>
              </div>
              <p className="mt-1 text-sm text-brand-300">14-day free trial. No credit card required.</p>

              <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {PRICING_INCLUDES.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-brand-100">
                    <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
                    {item}
                  </li>
                ))}
              </ul>

              <ButtonLink href="/signup" variant="accent" size="lg" className="mt-8 w-full justify-center gap-2">
                Start your free trial
                <ArrowRightIcon className="h-4 w-4" />
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Demo request */}
      <section id="demo" className="relative overflow-hidden bg-brand-950 px-4 py-20 sm:px-6">
        <div className="bg-brand-glow pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tight text-white">Not sure the trial is for you?</h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-brand-200">
              Tell us how procurement runs at your company and we&rsquo;ll walk through ProcurePro against your real
              workflow — your POs, your vendors, your approval chain — in a 20-minute call. Nothing to install, no card.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                "See your approval chain and budget checks, not a canned demo",
                "Ask anything about NCDMB tracking, landed cost, or payments",
                "Leave with a concrete plan to try it with your own team",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-brand-100">
                  <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={100}>
            <DemoRequestForm utmSource={utm_source} utmMedium={utm_medium} utmCampaign={utm_campaign} />
          </Reveal>
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
