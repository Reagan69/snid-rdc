import { describe, expect, it } from "vitest";
import { DECLARATION_TYPES, estValidationDirecte, parseValidationDirecte } from "../../src/modules/settings/settings.ts";
import { ROLE_CODES, can } from "../../src/modules/roles/permissions.ts";

describe("validation directe des déclarations des chefs de rue", () => {
  it("par défaut (aucune valeur), personne n'est validé directement : la chaîne complète s'applique", () => {
    expect(parseValidationDirecte(undefined)).toEqual([]);
    expect(parseValidationDirecte(null)).toEqual([]);
    expect(estValidationDirecte("CHEF_RUE", "IDENTIFICATION", parseValidationDirecte(undefined))).toBe(false);
  });
  it("lecture tolérante : valeurs invalides ignorées, doublons retirés, ordre canonique", () => {
    expect(parseValidationDirecte("IDENTIFICATION")).toEqual([]);
    expect(parseValidationDirecte({ 0: "DECES" })).toEqual([]);
    expect(parseValidationDirecte(["DECES", "n'importe quoi", "DECES", 42, "NAISSANCE"])).toEqual(["NAISSANCE", "DECES"]);
    expect(parseValidationDirecte([...DECLARATION_TYPES])).toEqual([...DECLARATION_TYPES]);
  });
  it("seul un chef de rue est concerné, et seulement pour les types activés", () => {
    const actives = parseValidationDirecte(["DECES", "DEPART"]);
    expect(estValidationDirecte("CHEF_RUE", "DECES", actives)).toBe(true);
    expect(estValidationDirecte("CHEF_RUE", "DEPART", actives)).toBe(true);
    expect(estValidationDirecte("CHEF_RUE", "IDENTIFICATION", actives)).toBe(false);
    for (const r of ROLE_CODES.filter((x) => x !== "CHEF_RUE")) expect(estValidationDirecte(r, "DECES", actives)).toBe(false);
  });
  it("seul le chef de rue dépose des déclarations : le réglage ne peut concerner personne d'autre", () => {
    expect(ROLE_CODES.filter((r) => can(r, "declarations:create"))).toEqual(["CHEF_RUE"]);
  });
});
