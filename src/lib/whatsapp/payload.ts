import { z } from "zod";

// Campos desconhecidos sao ignorados: a Meta acrescenta campos sem aviso.
const messageSchema = z.object({
  id: z.string(),
  type: z.string(),
  from: z.string().optional(),
  from_user_id: z.string().optional(),
  text: z.object({ body: z.string() }).optional(),
  system: z
    .object({
      type: z.string(),
      user_id: z.string().optional(),
      previous_user_id: z.string().optional(),
    })
    .optional(),
});

const statusSchema = z.object({
  id: z.string(),
  status: z.string(),
  errors: z
    .array(z.object({ code: z.number(), title: z.string().optional() }))
    .optional(),
});

const webhookSchema = z.object({
  object: z.literal("whatsapp_business_account"),
  entry: z.array(
    z.object({
      changes: z.array(
        z.object({
          field: z.string(),
          value: z.object({
            metadata: z.object({ phone_number_id: z.string() }).optional(),
            contacts: z
              .array(
                z.object({
                  wa_id: z.string().optional(),
                  user_id: z.string().optional(),
                }),
              )
              .optional(),
            messages: z.array(messageSchema).optional(),
            statuses: z.array(statusSchema).optional(),
          }),
        }),
      ),
    }),
  ),
});

export type InboundMessage = {
  providerMessageId: string;
  /** BSUID; sem ele, o numero, que ainda serve como destinatario. */
  senderId: string | null;
  phone: string | null;
  type: string;
  body: string | null;
  identityChange: { from: string; to: string } | null;
};

export type FailedStatus = { providerMessageId: string; error: string };

/** Extrai so os eventos do nosso numero. Retorna null se o formato for desconhecido. */
export function parseWebhook(payload: unknown, phoneNumberId: string) {
  const parsed = webhookSchema.safeParse(payload);
  if (!parsed.success) return null;

  const messages: InboundMessage[] = [];
  const failures: FailedStatus[] = [];

  for (const { changes } of parsed.data.entry) {
    for (const { field, value } of changes) {
      if (field !== "messages") continue;
      if (value.metadata?.phone_number_id !== phoneNumberId) continue;

      const contact = value.contacts?.[0];
      for (const message of value.messages ?? []) {
        const phone = message.from ?? contact?.wa_id ?? null;
        const { user_id: to, previous_user_id: from } = message.system ?? {};
        messages.push({
          providerMessageId: message.id,
          senderId: message.from_user_id ?? contact?.user_id ?? phone,
          phone,
          type: message.type,
          body: message.text?.body ?? null,
          identityChange: from && to ? { from, to } : null,
        });
      }

      for (const status of value.statuses ?? []) {
        if (status.status !== "failed") continue;
        const [error] = status.errors ?? [];
        failures.push({
          providerMessageId: status.id,
          error: error ? `${error.code}: ${error.title ?? ""}` : "failed",
        });
      }
    }
  }

  return { messages, failures };
}
