"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Sidebar } from "@/components/navigation/sidebar";
import type { NavItem } from "@/components/navigation/nav-items";
import { LogoutButton } from "@/components/layout/logout-button";
import { Brand } from "@/components/layout/brand";
import { Avatar } from "@/components/ui/avatar";
import { Guilloche } from "@/components/ui/guilloche";

/** Cadre de l'application : menu latéral fixe sur écran large, tiroir sur mobile. */
export function AppShell({ items, userName, roleLabel, children }: { items: NavItem[]; userName: string; roleLabel: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="min-h-screen md:flex">
      <a href="#contenu" className="sr-only rounded-lg bg-white px-3 py-2 text-sm font-semibold text-sky-800 focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60]">Aller au contenu</a>

      <header className="on-dark sticky top-0 z-30 flex items-center justify-between bg-fleuve px-4 py-3 text-white md:hidden">
        <Brand compact />
        <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-[10px] border border-white/20 bg-white/10 px-3.5 text-sm font-semibold" aria-expanded={open} aria-controls="menu-principal" onClick={() => setOpen(true)}>
          <Menu className="h-4 w-4" aria-hidden /> Menu
        </button>
      </header>

      {open && <div className="fixed inset-0 z-40 bg-slate-950/55 md:hidden" onClick={() => setOpen(false)} aria-hidden />}

      <aside id="menu-principal"
        className={`on-dark fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-hidden bg-gradient-to-b from-fleuve to-fleuve-2 text-white transition-[transform,visibility] duration-200 md:sticky md:top-0 md:h-screen md:w-[17rem] md:shrink-0 md:translate-x-0 md:visible ${open ? "translate-x-0" : "-translate-x-full invisible"}`}>
        <Guilloche className="pointer-events-none absolute -bottom-40 -left-32 w-[26rem] text-white/[0.06]" rings={14} points={100} />
        <div className="relative flex items-center justify-between px-6 pb-5 pt-6">
          <Brand />
          <button type="button" className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white md:hidden" onClick={() => setOpen(false)} aria-label="Fermer le menu">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="relative flex-1 overflow-y-auto px-3.5 pb-4"><Sidebar items={items} /></div>
        <div className="relative border-t border-white/10 px-5 py-4">
          <div className="mb-2.5 flex items-center gap-3">
            <Avatar name={userName} size="md" onDark />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{userName}</p>
              <p className="truncate text-xs text-slate-300">{roleLabel}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <main id="contenu" tabIndex={-1} className="min-w-0 flex-1 px-4 py-7 focus:outline-none md:px-12 md:py-11">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
