"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";

import { signIn } from "@/app/actions/auth";
import { FormField } from "@/components/auth/form-field";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { FieldGroup } from "@/components/ui/field";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, null);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    const next = new URLSearchParams(window.location.search).get("next");
    startTransition(() => action({ values, next }));
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
        <div className="flex flex-col gap-2">
          <FormField
            control={form.control}
            name="password"
            label="Senha"
            type="password"
            autoComplete="current-password"
          />
          <Link
            href="/forgot-password"
            className="self-end text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Esqueceu a senha?
          </Link>
        </div>
        <SubmitButton pending={pending}>Entrar</SubmitButton>
      </FieldGroup>
    </form>
  );
}
