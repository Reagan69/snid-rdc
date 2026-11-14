/** Emblème : étoile de laiton sur disque bleu fleuve, cerclé de laiton. `tone` = couleur du fond sur lequel il se pose. */
export function Brand({ compact = false, tone = "dark" }: { compact?: boolean; tone?: "dark" | "light" }) {
  const dark = tone === "dark";
  return (
    <span className="inline-flex items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-fleuve ring-1 ring-laiton" aria-hidden>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#dcc283"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
      </span>
      <span className="leading-tight">
        <span className={`block font-display text-xl font-medium tracking-tight ${dark ? "text-white" : "text-slate-900"}`}>SNID-RDC</span>
        {!compact && <span className={`block text-xs ${dark ? "text-slate-300" : "text-slate-500"}`}>Identification nationale</span>}
      </span>
    </span>
  );
}
