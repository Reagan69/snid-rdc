"use client";
import { useRouter } from "next/navigation";
import { fieldErrors, useApiAction } from "@/hooks/use-api";

export function CirconscriptionForm({ provinces }: { provinces: { id: string; nom: string }[] }) {
  const router = useRouter();
  const { pending, error, run } = useApiAction();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const r = await run("/api/circonscriptions", { body: { provinceId: String(f.get("provinceId")), code: Number(f.get("code")), nom: String(f.get("nom")).trim() } });
    if (r.ok) { form.reset(); router.refresh(); }
  }
  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-semibold">Créer une circonscription électorale</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <div><label className="label" htmlFor="ci-p">Province</label>
          <select id="ci-p" name="provinceId" className="field" required defaultValue="">
            <option value="" disabled>— Choisir —</option>
            {provinces.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </select></div>
        <div><label className="label" htmlFor="ci-c">Code (unique dans la province)</label><input id="ci-c" name="code" type="number" min={1} max={999} className="field" required /></div>
        <div><label className="label" htmlFor="ci-n">Nom</label><input id="ci-n" name="nom" className="field" required minLength={3} maxLength={80} /></div>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{fieldErrors(error)}</p>}
      <button className="btn btn-primary" disabled={pending}>{pending ? "Création…" : "Créer la circonscription"}</button>
    </form>
  );
}
