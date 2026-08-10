"use client";

import { useEffect } from "react";
import { Button } from "@/components/Button";

// Without this, a thrown Server Action error (e.g. the read-only-lockout
// message, or a "Not authorized") surfaces as Next's generic
// "Application error: a client-side exception has occurred" page.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <h2 className="text-lg font-semibold text-zinc-900">Something went wrong</h2>
      <p className="max-w-md text-sm text-zinc-600">{error.message || "An unexpected error occurred."}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
