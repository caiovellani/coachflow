import "server-only";

import type { AlertType, Client } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/** Uma mensagem reprocessada nao gera um segundo alerta do mesmo tipo. */
export async function createAlertOnce(
  client: Client,
  type: AlertType,
  message: string,
  messageKey: string,
) {
  await prisma.alert.createMany({
    skipDuplicates: true,
    data: {
      professionalId: client.professionalId,
      clientId: client.id,
      type,
      message,
      sourceKey: `${messageKey}:${type}`,
    },
  });
}
