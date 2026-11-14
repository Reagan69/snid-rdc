import { requireAuth } from "@/lib/auth";
import { getMyResults } from "@/modules/elections/services/resultat.service";
import { Empty, PageTitle } from "@/components/ui/page";
import { ResultsTable } from "@/components/ui/results-table";

export const metadata = { title: "Mes résultats" };

export default async function MesResultatsPage() {
  const ctx = await requireAuth();
  const r = await getMyResults(ctx);
  return (
    <>
      <PageTitle title="Mes résultats" subtitle={`Candidature ${r.candidature.numero} · ${r.scrutin.code} — ${r.scrutin.libelle}`} />
      {r.scrutin.statut !== "CLOS" ? (
        <Empty>Les résultats seront consultables après la clôture du scrutin et leur publication par la CENI.</Empty>
      ) : r.circonscriptions.length === 0 ? (
        <Empty>Les résultats ne sont pas encore publiés.</Empty>
      ) : (
        <div className="space-y-3">{r.circonscriptions.map((t) => <ResultsTable key={t.circonscriptionId} t={t} />)}</div>
      )}
    </>
  );
}
