import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";

export default async function Home() {
  redirect((await getAuthContext()) ? "/dashboard" : "/login");
}
