"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function RootError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-sm flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold tracking-tight">
        Não foi possível carregar esta página
      </h1>
      <p className="text-sm text-muted-foreground">
        Verifique sua conexão e tente novamente.
      </p>
      <Button size="lg" className="h-11" onClick={() => retry()}>
        Tentar novamente
      </Button>
    </div>
  );
}
