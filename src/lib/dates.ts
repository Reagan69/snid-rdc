// Dates « civiles » (sans heure) : toujours en UTC pour éviter tout décalage de fuseau.
export const todayIso = (): string => new Date().toISOString().slice(0, 10);
export const toDate = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);
export const toIso = (d: Date): string => d.toISOString().slice(0, 10);
export function addYears(d: Date, years: number): Date {
  const r = new Date(d.getTime());
  r.setUTCFullYear(r.getUTCFullYear() + years);
  return r;
}
export const formatDateFr = (d: Date | string | null | undefined): string =>
  d ? new Date(d).toLocaleDateString("fr-FR", { timeZone: "UTC", day: "2-digit", month: "long", year: "numeric" }) : "—";
