import "server-only";

import { Prisma } from "@prisma/client";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const getAuthUser = cache(async () => {
  await connection(); // sessao e validada por requisicao, nunca no prerender

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(); // valida o token no servidor do Supabase
  return error ? null : user;
});

/** Cria o perfil no primeiro acesso. Seguro contra requisicoes concorrentes. */
async function createProfessional(user: User) {
  const email = user.email;
  if (!email) throw new Error("Authenticated user has no email");

  const metadataName: unknown = user.user_metadata?.name;
  const name =
    typeof metadataName === "string" && metadataName.trim()
      ? metadataName.trim().slice(0, 100)
      : email.split("@")[0];

  try {
    return await prisma.professional.upsert({
      where: { authUserId: user.id },
      update: {},
      create: { authUserId: user.id, name, email },
    });
  } catch (error) {
    const isUniqueViolation =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002";
    if (!isUniqueViolation) throw error;

    const professional = await prisma.professional.findUnique({
      where: { authUserId: user.id },
    });
    if (!professional) throw error;
    return professional;
  }
}

/**
 * Resolve o profissional autenticado a partir da sessao (servidor).
 * NUNCA confie em professionalId vindo do navegador: sempre derive daqui.
 */
export const getCurrentProfessional = cache(async () => {
  const user = await getAuthUser();
  if (!user) return null;

  const professional = await prisma.professional.findUnique({
    where: { authUserId: user.id },
  });
  return professional ?? createProfessional(user);
});

export async function requireProfessional() {
  const professional = await getCurrentProfessional();
  if (!professional) redirect("/login");
  return professional;
}
