import { notFound } from "next/navigation";
import { getOpenScrutins } from "@/modules/elections/services/election.service";
import { TYPE_LABELS, type TypeScrutin } from "@/modules/elections/rules";
import { ElecteurForm } from "./electeur-form";

export const metadata = { title: "Espace électeur" };
// Visibilité décidée à CHAQUE requête : jamais de page mise en cache alors que le scrutin s'ouvre ou se clôt.
export const dynamic = "force-dynamic";

export default async function ElecteurPage() {
  const ouverts = await getOpenScrutins();
  // Espace électeur INVISIBLE (404) tant qu'aucun scrutin n'est ouvert.
  if (ouverts.length === 0) notFound();
  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <div className="text-center">
        <h1 className="text-xl font-bold text-sky-800">Espace électeur</h1>
        <p className="text-sm text-slate-600">Scrutin(s) en cours : {ouverts.map((s) => `${s.libelle} (${TYPE_LABELS[s.type as TypeScrutin]})`).join(" · ")}</p>
      </div>
      <ElecteurForm />
      <p className="text-center text-xs text-slate-500">Seules vos initiales sont affichées, pour protéger vos données personnelles.</p>
    </main>
  );
}
