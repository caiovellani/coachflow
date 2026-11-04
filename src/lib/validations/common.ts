import { z } from "zod";

export const optionalText = (max: number) =>
  z.string().trim().max(max, `Use no máximo ${max} caracteres.`);

export const requiredText = (max: number, message: string) =>
  optionalText(max).min(1, message);

export const dateInput = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.")
  .refine(
    (value) => !Number.isNaN(Date.parse(value)),
    "Informe uma data válida.",
  );

/** Vazio ou decimal com ate 2 casas; aceita virgula. */
export const optionalLoad = z
  .string()
  .trim()
  .regex(/^(\d{1,5}([.,]\d{1,2})?)?$/, "Use um número, como 60 ou 12,5.");

export const parseLoad = (value: string) =>
  value ? value.replace(",", ".") : null;
