import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { can } from "@/modules/roles/permissions";
import { listScrutins } from "@/modules/elections/services/election.service";
import { STATUT_SCRUTIN_LABELS, TYPE_LABELS, type StatutScrutin, type TypeScrutin } from "@/modules/elections/rules";
import { Badge } from "@/components/ui/badge";
import { Empty, PageTitle, Table } from "@/components/ui/page";
import { ScrutinForm } from "@/components/forms/scrutin-form";
import { formatDateFr } from "@/lib/dates";

export const metadata = { title: "Scrutins" };
const TONE = { PLANIFIE: "slate", OUVERT: "green", CLOS: "sky" } as const;

export default async function ElectionsPage() {
  const ctx = await requireAuth();
  const scrutins = await listScrutins(ctx);
  return (
    <>
      <PageTitle title="Scrutins" subtitle="Cycle d'un scrutin : planifié (candidatures) → ouvert (espace électeur visible) → clos (résultats)." />
      {can(ctx.user.roleCode, "elections:manage") && <div className="mb-4"><ScrutinForm /></div>}
      {scrutins.length === 0 ? <Empty>Aucun scrutin.</Empty> : (
        <Table head={["Code", "Libellé", "Type", "Date", "Circonscriptions", "Candidatures", "Statut", ""]}>
          {scrutins.map((s) => (
            <tr key={s.id}>
              <td className="td font-mono">{s.code}</td>
              <td className="td">{s.libelle}</td>
              <td className="td">{TYPE_LABELS[s.type as TypeScrutin]}</td>
              <td className="td">{formatDateFr(s.dateScrutin)}</td>
              <td className="td">{s._count.circonscriptions}</td>
              <td className="td">{s._count.candidatures}</td>
              <td className="td"><Badge tone={TONE[s.statut as StatutScrutin]}>{STATUT_SCRUTIN_LABELS[s.statut as StatutScrutin]}</Badge></td>
              <td className="td"><Link className="btn" href={`/elections/${s.id}`}>Ouvrir</Link></td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
