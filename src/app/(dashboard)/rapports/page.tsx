import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { can } from "@/modules/roles/permissions";
import { reportByCommune } from "@/modules/reports/services/report.service";
import { Empty, PageTitle, Table } from "@/components/ui/page";

export const metadata = { title: "Rapports" };

export default async function RapportsPage() {
  const ctx = await requireAuth();
  if (!can(ctx.user.roleCode, "reports:read")) redirect("/dashboard");
  const rows = await reportByCommune(ctx);
  return (
    <>
      <PageTitle title="Rapports" subtitle="Population et déclarations par commune ou territoire, dans votre périmètre." />
      {rows.length === 0 ? <Empty>Aucune donnée dans votre périmètre.</Empty> : (
        <Table head={["Province", "Commune / territoire", "Population", "Hommes", "Femmes", "En attente", "Validées", "Rejetées"]}>
          {rows.map((r) => (
            <tr key={`${r.province}-${r.commune}-${r.ville}`}>
              <td className="td">{r.province}</td><td className="td">{r.commune}{r.ville ? ` (${r.ville})` : ""}</td>
              <td className="td font-semibold">{r.population.toLocaleString("fr-FR")}</td>
              <td className="td">{r.hommes}</td><td className="td">{r.femmes}</td>
              <td className="td">{r.enAttente}</td><td className="td">{r.validees}</td><td className="td">{r.rejetees}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
