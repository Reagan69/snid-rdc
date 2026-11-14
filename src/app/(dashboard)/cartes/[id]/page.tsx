import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { getCard } from "@/modules/cards/services/card.service";
import { Badge, statutTone } from "@/components/ui/badge";
import { PageTitle } from "@/components/ui/page";
import { CarteIdentite } from "@/components/ui/carte-identite";
import { formatDateFr } from "@/lib/dates";

export const metadata = { title: "Carte d'identité" };

export default async function CartePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const ctx = await requireAuth();
  const k = await getCard(ctx, id);
  const c = k.citoyen;
  return (
    <>
      <PageTitle title={`Carte ${k.numero}`} subtitle={`${c.prenom} ${c.postnom} ${c.nom}`}><Badge tone={statutTone(k.statut)}>{k.statut}</Badge></PageTitle>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,470px)_1fr]">
        <CarteIdentite carte={{
          nom: c.nom, postnom: c.postnom, prenom: c.prenom, sexe: c.sexe === "M" ? "M" : "F",
          naissance: formatDateFr(c.dateNaissance), niu: c.niu, commune: c.commune.nom,
          delivree: formatDateFr(k.dateDelivrance), expire: formatDateFr(k.dateExpiration), qrDataUrl: k.qrDataUrl,
        }} />
        <dl className="card space-y-3 text-sm">
          {([
            ["Délivrée le", formatDateFr(k.dateDelivrance)],
            ["Expire le", formatDateFr(k.dateExpiration)],
            ["Signataire", k.signataire?.nomComplet ?? "—"],
            ["Domicile", `${c.commune.nom}, ${c.quartier.nom}, ${c.rue.nom}`],
          ] as [string, string][]).map(([a, b]) => (
            <div key={a} className="grid grid-cols-[110px_1fr] gap-3"><dt className="text-slate-500">{a}</dt><dd className="text-slate-900">{b}</dd></div>
          ))}
          <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">Le QR code mène à une vérification publique : elle n'affiche que la validité et les initiales.</p>
        </dl>
      </div>
    </>
  );
}
