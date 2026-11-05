import { z } from "zod";

import { dateInput, optionalLoad, optionalText } from "@/lib/validations/common";

const sessionItemSchema = z.object({
  exerciseId: z.string().min(1, "Escolha um exercício."),
  reps: z
    .string()
    .trim()
    .regex(/^\d{1,3}(\s*,\s*\d{1,3}){0,19}$/, "Separe por vírgula: 10, 10, 8."),
  load: optionalLoad,
});

export const sessionSchema = z.object({
  date: dateInput,
  workoutPlanId: z.string(),
  notes: optionalText(1000),
  items: z
    .array(sessionItemSchema)
    .min(1, "Adicione ao menos um exercício.")
    .max(50, "Use no máximo 50 exercícios."),
});

export type SessionInput = z.infer<typeof sessionSchema>;

/** "10, 10, 8" -> [10, 10, 8] */
export const parseReps = (reps: string) =>
  reps.split(",").map((value) => Number(value.trim()));
