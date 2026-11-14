"use client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useApiAction } from "@/hooks/use-api";

export function LogoutButton() {
  const router = useRouter();
  const { pending, run } = useApiAction();
  return (
    <button className="inline-flex items-center gap-2 rounded-lg px-1 py-1 text-sm text-slate-300 transition-colors hover:text-white disabled:opacity-50" disabled={pending}
      onClick={async () => { await run("/api/auth/logout", { method: "POST", body: {} }); router.replace("/login"); router.refresh(); }}>
      <LogOut className="h-4 w-4" aria-hidden /> Se déconnecter
    </button>
  );
}
