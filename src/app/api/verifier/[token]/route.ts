import { json, withPublicApi } from "@/lib/http";
import { verifyCardToken } from "@/modules/cards/services/card.service";

// Vérification publique d'un QR de carte : 30 requêtes / minute / IP ; réponse minimale (validité, initiales, expiration).
export const GET = withPublicApi({ rate: { limit: 30, windowSec: 60 }, csrf: false }, async ({ params }) =>
  json(await verifyCardToken(String(params.token))),
);
