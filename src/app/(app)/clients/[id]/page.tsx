import { ClientStatus } from "@prisma/client";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { changeClientStatus } from "@/app/actions/clients";
import { createLinkCodeAction } from "@/app/actions/whatsapp";
import { endAssignmentAction } from "@/app/actions/workouts";
import { ActionButton } from "@/components/app/action-button";
import { EmptyState } from "@/components/app/empty-state";
import { LinkButton } from "@/components/app/link-button";
import { ListSkeleton } from "@/components/app/list-skeleton";
import { PageHeader } from "@/components/app/page-header";
import { ResetOnHide } from "@/components/form/reset-on-hide";
import { Badge } from "@/components/ui/badge";
import { AssignForm } from "@/components/workouts/assign-form";
import { requireProfessional } from "@/lib/auth";
import { getClient } from "@/lib/data/clients";
import { listClientSessions } from "@/lib/data/sessions";
import { listActiveAssignments, listPlans } from "@/lib/data/workouts";
import { daysBetween, formatDate } from "@/lib/dates";
import { formatLoad } from "@/lib/format";
import { linkMessage, whatsappLinkUrl } from "@/lib/whatsapp/link-code";
import { CLIENT_STATUS_LABELS } from "@/lib/labels";
import { formatPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "Aluno" };

type Params = Promise<{ id: string }>;

function Detail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap">{value}</dd>
    </div>
  );
}

async function ClientProfile({ params }: { params: Params }) {
  const { id: professionalId } = await requireProfessional();
  const { id } = await params;

  const client = await getClient(professionalId, id);
  if (!client) notFound();

  const [assignments, plans, sessions] = await Promise.all([
    listActiveAssignments(professionalId, id),
    listPlans(professionalId),
    listClientSessions(professionalId, id),
  ]);

  const now = new Date();
  const sessionsLastWeek = sessions.filter(
    (session) =>
      session.status === "COMPLETED" &&
      daysBetween(session.startedAt, now) < 7,
  ).length;
  const frequency = client.plannedPerWeek
    ? `${sessionsLastWeek} de ${client.plannedPerWeek} nos últimos 7 dias`
    : `${sessionsLastWeek} nos últimos 7 dias`;

  const linkCodeIsValid =
    client.whatsappLinkCode !== null &&
    client.whatsappLinkCodeExpiresAt !== null &&
    client.whatsappLinkCodeExpiresAt > now;
  const linkUrl = linkCodeIsValid
    ? whatsappLinkUrl(client.whatsappLinkCode!)
    : null;

  const nextStatuses =
    client.status === ClientStatus.ACTIVE
      ? [
          { status: ClientStatus.PAUSED, label: "Pausar" },
          { status: ClientStatus.ARCHIVED, label: "Arquivar" },
        ]
      : [{ status: ClientStatus.ACTIVE, label: "Reativar" }];

  return (
    <>
      <PageHeader
        title={client.name}
        description={formatPhone(client.phone)}
      >
        <LinkButton href={`/clients/${id}/sessions/new`}>
          Registrar sessão
        </LinkButton>
        <LinkButton href={`/clients/${id}/edit`} variant="outline">
          Editar
        </LinkButton>
      </PageHeader>

      <section className="flex flex-col gap-3 rounded-xl border p-4">
        <Badge variant="outline">{CLIENT_STATUS_LABELS[client.status]}</Badge>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Detail label="Treinos realizados" value={frequency} />
          <Detail label="Início" value={formatDate(client.startDate)} />
          <Detail label="Objetivo" value={client.goal} />
          <Detail label="E-mail" value={client.email} />
          <Detail label="Observações" value={client.notes} />
        </dl>
        <div className="flex flex-wrap gap-2">
          {nextStatuses.map(({ status, label }) => (
            <ActionButton
              key={status}
              action={changeClientStatus.bind(null, id, status)}
            >
              {label}
            </ActionButton>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border p-4">
        <h2 className="font-semibold">WhatsApp</h2>
        {client.whatsappVerifiedAt ? (
          <p className="text-sm text-muted-foreground">
            Vinculado em {formatDate(client.whatsappVerifiedAt)}
            {client.messagesOptedOutAt &&
              ". O aluno pediu para não receber mensagens automáticas."}
          </p>
        ) : linkCodeIsValid ? (
          <div className="flex flex-col gap-2 text-sm">
            <p>
              Envie ao aluno para ele mandar esta mensagem ao seu número:{" "}
              <strong>{linkMessage(client.whatsappLinkCode!)}</strong>
            </p>
            {linkUrl && (
              <a href={linkUrl} className="break-all text-primary underline">
                {linkUrl}
              </a>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Gere um código para o aluno confirmar o número pelo WhatsApp. Ao
            enviá-lo, ele concorda em conversar com o assistente.
          </p>
        )}
        <div>
          <ActionButton action={createLinkCodeAction.bind(null, id)}>
            {client.whatsappVerifiedAt || linkCodeIsValid
              ? "Gerar novo código"
              : "Gerar código de vínculo"}
          </ActionButton>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Treino atual</h2>
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum treino atribuído.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {assignments.map((assignment) => (
              <li key={assignment.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/workouts/${assignment.workoutPlanId}`}
                    className="font-medium hover:underline"
                  >
                    {assignment.label && `${assignment.label} · `}
                    {assignment.workoutPlan.name}
                  </Link>
                  <ActionButton
                    action={endAssignmentAction.bind(null, assignment.id)}
                    confirmMessage="Encerrar este treino para o aluno?"
                  >
                    Encerrar
                  </ActionButton>
                </div>
                {assignment.instructions && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {assignment.instructions}
                  </p>
                )}
                <ol className="mt-2 list-decimal pl-5 text-sm">
                  {assignment.workoutPlan.exercises.map((item) => (
                    <li key={item.id}>
                      {item.exercise.name}: {item.sets} × {item.reps}
                      {item.referenceLoad &&
                        ` · ${formatLoad(item.referenceLoad, item.loadUnit)}`}
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        )}
        {plans.length > 0 ? (
          <details className="rounded-xl border p-4">
            <summary className="cursor-pointer font-medium">
              Atribuir treino
            </summary>
            <div className="mt-4">
              <ResetOnHide>
                <AssignForm
                  clientId={id}
                  plans={plans.map((plan) => ({
                    value: plan.id,
                    label: plan.name,
                  }))}
                />
              </ResetOnHide>
            </div>
          </details>
        ) : (
          <LinkButton href="/workouts/new" variant="outline">
            Criar um treino
          </LinkButton>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Histórico</h2>
        {sessions.length === 0 ? (
          <EmptyState
            title="Nenhuma sessão registrada"
            description="As sessões registradas aparecem aqui com séries, repetições e cargas."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {sessions.map((session) => (
              <li key={session.id} className="rounded-xl border p-4">
                <p className="font-medium">
                  {formatDate(session.startedAt)}
                  {session.workoutPlan &&
                    ` · ${session.workoutPlan.name} (v${session.workoutPlan.version})`}
                </p>
                <ul className="mt-2 text-sm">
                  {session.exerciseLogs.map((log) => (
                    <li key={log.id}>
                      {log.exerciseName}:{" "}
                      {log.sets.map((set) => set.reps).join(", ")} rep
                      {log.sets[0]?.load &&
                        ` · ${formatLoad(log.sets[0].load, log.sets[0].loadUnit)}`}
                    </li>
                  ))}
                </ul>
                {session.notes && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {session.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default function ClientPage({ params }: { params: Params }) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Suspense fallback={<ListSkeleton />}>
        <ClientProfile params={params} />
      </Suspense>
    </div>
  );
}
