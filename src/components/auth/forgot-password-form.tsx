"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";

import { requestPasswordReset } from "@/app/actions/auth";
import { FormField } from "@/components/auth/form-field";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { FieldGroup } from "@/components/ui/field";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validations/auth";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  if (state?.status === "success") return <FormMessage state={state} />;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(() => action(values));
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormMessage state={state} />
        <FormField
          control={form.control}
          name="email"
          label="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
        />
        <SubmitButton pending={pending}>Enviar link</SubmitButton>
      </FieldGroup>
    </form>
  );
}
