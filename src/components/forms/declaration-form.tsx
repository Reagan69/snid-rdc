"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fieldErrors, useApiAction } from "@/hooks/use-api";

type DType = "IDENTIFICATION" | "NAISSANCE" | "DECES" | "DEPART" | "ARRIVEE";
const LABELS: Record<DType, string> = { IDENTIFICATION: "Identification", NAISSANCE: "Naissance", DECES: "Décès", DEPART: "Départ", ARRIVEE: "Arrivée" };

export function DeclarationForm({ types }: { types: DType[] }) {
  const router = useRouter();
  const { pending, error, run } = useApiAction();
  const [type, setType] = useState<DType>(types[0] as DType);
  const [doublon, setDoublon] = useState(false);
  const [done, setDone] = useState<{ numero: string; validee: boolean; niu: string | null } | null>(null);
  const isPerson = type === "IDENTIFICATION" || type === "NAISSANCE";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const g = (k: string) => String(f.get(k) ?? "").trim();
    const opt = (k: string) => (g(k) ? { [k]: g(k) } : {});
    let body: Record<string, unknown>;
    if (isPerson) {
      body = { type, personne: { nom: g("nom"), postnom: g("postnom"), prenom: g("prenom"), dateNaissance: g("dateNaissance"), sexe: g("sexe"), ...opt("lieuNaissance"), ...opt("adresse"), ...opt("pereNiu"), ...opt("mereNiu") }, ...(doublon ? { confirmerDoublon: true } : {}) };
    } else if (type === "DECES") body = { type, niu: g("niu"), dateDeces: g("date"), ...(g("detail") ? { cause: g("detail") } : {}) };
    else if (type === "DEPART") body = { type, niu: g("niu"), dateDepart: g("date"), destination: g("detail") };
    else body = { type, niu: g("niu"), dateArrivee: g("date"), provenance: g("detail") };

    const r = await run<{ numero: string; statut: string; niu: string | null }>("/api/declarations", { body });
    if (r.ok) { setDone({ numero: r.data.numero, validee: r.data.statut === "VALIDEE", niu: r.data.niu }); setDoublon(false); (e.target as HTMLFormElement).reset(); router.refresh(); }
  }

  return (
    <form onSubmit={submit} className="card grid gap-3 md:grid-cols-2">
      {types.length > 1 && (
        <div className="md:col-span-2"><label className="label" htmlFor="type">Type de déclaration</label>
          <select id="type" className="field" value={type} onChange={(e) => { setType(e.target.value as DType); setDone(null); }}>{types.map((t) => <option key={t} value={t}>{LABELS[t]}</option>)}</select></div>
      )}
      {isPerson ? (
        <>
          <div><label className="label">Nom</label><input name="nom" className="field" required maxLength={60} /></div>
          <div><label className="label">Postnom</label><input name="postnom" className="field" required maxLength={60} /></div>
          <div><label className="label">Prénom</label><input name="prenom" className="field" required maxLength={60} /></div>
          <div><label className="label">Date de naissance</label><input name="dateNaissance" type="date" className="field" required min="1900-01-01" /></div>
          <div><label className="label">Sexe</label><select name="sexe" className="field" required><option value="">—</option><option value="M">Masculin</option><option value="F">Féminin</option></select></div>
          <div><label className="label">Lieu de naissance</label><input name="lieuNaissance" className="field" maxLength={80} /></div>
          <div className="md:col-span-2"><label className="label">Adresse</label><input name="adresse" className="field" maxLength={160} /></div>
          <div><label className="label">NIU du père (facultatif)</label><input name="pereNiu" className="field" /></div>
          <div><label className="label">NIU de la mère (facultatif)</label><input name="mereNiu" className="field" /></div>
        </>
      ) : (
        <>
          <div><label className="label">NIU du citoyen</label><input name="niu" className="field" required placeholder="CD-01-12-05-0003-00027" /></div>
          <div><label className="label">Date</label><input name="date" type="date" className="field" required /></div>
          <div className="md:col-span-2"><label className="label">{type === "DECES" ? "Cause (facultatif)" : type === "DEPART" ? "Destination" : "Provenance"}</label><input name="detail" className="field" maxLength={120} required={type !== "DECES"} /></div>
        </>
      )}
      <div className="md:col-span-2 space-y-2">
        {error && <p role="alert" className="text-sm text-red-700">{fieldErrors(error)}</p>}
        {error?.code === "DUPLICATE_SUSPECTED" && (
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={doublon} onChange={(e) => setDoublon(e.target.checked)} /> Je confirme qu'il s'agit bien d'une personne différente (homonyme).</label>
        )}
        {done && (
          <p role="status" className="text-sm text-green-700">
            {done.validee
              ? <>Déclaration {done.numero} validée immédiatement{done.niu ? <> : NIU <b className="font-mono">{done.niu}</b></> : ""}.</>
              : <>Déclaration {done.numero} enregistrée : elle suit maintenant la chaîne de validation.</>}
          </p>
        )}
        <button className="btn btn-primary" disabled={pending}>{pending ? "Envoi…" : "Déposer la déclaration"}</button>
      </div>
    </form>
  );
}
