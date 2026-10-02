"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type PromotionItem = {
  id: string;
  title: string;
  detail: string;
  active: boolean;
  endsOn: string | null;
};

type PromotionForm = {
  title: string;
  detail: string;
  active: boolean;
  endsOn: string;
};

const emptyForm: PromotionForm = {
  title: "",
  detail: "",
  active: true,
  endsOn: "",
};

export function PromotionManager({
  promotions,
}: {
  promotions: PromotionItem[];
}) {
  const router = useRouter();

  const [form, setForm] =
    useState<PromotionForm>(
      emptyForm,
    );

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState<string | null>(null);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError(null);
  }

  function edit(
    promotion: PromotionItem,
  ) {
    setEditingId(
      promotion.id,
    );

    setForm({
      title: promotion.title,
      detail: promotion.detail,
      active: promotion.active,
      endsOn:
        promotion.endsOn ?? "",
    });

    setError(null);
    setMessage(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const endpoint = editingId
        ? `/api/admin/promotions/${encodeURIComponent(
            editingId,
          )}`
        : "/api/admin/promotions";

      const response = await fetch(
        endpoint,
        {
          method: editingId
            ? "PATCH"
            : "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            title: form.title,
            detail: form.detail,
            active: form.active,

            endsOn:
              form.endsOn ||
              null,
          }),
        },
      );

      const body =
        await response.json();

      if (!response.ok) {
        setError(
          body.error ??
            "Promo belum dapat disimpan.",
        );

        return;
      }

      setMessage(
        editingId
          ? "Promo berhasil diperbarui."
          : "Promo berhasil dibuat.",
      );

      setForm(emptyForm);
      setEditingId(null);

      router.refresh();
    } catch {
      setError(
        "Tidak dapat terhubung ke server.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function toggle(
    promotion: PromotionItem,
  ) {
    if (actionLoading) return;

    setActionLoading(
      promotion.id,
    );

    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/admin/promotions/${encodeURIComponent(
          promotion.id,
        )}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            title:
              promotion.title,

            detail:
              promotion.detail,

            active:
              !promotion.active,

            endsOn:
              promotion.endsOn,
          }),
        },
      );

      const body =
        await response.json();

      if (!response.ok) {
        setError(
          body.error ??
            "Status promo gagal diperbarui.",
        );

        return;
      }

      setMessage(
        promotion.active
          ? "Promo dinonaktifkan."
          : "Promo diaktifkan.",
      );

      router.refresh();
    } catch {
      setError(
        "Tidak dapat terhubung ke server.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function remove(
    promotion: PromotionItem,
  ) {
    if (
      promotion.active ||
      actionLoading
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Hapus promo "${promotion.title}"?`,
      );

    if (!confirmed) return;

    setActionLoading(
      promotion.id,
    );

    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/admin/promotions/${encodeURIComponent(
          promotion.id,
        )}`,
        {
          method: "DELETE",
        },
      );

      const body =
        await response.json();

      if (!response.ok) {
        setError(
          body.error ??
            "Promo belum dapat dihapus.",
        );

        return;
      }

      if (
        editingId ===
        promotion.id
      ) {
        resetForm();
      }

      setMessage(
        "Promo berhasil dihapus.",
      );

      router.refresh();
    } catch {
      setError(
        "Tidak dapat terhubung ke server.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="grid gap-14 lg:grid-cols-[390px_minmax(0,1fr)]">
      <section>
        <div className="lg:sticky lg:top-28">
          <p className="text-xs uppercase tracking-[0.2em] text-genteng">
            {editingId
              ? "Edit promo"
              : "Promo baru"}
          </p>

          <h2 className="mt-3 font-display text-3xl font-light">
            {editingId
              ? "Perbarui penawaran."
              : "Buat penawaran."}
          </h2>

          <form
            onSubmit={submit}
            className="mt-8 space-y-6"
          >
            <label className="block">
              <span className="mb-2 block text-sm">
                Judul promo
              </span>

              <input
                required
                minLength={3}
                maxLength={120}
                value={form.title}
                onChange={(
                  event,
                ) =>
                  setForm(
                    (current) => ({
                      ...current,
                      title:
                        event.target
                          .value,
                    }),
                  )
                }
                className="h-12 w-full border border-pasir bg-transparent px-4 outline-none transition-colors focus:border-seduh"
                placeholder="Contoh: Beli 2 Teh Susu..."
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm">
                Syarat / detail
              </span>

              <textarea
                required
                minLength={3}
                maxLength={500}
                rows={6}
                value={form.detail}
                onChange={(
                  event,
                ) =>
                  setForm(
                    (current) => ({
                      ...current,
                      detail:
                        event.target
                          .value,
                    }),
                  )
                }
                className="w-full resize-none border border-pasir bg-transparent p-4 outline-none transition-colors focus:border-seduh"
                placeholder="Jelaskan hari, minimum pembelian, stok, atau syarat lainnya."
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm">
                Tanggal berakhir
              </span>

              <input
                type="date"
                value={form.endsOn}
                onChange={(
                  event,
                ) =>
                  setForm(
                    (current) => ({
                      ...current,
                      endsOn:
                        event.target
                          .value,
                    }),
                  )
                }
                className="h-12 w-full border border-pasir bg-transparent px-4 outline-none transition-colors focus:border-seduh"
              />

              <span className="mt-2 block text-xs leading-5 text-seduh-soft">
                Kosongkan jika promo
                berlaku sampai
                pemberitahuan berikutnya.
              </span>
            </label>

            <label className="flex items-center gap-3 border-y border-pasir py-4">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(
                  event,
                ) =>
                  setForm(
                    (current) => ({
                      ...current,
                      active:
                        event.target
                          .checked,
                    }),
                  )
                }
              />

              <span className="text-sm">
                Tampilkan sebagai
                promo aktif
              </span>
            </label>

            {error && (
              <div
                role="alert"
                className="border border-genteng p-4 text-sm text-genteng"
              >
                {error}
              </div>
            )}

            {message && (
              <div className="border border-pasir p-4 text-sm">
                {message}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 items-center bg-seduh px-5 text-gading disabled:opacity-50"
              >
                {loading
                  ? "Menyimpan..."
                  : editingId
                    ? "Simpan perubahan"
                    : "Buat promo"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex h-11 items-center border border-seduh px-5"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-5 border-b border-seduh pb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-seduh-soft">
              Daftar promo
            </p>

            <h2 className="mt-2 font-display text-3xl font-light">
              Penawaran tersimpan
            </h2>
          </div>

          <p className="text-sm text-seduh-soft">
            {promotions.length} promo
          </p>
        </div>

        {promotions.length === 0 ? (
          <div className="py-12">
            <p className="font-display text-2xl">
              Belum ada promo.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-pasir">
            {promotions.map(
              (promotion) => (
                <article
                  key={promotion.id}
                  className="py-8"
                >
                  <div className="flex flex-wrap items-start justify-between gap-5">
                    <div className="max-w-[620px]">
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={
                            promotion.active
                              ? "text-xs uppercase tracking-[0.14em] text-genteng"
                              : "text-xs uppercase tracking-[0.14em] text-seduh-soft"
                          }
                        >
                          {promotion.active
                            ? "Aktif"
                            : "Nonaktif"}
                        </span>

                        <span className="text-xs text-seduh-soft">
                          {promotion.endsOn
                            ? `Berakhir ${promotion.endsOn}`
                            : "Tanpa tanggal akhir"}
                        </span>
                      </div>

                      <h3 className="mt-3 font-display text-2xl">
                        {
                          promotion.title
                        }
                      </h3>

                      <p className="mt-3 max-w-[60ch] leading-7 text-seduh-soft">
                        {
                          promotion.detail
                        }
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        edit(
                          promotion,
                        )
                      }
                      className="border-b border-seduh px-1 py-2 text-sm"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      disabled={Boolean(
                        actionLoading,
                      )}
                      onClick={() =>
                        toggle(
                          promotion,
                        )
                      }
                      className="border-b border-seduh px-1 py-2 text-sm disabled:opacity-50"
                    >
                      {actionLoading ===
                      promotion.id
                        ? "Memproses..."
                        : promotion.active
                          ? "Nonaktifkan"
                          : "Aktifkan"}
                    </button>

                    {!promotion.active && (
                      <button
                        type="button"
                        disabled={Boolean(
                          actionLoading,
                        )}
                        onClick={() =>
                          remove(
                            promotion,
                          )
                        }
                        className="border-b border-genteng px-1 py-2 text-sm text-genteng disabled:opacity-50"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}