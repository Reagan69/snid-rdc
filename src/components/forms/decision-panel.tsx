"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fieldErrors, useApiAction } from "@/hooks/use-api";

export function DecisionPanel({ id }: { id: string }) {
  const router = useRouter();
  const { pending, error, run } = useApiAction();
  const [rejecting, setRejecting] = useState(false);
  const [motif, setMotif] = useState("");

  async function decide(decision: "APPROUVEE" | "REJETEE") {
    const r = await run(`/api/declarations/${id}/decision`, { body: { decision, ...(decision === "REJETEE" ? { motif } : {}) } });
    if (r.ok) router.refresh();
  }
  return (
    <div className="space-y-2">
      {!rejecting ? (
        <div className="flex gap-2">
          <button className="btn btn-primary" disabled={pending} onClick={() => decide("APPROUVEE")}>Approuver</button>
          <button className="btn" disabled={pending} onClick={() => setRejecting(true)}>Rejeter…</button>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="label" htmlFor={`m-${id}`}>Motif du rejet (obligatoire)</label>
          <textarea id={`m-${id}`} className="field" rows={2} value={motif} onChange={(e) => setMotif(e.target.value)} maxLength={300} />
          <div className="flex gap-2">
            <button className="btn btn-danger" disabled={pending || motif.trim().length < 5} onClick={() => decide("REJETEE")}>Confirmer le rejet</button>
            <button className="btn" onClick={() => setRejecting(false)}>Annuler</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{fieldErrors(error)}</p>}
    </div>
  );
}
