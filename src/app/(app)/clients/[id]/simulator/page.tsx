import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ListSkeleton } from "@/components/app/list-skeleton";
import { PageHeader } from "@/components/app/page-header";
import { SimulatorForm } from "@/components/clients/simulator-form";
import { isAiConfigured } from "@/lib/ai/client";
import { requireProfessional } from "@/lib/auth";
import { getClient } from "@/lib/data/clients";
import { listSimulatorMessages } from "@/lib/data/simulator";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Simular conversa" };

type Params = Promise<{ id: string }>;

async function Simulator({ params }: { params: Params }) {
  const { id: professionalId } = await requireProfessional();
  if (process.env.NODE_ENV === "production") notFound();

  const { id } = await params;
  const client = await getClient(professionalId, id);
  if (!client) notFound();

  const messages = await listSimulatorMessages(professionalId, id);

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Aluno: {client.name}. Use só dados fictícios: as mensagens vão para o
        provedor de IA, e os registros são gravados de verdade.
        {!isAiConfigured() && " Sem AI_API_KEY: apenas comandos."}
      </p>
      <ul className="flex flex-col gap-2">
        {messages.map((message) => (
          <li
            key={message.id}
            className={cn(
              "max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap",
              message.direction === "INBOUND"
                ? "self-end bg-primary text-primary-foreground"
                : "self-start bg-muted",
            )}
          >
            {message.body}
          </li>
        ))}
      </ul>
      <SimulatorForm clientId={id} />
    </>
  );
}

export default function SimulatorPage({ params }: { params: Params }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <PageHeader title="Simular conversa" />
      <Suspense fallback={<ListSkeleton />}>
        <Simulator params={params} />
      </Suspense>
    </div>
  );
}
