import { idParam, json, readBody, withApi } from "@/lib/http";
import { decideDeclaration } from "@/modules/declarations/services/declaration.service";
import { decisionSchema } from "@/modules/declarations/schemas/declaration.schema";

export const POST = withApi({ permission: "declarations:decide" }, async ({ req, auth, params }) =>
  json(await decideDeclaration(auth, idParam(params), await readBody(req, decisionSchema))),
);
