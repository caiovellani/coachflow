import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/app/empty-state";
import { LinkButton } from "@/components/app/link-button";
import { ListSkeleton } from "@/components/app/list-skeleton";
import { PageHeader } from "@/components/app/page-header";
import { requireProfessional } from "@/lib/auth";
import { listPlans } from "@/lib/data/workouts";

export const metadata: Metadata = { title: "Treinos" };

async function WorkoutList() {
  const { id } = await requireProfessional();
  const plans = await listPlans(id);

  if (plans.length === 0) {
    return (
      <EmptyState
        title="Nenhum treino criado"
        description="Monte um treino com exercícios da sua biblioteca e atribua aos alunos."
      />
    );
  }

  return (
    <ul className="divide-y rounded-xl border">
      {plans.map((plan) => (
        <li key={plan.id}>
          <Link href={`/workouts/${plan.id}`} className="block p-3">
            <span className="block font-medium">{plan.name}</span>
            <span className="block text-sm text-muted-foreground">
              {plan._count.exercises} exercício(s) · versão {plan.version}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function WorkoutsPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <PageHeader title="Treinos">
        <LinkButton href="/workouts/new">Novo treino</LinkButton>
      </PageHeader>
      <Suspense fallback={<ListSkeleton />}>
        <WorkoutList />
      </Suspense>
    </div>
  );
}
