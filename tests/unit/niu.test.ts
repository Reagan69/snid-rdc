import { describe, expect, it } from "vitest";
import { formatNiu, isValidNiu, niuPrefix, normalizeNiu, parseNiu } from "../../src/modules/niu/niu.ts";

describe("NIU", () => {
  const prefix = niuPrefix({ province: 1, commune: 12, quartier: 5, rue: 3 });
  it("construit le préfixe et le NIU (exemple de la documentation)", () => {
    expect(prefix).toBe("CD-01-12-05-0003");
    expect(formatNiu(prefix, 27)).toBe("CD-01-12-05-0003-00027");
  });
  it("valide et décompose", () => {
    expect(isValidNiu("CD-01-12-05-0003-00027")).toBe(true);
    expect(isValidNiu("CD-1-12-05-0003-00027")).toBe(false);
    expect(isValidNiu("cd-01-12-05-0003-00027")).toBe(false);
    expect(parseNiu("CD-01-12-05-0003-00027")).toEqual({ province: 1, commune: 12, quartier: 5, rue: 3, seq: 27 });
    expect(parseNiu("xx")).toBeNull();
  });
  it("normalise les saisies et lectures de QR", () => {
    expect(normalizeNiu("cd011205000300027")).toBe("CD-01-12-05-0003-00027");
    expect(normalizeNiu("NIU : CD-01-12-05-0003-00027")).toBe("CD-01-12-05-0003-00027");
    expect(normalizeNiu(" cd-01-12-05-0003-00027 ")).toBe("CD-01-12-05-0003-00027");
  });
  it("refuse les codes hors limites (jamais de NIU tronqué ou ambigu)", () => {
    expect(() => niuPrefix({ province: 0, commune: 1, quartier: 1, rue: 1 })).toThrow();
    expect(() => niuPrefix({ province: 1, commune: 100, quartier: 1, rue: 1 })).toThrow();
    expect(() => niuPrefix({ province: 1, commune: 1, quartier: 1, rue: 10000 })).toThrow();
    expect(() => formatNiu(prefix, 100000)).toThrow();
    expect(() => formatNiu(prefix, 0)).toThrow();
  });
});
