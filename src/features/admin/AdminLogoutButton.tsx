"use client";

import { useState } from "react";

export function AdminLogoutButton() {
  const [loading, setLoading] =
    useState(false);

  async function logout() {
    if (loading) return;

    setLoading(true);

    try {
      const response = await fetch(
        "/api/admin/logout",
        {
          method: "POST",
          credentials: "same-origin",
        },
      );

      if (!response.ok) {
        setLoading(false);
        return;
      }

      /*
       * Tidak perlu router.refresh().
       * Full navigation memastikan cookie
       * logout sudah diterapkan sebelum
       * halaman admin berikutnya dibaca.
       */
      window.location.replace(
        "/admin/login",
      );
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className="border-b border-transparent pb-1 text-sm transition-colors hover:border-seduh disabled:cursor-wait disabled:opacity-50"
    >
      {loading
        ? "Keluar..."
        : "Logout"}
    </button>
  );
}