import { after, type NextRequest } from "next/server";

import {
  processInbound,
  recordFailures,
  recordInbound,
} from "@/lib/whatsapp/inbound";
import { parseWebhook } from "@/lib/whatsapp/payload";
import { isValidSignature, safeEqual } from "@/lib/whatsapp/signature";

// Handshake feito pela Meta ao cadastrar o webhook.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token = searchParams.get("hub.verify_token");
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;

  if (
    searchParams.get("hub.mode") === "subscribe" &&
    expected &&
    token &&
    safeEqual(token, expected)
  ) {
    return new Response(searchParams.get("hub.challenge"), { status: 200 });
  }
  return new Response(null, { status: 403 });
}

// Qualquer resposta diferente de 200 faz a Meta reenviar por ate 7 dias.
export async function POST(request: NextRequest) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!appSecret || !phoneNumberId) {
    console.error("whatsapp webhook is not configured");
    return new Response(null, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  if (!isValidSignature(rawBody, signature, appSecret)) {
    return new Response(null, { status: 401 });
  }

  const events = parseWebhook(JSON.parse(rawBody), phoneNumberId);
  if (!events) {
    console.error("whatsapp webhook with unknown format");
    return new Response(null, { status: 200 });
  }

  await recordInbound(events.messages);
  await recordFailures(events.failures);

  after(async () => {
    for (const message of events.messages) await processInbound(message);
  });

  return new Response(null, { status: 200 });
}
