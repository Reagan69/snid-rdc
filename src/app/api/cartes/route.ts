import { z } from "zod";
import { json, readBody, withApi } from "@/lib/http";
import { issueCard, listCards } from "@/modules/cards/services/card.service";

export const GET = withApi({ permission: "cards:read" }, async ({ auth }) => json(await listCards(auth)));

export const POST = withApi({ permission: "cards:issue" }, async ({ req, auth }) => {
  const { niu } = await readBody(req, z.object({ niu: z.string().trim().min(10).max(40) }));
  return json(await issueCard(auth, niu), 201);
});
