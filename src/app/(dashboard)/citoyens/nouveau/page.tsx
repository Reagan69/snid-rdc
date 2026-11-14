import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { can } from "@/modules/roles/permissions";
import { DeclarationForm } from "@/components/forms/declaration-form";
import { PageTitle } from "@/components/ui/page";

export const metadata = { title: "Nouvelle identification" };

export default async function NouveauCitoyenPage() {
  const ctx = await requireAuth();
  if (!can(ctx.user.roleCode, "citizens:create")) redirect("/dashboard");
  return (
    <>
      <PageTitle title="Nouvelle identification" subtitle="Le dossier est créé, et le NIU attribué, uniquement après validation par la chaîne : chef de quartier → chef de bureau → bourgmestre → ONIP." />
      <DeclarationForm types={["IDENTIFICATION", "NAISSANCE"]} />
    </>
  );
}
