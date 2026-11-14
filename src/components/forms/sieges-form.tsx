"use client";
import { useRouter } from "next/navigation";
import { fieldErrors, useApiAction } from "@/hooks/use-api";

export function SiegesForm({ scrutinId, circonscriptions }: { scrutinId: string; circonscriptions: { id: string; label: string }[] }) {
  const router = useRouter();
  const { pending, error, run } = useApiAction();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = await run(`/api/scrutins/${scrutinId}/sieges`, { method: "PUT", body: { circonscriptionId: String(f.get("circonscriptionId")), sieges: Number(f.get("sieges")) } });
    if (r.ok) router.refresh();
  }
  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-semibold">Rattacher une circonscription et fixer ses sièges</h2>
      <div className="grid gap-3 md:grid-cols-[1fr_140px_auto] md:items-end">
        <div><label className="label" htmlFor="sg-c">Circonscription</label>
          <select id="sg-c" name="circonscriptionId" className="field" required defaultValue="">
            <option value="" disabled>— Choisir —</option>
            {circonscriptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select></div>
        <div><label className="label" htmlFor="sg-n">Sièges</label><input id="sg-n" name="sieges" type="number" min={0} max={500} defaultValue={1} className="field" required /></div>
        <button className="btn btn-primary" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
      </div>
      <p className="text-xs text-slate-500">Présidentielle : 0 siège. Législatives : 1 siège minimum. Modifiable tant que le scrutin est planifié.</p>
      {error && <p role="alert" className="text-sm text-red-700">{fieldErrors(error)}</p>}
    </form>
  );
}
