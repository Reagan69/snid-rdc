import { idParam, json, readBody, withApi } from "@/lib/http";
import { setSieges } from "@/modules/elections/services/election.service";
import { siegesSchema } from "@/modules/elections/schemas/election.schema";

export const PUT = withApi({ permission: "elections:manage", rate: { limit: 60, windowSec: 60 } }, async ({ req, auth, params }) =>
  json(await setSieges(auth, idParam(params), await readBody(req, siegesSchema))),
);
