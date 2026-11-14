import { Badge } from "@/components/ui/badge";

export interface ResultTable {
  circonscriptionId: string;
  circonscription: string;
  province: string;
  sieges: number;
  inscrits: number | null;
  votants: number | null;
  nuls: number | null;
  publie: boolean;
  resultats: { candidatureId: string; candidat: string; parti: string | null; voix: number; rang: number }[];
}

const nf = (n: number | null) => (n === null ? "—" : n.toLocaleString("fr-FR"));

/** Résultats d'une circonscription : affichage seul (composant serveur, aucune donnée sensible). */
export function ResultsTable({ t, showStatus = false }: { t: ResultTable; showStatus?: boolean }) {
  const taux = t.inscrits && t.votants !== null ? `${((t.votants / t.inscrits) * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %` : "—";
  return (
    <article className="card space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{t.circonscription} <span className="text-sm font-normal text-slate-500">· {t.province}</span></h3>
        <span className="flex items-center gap-2 text-sm">
          {t.sieges > 0 && <span className="text-slate-600">{t.sieges} siège(s) à pourvoir</span>}
          {showStatus && (t.publie ? <Badge tone="green">Publié</Badge> : <Badge tone="amber">Non publié</Badge>)}
        </span>
      </div>
      <p className="text-xs text-slate-600">Inscrits : {nf(t.inscrits)} · Votants : {nf(t.votants)} ({taux}) · Bulletins nuls : {nf(t.nuls)}</p>
      {t.resultats.length === 0 ? <p className="text-sm text-slate-500">Aucun résultat saisi.</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50"><tr><th className="th">Rang</th><th className="th">Candidat</th><th className="th">Parti</th><th className="th text-right">Voix</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {t.resultats.map((r) => (
                <tr key={r.candidatureId}>
                  <td className="td">{r.rang}</td><td className="td">{r.candidat}</td><td className="td">{r.parti ?? "—"}</td>
                  <td className="td text-right tabular-nums">{r.voix.toLocaleString("fr-FR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
