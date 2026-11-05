import "server-only";

import { AlertType, type Client } from "@prisma/client";
import { z } from "zod";

import { isGrounded, matchExercises, statesCompletion } from "@/lib/agent/guards";
import type { ToolDefinition } from "@/lib/ai/client";
import { createAlertOnce } from "@/lib/data/alerts";
import { listExercises } from "@/lib/data/exercises";
import {
  appendExerciseLog,
  completeOpenSession,
  listClientSessions,
} from "@/lib/data/sessions";
import { listActiveAssignments } from "@/lib/data/workouts";
import { formatDate } from "@/lib/dates";
import { formatLoad } from "@/lib/format";

/** Vem do servidor. O modelo nunca informa aluno nem profissional. */
export type AgentContext = {
  client: Client;
  messageKey: string;
  latestText: string;
  studentTexts: string[];
  recorded: Set<string>;
};

const nameParam = {
  type: "object",
  properties: { exerciseName: { type: "string" } },
  required: ["exerciseName"],
};
const noParams = { type: "object", properties: {} };

const tool = (
  name: string,
  description: string,
  parameters: object,
): ToolDefinition => ({
  type: "function",
  function: { name, description, parameters },
});

export const AGENT_TOOLS: ToolDefinition[] = [
  tool("getActiveWorkout", "Treinos ativos do aluno, com exercícios, séries, repetições, carga de referência e instruções.", noParams),
  tool("getExerciseDetails", "Instruções cadastradas pelo personal para um exercício.", nameParam),
  tool("getLastSessions", "Últimas sessões registradas do aluno.", noParams),
  tool("getExerciseHistory", "Registros anteriores de um exercício: data, repetições e carga.", nameParam),
  tool("recordExercise", "Registra um exercício feito hoje. Use apenas números informados pelo aluno.", {
    type: "object",
    properties: {
      exerciseName: { type: "string" },
      reps: { type: "array", items: { type: "integer" }, description: "Repetições de cada série, ex.: [10, 10, 8]" },
      load: { type: "number", description: "Carga em kg. Omita se o aluno não informou." },
    },
    required: ["exerciseName", "reps"],
  }),
  tool("completeSession", "Conclui a sessão de hoje quando o aluno disser que terminou.", noParams),
  tool("reportToCoach", "Avisa o personal de um relato de dor, desconforto ou dificuldade.", {
    type: "object",
    properties: { kind: { type: "string", enum: ["PAIN", "DIFFICULTY"] } },
    required: ["kind"],
  }),
  tool("requestHumanSupport", "Avisa o personal que o aluno quer falar com uma pessoa.", noParams),
];

const nameArgs = z.object({ exerciseName: z.string().min(1) });
const recordArgs = z.object({
  exerciseName: z.string().min(1),
  reps: z.array(z.number().int().min(0).max(999)).min(1).max(20),
  load: z.number().min(0).max(9999).nullish(),
});
const reportArgs = z.object({ kind: z.enum(["PAIN", "DIFFICULTY"]) });

async function studentExercises({ professionalId, id }: Client) {
  const [assignments, library] = await Promise.all([
    listActiveAssignments(professionalId, id),
    listExercises(professionalId),
  ]);
  const inPlan = assignments.flatMap(({ workoutPlanId, workoutPlan }) =>
    workoutPlan.exercises.map(({ exercise }) => ({
      ...exercise,
      workoutPlanId,
    })),
  );
  return { inPlan, library };
}

/** Prefere os exercicios do treino do aluno; depois, a biblioteca do personal. */
async function findExercise(client: Client, exerciseName: string) {
  const { inPlan, library } = await studentExercises(client);
  const fromPlan = matchExercises(exerciseName, inPlan);
  const matches =
    fromPlan.length > 0 ? fromPlan : matchExercises(exerciseName, library);
  return [...new Map(matches.map((item) => [item.id, item])).values()];
}

const refused = (reason: string) => ({ status: "refused", reason });

function ambiguous(names: string[]) {
  return { status: "ambiguous", options: names };
}

async function createAlert(
  context: AgentContext,
  type: AlertType,
  message: string,
) {
  await createAlertOnce(context.client, type, message, context.messageKey);
  return { status: "ok" };
}

async function getActiveWorkout({ client }: AgentContext) {
  const assignments = await listActiveAssignments(
    client.professionalId,
    client.id,
  );
  return assignments.map(({ label, instructions, workoutPlan }) => ({
    label,
    name: workoutPlan.name,
    instructions,
    exercises: workoutPlan.exercises.map((item) => ({
      position: item.position,
      name: item.exercise.name,
      sets: item.sets,
      reps: item.reps,
      referenceLoad: formatLoad(item.referenceLoad, item.loadUnit),
      restSeconds: item.restSeconds,
      notes: item.notes,
    })),
  }));
}

async function getExerciseDetails(context: AgentContext, args: unknown) {
  const { exerciseName } = nameArgs.parse(args);
  const matches = await findExercise(context.client, exerciseName);
  if (matches.length === 0) return refused("exercício não encontrado");
  if (matches.length > 1) return ambiguous(matches.map(({ name }) => name));

  const [{ name, description, equipment }] = matches;
  return { name, instructions: description, equipment };
}

async function sessionHistory({ client }: AgentContext) {
  const sessions = await listClientSessions(client.professionalId, client.id);
  return sessions.map((session) => ({
    date: formatDate(session.startedAt),
    status: session.status,
    workout: session.workoutPlan?.name ?? null,
    exercises: session.exerciseLogs.map((log) => ({
      name: log.exerciseName,
      reps: log.sets.map(({ reps }) => reps),
      load: formatLoad(log.sets[0]?.load ?? null, log.sets[0]?.loadUnit),
    })),
  }));
}

async function getExerciseHistory(context: AgentContext, args: unknown) {
  const { exerciseName } = nameArgs.parse(args);
  const matches = await findExercise(context.client, exerciseName);
  if (matches.length === 0) return refused("exercício não encontrado");
  if (matches.length > 1) return ambiguous(matches.map(({ name }) => name));

  const sessions = await sessionHistory(context);
  return sessions.flatMap(({ date, exercises }) =>
    exercises
      .filter(({ name }) => matchExercises(name, matches).length > 0)
      .map(({ reps, load }) => ({ date, reps, load })),
  );
}

async function recordExercise(context: AgentContext, args: unknown) {
  const { exerciseName, reps, load } = recordArgs.parse(args);

  const values = load == null ? reps : [...reps, load];
  if (!isGrounded(values, context.studentTexts)) {
    return refused("o aluno não informou estes números");
  }

  const matches = await findExercise(context.client, exerciseName);
  if (matches.length === 0) return refused("exercício não encontrado");
  if (matches.length > 1) return ambiguous(matches.map(({ name }) => name));

  const [exercise] = matches;

  // O modelo pode repetir a chamada: a mesma mensagem nao grava duas vezes.
  const fingerprint = JSON.stringify([exercise.id, reps, load ?? null]);
  if (context.recorded.has(fingerprint)) return { status: "ok" };
  context.recorded.add(fingerprint);

  await appendExerciseLog(
    context.client,
    {
      exercise,
      workoutPlanId:
        "workoutPlanId" in exercise
          ? (exercise.workoutPlanId as string)
          : null,
      reps,
      load: load ?? null,
    },
    context.messageKey,
  );
  return { status: "ok", exercise: exercise.name, reps, load: load ?? null };
}

async function completeSession(context: AgentContext) {
  if (!statesCompletion(context.latestText)) {
    return refused("o aluno ainda não disse que terminou");
  }
  const completed = await completeOpenSession(context.client);
  return completed ? { status: "ok" } : refused("não há sessão aberta hoje");
}

async function reportToCoach(context: AgentContext, args: unknown) {
  const { kind } = reportArgs.parse(args);
  // O alerta cita o aluno, nunca a interpretacao do modelo.
  return createAlert(
    context,
    kind === "PAIN" ? AlertType.PAIN_REPORTED : AlertType.DIFFICULTY_REPORTED,
    `relatou: "${context.latestText.trim().slice(0, 200)}"`,
  );
}

const requestHumanSupport = (context: AgentContext) =>
  createAlert(
    context,
    AlertType.HUMAN_SUPPORT_REQUESTED,
    "pediu para falar com você pelo WhatsApp",
  );

const EXECUTORS: Record<
  string,
  (context: AgentContext, args: unknown) => Promise<unknown>
> = {
  getActiveWorkout,
  getExerciseDetails,
  getLastSessions: sessionHistory,
  getExerciseHistory,
  recordExercise,
  completeSession,
  reportToCoach,
  requestHumanSupport,
};

/** Argumento invalido volta ao modelo como recusa, em vez de derrubar a conversa. */
export async function executeTool(
  context: AgentContext,
  name: string,
  rawArguments: string,
) {
  const executor = EXECUTORS[name];
  if (!executor) return refused("ferramenta desconhecida");

  try {
    return await executor(context, JSON.parse(rawArguments || "{}"));
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return refused("argumentos inválidos");
    }
    throw error;
  }
}
