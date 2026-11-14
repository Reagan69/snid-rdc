import { describe, expect, it } from "vitest";
import {
  AGE_MINIMUM_CANDIDAT, ageAt, canRegisterCandidature, candidateAgeIssue, isElectorSpaceVisible, nextStatut, rankResults,
  resultsVisibleToCandidate, validateCandidatureTarget, validateResultTotals, voterAgeOk,
} from "../../src/modules/elections/rules.ts";
import { ROLE_CODES, ROLE_SCOPE_LEVEL, can, canManageRole } from "../../src/modules/roles/permissions.ts";

describe("espace électeur", () => {
  it("n'est visible que si au moins un scrutin est ouvert", () => {
    expect(isElectorSpaceVisible([])).toBe(false);
    expect(isElectorSpaceVisible([{ statut: "PLANIFIE" }, { statut: "CLOS" }])).toBe(false);
    expect(isElectorSpaceVisible([{ statut: "PLANIFIE" }, { statut: "OUVERT" }])).toBe(true);
  });
  it("cycle de vie : PLANIFIE → OUVERT → CLOS, sans retour", () => {
    expect(nextStatut("PLANIFIE", "OUVRIR")).toBe("OUVERT");
    expect(nextStatut("OUVERT", "CLORE")).toBe("CLOS");
    expect(nextStatut("PLANIFIE", "CLORE")).toBeNull();
    expect(nextStatut("CLOS", "OUVRIR")).toBeNull();
    expect(nextStatut("OUVERT", "OUVRIR")).toBeNull();
  });
});

describe("candidatures", () => {
  it("présidentielle : CENI seule ; législatives : circonscription seule", () => {
    expect(canRegisterCandidature("CENI", "PRESIDENTIELLE")).toBe(true);
    expect(canRegisterCandidature("CIRCONSCRIPTION", "PRESIDENTIELLE")).toBe(false);
    expect(canRegisterCandidature("CIRCONSCRIPTION", "LEGISLATIVE_NATIONALE")).toBe(true);
    expect(canRegisterCandidature("CIRCONSCRIPTION", "LEGISLATIVE_PROVINCIALE")).toBe(true);
    expect(canRegisterCandidature("CENI", "LEGISLATIVE_NATIONALE")).toBe(false);
    expect(canRegisterCandidature("CENTRE_TRAITEMENT", "LEGISLATIVE_NATIONALE")).toBe(false);
  });
  it("circonscription obligatoire en législatives, interdite en présidentielle", () => {
    expect(validateCandidatureTarget("PRESIDENTIELLE", null)).toBeNull();
    expect(validateCandidatureTarget("PRESIDENTIELLE", "C1")).not.toBeNull();
    expect(validateCandidatureTarget("LEGISLATIVE_NATIONALE", "C1")).toBeNull();
    expect(validateCandidatureTarget("LEGISLATIVE_NATIONALE", undefined)).not.toBeNull();
  });
  it("âge calculé à la date du scrutin", () => {
    expect(ageAt("2000-06-15", "2026-06-14")).toBe(25);
    expect(ageAt("2000-06-15", "2026-06-15")).toBe(26);
    expect(voterAgeOk("2008-12-31", "2026-12-30")).toBe(false);
    expect(voterAgeOk("2008-12-30", "2026-12-30")).toBe(true);
    expect(candidateAgeIssue("2000-01-01", "PRESIDENTIELLE", "2026-01-01")).not.toBeNull();
    expect(candidateAgeIssue("1990-01-01", "PRESIDENTIELLE", "2026-01-01")).toBeNull();
    expect(AGE_MINIMUM_CANDIDAT.PRESIDENTIELLE).toBeGreaterThanOrEqual(AGE_MINIMUM_CANDIDAT.LEGISLATIVE_NATIONALE);
  });
});

describe("résultats", () => {
  it("contrôle la cohérence des totaux", () => {
    expect(validateResultTotals({ inscrits: 1000, votants: 800, nuls: 20, voix: [500, 280] })).toBeNull();
    expect(validateResultTotals({ inscrits: 100, votants: 120, nuls: 0, voix: [] })).not.toBeNull();
    expect(validateResultTotals({ inscrits: 1000, votants: 800, nuls: 900, voix: [] })).not.toBeNull();
    expect(validateResultTotals({ inscrits: 1000, votants: 800, nuls: 20, voix: [500, 300] })).not.toBeNull();
    expect(validateResultTotals({ inscrits: 10, votants: 5, nuls: 0, voix: [-1] })).not.toBeNull();
  });
  it("classe les candidats, ex æquo au même rang", () => {
    const r = rankResults([{ voix: 10 }, { voix: 30 }, { voix: 30 }, { voix: 5 }]);
    expect(r.map((x) => x.rang)).toEqual([1, 1, 3, 4]);
    expect(r.map((x) => x.voix)).toEqual([30, 30, 10, 5]);
  });
  it("un candidat ne voit les résultats qu'après le vote ET après publication", () => {
    expect(resultsVisibleToCandidate("PLANIFIE", true)).toBe(false);
    expect(resultsVisibleToCandidate("OUVERT", true)).toBe(false);
    expect(resultsVisibleToCandidate("CLOS", false)).toBe(false);
    expect(resultsVisibleToCandidate("CLOS", true)).toBe(true);
  });
});

describe("rôles électoraux", () => {
  it("la CENI couvre le territoire national ; la circonscription est limitée à sa province", () => {
    expect(ROLE_SCOPE_LEVEL.CENI).toBe("NATIONAL");
    expect(ROLE_SCOPE_LEVEL.CENTRE_TRAITEMENT).toBe("NATIONAL");
    expect(ROLE_SCOPE_LEVEL.CIRCONSCRIPTION).toBe("PROVINCE");
  });
  it("seule la CENI gère scrutins, sièges et publication", () => {
    expect(ROLE_CODES.filter((r) => can(r, "elections:manage"))).toEqual(["CENI"]);
  });
  it("la CENI crée les comptes des circonscriptions (et des centres) ; personne d'autre", () => {
    expect(canManageRole("CENI", "CIRCONSCRIPTION")).toBe(true);
    expect(canManageRole("CENI", "CENTRE_TRAITEMENT")).toBe(true);
    expect(canManageRole("CIRCONSCRIPTION", "CIRCONSCRIPTION")).toBe(false);
    expect(canManageRole("BOURGMESTRE", "CIRCONSCRIPTION")).toBe(false);
    expect(ROLE_CODES.filter((r) => canManageRole(r, "CANDIDAT"))).toEqual([]);
  });
  it("enregistrement des candidatures : CENI (présidentielle) et circonscriptions ; décision : centre de traitement", () => {
    expect(ROLE_CODES.filter((r) => can(r, "candidatures:create"))).toEqual(["CENI", "CIRCONSCRIPTION"]);
    expect(ROLE_CODES.filter((r) => can(r, "candidatures:decide"))).toEqual(["CENTRE_TRAITEMENT"]);
    expect(can("CENTRE_TRAITEMENT", "candidatures:read")).toBe(true);
  });
  it("saisie des résultats : circonscription seule ; consultation personnelle : candidat seul", () => {
    expect(ROLE_CODES.filter((r) => can(r, "results:enter"))).toEqual(["CIRCONSCRIPTION"]);
    expect(ROLE_CODES.filter((r) => can(r, "results:own"))).toEqual(["CANDIDAT"]);
    for (const p of ["citizens:read", "elections:read", "candidatures:read", "results:read", "users:read"] as const) expect(can("CANDIDAT", p)).toBe(false);
  });
});
