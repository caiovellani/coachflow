import "server-only";

const BSUID = /^[A-Z]{2}\./;

/** Envia texto e devolve o id da mensagem. Lanca erro se a Meta recusar. */
export async function sendText(recipient: string, body: string) {
  const baseUrl = process.env.WHATSAPP_API_URL ?? "https://graph.facebook.com";
  const version = process.env.WHATSAPP_API_VERSION ?? "v27.0";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  const response = await fetch(`${baseUrl}/${version}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      // Com `to` e `recipient` juntos a Meta prioriza o telefone: use so um.
      ...(BSUID.test(recipient) ? { recipient } : { to: recipient }),
      type: "text",
      text: { body },
    }),
  });

  if (!response.ok) {
    throw new Error(`WhatsApp send failed: ${response.status}`);
  }

  const data: { messages?: { id: string }[] } = await response.json();
  const id = data.messages?.[0]?.id;
  if (!id) throw new Error("WhatsApp send returned no message id");
  return id;
}
