"use server";

import { ClientStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { INVALID_DATA, type ActionState } from "@/lib/action-state";
import { requireProfessional } from "@/lib/auth";
import {
  createClient,
  setClientStatus,
  updateClient,
} from "@/lib/data/clients";
import { clientSchema } from "@/lib/validations/client";

const NOT_FOUND: ActionState = {
  status: "error",
  message: "Aluno não encontrado.",
};

export async function saveClient(
  _prevState: ActionState,
  input: { id: string | null; values: unknown },
): Promise<ActionState> {
  const { id: professionalId } = await requireProfessional();

  const parsed = clientSchema.safeParse(input.values);
  if (!parsed.success) return INVALID_DATA;

  let clientId = input.id;
  try {
    if (clientId) {
      const saved = await updateClient(professionalId, clientId, parsed.data);
      if (!saved) return NOT_FOUND;
    } else {
      clientId = (await createClient(professionalId, parsed.data)).id;
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        status: "error",
        message: "Você já tem um aluno com este telefone.",
      };
    }
    throw error;
  }

  revalidatePath("/", "layout");
  redirect(`/clients/${clientId}`);
}

export async function changeClientStatus(id: string, status: ClientStatus) {
  const { id: professionalId } = await requireProfessional();

  await setClientStatus(
    professionalId,
    id,
    z.enum(ClientStatus).parse(status),
  );
  revalidatePath("/", "layout");
}
