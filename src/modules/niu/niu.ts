// NIU : CD-pp-cc-qq-rrrr-nnnnn  (province, commune, quartier, chef de rue, citoyen). Logique pure.
// Exemple : CD-01-12-05-0003-00027 = Kinshasa (01), 12e commune, 5e quartier, rue n° 3, citoyen n° 27.

export const NIU_REGEX = /^CD-\d{2}-\d{2}-\d{2}-\d{4}-\d{5}$/;

export interface NiuCodes {
  province: number;
  commune: number;
  quartier: number;
  rue: number;
}

export interface ParsedNiu extends NiuCodes {
  seq: number;
}

const pad = (n: number, len: number) => String(n).padStart(len, "0");

function assertRange(label: string, n: number, max: number): void {
  if (!Number.isInteger(n) || n < 1 || n > max) {
    throw new RangeError(`Code ${label} hors limites (1 à ${max}) : ${n}`);
  }
}

export function niuPrefix(c: NiuCodes): string {
  assertRange("province", c.province, 99);
  assertRange("commune", c.commune, 99);
  assertRange("quartier", c.quartier, 99);
  assertRange("rue", c.rue, 9999);
  return `CD-${pad(c.province, 2)}-${pad(c.commune, 2)}-${pad(c.quartier, 2)}-${pad(c.rue, 4)}`;
}

export function formatNiu(prefix: string, seq: number): string {
  assertRange("citoyen", seq, 99999);
  return `${prefix}-${pad(seq, 5)}`;
}

export function isValidNiu(value: unknown): value is string {
  return typeof value === "string" && NIU_REGEX.test(value);
}

export function parseNiu(value: string): ParsedNiu | null {
  if (!isValidNiu(value)) return null;
  const [, pp, cc, qq, rrrr, nnnnn] = value.split("-");
  return {
    province: Number(pp),
    commune: Number(cc),
    quartier: Number(qq),
    rue: Number(rrrr),
    seq: Number(nnnnn),
  };
}

/** Accepte « cd010503000300027 », « CD-01-05-03-0003-00027 », « NIU : … » (saisie ou lecture de QR). */
export function normalizeNiu(raw: string): string {
  const cleaned = String(raw ?? "").replace(/^\s*NIU\s*:\s*/i, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = /^CD(\d{2})(\d{2})(\d{2})(\d{4})(\d{5})$/.exec(cleaned);
  return m ? `CD-${m[1]}-${m[2]}-${m[3]}-${m[4]}-${m[5]}` : String(raw ?? "").trim().toUpperCase();
}
