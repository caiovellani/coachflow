// MVP com publico no Brasil: fuso unico, sem horario de verao desde 2019.
const TIME_ZONE = "America/Sao_Paulo";
const UTC_OFFSET = "-03:00";

const DAY_KEY = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const DISPLAY_DATE = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Dia civil no Brasil, no formato do input date: "2026-11-04". */
export function toDateInput(date: Date): string {
  return DAY_KEY.format(date);
}

/** Meio-dia local: a data nao muda de dia em nenhuma conversao de fuso. */
export function fromDateInput(value: string): Date {
  return new Date(`${value}T12:00:00${UTC_OFFSET}`);
}

export function startOfDay(date: Date): Date {
  return new Date(`${toDateInput(date)}T00:00:00${UTC_OFFSET}`);
}

export function formatDate(date: Date): string {
  return DISPLAY_DATE.format(date);
}

/** Dias civis completos entre duas datas. */
export function daysBetween(from: Date, to: Date): number {
  const day = 24 * 60 * 60 * 1000;
  return Math.round(
    (startOfDay(to).getTime() - startOfDay(from).getTime()) / day,
  );
}
