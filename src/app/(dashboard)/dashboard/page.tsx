import { requireAuth } from "@/lib/auth";
import { can } from "@/modules/roles/permissions";
import { dashboard } from "@/modules/reports/services/report.service";
import { describeScope } from "@/modules/geography/services/geography.service";
import { listAudit } from "@/modules/audit/services/audit.service";
import { DashboardView, type ActiviteRow } from "@/components/dashboard/dashboard-view";

export const metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const ctx = await requireAuth();
  const role = ctx.user.roleCode;
  const [k, scope, journal] = await Promise.all([
    dashboard(ctx),
    describeScope(ctx),
    // Le journal est national : seuls les rôles qui y ont droit voient l'activité récente.
    can(role, "audit:read") ? listAudit(ctx, { take: 6 }).catch(() => []) : Promise.resolve([]),
  ]);
  const activite: ActiviteRow[] = journal.map((r) => ({ id: r.id, username: r.username, action: r.action, createdAt: r.createdAt }));
  return <DashboardView k={k} scope={scope} userName={ctx.user.nomComplet} activite={activite} canCreate={can(role, "citizens:create")} canVerify={can(role, "niu:verify")} />;
}
