"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { INVALID_DATA, type ActionState } from "@/lib/action-state";
import { requireProfessional } from "@/lib/auth";
import { simulateMessage } from "@/lib/data/simulator";

const textSchema = z.string().trim().min(1).max(1000);

export async function sendSimulatedMessage(
  _prevState: ActionState,
  input: { clientId: string; text: unknown },
): Promise<ActionState> {
  if (process.env.NODE_ENV === "production") {
    return { status: "error", message: "Disponível só em desenvolvimento." };
  }

  const { id: professionalId } = await requireProfessional();
  const text = textSchema.safeParse(input.text);
  if (!text.success) return INVALID_DATA;

  try {
    const sent = await simulateMessage(professionalId, input.clientId, text.data);
    if (!sent) return { status: "error", message: "Aluno não encontrado." };
  } catch (error) {
    console.error("simulator failed", error);
    revalidatePath("/", "layout");
    return { status: "error", message: "A IA falhou. Veja o terminal." };
  }

  revalidatePath("/", "layout");
  return null;
}
