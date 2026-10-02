"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type ArticleStatus =
  | "DRAFT"
  | "PUBLISHED";

type ArticleItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImageUrl: string | null;
  status: ArticleStatus;
  publishedAt: string | null;
};

type ArticleForm = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  status: ArticleStatus;
};

const emptyForm: ArticleForm = {
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  coverImageUrl: "",
  status: "DRAFT",
};

function slugify(
  value: string,
) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    )
    .slice(0, 100);
}

export function ArticleManager({
  articles,
}: {
  articles: ArticleItem[];
}) {
  const router = useRouter();

  const [form, setForm] =
    useState<ArticleForm>(
      emptyForm,
    );

  const [
    editingId,
    setEditingId,
  ] = useState<string | null>(
    null,
  );

  const [
    slugTouched,
    setSlugTouched,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [
    actionLoading,
    setActionLoading,
  ] = useState<string | null>(
    null,
  );

  const [error, setError] =
    useState<string | null>(
      null,
    );

  const [message, setMessage] =
    useState<string | null>(
      null,
    );

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setSlugTouched(false);
    setError(null);
  }

  function edit(
    article: ArticleItem,
  ) {
    setEditingId(article.id);

    setForm({
      slug: article.slug,
      title: article.title,
      excerpt:
        article.excerpt,
      content:
        article.content,
      coverImageUrl:
        article.coverImageUrl ??
        "",
      status:
        article.status,
    });

    setSlugTouched(true);
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
      const endpoint =
        editingId
          ? `/api/admin/articles/${encodeURIComponent(
              editingId,
            )}`
          : "/api/admin/articles";

      const response =
        await fetch(
          endpoint,
          {
            method:
              editingId
                ? "PATCH"
                : "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              slug: form.slug,
              title:
                form.title,
              excerpt:
                form.excerpt,
              content:
                form.content,

              coverImageUrl:
                form
                  .coverImageUrl
                  .trim() ||
                null,

              status:
                form.status,
            }),
          },
        );

      const body =
        await response.json();

      if (!response.ok) {
        setError(
          body.error ??
            "Artikel belum dapat disimpan.",
        );

        return;
      }

      setMessage(
        editingId
          ? "Artikel berhasil diperbarui."
          : "Artikel berhasil dibuat.",
      );

      setForm(emptyForm);
      setEditingId(null);
      setSlugTouched(false);

      router.refresh();
    } catch {
      setError(
        "Tidak dapat terhubung ke server.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(
    article: ArticleItem,
    status: ArticleStatus,
  ) {
    if (actionLoading) {
      return;
    }

    setActionLoading(
      article.id,
    );

    setError(null);
    setMessage(null);

    try {
      const response =
        await fetch(
          `/api/admin/articles/${encodeURIComponent(
            article.id,
          )}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                slug:
                  article.slug,

                title:
                  article.title,

                excerpt:
                  article.excerpt,

                content:
                  article.content,

                coverImageUrl:
                  article.coverImageUrl,

                status,
              }),
          },
        );

      const body =
        await response.json();

      if (!response.ok) {
        setError(
          body.error ??
            "Status artikel gagal diperbarui.",
        );

        return;
      }

      setMessage(
        status ===
          "PUBLISHED"
          ? "Artikel diterbitkan."
          : "Artikel dikembalikan ke draft.",
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
    article: ArticleItem,
  ) {
    if (
      article.status ===
        "PUBLISHED" ||
      actionLoading
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Hapus artikel "${article.title}"?`,
      );

    if (!confirmed) {
      return;
    }

    setActionLoading(
      article.id,
    );

    setError(null);
    setMessage(null);

    try {
      const response =
        await fetch(
          `/api/admin/articles/${encodeURIComponent(
            article.id,
          )}`,
          {
            method:
              "DELETE",
          },
        );

      const body =
        await response.json();

      if (!response.ok) {
        setError(
          body.error ??
            "Artikel belum dapat dihapus.",
        );

        return;
      }

      if (
        editingId ===
        article.id
      ) {
        resetForm();
      }

      setMessage(
        "Artikel berhasil dihapus.",
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
    <div className="grid gap-14 lg:grid-cols-[420px_minmax(0,1fr)]">
      <section>
        <div className="lg:sticky lg:top-28">
          <p className="text-xs uppercase tracking-[0.2em] text-genteng">
            {editingId
              ? "Edit catatan"
              : "Catatan baru"}
          </p>

          <h2 className="mt-3 font-display text-3xl font-light">
            {editingId
              ? "Perbarui tulisan."
              : "Tulis sesuatu."}
          </h2>

          <form
            onSubmit={submit}
            className="mt-8 space-y-6"
          >
            <label className="block">
              <span className="mb-2 block text-sm">
                Judul
              </span>

              <input
                required
                minLength={3}
                maxLength={160}
                value={
                  form.title
                }
                onChange={(
                  event,
                ) => {
                  const title =
                    event.target
                      .value;

                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,
                      title,

                      slug:
                        slugTouched
                          ? current.slug
                          : slugify(
                              title,
                            ),
                    }),
                  );
                }}
                className="h-12 w-full border border-pasir bg-transparent px-4 outline-none transition-colors focus:border-seduh"
                placeholder="Judul catatan"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm">
                Slug URL
              </span>

              <input
                required
                minLength={3}
                maxLength={100}
                value={
                  form.slug
                }
                onChange={(
                  event,
                ) => {
                  setSlugTouched(
                    true,
                  );

                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      slug:
                        slugify(
                          event
                            .target
                            .value,
                        ),
                    }),
                  );
                }}
                className="h-12 w-full border border-pasir bg-transparent px-4 font-mono text-sm outline-none transition-colors focus:border-seduh"
                placeholder="judul-catatan"
              />

              <span className="mt-2 block text-xs text-seduh-soft">
                /journal/
                {form.slug ||
                  "judul-catatan"}
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm">
                Ringkasan
              </span>

              <textarea
                required
                minLength={10}
                maxLength={300}
                rows={4}
                value={
                  form.excerpt
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      excerpt:
                        event
                          .target
                          .value,
                    }),
                  )
                }
                className="w-full resize-none border border-pasir bg-transparent p-4 outline-none transition-colors focus:border-seduh"
                placeholder="Ringkasan singkat artikel."
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm">
                Isi artikel
              </span>

              <textarea
                required
                minLength={20}
                maxLength={20000}
                rows={14}
                value={
                  form.content
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      content:
                        event
                          .target
                          .value,
                    }),
                  )
                }
                className="w-full resize-y border border-pasir bg-transparent p-4 font-serif leading-7 outline-none transition-colors focus:border-seduh"
                placeholder="Tulis artikel di sini. Pisahkan paragraf dengan baris kosong."
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm">
                Cover image URL
              </span>

              <input
                maxLength={500}
                value={
                  form.coverImageUrl
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      coverImageUrl:
                        event
                          .target
                          .value,
                    }),
                  )
                }
                className="h-12 w-full border border-pasir bg-transparent px-4 outline-none transition-colors focus:border-seduh"
                placeholder="Opsional"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm">
                Status
              </span>

              <select
                value={
                  form.status
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      status:
                        event
                          .target
                          .value as ArticleStatus,
                    }),
                  )
                }
                className="h-12 w-full border border-pasir bg-transparent px-4 outline-none"
              >
                <option value="DRAFT">
                  Draft
                </option>

                <option value="PUBLISHED">
                  Published
                </option>
              </select>
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
                disabled={
                  loading
                }
                className="inline-flex h-11 items-center bg-seduh px-5 text-gading disabled:opacity-50"
              >
                {loading
                  ? "Menyimpan..."
                  : editingId
                    ? "Simpan perubahan"
                    : "Buat artikel"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={
                    resetForm
                  }
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
              Journal
            </p>

            <h2 className="mt-2 font-display text-3xl font-light">
              Catatan tersimpan
            </h2>
          </div>

          <p className="text-sm text-seduh-soft">
            {articles.length} artikel
          </p>
        </div>

        {articles.length === 0 ? (
          <div className="py-12">
            <p className="font-display text-2xl">
              Belum ada artikel.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-pasir">
            {articles.map(
              (article) => (
                <article
                  key={
                    article.id
                  }
                  className="py-8"
                >
                  <div className="flex flex-wrap items-start justify-between gap-6">
                    <div className="max-w-[640px]">
                      <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.14em]">
                        <span
                          className={
                            article.status ===
                            "PUBLISHED"
                              ? "text-genteng"
                              : "text-seduh-soft"
                          }
                        >
                          {
                            article.status
                          }
                        </span>

                        {article.publishedAt && (
                          <span className="text-seduh-soft">
                            Published{" "}
                            {new Date(
                              article.publishedAt,
                            ).toLocaleDateString(
                              "id-ID",
                            )}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3 font-display text-2xl">
                        {
                          article.title
                        }
                      </h3>

                      <p className="mt-2 font-mono text-xs text-seduh-soft">
                        /journal/
                        {article.slug}
                      </p>

                      <p className="mt-4 leading-7 text-seduh-soft">
                        {
                          article.excerpt
                        }
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        edit(
                          article,
                        )
                      }
                      className="border-b border-seduh px-1 py-2 text-sm"
                    >
                      Edit
                    </button>

                    {article.status ===
                    "DRAFT" ? (
                      <button
                        type="button"
                        disabled={Boolean(
                          actionLoading,
                        )}
                        onClick={() =>
                          changeStatus(
                            article,
                            "PUBLISHED",
                          )
                        }
                        className="border-b border-seduh px-1 py-2 text-sm disabled:opacity-50"
                      >
                        {actionLoading ===
                        article.id
                          ? "Memproses..."
                          : "Publish"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={Boolean(
                          actionLoading,
                        )}
                        onClick={() =>
                          changeStatus(
                            article,
                            "DRAFT",
                          )
                        }
                        className="border-b border-seduh px-1 py-2 text-sm disabled:opacity-50"
                      >
                        {actionLoading ===
                        article.id
                          ? "Memproses..."
                          : "Jadikan draft"}
                      </button>
                    )}

                    {article.status ===
                      "PUBLISHED" && (
                      <a
                        href={`/journal/${article.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="border-b border-seduh px-1 py-2 text-sm"
                      >
                        Lihat publik
                      </a>
                    )}

                    {article.status ===
                      "DRAFT" && (
                      <button
                        type="button"
                        disabled={Boolean(
                          actionLoading,
                        )}
                        onClick={() =>
                          remove(
                            article,
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