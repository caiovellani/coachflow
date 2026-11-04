"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { INVALID_DATA, type ActionState } from "@/lib/action-state";
import { requireProfessional } from "@/lib/auth";
import {
  archivePlan,
  assignPlan,
  createPlan,
  createPlanVersion,
  endAssignment,
} from "@/lib/data/workouts";
import { assignmentSchema, workoutSchema } from "@/lib/validations/workout";

export async function saveWorkout(
  _prevState: ActionState,
  input: { id: string | null; values: unknown },
): Promise<ActionState> {
  const { id: professionalId } = await requireProfessional();

  const parsed = workoutSchema.safeParse(input.values);
  if (!parsed.success) return INVALID_DATA;

  const plan = input.id
    ? await createPlanVersion(professionalId, input.id, parsed.data)
    : await createPlan(professionalId, parsed.data);
  if (!plan) {
    return {
      status: "error",
      message:
        "Não foi possível salvar. Este treino pode já ter uma versão mais nova.",
    };
  }

  revalidatePath("/", "layout");
  redirect(`/workouts/${plan.id}`);
}

export async function archiveWorkout(id: string) {
  const { id: professionalId } = await requireProfessional();

  await archivePlan(professionalId, id);
  revalidatePath("/", "layout");
  redirect("/workouts");
}

export async function assignWorkout(
  _prevState: ActionState,
  input: { clientId: string; values: unknown },
): Promise<ActionState> {
  const { id: professionalId } = await requireProfessional();

  const parsed = assignmentSchema.safeParse(input.values);
  if (!parsed.success) return INVALID_DATA;

  const assignment = await assignPlan(
    professionalId,
    input.clientId,
    parsed.data,
  );
  if (!assignment) {
    return { status: "error", message: "Aluno ou treino não encontrado." };
  }

  revalidatePath("/", "layout");
  return { status: "success", message: "Treino atribuído." };
}

export async function endAssignmentAction(id: string) {
  const { id: professionalId } = await requireProfessional();

  await endAssignment(professionalId, id);
  revalidatePath("/", "layout");
}
