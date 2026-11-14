import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { can } from "@/modules/roles/permissions";
import { VerifyNiuForm } from "@/components/forms/verify-niu-form";
import { PageTitle } from "@/components/ui/page";

export const metadata = { title: "Vérifier un NIU" };

export default async function IdentificationPage() {
  const ctx = await requireAuth();
  if (!can(ctx.user.roleCode, "niu:verify")) redirect("/dashboard");
  return (
    <>
      <PageTitle title="Vérifier un NIU" subtitle="Format CD-pp-cc-qq-rrrr-nnnnn. Hors de votre périmètre, seul le format est confirmé." />
      <VerifyNiuForm />
    </>
  );
}
