import { json, readBody, withApi } from "@/lib/http";
import { createUser, listUsers } from "@/modules/users/services/user.service";
import { createUserSchema } from "@/modules/users/schemas/user.schema";

export const GET = withApi({ permission: "users:read" }, async ({ auth }) => json(await listUsers(auth)));

export const POST = withApi({ permission: "users:create", rate: { limit: 30, windowSec: 60 } }, async ({ req, auth }) =>
  json(await createUser(auth, await readBody(req, createUserSchema)), 201),
);
