import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { can } from "@/modules/roles/permissions";
import { listGovernors } from "@/modules/users/services/user.service";
import { Badge } from "@/components/ui/badge";
import { PageTitle, Table } from "@/components/ui/page";
import { CreateUserForm } from "@/components/forms/create-user-form";
import { UserActions } from "@/components/forms/user-actions";
import { formatDateFr } from "@/lib/dates";

export const metadata = { title: "Gouverneurs de province" };

export default async function GouverneursPage() {
  const ctx = await requireAuth();
  if (!can(ctx.user.roleCode, "governors:read")) redirect("/dashboard");
  const rows = await listGovernors(ctx);
  const manage = can(ctx.user.roleCode, "governors:manage");
  return (
    <>
      <PageTitle title="Gouverneurs de province" subtitle="Un gouverneur actif par province : lecture seule, périmètre limité à sa province." />
      {manage && <div className="mb-4"><CreateUserForm title="Créer le profil d'un gouverneur" roles={[{ code: "GOUVERNEUR", label: "Gouverneur de province", level: "PROVINCE" }]} /></div>}
      <Table head={["Code", "Province", "Chef-lieu", "Gouverneur", "Contact", "Prise de fonction", "Statut", ...(manage ? ["Actions"] : [])]}>
        {rows.map(({ province: p, gouverneur: g }) => (
          <tr key={p.id}>
            <td className="td font-mono">{String(p.code).padStart(2, "0")}</td>
            <td className="td">{p.nom}</td>
            <td className="td">{p.chefLieu}</td>
            <td className="td">{g ? <>{g.nomComplet}{g.demo && <> <Badge tone="amber">démo</Badge></>}<div className="font-mono text-xs text-slate-500">{g.username}</div></> : <span className="text-slate-400">— à désigner</span>}</td>
            <td className="td text-xs">{g ? [g.telephone, g.email].filter(Boolean).join(" · ") || "—" : "—"}</td>
            <td className="td">{g ? formatDateFr(g.dateDebutFonction) : "—"}</td>
            <td className="td">{!g ? <Badge>Aucun compte</Badge> : g.actif ? <Badge tone="green">En fonction</Badge> : <Badge tone="red">Suspendu</Badge>}</td>
            {manage && <td className="td">{g && <UserActions id={g.id} actif={g.actif} />}</td>}
          </tr>
        ))}
      </Table>
    </>
  );
}
