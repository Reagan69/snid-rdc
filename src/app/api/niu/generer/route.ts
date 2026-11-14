import { z } from "zod";
import { json, readBody, withApi } from "@/lib/http";
import { previewNextNiu } from "@/modules/niu/services/niu.service";

// Aperçu du prochain NIU (non réservé) : l'attribution réelle est atomique, à la validation de la déclaration.
export const POST = withApi({ permission: "citizens:create" }, async ({ req, auth }) => {
  const { rueId } = await readBody(req, z.object({ rueId: z.string().uuid() }));
  return json(await previewNextNiu(auth, rueId));
});
