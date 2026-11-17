"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileText, Globe, Home, Landmark, Map, ScrollText, Search, Settings, SlidersHorizontal, ShieldCheck, UserPlus, Users, CreditCard, Vote } from "lucide-react";
import type { NavItem } from "./nav-items";

const ICONS = { home: Home, users: Users, userplus: UserPlus, search: Search, file: FileText, card: CreditCard, shield: ShieldCheck, landmark: Landmark, map: Map, chart: BarChart3, scroll: ScrollText, settings: Settings, vote: Vote, globe: Globe, sliders: SlidersHorizontal } as const;

export function Sidebar({ items }: { items: NavItem[] }) {
  const path = usePathname();
  // L'entrée la plus spécifique gagne (ex. /citoyens/nouveau avant /citoyens).
  const active = [...items].sort((a, b) => b.href.length - a.href.length).find((i) => path === i.href || path.startsWith(i.href + "/"))?.href;
  // Regroupe les entrées consécutives de même groupe ; un groupe sans entrée visible n'est pas affiché.
  const sections: { group?: string; items: NavItem[] }[] = [];
  for (const i of items) {
    const last = sections[sections.length - 1];
    if (last && last.group === i.group) last.items.push(i);
    else sections.push({ group: i.group, items: [i] });
  }
  return (
    <nav aria-label="Navigation principale" className="space-y-6">
      {sections.map((s, n) => (
        <div key={s.group ?? `s${n}`}>
          {s.group && <p className="mb-1.5 px-3 text-xs font-medium text-laiton-clair/90">{s.group}</p>}
          <ul className="space-y-0.5">
            {s.items.map((i) => {
              const Icon = ICONS[i.icon];
              const on = i.href === active;
              return (
                <li key={i.href}>
                  <Link href={i.href} aria-current={on ? "page" : undefined}
                    className={`relative flex items-center gap-3 rounded-[10px] px-3 py-2 text-[15px] transition-colors ${on ? "bg-white/[0.09] font-medium text-white before:absolute before:inset-y-2.5 before:left-0 before:w-0.5 before:rounded-full before:bg-laiton-clair" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}>
                    <Icon className="h-4 w-4 shrink-0" aria-hidden /> <span>{i.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
