"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fieldErrors, useApiAction } from "@/hooks/use-api";

/**
 * Actions sur un compte. Courantes : suspendre / réactiver, activité. Sensibles, dans « Plus » : réinitialisations, suppression.
 * `activityHref` : journal d'audit filtré sur ce compte (supervision). `canDelete` : administrateur seulement.
 */
export function UserActions({ id, actif, username, activityHref, canDelete = false }: { id: string; actif: boolean; username?: string; activityHref?: string; canDelete?: boolean }) {
  const router = useRouter();
  const { pending, error, run } = useApiAction();
  const [pwd, setPwd] = useState<string | null>(null);

  async function act(body: Record<string, unknown>) {
    const r = await run<{ motDePasseInitial?: string }>(`/api/utilisateurs/${id}`, { method: "PATCH", body });
    if (r.ok) { setPwd(r.data.motDePasseInitial ?? null); router.refresh(); }
  }
  const item = "w-full rounded-lg px-2.5 py-1.5 text-left text-[13px] hover:bg-slate-100 disabled:opacity-50";

  return (
    <div className="min-w-44 space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {actif ? (
          <button className="btn btn-sm" disabled={pending} onClick={() => { const motif = window.prompt("Motif de la suspension (5 caractères minimum) :"); if (motif && motif.trim().length >= 5) void act({ action: "SUSPENDRE", motif: motif.trim() }); }}>Suspendre</button>
        ) : (
          <button className="btn btn-sm" disabled={pending} onClick={() => act({ action: "REACTIVER" })}>Réactiver</button>
        )}
        {activityHref && <Link className="btn btn-sm" href={activityHref}>Activité</Link>}
      </div>
      <details className="group">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[13px] font-medium text-slate-600 hover:text-slate-900 [&::-webkit-details-marker]:hidden">
          Plus <span className="transition-transform group-open:rotate-180" aria-hidden>▾</span>
        </summary>
        <div className="mt-1.5 rounded-xl border border-slate-200 bg-white p-1">
          <button className={item} disabled={pending} onClick={() => { if (window.confirm("Générer un nouveau mot de passe temporaire ? Les sessions ouvertes seront fermées.")) void act({ action: "REINITIALISER_MOT_DE_PASSE" }); }}>Réinitialiser le mot de passe</button>
          <button className={item} disabled={pending} onClick={() => { if (window.confirm("Réinitialiser l'authentification multifacteur de ce compte ?")) void act({ action: "REINITIALISER_MFA" }); }}>Réinitialiser la double authentification</button>
          {canDelete && (
            <button className={`${item} font-semibold text-red-700 hover:bg-red-50`} disabled={pending} onClick={() => {
              const nom = username ? ` « ${username} »` : "";
              if (!window.confirm(`Supprimer le compte${nom} ?\n\nS'il n'a jamais agi (aucune déclaration ni carte), il sera effacé définitivement. Sinon il sera archivé : connexion impossible, retiré des listes, historique conservé pour l'audit.\n\nCette action est journalisée.`)) return;
              const motif = window.prompt("Motif de la suppression (5 caractères minimum) :");
              if (motif && motif.trim().length >= 5) void act({ action: "SUPPRIMER", motif: motif.trim() });
            }}>Supprimer le compte</button>
          )}
        </div>
      </details>
      {pwd && <p role="status" className="text-xs text-green-800">Nouveau mot de passe temporaire (une seule fois) : <code className="font-mono">{pwd}</code></p>}
      {error && <p role="alert" className="text-xs text-red-700">{fieldErrors(error)}</p>}
    </div>
  );
}
