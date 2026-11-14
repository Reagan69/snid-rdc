import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1).max(60),
  password: z.string().min(1).max(128),
  totp: z.string().trim().regex(/^\d{6}$/, "Code à 6 chiffres").optional(),
});
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(1).max(128) });
export const mfaEnableSchema = z.object({ code: z.string().trim().regex(/^\d{6}$/, "Code à 6 chiffres") });
