"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fieldErrors, useApiAction } from "@/hooks/use-api";

export function PasswordForm() {
  const router = useRouter();
  const { pending, error, run } = useApiAction();
  const [ok, setOk] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = await run("/api/auth/password", { body: { currentPassword: f.get("currentPassword"), newPassword: f.get("newPassword") } });
    if (r.ok) { setOk(true); (e.target as HTMLFormElement).reset(); router.refresh(); }
  }
  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-semibold">Changer le mot de passe</h2>
      <div><label className="label">Mot de passe actuel</label><input name="currentPassword" type="password" className="field" autoComplete="current-password" required /></div>
      <div><label className="label">Nouveau mot de passe (12 caractères minimum, 3 types de caractères)</label><input name="newPassword" type="password" className="field" autoComplete="new-password" required minLength={12} /></div>
      {error && <p role="alert" className="text-sm text-red-700">{fieldErrors(error)}</p>}
      {ok && <p role="status" className="text-sm text-green-700">Mot de passe modifié. Vos autres sessions ont été fermées.</p>}
      <button className="btn btn-primary" disabled={pending}>Enregistrer</button>
    </form>
  );
}

export function MfaPanel({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const setup = useApiAction();
  const enable = useApiAction();
  const [data, setData] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  if (enabled) return <div className="card"><h2 className="font-semibold">Authentification multifacteur</h2><p className="mt-1 text-sm text-green-700">Activée.</p></div>;
  return (
    <div className="card space-y-3">
      <h2 className="font-semibold">Authentification multifacteur (TOTP)</h2>
      {!data ? (
        <button className="btn btn-primary" disabled={setup.pending} onClick={async () => { const r = await setup.run<{ secret: string; qrDataUrl: string }>("/api/auth/mfa/setup", { method: "POST", body: {} }); if (r.ok) setData(r.data); }}>Configurer</button>
      ) : (
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); const code = String(new FormData(e.currentTarget).get("code") ?? ""); const r = await enable.run("/api/auth/mfa/enable", { body: { code } }); if (r.ok) router.refresh(); }}>
          <p className="text-sm text-slate-600">Scannez ce code avec une application d'authentification (FreeOTP, Aegis, Google Authenticator…), puis saisissez le code à 6 chiffres.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.qrDataUrl} alt="QR code d'enrôlement MFA" width={180} height={180} />
          <p className="text-xs text-slate-500">Clé manuelle : <code className="font-mono">{data.secret}</code></p>
          <input name="code" className="field max-w-40" inputMode="numeric" pattern="\d{6}" required placeholder="000000" />
          {enable.error && <p role="alert" className="text-sm text-red-700">{fieldErrors(enable.error)}</p>}
          <button className="btn btn-primary" disabled={enable.pending}>Activer</button>
        </form>
      )}
      {setup.error && <p role="alert" className="text-sm text-red-700">{fieldErrors(setup.error)}</p>}
    </div>
  );
}
