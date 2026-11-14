import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";
import { verifyCardToken } from "@/modules/cards/services/card.service";
import { VerificationView } from "@/components/ui/verification-view";

export const metadata = { title: "Vérification de carte" };

export default async function VerifierPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const rl = await rateLimit(`verif-page:${ip}`, 30, 60);
  const r = rl.ok ? await verifyCardToken(token) : null;
  return <VerificationView result={r} />;
}
