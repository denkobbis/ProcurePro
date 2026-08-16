import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { ButtonLink } from "@/components/Button";
import ThemeToggle from "@/components/ThemeToggle";
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

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-brand-950 rounded-sm";

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

const FEATURES = [
  {
    icon: DocumentIcon,
    title: "Every request tracked, staged, and searchable",
    description:
      "Submission through receiving, at a glance — stage bars instead of a status pill, and age that turns amber the moment something's slower than this org's own average.",
    image: "/landing/v2_requests_list.png",
    width: 2624,
    height: 920,
  },
  {
    icon: SparkleIcon,
    title: "Upload a quote, skip the retyping",
    description:
      "Upload a vendor quote, invoice, or spec sheet and Claude fills in the request for you — description, quantity, cost, part number. You review and submit; nothing saves itself.",
    image: "/landing/v2_ai_extract.png",
    width: 1630,
    height: 252,
  },
  {
    icon: SparkleIcon,
    title: "The alerts a busy team would otherwise miss",
    description:
      "Slow approvals, FX moves, expiring certificates, vendors sharing a bank account — ranked by cost of waiting and surfaced the moment you sign in, computed from your own data.",
    image: "/landing/v2_needs_you_today.png",
    width: 1600,
    height: 720,
  },
  {
    icon: WalletIcon,
    title: "Landed cost you can trust, not just a PO number",
    description:
      "Multi-currency purchase orders track FX rate, freight, and customs duty automatically, with a warning the moment the Naira moves against an open order.",
    image: "/landing/v2_landed_cost.png",
    width: 694,
    height: 394,
  },
  {
    icon: ScaleIcon,
    title: "Quotes ranked for you, not just collected",
    description:
      "Vendor quotes on an RFQ are auto-ranked by total price and lead time — Cheapest, Fastest, and Recommended, so picking a winner isn't a spreadsheet exercise.",
    image: "/landing/v2_quote_compare.png",
    width: 1792,
    height: 710,
  },
  {
    icon: ShieldCheckIcon,
    title: "Vendor compliance, built in — not bolted on",
    description:
      "NCDMB local content and certificate expiry live on the vendor record itself, and a shared bank account across two vendors gets flagged before it becomes a payment mistake.",
    image: "/landing/v2_vendors.png",
    width: 2624,
    height: 840,
  },
  {
    icon: DocumentIcon,
    title: "Every invoice checked against what was ordered and received",
    description:
      "Upload the vendor's invoice and it's matched line by line against the PO and what actually arrived — a quiet price bump or a quantity that's not backed by a receipt gets flagged before it's paid.",
    image: "/landing/v2_invoice_match.png",
    width: 1394,
    height: 462,
  },
  {
    icon: ShieldCheckIcon,
    title: "Approval routing you configure, not we hardcode",
    description:
      "Set who signs off by department and amount, and in what order, from a settings screen — no waiting on us to change a threshold buried in code.",
    image: "/landing/v2_approval_rules.png",
    width: 1792,
    height: 526,
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

export default async function LandingPage() {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value;
  const isDark = theme ? theme === "dark" : true;

  return (
    <div id="marketing-root" className={`flex-1 bg-white dark:bg-[#0a0e1a]${isDark ? " dark" : ""}`}>
      <nav className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-[#0a0e1a]/90">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-2 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <LogoMarkIcon className="h-7 w-7 text-brand-600 dark:text-brand-400" />
            <span className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">ProcurePro</span>
          </div>
          <div className="flex items-center gap-5 sm:gap-6">
            <a href="#features" className={`text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white ${focusRing}`}>
              Features
            </a>
            <a href="#pricing" className={`text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white ${focusRing}`}>
              Pricing
            </a>
            <Link href="/login" className={`text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white ${focusRing}`}>
              Sign in
            </Link>
            <ButtonLink href="/signup" size="sm">
              Start free trial
            </ButtonLink>
            <ThemeToggle initialIsDark={isDark} className="text-zinc-500 dark:text-zinc-400" />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-950">
        <div className="bg-brand-glow pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:py-28">
          <div>
            <h1 className="animate-reveal text-[40px] font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-[62px]">
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
            <div className="aspect-[2624/1498] overflow-hidden rounded-xl border border-white/10 bg-zinc-50 shadow-2xl shadow-black/40">
              <Image
                src="/landing/v2_hero_today.png"
                alt="ProcurePro's Today dashboard: the loop from drafted request to receiving, and a ranked queue of what needs a decision"
                width={2624}
                height={1498}
                priority
                className="h-full w-full object-contain object-top"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stat strip */}
      <section className="border-b border-zinc-100 bg-white px-4 py-10 sm:px-6 dark:border-white/10 dark:bg-[#0a0e1a]">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              <span className="text-xl font-semibold tracking-tight text-brand-700 dark:text-brand-400">{stat.value}</span>{" "}
              {stat.label}
            </div>
          ))}
        </div>
      </section>

      {/* Problem */}
      <section className="bg-white px-4 py-20 sm:px-6 dark:bg-[#0a0e1a]">
        <div className="mx-auto max-w-6xl">
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            The way most teams still run procurement
          </h2>
          <div className="mt-12 divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-white/10 dark:border-white/10">
            {PROBLEMS.map((p) => (
              <div key={p.title} className="flex flex-col gap-4 py-8 sm:flex-row sm:items-start sm:gap-8">
                <div className="flex items-baseline gap-4 sm:w-64 sm:shrink-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                    <p.icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{p.title}</h3>
                </div>
                <p className="max-w-lg text-sm leading-relaxed text-zinc-500 sm:pt-1 dark:text-zinc-400">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The loop, end to end */}
      <section className="border-t border-zinc-100 bg-zinc-50 px-4 py-20 sm:px-6 dark:border-white/10 dark:bg-white/[0.02]">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">The loop, end to end</h2>
          <p className="mt-3 max-w-xl text-base text-zinc-500 dark:text-zinc-400">
            The same four stages your team sees on their own &ldquo;Today&rdquo; screen every morning — nothing
            sits in an inbox waiting to be noticed.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-4">
            {LOOP.map((step) => (
              <div key={step.label} className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-zinc-200 bg-white text-brand-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-brand-400">
                  <step.icon className="h-5 w-5" />
                </div>
                <div className="mt-3 text-sm font-medium text-zinc-900 dark:text-white">{step.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white px-4 py-20 sm:px-6 dark:bg-[#0a0e1a]">
        <div className="mx-auto max-w-6xl">
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            Real screens, not a sales deck
          </h2>
          <p className="mt-3 max-w-xl text-base text-zinc-500 dark:text-zinc-400">
            Every image below is the actual product, cropped in close enough to read.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.02]"
              >
                <div className="flex aspect-[16/10] items-center justify-center border-b border-zinc-100 bg-zinc-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    width={feature.width}
                    height={feature.height}
                    className="h-auto max-h-full w-full object-contain"
                  />
                </div>
                <div className="p-6">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                    <feature.icon className="h-4 w-4" />
                  </div>
                  <h3 className="mt-3 text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
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
      <footer className="border-t border-zinc-200 bg-white px-4 py-10 sm:px-6 dark:border-white/10 dark:bg-[#0a0e1a]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <LogoMarkIcon className="h-6 w-6 text-brand-600 dark:text-brand-400" />
            <span className="text-sm font-semibold text-zinc-900 dark:text-white">ProcurePro</span>
            <span className="text-sm text-zinc-400 dark:text-zinc-600">— Procurement control for heavy industry.</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-500 dark:text-zinc-400">
            <Link href="/login" className={`hover:text-zinc-900 dark:hover:text-white ${focusRing}`}>
              Sign in
            </Link>
            <Link href="/signup" className={`hover:text-zinc-900 dark:hover:text-white ${focusRing}`}>
              Start free trial
            </Link>
            <span>&copy; {new Date().getFullYear()} ProcurePro</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
