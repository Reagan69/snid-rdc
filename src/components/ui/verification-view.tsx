import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/layout/brand";
import { Guilloche } from "@/components/ui/guilloche";

const RAISONS: Record<string, string> = {
  SIGNATURE_INVALIDE: "Code non reconnu : la carte est peut-être falsifiée.",
  AUCUNE_CARTE_ACTIVE: "Aucune carte active pour ce numéro.",
  TITULAIRE_DECEDE: "Le titulaire est déclaré décédé.",
  CARTE_EXPIREE: "La carte est expirée.",
};

export type VerificationResult = { valide: true; initiales: string; expiration: string | Date } | { valide: false; raison: string };

/** Page publique de vérification d'une carte : un verdict clair, sans donnée personnelle. */
export function VerificationView({ result }: { result: VerificationResult | null }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      <Guilloche className="pointer-events-none absolute -top-72 left-1/2 w-[56rem] -translate-x-1/2 text-sky-700/[0.07]" rings={20} points={140} />
      <main className="relative mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <Brand tone="light" />
        <div className="my-auto py-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-panel">
            <h1 className="font-display text-xl font-medium text-slate-700">Vérification de carte d'identité</h1>

            {!result && (
              <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Trop de vérifications en peu de temps. Réessayez dans une minute.</p>
            )}

            {result?.valide && (
              <div className="mt-6">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-100 text-green-700"><ShieldCheck className="h-8 w-8" aria-hidden /></span>
                <p className="mt-4 font-display text-3xl font-medium text-green-800">Carte valide</p>
                <div className="mt-6 flex items-center justify-center rounded-xl bg-slate-50 px-4 py-3 text-left">
                  <div>
                    <p className="text-xs text-slate-500">Titulaire (initiales)</p>
                    <p className="font-display text-xl font-medium tracking-wider text-slate-900">{result.initiales}</p>
                  </div>
                  <div className="ml-5 border-l border-slate-200 pl-5">
                    <p className="text-xs text-slate-500">Valable jusqu'au</p>
                    <p className="font-semibold text-slate-900">{new Date(result.expiration).toLocaleDateString("fr-FR", { timeZone: "UTC" })}</p>
                  </div>
                </div>
              </div>
            )}

            {result && !result.valide && (
              <div className="mt-6">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-100 text-red-700"><ShieldAlert className="h-8 w-8" aria-hidden /></span>
                <p className="mt-4 font-display text-3xl font-medium text-red-800">Carte non valide</p>
                <p className="mt-2 text-slate-600">{RAISONS[result.raison] ?? "La carte n'a pas pu être vérifiée."}</p>
              </div>
            )}
          </div>
          <p className="mt-5 px-2 text-center text-xs text-slate-500">Seules la validité et les initiales sont affichées, pour protéger les données personnelles.</p>
        </div>
      </main>
    </div>
  );
}
