// Limitation de débit à fenêtre fixe. Redis REST (Upstash / Vercel Marketplace) si configuré : partagé entre toutes les
// instances serverless. Sinon repli en mémoire (par instance : suffisant en développement, insuffisant en production).
import { logger } from "@/lib/logger";

export interface RateResult {
  ok: boolean;
  remaining: number;
  retryAfter: number;
}

const memory = new Map<string, { count: number; reset: number }>();
let warned = false;

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateResult> {
  const cfg = redisConfig();
  if (!cfg) {
    if (process.env.NODE_ENV === "production" && !warned) {
      warned = true;
      logger.warn("Limitation de débit en mémoire : configurez UPSTASH_REDIS_REST_URL / TOKEN en production.");
    }
    const now = Date.now();
    const cur = memory.get(key);
    if (!cur || cur.reset <= now) {
      memory.set(key, { count: 1, reset: now + windowSec * 1000 });
      return { ok: true, remaining: limit - 1, retryAfter: 0 };
    }
    cur.count++;
    return { ok: cur.count <= limit, remaining: Math.max(0, limit - cur.count), retryAfter: Math.ceil((cur.reset - now) / 1000) };
  }
  try {
    const res = await fetch(`${cfg.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify([["INCR", key], ["EXPIRE", key, windowSec, "NX"], ["TTL", key]]),
      cache: "no-store",
    });
    const data = (await res.json()) as { result: number }[];
    const count = Number(data[0]?.result ?? 0);
    const ttl = Math.max(0, Number(data[2]?.result ?? windowSec));
    return { ok: count <= limit, remaining: Math.max(0, limit - count), retryAfter: ttl };
  } catch (e) {
    // Disponibilité d'abord : une panne Redis ne doit pas bloquer tout le service. L'incident est journalisé.
    logger.error("Redis indisponible pour la limitation de débit", { error: String(e) });
    return { ok: true, remaining: limit, retryAfter: 0 };
  }
}
