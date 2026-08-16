"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { SparkleIcon } from "@/components/icons";

const EXAMPLES = ["How much have we spent with our top vendor?", "Which departments are over budget?", "What's our Equipment & Tools budget status?"];

export default function SpendCopilot() {
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [answer, setAnswer] = useState("");

  async function ask(q: string) {
    if (!q.trim()) return;
    setStatus("loading");
    setAnswer("");
    try {
      const res = await fetch("/api/spend-copilot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't answer that.");
      setAnswer(data.answer);
      setStatus("done");
    } catch (err) {
      setAnswer(err instanceof Error ? err.message : "Couldn't answer that.");
      setStatus("error");
    }
  }

  return (
    <section className="rounded-lg border border-dashed border-brand-300 bg-brand-50/50 p-5 dark:border-brand-500/30 dark:bg-brand-500/5">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        <SparkleIcon className="h-4 w-4 text-brand-600 dark:text-brand-400" />
        Ask about your spend
      </h2>
      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Ask in plain words — answers are computed from your actual vendor and budget data.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="mt-3 flex flex-wrap gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. How much have we spent with Delta Engineering?"
          className="min-w-0 flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <Button type="submit" size="sm" disabled={status === "loading" || !question.trim()}>
          {status === "loading" ? "Thinking…" : "Ask"}
        </Button>
      </form>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => {
              setQuestion(ex);
              ask(ex);
            }}
            className="rounded-full border border-brand-200 bg-white px-2.5 py-1 text-xs text-brand-700 hover:bg-brand-100 dark:border-brand-500/30 dark:bg-zinc-900 dark:text-brand-400 dark:hover:bg-brand-500/10"
          >
            {ex}
          </button>
        ))}
      </div>

      {answer && (
        <p
          className={`mt-3 rounded-md border px-3 py-2 text-sm ${
            status === "error"
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400"
              : "border-zinc-200 bg-white text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          }`}
        >
          {answer}
        </p>
      )}
    </section>
  );
}
