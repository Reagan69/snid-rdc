"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Sidebar } from "@/components/navigation/sidebar";
import type { NavItem } from "@/components/navigation/nav-items";
import { LogoutButton } from "@/components/layout/logout-button";
import { Brand } from "@/components/layout/brand";

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

      <header className="on-dark sticky top-0 z-30 flex items-center justify-between bg-nuit px-4 py-3 text-white md:hidden">
        <Brand compact />
        <button type="button" className="btn btn-sidebar" aria-expanded={open} aria-controls="menu-principal" onClick={() => setOpen(true)}>
          <Menu className="h-4 w-4" aria-hidden /> Menu
        </button>
      </header>

      {open && <div className="fixed inset-0 z-40 bg-slate-950/50 md:hidden" onClick={() => setOpen(false)} aria-hidden />}

      <aside id="menu-principal"
        className={`on-dark fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-nuit text-white transition-[transform,visibility] duration-200 md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:translate-x-0 md:visible ${open ? "translate-x-0" : "-translate-x-full invisible"}`}>
        <div className="flex items-center justify-between px-5 pb-4 pt-5">
          <Brand />
          <button type="button" className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white md:hidden" onClick={() => setOpen(false)} aria-label="Fermer le menu">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4"><Sidebar items={items} /></div>
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-semibold">{userName}</p>
          <p className="mb-3 truncate text-xs text-slate-300">{roleLabel}</p>
          <LogoutButton />
        </div>
      </aside>

      <main id="contenu" tabIndex={-1} className="min-w-0 flex-1 px-4 py-6 focus:outline-none md:px-10 md:py-9">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
