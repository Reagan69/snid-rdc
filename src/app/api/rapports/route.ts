import { json, withApi } from "@/lib/http";
import { dashboard, reportByCommune } from "@/modules/reports/services/report.service";

export const GET = withApi({ permission: "reports:read" }, async ({ auth }) =>
  json({ synthese: await dashboard(auth), parCommune: await reportByCommune(auth) }),
);
