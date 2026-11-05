import "server-only";

import {
  ClientStatus,
  MessageDirection,
  MessageProcessingStatus,
  type Client,
} from "@prisma/client";

import { HELP, respondToStudent } from "@/lib/agent/respond";
import { isSamePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { sendText } from "@/lib/whatsapp/client";
import { parseLinkCode } from "@/lib/whatsapp/link-code";
import type { FailedStatus, InboundMessage } from "@/lib/whatsapp/payload";

const PROVIDER = "meta";

/**
 * Grava antes de processar: uma falha depois disso nao perde a mensagem.
 * skipDuplicates + o indice unico tornam o reenvio do webhook inofensivo.
 */
export async function recordInbound(messages: InboundMessage[]) {
  await prisma.messageEvent.createMany({
    skipDuplicates: true,
    data: messages.map((message) => ({
      provider: PROVIDER,
      providerMessageId: message.providerMessageId,
      direction: MessageDirection.INBOUND,
      phone: message.phone,
      whatsappUserId: message.senderId,
      body: message.body,
    })),
  });
}

export async function recordFailures(failures: FailedStatus[]) {
  for (const { providerMessageId, error } of failures) {
    await prisma.messageEvent.updateMany({
      where: { provider: PROVIDER, providerMessageId },
      data: { processingStatus: MessageProcessingStatus.FAILED, error },
    });
  }
}

async function reply(recipient: string, body: string, client?: Client | null) {
  const providerMessageId = await sendText(recipient, body);
  await prisma.messageEvent.create({
    data: {
      provider: PROVIDER,
      providerMessageId,
      direction: MessageDirection.OUTBOUND,
      whatsappUserId: recipient,
      body,
      clientId: client?.id,
      professionalId: client?.professionalId,
      processingStatus: MessageProcessingStatus.PROCESSED,
      processedAt: new Date(),
    },
  });
}

function senderIds(message: InboundMessage) {
  return [message.senderId, message.phone].filter((id) => id !== null);
}

async function linkClient(
  message: InboundMessage,
  recipient: string,
  code: string,
) {
  const client = await prisma.client.findFirst({
    where: {
      whatsappLinkCode: code,
      whatsappLinkCodeExpiresAt: { gt: new Date() },
      status: { not: ClientStatus.ARCHIVED },
    },
    include: { professional: { select: { name: true } } },
  });

  // O codigo sozinho nao basta quando a Meta informa o numero de quem enviou.
  if (!client || (message.phone && !isSamePhone(message.phone, client.phone))) {
    await reply(
      recipient,
      "Este código não é válido para este número. Peça um novo ao seu personal.",
    );
    return null;
  }

  // Um WhatsApp fala com um aluno por vez: o vinculo mais recente vale.
  const [, linked] = await prisma.$transaction([
    prisma.client.updateMany({
      where: { whatsappUserId: { in: senderIds(message) } },
      data: { whatsappUserId: null, whatsappVerifiedAt: null },
    }),
    prisma.client.update({
      where: { id: client.id },
      data: {
        whatsappUserId: recipient,
        whatsappVerifiedAt: new Date(),
        whatsappLinkCode: null,
        whatsappLinkCodeExpiresAt: null,
        messagesOptedOutAt: null,
      },
    }),
  ]);

  await reply(
    recipient,
    `Olá, ${linked.name.split(" ")[0]}! Sou o assistente de treino conectado ao seu personal, ${client.professional.name}. Sou automático, e seu personal acompanha o que você registra aqui. ${HELP}`,
    linked,
  );
  return linked;
}

async function handle(message: InboundMessage): Promise<Client | null> {
  if (message.identityChange) {
    const { from, to } = message.identityChange;
    await prisma.client.updateMany({
      where: { whatsappUserId: from },
      data: { whatsappUserId: to },
    });
    return null;
  }

  const recipient = message.senderId;
  if (!recipient) return null;

  const code = message.body ? parseLinkCode(message.body) : null;
  if (code) return linkClient(message, recipient, code);

  const client = await prisma.client.findFirst({
    where: {
      whatsappUserId: { in: senderIds(message) },
      status: { not: ClientStatus.ARCHIVED },
    },
  });

  if (!client) {
    await reply(
      recipient,
      "Não encontrei seu cadastro. Peça ao seu personal o link de vinculação.",
    );
    return null;
  }

  // Quem foi vinculado sem BSUID passa a usar o BSUID assim que ele aparecer.
  if (client.whatsappUserId !== recipient) {
    await prisma.client.update({
      where: { id: client.id },
      data: { whatsappUserId: recipient },
    });
  }

  if (message.body === null) {
    await reply(recipient, `Por enquanto só entendo texto. ${HELP}`, client);
  } else {
    await respondToStudent(
      client,
      message.body,
      `${PROVIDER}:${message.providerMessageId}`,
      (body) => reply(recipient, body, client),
    );
  }
  return client;
}

/** Processa uma vez: quem nao ganhar o claim atomico nao faz nada. */
export async function processInbound(message: InboundMessage) {
  const where = {
    provider: PROVIDER,
    providerMessageId: message.providerMessageId,
  };

  const { count } = await prisma.messageEvent.updateMany({
    where: { ...where, processingStatus: MessageProcessingStatus.RECEIVED },
    data: {
      processingStatus: MessageProcessingStatus.PROCESSING,
      attempts: { increment: 1 },
    },
  });
  if (count !== 1) return;

  try {
    const client = await handle(message);
    await prisma.messageEvent.updateMany({
      where,
      data: {
        processingStatus: MessageProcessingStatus.PROCESSED,
        processedAt: new Date(),
        clientId: client?.id,
        professionalId: client?.professionalId,
      },
    });
  } catch (error) {
    console.error("whatsapp processing failed", message.providerMessageId, error);
    await prisma.messageEvent.updateMany({
      where,
      data: {
        processingStatus: MessageProcessingStatus.FAILED,
        error: error instanceof Error ? error.message.slice(0, 500) : "unknown",
      },
    });
  }
}
