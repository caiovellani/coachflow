"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";

import { signUp } from "@/app/actions/auth";
import { FormField } from "@/components/form/form-field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { FieldGroup } from "@/components/ui/field";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, null);
  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
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
          name="name"
          label="Nome"
          autoComplete="name"
        />
        <FormField
          control={form.control}
          name="email"
          label="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
        />
        <FormField
          control={form.control}
          name="password"
          label="Senha"
          type="password"
          autoComplete="new-password"
        />
        <SubmitButton pending={pending}>Criar conta</SubmitButton>
      </FieldGroup>
    </form>
  );
}
