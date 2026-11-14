import { json, withApi } from "@/lib/http";
import { mfaSetup } from "@/modules/users/services/auth.service";

export const POST = withApi({ allowPending: true, rate: { limit: 5, windowSec: 300 } }, async ({ auth }) => json(await mfaSetup(auth)));
