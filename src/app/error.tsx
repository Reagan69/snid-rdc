"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-md p-8 text-center">
      <h1 className="text-xl font-semibold">Une erreur est survenue</h1>
      <p className="mt-2 text-sm text-slate-600">L'incident a été journalisé. Réessayez ou contactez l'administrateur.</p>
      <button className="btn btn-primary mt-4" onClick={reset}>Réessayer</button>
    </main>
  );
}
