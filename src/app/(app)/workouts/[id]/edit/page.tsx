import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { ListSkeleton } from "@/components/app/list-skeleton";
import { PageHeader } from "@/components/app/page-header";
import { ResetOnHide } from "@/components/form/reset-on-hide";
import { WorkoutForm } from "@/components/workouts/workout-form";
import { requireProfessional } from "@/lib/auth";
import { listExercises } from "@/lib/data/exercises";
import { getPlan } from "@/lib/data/workouts";

export const metadata: Metadata = { title: "Editar treino" };

type Params = Promise<{ id: string }>;

async function EditWorkout({ params }: { params: Params }) {
  const professional = await requireProfessional();
  const { id } = await params;

  const [plan, exercises] = await Promise.all([
    getPlan(professional.id, id),
    listExercises(professional.id),
  ]);
  if (!plan) notFound();
  if (plan.status !== "PUBLISHED") redirect(`/workouts/${id}`);

  // Inclui exercicios ja arquivados que continuam neste treino.
  const options = new Map(
    [...exercises, ...plan.exercises.map(({ exercise }) => exercise)].map(
      ({ id, name }) => [id, name],
    ),
  );

  return (
    <ResetOnHide>
      <WorkoutForm
        id={plan.id}
        exercises={[...options].map(([value, label]) => ({ value, label }))}
        defaultValues={{
          name: plan.name,
          description: plan.description ?? "",
          items: plan.exercises.map((item) => ({
            exerciseId: item.exerciseId,
            sets: item.sets.toString(),
            reps: item.reps,
            referenceLoad:
              item.referenceLoad?.toString().replace(".", ",") ?? "",
            restSeconds: item.restSeconds?.toString() ?? "",
            notes: item.notes ?? "",
          })),
        }}
      />
    </ResetOnHide>
  );
}

export default function EditWorkoutPage({ params }: { params: Params }) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader
        title="Editar treino"
        description="Salvar cria uma nova versão. Sessões já registradas não mudam."
      />
      <Suspense fallback={<ListSkeleton />}>
        <EditWorkout params={params} />
      </Suspense>
    </div>
  );
}
