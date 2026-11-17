import { z } from "zod";
import { DECLARATION_TYPES } from "@/modules/settings/settings";

export const validationDirecteSchema = z.object({
  types: z.array(z.enum(DECLARATION_TYPES)).max(DECLARATION_TYPES.length),
});
export type ValidationDirecteInput = z.infer<typeof validationDirecteSchema>;
