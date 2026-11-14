"use client";
import { useState } from "react";
import { fieldErrors, useApiAction } from "@/hooks/use-api";
import { Niu } from "@/components/ui/niu";

interface Res { niu: string; formatValide: boolean; visible?: boolean; statut?: string; commune?: string; initiales?: string }

export function VerifyNiuForm() {
  const { pending, error, run } = useApiAction();
  const [res, setRes] = useState<Res | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const niu = String(new FormData(e.currentTarget).get("niu") ?? "");
    const r = await run<Res>("/api/niu/verifier", { body: { niu } });
    setRes(r.ok ? r.data : null);
  }
  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="card flex flex-wrap items-end gap-3">
        <div className="min-w-60 flex-1"><label className="label" htmlFor="niu">NIU (saisi ou lu sur le QR)</label><input id="niu" name="niu" className="field" required /></div>
        <button className="btn btn-primary" disabled={pending}>Vérifier</button>
      </form>
      {error && <p role="alert" className="text-sm text-red-700">{fieldErrors(error)}</p>}
      {res && (
        <div className="card text-sm" role="status">
          <p className="mb-1"><Niu niu={res.niu} size="lg" /></p>
          {!res.formatValide && <p className="text-red-700">Format invalide.</p>}
          {res.formatValide && res.visible === false && <p className="text-amber-700">Format valide. Aucun dossier visible dans votre périmètre.</p>}
          {res.visible && <p className="text-green-700">Dossier trouvé : {res.initiales} · {res.commune} · {res.statut}</p>}
        </div>
      )}
    </div>
  );
}
