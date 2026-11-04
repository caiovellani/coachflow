import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { archiveWorkout } from "@/app/actions/workouts";
import { ActionButton } from "@/components/app/action-button";
import { LinkButton } from "@/components/app/link-button";
import { ListSkeleton } from "@/components/app/list-skeleton";
import { PageHeader } from "@/components/app/page-header";
import { requireProfessional } from "@/lib/auth";
import { getPlan } from "@/lib/data/workouts";
import { formatLoad } from "@/lib/format";

export const metadata: Metadata = { title: "Treino" };

type Params = Promise<{ id: string }>;

async function Workout({ params }: { params: Params }) {
  const professional = await requireProfessional();
  const { id } = await params;

  const plan = await getPlan(professional.id, id);
  if (!plan) notFound();

  const isCurrent = plan.status === "PUBLISHED";

  return (
    <>
      <PageHeader
        title={plan.name}
        description={`Versão ${plan.version}${isCurrent ? "" : " (arquivada)"}`}
      >
        {isCurrent && (
          <>
            <LinkButton href={`/workouts/${id}/edit`}>Editar</LinkButton>
            <ActionButton
              action={archiveWorkout.bind(null, id)}
              confirmMessage="Arquivar este treino? Ele será encerrado para os alunos, e o histórico não muda."
            >
              Arquivar
            </ActionButton>
          </>
        )}
      </PageHeader>

      {plan.description && <p className="text-sm">{plan.description}</p>}

      <ol className="flex flex-col gap-3">
        {plan.exercises.map((item) => (
          <li key={item.id} className="rounded-xl border p-4">
            <p className="font-medium">
              {item.position}. {item.exercise.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {item.sets} séries de {item.reps} repetições
              {item.referenceLoad &&
                ` · carga de referência ${formatLoad(item.referenceLoad, item.loadUnit)}`}
              {item.restSeconds && ` · descanso ${item.restSeconds}s`}
            </p>
            {item.notes && <p className="mt-1 text-sm">{item.notes}</p>}
          </li>
        ))}
      </ol>

      {plan.parentPlanId && (
        <Link
          href={`/workouts/${plan.parentPlanId}`}
          className="text-sm text-primary hover:underline"
        >
          Ver versão anterior
        </Link>
      )}
    </>
  );
}

export default function WorkoutPage({ params }: { params: Params }) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Suspense fallback={<ListSkeleton />}>
        <Workout params={params} />
      </Suspense>
    </div>
  );
}
