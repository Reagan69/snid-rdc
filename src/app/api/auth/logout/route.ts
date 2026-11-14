import { cookies } from "next/headers";
import { json, withApi } from "@/lib/http";
import { SESSION_COOKIE, clearSessionCookie, revokeSession } from "@/lib/session";
import { auditBestEffort } from "@/modules/audit/services/audit.service";

export const POST = withApi({ allowPending: true }, async ({ auth }) => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await revokeSession(token);
  await clearSessionCookie();
  await auditBestEffort(auth, { action: "DECONNEXION", entite: "Utilisateur", entiteId: auth.user.id });
  return json({ ok: true });
});
