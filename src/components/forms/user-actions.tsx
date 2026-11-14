"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fieldErrors, useApiAction } from "@/hooks/use-api";

export function UserActions({ id, actif }: { id: string; actif: boolean }) {
  const router = useRouter();
  const { pending, error, run } = useApiAction();
  const [pwd, setPwd] = useState<string | null>(null);

  async function act(body: Record<string, unknown>) {
    const r = await run<{ motDePasseInitial?: string }>(`/api/utilisateurs/${id}`, { method: "PATCH", body });
    if (r.ok) { setPwd(r.data.motDePasseInitial ?? null); router.refresh(); }
  }
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        {actif ? (
          <button className="btn" disabled={pending} onClick={() => { const motif = window.prompt("Motif de la suspension (5 caractères minimum) :"); if (motif && motif.trim().length >= 5) void act({ action: "SUSPENDRE", motif: motif.trim() }); }}>Suspendre</button>
        ) : (
          <button className="btn" disabled={pending} onClick={() => act({ action: "REACTIVER" })}>Réactiver</button>
        )}
        <button className="btn" disabled={pending} onClick={() => { if (window.confirm("Générer un nouveau mot de passe temporaire ? Les sessions ouvertes seront fermées.")) void act({ action: "REINITIALISER_MOT_DE_PASSE" }); }}>Réinit. mot de passe</button>
        <button className="btn" disabled={pending} onClick={() => { if (window.confirm("Réinitialiser l'authentification multifacteur de ce compte ?")) void act({ action: "REINITIALISER_MFA" }); }}>Réinit. MFA</button>
      </div>
      {pwd && <p role="status" className="text-xs text-green-800">Nouveau mot de passe temporaire (une seule fois) : <code className="font-mono">{pwd}</code></p>}
      {error && <p role="alert" className="text-xs text-red-700">{fieldErrors(error)}</p>}
    </div>
  );
}
