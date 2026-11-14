import { z } from "zod";
import { idParam, json, readBody, withApi } from "@/lib/http";
import { captureBiometrics } from "@/modules/biometrics/services/biometrics.service";

export const POST = withApi({ permission: "biometrics:capture" }, async ({ req, auth, params }) => {
  const { mode } = await readBody(req, z.object({ mode: z.enum(["SIMULATION", "REEL"]).default("SIMULATION") }));
  return json(await captureBiometrics(auth, idParam(params), mode));
});
