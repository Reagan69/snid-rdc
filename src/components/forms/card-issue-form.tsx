"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fieldErrors, useApiAction } from "@/hooks/use-api";

export function CardIssueForm() {
  const router = useRouter();
  const { pending, error, run } = useApiAction();
  const [ok, setOk] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const niu = String(new FormData(e.currentTarget).get("niu") ?? "");
    const r = await run<{ numero: string }>("/api/cartes", { body: { niu } });
    if (r.ok) { setOk(r.data.numero); (e.target as HTMLFormElement).reset(); router.refresh(); }
  }
  return (
    <form onSubmit={submit} className="card flex flex-wrap items-end gap-3">
      <div className="min-w-60 flex-1"><label className="label" htmlFor="niu">NIU du citoyen</label><input id="niu" name="niu" className="field" required placeholder="CD-01-12-05-0003-00027" /></div>
      <button className="btn btn-primary" disabled={pending}>{pending ? "Émission…" : "Délivrer une carte"}</button>
      {error && <p role="alert" className="w-full text-sm text-red-700">{fieldErrors(error)}</p>}
      {ok && <p role="status" className="w-full text-sm text-green-700">Carte {ok} délivrée (l'éventuelle carte active précédente est remplacée).</p>}
    </form>
  );
}
