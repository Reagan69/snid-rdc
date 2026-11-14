import { json, withPublicApi } from "@/lib/http";
import { prisma } from "@/lib/prisma";

// Supervision (UptimeRobot, Vercel Checks…) : ne révèle ni version, ni configuration, ni données.
export const GET = withPublicApi({ rate: { limit: 30, windowSec: 60 }, csrf: false }, async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return json({ status: "ok" });
  } catch {
    return json({ status: "degraded" }, 503);
  }
});
