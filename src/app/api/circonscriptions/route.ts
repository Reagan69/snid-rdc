import { json, readBody, withApi } from "@/lib/http";
import { createCirconscription, listCirconscriptions } from "@/modules/elections/services/election.service";
import { createCirconscriptionSchema } from "@/modules/elections/schemas/election.schema";

export const GET = withApi({ permission: "elections:read" }, async ({ auth }) => json(await listCirconscriptions(auth)));

export const POST = withApi({ permission: "elections:manage", rate: { limit: 60, windowSec: 60 } }, async ({ req, auth }) =>
  json(await createCirconscription(auth, await readBody(req, createCirconscriptionSchema)), 201),
);
