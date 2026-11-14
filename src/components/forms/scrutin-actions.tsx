"use client";
import { useRouter } from "next/navigation";
import { fieldErrors, useApiAction } from "@/hooks/use-api";

export function ScrutinActions({ id, statut }: { id: string; statut: "PLANIFIE" | "OUVERT" | "CLOS" }) {
  const router = useRouter();
  const { pending, error, run } = useApiAction();
  if (statut === "CLOS") return null;
  const action = statut === "PLANIFIE" ? "OUVRIR" : "CLORE";
  async function go() {
    const msg = action === "OUVRIR"
      ? "Ouvrir le scrutin ? L'espace électeur deviendra visible et les candidatures ne seront plus reçues."
      : "Clore le scrutin ? L'espace électeur redeviendra invisible. Cette action est définitive.";
    if (!window.confirm(msg)) return;
    const r = await run(`/api/scrutins/${id}`, { method: "PATCH", body: { action } });
    if (r.ok) router.refresh();
  }
  return (
    <div className="space-y-1">
      <button className={action === "CLORE" ? "btn btn-danger" : "btn btn-primary"} disabled={pending} onClick={go}>
        {action === "OUVRIR" ? "Ouvrir le scrutin" : "Clore le scrutin"}
      </button>
      {error && <p role="alert" className="text-sm text-red-700">{fieldErrors(error)}</p>}
    </div>
  );
}
