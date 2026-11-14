import { Guilloche } from "@/components/ui/guilloche";
import { Niu } from "@/components/ui/niu";

export interface CarteData {
  nom: string; postnom: string; prenom: string; sexe: "M" | "F"; naissance: string;
  niu: string; commune: string; delivree: string; expire: string; qrDataUrl?: string;
}

export const SPECIMEN: CarteData = {
  nom: "SPÉCIMEN", postnom: "SPÉCIMEN", prenom: "Spécimen", sexe: "F", naissance: "01/01/1990",
  niu: "CD-00-00-00-0000-00000", commune: "—", delivree: "—", expire: "—",
};

/** QR factice (spécimen) : trois repères d'angle et des modules déterministes. */
function PseudoQr() {
  const N = 21;
  let seed = 7;
  const rnd = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
  const inFinder = (x: number, y: number) => (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
  let d = "";
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!inFinder(x, y) && rnd() > 0.52) d += `M${x} ${y}h1v1h-1z`;
  const finder = (ox: number, oy: number) => `M${ox} ${oy}h7v7h-7z M${ox + 1} ${oy + 1}v5h5v-5z M${ox + 2} ${oy + 2}h3v3h-3z`;
  return (
    <svg viewBox={`0 0 ${N} ${N}`} className="h-full w-full" fill="#18222f" fillRule="evenodd" shapeRendering="crispEdges" aria-hidden>
      <path d={d} /><path d={finder(0, 0)} /><path d={finder(N - 7, 0)} /><path d={finder(0, N - 7)} />
    </svg>
  );
}

function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[2.1cqw] leading-none text-slate-500">{label}</div>
      <div className="mt-[0.7cqw] truncate text-[3cqw] font-semibold leading-tight text-slate-900">{children}</div>
    </div>
  );
}

/** Carte d'identité nationale, dimensionnée en unités de conteneur (cqw) : elle garde ses proportions à toute taille. */
export function CarteIdentite({ carte, specimen = false }: { carte: CarteData; specimen?: boolean }) {
  return (
    <div style={{ containerType: "inline-size" }} className="w-full max-w-[470px]">
      <div className="relative aspect-[1.586] overflow-hidden rounded-[3.4cqw] border border-white/70 bg-gradient-to-br from-white via-sky-50 to-slate-100 shadow-carte">
        <Guilloche className="absolute -bottom-[30cqw] -right-[16cqw] w-[84cqw] text-sky-700/[0.13]" rings={14} points={110} />
        <Guilloche className="absolute -left-[26cqw] -top-[34cqw] w-[70cqw] text-laiton/[0.16]" rings={10} points={100} />
        <div className="absolute inset-x-0 top-0 flex h-[1.2cqw]" aria-hidden>
          <span className="flex-1 bg-[#2f80c8]" /><span className="flex-1 bg-[#e3b93c]" /><span className="flex-1 bg-[#b3262f]" />
        </div>
        {specimen && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
            <span className="-rotate-[16deg] font-display text-[13cqw] font-semibold tracking-wide text-slate-900/[0.06]">SPÉCIMEN</span>
          </div>
        )}

        <div className="relative flex h-full flex-col px-[4.4cqw] pb-[4cqw] pt-[4.2cqw]">
          <div className="flex items-center gap-[2.2cqw]">
            <span className="grid h-[7.4cqw] w-[7.4cqw] shrink-0 place-items-center rounded-full bg-fleuve ring-[0.3cqw] ring-laiton" aria-hidden>
              <svg viewBox="0 0 24 24" className="h-[3.8cqw] w-[3.8cqw]" fill="#dcc283"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            </span>
            <div className="leading-tight">
              <div className="text-[2.6cqw] font-semibold tracking-wide text-fleuve">RÉPUBLIQUE DÉMOCRATIQUE DU CONGO</div>
              <div className="font-display text-[3.3cqw] font-medium text-slate-700">Carte d'identité nationale</div>
            </div>
          </div>

          <div className="mt-[3.4cqw] flex gap-[3.6cqw]">
            <div className="h-[28cqw] w-[22cqw] shrink-0 overflow-hidden rounded-[1.6cqw] bg-slate-200 ring-1 ring-slate-300" aria-hidden>
              <svg viewBox="0 0 64 80" className="h-full w-full"><rect width="64" height="80" fill="#e0e4ea" /><circle cx="32" cy="31" r="13" fill="#97a1b0" /><path d="M7 80c0-18 11-27 25-27s25 9 25 27z" fill="#97a1b0" /></svg>
            </div>
            <div className="grid min-w-0 flex-1 content-start gap-y-[2.2cqw]">
              <Champ label="Nom">{carte.nom}</Champ>
              <Champ label="Postnom">{carte.postnom}</Champ>
              <Champ label="Prénom">{carte.prenom}</Champ>
              <div className="grid grid-cols-[auto_1fr] gap-x-[4cqw]">
                <Champ label="Sexe">{carte.sexe}</Champ>
                <Champ label="Naissance">{carte.naissance}</Champ>
              </div>
            </div>
          </div>

          <div className="absolute bottom-[4cqw] left-[4.4cqw]">
            <div className="text-[2.1cqw] leading-none text-slate-500">Numéro d'identification national</div>
            <div className="mt-[0.8cqw] text-[3.6cqw]"><Niu niu={carte.niu} /></div>
          </div>
          <div className="absolute bottom-[4cqw] right-[4.4cqw] h-[17cqw] w-[17cqw] rounded-[1cqw] bg-white p-[1cqw] ring-1 ring-slate-200">
            {carte.qrDataUrl
              ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={carte.qrDataUrl} alt="QR code de vérification" className="h-full w-full" />
              : <PseudoQr />}
          </div>
        </div>
      </div>
    </div>
  );
}
