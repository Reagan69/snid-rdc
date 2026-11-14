const TONES = ["bg-sky-100 text-sky-800", "bg-green-100 text-green-800", "bg-amber-100 text-amber-800", "bg-slate-200 text-slate-700", "bg-red-100 text-red-800"];
const SIZES = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-16 w-16 text-xl" } as const;

export function initialsOf(name: string): string {
  const parts = name.trim().split(/[\s.\-_]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const a = parts[0]![0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1]![0] ?? "" : "";
  return (a + b).toUpperCase();
}

/** Pastille à initiales, teinte stable par nom. `onDark` : version translucide pour le menu bleu. */
export function Avatar({ name, size = "md", onDark = false }: { name: string; size?: keyof typeof SIZES; onDark?: boolean }) {
  const tone = TONES[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % TONES.length];
  return (
    <span className={`inline-grid shrink-0 place-items-center rounded-full font-semibold ${SIZES[size]} ${onDark ? "bg-white/12 text-white" : tone}`} aria-hidden>
      {initialsOf(name)}
    </span>
  );
}
