import { signUp } from "@/app/actions/auth";
import { LogoMarkIcon, DocumentIcon, WalletIcon, BuildingIcon } from "@/components/icons";
import { INDUSTRY_OPTIONS } from "@/lib/industries";

const FEATURES = [
  {
    icon: DocumentIcon,
    title: "Requisition to receiving",
    description: "Multi-step approvals, purchase orders, and shipping tracked end to end.",
  },
  {
    icon: WalletIcon,
    title: "Multi-currency & landed cost",
    description: "Automatic freight and customs duty rollups on every purchase order.",
  },
  {
    icon: BuildingIcon,
    title: "Vendor compliance",
    description: "NCDMB local-content tracking and certificate expiry alerts, built in.",
  },
];

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="grid flex-1 grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-950 p-10 lg:flex xl:p-14">
        <div className="bg-brand-glow pointer-events-none absolute inset-0" aria-hidden="true" />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/60 to-brand-900/40"
          aria-hidden="true"
        />

        <div className="relative flex items-center gap-2.5">
          <LogoMarkIcon className="h-8 w-8 text-brand-400" />
          <span className="text-lg font-semibold tracking-tight text-white">ProcurePro</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-[1.15] tracking-tight text-white">
            Set up your company.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-brand-200">
            You&apos;ll be the first admin — invite the rest of your team once you&apos;re in.
          </p>

          <ul className="mt-9 space-y-5">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-brand-300">
                  <f.icon className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{f.title}</div>
                  <div className="mt-0.5 text-xs leading-relaxed text-brand-300">{f.description}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-brand-400">Built for teams moving steel, parts, and equipment.</p>
      </div>

      <div className="flex items-center justify-center bg-white px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <LogoMarkIcon className="h-11 w-11 text-brand-600" />
            <h1 className="mt-3 text-xl font-semibold tracking-tight text-zinc-900">ProcurePro</h1>
            <p className="mt-1 text-sm text-zinc-500">Create your company&apos;s account.</p>
          </div>

          <div className="hidden lg:block">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Create your account</h1>
            <p className="mt-1.5 text-sm text-zinc-500">Start a new ProcurePro workspace for your company.</p>
          </div>

          {error && (
            <div className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <form action={signUp} className="mt-7 space-y-4">
            <div>
              <label htmlFor="organization_name" className="block text-sm font-medium text-zinc-700">
                Company name
              </label>
              <input
                id="organization_name"
                name="organization_name"
                type="text"
                required
                autoFocus
                className="mt-1.5 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="Acme Resources Ltd"
              />
            </div>
            <div>
              <label htmlFor="industry" className="block text-sm font-medium text-zinc-700">
                Line of work
              </label>
              <select
                id="industry"
                name="industry"
                defaultValue="general"
                className="mt-1.5 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {INDUSTRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-zinc-400">Shapes which features you see — change anytime in Billing settings.</p>
            </div>
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-zinc-700">
                Your name
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                className="mt-1.5 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1.5 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                className="mt-1.5 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="At least 8 characters"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-brand-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
            >
              Create company account
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-zinc-400">
            Already have an account?{" "}
            <a href="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
