"use client";

import { Button } from "./Button";
import type { ComponentProps } from "react";

// Wraps Button with a native confirm() before a destructive/irreversible
// submit goes through — a Server Component page can't attach a plain onClick
// itself (functions aren't serializable across that boundary), so this small
// client component exists to carry just that one interaction.
export default function ConfirmSubmitButton({
  confirmMessage,
  onClick,
  ...rest
}: { confirmMessage: string } & ComponentProps<typeof Button>) {
  return (
    <Button
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
