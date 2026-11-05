"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { INVALID_DATA, type ActionState } from "@/lib/action-state";
import { requireProfessional } from "@/lib/auth";
import { createCompletedSession } from "@/lib/data/sessions";
import { toDateInput } from "@/lib/dates";
import { sessionSchema } from "@/lib/validations/session";

export async function saveSession(
  _prevState: ActionState,
  input: { clientId: string; requestId: unknown; values: unknown },
): Promise<ActionState> {
  const { id: professionalId } = await requireProfessional();

  const parsed = sessionSchema.safeParse(input.values);
  const requestId = z.uuid().safeParse(input.requestId);
  if (!parsed.success || !requestId.success) return INVALID_DATA;

  if (parsed.data.date > toDateInput(new Date())) {
    return { status: "error", message: "A data não pode estar no futuro." };
  }

  const session = await createCompletedSession(
    professionalId,
    input.clientId,
    parsed.data,
    `panel:${requestId.data}`,
  );
  if (!session) {
    return { status: "error", message: "Aluno ou exercício não encontrado." };
  }

  revalidatePath("/", "layout");
  redirect(`/clients/${input.clientId}`);
}
