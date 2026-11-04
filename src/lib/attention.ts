import { daysBetween } from "@/lib/dates";

// Regras explicitas e explicaveis (ver docs/produto.md, secao 3.8).
export const NOT_STARTED_AFTER_DAYS = 3;
export const NO_RECORD_AFTER_DAYS = 7;
export const INACTIVE_AFTER_DAYS = 14;
const FREQUENCY_WINDOW_DAYS = 7;

export type AttentionInput = {
  startDate: Date;
  plannedPerWeek: number | null;
  lastSessionAt: Date | null;
  sessionsLastWeek: number;
};

export type Attention = {
  type: "NOT_STARTED" | "INACTIVITY" | "LOW_FREQUENCY";
  message: string;
  inactive: boolean;
};

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

export function evaluateAttention(
  client: AttentionInput,
  now: Date,
): Attention | null {
  const daysSinceStart = daysBetween(client.startDate, now);

  if (!client.lastSessionAt) {
    if (daysSinceStart < NOT_STARTED_AFTER_DAYS) return null;
    return {
      type: "NOT_STARTED",
      message: `ainda não registrou treino (início há ${plural(daysSinceStart, "dia")})`,
      inactive: daysSinceStart >= INACTIVE_AFTER_DAYS,
    };
  }

  const daysSinceSession = daysBetween(client.lastSessionAt, now);
  if (daysSinceSession >= NO_RECORD_AFTER_DAYS) {
    return {
      type: "INACTIVITY",
      message: `sem registro há ${plural(daysSinceSession, "dia")}`,
      inactive: daysSinceSession >= INACTIVE_AFTER_DAYS,
    };
  }

  const { plannedPerWeek, sessionsLastWeek } = client;
  if (
    plannedPerWeek &&
    daysSinceStart >= FREQUENCY_WINDOW_DAYS &&
    sessionsLastWeek < plannedPerWeek
  ) {
    return {
      type: "LOW_FREQUENCY",
      message: `${sessionsLastWeek} de ${plannedPerWeek} treinos planejados nos últimos 7 dias`,
      inactive: false,
    };
  }

  return null;
}
