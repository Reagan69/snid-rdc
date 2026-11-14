import { Avatar } from "@/components/ui/avatar";
import { Niu } from "@/components/ui/niu";

/** En-tête de dossier : la personne d'abord (initiales, nom, NIU), puis le détail. */
export function CitoyenHeader({ nomComplet, niu, localisation, children }: { nomComplet: string; niu: string; localisation: string; children?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-panel md:p-7">
      <Avatar name={nomComplet} size="lg" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-3xl font-medium tracking-tight text-slate-900">{nomComplet}</h1>
        <p className="mt-1 text-sm text-slate-600">{localisation}</p>
        <p className="mt-2 text-lg"><Niu niu={niu} /></p>
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </header>
  );
}
