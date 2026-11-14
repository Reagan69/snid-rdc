import { json, readBody, readQuery, withApi } from "@/lib/http";
import { createCandidature, listCandidatures } from "@/modules/elections/services/candidature.service";
import { createCandidatureSchema, listCandidaturesQuery } from "@/modules/elections/schemas/election.schema";

export const GET = withApi({ permission: "candidatures:read" }, async ({ req, auth }) =>
  json(await listCandidatures(auth, readQuery(req, listCandidaturesQuery))),
);

export const POST = withApi({ permission: "candidatures:create", rate: { limit: 60, windowSec: 60 } }, async ({ req, auth }) =>
  json(await createCandidature(auth, await readBody(req, createCandidatureSchema)), 201),
);
