import { redirect } from "next/navigation";

import {
  AdminLoginForm,
} from "@/features/admin/AdminLoginForm";

import {
  getCurrentAdmin,
} from "@/server/auth/admin-session";

export const dynamic =
  "force-dynamic";

export default async function AdminLoginPage() {
  const admin =
    await getCurrentAdmin();

  if (admin) {
    redirect(
      "/admin/pesanan",
    );
  }

  return (
    <main className="mx-auto grid min-h-[75vh] max-w-[1100px] items-center px-4 py-16 md:px-10">
      <div className="grid gap-12 lg:grid-cols-[1fr_420px] lg:items-center">
        <section>
          <p className="text-xs uppercase tracking-[0.22em] text-genteng">
            Kedai Tehyan
          </p>

          <h1 className="mt-4 max-w-[10ch] font-display text-5xl font-light leading-[0.95] md:text-7xl">
            Ruang kerja kedai.
          </h1>

          <p className="mt-6 max-w-[42ch] leading-7 text-seduh-soft">
            Area internal untuk
            mengelola pesanan Kedai
            Tehyan.
          </p>
        </section>

        <section className="border-t border-seduh pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
          <p className="text-xs uppercase tracking-[0.18em] text-seduh-soft">
            Admin
          </p>

          <h2 className="mt-3 font-display text-3xl font-light">
            Masuk
          </h2>

          <AdminLoginForm />
        </section>
      </div>
    </main>
  );
}