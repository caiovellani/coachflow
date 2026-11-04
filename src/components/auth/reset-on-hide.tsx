"use client";

import { Fragment, useLayoutEffect, useState, type ReactNode } from "react";

/**
 * Com Cache Components, a rota anterior fica oculta via <Activity> mantendo o
 * estado. Remonta o formulario ao ocultar para nao guardar senha nem mensagens.
 */
export function ResetOnHide({ children }: { children: ReactNode }) {
  const [generation, setGeneration] = useState(0);

  useLayoutEffect(() => () => setGeneration((current) => current + 1), []);

  return <Fragment key={generation}>{children}</Fragment>;
}
