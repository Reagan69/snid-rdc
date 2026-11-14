import { requireAuth } from "@/lib/auth";
import { dashboard } from "@/modules/reports/services/report.service";
import { describeScope } from "@/modules/geography/services/geography.service";
import { ROLE_LABELS } from "@/modules/roles/permissions";
import { Kpi, PageTitle } from "@/components/ui/page";

export const metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const ctx = await requireAuth();
  const [k, scope] = await Promise.all([dashboard(ctx), describeScope(ctx)]);
  return (
    <>
      <PageTitle title="Tableau de bord" subtitle={`${ROLE_LABELS[ctx.user.roleCode]} · périmètre : ${scope}`} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Citoyens enregistrés" value={k.citoyens} />
        <Kpi label="Hommes" value={k.hommes} />
        <Kpi label="Femmes" value={k.femmes} />
        <Kpi label="Cartes actives" value={k.cartesActives} />
        <Kpi label="Déclarations en attente" value={k.declarationsEnAttente} />
        <Kpi label="Déclarations validées" value={k.declarationsValidees} />
        <Kpi label="Déclarations rejetées" value={k.declarationsRejetees} />
      </div>
    </>
  );
}
