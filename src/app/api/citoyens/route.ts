import { json, readBody, readQuery, withApi } from "@/lib/http";
import { listCitizens } from "@/modules/citizens/services/citizen.service";
import { listCitizensQuery } from "@/modules/citizens/schemas/citizen.schema";
import { createDeclaration } from "@/modules/declarations/services/declaration.service";
import { personSchema } from "@/modules/citizens/schemas/person.schema";
import { z } from "zod";

export const GET = withApi({ permission: "citizens:read" }, async ({ req, auth }) =>
  json(await listCitizens(auth, readQuery(req, listCitizensQuery))),
);

/**
 * Enregistrer un citoyen = déposer une demande d'identification. Le citoyen n'existe (et son NIU n'est attribué)
 * qu'après la chaîne de validation : « enregistrement réel contrôlé ». Réponse 202 Accepted.
 */
export const POST = withApi({ permission: "citizens:create" }, async ({ req, auth }) => {
  const body = await readBody(req, z.object({ personne: personSchema, confirmerDoublon: z.boolean().optional() }));
  const d = await createDeclaration(auth, { type: "IDENTIFICATION", ...body });
  return json({ declaration: d }, 202);
});
