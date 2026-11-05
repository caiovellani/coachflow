import { z } from "zod";

import { requiredText } from "@/lib/validations/common";

export const profileSchema = z.object({
  name: requiredText(100, "Informe seu nome."),
});

export type ProfileInput = z.infer<typeof profileSchema>;
