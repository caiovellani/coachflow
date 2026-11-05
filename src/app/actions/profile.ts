"use server";

import { revalidatePath } from "next/cache";

import { INVALID_DATA, type ActionState } from "@/lib/action-state";
import { requireProfessional } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/lib/validations/profile";

export async function updateProfile(
  _prevState: ActionState,
  input: unknown,
): Promise<ActionState> {
  const { id } = await requireProfessional();

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return INVALID_DATA;

  await prisma.professional.update({
    where: { id },
    data: { name: parsed.data.name },
  });

  revalidatePath("/", "layout");
  return { status: "success", message: "Perfil atualizado." };
}
