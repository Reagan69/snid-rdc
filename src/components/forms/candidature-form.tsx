"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fieldErrors, useApiAction } from "@/hooks/use-api";

export function CandidatureForm({ scrutins, note }: { scrutins: { id: string; label: string }[]; note: string }) {
  const router = useRouter();
  const { pending, error, run } = useApiAction();
  const [ok, setOk] = useState<string | null>(null);
  if (scrutins.length === 0) return <p className="card text-sm text-slate-600">Aucun scrutin planifié n'accepte actuellement de candidatures de votre part.</p>;
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const parti = String(f.get("parti") ?? "").trim();
    const r = await run<{ numero: string; candidat: string }>("/api/candidatures", { body: { scrutinId: String(f.get("scrutinId")), niu: String(f.get("niu")), ...(parti ? { parti } : {}) } });
    if (r.ok) { setOk(`Candidature ${r.data.numero} enregistrée : ${r.data.candidat}.`); form.reset(); router.refresh(); } else setOk(null);
  }
  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-semibold">Enregistrer une candidature</h2>
      <p className="text-xs text-slate-500">{note}</p>
      <div className="grid gap-3 md:grid-cols-3">
        <div><label className="label" htmlFor="ca-s">Scrutin</label>
          <select id="ca-s" name="scrutinId" className="field" required defaultValue="">
            <option value="" disabled>— Choisir —</option>
            {scrutins.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select></div>
        <div><label className="label" htmlFor="ca-n">NIU du candidat</label><input id="ca-n" name="niu" className="field font-mono" required placeholder="CD-01-05-03-0003-00027" autoComplete="off" /></div>
        <div><label className="label" htmlFor="ca-p">Parti / regroupement (facultatif)</label><input id="ca-p" name="parti" className="field" maxLength={80} /></div>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{fieldErrors(error)}</p>}
      {ok && <p role="status" className="rounded-md bg-green-50 p-2 text-sm text-green-800">{ok}</p>}
      <button className="btn btn-primary" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer la candidature"}</button>
    </form>
  );
}
