"use client";
import { useActionState } from "react";
import { verifierElecteur, type ElecteurState } from "./actions";
import { TYPE_LABELS, type TypeScrutin } from "@/modules/elections/rules";

export function ElecteurForm() {
  const [state, action, pending] = useActionState<ElecteurState, FormData>(verifierElecteur, {});
  const r = state.result;
  return (
    <div className="space-y-4">
      <form action={action} className="card space-y-3">
        <div>
          <label className="label" htmlFor="niu">Votre NIU</label>
          <input id="niu" name="niu" className="field font-mono" required autoComplete="off" placeholder="CD-01-05-03-0003-00027" />
        </div>
        <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Vérification…" : "Vérifier mon inscription"}</button>
      </form>
      {state.error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      {r && !r.trouve && <p role="status" className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">NIU non reconnu. Rapprochez-vous de votre chef de rue.</p>}
      {r?.trouve && (
        <div role="status" className="card space-y-3">
          <p className="text-sm">Électeur <b>{r.initiales}</b> · {r.commune}, {r.province}</p>
          {r.scrutins.map((s) => (
            <div key={s.code} className={`rounded-md p-3 text-sm ${s.eligible ? "bg-green-50 text-green-900" : "bg-red-50 text-red-800"}`}>
              <p className="font-medium">{s.libelle} <span className="font-normal">({TYPE_LABELS[s.type as TypeScrutin]} · {new Date(s.dateScrutin).toLocaleDateString("fr-FR", { timeZone: "UTC", day: "2-digit", month: "long", year: "numeric" })})</span></p>
              {s.eligible
                ? <p>Vous pouvez voter.{s.circonscriptions.length > 0 && <> Circonscription(s) : {s.circonscriptions.join(", ")}.</>}</p>
                : <p>{s.raison}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
