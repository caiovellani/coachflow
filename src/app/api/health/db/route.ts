import { connection } from "next/server";

import { prisma } from "@/lib/prisma";

// Teste de fundacao (Fase 0): valida leitura/escrita no PostgreSQL via Prisma.
// Remover ou proteger antes de ir para producao.
export async function GET() {
  await connection(); // executa a cada requisicao, nunca no build

  try {
    const professionals = await prisma.professional.count();
    return Response.json({ ok: true, professionals });
  } catch (e) {
    console.error("db health check failed", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
