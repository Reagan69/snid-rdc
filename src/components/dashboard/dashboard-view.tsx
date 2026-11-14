import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Empty, Kpi, Panel, StackedBar } from "@/components/ui/page";
import { auditLabel, relativeTime } from "@/lib/audit-labels";

export interface DashboardData {
  citoyens: number | null; hommes: number | null; femmes: number | null; cartesActives: number | null;
  declarationsEnAttente: number | null; declarationsValidees: number | null; declarationsRejetees: number | null;
}
export interface ActiviteRow { id: string; username: string | null; action: string; createdAt: Date }

export function greeting(now = new Date()): string {
  const h = Number(new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Kinshasa" }).format(now));
  return h >= 18 || h < 4 ? "Bonsoir" : "Bonjour";
}
export function dateLongue(now = new Date()): string {
  const s = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Kinshasa" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function DashboardView({ k, scope, userName, activite, canCreate, canVerify, now = new Date() }: {
  k: DashboardData; scope: string; userName: string; activite: ActiviteRow[]; canCreate: boolean; canVerify: boolean; now?: Date;
}) {
  const hasPopulation = k.citoyens !== null || k.cartesActives !== null;
  const hasDeclarations = k.declarationsEnAttente !== null;
  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
        <div>
          <p className="text-sm text-slate-500">{dateLongue(now)}</p>
          <h1 className="mt-1 font-display text-3xl font-medium tracking-tight text-slate-900 md:text-[2.4rem]">{greeting(now)}, {userName}.</h1>
          <p className="mt-1.5 text-slate-600">Voici l'état de votre périmètre : {scope}.</p>
        </div>
        {(canCreate || canVerify) && (
          <div className="flex flex-wrap gap-3">
            {canCreate && <Link href="/citoyens/nouveau" className="btn btn-primary">Nouvelle identification</Link>}
            {canVerify && <Link href="/identification" className="btn">Vérifier un NIU</Link>}
          </div>
        )}
      </div>

      {!hasPopulation && !hasDeclarations && <Empty>Aucun indicateur n'est disponible pour votre profil.</Empty>}

      <div className="space-y-6">
        {hasPopulation && (
          <Panel title="Population et cartes" elevated>
            <div className="grid grid-cols-2 gap-x-6 gap-y-7 lg:grid-cols-4">
              <Kpi label="Citoyens enregistrés" value={k.citoyens} />
              <Kpi label="Hommes" value={k.hommes} />
              <Kpi label="Femmes" value={k.femmes} />
              <Kpi label="Cartes actives" value={k.cartesActives} />
            </div>
            {k.hommes !== null && k.femmes !== null && (
              <StackedBar label="Répartition des citoyens par sexe"
                segments={[{ label: "Hommes", value: k.hommes, className: "bg-sky-700" }, { label: "Femmes", value: k.femmes, className: "bg-laiton" }]} />
            )}
          </Panel>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          {hasDeclarations && (
            <Panel title="Déclarations" className={activite.length > 0 ? "lg:col-span-3" : "lg:col-span-5"}>
              <div className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-3">
                <Kpi label="En attente de décision" value={k.declarationsEnAttente} tone={k.declarationsEnAttente ? "attention" : undefined} />
                <Kpi label="Validées" value={k.declarationsValidees} />
                <Kpi label="Rejetées" value={k.declarationsRejetees} />
              </div>
              <StackedBar label="Répartition des déclarations par statut"
                segments={[
                  { label: "En attente", value: k.declarationsEnAttente ?? 0, className: "bg-laiton" },
                  { label: "Validées", value: k.declarationsValidees ?? 0, className: "bg-green-700" },
                  { label: "Rejetées", value: k.declarationsRejetees ?? 0, className: "bg-red-700" },
                ]} />
              {!!k.declarationsEnAttente && <Link href="/declarations" className="btn btn-primary mt-7">Traiter les déclarations en attente</Link>}
            </Panel>
          )}
          {activite.length > 0 && (
            <Panel title="Activité récente" className={hasDeclarations ? "lg:col-span-2" : "lg:col-span-5"}
              aside={<Link href="/audit" className="text-sm font-medium text-sky-800 underline decoration-sky-200 underline-offset-4 hover:decoration-sky-700">Journal complet</Link>}>
              <ul className="-my-2 divide-y divide-slate-100">
                {activite.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-3">
                    <Avatar name={a.username ?? "Système"} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{auditLabel(a.action)}</p>
                      <p className="truncate text-xs text-slate-500">{a.username ?? "Système"}</p>
                    </div>
                    <time className="shrink-0 text-xs text-slate-500" dateTime={a.createdAt.toISOString()}>{relativeTime(a.createdAt, now.getTime())}</time>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
