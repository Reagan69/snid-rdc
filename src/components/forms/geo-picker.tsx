"use client";
import { useEffect, useState } from "react";
import { api } from "@/hooks/use-api";

interface Opt { id: string; nom: string }
export interface GeoValue { provinceId?: string; communeId?: string; quartierId?: string; rueId?: string; rueNom?: string }
type Level = "NATIONAL" | "PROVINCE" | "COMMUNE" | "QUARTIER" | "RUE";
const DEPTH: Record<Level, number> = { NATIONAL: 0, PROVINCE: 1, COMMUNE: 2, QUARTIER: 3, RUE: 4 };

async function load(niveau: string, parentId?: string): Promise<Opt[]> {
  const r = await api<Opt[]>(`/api/geographie?niveau=${niveau}${parentId ? `&parentId=${parentId}` : ""}`);
  return r.ok ? (r.data as unknown as Opt[]) : [];
}

/** Sélection en cascade ; le serveur ne renvoie QUE les entités du périmètre de l'utilisateur connecté. */
export function GeoPicker({ level, onChange }: { level: Level; onChange: (v: GeoValue) => void }) {
  const d = DEPTH[level];
  const [provinces, setProvinces] = useState<Opt[]>([]);
  const [communes, setCommunes] = useState<Opt[]>([]);
  const [quartiers, setQuartiers] = useState<Opt[]>([]);
  const [rues, setRues] = useState<Opt[]>([]);
  const [v, setV] = useState<GeoValue>({});

  const set = (n: GeoValue) => { setV(n); onChange(n); };
  useEffect(() => { setV({}); setCommunes([]); setQuartiers([]); setRues([]); if (d >= 1) load("provinces").then(setProvinces); }, [d]);

  async function pick(key: keyof GeoValue, id: string) {
    if (key === "provinceId") { set({ provinceId: id }); setCommunes([]); setQuartiers([]); setRues([]); if (id && d >= 2) setCommunes(await load("communes", id)); }
    if (key === "communeId") { set({ provinceId: v.provinceId, communeId: id }); setQuartiers([]); setRues([]); if (id && d >= 3) setQuartiers(await load("quartiers", id)); }
    if (key === "quartierId") { set({ provinceId: v.provinceId, communeId: v.communeId, quartierId: id }); setRues([]); if (id && d >= 4) setRues(await load("rues", id)); }
    if (key === "rueId") set({ ...v, rueId: id || undefined, rueNom: undefined });
  }
  const Sel = ({ label, k, opts, value }: { label: string; k: keyof GeoValue; opts: Opt[]; value?: string }) => (
    <div><label className="label">{label}</label>
      <select className="field" value={value ?? ""} onChange={(e) => pick(k, e.target.value)} required={k !== "rueId"}><option value="">—</option>{opts.map((o) => <option key={o.id} value={o.id}>{o.nom}</option>)}</select></div>
  );
  if (d === 0) return null;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Sel label="Province" k="provinceId" opts={provinces} value={v.provinceId} />
      {d >= 2 && <Sel label="Commune / territoire" k="communeId" opts={communes} value={v.communeId} />}
      {d >= 3 && <Sel label="Quartier / secteur" k="quartierId" opts={quartiers} value={v.quartierId} />}
      {d >= 4 && (
        <div className="space-y-2">
          <Sel label="Rue existante" k="rueId" opts={rues} value={v.rueId} />
          <div><label className="label">…ou nouvelle rue / avenue</label><input className="field" maxLength={80} value={v.rueNom ?? ""} onChange={(e) => set({ provinceId: v.provinceId, communeId: v.communeId, quartierId: v.quartierId, rueNom: e.target.value })} /></div>
        </div>
      )}
    </div>
  );
}
