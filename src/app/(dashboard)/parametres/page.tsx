import { requireAuth } from "@/lib/auth";
import { PageTitle } from "@/components/ui/page";
import { MfaPanel, PasswordForm } from "@/components/forms/account-forms";
import { ROLE_LABELS } from "@/modules/roles/permissions";

export const metadata = { title: "Mon compte" };

export default async function ParametresPage() {
  const ctx = await requireAuth();
  return (
    <>
      <PageTitle title="Mon compte" subtitle={`${ctx.user.nomComplet} · ${ctx.user.username} · ${ROLE_LABELS[ctx.user.roleCode]}`} />
      {ctx.user.mustChangePassword && <p role="alert" className="mb-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">Votre mot de passe est temporaire : choisissez-en un nouveau pour accéder au reste de l'application.</p>}
      {ctx.mfaPending && <p role="alert" className="mb-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">Votre rôle exige l'authentification multifacteur : activez-la pour continuer.</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <PasswordForm />
        <MfaPanel enabled={ctx.user.totpActif} />
      </div>
    </>
  );
}
