import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";
import { verifyCardToken } from "@/modules/cards/services/card.service";

export const metadata = { title: "Vérification de carte" };
const RAISONS: Record<string, string> = {
  SIGNATURE_INVALIDE: "Code non reconnu : la carte est peut-être falsifiée.",
  AUCUNE_CARTE_ACTIVE: "Aucune carte active pour ce numéro.",
  TITULAIRE_DECEDE: "Le titulaire est déclaré décédé.",
  CARTE_EXPIREE: "La carte est expirée.",
};

export default async function VerifierPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const rl = await rateLimit(`verif-page:${ip}`, 30, 60);
  const r = rl.ok ? await verifyCardToken(token) : null;
  return (
    <main className="mx-auto max-w-sm p-6">
      <div className="card text-center">
        <h1 className="text-lg font-semibold">Vérification de carte d'identité</h1>
        {!r && <p className="mt-3 text-sm text-amber-700">Trop de vérifications. Réessayez dans une minute.</p>}
        {r?.valide && (
          <>
            <p className="mt-3 text-2xl font-bold text-green-700">Carte valide</p>
            <p className="text-sm text-slate-600">Titulaire : {r.initiales} · valable jusqu'au {new Date(r.expiration).toLocaleDateString("fr-FR", { timeZone: "UTC" })}</p>
          </>
        )}
        {r && !r.valide && <><p className="mt-3 text-2xl font-bold text-red-700">Carte non valide</p><p className="text-sm text-slate-600">{RAISONS[r.raison]}</p></>}
        <p className="mt-4 text-xs text-slate-500">Seules la validité et les initiales sont affichées, pour protéger les données personnelles.</p>
      </div>
    </main>
  );
}
