const LABELS = ["Pays", "Province", "Commune", "Quartier", "Rue", "Numéro du citoyen"];

/** NIU lisible par segments : CD · province · commune · quartier · rue · citoyen. Le texte copié reste le NIU complet. */
export function Niu({ niu, size = "md" }: { niu: string; size?: "md" | "lg" }) {
  const parts = niu.split("-");
  if (parts.length !== 6) return <span className="font-mono">{niu}</span>;
  return (
    <span className={`niu ${size === "lg" ? "niu-lg" : ""}`} role="img" aria-label={`NIU ${niu}`}>
      {parts.map((p, i) => (
        <span key={i} className="inline-flex items-baseline">
          <span className={i === 5 ? "niu-seq" : undefined} title={`${LABELS[i]} : ${p}`}>{p}</span>
          {i < 5 && <span className="niu-sep">-</span>}
        </span>
      ))}
    </span>
  );
}
