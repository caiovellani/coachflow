import { z } from "zod";

import {
  optionalLoad,
  optionalText,
  requiredText,
} from "@/lib/validations/common";

const workoutItemSchema = z.object({
  exerciseId: z.string().min(1, "Escolha um exercício."),
  sets: z
    .string()
    .trim()
    .regex(/^[1-9]\d?$/, "De 1 a 99."),
  reps: z
    .string()
    .trim()
    .regex(/^\d{1,3}(-\d{1,3})?$/, "Use 10 ou 8-12."),
  referenceLoad: optionalLoad,
  restSeconds: z
    .string()
    .trim()
    .regex(/^\d{0,4}$/, "Use segundos."),
  notes: optionalText(500),
});

export const workoutSchema = z.object({
  name: requiredText(100, "Informe o nome do treino."),
  description: optionalText(1000),
  items: z.array(workoutItemSchema).min(1, "Adicione ao menos um exercício."),
});

export const assignmentSchema = z.object({
  workoutPlanId: z.string().min(1, "Escolha um treino."),
  label: optionalText(20),
  instructions: optionalText(1000),
});

export type WorkoutInput = z.infer<typeof workoutSchema>;
export type AssignmentInput = z.infer<typeof assignmentSchema>;
