"use client";
import { useRouter } from "next/navigation";
import { fieldErrors, useApiAction } from "@/hooks/use-api";

export function BiometricButton({ citoyenId }: { citoyenId: string }) {
  const router = useRouter();
  const { pending, error, run } = useApiAction();
  return (
    <div className="space-y-1">
      <button className="btn" disabled={pending} onClick={async () => { const r = await run(`/api/citoyens/${citoyenId}/biometrie`, { body: { mode: "SIMULATION" } }); if (r.ok) router.refresh(); }}>
        Enregistrer une capture SIMULÉE
      </button>
      <p className="text-xs text-slate-500">Démonstration : aucune donnée biométrique réelle n'est collectée ni stockée.</p>
      {error && <p role="alert" className="text-xs text-red-700">{fieldErrors(error)}</p>}
    </div>
  );
}
