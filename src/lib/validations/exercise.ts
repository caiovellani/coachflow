import { z } from "zod";

import { optionalText, requiredText } from "@/lib/validations/common";

export const exerciseSchema = z.object({
  name: requiredText(100, "Informe o nome do exercício."),
  muscleGroup: optionalText(60),
  equipment: optionalText(60),
  description: optionalText(2000),
  notes: optionalText(2000),
});

export type ExerciseInput = z.infer<typeof exerciseSchema>;
