"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";

import { assignWorkout } from "@/app/actions/workouts";
import {
  FormField,
  FormSelect,
  type SelectOption,
} from "@/components/form/form-field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { FieldGroup } from "@/components/ui/field";
import {
  assignmentSchema,
  type AssignmentInput,
} from "@/lib/validations/workout";

export function AssignForm({
  clientId,
  plans,
}: {
  clientId: string;
  plans: SelectOption[];
}) {
  const [state, action, pending] = useActionState(assignWorkout, null);
  const form = useForm<AssignmentInput>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: { workoutPlanId: "", label: "", instructions: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(() => action({ clientId, values }));
    form.reset();
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormMessage state={state} />
        <FormSelect
          control={form.control}
          name="workoutPlanId"
          label="Treino"
          placeholder="Escolha um treino"
          options={plans}
        />
        <FormField
          control={form.control}
          name="label"
          label="Rótulo (A, B, C...)"
        />
        <FormField
          control={form.control}
          name="instructions"
          label="Instruções ao aluno"
        />
        <SubmitButton pending={pending}>Atribuir treino</SubmitButton>
      </FieldGroup>
    </form>
  );
}
