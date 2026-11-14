import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { can } from "@/modules/roles/permissions";
import { getCitizen } from "@/modules/citizens/services/citizen.service";
import { Badge, statutTone } from "@/components/ui/badge";
import { PageTitle } from "@/components/ui/page";
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
    ["NIU", <span key="n" className="font-mono">{c.niu}</span>],
    ["Nom complet", `${c.nom} ${c.postnom} ${c.prenom}`],
    ["Sexe", c.sexe === "M" ? "Masculin" : "Féminin"],
    ["Naissance", `${formatDateFr(c.dateNaissance)}${c.lieuNaissance ? " · " + c.lieuNaissance : ""}`],
    ["Nationalité", c.nationalite],
    ["Adresse", c.adresse ?? "—"],
    ["Rattachement", `${c.province.nom} › ${c.commune.nom} › ${c.quartier.nom} › ${c.rue.nom}`],
    ["Statut", <Badge key="s" tone={statutTone(c.statut)}>{c.statut}</Badge>],
    ...(c.dateDeces ? ([["Décès", formatDateFr(c.dateDeces)]] as [string, React.ReactNode][]) : []),
    ["Père", c.pere ? `${c.pere.nom} ${c.pere.prenom} (${c.pere.niu})` : "—"],
    ["Mère", c.mere ? `${c.mere.nom} ${c.mere.prenom} (${c.mere.niu})` : "—"],
  ];
  return (
    <>
      <PageTitle title={`${c.prenom} ${c.nom}`} subtitle="Cette consultation est inscrite au journal d'audit." />
      {c.demo && <p className="mb-3 rounded-md bg-amber-50 p-2 text-sm text-amber-800">Dossier FICTIF de démonstration : ne correspond à aucune personne réelle.</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <dl className="card divide-y divide-slate-100">
          {rows.map(([k, v]) => (<div key={k} className="grid grid-cols-[130px_1fr] gap-2 py-2 text-sm"><dt className="text-slate-500">{k}</dt><dd>{v}</dd></div>))}
        </dl>
        <div className="space-y-4">
          <div className="card text-sm">
            <h2 className="mb-2 font-semibold">Cartes</h2>
            {c.cartes.length === 0 ? <p className="text-slate-500">Aucune carte délivrée.</p> : c.cartes.map((k) => (
              <p key={k.id}><Link className="text-sky-700 underline" href={`/cartes/${k.id}`}>{k.numero}</Link> · <Badge tone={statutTone(k.statut)}>{k.statut}</Badge> · expire le {formatDateFr(k.dateExpiration)}</p>
            ))}
          </div>
          <div className="card text-sm space-y-2">
            <h2 className="font-semibold">Biométrie</h2>
            {c.biometrie ? <p>{c.biometrie.mode === "SIMULATION" ? "Capture SIMULÉE" : "Capture réelle"} · {c.biometrie.statut}{c.biometrie.qualite ? ` · qualité ${c.biometrie.qualite}` : ""}</p> : <p className="text-slate-500">Aucune capture.</p>}
            {can(ctx.user.roleCode, "biometrics:capture") && <BiometricButton citoyenId={c.id} />}
          </div>
        </div>
      </div>
    </>
  );
}
