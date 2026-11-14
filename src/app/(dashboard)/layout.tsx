import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { can, ROLE_LABELS } from "@/modules/roles/permissions";
import { NAV_ITEMS } from "@/components/navigation/nav-items";
import { Sidebar } from "@/components/navigation/sidebar";
import { LogoutButton } from "@/components/layout/logout-button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAuth();
  const path = (await headers()).get("x-pathname") ?? "";
  // Mot de passe temporaire ou MFA exigée : seule la page « Mon compte » reste accessible.
  if ((ctx.user.mustChangePassword || ctx.mfaPending) && !path.startsWith("/parametres")) redirect("/parametres");
  const items = NAV_ITEMS.filter((i) => !i.permission || can(ctx.user.roleCode, i.permission));
  const restricted = ctx.user.mustChangePassword || ctx.mfaPending;
  return (
    <div className="min-h-screen md:grid md:grid-cols-[250px_1fr]">
      <aside className="border-b border-slate-200 bg-white md:border-b-0 md:border-r">
        <div className="px-4 pt-4 text-lg font-bold text-sky-800">SNID-RDC</div>
        <Sidebar items={restricted ? items.filter((i) => i.href === "/parametres") : items} />
      </aside>
      <div>
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3">
          <div className="text-sm">
            <span className="font-medium">{ctx.user.nomComplet}</span>
            <span className="text-slate-500"> · {ROLE_LABELS[ctx.user.roleCode]}</span>
          </div>
          <LogoutButton />
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
