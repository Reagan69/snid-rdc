import { requireAuth } from "@/lib/auth";
import { can } from "@/modules/roles/permissions";
import { listScrutins } from "@/modules/elections/services/election.service";
import { listCandidatures } from "@/modules/elections/services/candidature.service";
import { TYPE_LABELS, canRegisterCandidature, type TypeScrutin } from "@/modules/elections/rules";
import { Badge, statutTone } from "@/components/ui/badge";
import { Empty, PageTitle } from "@/components/ui/page";
import { CandidatureForm } from "@/components/forms/candidature-form";
import { CandidatureActions } from "@/components/forms/candidature-actions";

export const metadata = { title: "Candidatures" };

export default async function CandidaturesPage() {
  const ctx = await requireAuth();
  const role = ctx.user.roleCode;
  const [items, scrutins] = await Promise.all([listCandidatures(ctx, {}), can(role, "candidatures:create") ? listScrutins(ctx) : []]);
  const registrables = scrutins
    .filter((s) => s.statut === "PLANIFIE" && canRegisterCandidature(role, s.type as TypeScrutin))
    .map((s) => ({ id: s.id, label: `${s.code} — ${TYPE_LABELS[s.type as TypeScrutin]}` }));
  const note = role === "CENI"
    ? "La CENI enregistre les candidatures à la présidentielle. Les candidatures législatives sont enregistrées par les circonscriptions."
    : "Votre circonscription enregistre les candidatures législatives locales. Un citoyen ne peut déposer qu'une seule candidature par scrutin : toute candidature double est bloquée.";
  return (
    <>
      <PageTitle title="Candidatures" subtitle={role === "CIRCONSCRIPTION" ? "Candidatures de votre circonscription." : "Toutes les candidatures reçues."} />
      {can(role, "candidatures:create") && <div className="mb-4"><CandidatureForm scrutins={registrables} note={note} /></div>}
      {items.length === 0 ? <Empty>Aucune candidature.</Empty> : (
        <div className="space-y-3">
          {items.map((c) => (
            <article key={c.id} className="card space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><span className="font-mono text-sm">{c.numero}</span> · <b>{c.citoyen.prenom} {c.citoyen.nom} {c.citoyen.postnom}</b> <span className="text-xs text-slate-500">({c.citoyen.niu})</span></div>
                <Badge tone={c.statut === "RECEVABLE" ? "green" : statutTone(c.statut)}>{c.statut}</Badge>
              </div>
              <p className="text-xs text-slate-500">{c.scrutin.code} · {c.circonscription?.nom ?? "Candidature nationale"}{c.parti ? ` · ${c.parti}` : ""}</p>
              {c.motifRejet && <p className="text-sm text-red-700">Motif du rejet : {c.motifRejet}</p>}
              <CandidatureActions id={c.id} statut={c.statut} scrutinPlanifie={c.scrutin.statut === "PLANIFIE"} hasAccount={!!c.userId} canDecide={can(role, "candidatures:decide")} />
            </article>
          ))}
        </div>
      )}
    </>
  );
}
