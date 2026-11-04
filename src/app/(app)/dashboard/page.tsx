import type { Metadata } from "next";
import { Suspense } from "react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireProfessional } from "@/lib/auth";

export const metadata: Metadata = { title: "Início" };

async function Greeting() {
  const { name } = await requireProfessional();

  return (
    <h1 className="text-2xl font-semibold tracking-tight">
      Olá, {name.split(" ")[0]}!
    </h1>
  );
}

export default function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Suspense
        fallback={<div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />}
      >
        <Greeting />
      </Suspense>
      <Card>
        <CardHeader>
          <CardTitle>Sua conta está pronta</CardTitle>
          <CardDescription>
            Em breve você poderá cadastrar alunos e ver aqui quem precisa da sua
            atenção.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
