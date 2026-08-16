"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { submitFeedback } from "@/app/actions/feedback";
import { Button } from "./Button";
import { ChevronDownIcon, ChatBubbleIcon } from "./icons";

const ROLE_LABELS: Record<string, string> = {
  requester: "Requester",
  approver: "Approver",
  procurement_officer: "Procurement Officer",
  finance_admin: "Finance / Admin",
  super_admin: "Super Admin",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

export default function UserMenu({ fullName, role }: { fullName: string; role: string }) {
  const [open, setOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-md py-1 pl-1 pr-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-[11px] font-semibold text-white">
          {initials(fullName)}
        </div>
        <ChevronDownIcon className="hidden h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 sm:block" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 px-3.5 py-3 dark:border-zinc-800">
            <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{fullName}</div>
            <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">{ROLE_LABELS[role] ?? role}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setFeedbackOpen(true);
            }}
            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ChatBubbleIcon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
            Send feedback
          </button>
          <form action={signOut}>
            <button type="submit" className="block w-full px-3.5 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">
              Sign out
            </button>
          </form>
        </div>
      )}

      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </div>
  );
}

function FeedbackModal({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setStatus("loading");
    setError("");
    try {
      await submitFeedback(formData);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Couldn't send that — try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900" onClick={(e) => e.stopPropagation()}>
        {status === "done" ? (
          <>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Thanks — got it.</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">We read every note that comes through here.</p>
            <Button type="button" size="sm" variant="secondary" className="mt-4" onClick={onClose}>
              Close
            </Button>
          </>
        ) : (
          <form action={handleSubmit}>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Send feedback</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Bug, missing feature, or just a gripe — tell us what&apos;s on your mind.</p>
            <input type="hidden" name="page_path" value={pathname ?? ""} />
            <textarea
              name="message"
              required
              autoFocus
              rows={5}
              placeholder="What's working, what isn't, what you wish it did..."
              className="mt-3 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
            {status === "error" && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={onClose} disabled={status === "loading"}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={status === "loading"}>
                {status === "loading" ? "Sending…" : "Send"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
