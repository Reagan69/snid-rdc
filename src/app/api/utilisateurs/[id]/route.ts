import { idParam, json, readBody, withApi } from "@/lib/http";
import { updateUser } from "@/modules/users/services/user.service";
import { updateUserSchema } from "@/modules/users/schemas/user.schema";

export const PATCH = withApi({ permission: "users:update" }, async ({ req, auth, params }) =>
  json(await updateUser(auth, idParam(params), await readBody(req, updateUserSchema))),
);
