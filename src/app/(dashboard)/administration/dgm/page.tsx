import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { can } from "@/modules/roles/permissions";
import { describeHabilitations } from "@/modules/roles/habilitations";
import { INSTITUTIONS } from "@/modules/roles/institutions";
import { listInstitutionAccounts } from "@/modules/users/services/user.service";
import { InstitutionView } from "@/components/admin/institution-view";

export const metadata = { title: "DGM" };

export default async function DgmPage() {
  const ctx = await requireAuth();
  if (!can(ctx.user.roleCode, "institutions:read")) redirect("/dashboard");
  const comptes = await listInstitutionAccounts(ctx, "DGM");
  return <InstitutionView institution={INSTITUTIONS.DGM} habilitations={describeHabilitations("DGM")} comptes={comptes} canManage={can(ctx.user.roleCode, "institutions:manage")} />;
}
