import { json, withApi } from "@/lib/http";
import { getMyResults } from "@/modules/elections/services/resultat.service";

export const GET = withApi({ permission: "results:own" }, async ({ auth }) => json(await getMyResults(auth)));
