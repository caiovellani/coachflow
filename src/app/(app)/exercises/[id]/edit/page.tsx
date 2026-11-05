import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { archiveExerciseAction } from "@/app/actions/exercises";
import { ActionButton } from "@/components/app/action-button";
import { ListSkeleton } from "@/components/app/list-skeleton";
import { PageHeader } from "@/components/app/page-header";
import { ExerciseForm } from "@/components/exercises/exercise-form";
import { ResetOnHide } from "@/components/form/reset-on-hide";
import { requireProfessional } from "@/lib/auth";
import { getExercise } from "@/lib/data/exercises";

export const metadata: Metadata = { title: "Editar exercício" };

type Params = Promise<{ id: string }>;

async function EditExercise({ params }: { params: Params }) {
  const professional = await requireProfessional();
  const { id } = await params;

  const exercise = await getExercise(professional.id, id);
  if (!exercise) notFound();

  return (
    <>
      <ResetOnHide>
        <ExerciseForm
          id={exercise.id}
          defaultValues={{
            name: exercise.name,
            muscleGroup: exercise.muscleGroup ?? "",
            equipment: exercise.equipment ?? "",
            description: exercise.description ?? "",
            notes: exercise.notes ?? "",
          }}
        />
      </ResetOnHide>
      {!exercise.archivedAt && (
        <div>
          <ActionButton
            action={archiveExerciseAction.bind(null, exercise.id)}
            confirmMessage="Arquivar este exercício? Treinos e históricos existentes não mudam."
          >
            Arquivar exercício
          </ActionButton>
        </div>
      )}
    </>
  );
}

export default function EditExercisePage({ params }: { params: Params }) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader title="Editar exercício" />
      <Suspense fallback={<ListSkeleton />}>
        <EditExercise params={params} />
      </Suspense>
    </div>
  );
}
