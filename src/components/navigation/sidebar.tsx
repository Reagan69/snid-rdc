"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileText, Home, Landmark, Map, ScrollText, Search, Settings, ShieldCheck, UserPlus, Users, CreditCard, Vote } from "lucide-react";
import type { NavItem } from "./nav-items";

const ICONS = { home: Home, users: Users, userplus: UserPlus, search: Search, file: FileText, card: CreditCard, shield: ShieldCheck, landmark: Landmark, map: Map, chart: BarChart3, scroll: ScrollText, settings: Settings, vote: Vote } as const;

export function Sidebar({ items }: { items: NavItem[] }) {
  const path = usePathname();
  // L'entrée la plus spécifique gagne (ex. /citoyens/nouveau avant /citoyens).
  const active = [...items].sort((a, b) => b.href.length - a.href.length).find((i) => path === i.href || path.startsWith(i.href + "/"))?.href;
  return (
    <nav aria-label="Navigation principale" className="flex gap-1 overflow-x-auto p-2 md:flex-col md:overflow-visible">
      {items.map((i) => {
        const Icon = ICONS[i.icon];
        const on = i.href === active;
        return (
          <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm ${on ? "bg-sky-700 text-white" : "text-slate-700 hover:bg-slate-100"}`}>
            <Icon className="h-4 w-4" aria-hidden /> <span className="whitespace-nowrap">{i.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
