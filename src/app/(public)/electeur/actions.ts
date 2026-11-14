"use server";
import { headers } from "next/headers";
import { AppError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { checkElector } from "@/modules/elections/services/election.service";
import { verifierElecteurSchema } from "@/modules/elections/schemas/election.schema";

export type ElecteurState = {
  error?: string;
  result?: Awaited<ReturnType<typeof checkElector>>;
};

/** Contrôle d'inscription par NIU (POST, jamais d'URL) : limité en débit par IP, réponse minimale. */
export async function verifierElecteur(_prev: ElecteurState, formData: FormData): Promise<ElecteurState> {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const rl = await rateLimit(`electeur:${ip}`, 10, 60);
  if (!rl.ok) return { error: "Trop de vérifications. Réessayez dans une minute." };
  const parsed = verifierElecteurSchema.safeParse({ niu: String(formData.get("niu") ?? "") });
  if (!parsed.success) return { error: "NIU invalide (format CD-pp-cc-qq-rrrr-nnnnn)." };
  try {
    return { result: await checkElector(parsed.data.niu) };
  } catch (e) {
    if (e instanceof AppError && e.status === 404) return { error: "L'espace électeur n'est pas disponible : aucun scrutin n'est ouvert." };
    return { error: "Service momentanément indisponible." };
  }
}
