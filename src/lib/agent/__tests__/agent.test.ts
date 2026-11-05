import { randomUUID } from "node:crypto";

import type { Client } from "@prisma/client";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { ChatMessage, ToolCall } from "@/lib/ai/client";

vi.mock("server-only", () => ({}));

type Scripted = { content?: string; calls?: [string, object][] } | Error;

const ai = vi.hoisted(() => ({
  script: [] as unknown[],
  requests: [] as unknown[][],
  configured: true,
}));

vi.mock("@/lib/ai/client", () => ({
  isAiConfigured: () => ai.configured,
  chatCompletion: async (messages: ChatMessage[]) => {
    ai.requests.push([...messages]);
    const step = ai.script.shift() as Scripted | undefined;
    if (step instanceof Error) throw step;
    const tool_calls: ToolCall[] | undefined = step?.calls?.map(
      ([name, args], index) => ({
        id: `call_${index}`,
        type: "function",
        function: { name, arguments: JSON.stringify(args) },
      }),
    );
    return { content: step?.content ?? null, tool_calls };
  },
}));

// Precisa de um Postgres descartavel: nunca aponte para o banco real.
const url = process.env.TEST_DATABASE_URL;
if (url) process.env.DATABASE_URL = url;

describe.skipIf(!url)("agente", () => {
  let prisma: typeof import("@/lib/prisma").prisma;
  let respond: typeof import("@/lib/agent/respond");
  let run: typeof import("@/lib/agent/run");
  let client: Client;
  let otherClient: Client;
  let replies: string[];

  /** Devolve o resultado que a ferramenta entregou ao modelo. */
  const toolResult = (index = 0) => {
    const messages = ai.requests.at(-1) as ChatMessage[];
    const results = messages.filter((message) => message.role === "tool");
    return JSON.parse((results[index] as { content: string }).content);
  };

  const say = (text: string) =>
    respond.respondToStudent(client, text, `test:${randomUUID()}`, async (body) => {
      replies.push(body);
    });

  const logs = () =>
    prisma.exerciseLog.findMany({
      where: { session: { clientId: client.id } },
      include: { sets: { orderBy: { setNumber: "asc" } }, session: true },
    });

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/prisma"));
    respond = await import("@/lib/agent/respond");
    run = await import("@/lib/agent/run");
  });

  beforeEach(async () => {
    ai.script = [];
    ai.requests = [];
    ai.configured = true;
    replies = [];

    const professional = (name: string) =>
      prisma.professional.create({
        data: {
          authUserId: randomUUID(),
          name,
          email: `${randomUUID()}@example.com`,
        },
      });
    const owner = await professional("Ana");
    const other = await professional("Outra");

    client = await prisma.client.create({
      data: {
        professionalId: owner.id,
        name: "Lucas Lima",
        phone: `+55119${randomUUID().replace(/\D/g, "").padEnd(8, "1").slice(0, 8)}`,
        notes: "SEGREDO_DO_PERSONAL",
      },
    });
    otherClient = await prisma.client.create({
      data: { professionalId: other.id, name: "Bia", phone: client.phone },
    });

    const exercise = (professionalId: string, name: string, description?: string) =>
      prisma.exercise.create({ data: { professionalId, name, description } });

    const reto = await exercise(owner.id, "Supino reto", "Desça a barra até o peito.");
    await exercise(owner.id, "Supino inclinado");
    await exercise(other.id, "Leg press exclusivo");

    const plan = await prisma.workoutPlan.create({
      data: {
        professionalId: owner.id,
        name: "Treino A",
        status: "PUBLISHED",
        exercises: {
          create: {
            exerciseId: reto.id,
            position: 1,
            sets: 3,
            reps: "10",
            referenceLoad: "60",
          },
        },
      },
    });
    await prisma.clientWorkoutPlan.create({
      data: { clientId: client.id, workoutPlanId: plan.id, label: "A" },
    });
  });

  it("registra com os dados do aluno e abre a sessao de hoje", async () => {
    ai.script = [
      { calls: [["recordExercise", { exerciseName: "supino reto", reps: [10, 10, 8], load: 60 }]] },
      { content: "Registrei!" },
    ];
    await say("Fiz supino reto com 60 kg. As repetições foram 10, 10 e 8.");

    const [log] = await logs();
    expect(log.exerciseName).toBe("Supino reto");
    expect(log.sets.map(({ reps }) => reps)).toEqual([10, 10, 8]);
    expect(Number(log.sets[0].load)).toBe(60);
    expect(log.session.status).toBe("IN_PROGRESS");
    expect(log.session.workoutPlanId).not.toBeNull();
    expect(replies).toEqual(["Registrei!"]);
  });

  it("recusa carga que o aluno nao informou", async () => {
    ai.script = [
      { calls: [["recordExercise", { exerciseName: "supino reto", reps: [10], load: 60 }]] },
      { content: "Qual foi a carga?" },
    ];
    await say("fiz supino reto, 10 repetições");

    expect(await logs()).toEqual([]);
    expect(toolResult().status).toBe("refused");
  });

  it("grava sem carga quando o aluno nao informou", async () => {
    ai.script = [
      { calls: [["recordExercise", { exerciseName: "supino reto", reps: [10] }]] },
      { content: "ok" },
    ];
    await say("fiz supino reto, 10 repetições");

    const [log] = await logs();
    expect(log.sets[0].load).toBeNull();
  });

  it("prefere o exercicio do treino ao da biblioteca", async () => {
    ai.script = [
      { calls: [["recordExercise", { exerciseName: "supino", reps: [10] }]] },
      { content: "ok" },
    ];
    await say("fiz supino, 10 repetições");

    const [log] = await logs();
    expect(log.exerciseName).toBe("Supino reto");
  });

  it("pergunta quando o treino tem dois exercicios possiveis e nao grava", async () => {
    const [assignment] = await prisma.clientWorkoutPlan.findMany({
      where: { clientId: client.id },
    });
    const inclinado = await prisma.exercise.findFirstOrThrow({
      where: { professionalId: client.professionalId, name: "Supino inclinado" },
    });
    await prisma.workoutExercise.create({
      data: {
        workoutPlanId: assignment.workoutPlanId,
        exerciseId: inclinado.id,
        position: 2,
        sets: 3,
        reps: "10",
      },
    });

    ai.script = [
      { calls: [["recordExercise", { exerciseName: "supino", reps: [10] }]] },
      { content: "Reto ou inclinado?" },
    ];
    await say("fiz supino, 10 repetições");

    expect(await logs()).toEqual([]);
    expect(toolResult()).toMatchObject({ status: "ambiguous" });
  });

  it("aproveita numeros da mensagem anterior", async () => {
    await prisma.messageEvent.create({
      data: {
        provider: "test",
        providerMessageId: randomUUID(),
        clientId: client.id,
        body: "fiz 10, 10 e 8",
      },
    });
    ai.script = [
      { calls: [["recordExercise", { exerciseName: "supino reto", reps: [10, 10, 8] }]] },
      { content: "ok" },
    ];
    await say("foi no supino reto");
    expect(await logs()).toHaveLength(1);
  });

  it("nao encontra exercicio de outro personal", async () => {
    ai.script = [
      { calls: [["recordExercise", { exerciseName: "Leg press exclusivo", reps: [10] }]] },
      { content: "Não achei." },
    ];
    await say("fiz leg press exclusivo, 10 repetições");

    expect(await logs()).toEqual([]);
    expect(toolResult()).toMatchObject({ status: "refused" });
  });

  it("ferramenta ignora IDs enviados pelo modelo", async () => {
    await prisma.workoutSession.create({
      data: {
        professionalId: otherClient.professionalId,
        clientId: otherClient.id,
        status: "COMPLETED",
        notes: "alheia",
      },
    });
    ai.script = [
      { calls: [["getLastSessions", { clientId: otherClient.id, professionalId: otherClient.professionalId }]] },
      { content: "ok" },
    ];
    await say("o que fiz ontem?");
    expect(toolResult()).toEqual([]);
  });

  it("repetir a chamada na mesma mensagem nao duplica", async () => {
    const call: [string, object] = ["recordExercise", { exerciseName: "supino reto", reps: [10] }];
    ai.script = [{ calls: [call, call] }, { calls: [call] }, { content: "ok" }];
    await say("fiz supino reto, 10 repetições");
    expect(await logs()).toHaveLength(1);
  });

  it("nao conclui sessao se o aluno nao disse que terminou", async () => {
    ai.script = [
      { calls: [["recordExercise", { exerciseName: "supino reto", reps: [10] }]] },
      { calls: [["completeSession", {}]] },
      { content: "ok" },
    ];
    await say("fiz supino reto, 10 repetições");

    const [log] = await logs();
    expect(log.session.status).toBe("IN_PROGRESS");
    expect(log.session.completedAt).toBeNull();
  });

  it("conclui quando o aluno confirma, somando exercicios da sessao", async () => {
    ai.script = [
      { calls: [["recordExercise", { exerciseName: "supino reto", reps: [10] }]] },
      { content: "ok" },
    ];
    await say("fiz supino reto, 10 repetições");

    ai.script = [
      { calls: [["recordExercise", { exerciseName: "supino inclinado", reps: [8] }]] },
      { content: "ok" },
    ];
    await say("fiz supino inclinado, 8 repetições");

    ai.script = [{ calls: [["completeSession", {}]] }, { content: "Parabéns!" }];
    await say("terminei o treino");

    const all = await logs();
    expect(all).toHaveLength(2);
    expect(new Set(all.map(({ sessionId }) => sessionId)).size).toBe(1);
    expect(all[0].session.status).toBe("COMPLETED");
  });

  it("alerta cita o aluno, nao a interpretacao do modelo", async () => {
    ai.script = [
      { calls: [["reportToCoach", { kind: "DIFFICULTY", note: "aluno desmotivado" }]] },
      { content: "Avisei." },
    ];
    await say("não consegui fazer o movimento");

    const alert = await prisma.alert.findFirstOrThrow({ where: { clientId: client.id } });
    expect(alert.type).toBe("DIFFICULTY_REPORTED");
    expect(alert.message).toBe('relatou: "não consegui fazer o movimento"');
  });

  it("dor nao passa pela IA", async () => {
    await say("meu joelho dói");
    expect(ai.requests).toHaveLength(0);
    expect(replies[0]).toContain("avisei seu personal");
  });

  it("nao envia dados pessoais desnecessarios ao modelo", async () => {
    ai.script = [{ calls: [["getActiveWorkout", {}]] }, { content: "ok" }];
    await say("qual meu treino?");

    const sent = JSON.stringify(ai.requests);
    expect(sent).not.toContain(client.phone);
    expect(sent).not.toContain("SEGREDO_DO_PERSONAL");
    expect(sent).not.toContain("Lima");
    expect(sent).toContain("Treino A");
  });

  it("repete apenas instrucoes do personal", async () => {
    ai.script = [
      { calls: [["getExerciseDetails", { exerciseName: "supino reto" }]] },
      { content: "ok" },
    ];
    await say("como faço o supino reto?");
    expect(toolResult().instructions).toBe("Desça a barra até o peito.");
  });

  it("argumentos invalidos voltam ao modelo sem derrubar a conversa", async () => {
    ai.script = [
      { calls: [["recordExercise", { exerciseName: "supino reto", reps: "dez" }]] },
      { content: "Quantas repetições?" },
    ];
    await say("fiz supino reto");
    expect(toolResult().status).toBe("refused");
    expect(replies).toEqual(["Quantas repetições?"]);
  });

  it("ferramenta desconhecida e recusada", async () => {
    ai.script = [{ calls: [["deleteEverything", {}]] }, { content: "ok" }];
    await say("apague tudo");
    expect(toolResult().status).toBe("refused");
  });

  it("modelo em loop para sem travar", async () => {
    ai.script = Array.from({ length: 20 }, () => ({ calls: [["getActiveWorkout", {}]] }));
    await say("oi");
    expect(ai.requests.length).toBeLessThanOrEqual(6);
    expect(replies[0]).toContain("TREINO");
  });

  it("falha da IA avisa o aluno e propaga o erro", async () => {
    ai.script = [new Error("429")];
    await expect(say("oi")).rejects.toThrow("429");
    expect(replies[0]).toContain("Não consegui processar");
  });

  it("sem chave de IA continua funcionando com comandos", async () => {
    ai.configured = false;
    await say("oi");
    expect(ai.requests).toHaveLength(0);
    expect(replies[0]).toContain("TREINO");
  });

  it("runAgent e exportado para uso direto", () => {
    expect(typeof run.runAgent).toBe("function");
  });
});
