import { describe, expect, it } from "vitest";
import { addYears, toDate, toIso } from "../../src/lib/dates.ts";

describe("dates civiles", () => {
  it("aller-retour sans décalage de fuseau", () => {
    expect(toIso(toDate("1990-03-01"))).toBe("1990-03-01");
    expect(toIso(toDate("2026-12-31"))).toBe("2026-12-31");
  });
  it("ajoute des années (expiration des cartes)", () => {
    expect(toIso(addYears(toDate("2026-11-12"), 5))).toBe("2031-11-12");
  });
});
