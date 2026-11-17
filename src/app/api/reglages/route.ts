import { json, readBody, withApi } from "@/lib/http";
import { updateValidationDirecte } from "@/modules/settings/services/settings.service";
import { validationDirecteSchema } from "@/modules/settings/schemas/settings.schema";

// Réglage « validation directe des déclarations des chefs de rue » : administrateur uniquement.
export const PATCH = withApi({ permission: "settings:manage" }, async ({ req, auth }) =>
  json(await updateValidationDirecte(auth, await readBody(req, validationDirecteSchema))),
);
