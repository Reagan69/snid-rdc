import { describe, expect, it } from "vitest";
import {
  PERMISSIONS, ROLE_CODES, ROLE_PERMISSIONS, ROLE_SCOPE_LEVEL, can, canManageRole, isRoleCode,
} from "../../src/modules/roles/permissions.ts";

describe("RBAC", () => {
  it("chaque rôle a un niveau territorial et des permissions connues", () => {
    for (const r of ROLE_CODES) {
      expect(ROLE_SCOPE_LEVEL[r]).toBeTruthy();
      for (const p of ROLE_PERMISSIONS[r]) expect(PERMISSIONS.includes(p)).toBe(true);
    }
  });
  it("le gouverneur est en lecture seule, limité à la province", () => {
    expect(ROLE_SCOPE_LEVEL.GOUVERNEUR).toBe("PROVINCE");
    expect(can("GOUVERNEUR", "citizens:read")).toBe(true);
    for (const p of ["citizens:create", "declarations:create", "declarations:decide", "users:create", "audit:read", "cards:issue"] as const) {
      expect(can("GOUVERNEUR", p)).toBe(false);
    }
  });
  it("seul le chef de rue dépose des demandes ; seul le service communal délivre des cartes", () => {
    expect(ROLE_CODES.filter((r) => can(r, "declarations:create"))).toEqual(["CHEF_RUE"]);
    expect(ROLE_CODES.filter((r) => can(r, "cards:issue"))).toEqual(["SERVICE_COMMUNAL"]);
  });
  it("l'audit et les gouverneurs : admin et auditeur uniquement", () => {
    expect(ROLE_CODES.filter((r) => can(r, "audit:read"))).toEqual(["ADMIN", "AUDITEUR"]);
    expect(ROLE_CODES.filter((r) => can(r, "governors:read"))).toEqual(["ADMIN", "AUDITEUR"]);
    expect(ROLE_CODES.filter((r) => can(r, "governors:manage"))).toEqual(["ADMIN"]);
  });
  it("hiérarchie de gestion des comptes", () => {
    expect(canManageRole("ADMIN", "GOUVERNEUR")).toBe(true);
    expect(canManageRole("BOURGMESTRE", "CHEF_QUARTIER")).toBe(true);
    expect(canManageRole("BOURGMESTRE", "GOUVERNEUR")).toBe(false);
    expect(canManageRole("BOURGMESTRE", "BOURGMESTRE")).toBe(false);
    expect(canManageRole("CHEF_QUARTIER", "CHEF_RUE")).toBe(true);
    expect(canManageRole("CHEF_QUARTIER", "CHEF_QUARTIER")).toBe(false);
    expect(canManageRole("CHEF_RUE", "CHEF_RUE")).toBe(false);
    expect(canManageRole("GOUVERNEUR", "BOURGMESTRE")).toBe(false);
  });
  it("isRoleCode rejette les valeurs inconnues", () => {
    expect(isRoleCode("ADMIN")).toBe(true);
    expect(isRoleCode("admin")).toBe(false);
    expect(isRoleCode(undefined)).toBe(false);
  });
});
