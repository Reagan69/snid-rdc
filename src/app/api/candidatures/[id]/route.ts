import { idParam, json, readBody, withApi } from "@/lib/http";
import { decideCandidature } from "@/modules/elections/services/candidature.service";
import { decideCandidatureSchema } from "@/modules/elections/schemas/election.schema";

export const PATCH = withApi({ permission: "candidatures:decide", rate: { limit: 60, windowSec: 60 } }, async ({ req, auth, params }) =>
  json(await decideCandidature(auth, idParam(params), await readBody(req, decideCandidatureSchema))),
);
