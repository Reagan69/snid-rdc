import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url(),
  ENCRYPTION_KEY: z.string().min(40),
  SIGNING_SECRET: z.string().min(16),
  CRON_SECRET: z.string().min(16).optional(),
  MFA_ENFORCE: z.enum(["true", "false"]).default("false"),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(72).default(8),
  BIOMETRICS_REAL_ENABLED: z.enum(["true", "false"]).default("false"),
});

export type Env = z.infer<typeof schema>;
let cached: Env | undefined;

/** Lecture validée, paresseuse : le build Vercel n'exige pas les secrets d'exécution. */
export function env(): Env {
  if (!cached) {
    const r = schema.safeParse(process.env);
    if (!r.success) {
      throw new Error("Configuration invalide : " + r.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join(" ; "));
    }
    cached = r.data;
  }
  return cached;
}
