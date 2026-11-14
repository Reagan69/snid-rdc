import { json, readBody, withApi } from "@/lib/http";
import { createScrutin, listScrutins } from "@/modules/elections/services/election.service";
import { createScrutinSchema } from "@/modules/elections/schemas/election.schema";

export const GET = withApi({ permission: "elections:read" }, async ({ auth }) => json(await listScrutins(auth)));

export const POST = withApi({ permission: "elections:manage", rate: { limit: 20, windowSec: 60 } }, async ({ req, auth }) =>
  json(await createScrutin(auth, await readBody(req, createScrutinSchema)), 201),
);
