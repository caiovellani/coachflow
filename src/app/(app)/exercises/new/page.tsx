import type { Metadata } from "next";

import { PageHeader } from "@/components/app/page-header";
import { ExerciseForm } from "@/components/exercises/exercise-form";
import { ResetOnHide } from "@/components/form/reset-on-hide";

export const metadata: Metadata = { title: "Novo exercício" };

export default function NewExercisePage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader title="Novo exercício" />
      <ResetOnHide>
        <ExerciseForm
          id={null}
          defaultValues={{
            name: "",
            muscleGroup: "",
            equipment: "",
            description: "",
            notes: "",
          }}
        />
      </ResetOnHide>
    </div>
  );
}
