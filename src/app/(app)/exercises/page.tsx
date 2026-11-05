import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/app/empty-state";
import { LinkButton } from "@/components/app/link-button";
import { ListSkeleton } from "@/components/app/list-skeleton";
import { PageHeader } from "@/components/app/page-header";
import { Input } from "@/components/ui/input";
import { requireProfessional } from "@/lib/auth";
import { listExercises } from "@/lib/data/exercises";

export const metadata: Metadata = { title: "Exercícios" };

type SearchParams = Promise<{ q?: string }>;

async function ExerciseList({ searchParams }: { searchParams: SearchParams }) {
  const { id } = await requireProfessional();
  const query = (await searchParams).q?.trim() ?? "";
  const exercises = await listExercises(id, query);

  return (
    <>
      <Form action="/exercises">
        <Input
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Buscar exercício"
          aria-label="Buscar exercício"
          className="h-11"
        />
      </Form>
      {exercises.length === 0 ? (
        <EmptyState
          title="Nenhum exercício encontrado"
          description="Monte sua biblioteca para usar os exercícios nos treinos."
        />
      ) : (
        <ul className="divide-y rounded-xl border">
          {exercises.map((exercise) => (
            <li key={exercise.id}>
              <Link href={`/exercises/${exercise.id}/edit`} className="block p-3">
                <span className="block font-medium">{exercise.name}</span>
                {exercise.muscleGroup && (
                  <span className="block text-sm text-muted-foreground">
                    {exercise.muscleGroup}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function ExercisesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <PageHeader title="Exercícios">
        <LinkButton href="/exercises/new">Novo exercício</LinkButton>
      </PageHeader>
      <Suspense fallback={<ListSkeleton />}>
        <ExerciseList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
