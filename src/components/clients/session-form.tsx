"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { saveSession } from "@/app/actions/sessions";
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
import { sessionSchema, type SessionInput } from "@/lib/validations/session";

type SessionPlan = SelectOption & { exerciseIds: string[] };

const EMPTY_ITEM = { exerciseId: "", reps: "", load: "" };

export function SessionForm({
  clientId,
  today,
  plans,
  exercises,
}: {
  clientId: string;
  today: string;
  plans: SessionPlan[];
  exercises: SelectOption[];
}) {
  const [state, action, pending] = useActionState(saveSession, null);
  // Mesmo id em reenvios desta tela: o servidor nao grava a sessao duas vezes.
  const [requestId] = useState(() => crypto.randomUUID());
  const form = useForm<SessionInput>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      date: today,
      workoutPlanId: "",
      notes: "",
      items: [EMPTY_ITEM],
    },
  });
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(() => action({ clientId, requestId, values }));
  });

  const fillFromPlan = (planId: string) => {
    const plan = plans.find(({ value }) => value === planId);
    if (plan) {
      replace(
        plan.exerciseIds.map((exerciseId) => ({ ...EMPTY_ITEM, exerciseId })),
      );
    }
  };

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="max-w-xl">
      <FieldGroup>
        <FormMessage state={state} />
        <FormField
          control={form.control}
          name="date"
          label="Data"
          type="date"
          max={today}
        />
        {plans.length > 0 && (
          <FormSelect
            control={form.control}
            name="workoutPlanId"
            label="Treino realizado"
            placeholder="Sem treino vinculado"
            options={plans}
            onValueChange={fillFromPlan}
          />
        )}

        {fields.map((field, index) => (
          <fieldset
            key={field.id}
            className="flex flex-col gap-3 rounded-xl border p-3"
          >
            <div className="flex items-center justify-between">
              <legend className="text-sm font-medium">
                Exercício {index + 1}
              </legend>
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
                name={`items.${index}.reps`}
                label="Repetições por série"
                placeholder="10, 10, 8"
              />
              <FormField
                control={form.control}
                name={`items.${index}.load`}
                label="Carga (kg)"
                inputMode="decimal"
              />
            </div>
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
        <FormTextarea
          control={form.control}
          name="notes"
          label="Observações (opcional)"
        />
        <SubmitButton pending={pending}>Registrar sessão</SubmitButton>
      </FieldGroup>
    </form>
  );
}
