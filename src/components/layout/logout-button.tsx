"use client";
import { useRouter } from "next/navigation";
import { useApiAction } from "@/hooks/use-api";

export function LogoutButton() {
  const router = useRouter();
  const { pending, run } = useApiAction();
  return (
    <button className="btn btn-sidebar w-full" disabled={pending} onClick={async () => { await run("/api/auth/logout", { method: "POST", body: {} }); router.replace("/login"); router.refresh(); }}>
      Se déconnecter
    </button>
  );
}
