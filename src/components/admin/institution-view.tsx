import { Check } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Empty, PageTitle, Panel, Table } from "@/components/ui/page";
import { CreateUserForm } from "@/components/forms/create-user-form";
import { UserActions } from "@/components/forms/user-actions";
import { ROLE_LABELS, ROLE_SCOPE_LEVEL } from "@/modules/roles/permissions";
import type { Institution } from "@/modules/roles/institutions";

export interface CompteInstitution {
  id: string; username: string; nomComplet: string; roleCode: string; createur: { nomComplet: string; username: string } | null; actif: boolean; motifSuspension: string | null; totpActif: boolean;
  telephone: string | null; email: string | null; dateDebutFonction: Date | null; demo: boolean; derniereConnexion: Date | null;
}

const fmtConnexion = (d: Date | null) => (d ? d.toLocaleString("fr-FR", { timeZone: "Africa/Kinshasa", dateStyle: "medium", timeStyle: "short" }) : "Jamais");

/** Page d'une institution nationale : son rôle dans le SNID, ses habilitations réelles, ses comptes. */
export function InstitutionView({ institution, habilitations, comptes, canManage, canDelete = false, canAudit = false }: { institution: Institution; habilitations: string[]; comptes: CompteInstitution[]; canManage: boolean; canDelete?: boolean; canAudit?: boolean }) {
  const role = { code: institution.role, label: ROLE_LABELS[institution.role], level: ROLE_SCOPE_LEVEL[institution.role] };
  return (
    <>
      <PageTitle title={institution.sigle} subtitle={institution.nom} />

      <Panel title="Rôle dans le SNID" elevated className="mb-6">
        <p className="max-w-prose text-slate-700">{institution.description}</p>
        <p className="mt-3 text-sm text-slate-500">Périmètre : <span className="font-medium text-slate-800">{institution.perimetre}</span></p>
        <h3 className="mb-3 mt-6 font-display text-base font-medium text-slate-900">Habilitations</h3>
        <ul className="grid gap-x-8 gap-y-2.5 md:grid-cols-2">
          {habilitations.map((h) => (
            <li key={h} className="flex items-start gap-2.5 text-sm text-slate-700">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-700" aria-hidden /> <span>{h}</span>
            </li>
          ))}
        </ul>
        {canManage && <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Ces comptes agissent sous votre supervision : toutes leurs actions sont journalisées (bouton « Activité »), et vous pouvez les suspendre ou les supprimer.</p>}
      </Panel>

      {canManage && <div className="mb-6"><CreateUserForm title={`Créer un compte ${institution.sigle}`} roles={[role]} /></div>}

      {comptes.length === 0 ? <Empty>Aucun compte {institution.sigle} pour le moment.{canManage ? " Créez le premier compte ci-dessus." : ""}</Empty> : (
        <Table head={["Agent", "Rôle", "Créé par", "Contact", "Dernière connexion", "MFA", "Statut", ...(canManage ? ["Actions"] : [])]}>
          {comptes.map((u) => (
            <tr key={u.id}>
              <td className="td">
                <div className="flex items-center gap-3">
                  <Avatar name={u.nomComplet} size="sm" />
                  <div><div className="font-medium">{u.nomComplet}{u.demo && <> <Badge tone="amber">démo</Badge></>}</div><div className="font-mono text-xs text-slate-500">{u.username}</div></div>
                </div>
              </td>
              <td className="td text-sm">{ROLE_LABELS[u.roleCode as keyof typeof ROLE_LABELS] ?? u.roleCode}</td>
              <td className="td text-xs">{u.createur ? <>{u.createur.nomComplet}<div className="font-mono text-slate-500">{u.createur.username}</div></> : "—"}</td>
              <td className="td text-xs">{[u.telephone, u.email].filter(Boolean).map((c) => <div key={c}>{c}</div>)}{!u.telephone && !u.email && "—"}</td>
              <td className="td whitespace-nowrap text-xs">{fmtConnexion(u.derniereConnexion)}</td>
              <td className="td">{u.totpActif ? <Badge tone="green">Activée</Badge> : <Badge>Non activée</Badge>}</td>
              <td className="td">{u.actif ? <Badge tone="green">Actif</Badge> : <Badge tone="red">Suspendu</Badge>}{u.motifSuspension && <div className="mt-1 text-xs text-slate-500">{u.motifSuspension}</div>}</td>
              {canManage && <td className="td"><UserActions id={u.id} actif={u.actif} username={u.username} canDelete={canDelete} activityHref={canAudit ? `/audit?username=${encodeURIComponent(u.username)}` : undefined} /></td>}
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
