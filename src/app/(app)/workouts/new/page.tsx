import type { Metadata } from "next";
import { Suspense } from "react";

import { EmptyState } from "@/components/app/empty-state";
import { LinkButton } from "@/components/app/link-button";
import { ListSkeleton } from "@/components/app/list-skeleton";
import { PageHeader } from "@/components/app/page-header";
import { ResetOnHide } from "@/components/form/reset-on-hide";
import { WorkoutForm } from "@/components/workouts/workout-form";
import { requireProfessional } from "@/lib/auth";
import { listExercises } from "@/lib/data/exercises";

export const metadata: Metadata = { title: "Novo treino" };

async function NewWorkout() {
  const { id } = await requireProfessional();
  const exercises = await listExercises(id);

  if (exercises.length === 0) {
    return (
      <EmptyState
        title="Sua biblioteca está vazia"
        description="Cadastre exercícios antes de montar um treino."
      >
        <LinkButton href="/exercises/new">Cadastrar exercício</LinkButton>
      </EmptyState>
    );
  }

  return (
    <ResetOnHide>
      <WorkoutForm
        id={null}
        defaultValues={{ name: "", description: "", items: [] }}
        exercises={exercises.map(({ id, name }) => ({ value: id, label: name }))}
      />
    </ResetOnHide>
  );
}

export default function NewWorkoutPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader title="Novo treino" />
      <Suspense fallback={<ListSkeleton />}>
        <NewWorkout />
      </Suspense>
    </div>
  );
}
