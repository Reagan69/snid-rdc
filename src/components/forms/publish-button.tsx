"use client";
import { useRouter } from "next/navigation";
import { fieldErrors, useApiAction } from "@/hooks/use-api";

export function PublishButton({ scrutinId, circonscriptionId }: { scrutinId: string; circonscriptionId: string }) {
  const router = useRouter();
  const { pending, error, run } = useApiAction();
  async function go() {
    if (!window.confirm("Publier ces résultats ? Ils seront affichés publiquement et consultables par les candidats.")) return;
    const r = await run(`/api/scrutins/${scrutinId}/resultats`, { body: { circonscriptionId } });
    if (r.ok) router.refresh();
  }
  return (
    <div>
      <button className="btn btn-primary" disabled={pending} onClick={go}>Publier</button>
      {error && <p role="alert" className="text-xs text-red-700">{fieldErrors(error)}</p>}
    </div>
  );
}
