"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/Button";
import { SparkleIcon, UploadIcon } from "@/components/icons";
import type { ExtractedRequestFields } from "@/lib/extract";

export default function RequestAutoFill({ formId }: { formId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  function applyFields(fields: ExtractedRequestFields) {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const set = (name: string, value: string) => {
      const el = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
      if (el && value) el.value = value;
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

  async function handleFile(file: File) {
    setStatus("loading");
    setError("");
    setFileName(file.name);
    try {
      const body = new FormData();
      body.set("file", file);
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

  return (
    <div className="rounded-lg border border-dashed border-brand-300 bg-brand-50/50 p-4">
      <div className="flex items-start gap-3">
        <SparkleIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-zinc-900">Fill this in from a file</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Upload a vendor quote, invoice, or spec sheet (PDF or image) and the fields below will be filled in for
            you to review — nothing is saved until you submit.
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
            {fileName && status !== "idle" && <span className="text-xs text-zinc-500">{fileName}</span>}
          </div>
          {status === "done" && <p className="mt-2 text-xs font-medium text-green-700">Filled in below — check it over before saving.</p>}
          {status === "error" && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
