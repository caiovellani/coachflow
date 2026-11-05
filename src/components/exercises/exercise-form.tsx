"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";

import { saveExercise } from "@/app/actions/exercises";
import { FormField, FormTextarea } from "@/components/form/form-field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { FieldGroup } from "@/components/ui/field";
import { exerciseSchema, type ExerciseInput } from "@/lib/validations/exercise";

export function ExerciseForm({
  id,
  defaultValues,
}: {
  id: string | null;
  defaultValues: ExerciseInput;
}) {
  const [state, action, pending] = useActionState(saveExercise, null);
  const form = useForm<ExerciseInput>({
    resolver: zodResolver(exerciseSchema),
    defaultValues,
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(() => action({ id, values }));
  });

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="max-w-xl">
      <FieldGroup>
        <FormMessage state={state} />
        <FormField control={form.control} name="name" label="Nome" />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="muscleGroup"
            label="Grupo muscular"
          />
          <FormField
            control={form.control}
            name="equipment"
            label="Equipamento"
          />
        </div>
        <FormTextarea
          control={form.control}
          name="description"
          label="Instruções de execução"
        />
        <FormTextarea control={form.control} name="notes" label="Observações" />
        <SubmitButton pending={pending}>Salvar exercício</SubmitButton>
      </FieldGroup>
    </form>
  );
}
