import { json, readBody, withApi } from "@/lib/http";
import { changePassword } from "@/modules/users/services/auth.service";
import { changePasswordSchema } from "@/modules/users/schemas/auth.schema";

export const POST = withApi({ allowPending: true, rate: { limit: 5, windowSec: 300 } }, async ({ req, auth }) => {
  await changePassword(auth, await readBody(req, changePasswordSchema));
  return json({ ok: true });
});
