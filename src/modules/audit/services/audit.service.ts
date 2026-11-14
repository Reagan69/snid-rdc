import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { assertPermission } from "@/server/policies/guards";
import type { AuthContext, RequestMeta } from "@/types/auth";

/** Acteur minimal : permet de journaliser aussi une connexion (avant l'existence d'un AuthContext). */
export interface AuditActor {
  user: { id: string; username: string; roleCode: string };
  meta: RequestMeta;
}

type Db = PrismaClient | Prisma.TransactionClient;

export interface AuditInput {
  action: string;
  entite?: string;
  entiteId?: string;
  details?: Prisma.InputJsonValue;
}

/** Écriture obligatoire : à appeler DANS la transaction de l'opération journalisée. */
export function writeAudit(db: Db, ctx: AuditActor | null, input: AuditInput) {
  return db.journalAudit.create({
    data: {
      userId: ctx?.user.id ?? null,
      username: ctx?.user.username ?? null,
      roleCode: ctx?.user.roleCode ?? null,
      action: input.action,
      entite: input.entite ?? null,
      entiteId: input.entiteId ?? null,
      details: input.details ?? undefined,
      ip: ctx?.meta.ip ?? null,
      userAgent: ctx?.meta.userAgent ?? null,
    },
  });
}

/** Écriture au mieux (consultations) : une panne du journal ne casse pas une lecture, mais est signalée. */
export async function auditBestEffort(ctx: AuditActor | null, input: AuditInput) {
  try {
    await writeAudit(prisma, ctx, input);
  } catch (e) {
    logger.error("Échec d'écriture du journal d'audit", { action: input.action, error: String(e) });
  }
}

export async function listAudit(ctx: AuthContext, filters: { action?: string; username?: string; take?: number }) {
  assertPermission(ctx, "audit:read");
  // Le journal est national : seuls ADMIN et AUDITEUR (périmètre NATIONAL) détiennent audit:read.
  return prisma.journalAudit.findMany({
    where: {
      ...(filters.action ? { action: { contains: filters.action, mode: "insensitive" } } : {}),
      ...(filters.username ? { username: { contains: filters.username, mode: "insensitive" } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(filters.take ?? 100, 500),
  });
}
