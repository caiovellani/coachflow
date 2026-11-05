"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";

import { updateProfile } from "@/app/actions/profile";
import { FormField } from "@/components/form/form-field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { FieldGroup } from "@/components/ui/field";
import { profileSchema, type ProfileInput } from "@/lib/validations/profile";

export function ProfileForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(updateProfile, null);
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(() => action(values));
  });

  return (
    <form method="post" onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormMessage state={state} />
        <FormField
          control={form.control}
          name="name"
          label="Nome"
          autoComplete="name"
        />
        <SubmitButton pending={pending}>Salvar</SubmitButton>
      </FieldGroup>
    </form>
  );
}
