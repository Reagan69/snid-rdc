export function PageTitle({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 md:text-[1.75rem]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-prose text-slate-600">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/** Indicateur : un chiffre et son libellé, séparés du reste par un filet (pas de cadre). */
export function Kpi({ label, value, tone }: { label: string; value: number | string | null; tone?: "attention" }) {
  if (value === null) return null;
  return (
    <div className="border-t border-slate-300 pt-3">
      <div className={`font-display text-3xl font-semibold tabular-nums ${tone === "attention" ? "text-amber-700" : "text-slate-900"}`}>{typeof value === "number" ? value.toLocaleString("fr-FR") : value}</div>
      <div className="mt-0.5 text-sm text-slate-600">{label}</div>
    </div>
  );
}

/** Bloc thématique d'une page de synthèse : titre, contenu, filet supérieur. */
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-9">
      <h2 className="mb-4 font-display text-lg font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

/** Répartition proportionnelle. La légende en texte porte l'information : la couleur n'est qu'un renfort. */
export function StackedBar({ segments, label }: { segments: { label: string; value: number; className: string }[]; label: string }) {
  const total = segments.reduce((n, s) => n + s.value, 0);
  if (total <= 0) return null;
  return (
    <div className="mt-5">
      <div role="img" aria-label={label} className="flex h-2.5 overflow-hidden rounded-full bg-slate-200">
        {segments.filter((s) => s.value > 0).map((s) => <div key={s.label} className={s.className} style={{ width: `${(s.value / total) * 100}%` }} />)}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${s.className}`} aria-hidden />
            {s.label} : <span className="font-semibold tabular-nums text-slate-800">{Math.round((s.value / total) * 100)} %</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-600">{children}</p>;
}

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-100"><tr>{head.map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100 [&>tr:hover]:bg-sky-50">{children}</tbody>
      </table>
    </div>
  );
}
