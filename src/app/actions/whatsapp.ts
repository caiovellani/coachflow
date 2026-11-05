"use server";

import { revalidatePath } from "next/cache";

import { requireProfessional } from "@/lib/auth";
import { createLinkCode } from "@/lib/data/whatsapp";

export async function createLinkCodeAction(clientId: string) {
  const { id: professionalId } = await requireProfessional();

  await createLinkCode(professionalId, clientId);
  revalidatePath("/", "layout");
}
