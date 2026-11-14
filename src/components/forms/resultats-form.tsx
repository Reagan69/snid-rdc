"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fieldErrors, useApiAction } from "@/hooks/use-api";

interface Initial { inscrits: number; votants: number; nuls: number; voix: Record<string, number> }

export function ResultatsForm({ scrutinId, attendus, initial }: { scrutinId: string; attendus: { id: string; label: string }[]; initial: Initial | null }) {
  const router = useRouter();
  const { pending, error, run } = useApiAction();
  const [done, setDone] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const n = (k: string) => Number(f.get(k) || 0);
    const r = await run(`/api/scrutins/${scrutinId}/resultats`, {
      method: "PUT",
      body: { inscrits: n("inscrits"), votants: n("votants"), nuls: n("nuls"), voix: attendus.map((a) => ({ candidatureId: a.id, voix: n(`v-${a.id}`) })) },
    });
    setDone(r.ok);
    if (r.ok) router.refresh();
  }
  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-semibold">Saisie des résultats de ma circonscription</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className="label" htmlFor="r-i">Inscrits</label><input id="r-i" name="inscrits" type="number" min={0} className="field" required defaultValue={initial?.inscrits} /></div>
        <div><label className="label" htmlFor="r-v">Votants</label><input id="r-v" name="votants" type="number" min={0} className="field" required defaultValue={initial?.votants} /></div>
        <div><label className="label" htmlFor="r-n">Bulletins nuls</label><input id="r-n" name="nuls" type="number" min={0} className="field" required defaultValue={initial?.nuls ?? 0} /></div>
      </div>
      {attendus.length === 0 ? <p className="text-sm text-slate-600">Aucun candidat recevable dans votre circonscription.</p> : (
        <div className="space-y-2">
          {attendus.map((a) => (
            <div key={a.id} className="grid grid-cols-[1fr_130px] items-center gap-2">
              <label className="text-sm" htmlFor={`v-${a.id}`}>{a.label}</label>
              <input id={`v-${a.id}`} name={`v-${a.id}`} type="number" min={0} className="field" defaultValue={initial?.voix[a.id] ?? 0} />
            </div>
          ))}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{fieldErrors(error)}</p>}
      {done && <p role="status" className="rounded-md bg-green-50 p-2 text-sm text-green-800">Résultats enregistrés. La CENI les publiera après contrôle.</p>}
      <button className="btn btn-primary" disabled={pending || attendus.length === 0}>{pending ? "Enregistrement…" : initial ? "Mettre à jour la saisie" : "Enregistrer les résultats"}</button>
    </form>
  );
}
