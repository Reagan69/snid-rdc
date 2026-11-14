import { describe, expect, it } from "vitest";
import { isValidScope, scopeContains, scopeIncludes, scopeWhere, type Scope } from "../../src/modules/geography/scope.ts";

const national: Scope = { level: "NATIONAL" };
const prov: Scope = { level: "PROVINCE", provinceId: "P1" };
const comm: Scope = { level: "COMMUNE", provinceId: "P1", communeId: "C1" };
const quart: Scope = { level: "QUARTIER", provinceId: "P1", communeId: "C1", quartierId: "Q1" };
const rue: Scope = { level: "RUE", provinceId: "P1", communeId: "C1", quartierId: "Q1", rueId: "R1" };
const geo = { provinceId: "P1", communeId: "C1", quartierId: "Q1", rueId: "R1" };

describe("périmètre territorial", () => {
  it("valide la chaîne d'identifiants", () => {
    expect(isValidScope(national)).toBe(true);
    expect(isValidScope({ level: "COMMUNE", provinceId: "P1" })).toBe(false);
    expect(isValidScope({ level: "RUE", provinceId: "P1", communeId: "C1", quartierId: "Q1" })).toBe(false);
  });
  it("inclut les cibles de son niveau uniquement", () => {
    for (const s of [national, prov, comm, quart, rue]) expect(scopeIncludes(s, geo)).toBe(true);
    expect(scopeIncludes(prov, { ...geo, provinceId: "P2" })).toBe(false);
    expect(scopeIncludes(comm, { ...geo, communeId: "C2" })).toBe(false);
    expect(scopeIncludes(quart, { ...geo, quartierId: "Q2" })).toBe(false);
    expect(scopeIncludes(rue, { ...geo, rueId: "R2" })).toBe(false);
  });
  it("un chef de rue de Limete ne voit pas Ngaliema (identifiant modifié)", () => {
    expect(scopeIncludes(rue, { provinceId: "P1", communeId: "NGALIEMA", quartierId: "QX", rueId: "RX" })).toBe(false);
  });
  it("refuse par défaut : périmètre invalide ou cible incomplète", () => {
    expect(scopeIncludes({ level: "COMMUNE", provinceId: "P1" }, geo)).toBe(false);
    expect(scopeIncludes(comm, {})).toBe(false);
  });
  it("contenance : un périmètre n'englobe que ses sous-périmètres", () => {
    expect(scopeContains(national, rue)).toBe(true);
    expect(scopeContains(prov, comm)).toBe(true);
    expect(scopeContains(comm, quart)).toBe(true);
    expect(scopeContains(quart, comm)).toBe(false);
    expect(scopeContains(comm, { ...quart, communeId: "C2" })).toBe(false);
    expect(scopeContains(comm, comm)).toBe(true);
  });
  it("produit le filtre Prisma", () => {
    expect(scopeWhere(national)).toEqual({});
    expect(scopeWhere(prov)).toEqual({ provinceId: "P1" });
    expect(scopeWhere(quart)).toEqual({ quartierId: "Q1" });
    expect(() => scopeWhere({ level: "COMMUNE" })).toThrow();
  });
});
