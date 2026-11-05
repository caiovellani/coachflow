import "server-only";

import { MessageDirection, type Client } from "@prisma/client";

import { systemPrompt } from "@/lib/agent/prompt";
import { AGENT_TOOLS, executeTool, type AgentContext } from "@/lib/agent/tools";
import { chatCompletion, type ChatMessage } from "@/lib/ai/client";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

const MAX_STEPS = 6;
const HISTORY_SIZE = 8;
const HISTORY_WINDOW_MS = 6 * 60 * 60 * 1000;
const MAX_REPLY_LENGTH = 4000; // limite da Meta: 4096

/** Conversa recente, sem a mensagem atual, para entender "foi no supino". */
async function recentMessages(client: Client, currentText: string) {
  const events = await prisma.messageEvent.findMany({
    where: {
      clientId: client.id,
      body: { not: null },
      receivedAt: { gte: new Date(Date.now() - HISTORY_WINDOW_MS) },
    },
    orderBy: { receivedAt: "desc" },
    take: HISTORY_SIZE,
  });

  const history = events.reverse().map(({ direction, body }) => ({
    role: direction === MessageDirection.INBOUND ? "user" : "assistant",
    content: body!,
  })) as ChatMessage[];

  const last = history.at(-1);
  if (last?.role === "user" && last.content === currentText) history.pop();
  return history;
}

/** Devolve o texto da resposta, ou null se o modelo nao concluir. */
export async function runAgent(
  client: Client,
  text: string,
  messageKey: string,
): Promise<string | null> {
  const history = await recentMessages(client, text);

  const context: AgentContext = {
    client,
    messageKey,
    latestText: text,
    studentTexts: [
      ...history.flatMap((item) =>
        item.role === "user" ? [item.content] : [],
      ),
      text,
    ],
    recorded: new Set(),
  };

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: systemPrompt(client.name.split(" ")[0], formatDate(new Date())),
    },
    ...history,
    { role: "user", content: text },
  ];

  for (let step = 0; step < MAX_STEPS; step++) {
    const reply = await chatCompletion(messages, AGENT_TOOLS);

    if (!reply.tool_calls?.length) {
      return reply.content?.trim().slice(0, MAX_REPLY_LENGTH) || null;
    }

    messages.push({
      role: "assistant",
      content: reply.content ?? null,
      tool_calls: reply.tool_calls,
    });

    for (const call of reply.tool_calls) {
      const result = await executeTool(
        context,
        call.function.name,
        call.function.arguments,
      );
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  return null;
}
