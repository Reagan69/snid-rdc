import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";
import { getPublishedResults } from "@/modules/elections/services/resultat.service";
import { TYPE_LABELS, type TypeScrutin } from "@/modules/elections/rules";
import { Empty } from "@/components/ui/page";
import { ResultsTable } from "@/components/ui/results-table";

export const metadata = { title: "Résultats du vote" };
export const dynamic = "force-dynamic";

export default async function ResultatsPage() {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const rl = await rateLimit(`resultats:${ip}`, 30, 60);
  const data = rl.ok ? await getPublishedResults() : null;
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-xl font-bold text-sky-800">Résultats du vote</h1>
      {!data && <p className="text-sm text-amber-700">Trop de requêtes. Réessayez dans une minute.</p>}
      {data && data.length === 0 && <Empty>Aucun résultat publié pour le moment.</Empty>}
      {data?.map(({ scrutin, circonscriptions }) => (
        <section key={scrutin.id} className="space-y-3">
          <h2 className="font-semibold">{scrutin.libelle} <span className="text-sm font-normal text-slate-500">· {TYPE_LABELS[scrutin.type as TypeScrutin]}</span></h2>
          {circonscriptions.map((t) => <ResultsTable key={t.circonscriptionId} t={t} />)}
        </section>
      ))}
      <p className="text-xs text-slate-500">Résultats publiés par circonscription après vérification de la CENI.</p>
    </main>
  );
}
