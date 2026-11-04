import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { ListSkeleton } from "@/components/app/list-skeleton";
import { PageHeader } from "@/components/app/page-header";
import { ClientForm } from "@/components/clients/client-form";
import { ResetOnHide } from "@/components/form/reset-on-hide";
import { toDateInput } from "@/lib/dates";

export const metadata: Metadata = { title: "Novo aluno" };

async function NewClient() {
  await connection(); // a data padrao e a de hoje, nao a do build

  return (
    <ResetOnHide>
      <ClientForm
        id={null}
        defaultValues={{
          name: "",
          phone: "",
          email: "",
          goal: "",
          notes: "",
          plannedPerWeek: "",
          startDate: toDateInput(new Date()),
        }}
      />
    </ResetOnHide>
  );
}

export default function NewClientPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader title="Novo aluno" />
      <Suspense fallback={<ListSkeleton />}>
        <NewClient />
      </Suspense>
    </div>
  );
}
