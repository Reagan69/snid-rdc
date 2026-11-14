import { describe, expect, it } from "vitest";
import {
  MANAGEABLE_ROLES, PERMISSIONS, ROLE_CODES, ROLE_PERMISSIONS, ROLE_SCOPE_LEVEL, can, canManageRole, isRoleCode,
} from "../../src/modules/roles/permissions.ts";
import { describeHabilitations } from "../../src/modules/roles/habilitations.ts";

describe("RBAC", () => {
  it("chaque rôle a un niveau territorial et des permissions connues", () => {
    for (const r of ROLE_CODES) {
      expect(ROLE_SCOPE_LEVEL[r]).toBeTruthy();
      for (const p of ROLE_PERMISSIONS[r]) expect(PERMISSIONS.includes(p)).toBe(true);
    }
  });
  it("le gouverneur consulte sa province et gère les comptes communaux, sans agir sur les dossiers", () => {
    expect(ROLE_SCOPE_LEVEL.GOUVERNEUR).toBe("PROVINCE");
    expect(can("GOUVERNEUR", "citizens:read")).toBe(true);
    for (const p of ["citizens:create", "declarations:create", "declarations:decide", "users:delete", "audit:read", "cards:issue"] as const) {
      expect(can("GOUVERNEUR", p)).toBe(false);
    }
    expect([...MANAGEABLE_ROLES.GOUVERNEUR]).toEqual(["BOURGMESTRE", "CHEF_BUREAU"]);
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
    expect(canManageRole("GOUVERNEUR", "BOURGMESTRE")).toBe(true);
    expect(canManageRole("GOUVERNEUR", "GOUVERNEUR")).toBe(false);
    expect(canManageRole("GOUVERNEUR", "CHEF_QUARTIER")).toBe(false);
    expect(canManageRole("GOUVERNEUR", "ADMIN")).toBe(false);
  });
  it("isRoleCode rejette les valeurs inconnues", () => {
    expect(isRoleCode("ADMIN")).toBe(true);
    expect(isRoleCode("admin")).toBe(false);
    expect(isRoleCode(undefined)).toBe(false);
  });
  it("institutions nationales : lecture pour ADMIN et AUDITEUR, gestion pour ADMIN seul", () => {
    expect(ROLE_CODES.filter((r) => can(r, "institutions:read"))).toEqual(["ADMIN", "AUDITEUR"]);
    expect(ROLE_CODES.filter((r) => can(r, "institutions:manage"))).toEqual(["ADMIN"]);
  });
  it("la DGM est nationale, vérifie les NIU et gère ses agents, sans accès aux dossiers", () => {
    expect(ROLE_SCOPE_LEVEL.DGM).toBe("NATIONAL");
    expect(ROLE_SCOPE_LEVEL.AGENT_DGM).toBe("NATIONAL");
    expect([...ROLE_PERMISSIONS.DGM]).toEqual(["niu:verify", "users:read", "users:create", "users:update"]);
    expect([...ROLE_PERMISSIONS.AGENT_DGM]).toEqual(["niu:verify"]);
    for (const r of ["DGM", "AGENT_DGM"] as const) for (const p of ["citizens:read", "cards:read", "declarations:read", "users:delete", "audit:read"] as const) expect(can(r, p)).toBe(false);
    expect(canManageRole("DGM", "AGENT_DGM")).toBe(true);
    expect(canManageRole("DGM", "DGM")).toBe(false);
    expect(canManageRole("CENI", "DGM")).toBe(false);
    expect(canManageRole("AGENT_DGM", "AGENT_DGM")).toBe(false);
  });
  it("seul l'administrateur supprime un compte", () => {
    expect(ROLE_CODES.filter((r) => can(r, "users:delete"))).toEqual(["ADMIN"]);
  });
  it("supervision : l'administrateur contrôle tous les comptes que d'autres rôles peuvent ouvrir", () => {
    const ouverts = new Set(ROLE_CODES.flatMap((r) => MANAGEABLE_ROLES[r]));
    for (const cible of ouverts) expect(canManageRole("ADMIN", cible)).toBe(true);
  });
  it("aucun rôle ne peut gérer son propre rôle, ni celui d'administrateur", () => {
    for (const r of ROLE_CODES) {
      expect(canManageRole(r, r)).toBe(false);
      expect(canManageRole(r, "ADMIN")).toBe(false);
    }
  });
  it("les habilitations affichées proviennent des permissions réelles", () => {
    expect(describeHabilitations("DGM")).toHaveLength(2);
    expect(describeHabilitations("DGM").join(" ")).toContain("Agent DGM");
    const ceni = describeHabilitations("CENI").join(" | ");
    expect(ceni).toContain("Créer les scrutins");
    expect(ceni).toContain("Agent de circonscription électorale");
    expect(ceni).not.toContain("dossiers des citoyens");
  });
});
