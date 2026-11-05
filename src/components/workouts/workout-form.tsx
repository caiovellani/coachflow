"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { startTransition, useActionState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { saveWorkout } from "@/app/actions/workouts";
import {
  FormField,
  FormSelect,
  FormTextarea,
  type SelectOption,
} from "@/components/form/form-field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { workoutSchema, type WorkoutInput } from "@/lib/validations/workout";

const EMPTY_ITEM: WorkoutInput["items"][number] = {
  exerciseId: "",
  sets: "3",
  reps: "10",
  referenceLoad: "",
  restSeconds: "",
  notes: "",
};

export function WorkoutForm({
  id,
  defaultValues,
  exercises,
}: {
  id: string | null;
  defaultValues: WorkoutInput;
  exercises: SelectOption[];
}) {
  const [state, action, pending] = useActionState(saveWorkout, null);
  const form = useForm<WorkoutInput>({
    resolver: zodResolver(workoutSchema),
    defaultValues,
  });
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(() => action({ id, values }));
  });

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-xl">
      <FieldGroup>
        <FormMessage state={state} />
        <FormField control={form.control} name="name" label="Nome do treino" />
        <FormTextarea
          control={form.control}
          name="description"
          label="Descrição (opcional)"
        />

        {fields.map((field, index) => (
          <fieldset
            key={field.id}
            className="flex flex-col gap-3 rounded-xl border p-3"
          >
            <div className="flex items-center justify-between">
              <legend className="text-sm font-medium">
                Exercício {index + 1}
              </legend>
              <div className="flex">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-10"
                  aria-label={`Subir exercício ${index + 1}`}
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                >
                  <ArrowUp aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-10"
                  aria-label={`Descer exercício ${index + 1}`}
                  disabled={index === fields.length - 1}
                  onClick={() => move(index, index + 1)}
                >
                  <ArrowDown aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-10"
                  aria-label={`Remover exercício ${index + 1}`}
                  onClick={() => remove(index)}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            </div>
            <FormSelect
              control={form.control}
              name={`items.${index}.exerciseId`}
              label="Exercício"
              placeholder="Escolha um exercício"
              options={exercises}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name={`items.${index}.sets`}
                label="Séries"
                inputMode="numeric"
              />
              <FormField
                control={form.control}
                name={`items.${index}.reps`}
                label="Repetições"
              />
              <FormField
                control={form.control}
                name={`items.${index}.referenceLoad`}
                label="Carga (kg)"
                inputMode="decimal"
              />
              <FormField
                control={form.control}
                name={`items.${index}.restSeconds`}
                label="Descanso (s)"
                inputMode="numeric"
              />
            </div>
            <FormField
              control={form.control}
              name={`items.${index}.notes`}
              label="Observações"
            />
          </fieldset>
        ))}

        {form.formState.errors.items?.message && (
          <FieldError>{form.formState.errors.items.message}</FieldError>
        )}

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-11"
          onClick={() => append(EMPTY_ITEM)}
        >
          <Plus aria-hidden />
          Adicionar exercício
        </Button>
        <SubmitButton pending={pending}>Salvar treino</SubmitButton>
      </FieldGroup>
    </form>
  );
}
