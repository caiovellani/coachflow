import { randomUUID } from "node:crypto";

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { InboundMessage } from "@/lib/whatsapp/payload";

vi.mock("server-only", () => ({}));

const sent = vi.hoisted(() => [] as { to: string; body: string }[]);
const sendFails = vi.hoisted(() => ({ value: false }));

vi.mock("@/lib/whatsapp/client", () => ({
  sendText: async (to: string, body: string) => {
    if (sendFails.value) throw new Error("meta fora do ar");
    sent.push({ to, body });
    return `wamid.out.${sent.length}.${Math.random()}`;
  },
}));

// Precisa de um Postgres descartavel: nunca aponte para o banco real.
const url = process.env.TEST_DATABASE_URL;
if (url) process.env.DATABASE_URL = url;

describe.skipIf(!url)("mensagens recebidas", () => {
  let prisma: typeof import("@/lib/prisma").prisma;
  let inbound: typeof import("@/lib/whatsapp/inbound");
  let data: typeof import("@/lib/data/whatsapp");
  let professionalId: string;
  let clientId: string;
  let bsuid: string;

  const phone = () => `55119${String(Date.now()).slice(-8)}${sent.length % 10}`.slice(0, 13);

  const message = (body: string | null, overrides = {}): InboundMessage => ({
    providerMessageId: `wamid.${randomUUID()}`,
    senderId: bsuid,
    phone: null,
    type: "text",
    body,
    identityChange: null,
    ...overrides,
  });

  const receive = async (event: InboundMessage) => {
    await inbound.recordInbound([event]);
    await inbound.processInbound(event);
  };

  const lastReply = () => sent.at(-1)?.body ?? "";

  const newClient = async (clientPhone = `+${phone()}`) => {
    const client = await prisma.client.create({
      data: { professionalId, name: "Lucas Lima", phone: clientPhone },
    });
    await data.createLinkCode(professionalId, client.id);
    const { whatsappLinkCode } = await prisma.client.findUniqueOrThrow({
      where: { id: client.id },
    });
    return { client, code: whatsappLinkCode! };
  };

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/prisma"));
    inbound = await import("@/lib/whatsapp/inbound");
    data = await import("@/lib/data/whatsapp");

    const professional = await prisma.professional.create({
      data: {
        authUserId: randomUUID(),
        name: "Ana Souza",
        email: `${randomUUID()}@example.com`,
      },
    });
    professionalId = professional.id;
  });

  beforeEach(async () => {
    sent.length = 0;
    sendFails.value = false;
    bsuid = `BR.${randomUUID()}`;
    const { client, code } = await newClient();
    clientId = client.id;
    await receive(message(`VINCULAR ${code}`));
  });

  it("vincula pelo codigo, apresenta o assistente e limpa o codigo", async () => {
    const client = await prisma.client.findUniqueOrThrow({
      where: { id: clientId },
    });
    expect(client.whatsappUserId).toBe(bsuid);
    expect(client.whatsappVerifiedAt).not.toBeNull();
    expect(client.whatsappLinkCode).toBeNull();
    expect(lastReply()).toContain("assistente de treino");
    expect(lastReply()).toContain("Ana Souza");
    expect(lastReply()).toContain("SAIR");
  });

  it("recusa codigo vindo de outro numero", async () => {
    const { client, code } = await newClient("+5511911112222");
    bsuid = `BR.${randomUUID()}`;
    await receive(message(`VINCULAR ${code}`, { phone: "5511933334444" }));

    const unchanged = await prisma.client.findUniqueOrThrow({
      where: { id: client.id },
    });
    expect(unchanged.whatsappUserId).toBeNull();
    expect(lastReply()).toContain("não é válido");
  });

  it("aceita o numero sem o nono digito", async () => {
    const { client, code } = await newClient("+5535922223333");
    bsuid = `BR.${randomUUID()}`;
    await receive(message(`VINCULAR ${code}`, { phone: "553522223333" }));

    const linked = await prisma.client.findUniqueOrThrow({
      where: { id: client.id },
    });
    expect(linked.whatsappUserId).toBe(bsuid);
  });

  it("recusa codigo expirado", async () => {
    const { client, code } = await newClient();
    await prisma.client.update({
      where: { id: client.id },
      data: { whatsappLinkCodeExpiresAt: new Date(Date.now() - 1000) },
    });
    bsuid = `BR.${randomUUID()}`;
    await receive(message(`VINCULAR ${code}`));
    expect(lastReply()).toContain("não é válido");
  });

  it("nao revela nada a quem nao e aluno", async () => {
    bsuid = `BR.${randomUUID()}`;
    await receive(message("TREINO"));
    expect(lastReply()).toContain("Não encontrei seu cadastro");
  });

  it("webhook repetido nao gera segunda resposta nem segundo alerta", async () => {
    const event = message("HUMANO");
    await receive(event);
    const replies = sent.length;
    await receive(event);
    await Promise.all([receive(event), receive(event)]);

    expect(sent.length).toBe(replies);
    expect(await prisma.alert.count({ where: { clientId } })).toBe(1);
    expect(
      await prisma.messageEvent.count({
        where: { providerMessageId: event.providerMessageId },
      }),
    ).toBe(1);
  });

  it("falha ao responder mantem a mensagem e registra o erro", async () => {
    const event = message("TREINO");
    sendFails.value = true;
    await receive(event);

    const saved = await prisma.messageEvent.findFirstOrThrow({
      where: { providerMessageId: event.providerMessageId },
    });
    expect(saved.processingStatus).toBe("FAILED");
    expect(saved.attempts).toBe(1);
    expect(saved.error).toContain("meta fora do ar");
    expect(saved.body).toBe("TREINO");
  });

  it("SAIR e VOLTAR controlam as mensagens automaticas", async () => {
    await receive(message("sair"));
    let client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
    expect(client.messagesOptedOutAt).not.toBeNull();

    await receive(message("voltar"));
    client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
    expect(client.messagesOptedOutAt).toBeNull();
  });

  it("relato de dor vira alerta explicavel sem diagnostico", async () => {
    await receive(message("Senti dor no joelho durante o agachamento"));

    const alert = await prisma.alert.findFirstOrThrow({ where: { clientId } });
    expect(alert.type).toBe("PAIN_REPORTED");
    expect(alert.professionalId).toBe(professionalId);
    expect(alert.message).toContain("joelho");
    expect(lastReply()).toContain("avisei seu personal");
    expect(lastReply()).toContain("atendimento profissional");
  });

  it.each([
    "Meu joelho dói",
    "o ombro doi um pouco",
    "Machuquei o punho",
    "acho que torci o tornozelo",
    "DOR nas costas",
  ])("sinaliza o relato: %s", async (text) => {
    await receive(message(text));
    expect(await prisma.alert.count({ where: { clientId } })).toBe(1);
  });

  it.each([
    "Fiz o treino na esteira do condomínio",
    "Sou doido por agachamento",
    "o instrutor corrigiu minha postura",
  ])("palavra parecida nao dispara alerta: %s", async (text) => {
    await receive(message(text));
    expect(await prisma.alert.count({ where: { clientId } })).toBe(0);
  });

  it("troca de BSUID preserva o vinculo", async () => {
    const next = `BR.${randomUUID()}`;
    await receive(
      message(null, {
        senderId: null,
        type: "system",
        identityChange: { from: bsuid, to: next },
      }),
    );
    bsuid = next;
    await receive(message("TREINO"));
    expect(lastReply()).toContain("ainda não tem treino");
  });

  it("aluno sem treino recebe aviso, sem inventar nada", async () => {
    await receive(message("TREINO"));
    expect(lastReply()).toBe(
      "Você ainda não tem treino atribuído. Fale com seu personal.",
    );
  });

  it("mensagem que nao e texto recebe orientacao", async () => {
    await receive(message(null, { type: "image" }));
    expect(lastReply()).toContain("só entendo texto");
  });
});
