import "server-only";

import { AlertType, type Client } from "@prisma/client";

import { runAgent } from "@/lib/agent/run";
import { isAiConfigured } from "@/lib/ai/client";
import { listActiveAssignments } from "@/lib/data/workouts";
import { formatLoad } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const HELP =
  'Posso enviar seu treino: mande "TREINO". Para falar com seu personal, mande "HUMANO". Para parar as mensagens automáticas, mande "SAIR".';

const AI_UNAVAILABLE =
  'Não consegui processar sua mensagem agora. Ela ficou registrada; tente de novo em instantes ou mande "HUMANO".';

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

async function createAlert(client: Client, type: AlertType, message: string) {
  await prisma.alert.create({
    data: {
      professionalId: client.professionalId,
      clientId: client.id,
      type,
      message,
    },
  });
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
    await createAlert(
      client,
      AlertType.HUMAN_SUPPORT_REQUESTED,
      "pediu para falar com você pelo WhatsApp",
    );
    return reply("Avisei seu personal, que falará com você.");
  }

  if (command === "TREINO") return reply(await workoutText(client));

  // Docs 4.7: nao diagnostica, nao trata, registra o relato e sinaliza o personal.
  if (PAIN_REPORT.test(text)) {
    await createAlert(
      client,
      AlertType.PAIN_REPORTED,
      `relatou: "${text.trim().slice(0, 200)}"`,
    );
    return reply(
      "Registrei seu relato e avisei seu personal. Evite continuar o movimento que causou isso até falar com ele. Se for forte ou persistir, procure atendimento profissional.",
    );
  }

  if (!isAiConfigured()) return reply(HELP);

  let answer: string | null;
  try {
    answer = await runAgent(client, text, messageKey);
  } catch (error) {
    // O erro segue adiante para a mensagem ficar marcada como FAILED.
    await reply(AI_UNAVAILABLE);
    throw error;
  }
  return reply(answer ?? HELP);
}
