import "server-only";

import { AssignmentStatus, PlanStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { parseLoad } from "@/lib/validations/common";
import type { AssignmentInput, WorkoutInput } from "@/lib/validations/workout";

const planWithExercises = {
  exercises: { orderBy: { position: "asc" }, include: { exercise: true } },
} satisfies Prisma.WorkoutPlanInclude;

function toItems(items: WorkoutInput["items"]) {
  return items.map((item, index) => ({
    exerciseId: item.exerciseId,
    position: index + 1,
    sets: Number(item.sets),
    reps: item.reps,
    referenceLoad: parseLoad(item.referenceLoad),
    restSeconds: item.restSeconds ? Number(item.restSeconds) : null,
    notes: item.notes || null,
  }));
}

/** IDs vindos do navegador nao bastam: confere que os exercicios sao deste profissional. */
async function ownsExercises(professionalId: string, input: WorkoutInput) {
  const ids = [...new Set(input.items.map((item) => item.exerciseId))];
  const count = await prisma.exercise.count({
    where: { professionalId, id: { in: ids } },
  });
  return count === ids.length;
}

export function listPlans(professionalId: string) {
  return prisma.workoutPlan.findMany({
    where: { professionalId, status: PlanStatus.PUBLISHED },
    include: { _count: { select: { exercises: true } } },
    orderBy: { name: "asc" },
  });
}

export function getPlan(professionalId: string, id: string) {
  return prisma.workoutPlan.findFirst({
    where: { id, professionalId },
    include: planWithExercises,
  });
}

export async function createPlan(professionalId: string, input: WorkoutInput) {
  if (!(await ownsExercises(professionalId, input))) return null;

  return prisma.workoutPlan.create({
    data: {
      professionalId,
      name: input.name,
      description: input.description || null,
      status: PlanStatus.PUBLISHED,
      publishedAt: new Date(),
      exercises: { create: toItems(input.items) },
    },
  });
}

/** Encerra as atribuicoes ativas de um plano e devolve o que foi encerrado. */
async function endActiveAssignments(
  tx: Prisma.TransactionClient,
  workoutPlanId: string,
) {
  const active = await tx.clientWorkoutPlan.findMany({
    where: { workoutPlanId, status: AssignmentStatus.ACTIVE },
  });
  await tx.clientWorkoutPlan.updateMany({
    where: { workoutPlanId, status: AssignmentStatus.ACTIVE },
    data: { status: AssignmentStatus.ENDED, endDate: new Date() },
  });
  return active;
}

/**
 * Editar nunca altera a versao existente: sessoes passadas continuam apontando
 * para ela. Cria a versao seguinte e move as atribuicoes ativas para a nova.
 * Retorna null se o plano nao for deste profissional ou ja tiver sido substituido.
 */
export async function createPlanVersion(
  professionalId: string,
  id: string,
  input: WorkoutInput,
) {
  if (!(await ownsExercises(professionalId, input))) return null;

  return prisma.$transaction(async (tx) => {
    const { count } = await tx.workoutPlan.updateMany({
      where: { id, professionalId, status: PlanStatus.PUBLISHED },
      data: { status: PlanStatus.ARCHIVED },
    });
    if (count !== 1) return null;

    const previous = await tx.workoutPlan.findUniqueOrThrow({ where: { id } });
    const plan = await tx.workoutPlan.create({
      data: {
        professionalId,
        name: input.name,
        description: input.description || null,
        status: PlanStatus.PUBLISHED,
        publishedAt: new Date(),
        version: previous.version + 1,
        parentPlanId: id,
        exercises: { create: toItems(input.items) },
      },
    });

    const moved = await endActiveAssignments(tx, id);
    await tx.clientWorkoutPlan.createMany({
      data: moved.map(({ clientId, label, instructions }) => ({
        clientId,
        label,
        instructions,
        workoutPlanId: plan.id,
      })),
    });

    return plan;
  });
}

export function archivePlan(professionalId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.workoutPlan.updateMany({
      where: { id, professionalId, status: PlanStatus.PUBLISHED },
      data: { status: PlanStatus.ARCHIVED },
    });
    if (count !== 1) return false;

    await endActiveAssignments(tx, id);
    return true;
  });
}

export function listActiveAssignments(professionalId: string, clientId: string) {
  return prisma.clientWorkoutPlan.findMany({
    where: {
      clientId,
      status: AssignmentStatus.ACTIVE,
      client: { professionalId },
    },
    include: { workoutPlan: { include: planWithExercises } },
    orderBy: [{ label: "asc" }, { createdAt: "asc" }],
  });
}

export async function assignPlan(
  professionalId: string,
  clientId: string,
  input: AssignmentInput,
) {
  const [client, plan] = await Promise.all([
    prisma.client.findFirst({ where: { id: clientId, professionalId } }),
    prisma.workoutPlan.findFirst({
      where: {
        id: input.workoutPlanId,
        professionalId,
        status: PlanStatus.PUBLISHED,
      },
    }),
  ]);
  if (!client || !plan) return null;

  return prisma.clientWorkoutPlan.create({
    data: {
      clientId,
      workoutPlanId: plan.id,
      label: input.label || null,
      instructions: input.instructions || null,
    },
  });
}

export async function endAssignment(professionalId: string, id: string) {
  const { count } = await prisma.clientWorkoutPlan.updateMany({
    where: {
      id,
      status: AssignmentStatus.ACTIVE,
      client: { professionalId },
    },
    data: { status: AssignmentStatus.ENDED, endDate: new Date() },
  });
  return count === 1;
}
