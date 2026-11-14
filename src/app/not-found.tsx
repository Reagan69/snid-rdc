import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md p-8 text-center">
      <h1 className="text-xl font-semibold">Page introuvable</h1>
      <p className="mt-2 text-sm text-slate-600">Cette ressource n'existe pas ou n'est pas accessible avec votre profil.</p>
      <Link className="btn btn-primary mt-4" href="/dashboard">Retour au tableau de bord</Link>
    </main>
  );
}
