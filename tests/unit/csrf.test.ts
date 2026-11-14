import { describe, expect, it } from "vitest";
import { isSameOrigin } from "../../src/lib/csrf.ts";

const h = (o: Record<string, string>) => ({ get: (k: string) => o[k.toLowerCase()] ?? null });

describe("CSRF", () => {
  const app = "https://snid.example.cd";
  it("accepte l'origine de l'application", () => {
    expect(isSameOrigin(h({ origin: "https://snid.example.cd", host: "snid.example.cd" }), app)).toBe(true);
  });
  it("refuse une origine étrangère", () => {
    expect(isSameOrigin(h({ origin: "https://evil.example", host: "snid.example.cd" }), app)).toBe(false);
    expect(isSameOrigin(h({ origin: "n'importe quoi", host: "snid.example.cd" }), app)).toBe(false);
  });
  it("sans Origin : refuse seulement le déclaré inter-sites", () => {
    expect(isSameOrigin(h({ host: "snid.example.cd" }), app)).toBe(true);
    expect(isSameOrigin(h({ host: "snid.example.cd", "sec-fetch-site": "cross-site" }), app)).toBe(false);
  });
});
