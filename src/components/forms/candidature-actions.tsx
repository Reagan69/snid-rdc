"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fieldErrors, useApiAction } from "@/hooks/use-api";

export function CandidatureActions({ id, statut, scrutinPlanifie, hasAccount, canDecide }: {
  id: string; statut: "RECUE" | "RECEVABLE" | "REJETEE"; scrutinPlanifie: boolean; hasAccount: boolean; canDecide: boolean;
}) {
  const router = useRouter();
  const { pending, error, run } = useApiAction();
  const [rejecting, setRejecting] = useState(false);
  const [motif, setMotif] = useState("");
  const [creds, setCreds] = useState<{ username: string; pwd: string } | null>(null);
  if (!canDecide) return null;

  async function decide(decision: "RECEVABLE" | "REJETEE") {
    const r = await run(`/api/candidatures/${id}`, { method: "PATCH", body: { decision, ...(decision === "REJETEE" ? { motif } : {}) } });
    if (r.ok) router.refresh();
  }
  async function account() {
    const r = await run<{ username: string; motDePasseInitial: string }>(`/api/candidatures/${id}/compte`, { method: "POST", body: {} });
    if (r.ok) { setCreds({ username: r.data.username, pwd: r.data.motDePasseInitial }); router.refresh(); }
  }
  return (
    <div className="space-y-2">
      {statut === "RECUE" && scrutinPlanifie && (!rejecting ? (
        <div className="flex gap-2">
          <button className="btn btn-primary" disabled={pending} onClick={() => decide("RECEVABLE")}>Recevable</button>
          <button className="btn" disabled={pending} onClick={() => setRejecting(true)}>Rejeter…</button>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="label" htmlFor={`mc-${id}`}>Motif du rejet (obligatoire)</label>
          <textarea id={`mc-${id}`} className="field" rows={2} maxLength={300} value={motif} onChange={(e) => setMotif(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn btn-danger" disabled={pending || motif.trim().length < 5} onClick={() => decide("REJETEE")}>Confirmer le rejet</button>
            <button className="btn" onClick={() => setRejecting(false)}>Annuler</button>
          </div>
        </div>
      ))}
      {statut === "RECEVABLE" && !hasAccount && !creds && <button className="btn" disabled={pending} onClick={account}>Créer le compte candidat</button>}
      {creds && (
        <div role="status" className="rounded-md bg-green-50 p-2 text-xs text-green-800">
          Compte <b>{creds.username}</b> créé. Mot de passe initial (affiché une seule fois) : <code className="rounded bg-white px-1 font-mono">{creds.pwd}</code>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{fieldErrors(error)}</p>}
    </div>
  );
}
