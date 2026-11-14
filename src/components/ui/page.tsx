export function PageTitle({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight text-slate-900 md:text-[2.1rem]">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-prose text-slate-600">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/** Indicateur : un grand chiffre éditorial et son libellé. Les filets verticaux sont posés par la grille parente. */
export function Kpi({ label, value, tone }: { label: string; value: number | string | null; tone?: "attention" }) {
  if (value === null) return null;
  return (
    <div className="border-slate-200 lg:border-l lg:px-7 lg:first:border-l-0 lg:first:pl-0">
      <div className={`num text-[2.5rem] leading-none ${tone === "attention" ? "text-amber-700" : "text-slate-900"}`}>{typeof value === "number" ? value.toLocaleString("fr-FR") : value}</div>
      <div className="mt-2 text-sm text-slate-600">{label}</div>
    </div>
  );
}

/** Bloc de contenu : titre en serif, filet fin. `elevated` pour le bloc principal d'une page. */
export function Panel({ title, aside, elevated = false, children, className = "" }: { title?: string; aside?: React.ReactNode; elevated?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-6 md:p-7 ${elevated ? "shadow-panel" : ""} ${className}`}>
      {title && (
        <header className="mb-5 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-xl font-medium text-slate-900">{title}</h2>
          {aside}
        </header>
      )}
      {children}
    </section>
  );
}

/** Répartition proportionnelle. La légende en texte porte l'information : la couleur n'est qu'un renfort. */
export function StackedBar({ segments, label }: { segments: { label: string; value: number; className: string }[]; label: string }) {
  const total = segments.reduce((n, s) => n + s.value, 0);
  if (total <= 0) return null;
  return (
    <div className="mt-7">
      <div role="img" aria-label={label} className="flex h-2 gap-0.5 overflow-hidden rounded-full">
        {segments.filter((s) => s.value > 0).map((s) => <div key={s.label} className={`${s.className} first:rounded-l-full last:rounded-r-full`} style={{ width: `${(s.value / total) * 100}%` }} />)}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${s.className}`} aria-hidden />
            {s.label} <span className="font-semibold tabular-nums text-slate-800">{Math.round((s.value / total) * 100)} %</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center text-slate-600">{children}</p>;
}

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="min-w-full">
        <thead><tr className="border-b border-slate-200 bg-slate-50">{head.map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100 [&>tr:hover]:bg-slate-50">{children}</tbody>
      </table>
    </div>
  );
}
