"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/Button";
import { SparkleIcon, UploadIcon } from "@/components/icons";
import type { ExtractedRequestFields } from "@/lib/extract";

export default function RequestAutoFill({ formId }: { formId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"file" | "text">("file");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [text, setText] = useState("");

  function applyFields(fields: ExtractedRequestFields) {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    // Setting .value directly (the plain JS way) doesn't reliably notify a
    // React-controlled field: React patches the value setter to track the
    // "last known value," and if that tracker isn't bypassed, dispatching
    // input afterward can be seen as a no-op change. Writing through the
    // native prototype setter first is the standard workaround.
    const nativeInputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    const nativeTextareaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")!.set!;

    const set = (name: string, value: string) => {
      let el = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
      if (!el || !value) return;
      // MoneyInput renders a hidden input (carrying the real field name) with
      // its comma-formatted, React-controlled visible sibling immediately
      // before it in the DOM — write through the visible one instead, or the
      // display silently goes out of sync with what actually submits.
      if (el.tagName === "INPUT" && (el as HTMLInputElement).type === "hidden" && el.previousElementSibling instanceof HTMLInputElement) {
        el = el.previousElementSibling;
      }
      if (el instanceof HTMLSelectElement) {
        el.value = value;
      } else if (el instanceof HTMLTextAreaElement) {
        nativeTextareaSetter.call(el, value);
      } else {
        nativeInputSetter.call(el, value);
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    set("description", fields.description);
    set("category", fields.category);
    if (fields.qty > 0) set("qty", String(fields.qty));
    if (fields.est_unit_cost > 0) set("est_unit_cost", String(fields.est_unit_cost));
    set("mpn", fields.mpn);
    set("oem_brand", fields.oem_brand);
    set("urgency", fields.urgency);
    set("justification", fields.justification);
  }

  async function runExtraction(body: FormData) {
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/extract-request", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed.");
      applyFields(data.fields as ExtractedRequestFields);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Extraction failed.");
    }
  }

  function handleFile(file: File) {
    setFileName(file.name);
    const body = new FormData();
    body.set("file", file);
    runExtraction(body);
  }

  function handleTextSubmit() {
    const body = new FormData();
    body.set("text", text);
    runExtraction(body);
  }

  return (
    <div className="rounded-lg border border-dashed border-brand-300 bg-brand-50/50 p-4 dark:border-brand-500/30 dark:bg-brand-500/5">
      <div className="flex items-start gap-3">
        <SparkleIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Fill this in for me</p>
            <div className="flex gap-1 text-xs">
              <button
                type="button"
                onClick={() => setMode("file")}
                className={`rounded px-2 py-0.5 font-medium ${mode === "file" ? "bg-brand-600 text-white" : "text-brand-700 hover:bg-brand-100 dark:text-brand-400 dark:hover:bg-brand-500/10"}`}
              >
                Upload file
              </button>
              <button
                type="button"
                onClick={() => setMode("text")}
                className={`rounded px-2 py-0.5 font-medium ${mode === "text" ? "bg-brand-600 text-white" : "text-brand-700 hover:bg-brand-100 dark:text-brand-400 dark:hover:bg-brand-500/10"}`}
              >
                Paste text
              </button>
            </div>
          </div>

          {mode === "file" ? (
            <>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                Upload a vendor quote, invoice, or spec sheet (PDF or image) and the fields below will be filled in
                for you to review — nothing is saved until you submit.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={status === "loading"}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadIcon className="h-4 w-4" />
                  {status === "loading" ? "Reading file…" : "Upload file"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    e.target.value = "";
                  }}
                />
                {fileName && status !== "idle" && <span className="text-xs text-zinc-500 dark:text-zinc-400">{fileName}</span>}
              </div>
            </>
          ) : (
            <>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                Paste an email, a WhatsApp message, or just describe what you need in plain words — e.g. &ldquo;need 50
                gate valves like the last order from Delta Engineering&rdquo;.
              </p>
              <div className="mt-3 space-y-2">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  placeholder="Describe what you need..."
                />
                <Button type="button" variant="secondary" size="sm" disabled={status === "loading" || !text.trim()} onClick={handleTextSubmit}>
                  <SparkleIcon className="h-4 w-4" />
                  {status === "loading" ? "Thinking…" : "Fill in fields"}
                </Button>
              </div>
            </>
          )}

          {status === "done" && <p className="mt-2 text-xs font-medium text-green-700 dark:text-green-400">Filled in below — check it over before saving.</p>}
          {status === "error" && <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}
