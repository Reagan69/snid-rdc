/** Marque : étoile du drapeau sur fond bleu + nom du système. La couleur du texte est héritée du conteneur. */
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-700" aria-hidden>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#f5c518"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
      </span>
      <span className="leading-tight">
        <span className="block font-display text-base font-semibold">SNID-RDC</span>
        {!compact && <span className="block text-xs text-slate-300">Identification nationale</span>}
      </span>
    </span>
  );
}
