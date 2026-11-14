import { timingSafeEqual } from "node:crypto";
import { json, withPublicApi } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { toDate, todayIso } from "@/lib/dates";

// Tâche planifiée (vercel.json) : Vercel envoie « Authorization: Bearer $CRON_SECRET ».
export const GET = withPublicApi({ rate: { limit: 5, windowSec: 60 }, csrf: false }, async ({ req }) => {
  const secret = env().CRON_SECRET;
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  if (!secret || given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    throw new AppError(401, "UNAUTHORIZED", "Non autorisé.");
  }
  const limite = new Date(Date.now() - 7 * 86_400_000);
  const sessions = await prisma.session.deleteMany({ where: { OR: [{ expiresAt: { lt: limite } }, { revokedAt: { lt: limite } }] } });
  const cartes = await prisma.carteIdentite.updateMany({ where: { statut: "ACTIVE", dateExpiration: { lt: toDate(todayIso()) } }, data: { statut: "EXPIREE" } });
  logger.info("Purge planifiée", { sessionsSupprimees: sessions.count, cartesExpirees: cartes.count });
  return json({ sessionsSupprimees: sessions.count, cartesExpirees: cartes.count });
});
