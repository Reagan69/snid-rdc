import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { can } from "@/modules/roles/permissions";
import { getScrutin, listCirconscriptions } from "@/modules/elections/services/election.service";
import { listCandidatures } from "@/modules/elections/services/candidature.service";
import { getResultats, getSaisieContext } from "@/modules/elections/services/resultat.service";
import { STATUT_SCRUTIN_LABELS, TYPE_LABELS, type StatutScrutin, type TypeScrutin } from "@/modules/elections/rules";
import { AppError } from "@/lib/errors";
import { Badge, statutTone } from "@/components/ui/badge";
import { Empty, PageTitle, Table } from "@/components/ui/page";
import { ResultsTable } from "@/components/ui/results-table";
import { ScrutinActions } from "@/components/forms/scrutin-actions";
import { SiegesForm } from "@/components/forms/sieges-form";
import { ResultatsForm } from "@/components/forms/resultats-form";
import { PublishButton } from "@/components/forms/publish-button";
import { CandidatureActions } from "@/components/forms/candidature-actions";
import { formatDateFr } from "@/lib/dates";

export const metadata = { title: "Scrutin" };

export default async function ScrutinPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAuth();
  const { id } = await params;
  const s = await getScrutin(ctx, id).catch((e) => { if (e instanceof AppError && e.status === 404) return null; throw e; });
  if (!s) notFound();
  const role = ctx.user.roleCode;
  const manage = can(role, "elections:manage");
  const statut = s.statut as StatutScrutin;

  const [candidatures, toutesCirc, resultats, saisie] = await Promise.all([
    can(role, "candidatures:read") ? listCandidatures(ctx, { scrutinId: id }) : [],
    manage && statut === "PLANIFIE" ? listCirconscriptions(ctx) : [],
    can(role, "results:read") && statut === "CLOS" ? getResultats(ctx, id) : null,
    can(role, "results:enter") && statut === "CLOS" ? getSaisieContext(ctx, id) : null,
  ]);

  return (
    <>
      <PageTitle title={`${s.code} — ${s.libelle}`} subtitle={`${TYPE_LABELS[s.type as TypeScrutin]} · ${formatDateFr(s.dateScrutin)}`}>
        <div className="flex items-center gap-3">
          <Badge tone={statut === "OUVERT" ? "green" : statut === "CLOS" ? "sky" : "slate"}>{STATUT_SCRUTIN_LABELS[statut]}</Badge>
          {manage && <ScrutinActions id={s.id} statut={statut} />}
        </div>
      </PageTitle>

      <section className="mb-6 space-y-3">
        <h2 className="font-semibold">Circonscriptions et sièges</h2>
        {manage && statut === "PLANIFIE" && <SiegesForm scrutinId={s.id} circonscriptions={toutesCirc.filter((c) => c.actif).map((c) => ({ id: c.id, label: `${c.nom} — ${c.province.nom}` }))} />}
        {s.circonscriptions.length === 0 ? <Empty>Aucune circonscription rattachée à ce scrutin.</Empty> : (
          <Table head={["Circonscription", "Province", "Sièges", "Inscrits", "Votants", "Résultats", ""]}>
            {s.circonscriptions.map((c) => (
              <tr key={c.circonscriptionId}>
                <td className="td">{c.circonscription.nom}</td>
                <td className="td">{c.circonscription.province.nom}</td>
                <td className="td">{c.sieges}</td>
                <td className="td">{c.inscrits?.toLocaleString("fr-FR") ?? "—"}</td>
                <td className="td">{c.votants?.toLocaleString("fr-FR") ?? "—"}</td>
                <td className="td">{c.publie ? <Badge tone="green">Publiés</Badge> : c.saisiLe ? <Badge tone="amber">Saisis</Badge> : <Badge>Non saisis</Badge>}</td>
                <td className="td">{manage && statut === "CLOS" && c.saisiLe && !c.publie && <PublishButton scrutinId={s.id} circonscriptionId={c.circonscriptionId} />}</td>
              </tr>
            ))}
          </Table>
        )}
      </section>

      {saisie && !saisie.publie && <div className="mb-6"><ResultatsForm scrutinId={s.id} attendus={saisie.attendus} initial={saisie.initial} /></div>}
      {saisie?.publie && <p className="mb-6 rounded-md bg-green-50 p-3 text-sm text-green-800">Les résultats de votre circonscription sont publiés : la saisie est verrouillée.</p>}

      {resultats && (
        <section className="mb-6 space-y-3">
          <h2 className="font-semibold">Résultats par circonscription</h2>
          {resultats.circonscriptions.length === 0 ? <Empty>Aucun résultat.</Empty> : resultats.circonscriptions.map((t) => <ResultsTable key={t.circonscriptionId} t={t} showStatus />)}
        </section>
      )}

      {can(role, "candidatures:read") && (
        <section className="space-y-3">
          <h2 className="font-semibold">Candidatures</h2>
          {candidatures.length === 0 ? <Empty>Aucune candidature.</Empty> : (
            <div className="space-y-3">
              {candidatures.map((c) => (
                <article key={c.id} className="card space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div><span className="font-mono text-sm">{c.numero}</span> · <b>{c.citoyen.prenom} {c.citoyen.nom} {c.citoyen.postnom}</b> <span className="text-xs text-slate-500">({c.citoyen.niu})</span></div>
                    <Badge tone={c.statut === "RECEVABLE" ? "green" : statutTone(c.statut)}>{c.statut}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">{c.circonscription?.nom ?? "Candidature nationale"}{c.parti ? ` · ${c.parti}` : ""}{c.userId ? " · compte candidat créé" : ""}</p>
                  {c.motifRejet && <p className="text-sm text-red-700">Motif du rejet : {c.motifRejet}</p>}
                  <CandidatureActions id={c.id} statut={c.statut} scrutinPlanifie={statut === "PLANIFIE"} hasAccount={!!c.userId} canDecide={can(role, "candidatures:decide")} />
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
