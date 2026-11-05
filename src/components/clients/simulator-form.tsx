"use client";

import { startTransition, useActionState, useState } from "react";

import { sendSimulatedMessage } from "@/app/actions/simulator";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { Input } from "@/components/ui/input";

export function SimulatorForm({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState(sendSimulatedMessage, null);
  const [text, setText] = useState("");

  return (
    <form
      method="post"
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!text.trim()) return;
        startTransition(() => action({ clientId, text }));
        setText("");
      }}
    >
      <FormMessage state={state} />
      <Input
        name="text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Mensagem do aluno"
        aria-label="Mensagem do aluno"
        autoComplete="off"
        className="h-11"
      />
      <SubmitButton pending={pending}>Enviar</SubmitButton>
    </form>
  );
}
