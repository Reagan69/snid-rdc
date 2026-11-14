"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fieldErrors, useApiAction } from "@/hooks/use-api";
import { GeoPicker, type GeoValue } from "@/components/forms/geo-picker";

export interface RoleOption { code: string; label: string; level: "NATIONAL" | "PROVINCE" | "COMMUNE" | "QUARTIER" | "RUE" }

export function CreateUserForm({ roles, title = "Créer un compte", circonscriptions = [] }: { roles: RoleOption[]; title?: string; circonscriptions?: { id: string; label: string }[] }) {
  const router = useRouter();
  const { pending, error, run } = useApiAction();
  const [role, setRole] = useState<RoleOption>(roles[0] as RoleOption);
  const [geo, setGeo] = useState<GeoValue>({});
  const [circ, setCirc] = useState("");
  const [created, setCreated] = useState<{ username: string; pwd?: string } | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const g = (k: string) => String(f.get(k) ?? "").trim();
    const opt = (k: string) => (g(k) ? { [k]: g(k) } : {});
    const clean = Object.fromEntries(Object.entries(geo).filter(([, v]) => v));
    const r = await run<{ username: string; motDePasseInitial?: string }>("/api/utilisateurs", {
      body: { nomComplet: g("nomComplet"), username: g("username"), roleCode: role.code, ...(role.code === "CIRCONSCRIPTION" ? { circonscriptionId: circ } : clean), ...opt("telephone"), ...opt("email"), ...opt("dateDebutFonction"), ...opt("password") },
    });
    if (r.ok) { setCreated({ username: r.data.username, pwd: r.data.motDePasseInitial }); (e.target as HTMLFormElement).reset(); router.refresh(); }
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-semibold">{title}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {roles.length > 1 && (
          <div><label className="label">Rôle</label>
            <select className="field" value={role.code} onChange={(e) => { setRole(roles.find((r) => r.code === e.target.value) as RoleOption); setGeo({}); setCirc(""); }}>{roles.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}</select></div>
        )}
        <div><label className="label">Nom complet</label><input name="nomComplet" className="field" required minLength={3} maxLength={80} /></div>
        <div><label className="label">Identifiant</label><input name="username" className="field" required pattern="[a-z0-9][a-z0-9._\-]{2,39}" title="3 à 40 caractères : a-z, 0-9, . _ -" /></div>
        <div><label className="label">Mot de passe initial (facultatif)</label><input name="password" type="password" className="field" autoComplete="new-password" placeholder="Généré automatiquement si vide" /></div>
        <div><label className="label">Téléphone (facultatif)</label><input name="telephone" className="field" inputMode="tel" /></div>
        <div><label className="label">E-mail (facultatif)</label><input name="email" type="email" className="field" /></div>
        <div><label className="label">Prise de fonction (facultatif)</label><input name="dateDebutFonction" type="date" className="field" /></div>
      </div>
      {role.code === "CIRCONSCRIPTION" ? (
        <div><label className="label" htmlFor="circ">Circonscription électorale</label>
          <select id="circ" className="field" required value={circ} onChange={(e) => setCirc(e.target.value)}>
            <option value="">— Choisir —</option>
            {circonscriptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select></div>
      ) : role.level !== "NATIONAL" && <GeoPicker key={role.code} level={role.level} onChange={setGeo} />}
      {error && <p role="alert" className="text-sm text-red-700">{fieldErrors(error)}</p>}
      {created && (
        <div role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800">
          Compte <b>{created.username}</b> créé.
          {created.pwd && <> Mot de passe initial (affiché une seule fois, à transmettre de façon sécurisée) : <code className="rounded bg-white px-1 font-mono">{created.pwd}</code></>}
          {" "}L'utilisateur devra le changer à sa première connexion.
        </div>
      )}
      <button className="btn btn-primary" disabled={pending}>{pending ? "Création…" : "Créer le compte"}</button>
    </form>
  );
}
