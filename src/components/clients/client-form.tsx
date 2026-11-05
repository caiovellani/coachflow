"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";

import { saveClient } from "@/app/actions/clients";
import { FormField, FormTextarea } from "@/components/form/form-field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { FieldGroup } from "@/components/ui/field";
import { clientSchema, type ClientInput } from "@/lib/validations/client";

export function ClientForm({
  id,
  defaultValues,
}: {
  id: string | null;
  defaultValues: ClientInput;
}) {
  const [state, action, pending] = useActionState(saveClient, null);
  const form = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
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
        <FormField
          control={form.control}
          name="phone"
          label="WhatsApp com DDD"
          type="tel"
          inputMode="tel"
          placeholder="(11) 99999-8888"
        />
        <FormField
          control={form.control}
          name="email"
          label="E-mail (opcional)"
          type="email"
          inputMode="email"
        />
        <FormField
          control={form.control}
          name="goal"
          label="Objetivo informado (opcional)"
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            label="Início"
            type="date"
          />
          <FormField
            control={form.control}
            name="plannedPerWeek"
            label="Treinos por semana"
            inputMode="numeric"
            placeholder="3"
          />
        </div>
        <FormTextarea
          control={form.control}
          name="notes"
          label="Observações (opcional)"
        />
        <SubmitButton pending={pending}>Salvar aluno</SubmitButton>
      </FieldGroup>
    </form>
  );
}
