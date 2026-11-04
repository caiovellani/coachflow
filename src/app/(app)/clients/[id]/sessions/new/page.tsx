import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { EmptyState } from "@/components/app/empty-state";
import { LinkButton } from "@/components/app/link-button";
import { ListSkeleton } from "@/components/app/list-skeleton";
import { PageHeader } from "@/components/app/page-header";
import { SessionForm } from "@/components/clients/session-form";
import { ResetOnHide } from "@/components/form/reset-on-hide";
import { requireProfessional } from "@/lib/auth";
import { getClient } from "@/lib/data/clients";
import { listExercises } from "@/lib/data/exercises";
import { listActiveAssignments } from "@/lib/data/workouts";
import { toDateInput } from "@/lib/dates";

export const metadata: Metadata = { title: "Registrar sessão" };

type Params = Promise<{ id: string }>;

async function NewSession({ params }: { params: Params }) {
  const { id: professionalId } = await requireProfessional();
  const { id } = await params;

  const client = await getClient(professionalId, id);
  if (!client) notFound();

  const [assignments, exercises] = await Promise.all([
    listActiveAssignments(professionalId, id),
    listExercises(professionalId),
  ]);

  if (exercises.length === 0) {
    return (
      <EmptyState
        title="Sua biblioteca está vazia"
        description="Cadastre exercícios para registrar uma sessão."
      >
        <LinkButton href="/exercises/new">Cadastrar exercício</LinkButton>
      </EmptyState>
    );
  }

  const planExercises = assignments.flatMap(({ workoutPlan }) =>
    workoutPlan.exercises.map(({ exercise }) => exercise),
  );
  const options = new Map(
    [...exercises, ...planExercises].map(({ id, name }) => [id, name]),
  );

  return (
    <>
      <p className="text-sm text-muted-foreground">Aluno: {client.name}</p>
      <ResetOnHide>
        <SessionForm
          clientId={id}
          today={toDateInput(new Date())}
          plans={assignments.map(({ workoutPlan }) => ({
            value: workoutPlan.id,
            label: workoutPlan.name,
            exerciseIds: workoutPlan.exercises.map((item) => item.exerciseId),
          }))}
          exercises={[...options].map(([value, label]) => ({ value, label }))}
        />
      </ResetOnHide>
    </>
  );
}

export default function NewSessionPage({ params }: { params: Params }) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader title="Registrar sessão" />
      <Suspense fallback={<ListSkeleton />}>
        <NewSession params={params} />
      </Suspense>
    </div>
  );
}
