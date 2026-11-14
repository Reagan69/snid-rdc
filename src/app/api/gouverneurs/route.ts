import { json, withApi } from "@/lib/http";
import { listGovernors } from "@/modules/users/services/user.service";

export const GET = withApi({ permission: "governors:read" }, async ({ auth }) => json(await listGovernors(auth)));
