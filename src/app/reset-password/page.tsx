"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";
import { LogoMarkIcon } from "@/components/icons";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ready" | "invalid" | "saving" | "error">("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();

    // The recovery link's token is consumed automatically by the browser
    // client (detectSessionInUrl) as soon as it loads, which fires this event
    // once the temporary recovery session is established. Deliberately NOT
    // falling back to a plain getSession() check here — someone already
    // logged in (e.g. testing this on the same browser) already has a
    // session that has nothing to do with the recovery link, and treating
    // that as "ready" would let this page show the reset form even with no
    // valid token in the URL at all.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStatus("ready");
    });

    // If the event doesn't fire quickly, the link was invalid, expired, or
    // already used — don't leave the user staring at a blank loading state.
    const timeout = setTimeout(() => {
      setStatus((s) => (s === "checking" ? "invalid" : s));
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setStatus("saving");
    const supabase = createClient();
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    if (updateErr) {
      setStatus("error");
      setError(updateErr.message);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-white px-4 py-16 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMarkIcon className="h-11 w-11 text-brand-600 dark:text-brand-400" />
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Set a new password</h1>
        </div>

        {status === "checking" && <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">Checking your reset link…</p>}

        {status === "invalid" && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">This reset link is invalid or has expired.</p>
            <a href="/forgot-password" className="inline-block text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
              Request a new link
            </a>
          </div>
        )}

        {(status === "ready" || status === "saving" || status === "error") && (
          <form onSubmit={handleSubmit} className="mt-2 space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                New password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <label htmlFor="confirm_password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Confirm new password
              </label>
              <input
                id="confirm_password"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                placeholder="Re-enter your new password"
              />
            </div>
            {error && <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
            <Button type="submit" variant="accent" className="w-full" disabled={status === "saving"}>
              {status === "saving" ? "Saving…" : "Set new password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
