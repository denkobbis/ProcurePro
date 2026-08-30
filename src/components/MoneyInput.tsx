"use client";

import { useState } from "react";

// Comma-grouped display for a plain-number input. type="number" can't show
// "1,850,000" (the browser rejects non-numeric characters), so this renders
// a formatted type="text" field plus a hidden input carrying the clean digits
// under the real field `name` — every server action keeps reading
// formData.get(name) exactly as before. Formatting only applies while
// blurred; while focused the raw digits show, so the cursor never jumps
// mid-edit and a comma never gets typed into the middle of a number.
function formatWithCommas(raw: string): string {
  if (!raw) return "";
  const negative = raw.startsWith("-");
  const body = negative ? raw.slice(1) : raw;
  const [intPart, decPart] = body.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (negative ? "-" : "") + grouped + (decPart !== undefined ? `.${decPart}` : "");
}

function cleanNumeric(raw: string): string {
  let cleaned = raw.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot !== -1) cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
  return cleaned;
}

export default function MoneyInput({
  name,
  value,
  defaultValue,
  onChange,
  required,
  placeholder,
  className,
  id,
  "aria-describedby": ariaDescribedBy,
}: {
  name: string;
  value?: string;
  defaultValue?: string | number;
  onChange?: (raw: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  "aria-describedby"?: string;
}) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(() => (defaultValue != null && defaultValue !== "" ? String(defaultValue) : ""));
  const [focused, setFocused] = useState(false);
  const raw = isControlled ? value! : internal;
  const display = focused ? raw : formatWithCommas(raw);

  return (
    <>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={display}
        placeholder={placeholder}
        required={required}
        aria-describedby={ariaDescribedBy}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const cleaned = cleanNumeric(e.target.value);
          if (!isControlled) setInternal(cleaned);
          onChange?.(cleaned);
        }}
        className={className}
      />
      {/* Carries the real field name so every server action keeps reading
          formData.get(name) unchanged. Also the target other code (e.g. the
          AI-extraction autofill) imperatively sets .value on by name — its
          onChange picks that up and pushes it back into the visible field,
          so an external write can't silently go out of sync with what's shown. */}
      <input
        type="hidden"
        name={name}
        value={raw}
        onChange={(e) => {
          const cleaned = cleanNumeric(e.target.value);
          if (!isControlled) setInternal(cleaned);
          onChange?.(cleaned);
        }}
      />
    </>
  );
}
