import { idParam, json, readBody, withApi } from "@/lib/http";
import { changeScrutinStatut, getScrutin } from "@/modules/elections/services/election.service";
import { scrutinActionSchema } from "@/modules/elections/schemas/election.schema";

export const GET = withApi({ permission: "elections:read" }, async ({ auth, params }) => json(await getScrutin(auth, idParam(params))));

export const PATCH = withApi({ permission: "elections:manage", rate: { limit: 20, windowSec: 60 } }, async ({ req, auth, params }) =>
  json(await changeScrutinStatut(auth, idParam(params), await readBody(req, scrutinActionSchema))),
);
