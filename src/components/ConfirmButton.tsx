"use client";

import type { ButtonHTMLAttributes } from "react";

// Plain-styled equivalent of ConfirmSubmitButton, for the bare text-link-style
// buttons used in table rows (e.g. "Remove", "Deactivate") that don't go
// through the Button component.
export default function ConfirmButton({
  confirmMessage,
  onClick,
  ...rest
}: { confirmMessage: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
    />
  );
}
