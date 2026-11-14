import { z } from "zod";
import { json, readBody, withApi } from "@/lib/http";
import { verifyNiu } from "@/modules/niu/services/niu.service";

export const POST = withApi({ permission: "niu:verify", rate: { limit: 60, windowSec: 60 } }, async ({ req, auth }) => {
  const { niu } = await readBody(req, z.object({ niu: z.string().trim().min(10).max(40) }));
  return json(await verifyNiu(auth, niu));
});
