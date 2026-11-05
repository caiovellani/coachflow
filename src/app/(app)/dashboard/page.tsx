import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/app/empty-state";
import { LinkButton } from "@/components/app/link-button";
import { ListSkeleton } from "@/components/app/list-skeleton";
import { PageHeader } from "@/components/app/page-header";
import { requireProfessional } from "@/lib/auth";
import { getDashboard } from "@/lib/data/dashboard";
import { formatDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Início" };

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-3xl font-semibold tracking-tight">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

async function Dashboard() {
  const { id, name } = await requireProfessional();
  const data = await getDashboard(id, new Date());
  const greeting = `Olá, ${name.split(" ")[0]}!`;

  if (data.activeClients === 0) {
    return (
      <>
        <PageHeader title={greeting} />
        <EmptyState
          title="Cadastre seu primeiro aluno"
          description="Quando seus alunos registrarem treinos, você verá aqui quem precisa da sua atenção."
        >
          <LinkButton href="/clients/new">Cadastrar aluno</LinkButton>
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader title={greeting} description="Quem precisa da sua atenção hoje?" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Alunos ativos" value={data.activeClients} />
        <Metric label="Treinaram hoje" value={data.trainedToday} />
        <Metric label="Precisam de atenção" value={data.needAttention} />
        <Metric label="Inativos" value={data.inactive} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Atenção necessária</h2>
        {data.attention.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum aluno precisa de atenção agora.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {data.attention.map(({ client, message }) => (
              <li key={client.id}>
                <Link href={`/clients/${client.id}`} className="block p-3 text-sm">
                  <span className="font-medium">{client.name}</span>: {message}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Atividade recente</h2>
        {data.recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma sessão registrada ainda.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {data.recent.map((session) => (
              <li key={session.id}>
                <Link
                  href={`/clients/${session.client.id}`}
                  className="flex justify-between gap-3 p-3 text-sm"
                >
                  <span>
                    <span className="font-medium">{session.client.name}</span>{" "}
                    {session.workoutPlan
                      ? `concluiu ${session.workoutPlan.name}`
                      : `registrou ${session._count.exerciseLogs} exercício(s)`}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {formatDate(session.startedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Suspense fallback={<ListSkeleton />}>
        <Dashboard />
      </Suspense>
    </div>
  );
}
