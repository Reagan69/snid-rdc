import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { PageTitle, Panel } from "@/components/ui/page";
import { ValidationDirecteForm } from "@/components/forms/validation-directe-form";
import type { DeclarationType } from "@/modules/settings/settings";

export interface ReglagesData {
  validationDirecte: DeclarationType[];
  modifieLe: Date | null;
  modifiePar: { nomComplet: string; username: string } | null;
  nbValidationsDirectes: number;
}

export function ReglagesView({ s, canManage, canAudit }: { s: ReglagesData; canManage: boolean; canAudit: boolean }) {
  const actif = s.validationDirecte.length > 0;
  return (
    <>
      <PageTitle title="Réglages" subtitle="Paramètres de fonctionnement du SNID. Chaque modification est journalisée." />

      <Panel title="Validation des déclarations des chefs de rue" elevated>
        <p className="max-w-prose text-slate-700">
          Par défaut, une déclaration déposée par un chef de rue suit la chaîne de validation : chef de quartier, chef de bureau, bourgmestre, puis administrateur.
          Pour les types cochés ci-dessous, la déclaration est <b>validée immédiatement</b> au dépôt, sans l'autorisation de la hiérarchie.
        </p>

        <p className={`mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${actif ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}>
          {actif ? `Validation directe activée pour ${s.validationDirecte.length} type(s)` : "Chaîne de validation complète (réglage par défaut)"}
        </p>

        <div className="mt-6"><ValidationDirecteForm initial={s.validationDirecte} canManage={canManage} /></div>

        <div className="mt-6 flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            Ce réglage retire le second regard sur les déclarations : une erreur ou une fraude d'un chef de rue n'est plus arrêtée avant l'attribution du NIU.
            Les contrôles de doublons restent actifs, et chaque validation directe est signalée dans la liste des déclarations et tracée à part dans le journal d'audit.
            Le réglage s'applique à tous les chefs de rue, immédiatement.
          </p>
        </div>

        <dl className="mt-6 grid gap-x-8 gap-y-3 border-t border-slate-100 pt-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Déclarations déjà validées directement</dt>
            <dd className="font-semibold text-slate-900">
              {s.nbValidationsDirectes.toLocaleString("fr-FR")}
              {s.nbValidationsDirectes > 0 && canAudit && <Link href="/audit?action=VALIDEE_DIRECTE" className="ml-3 font-medium text-sky-800 underline decoration-sky-200 underline-offset-4">Voir le journal</Link>}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Dernière modification</dt>
            <dd className="font-semibold text-slate-900">
              {s.modifieLe
                ? <>{s.modifieLe.toLocaleString("fr-FR", { timeZone: "Africa/Kinshasa", dateStyle: "medium", timeStyle: "short" })}{s.modifiePar ? `, par ${s.modifiePar.nomComplet}` : ""}</>
                : "Jamais modifié"}
            </dd>
          </div>
        </dl>
      </Panel>
    </>
  );
}
