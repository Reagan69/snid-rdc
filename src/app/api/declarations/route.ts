import { json, readBody, readQuery, withApi } from "@/lib/http";
import { createDeclaration, listDeclarations } from "@/modules/declarations/services/declaration.service";
import { createDeclarationSchema, listDeclarationsQuery } from "@/modules/declarations/schemas/declaration.schema";

export const GET = withApi({ permission: "declarations:read" }, async ({ req, auth }) =>
  json(await listDeclarations(auth, readQuery(req, listDeclarationsQuery))),
);

export const POST = withApi({ permission: "declarations:create" }, async ({ req, auth }) =>
  json(await createDeclaration(auth, await readBody(req, createDeclarationSchema)), 201),
);
