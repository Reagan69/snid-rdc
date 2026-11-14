import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { can } from "@/modules/roles/permissions";
import { listAudit } from "@/modules/audit/services/audit.service";
import { Empty, PageTitle, Table } from "@/components/ui/page";

export const metadata = { title: "Journal d'audit" };
type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.slice(0, 60) || undefined;

export default async function AuditPage({ searchParams }: { searchParams: SP }) {
  const ctx = await requireAuth();
  if (!can(ctx.user.roleCode, "audit:read")) redirect("/dashboard");
  const sp = await searchParams;
  const action = one(sp.action), username = one(sp.username);
  const rows = await listAudit(ctx, { action, username, take: 100 });
  return (
    <>
      <PageTitle title="Journal d'audit" subtitle="Ajout seul : aucune modification ni suppression possible depuis l'application." />
      <form action="/audit" className="card mb-4 flex flex-wrap items-end gap-3">
        <div><label className="label" htmlFor="action">Action</label><input id="action" name="action" defaultValue={action} className="field" placeholder="CITOYEN_CONSULTE" /></div>
        <div><label className="label" htmlFor="username">Utilisateur</label><input id="username" name="username" defaultValue={username} className="field" /></div>
        <button className="btn btn-primary">Filtrer</button>
      </form>
      {rows.length === 0 ? <Empty>Aucune entrée.</Empty> : (
        <Table head={["Date", "Utilisateur", "Rôle", "Action", "Objet", "IP"]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="td whitespace-nowrap">{r.createdAt.toLocaleString("fr-FR", { timeZone: "Africa/Kinshasa" })}</td>
              <td className="td">{r.username ?? "—"}</td><td className="td">{r.roleCode ?? "—"}</td>
              <td className="td font-mono text-xs">{r.action}</td>
              <td className="td text-xs">{r.entite ?? ""} {r.entiteId ? r.entiteId.slice(0, 8) : ""}</td>
              <td className="td text-xs">{r.ip ?? "—"}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
