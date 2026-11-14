// Guilloché : anneaux ondulés déphasés, motif de sécurité des documents d'identité. Pur décor (aria-hidden).
const cache = new Map<string, string[]>();

function rosette(rings: number, points: number, r0: number, dr: number, amp: number, m: number, phase: number): string[] {
  const key = [rings, points, r0, dr, amp, m, phase].join("|");
  const hit = cache.get(key);
  if (hit) return hit;
  const out: string[] = [];
  for (let i = 0; i < rings; i++) {
    const r = r0 + i * dr;
    const pts: string[] = [];
    for (let k = 0; k <= points; k++) {
      const t = (k / points) * Math.PI * 2;
      const rr = r + amp * Math.sin(m * t + i * phase);
      pts.push(`${(rr * Math.cos(t)).toFixed(1)},${(rr * Math.sin(t)).toFixed(1)}`);
    }
    out.push(pts.join(" "));
  }
  cache.set(key, out);
  return out;
}

export function Guilloche({ className, rings = 16, points = 120, strokeWidth = 0.5 }: { className?: string; rings?: number; points?: number; strokeWidth?: number }) {
  const lines = rosette(rings, points, 26, 9, 15, 13, 0.34);
  return (
    <svg viewBox="-200 -200 400 400" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} aria-hidden>
      {lines.map((p, i) => <polyline key={i} points={p} />)}
    </svg>
  );
}
