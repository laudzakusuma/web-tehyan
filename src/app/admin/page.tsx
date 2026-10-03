import { redirect } from "next/navigation";

import {
  getCurrentAdmin,
} from "@/server/auth/admin-session";

export const dynamic =
  "force-dynamic";

export default async function AdminPage() {
  const admin =
    await getCurrentAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  redirect("/admin/pesanan");
}