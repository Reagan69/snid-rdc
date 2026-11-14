"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiAction } from "@/hooks/use-api";

export function LoginForm() {
  const router = useRouter();
  const { pending, error, run } = useApiAction();
  const [needTotp, setNeedTotp] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const totp = String(f.get("totp") ?? "");
    const r = await run("/api/auth/login", { body: { username: f.get("username"), password: f.get("password"), ...(totp ? { totp } : {}) } });
    if (r.ok) { router.replace("/dashboard"); router.refresh(); }
    else if (r.error.code === "MFA_REQUIRED") setNeedTotp(true);
  }

  return (
    <form onSubmit={submit} className="card space-y-3" autoComplete="on">
      <div><label className="label" htmlFor="username">Identifiant</label><input id="username" name="username" className="field" autoComplete="username" required /></div>
      <div><label className="label" htmlFor="password">Mot de passe</label><input id="password" name="password" type="password" className="field" autoComplete="current-password" required /></div>
      {needTotp && <div><label className="label" htmlFor="totp">Code d'authentification (6 chiffres)</label><input id="totp" name="totp" className="field" inputMode="numeric" pattern="\d{6}" autoComplete="one-time-code" required autoFocus /></div>}
      {error && <p role="alert" className="text-sm text-red-700">{error.message}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Connexion…" : "Se connecter"}</button>
    </form>
  );
}
