import { signIn } from "@/app/actions/auth";
import { LogoMarkIcon } from "@/components/icons";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-blue-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMarkIcon className="h-11 w-11 text-blue-600" />
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-zinc-900">ProcurePro</h1>
          <p className="mt-1 text-sm text-zinc-500">Sign in to manage purchase requests, approvals, and POs.</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-lg shadow-zinc-200/50">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <form action={signIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
            >
              Sign in
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">
          No account? Ask your Super Admin to create one for you in Users &amp; Departments.
        </p>
      </div>
    </div>
  );
}
