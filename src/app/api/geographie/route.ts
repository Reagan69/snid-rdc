import { z } from "zod";
import { json, readQuery, withApi } from "@/lib/http";
import { listGeography } from "@/modules/geography/services/geography.service";

const query = z.object({ niveau: z.enum(["provinces", "communes", "quartiers", "rues"]), parentId: z.string().uuid().optional() });

export const GET = withApi({ permission: "geography:read" }, async ({ req, auth }) => {
  const q = readQuery(req, query);
  return json(await listGeography(auth, q.niveau, q.parentId));
});
