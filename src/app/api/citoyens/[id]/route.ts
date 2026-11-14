import { idParam, json, readBody, withApi } from "@/lib/http";
import { getCitizen, updateCitizen } from "@/modules/citizens/services/citizen.service";
import { updateCitizenSchema } from "@/modules/citizens/schemas/citizen.schema";

export const GET = withApi({ permission: "citizens:read" }, async ({ auth, params }) => json(await getCitizen(auth, idParam(params))));

export const PATCH = withApi({ permission: "citizens:update" }, async ({ req, auth, params }) =>
  json(await updateCitizen(auth, idParam(params), await readBody(req, updateCitizenSchema))),
);
