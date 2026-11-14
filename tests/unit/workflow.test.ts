import { describe, expect, it } from "vitest";
import { canDecide, isChainComplete, nextRequiredRole } from "../../src/modules/declarations/workflow.ts";

describe("chaîne de validation", () => {
  const all = ["CHEF_QUARTIER", "CHEF_BUREAU", "BOURGMESTRE", "ADMIN"] as const;
  it("suit l'ordre chef de quartier → chef de bureau → bourgmestre → administrateur", () => {
    expect(nextRequiredRole(all, [])).toBe("CHEF_QUARTIER");
    expect(nextRequiredRole(all, ["CHEF_QUARTIER"])).toBe("CHEF_BUREAU");
    expect(nextRequiredRole(all, ["CHEF_QUARTIER", "CHEF_BUREAU"])).toBe("BOURGMESTRE");
    expect(nextRequiredRole(all, ["CHEF_QUARTIER", "CHEF_BUREAU", "BOURGMESTRE"])).toBe("ADMIN");
    expect(nextRequiredRole(all, all)).toBeNull();
  });
  it("ignore un niveau sans titulaire actif", () => {
    expect(nextRequiredRole(["CHEF_QUARTIER", "BOURGMESTRE", "ADMIN"], ["CHEF_QUARTIER"])).toBe("BOURGMESTRE");
    expect(nextRequiredRole(["ADMIN"], [])).toBe("ADMIN");
  });
  it("un rôle ne peut décider que son tour (pas de saut de niveau)", () => {
    expect(canDecide("CHEF_QUARTIER", all, [])).toBe(true);
    expect(canDecide("BOURGMESTRE", all, [])).toBe(false);
    expect(canDecide("ADMIN", all, ["CHEF_QUARTIER"])).toBe(false);
    expect(canDecide("CHEF_QUARTIER", all, ["CHEF_QUARTIER"])).toBe(false);
  });
  it("chaîne complète", () => {
    expect(isChainComplete(["ADMIN"], ["ADMIN"])).toBe(true);
    expect(isChainComplete(all, [])).toBe(false);
  });
});
