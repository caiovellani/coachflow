"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

function Submit({
  children,
  confirmMessage,
}: {
  children: ReactNode;
  confirmMessage?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="outline"
      size="lg"
      className="h-11 px-4"
      disabled={pending}
      onClick={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </Button>
  );
}

/** Botao de uma acao sem campos (pausar, arquivar...). */
export function ActionButton({
  action,
  confirmMessage,
  children,
}: {
  action: () => Promise<void>;
  confirmMessage?: string;
  children: ReactNode;
}) {
  return (
    <form action={action}>
      <Submit confirmMessage={confirmMessage}>{children}</Submit>
    </form>
  );
}
