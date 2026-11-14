import Link from "next/link";
import { Niu } from "@/components/ui/niu";
import { requireAuth } from "@/lib/auth";
import { listCitizens } from "@/modules/citizens/services/citizen.service";
import { listCitizensQuery } from "@/modules/citizens/schemas/citizen.schema";
import { Badge, statutTone } from "@/components/ui/badge";
import { Empty, PageTitle, Table } from "@/components/ui/page";
import { formatDateFr } from "@/lib/dates";

export const metadata = { title: "Citoyens" };
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function CitoyensPage({ searchParams }: { searchParams: SP }) {
  const ctx = await requireAuth();
  const raw = Object.fromEntries(Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const parsed = listCitizensQuery.safeParse(raw);
  const query = parsed.success ? parsed.data : listCitizensQuery.parse({});
  const { items, total, page, pageSize } = await listCitizens(ctx, query);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const link = (p: number) => `/citoyens?${new URLSearchParams({ ...(query.q ? { q: query.q } : {}), ...(query.statut ? { statut: query.statut } : {}), page: String(p) })}`;
  return (
    <>
      <PageTitle title="Citoyens" subtitle={`${total.toLocaleString("fr-FR")} dossier(s) dans votre périmètre`} />
      <form className="card mb-4 flex flex-wrap items-end gap-3" action="/citoyens">
        <div className="min-w-60 flex-1"><label className="label" htmlFor="q">Nom, postnom, prénom ou NIU</label><input id="q" name="q" defaultValue={query.q} className="field" /></div>
        <div><label className="label" htmlFor="statut">Statut</label>
          <select id="statut" name="statut" defaultValue={query.statut ?? ""} className="field"><option value="">Tous</option><option value="RESIDENT">Résident</option><option value="EN_DEPLACEMENT">En déplacement</option><option value="DECEDE">Décédé</option></select></div>
        <button className="btn btn-primary">Rechercher</button>
      </form>
      {items.length === 0 ? <Empty>Aucun dossier trouvé dans votre périmètre.</Empty> : (
        <Table head={["NIU", "Nom complet", "Naissance", "Sexe", "Commune", "Quartier · rue", "Statut"]}>
          {items.map((c) => (
            <tr key={c.id}>
              <td className="td"><Link className="underline decoration-slate-300 underline-offset-4 hover:decoration-sky-700" href={`/citoyens/${c.id}`}><Niu niu={c.niu} /></Link></td>
              <td className="td">{c.nom} {c.postnom} {c.prenom}</td>
              <td className="td">{formatDateFr(c.dateNaissance)}</td>
              <td className="td">{c.sexe}</td>
              <td className="td">{c.commune.nom}</td>
              <td className="td">{c.quartier.nom} · {c.rue.nom}</td>
              <td className="td"><Badge tone={statutTone(c.statut)}>{c.statut}</Badge></td>
            </tr>
          ))}
        </Table>
      )}
      <div className="mt-3 flex items-center justify-between text-sm">
        <span>Page {page} / {pages}</span>
        <span className="flex gap-2">
          {page > 1 && <Link className="btn" href={link(page - 1)}>Précédent</Link>}
          {page < pages && <Link className="btn" href={link(page + 1)}>Suivant</Link>}
        </span>
      </div>
    </>
  );
}
