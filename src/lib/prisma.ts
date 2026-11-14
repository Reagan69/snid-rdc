import { PrismaClient } from "@prisma/client";

// Une instance par environnement d'exécution. En développement, on la mémorise pour survivre au rechargement à chaud.
// Sur Vercel : DATABASE_URL doit pointer vers la connexion POOLÉE (PgBouncer) avec connection_limit=1.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient({ log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
