import { json, readBody, withApi } from "@/lib/http";
import { mfaEnable } from "@/modules/users/services/auth.service";
import { mfaEnableSchema } from "@/modules/users/schemas/auth.schema";

export const POST = withApi({ allowPending: true, rate: { limit: 10, windowSec: 300 } }, async ({ req, auth }) => {
  await mfaEnable(auth, (await readBody(req, mfaEnableSchema)).code);
  return json({ ok: true });
});
