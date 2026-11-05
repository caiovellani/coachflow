import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it, vi } from "vitest";

import type { ClientInput } from "@/lib/validations/client";
import type { WorkoutInput } from "@/lib/validations/workout";

vi.mock("server-only", () => ({}));

// Precisa de um Postgres descartavel: nunca aponte para o banco real.
const url = process.env.TEST_DATABASE_URL;
if (url) process.env.DATABASE_URL = url;

const clientInput = (phone: string): ClientInput => ({
  name: "Aluno",
  phone,
  email: "",
  goal: "",
  notes: "",
  plannedPerWeek: "",
  startDate: "2026-11-01",
});

const workoutInput = (exerciseId: string): WorkoutInput => ({
  name: "Treino A",
  description: "",
  items: [
    {
      exerciseId,
      sets: "3",
      reps: "10",
      referenceLoad: "60,5",
      restSeconds: "",
      notes: "",
    },
  ],
});

const sessionInput = (exerciseId: string, workoutPlanId = "") => ({
  date: "2026-11-02",
  workoutPlanId,
  notes: "",
  items: [{ exerciseId, reps: "10, 10, 8", load: "60" }],
});

describe.skipIf(!url)("dados por profissional", () => {
  let prisma: typeof import("@/lib/prisma").prisma;
  let clients: typeof import("@/lib/data/clients");
  let exercises: typeof import("@/lib/data/exercises");
  let workouts: typeof import("@/lib/data/workouts");
  let sessions: typeof import("@/lib/data/sessions");

  let owner: string;
  let intruder: string;
  let clientId: string;
  let exerciseId: string;
  let planId: string;
  let intruderExerciseId: string;
  let intruderClientId: string;

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/prisma"));
    clients = await import("@/lib/data/clients");
    exercises = await import("@/lib/data/exercises");
    workouts = await import("@/lib/data/workouts");
    sessions = await import("@/lib/data/sessions");

    const professional = (name: string) =>
      prisma.professional.create({
        data: {
          authUserId: randomUUID(),
          name,
          email: `${randomUUID()}@example.com`,
        },
      });
    owner = (await professional("Dono")).id;
    intruder = (await professional("Outro")).id;

    const exercise = {
      name: "Supino",
      muscleGroup: "",
      equipment: "",
      description: "",
      notes: "",
    };
    clientId = (await clients.createClient(owner, clientInput("11999990001"))).id;
    exerciseId = (await exercises.createExercise(owner, exercise)).id;
    planId = (await workouts.createPlan(owner, workoutInput(exerciseId)))!.id;
    await workouts.assignPlan(owner, clientId, {
      workoutPlanId: planId,
      label: "A",
      instructions: "",
    });

    intruderExerciseId = (await exercises.createExercise(intruder, exercise)).id;
    intruderClientId = (
      await clients.createClient(intruder, clientInput("11999990001"))
    ).id;
  });

  it("mesmo telefone pode existir em profissionais diferentes", () => {
    expect(intruderClientId).not.toBe(clientId);
  });

  it("leitura por ID de outro profissional nao retorna nada", async () => {
    expect(await clients.getClient(intruder, clientId)).toBeNull();
    expect(await exercises.getExercise(intruder, exerciseId)).toBeNull();
    expect(await workouts.getPlan(intruder, planId)).toBeNull();
    expect(await sessions.listClientSessions(intruder, clientId)).toEqual([]);
    expect(await workouts.listActiveAssignments(intruder, clientId)).toEqual([]);
  });

  it("listas nao misturam profissionais", async () => {
    const list = await clients.listClients(intruder, {
      query: "",
      filter: "ALL",
    });
    expect(list.map(({ id }) => id)).toEqual([intruderClientId]);
    expect(await workouts.listPlans(intruder)).toEqual([]);
  });

  it("escrita em dados de outro profissional e recusada", async () => {
    expect(
      await clients.updateClient(intruder, clientId, clientInput("11999990002")),
    ).toBe(false);
    expect(await clients.setClientStatus(intruder, clientId, "ARCHIVED")).toBe(
      false,
    );
    expect(await exercises.archiveExercise(intruder, exerciseId)).toBe(false);
    expect(await workouts.archivePlan(intruder, planId)).toBe(false);
    expect(
      await workouts.createPlanVersion(
        intruder,
        planId,
        workoutInput(intruderExerciseId),
      ),
    ).toBeNull();

    const [assignment] = await workouts.listActiveAssignments(owner, clientId);
    expect(await workouts.endAssignment(intruder, assignment.id)).toBe(false);

    const unchanged = await clients.getClient(owner, clientId);
    expect(unchanged?.status).toBe("ACTIVE");
    expect(unchanged?.phone).toBe("+5511999990001");
  });

  it("nao mistura entidades de profissionais diferentes", async () => {
    // Treino proprio usando exercicio alheio.
    expect(
      await workouts.createPlan(intruder, workoutInput(exerciseId)),
    ).toBeNull();
    // Atribuir treino alheio ao proprio aluno, e treino proprio a aluno alheio.
    const assign = { workoutPlanId: planId, label: "", instructions: "" };
    expect(
      await workouts.assignPlan(intruder, intruderClientId, assign),
    ).toBeNull();
    expect(await workouts.assignPlan(intruder, clientId, assign)).toBeNull();
    // Sessao em aluno alheio, ou em aluno proprio com exercicio alheio.
    const key = () => `panel:${randomUUID()}`;
    expect(
      await sessions.createCompletedSession(
        intruder,
        clientId,
        sessionInput(intruderExerciseId),
        key(),
      ),
    ).toBeNull();
    expect(
      await sessions.createCompletedSession(
        intruder,
        intruderClientId,
        sessionInput(exerciseId),
        key(),
      ),
    ).toBeNull();
    // Treino nao atribuido a este aluno.
    expect(
      await sessions.createCompletedSession(
        intruder,
        intruderClientId,
        sessionInput(intruderExerciseId, planId),
        key(),
      ),
    ).toBeNull();
  });

  it("reenvio com a mesma chave nao duplica a sessao", async () => {
    const key = `panel:${randomUUID()}`;
    const send = () =>
      sessions.createCompletedSession(
        owner,
        clientId,
        sessionInput(exerciseId),
        key,
      );

    const [first, second] = await Promise.all([send(), send()]);
    const third = await send();

    expect(second?.id).toBe(first?.id);
    expect(third?.id).toBe(first?.id);
    expect(
      await prisma.workoutSession.count({ where: { idempotencyKey: key } }),
    ).toBe(1);
  });

  it("nova versao preserva a sessao antiga e move a atribuicao", async () => {
    const session = await sessions.createCompletedSession(
      owner,
      clientId,
      sessionInput(exerciseId, planId),
      `panel:${randomUUID()}`,
    );

    const v2 = await workouts.createPlanVersion(owner, planId, {
      ...workoutInput(exerciseId),
      name: "Treino A revisado",
    });

    expect(v2).toMatchObject({ version: 2, parentPlanId: planId });

    const old = await workouts.getPlan(owner, planId);
    expect(old?.status).toBe("ARCHIVED");
    expect(old?.name).toBe("Treino A");
    expect(old?.exercises).toHaveLength(1);

    const saved = await prisma.workoutSession.findUnique({
      where: { id: session!.id },
    });
    expect(saved?.workoutPlanId).toBe(planId);

    const active = await workouts.listActiveAssignments(owner, clientId);
    expect(active.map(({ workoutPlanId }) => workoutPlanId)).toEqual([v2!.id]);
    expect(active[0].label).toBe("A");

    // A versao substituida nao pode gerar uma segunda continuacao.
    expect(
      await workouts.createPlanVersion(owner, planId, workoutInput(exerciseId)),
    ).toBeNull();
  });

  it("guarda o nome do exercicio como estava na sessao", async () => {
    await exercises.updateExercise(owner, exerciseId, {
      name: "Supino renomeado",
      muscleGroup: "",
      equipment: "",
      description: "",
      notes: "",
    });

    const [session] = await sessions.listClientSessions(owner, clientId);
    expect(session.exerciseLogs[0].exerciseName).toBe("Supino");
    expect(session.exerciseLogs[0].sets.map(({ reps }) => reps)).toEqual([
      10, 10, 8,
    ]);
  });
});
