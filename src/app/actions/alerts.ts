"use server";

import { revalidatePath } from "next/cache";

import { requireProfessional } from "@/lib/auth";
import { resolveAlert } from "@/lib/data/dashboard";

export async function resolveAlertAction(id: string) {
  const { id: professionalId } = await requireProfessional();

  await resolveAlert(professionalId, id);
  revalidatePath("/", "layout");
}
