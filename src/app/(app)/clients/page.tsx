import { ClientStatus } from "@prisma/client";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/app/empty-state";
import { LinkButton } from "@/components/app/link-button";
import { ListSkeleton } from "@/components/app/list-skeleton";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { requireProfessional } from "@/lib/auth";
import { listClients, type ClientFilter } from "@/lib/data/clients";
import { formatPhone } from "@/lib/phone";
import { CLIENT_STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Alunos" };

type SearchParams = Promise<{ q?: string; status?: string }>;

const FILTERS: { value: ClientFilter; label: string }[] = [
  { value: ClientStatus.ACTIVE, label: "Ativos" },
  { value: ClientStatus.PAUSED, label: "Pausados" },
  { value: ClientStatus.ARCHIVED, label: "Arquivados" },
  { value: "ALL", label: "Todos" },
];

async function ClientList({ searchParams }: { searchParams: SearchParams }) {
  const { id } = await requireProfessional();
  const { q, status } = await searchParams;

  const query = q?.trim() ?? "";
  const filter =
    FILTERS.find(({ value }) => value === status)?.value ?? ClientStatus.ACTIVE;
  const clients = await listClients(id, { query, filter });

  return (
    <>
      <Form action="/clients">
        <input type="hidden" name="status" value={filter} />
        <Input
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Buscar por nome ou telefone"
          aria-label="Buscar aluno"
          className="h-11"
        />
      </Form>

      <nav aria-label="Filtrar por estado" className="flex gap-2 overflow-x-auto">
        {FILTERS.map(({ value, label }) => (
          <Link
            key={value}
            href={{ pathname: "/clients", query: { status: value, q: query } }}
            aria-current={value === filter ? "true" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm whitespace-nowrap",
              value === filter && "border-primary text-primary",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      {clients.length === 0 ? (
        <EmptyState
          title="Nenhum aluno encontrado"
          description="Cadastre um aluno ou ajuste a busca e os filtros."
        />
      ) : (
        <ul className="divide-y rounded-xl border">
          {clients.map((client) => (
            <li key={client.id}>
              <Link
                href={`/clients/${client.id}`}
                className="flex items-center justify-between gap-3 p-3"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {client.name}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {formatPhone(client.phone)}
                  </span>
                </span>
                <Badge variant="outline">
                  {CLIENT_STATUS_LABELS[client.status]}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function ClientsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <PageHeader title="Alunos">
        <LinkButton href="/clients/new">Novo aluno</LinkButton>
      </PageHeader>
      <Suspense fallback={<ListSkeleton />}>
        <ClientList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
