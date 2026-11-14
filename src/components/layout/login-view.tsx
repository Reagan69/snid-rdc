import Link from "next/link";
import { Brand } from "@/components/layout/brand";
import { Guilloche } from "@/components/ui/guilloche";
import { CarteIdentite, SPECIMEN } from "@/components/ui/carte-identite";

/** Écran de connexion : à gauche la carte (spécimen) sur fond guilloché, à droite le formulaire. */
export function LoginView({ electeurOuvert, children }: { electeurOuvert: boolean; children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:flex">
      <section className="on-dark relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-fleuve via-fleuve to-fleuve-2 px-8 py-8 text-white lg:min-h-screen lg:w-[52%] lg:px-16 lg:py-14">
        <Guilloche className="pointer-events-none absolute -right-48 -top-40 w-[52rem] text-white/[0.07]" rings={22} points={150} />
        <Guilloche className="pointer-events-none absolute -bottom-72 -left-60 w-[44rem] text-laiton/[0.14]" rings={16} points={120} />
        <div className="relative"><Brand /></div>

        <div className="relative my-10 hidden justify-center sm:flex lg:my-0 lg:justify-start lg:pl-4">
          <div className="w-full max-w-[470px] -rotate-[4deg]"><CarteIdentite carte={SPECIMEN} specimen /></div>
        </div>

        <div className="relative mt-10 sm:mt-0">
          <h1 className="max-w-md font-display text-3xl font-medium leading-tight tracking-tight lg:text-[2.6rem]">Système National d'Identification Numérique</h1>
          <p className="mt-3 text-slate-300">République démocratique du Congo</p>
        </div>
      </section>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-3xl font-medium text-slate-900">Connexion</h2>
          <p className="mb-8 mt-2 text-slate-600">Accès réservé aux agents habilités. Toute action est journalisée.</p>
          {children}
          {electeurOuvert && <Link href="/electeur" className="btn mt-4 w-full">Accéder à l'espace électeur</Link>}
        </div>
      </main>
    </div>
  );
}
