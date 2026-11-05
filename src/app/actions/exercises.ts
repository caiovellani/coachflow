"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { INVALID_DATA, type ActionState } from "@/lib/action-state";
import { requireProfessional } from "@/lib/auth";
import {
  archiveExercise,
  createExercise,
  updateExercise,
} from "@/lib/data/exercises";
import { exerciseSchema } from "@/lib/validations/exercise";

export async function saveExercise(
  _prevState: ActionState,
  input: { id: string | null; values: unknown },
): Promise<ActionState> {
  const { id: professionalId } = await requireProfessional();

  const parsed = exerciseSchema.safeParse(input.values);
  if (!parsed.success) return INVALID_DATA;

  if (input.id) {
    const saved = await updateExercise(professionalId, input.id, parsed.data);
    if (!saved) return { status: "error", message: "Exercício não encontrado." };
  } else {
    await createExercise(professionalId, parsed.data);
  }

  revalidatePath("/", "layout");
  redirect("/exercises");
}

export async function archiveExerciseAction(id: string) {
  const { id: professionalId } = await requireProfessional();

  await archiveExercise(professionalId, id);
  revalidatePath("/", "layout");
  redirect("/exercises");
}
