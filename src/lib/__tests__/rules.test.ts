import { describe, expect, it } from "vitest";

import { evaluateAttention } from "@/lib/attention";
import { daysBetween, fromDateInput, startOfDay, toDateInput } from "@/lib/dates";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { safeNextPath } from "@/lib/safe-next-path";

const now = new Date("2026-11-20T15:00:00-03:00");
const daysAgo = (days: number) =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

const client = (overrides = {}) => ({
  startDate: daysAgo(30),
  plannedPerWeek: null,
  lastSessionAt: daysAgo(1),
  sessionsLastWeek: 1,
  ...overrides,
});

describe("normalizePhone", () => {
  it.each([
    ["(11) 99999-8888", "+5511999998888"],
    ["11 3333-4444", "+551133334444"],
    ["011999998888", "+5511999998888"],
    ["5511999998888", "+5511999998888"],
    ["+55 11 99999-8888", "+5511999998888"],
    ["+1 415 555 2671", "+14155552671"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["", "abc", "99999-8888", "123", "+0123456789"])(
    "recusa %s",
    (input) => {
      expect(normalizePhone(input)).toBeNull();
    },
  );

  it("formata para leitura", () => {
    expect(formatPhone("+5511999998888")).toBe("+55 (11) 99999-8888");
    expect(formatPhone("+14155552671")).toBe("+14155552671");
  });
});

describe("evaluateAttention", () => {
  it("nao sinaliza aluno em dia", () => {
    expect(evaluateAttention(client(), now)).toBeNull();
  });

  it("da 3 dias para o aluno novo comecar", () => {
    const fresh = { startDate: daysAgo(2), lastSessionAt: null };
    expect(evaluateAttention(client(fresh), now)).toBeNull();

    const late = { startDate: daysAgo(3), lastSessionAt: null };
    expect(evaluateAttention(client(late), now)?.type).toBe("NOT_STARTED");
  });

  it("explica a inatividade em dias", () => {
    const result = evaluateAttention(
      client({ lastSessionAt: daysAgo(7) }),
      now,
    );
    expect(result).toMatchObject({
      type: "INACTIVITY",
      message: "sem registro há 7 dias",
      inactive: false,
    });
  });

  it("considera inativo a partir de 14 dias", () => {
    const result = evaluateAttention(
      client({ lastSessionAt: daysAgo(14) }),
      now,
    );
    expect(result?.inactive).toBe(true);
  });

  it("compara frequencia realizada com a planejada", () => {
    const result = evaluateAttention(
      client({ plannedPerWeek: 3, sessionsLastWeek: 1 }),
      now,
    );
    expect(result?.message).toBe("1 de 3 treinos planejados nos últimos 7 dias");
  });

  it("nao cobra frequencia na primeira semana", () => {
    const result = evaluateAttention(
      client({ startDate: daysAgo(3), plannedPerWeek: 3 }),
      now,
    );
    expect(result).toBeNull();
  });

  it("sem meta definida nao ha alerta de frequencia", () => {
    expect(evaluateAttention(client({ sessionsLastWeek: 0 }), now)).toBeNull();
  });
});

describe("datas no fuso do Brasil", () => {
  it("23h em Sao Paulo ainda e o mesmo dia, embora ja seja amanha em UTC", () => {
    const late = new Date("2026-11-21T02:00:00Z");
    expect(toDateInput(late)).toBe("2026-11-20");
  });

  it("data do formulario nao muda de dia", () => {
    expect(toDateInput(fromDateInput("2026-11-20"))).toBe("2026-11-20");
  });

  it("inicio do dia usa o fuso local", () => {
    expect(startOfDay(now).toISOString()).toBe("2026-11-20T03:00:00.000Z");
  });

  it("conta dias civis", () => {
    const yesterdayNight = new Date("2026-11-19T23:30:00-03:00");
    expect(daysBetween(yesterdayNight, now)).toBe(1);
  });
});

describe("safeNextPath", () => {
  it.each([
    ["/clients?status=ACTIVE", "/clients?status=ACTIVE"],
    ["//evil.com", "/dashboard"],
    ["/.//evil.com", "/dashboard"],
    ["/..//evil.com", "/dashboard"],
    ["/a/..//evil.com", "/dashboard"],
    ["/\\evil.com", "/dashboard"],
    ["https://evil.com", "/dashboard"],
    [null, "/dashboard"],
  ])("%s -> %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});
