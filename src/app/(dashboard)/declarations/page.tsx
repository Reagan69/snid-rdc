import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { can } from "@/modules/roles/permissions";
import { listDeclarations } from "@/modules/declarations/services/declaration.service";
import { listDeclarationsQuery } from "@/modules/declarations/schemas/declaration.schema";
import { Badge, statutTone } from "@/components/ui/badge";
import { Empty, PageTitle } from "@/components/ui/page";
import { DecisionPanel } from "@/components/forms/decision-panel";
import { DeclarationForm } from "@/components/forms/declaration-form";
import { formatDateFr } from "@/lib/dates";

export const metadata = { title: "Déclarations" };
type SP = Promise<Record<string, string | string[] | undefined>>;

function resume(donnees: unknown): string {
  const d = donnees as { personne?: { nom?: string; prenom?: string }; niu?: string };
  return d.personne ? `${d.personne.prenom ?? ""} ${d.personne.nom ?? ""}`.trim() : (d.niu ?? "—");
}

export default async function DeclarationsPage({ searchParams }: { searchParams: SP }) {
  const ctx = await requireAuth();
  const raw = Object.fromEntries(Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const parsed = listDeclarationsQuery.safeParse(raw);
  const { items, total, page, pageSize } = await listDeclarations(ctx, parsed.success ? parsed.data : listDeclarationsQuery.parse({}));
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const canCreate = can(ctx.user.roleCode, "declarations:create");
  return (
    <>
      <PageTitle title="Déclarations" subtitle={`${total.toLocaleString("fr-FR")} déclaration(s) dans votre périmètre`}>
        <form action="/declarations" className="flex gap-2">
          <select name="statut" defaultValue={parsed.success ? (parsed.data.statut ?? "") : ""} className="field" aria-label="Statut"><option value="">Tous</option><option value="EN_ATTENTE">En attente</option><option value="VALIDEE">Validées</option><option value="REJETEE">Rejetées</option></select>
          <button className="btn">Filtrer</button>
        </form>
      </PageTitle>
      {canCreate && <div className="mb-4"><DeclarationForm types={["IDENTIFICATION", "NAISSANCE", "DECES", "DEPART", "ARRIVEE"]} /></div>}
      {items.length === 0 ? <Empty>Aucune déclaration.</Empty> : (
        <div className="space-y-3">
          {items.map((d) => (
            <article key={d.id} className="card space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><span className="font-mono text-sm">{d.numero}</span> · <b>{d.type}</b> · {resume(d.donnees)}</div>
                <div className="flex items-center gap-2">
                  {d.approbations.some((a) => a.roleCode === "CHEF_RUE") && <Badge tone="amber">Validation directe</Badge>}
                  <Badge tone={statutTone(d.statut)}>{d.statut}</Badge>
                </div>
              </div>
              <p className="text-xs text-slate-500">Déposée le {formatDateFr(d.createdAt)} par {d.auteur.nomComplet} · {d.quartier.nom} · {d.rue.nom}{d.approbations.length ? ` · approuvée par : ${d.approbations.map((a) => a.roleCode).join(", ")}` : ""}</p>
              {d.motifRejet && <p className="text-sm text-red-700">Motif du rejet : {d.motifRejet}</p>}
              {d.aMonTour && <DecisionPanel id={d.id} />}
            </article>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center justify-between text-sm">
        <span>Page {page} / {pages}</span>
        <span className="flex gap-2">
          {page > 1 && <Link className="btn" href={`/declarations?page=${page - 1}`}>Précédent</Link>}
          {page < pages && <Link className="btn" href={`/declarations?page=${page + 1}`}>Suivant</Link>}
        </span>
      </div>
    </>
  );
}
