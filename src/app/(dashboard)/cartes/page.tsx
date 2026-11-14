import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { can } from "@/modules/roles/permissions";
import { listCards } from "@/modules/cards/services/card.service";
import { Badge, statutTone } from "@/components/ui/badge";
import { Empty, PageTitle, Table } from "@/components/ui/page";
import { CardIssueForm } from "@/components/forms/card-issue-form";
import { formatDateFr } from "@/lib/dates";

export const metadata = { title: "Cartes" };

export default async function CartesPage() {
  const ctx = await requireAuth();
  const cards = await listCards(ctx);
  return (
    <>
      <PageTitle title="Cartes d'identité" subtitle="Les 50 dernières cartes de votre périmètre." />
      {can(ctx.user.roleCode, "cards:issue") && <div className="mb-4"><CardIssueForm /></div>}
      {cards.length === 0 ? <Empty>Aucune carte.</Empty> : (
        <Table head={["Numéro", "Titulaire", "NIU", "Délivrée", "Expire", "Statut"]}>
          {cards.map((k) => (
            <tr key={k.id}>
              <td className="td"><Link className="text-sky-700 underline" href={`/cartes/${k.id}`}>{k.numero}</Link></td>
              <td className="td">{k.citoyen.nom} {k.citoyen.postnom} {k.citoyen.prenom}</td>
              <td className="td font-mono">{k.citoyen.niu}</td>
              <td className="td">{formatDateFr(k.dateDelivrance)}</td>
              <td className="td">{formatDateFr(k.dateExpiration)}</td>
              <td className="td"><Badge tone={statutTone(k.statut)}>{k.statut}</Badge></td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
