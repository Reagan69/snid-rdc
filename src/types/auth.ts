import type { RoleCode } from "@/modules/roles/permissions";
import type { Scope } from "@/modules/geography/scope";

export interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
}

export interface AuthContext {
  sessionId: string;
  user: {
    id: string;
    username: string;
    nomComplet: string;
    roleCode: RoleCode;
    totpActif: boolean;
    mustChangePassword: boolean;
  };
  scope: Scope;
  /** Circonscription électorale gérée (rôle CIRCONSCRIPTION), sinon null. */
  circonscriptionId: string | null;
  /** MFA exigée pour ce rôle (MFA_ENFORCE=true) mais pas encore activée. */
  mfaPending: boolean;
  meta: RequestMeta;
}
