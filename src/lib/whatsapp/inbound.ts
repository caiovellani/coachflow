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

export const MAX_ATTEMPTS = 3;
const RETRY_BATCH_SIZE = 20;
const MINUTE_MS = 60 * 1000;
const RETRY_DELAY_MS = MINUTE_MS;
const STUCK_AFTER_MS = 10 * MINUTE_MS;
// Fora da janela de 24h da Meta, responder exigiria template.
const RETRY_WINDOW_MS = 23 * 60 * MINUTE_MS;

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

const greeting = (firstName: string, coachName: string) =>
  `Olá, ${firstName}! Sou o assistente de treino conectado ao seu personal, ${coachName}. Sou automático, e seu personal acompanha o que você registra aqui. ${HELP}`;

async function linkClient(
  message: InboundMessage,
  recipient: string,
  code: string,
  isRetry: boolean,
) {
  // No reenvio o codigo ja foi consumido: so faltou a saudacao.
  if (isRetry) {
    const linked = await prisma.client.findFirst({
      where: { whatsappUserId: recipient, whatsappVerifiedAt: { not: null } },
      include: { professional: { select: { name: true } } },
    });
    if (linked) {
      await reply(
        recipient,
        greeting(linked.name.split(" ")[0], linked.professional.name),
        linked,
      );
      return linked;
    }
  }

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
    greeting(linked.name.split(" ")[0], client.professional.name),
    linked,
  );
  return linked;
}

async function handle(
  message: InboundMessage,
  isRetry: boolean,
): Promise<Client | null> {
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
  if (code) return linkClient(message, recipient, code, isRetry);

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
      { notifyAiFailure: !isRetry },
    );
  }
  return client;
}

async function run(message: InboundMessage, isRetry: boolean) {
  const where = {
    provider: PROVIDER,
    providerMessageId: message.providerMessageId,
  };

  try {
    const client = await handle(message, isRetry);
    await prisma.messageEvent.updateMany({
      where,
      data: {
        processingStatus: MessageProcessingStatus.PROCESSED,
        processedAt: new Date(),
        error: null,
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

/** Processa uma vez: quem nao ganhar o claim atomico nao faz nada. */
export async function processInbound(message: InboundMessage) {
  const { count } = await prisma.messageEvent.updateMany({
    where: {
      provider: PROVIDER,
      providerMessageId: message.providerMessageId,
      processingStatus: MessageProcessingStatus.RECEIVED,
    },
    data: {
      processingStatus: MessageProcessingStatus.PROCESSING,
      attempts: { increment: 1 },
      lastAttemptAt: new Date(),
    },
  });
  if (count === 1) await run(message, false);
}

/**
 * Retoma mensagens que falharam ou ficaram paradas. Repetir e seguro: alertas e
 * exercicios tem chave por mensagem. Sistema e midia (sem texto) nao entram.
 */
export async function retryPendingMessages(now: Date) {
  const before = (ms: number) => new Date(now.getTime() - ms);

  const pending = await prisma.messageEvent.findMany({
    where: {
      provider: PROVIDER,
      direction: MessageDirection.INBOUND,
      body: { not: null },
      attempts: { lt: MAX_ATTEMPTS },
      receivedAt: { gte: before(RETRY_WINDOW_MS) },
      OR: [
        {
          processingStatus: MessageProcessingStatus.FAILED,
          lastAttemptAt: { lt: before(RETRY_DELAY_MS) },
        },
        {
          processingStatus: MessageProcessingStatus.PROCESSING,
          lastAttemptAt: { lt: before(STUCK_AFTER_MS) },
        },
        {
          processingStatus: MessageProcessingStatus.RECEIVED,
          receivedAt: { lt: before(STUCK_AFTER_MS) },
        },
      ],
    },
    orderBy: { receivedAt: "asc" },
    take: RETRY_BATCH_SIZE,
  });

  let retried = 0;
  for (const event of pending) {
    // Mesmos status e tentativas de quando lemos: so um processo vence.
    const { count } = await prisma.messageEvent.updateMany({
      where: {
        id: event.id,
        processingStatus: event.processingStatus,
        attempts: event.attempts,
      },
      data: {
        processingStatus: MessageProcessingStatus.PROCESSING,
        attempts: { increment: 1 },
        lastAttemptAt: now,
      },
    });
    if (count !== 1) continue;

    retried += 1;
    await run(
      {
        providerMessageId: event.providerMessageId,
        senderId: event.whatsappUserId,
        phone: event.phone,
        type: "text",
        body: event.body,
        identityChange: null,
      },
      true,
    );
  }
  return retried;
}
