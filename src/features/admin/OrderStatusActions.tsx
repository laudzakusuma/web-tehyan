"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type Status =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "COMPLETED"
  | "CANCELLED";

const transitions: Record<
  Status,
  {
    status: string;
    label: string;
  }[]
> = {
  PENDING: [
    {
      status: "CONFIRMED",
      label: "Konfirmasi",
    },
    {
      status: "CANCELLED",
      label: "Batalkan",
    },
  ],

  CONFIRMED: [
    {
      status: "PREPARING",
      label: "Mulai siapkan",
    },
    {
      status: "CANCELLED",
      label: "Batalkan",
    },
  ],

  PREPARING: [
    {
      status: "READY",
      label: "Siap diambil",
    },
    {
      status: "CANCELLED",
      label: "Batalkan",
    },
  ],

  READY: [
    {
      status: "COMPLETED",
      label: "Selesaikan",
    },
  ],

  OUT_FOR_DELIVERY: [
    {
      status: "COMPLETED",
      label: "Selesaikan",
    },
  ],

  COMPLETED: [],
  CANCELLED: [],
};

export function OrderStatusActions({
  code,
  status,
}: {
  code: string;
  status: Status;
}) {
  const router = useRouter();

  const [loading, setLoading] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const actions =
    transitions[status];

  if (actions.length === 0) {
    return (
      <p className="text-sm text-seduh-soft">
        Status akhir.
      </p>
    );
  }

  async function update(
    nextStatus: string,
  ) {
    if (loading) return;

    setLoading(nextStatus);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/orders/${encodeURIComponent(
          code,
        )}/status`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            status: nextStatus,
          }),
        },
      );

      const body =
        await response.json();

      if (!response.ok) {
        setError(
          body.error ??
            "Status gagal diperbarui.",
        );

        return;
      }

      router.refresh();
    } catch {
      setError(
        "Tidak dapat terhubung ke server.",
      );
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.status}
            type="button"
            disabled={Boolean(
              loading,
            )}
            onClick={() =>
              update(
                action.status,
              )
            }
            className="border border-seduh px-4 py-2 text-sm transition-colors hover:bg-seduh hover:text-gading disabled:opacity-50"
          >
            {loading ===
            action.status
              ? "Memproses..."
              : action.label}
          </button>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 text-sm text-genteng"
        >
          {error}
        </p>
      )}
    </div>
  );
}