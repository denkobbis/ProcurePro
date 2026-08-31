import { cookies } from "next/headers";
import { requestPasswordReset } from "@/app/actions/auth";
import { Button } from "@/components/Button";
import ThemeToggle from "@/components/ThemeToggle";
import { LogoMarkIcon } from "@/components/icons";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const cookieStore = await cookies();
  const isDark = cookieStore.get("theme")?.value === "dark";

  return (
    <div className="relative flex flex-1 items-center justify-center bg-white px-4 py-16 dark:bg-zinc-950">
      <ThemeToggle initialIsDark={isDark} className="absolute right-4 top-4 text-zinc-400 dark:text-zinc-500" />
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMarkIcon className="h-11 w-11 text-brand-600 dark:text-brand-400" />
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Reset your password</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Enter your email and we&apos;ll send you a reset link.</p>
        </div>

        {message && (
          <div className="mt-6 rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </div>
        )}

        {!message && (
          <form action={requestPasswordReset} className="mt-7 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoFocus
                className="mt-1.5 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                placeholder="you@company.com"
              />
            </div>
            <Button type="submit" variant="accent" className="w-full">
              Send reset link
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
          <a href="/login" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
            Back to sign in
          </a>
        </p>
      </div>
    </div>
  );
}
