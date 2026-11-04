import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { isSamePhone } from "@/lib/phone";
import { generateLinkCode, parseLinkCode } from "@/lib/whatsapp/link-code";
import { parseWebhook } from "@/lib/whatsapp/payload";
import { isValidSignature } from "@/lib/whatsapp/signature";

const sign = (body: string, secret: string) =>
  `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

const webhook = (value: object, phoneNumberId = "PN1") => ({
  object: "whatsapp_business_account",
  entry: [
    {
      id: "1",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: { phone_number_id: phoneNumberId },
            ...value,
          },
        },
      ],
    },
  ],
});

describe("isValidSignature", () => {
  it("aceita assinatura do corpo cru", () => {
    expect(isValidSignature('{"a":1}', sign('{"a":1}', "s"), "s")).toBe(true);
  });

  it.each([
    ["segredo errado", sign('{"a":1}', "outro")],
    ["corpo reserializado", sign('{"a": 1}', "s")],
    ["sem prefixo", sign('{"a":1}', "s").replace("sha256=", "")],
    ["vazia", ""],
    ["ausente", null],
  ])("recusa %s", (_case, header) => {
    expect(isValidSignature('{"a":1}', header, "s")).toBe(false);
  });
});

describe("parseWebhook", () => {
  it("le mensagem com BSUID e telefone", () => {
    const events = parseWebhook(
      webhook({
        contacts: [{ wa_id: "5511988887777", user_id: "BR.123" }],
        messages: [
          {
            from: "5511988887777",
            from_user_id: "BR.123",
            id: "wamid.1",
            timestamp: "1",
            type: "text",
            text: { body: "oi" },
          },
        ],
      }),
      "PN1",
    );
    expect(events?.messages[0]).toMatchObject({
      providerMessageId: "wamid.1",
      senderId: "BR.123",
      phone: "5511988887777",
      body: "oi",
    });
  });

  it("aceita mensagem sem telefone (usuario com username)", () => {
    const events = parseWebhook(
      webhook({
        contacts: [{ user_id: "BR.123" }],
        messages: [{ from_user_id: "BR.123", id: "w", type: "text", text: { body: "oi" } }],
      }),
      "PN1",
    );
    expect(events?.messages[0]).toMatchObject({ senderId: "BR.123", phone: null });
  });

  it("usa o telefone quando nao vem BSUID", () => {
    const events = parseWebhook(
      webhook({
        contacts: [{ wa_id: "5511988887777" }],
        messages: [{ from: "5511988887777", id: "w", type: "text", text: { body: "oi" } }],
      }),
      "PN1",
    );
    expect(events?.messages[0].senderId).toBe("5511988887777");
  });

  it("le troca de BSUID", () => {
    const events = parseWebhook(
      webhook({
        messages: [
          {
            id: "w",
            type: "system",
            system: {
              type: "user_changed_user_id",
              user_id: "BR.novo",
              previous_user_id: "BR.velho",
            },
          },
        ],
      }),
      "PN1",
    );
    expect(events?.messages[0].identityChange).toEqual({
      from: "BR.velho",
      to: "BR.novo",
    });
  });

  it("guarda so entregas com falha", () => {
    const events = parseWebhook(
      webhook({
        statuses: [
          { id: "a", status: "delivered" },
          { id: "b", status: "failed", errors: [{ code: 131047, title: "Janela" }] },
        ],
      }),
      "PN1",
    );
    expect(events?.failures).toEqual([
      { providerMessageId: "b", error: "131047: Janela" },
    ]);
  });

  it("ignora evento de outro numero", () => {
    const events = parseWebhook(
      webhook({ messages: [{ id: "w", type: "text" }] }, "OUTRO"),
      "PN1",
    );
    expect(events?.messages).toEqual([]);
  });

  it("recusa formato desconhecido", () => {
    expect(parseWebhook({ object: "page" }, "PN1")).toBeNull();
  });
});

describe("isSamePhone", () => {
  it("tolera o nono digito no Brasil", () => {
    expect(isSamePhone("+5535998887777", "553598887777")).toBe(true);
  });

  it("nao confunde numeros diferentes", () => {
    expect(isSamePhone("+5535998887777", "553598887776")).toBe(false);
    expect(isSamePhone("+5511999998888", "+5521999998888")).toBe(false);
  });

  it("nao aplica a regra fora do Brasil", () => {
    expect(isSamePhone("+14155552671", "+1415552671")).toBe(false);
  });
});

describe("codigo de vinculo", () => {
  it("le o codigo em qualquer caixa", () => {
    expect(parseLinkCode("vincular abcd2345")).toBe("ABCD2345");
    expect(parseLinkCode("Oi! VINCULAR ABCD2345 obrigado")).toBe("ABCD2345");
  });

  it("ignora texto sem codigo", () => {
    expect(parseLinkCode("quero vincular meu treino")).toBeNull();
  });

  it("gera codigo legivel pelo parser", () => {
    const code = generateLinkCode();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(parseLinkCode(`VINCULAR ${code}`)).toBe(code);
  });
});
