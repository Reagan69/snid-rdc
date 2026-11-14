import { idParam, json, readBody, withApi } from "@/lib/http";
import { getResultats, publierResultats, saisirResultats } from "@/modules/elections/services/resultat.service";
import { publierResultatsSchema, saisieResultatsSchema } from "@/modules/elections/schemas/election.schema";

export const GET = withApi({ permission: "results:read" }, async ({ auth, params }) => json(await getResultats(auth, idParam(params))));

// Saisie par l'agent de SA circonscription (après la clôture du scrutin).
export const PUT = withApi({ permission: "results:enter", rate: { limit: 20, windowSec: 60 } }, async ({ req, auth, params }) =>
  json(await saisirResultats(auth, idParam(params), await readBody(req, saisieResultatsSchema))),
);

// Publication par la CENI.
export const POST = withApi({ permission: "elections:manage", rate: { limit: 60, windowSec: 60 } }, async ({ req, auth, params }) =>
  json(await publierResultats(auth, idParam(params), await readBody(req, publierResultatsSchema))),
);
