import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { can } from "@/modules/roles/permissions";
import { getSettingsOverview } from "@/modules/settings/services/settings.service";
import { ReglagesView } from "@/components/admin/reglages-view";

export const metadata = { title: "Réglages" };

export default async function ReglagesPage() {
  const ctx = await requireAuth();
  if (!can(ctx.user.roleCode, "settings:read")) redirect("/dashboard");
  const s = await getSettingsOverview(ctx);
  return <ReglagesView s={s} canManage={can(ctx.user.roleCode, "settings:manage")} canAudit={can(ctx.user.roleCode, "audit:read")} />;
}
