"use client";
import { useRouter } from "next/navigation";
import { fieldErrors, useApiAction } from "@/hooks/use-api";
import { TYPES_SCRUTIN, TYPE_LABELS } from "@/modules/elections/rules";

export function ScrutinForm() {
  const router = useRouter();
  const { pending, error, run } = useApiAction();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const g = (k: string) => String(f.get(k) ?? "").trim();
    const r = await run("/api/scrutins", { body: { code: g("code"), libelle: g("libelle"), type: g("type"), dateScrutin: g("dateScrutin") } });
    if (r.ok) { form.reset(); router.refresh(); }
  }
  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-semibold">Créer un scrutin</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <div><label className="label" htmlFor="sc-code">Code</label><input id="sc-code" name="code" className="field" required placeholder="LEG-2028" /></div>
        <div><label className="label" htmlFor="sc-type">Type</label>
          <select id="sc-type" name="type" className="field" required>{TYPES_SCRUTIN.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}</select></div>
        <div><label className="label" htmlFor="sc-lib">Libellé</label><input id="sc-lib" name="libelle" className="field" required minLength={5} maxLength={120} /></div>
        <div><label className="label" htmlFor="sc-date">Date du scrutin</label><input id="sc-date" name="dateScrutin" type="date" className="field" required /></div>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{fieldErrors(error)}</p>}
      <button className="btn btn-primary" disabled={pending}>{pending ? "Création…" : "Créer le scrutin"}</button>
    </form>
  );
}
