import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ListSkeleton } from "@/components/app/list-skeleton";
import { PageHeader } from "@/components/app/page-header";
import { ClientForm } from "@/components/clients/client-form";
import { ResetOnHide } from "@/components/form/reset-on-hide";
import { requireProfessional } from "@/lib/auth";
import { getClient } from "@/lib/data/clients";
import { toDateInput } from "@/lib/dates";

export const metadata: Metadata = { title: "Editar aluno" };

type Params = Promise<{ id: string }>;

async function EditClient({ params }: { params: Params }) {
  const professional = await requireProfessional();
  const { id } = await params;

  const client = await getClient(professional.id, id);
  if (!client) notFound();

  return (
    <ResetOnHide>
      <ClientForm
        id={client.id}
        defaultValues={{
          name: client.name,
          phone: client.phone,
          email: client.email ?? "",
          goal: client.goal ?? "",
          notes: client.notes ?? "",
          plannedPerWeek: client.plannedPerWeek?.toString() ?? "",
          startDate: toDateInput(client.startDate),
        }}
      />
    </ResetOnHide>
  );
}

export default function EditClientPage({ params }: { params: Params }) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader title="Editar aluno" />
      <Suspense fallback={<ListSkeleton />}>
        <EditClient params={params} />
      </Suspense>
    </div>
  );
}
