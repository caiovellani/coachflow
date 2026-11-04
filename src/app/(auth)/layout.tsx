import type { ReactNode } from "react";

import { Brand } from "@/components/brand";

const VALUE_PROPOSITION =
  "Acompanhe seus alunos sem precisar cobrar manualmente cada treino.";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh flex-1 lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <span className="text-xl font-semibold tracking-tight">CoachFlow</span>
        <p className="max-w-md text-4xl leading-tight font-semibold tracking-tight">
          {VALUE_PROPOSITION}
        </p>
        <p className="text-sm opacity-80">
          Você define o treino. O aluno registra pelo WhatsApp.
        </p>
      </aside>

      <main className="flex flex-col items-center justify-center px-4 py-10">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <div className="flex flex-col gap-3 lg:hidden">
            <Brand className="text-lg" />
            <p className="text-sm text-muted-foreground">{VALUE_PROPOSITION}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
