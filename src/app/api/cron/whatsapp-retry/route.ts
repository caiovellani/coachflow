import type { NextRequest } from "next/server";

import { retryPendingMessages } from "@/lib/whatsapp/inbound";
import { safeEqual } from "@/lib/whatsapp/signature";

// Para um agendador externo. Sem CRON_SECRET, a rota fica fechada.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");

  if (!secret || !header || !safeEqual(header, `Bearer ${secret}`)) {
    return new Response(null, { status: 401 });
  }

  const retried = await retryPendingMessages(new Date());
  return Response.json({ retried });
}
