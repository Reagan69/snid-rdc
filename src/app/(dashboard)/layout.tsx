import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { can, ROLE_LABELS } from "@/modules/roles/permissions";
import { NAV_ITEMS } from "@/components/navigation/nav-items";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAuth();
  const path = (await headers()).get("x-pathname") ?? "";
  // Mot de passe temporaire ou MFA exigée : seule la page « Mon compte » reste accessible.
  if ((ctx.user.mustChangePassword || ctx.mfaPending) && !path.startsWith("/parametres")) redirect("/parametres");
  const items = NAV_ITEMS.filter((i) => !i.permission || can(ctx.user.roleCode, i.permission));
  const restricted = ctx.user.mustChangePassword || ctx.mfaPending;
  return (
    <AppShell items={restricted ? items.filter((i) => i.href === "/parametres") : items} userName={ctx.user.nomComplet} roleLabel={ROLE_LABELS[ctx.user.roleCode]}>
      {children}
    </AppShell>
  );
}
