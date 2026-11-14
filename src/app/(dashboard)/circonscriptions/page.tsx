import { requireAuth } from "@/lib/auth";
import { can } from "@/modules/roles/permissions";
import { listCirconscriptions } from "@/modules/elections/services/election.service";
import { listGeography } from "@/modules/geography/services/geography.service";
import { Badge } from "@/components/ui/badge";
import { Empty, PageTitle, Table } from "@/components/ui/page";
import { CirconscriptionForm } from "@/components/forms/circonscription-form";

export const metadata = { title: "Circonscriptions électorales" };

export default async function CirconscriptionsPage() {
  const ctx = await requireAuth();
  const manage = can(ctx.user.roleCode, "elections:manage");
  const [items, provinces] = await Promise.all([listCirconscriptions(ctx), manage ? listGeography(ctx, "provinces") : []]);
  return (
    <>
      <PageTitle title="Circonscriptions électorales" subtitle="La CENI couvre l'ensemble des provinces de la RDC et crée les circonscriptions ainsi que leurs comptes." />
      {manage && <div className="mb-4"><CirconscriptionForm provinces={provinces.map((p) => ({ id: p.id, nom: p.nom }))} /></div>}
      {items.length === 0 ? <Empty>Aucune circonscription.</Empty> : (
        <Table head={["Province", "Code", "Circonscription", "Rattachement", "Statut"]}>
          {items.map((c) => (
            <tr key={c.id}>
              <td className="td">{c.province.nom}</td><td className="td">{c.code}</td><td className="td">{c.nom}</td>
              <td className="td">{c.commune?.nom ?? "—"}</td>
              <td className="td">{c.actif ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
