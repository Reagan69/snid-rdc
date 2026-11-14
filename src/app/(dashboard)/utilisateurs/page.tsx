import { requireAuth } from "@/lib/auth";
import { MANAGEABLE_ROLES, ROLE_LABELS, ROLE_SCOPE_LEVEL, can } from "@/modules/roles/permissions";
import { listCirconscriptions } from "@/modules/elections/services/election.service";
import { listUsers } from "@/modules/users/services/user.service";
import { Badge } from "@/components/ui/badge";
import { Empty, PageTitle, Table } from "@/components/ui/page";
import { CreateUserForm } from "@/components/forms/create-user-form";
import { UserActions } from "@/components/forms/user-actions";

export const metadata = { title: "Utilisateurs" };

export default async function UtilisateursPage() {
  const ctx = await requireAuth();
  const users = await listUsers(ctx);
  const roles = MANAGEABLE_ROLES[ctx.user.roleCode].map((code) => ({ code, label: ROLE_LABELS[code], level: ROLE_SCOPE_LEVEL[code] }));
  const circonscriptions = roles.some((r) => r.code === "CIRCONSCRIPTION")
    ? (await listCirconscriptions(ctx)).map((c) => ({ id: c.id, label: `${c.nom} — ${c.province.nom}` }))
    : [];
  const canWrite = can(ctx.user.roleCode, "users:create") && roles.length > 0;
  const canDelete = can(ctx.user.roleCode, "users:delete");
  const canAudit = can(ctx.user.roleCode, "audit:read");
  return (
    <>
      <PageTitle title="Utilisateurs" subtitle={canDelete ? "Tous les comptes ouverts sous votre supervision, quel que soit celui qui les a créés." : "Comptes subordonnés à votre rôle et à votre périmètre."} />
      {canWrite && <div className="mb-4"><CreateUserForm roles={roles} circonscriptions={circonscriptions} /></div>}
      {users.length === 0 ? <Empty>Aucun compte subordonné.</Empty> : (
        <Table head={["Nom", "Identifiant", "Rôle", "Zone", "Créé par", "MFA", "Statut", "Actions"]}>
          {users.map((u) => {
            const a = u.affectation;
            return (
              <tr key={u.id}>
                <td className="td">{u.nomComplet}{u.demo && <> <Badge tone="amber">démo</Badge></>}</td>
                <td className="td font-mono">{u.username}</td>
                <td className="td">{ROLE_LABELS[u.roleCode as keyof typeof ROLE_LABELS]}</td>
                <td className="td">{[a?.province?.nom, a?.circonscription?.nom, a?.commune?.nom, a?.quartier?.nom, a?.rue?.nom].filter(Boolean).join(" › ") || "National"}</td>
                <td className="td text-xs">{u.createur ? <>{u.createur.nomComplet}<div className="font-mono text-slate-500">{u.createur.username}</div></> : "—"}</td>
                <td className="td">{u.totpActif ? "oui" : "non"}</td>
                <td className="td">{u.actif ? <Badge tone="green">Actif</Badge> : <Badge tone="red">Suspendu</Badge>}{u.motifSuspension && <div className="text-xs text-slate-500">{u.motifSuspension}</div>}</td>
                <td className="td">{can(ctx.user.roleCode, "users:update") && <UserActions id={u.id} actif={u.actif} username={u.username} canDelete={canDelete} activityHref={canAudit ? `/audit?username=${encodeURIComponent(u.username)}` : undefined} />}</td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
