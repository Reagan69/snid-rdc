import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { can } from "@/modules/roles/permissions";
import { getCitizen } from "@/modules/citizens/services/citizen.service";
import { Badge, statutTone } from "@/components/ui/badge";
import { CitoyenHeader } from "@/components/ui/citoyen-header";
import { BiometricButton } from "@/components/forms/biometric-button";
import { formatDateFr } from "@/lib/dates";
import Link from "next/link";

export const metadata = { title: "Dossier citoyen" };

export default async function CitoyenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const ctx = await requireAuth();
  const c = await getCitizen(ctx, id); // 404 si hors périmètre
  const rows: [string, React.ReactNode][] = [
    ["Nom complet", `${c.nom} ${c.postnom} ${c.prenom}`],
    ["Sexe", c.sexe === "M" ? "Masculin" : "Féminin"],
    ["Naissance", `${formatDateFr(c.dateNaissance)}${c.lieuNaissance ? " · " + c.lieuNaissance : ""}`],
    ["Nationalité", c.nationalite],
    ["Adresse", c.adresse ?? "—"],
    ["Rattachement", `${c.province.nom} › ${c.commune.nom} › ${c.quartier.nom} › ${c.rue.nom}`],
    ...(c.dateDeces ? ([["Décès", formatDateFr(c.dateDeces)]] as [string, React.ReactNode][]) : []),
    ["Père", c.pere ? `${c.pere.nom} ${c.pere.prenom} (${c.pere.niu})` : "—"],
    ["Mère", c.mere ? `${c.mere.nom} ${c.mere.prenom} (${c.mere.niu})` : "—"],
  ];
  return (
    <>
      <Link href="/citoyens" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-sky-800 hover:underline">‹ Citoyens</Link>
      <CitoyenHeader nomComplet={`${c.prenom} ${c.postnom} ${c.nom}`} niu={c.niu} localisation={`${c.commune.nom}, ${c.province.nom}`}>
        <Badge tone={statutTone(c.statut)}>{c.statut}</Badge>
      </CitoyenHeader>
      {c.demo && <p className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Dossier FICTIF de démonstration : ne correspond à aucune personne réelle.</p>}
      <p className="mb-4 text-sm text-slate-500">Cette consultation est inscrite au journal d'audit.</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <dl className="card divide-y divide-slate-100 !p-6">
          {rows.map(([k, v]) => (<div key={k} className="grid grid-cols-[130px_1fr] gap-3 py-3 text-sm first:pt-0 last:pb-0"><dt className="text-slate-500">{k}</dt><dd className="text-slate-900">{v}</dd></div>))}
        </dl>
        <div className="space-y-4">
          <div className="card text-sm">
            <h2 className="mb-3 font-display text-lg font-medium">Cartes</h2>
            {c.cartes.length === 0 ? <p className="text-slate-500">Aucune carte délivrée.</p> : c.cartes.map((k) => (
              <p key={k.id}><Link className="text-sky-700 underline" href={`/cartes/${k.id}`}>{k.numero}</Link> · <Badge tone={statutTone(k.statut)}>{k.statut}</Badge> · expire le {formatDateFr(k.dateExpiration)}</p>
            ))}
          </div>
          <div className="card text-sm space-y-2">
            <h2 className="font-display text-lg font-medium">Biométrie</h2>
            {c.biometrie ? <p>{c.biometrie.mode === "SIMULATION" ? "Capture SIMULÉE" : "Capture réelle"} · {c.biometrie.statut}{c.biometrie.qualite ? ` · qualité ${c.biometrie.qualite}` : ""}</p> : <p className="text-slate-500">Aucune capture.</p>}
            {can(ctx.user.roleCode, "biometrics:capture") && <BiometricButton citoyenId={c.id} />}
          </div>
        </div>
      </div>
    </>
  );
}
