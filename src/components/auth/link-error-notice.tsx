"use client";

import { useSearchParams } from "next/navigation";

import { FormMessage } from "@/components/form/form-message";

/** Mostra o erro de um link de e-mail recusado em /auth/confirm. */
export function LinkErrorNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get("error") !== "link_invalid") return null;

  return (
    <FormMessage
      state={{
        status: "error",
        message: "Este link é inválido ou expirou. Tente novamente.",
      }}
    />
  );
}
