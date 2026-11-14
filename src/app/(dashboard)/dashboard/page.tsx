import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { dashboard } from "@/modules/reports/services/report.service";
import { describeScope } from "@/modules/geography/services/geography.service";
import { Empty, Kpi, PageTitle, Section, StackedBar } from "@/components/ui/page";

export const metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const ctx = await requireAuth();
  const [k, scope] = await Promise.all([dashboard(ctx), describeScope(ctx)]);
  const hasPopulation = k.citoyens !== null || k.cartesActives !== null;
  const hasDeclarations = k.declarationsEnAttente !== null;
  return (
    <>
      <PageTitle title="Tableau de bord" subtitle={`Périmètre : ${scope}`} />
      {!hasPopulation && !hasDeclarations && <Empty>Aucun indicateur n'est disponible pour votre profil.</Empty>}

      {hasPopulation && (
        <Section title="Population et cartes">
          <div className="grid grid-cols-2 gap-x-8 gap-y-5 lg:grid-cols-4">
            <Kpi label="Citoyens enregistrés" value={k.citoyens} />
            <Kpi label="Hommes" value={k.hommes} />
            <Kpi label="Femmes" value={k.femmes} />
            <Kpi label="Cartes actives" value={k.cartesActives} />
          </div>
          {k.hommes !== null && k.femmes !== null && (
            <StackedBar label="Répartition des citoyens par sexe"
              segments={[{ label: "Hommes", value: k.hommes, className: "bg-sky-700" }, { label: "Femmes", value: k.femmes, className: "bg-etoile" }]} />
          )}
        </Section>
      )}

      {hasDeclarations && (
        <Section title="Déclarations">
          <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
            <Kpi label="En attente de décision" value={k.declarationsEnAttente} tone={k.declarationsEnAttente ? "attention" : undefined} />
            <Kpi label="Validées" value={k.declarationsValidees} />
            <Kpi label="Rejetées" value={k.declarationsRejetees} />
          </div>
          <StackedBar label="Répartition des déclarations par statut"
            segments={[
              { label: "En attente", value: k.declarationsEnAttente ?? 0, className: "bg-amber-700" },
              { label: "Validées", value: k.declarationsValidees ?? 0, className: "bg-green-700" },
              { label: "Rejetées", value: k.declarationsRejetees ?? 0, className: "bg-red-700" },
            ]} />
          {!!k.declarationsEnAttente && <Link href="/declarations" className="btn btn-primary mt-5">Traiter les déclarations en attente</Link>}
        </Section>
      )}
    </>
  );
}
