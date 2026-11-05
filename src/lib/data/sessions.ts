import "server-only";

import { Prisma, SessionStatus, type Client } from "@prisma/client";

import { fromDateInput, startOfDay } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { parseLoad } from "@/lib/validations/common";
import { parseReps, type SessionInput } from "@/lib/validations/session";

const sessionDetails = {
  workoutPlan: { select: { name: true, version: true } },
  exerciseLogs: {
    orderBy: { position: "asc" },
    include: { sets: { orderBy: { setNumber: "asc" } } },
  },
} satisfies Prisma.WorkoutSessionInclude;

export function listClientSessions(professionalId: string, clientId: string) {
  return prisma.workoutSession.findMany({
    where: { professionalId, clientId },
    include: sessionDetails,
    orderBy: { startedAt: "desc" },
    take: 30,
  });
}

/**
 * Registra uma sessao concluida. `idempotencyKey` faz um reenvio devolver a
 * sessao ja gravada em vez de duplicar. Retorna null se aluno, exercicios ou
 * treino nao pertencerem a este profissional.
 */
export async function createCompletedSession(
  professionalId: string,
  clientId: string,
  input: SessionInput,
  idempotencyKey: string,
) {
  const exerciseIds = [...new Set(input.items.map((item) => item.exerciseId))];

  const [client, exercises, assignment] = await Promise.all([
    prisma.client.findFirst({ where: { id: clientId, professionalId } }),
    prisma.exercise.findMany({
      where: { professionalId, id: { in: exerciseIds } },
    }),
    input.workoutPlanId
      ? prisma.clientWorkoutPlan.findFirst({
          where: { clientId, workoutPlanId: input.workoutPlanId },
        })
      : null,
  ]);
  if (!client || exercises.length !== exerciseIds.length) return null;
  if (input.workoutPlanId && !assignment) return null;

  const names = new Map(exercises.map(({ id, name }) => [id, name]));
  const performedAt = fromDateInput(input.date);

  try {
    return await prisma.workoutSession.create({
      data: {
        professionalId,
        clientId,
        idempotencyKey,
        workoutPlanId: input.workoutPlanId || null,
        status: SessionStatus.COMPLETED,
        startedAt: performedAt,
        completedAt: performedAt,
        notes: input.notes || null,
        exerciseLogs: {
          create: input.items.map((item, index) => ({
            exerciseId: item.exerciseId,
            exerciseName: names.get(item.exerciseId)!,
            position: index + 1,
            sets: {
              create: parseReps(item.reps).map((reps, setIndex) => ({
                setNumber: setIndex + 1,
                reps,
                load: parseLoad(item.load),
              })),
            },
          })),
        },
      },
    });
  } catch (error) {
    const isDuplicate =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002";
    if (!isDuplicate) throw error;

    return prisma.workoutSession.findUniqueOrThrow({
      where: {
        professionalId_idempotencyKey: { professionalId, idempotencyKey },
      },
    });
  }
}

const openSessionToday = (client: Client) =>
  prisma.workoutSession.findFirst({
    where: {
      professionalId: client.professionalId,
      clientId: client.id,
      status: SessionStatus.IN_PROGRESS,
      startedAt: { gte: startOfDay(new Date()) },
    },
    orderBy: { startedAt: "desc" },
  });

/** Registro pelo WhatsApp: acrescenta um exercicio a sessao aberta de hoje. */
export async function appendExerciseLog(
  client: Client,
  entry: {
    exercise: { id: string; name: string };
    workoutPlanId: string | null;
    reps: number[];
    load: number | null;
  },
  idempotencyKey: string,
) {
  const session =
    (await openSessionToday(client)) ??
    (await prisma.workoutSession.create({
      data: {
        professionalId: client.professionalId,
        clientId: client.id,
        workoutPlanId: entry.workoutPlanId,
        idempotencyKey,
      },
    }));

  const position = await prisma.exerciseLog.count({
    where: { sessionId: session.id },
  });

  return prisma.exerciseLog.create({
    data: {
      sessionId: session.id,
      exerciseId: entry.exercise.id,
      exerciseName: entry.exercise.name,
      position: position + 1,
      sets: {
        create: entry.reps.map((reps, index) => ({
          setNumber: index + 1,
          reps,
          load: entry.load,
        })),
      },
    },
  });
}

export async function completeOpenSession(client: Client) {
  const session = await openSessionToday(client);
  if (!session) return false;

  await prisma.workoutSession.update({
    where: { id: session.id },
    data: { status: SessionStatus.COMPLETED, completedAt: new Date() },
  });
  return true;
}
