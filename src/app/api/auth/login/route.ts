import { json, readBody, withPublicApi } from "@/lib/http";
import { setSessionCookie } from "@/lib/session";
import { login } from "@/modules/users/services/auth.service";
import { loginSchema } from "@/modules/users/schemas/auth.schema";

// 10 tentatives par minute et par IP, en plus de la limite par identifiant dans le service.
export const POST = withPublicApi({ rate: { limit: 10, windowSec: 60 } }, async ({ req, meta }) => {
  const input = await readBody(req, loginSchema);
  const { session, user } = await login(input, meta);
  await setSessionCookie(session.token, session.expiresAt);
  return json({ user });
});
