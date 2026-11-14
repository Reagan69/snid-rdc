const TONES = {
  slate: "bg-slate-100 text-slate-700",
  green: "bg-green-100 text-green-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
  sky: "bg-sky-100 text-sky-800",
} as const;

export function Badge({ tone = "slate", children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${TONES[tone]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}

export function statutTone(s: string): keyof typeof TONES {
  if (["VALIDEE", "ACTIVE", "RESIDENT", "COMPLET"].includes(s)) return "green";
  if (["EN_ATTENTE", "EN_DEPLACEMENT", "EXPIREE"].includes(s)) return "amber";
  if (["REJETEE", "REVOQUEE", "DECEDE"].includes(s)) return "red";
  return "slate";
}
