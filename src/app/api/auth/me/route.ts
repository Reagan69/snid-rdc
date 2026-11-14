import { json, withApi } from "@/lib/http";
import { PERMISSIONS, ROLE_LABELS, can } from "@/modules/roles/permissions";

export const GET = withApi({ allowPending: true }, async ({ auth }) =>
  json({
    user: { ...auth.user, roleLabel: ROLE_LABELS[auth.user.roleCode] },
    scope: auth.scope,
    mfaPending: auth.mfaPending,
    permissions: PERMISSIONS.filter((p) => can(auth.user.roleCode, p)),
  }),
);
