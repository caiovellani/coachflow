import "server-only";

import { MessageDirection, MessageProcessingStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { respondToStudent } from "@/lib/agent/respond";
import { getClient } from "@/lib/data/clients";
import { prisma } from "@/lib/prisma";

const PROVIDER = "simulator";

export function listSimulatorMessages(professionalId: string, clientId: string) {
  return prisma.messageEvent.findMany({
    where: { provider: PROVIDER, professionalId, clientId },
    orderBy: { receivedAt: "asc" },
    take: 60,
  });
}

/** Mesmo caminho do WhatsApp, sem a Meta. Os registros sao gravados de verdade. */
export async function simulateMessage(
  professionalId: string,
  clientId: string,
  text: string,
) {
  const client = await getClient(professionalId, clientId);
  if (!client) return false;

  const record = (direction: MessageDirection, body: string) =>
    prisma.messageEvent.create({
      data: {
        provider: PROVIDER,
        providerMessageId: randomUUID(),
        direction,
        body,
        professionalId,
        clientId,
        processingStatus: MessageProcessingStatus.PROCESSED,
        processedAt: new Date(),
      },
    });

  const { providerMessageId } = await record(MessageDirection.INBOUND, text);
  await respondToStudent(
    client,
    text,
    `${PROVIDER}:${providerMessageId}`,
    async (body) => {
      await record(MessageDirection.OUTBOUND, body);
    },
  );
  return true;
}
