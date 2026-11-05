import "server-only";

import { AlertType, MessageDirection, type Client } from "@prisma/client";

import { runAgent } from "@/lib/agent/run";
import { isAiConfigured } from "@/lib/ai/client";
import { createAlertOnce } from "@/lib/data/alerts";
import { listActiveAssignments } from "@/lib/data/workouts";
import { formatLoad } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const HELP =
  'Posso enviar seu treino: mande "TREINO". Para falar com seu personal, mande "HUMANO". Para parar as mensagens automáticas, mande "SAIR".';

const AI_UNAVAILABLE =
  'Não consegui processar sua mensagem agora, mas ela ficou registrada e vou tentar de novo. Se for urgente, mande "HUMANO".';

const AI_LIMIT_REACHED =
  'Você enviou muitas mensagens em pouco tempo. Aguarde um pouco ou mande "HUMANO".';

// Protege a cota e o custo do provedor de IA. Comandos e dor nao contam.
const AI_MESSAGES_PER_HOUR = 60;
const AI_MAX_TEXT_LENGTH = 1000;
const HOUR_MS = 60 * 60 * 1000;

// Lista provisoria ate o agente da Fase 7. \b nao funciona depois de letra acentuada.
const PAIN_REPORT =
  /(^|[^\p{L}])(dor|dores|d[óo]i|doendo|doeu|desconforto|machu[cq]\p{L}*|les[ãa]o|torci)(?![\p{L}])/iu;

export type Reply = (body: string) => Promise<void>;

async function workoutText(client: Client) {
  const assignments = await listActiveAssignments(
    client.professionalId,
    client.id,
  );
  if (assignments.length === 0) {
    return "Você ainda não tem treino atribuído. Fale com seu personal.";
  }

  return assignments
    .map(({ label, instructions, workoutPlan }) => {
      const title = [label, workoutPlan.name].filter(Boolean).join(" · ");
      const items = workoutPlan.exercises.map((item) => {
        const load = formatLoad(item.referenceLoad, item.loadUnit);
        return `${item.position}. ${item.exercise.name}: ${item.sets} × ${item.reps}${load ? ` · ${load}` : ""}`;
      });
      return [title, instructions, ...items].filter(Boolean).join("\n");
    })
    .join("\n\n");
}

/**
 * Comandos e relato de dor vem antes da IA: seguranca e opt-out nao dependem
 * do modelo estar no ar nem de ele obedecer ao prompt.
 */
export async function respondToStudent(
  client: Client,
  text: string,
  messageKey: string,
  reply: Reply,
  { notifyAiFailure = true }: { notifyAiFailure?: boolean } = {},
) {
  const command = text.trim().toUpperCase();

  if (command === "SAIR" || command === "PARAR") {
    await prisma.client.update({
      where: { id: client.id },
      data: { messagesOptedOutAt: new Date() },
    });
    return reply(
      'Pronto, você não receberá mensagens automáticas. Para voltar, mande "VOLTAR".',
    );
  }

  if (command === "VOLTAR") {
    await prisma.client.update({
      where: { id: client.id },
      data: { messagesOptedOutAt: null },
    });
    return reply("Combinado, mensagens reativadas.");
  }

  if (command === "HUMANO") {
    await createAlertOnce(
      client,
      AlertType.HUMAN_SUPPORT_REQUESTED,
      "pediu para falar com você pelo WhatsApp",
      messageKey,
    );
    return reply("Avisei seu personal, que falará com você.");
  }

  if (command === "TREINO") return reply(await workoutText(client));

  // Docs 4.7: nao diagnostica, nao trata, registra o relato e sinaliza o personal.
  if (PAIN_REPORT.test(text)) {
    await createAlertOnce(
      client,
      AlertType.PAIN_REPORTED,
      `relatou: "${text.trim().slice(0, 200)}"`,
      messageKey,
    );
    return reply(
      "Registrei seu relato e avisei seu personal. Evite continuar o movimento que causou isso até falar com ele. Se for forte ou persistir, procure atendimento profissional.",
    );
  }

  if (!isAiConfigured()) return reply(HELP);

  const recentMessages = await prisma.messageEvent.count({
    where: {
      clientId: client.id,
      direction: MessageDirection.INBOUND,
      receivedAt: { gte: new Date(Date.now() - HOUR_MS) },
    },
  });
  if (recentMessages > AI_MESSAGES_PER_HOUR) return reply(AI_LIMIT_REACHED);

  let answer: string | null;
  try {
    answer = await runAgent(
      client,
      text.slice(0, AI_MAX_TEXT_LENGTH),
      messageKey,
    );
  } catch (error) {
    // O erro segue adiante para a mensagem ficar marcada como FAILED.
    if (notifyAiFailure) await reply(AI_UNAVAILABLE);
    throw error;
  }
  return reply(answer ?? HELP);
}
