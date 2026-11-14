import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { can } from "@/modules/roles/permissions";
import { provinceOverview } from "@/modules/geography/services/geography.service";
import { PageTitle, Table } from "@/components/ui/page";

export const metadata = { title: "Administration territoriale" };

export default async function AdministrationPage() {
  const ctx = await requireAuth();
  const provinces = await provinceOverview(ctx);
  return (
    <>
      <PageTitle title="Administration territoriale" subtitle="Provinces, villes, communes, territoires, quartiers et rues (chaîne du NIU).">
        <div className="flex flex-wrap gap-3">
          {can(ctx.user.roleCode, "governors:read") && <Link className="btn" href="/administration/gouverneurs">Gouverneurs de province</Link>}
          {can(ctx.user.roleCode, "institutions:read") && <Link className="btn" href="/administration/ceni">CENI</Link>}
          {can(ctx.user.roleCode, "institutions:read") && <Link className="btn" href="/administration/dgm">DGM</Link>}
        </div>
      </PageTitle>
      <Table head={["Code NIU", "Province", "Chef-lieu", "Statut", "Communes et territoires"]}>
        {provinces.map((p) => (
          <tr key={p.id}>
            <td className="td font-mono">{String(p.code).padStart(2, "0")}</td>
            <td className="td">{p.nom}</td>
            <td className="td">{p.chefLieu}</td>
            <td className="td">{p.statut === "VILLE_PROVINCE" ? "Ville-province" : "Province"}</td>
            <td className="td">{p._count.communes}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
