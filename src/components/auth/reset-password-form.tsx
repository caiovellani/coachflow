"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";

import { updatePassword } from "@/app/actions/auth";
import { FormField } from "@/components/auth/form-field";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { FieldGroup } from "@/components/ui/field";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/validations/auth";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, null);
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(() => action(values));
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormMessage state={state} />
        <FormField
          control={form.control}
          name="password"
          label="Nova senha"
          type="password"
          autoComplete="new-password"
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
        />
        <SubmitButton pending={pending}>Salvar nova senha</SubmitButton>
      </FieldGroup>
    </form>
  );
}
