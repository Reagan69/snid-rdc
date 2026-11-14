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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-sky-800">SNID-RDC</h1>
        <p className="text-sm text-slate-600">Système National d'Identification Numérique</p>
      </div>
      <LoginForm />
      {electeurOuvert && <Link href="/electeur" className="btn btn-primary">Espace électeur</Link>}
      <p className="text-center text-xs text-slate-500">Accès réservé aux agents habilités. Toute action est journalisée.</p>
    </main>
  );
}
