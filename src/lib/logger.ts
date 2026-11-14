// Journaux JSON sur la sortie standard (collectés par Vercel Logs). Aucune donnée sensible.
const SENSITIVE = /pass|secret|token|hash|authorization|cookie|totp|key/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, SENSITIVE.test(k) ? "[masqué]" : redact(v, depth + 1)]),
  );
}

type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, message: string, context?: Record<string, unknown>) {
  const line = JSON.stringify({ level, time: new Date().toISOString(), message, ...(context ? (redact(context) as object) : {}) });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (m: string, c?: Record<string, unknown>) => process.env.NODE_ENV !== "production" && emit("debug", m, c),
  info: (m: string, c?: Record<string, unknown>) => emit("info", m, c),
  warn: (m: string, c?: Record<string, unknown>) => emit("warn", m, c),
  error: (m: string, c?: Record<string, unknown>) => emit("error", m, c),
};
