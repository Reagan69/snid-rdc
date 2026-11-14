import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { isElectorSpaceOpen } from "@/modules/elections/services/election.service";
import { LoginForm } from "@/components/forms/login-form";
import { LoginView } from "@/components/layout/login-view";

export const metadata = { title: "Connexion" };

export default async function LoginPage() {
  if (await getAuthContext()) redirect("/dashboard");
  // Espace électeur : lien affiché UNIQUEMENT si au moins un scrutin est ouvert.
  const electeurOuvert = await isElectorSpaceOpen().catch(() => false);
  return <LoginView electeurOuvert={electeurOuvert}><LoginForm /></LoginView>;
}
