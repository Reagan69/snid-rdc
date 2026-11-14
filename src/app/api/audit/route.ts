import { z } from "zod";
import { json, readQuery, withApi } from "@/lib/http";
import { listAudit } from "@/modules/audit/services/audit.service";

const query = z.object({ action: z.string().trim().max(60).optional(), username: z.string().trim().max(60).optional(), take: z.coerce.number().int().min(1).max(500).default(100) });

export const GET = withApi({ permission: "audit:read" }, async ({ req, auth }) => json(await listAudit(auth, readQuery(req, query))));
