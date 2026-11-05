import "server-only";

import { prisma } from "@/lib/prisma";
import type { ExerciseInput } from "@/lib/validations/exercise";

function toData(input: ExerciseInput) {
  return {
    name: input.name,
    muscleGroup: input.muscleGroup || null,
    equipment: input.equipment || null,
    description: input.description || null,
    notes: input.notes || null,
  };
}

export function listExercises(professionalId: string, query = "") {
  return prisma.exercise.findMany({
    where: {
      professionalId,
      archivedAt: null,
      ...(query && { name: { contains: query, mode: "insensitive" as const } }),
    },
    orderBy: { name: "asc" },
  });
}

export function getExercise(professionalId: string, id: string) {
  return prisma.exercise.findFirst({ where: { id, professionalId } });
}

export function createExercise(professionalId: string, input: ExerciseInput) {
  return prisma.exercise.create({ data: { ...toData(input), professionalId } });
}

export async function updateExercise(
  professionalId: string,
  id: string,
  input: ExerciseInput,
) {
  const { count } = await prisma.exercise.updateMany({
    where: { id, professionalId },
    data: toData(input),
  });
  return count === 1;
}

/** Arquiva em vez de apagar: treinos e sessoes antigos continuam apontando para ele. */
export async function archiveExercise(professionalId: string, id: string) {
  const { count } = await prisma.exercise.updateMany({
    where: { id, professionalId, archivedAt: null },
    data: { archivedAt: new Date() },
  });
  return count === 1;
}
