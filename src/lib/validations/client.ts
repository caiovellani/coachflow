import { z } from "zod";

import { normalizePhone } from "@/lib/phone";
import { dateInput, optionalText, requiredText } from "@/lib/validations/common";

// Sem data de nascimento: nao e necessaria ao servico (LGPD).
export const clientSchema = z.object({
  name: requiredText(100, "Informe o nome."),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => normalizePhone(value) !== null,
      "Informe o telefone com DDD.",
    ),
  email: z
    .string()
    .trim()
    .refine(
      (value) => !value || z.email().safeParse(value).success,
      "Informe um e-mail válido.",
    ),
  goal: optionalText(200),
  notes: optionalText(2000),
  plannedPerWeek: z
    .string()
    .trim()
    .regex(/^[1-7]?$/, "Informe de 1 a 7 treinos por semana."),
  startDate: dateInput,
});

export type ClientInput = z.infer<typeof clientSchema>;
