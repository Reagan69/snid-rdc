import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import Link from "next/link";
import { isElectorSpaceOpen } from "@/modules/elections/services/election.service";
import { LoginForm } from "@/components/forms/login-form";

export const metadata = { title: "Connexion" };

export default async function LoginPage() {
  if (await getAuthContext()) redirect("/dashboard");
  // Espace électeur : lien affiché UNIQUEMENT si au moins un scrutin est ouvert.
  const electeurOuvert = await isElectorSpaceOpen().catch(() => false);
  return (
    <div className="min-h-screen lg:flex">
      {/* Volet d'identité : la bande diagonale du drapeau, stylisée. C'est le seul élément décoratif de l'application. */}
      <section className="relative flex min-h-56 flex-col justify-end overflow-hidden bg-nuit px-8 py-8 text-white lg:min-h-screen lg:w-[46%] lg:px-14 lg:py-14">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <line x1="-60" y1="560" x2="660" y2="70" stroke="#f5c518" strokeWidth="92" />
          <line x1="-60" y1="560" x2="660" y2="70" stroke="#c4122f" strokeWidth="58" />
          <path transform="translate(60 56) scale(3)" fill="#f5c518" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        <div className="relative">
          <h1 className="font-display text-4xl font-semibold tracking-tight lg:text-6xl">SNID-RDC</h1>
          <p className="mt-2 max-w-sm text-lg text-slate-200">Système National d'Identification Numérique</p>
          <p className="mt-1 text-sm text-slate-300">République démocratique du Congo</p>
        </div>
      </section>

      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-2xl font-semibold text-slate-900">Connexion</h2>
          <p className="mb-6 mt-1 text-slate-600">Accès réservé aux agents habilités. Toute action est journalisée.</p>
          <LoginForm />
          {electeurOuvert && <Link href="/electeur" className="btn mt-4 w-full">Accéder à l'espace électeur</Link>}
        </div>
      </main>
    </div>
  );
}
