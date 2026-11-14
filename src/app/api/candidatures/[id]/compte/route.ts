import { idParam, json, withApi } from "@/lib/http";
import { createCandidateAccount } from "@/modules/elections/services/candidature.service";

export const POST = withApi({ permission: "candidatures:decide", rate: { limit: 20, windowSec: 60 } }, async ({ auth, params }) =>
  json(await createCandidateAccount(auth, idParam(params)), 201),
);
