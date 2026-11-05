import "server-only";

// API compativel com OpenAI: trocar de provedor e so mudar as variaveis de ambiente.
const DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const TIMEOUT_MS = 30_000;

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type ToolDefinition = {
  type: "function";
  function: { name: string; description: string; parameters: object };
};

export const isAiConfigured = () => Boolean(process.env.AI_API_KEY);

export async function chatCompletion(
  messages: ChatMessage[],
  tools: ToolDefinition[],
) {
  const baseUrl = process.env.AI_BASE_URL ?? DEFAULT_BASE_URL;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL ?? DEFAULT_MODEL,
      messages,
      tools,
      temperature: 0,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) throw new Error(`AI request failed: ${response.status}`);

  const data: {
    choices?: {
      message: { content: string | null; tool_calls?: ToolCall[] };
    }[];
  } = await response.json();

  const message = data.choices?.[0]?.message;
  if (!message) throw new Error("AI returned no message");
  return message;
}
