import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { getCard } from "@/modules/cards/services/card.service";
import { Badge, statutTone } from "@/components/ui/badge";
import { PageTitle } from "@/components/ui/page";
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
      <PageTitle title={`Carte ${k.numero}`} />
      <article className="card mx-auto grid max-w-xl gap-4 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">République démocratique du Congo · Carte d'identité nationale</p>
          <p className="text-lg font-semibold">{c.nom} {c.postnom} {c.prenom}</p>
          <p>NIU : <span className="font-mono">{c.niu}</span></p>
          <p>Né(e) le {formatDateFr(c.dateNaissance)} · {c.sexe === "M" ? "Masculin" : "Féminin"}</p>
          <p>{c.commune.nom} · {c.quartier.nom} · {c.rue.nom}</p>
          <p>Délivrée le {formatDateFr(k.dateDelivrance)} · expire le {formatDateFr(k.dateExpiration)}</p>
          <p>Signataire : {k.signataire?.nomComplet ?? "—"} · <Badge tone={statutTone(k.statut)}>{k.statut}</Badge></p>
        </div>
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={k.qrDataUrl} alt="QR code de vérification" width={140} height={140} className="mx-auto" />
          <p className="mt-1 text-[10px] text-slate-500">Vérification publique<br />(validité et initiales seulement)</p>
        </div>
      </article>
    </>
  );
}
