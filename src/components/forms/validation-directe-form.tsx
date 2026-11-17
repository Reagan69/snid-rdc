"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fieldErrors, useApiAction } from "@/hooks/use-api";

type DType = "IDENTIFICATION" | "NAISSANCE" | "DECES" | "DEPART" | "ARRIVEE";

const OPTIONS: { type: DType; label: string; effet: string }[] = [
  { type: "IDENTIFICATION", label: "Identification", effet: "Crée le dossier du citoyen et lui attribue un NIU." },
  { type: "NAISSANCE", label: "Naissance", effet: "Crée le dossier du citoyen et lui attribue un NIU." },
  { type: "DECES", label: "Décès", effet: "Déclare le citoyen décédé et révoque ses cartes actives." },
  { type: "DEPART", label: "Départ", effet: "Passe le citoyen au statut « en déplacement »." },
  { type: "ARRIVEE", label: "Arrivée", effet: "Rattache le citoyen à la rue du chef de rue." },
];

export function ValidationDirecteForm({ initial, canManage }: { initial: DType[]; canManage: boolean }) {
  const router = useRouter();
  const { pending, error, run } = useApiAction();
  const [sel, setSel] = useState<Set<DType>>(new Set(initial));
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    const r = await run("/api/reglages", { method: "PATCH", body: { types: [...sel] } });
    if (r.ok) { setSaved(true); router.refresh(); }
  }
  const toggle = (t: DType) => { setSaved(false); setSel((s) => { const n = new Set(s); if (n.has(t)) n.delete(t); else n.add(t); return n; }); };

  return (
    <form onSubmit={submit} className="space-y-5">
      <fieldset disabled={!canManage || pending} className="space-y-2">
        <legend className="mb-2 text-sm font-medium text-slate-700">Types de déclaration validés directement par les chefs de rue</legend>
        {OPTIONS.map((o) => (
          <label key={o.type} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${sel.has(o.type) ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
            <input type="checkbox" className="mt-1 h-4 w-4 accent-sky-700" checked={sel.has(o.type)} onChange={() => toggle(o.type)} />
            <span>
              <span className="block text-sm font-semibold text-slate-900">{o.label}</span>
              <span className="block text-sm text-slate-600">{o.effet}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-700">{fieldErrors(error)}</p>}
      {saved && <p role="status" className="text-sm text-green-700">Réglage enregistré. Il s'applique aux prochains dépôts.</p>}
      {canManage && <button className="btn btn-primary" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer le réglage"}</button>}
    </form>
  );
}
