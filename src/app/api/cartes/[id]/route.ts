import { idParam, json, withApi } from "@/lib/http";
import { getCard } from "@/modules/cards/services/card.service";

export const GET = withApi({ permission: "cards:read" }, async ({ auth, params }) => json(await getCard(auth, idParam(params))));
