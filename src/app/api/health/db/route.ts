import { connection } from "next/server";

import { prisma } from "@/lib/prisma";

// Teste de fundacao (Fase 0): valida leitura/escrita no PostgreSQL via Prisma.
// Indisponivel em producao.
export async function GET() {
  await connection(); // executa a cada requisicao, nunca no build
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 404 });
  }

  try {
    const professionals = await prisma.professional.count();
    return Response.json({ ok: true, professionals });
  } catch (e) {
    console.error("db health check failed", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
