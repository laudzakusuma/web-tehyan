"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type EmploymentType =
  | "FULL_TIME"
  | "PART_TIME"
  | "CONTRACT"
  | "INTERNSHIP";

type JobStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "CLOSED";

type ApplicationStatus =
  | "NEW"
  | "REVIEWING"
  | "SHORTLISTED"
  | "REJECTED"
  | "HIRED";

type JobItem = {
  id: string;
  slug: string;
  title: string;
  location: string;
  employmentType: EmploymentType;
  summary: string;
  responsibilities: string;
  requirements: string;
  status: JobStatus;
  publishedAt: string | null;
  applicationCount: number;
};

type ApplicationItem = {
  id: string;
  name: string;
  email: string;
  phone: string;
  portfolioUrl: string | null;
  message: string | null;
  status: ApplicationStatus;
  createdAt: string;

  job: {
    id: string;
    slug: string;
    title: string;
  };
};

type JobForm = {
  slug: string;
  title: string;
  location: string;
  employmentType: EmploymentType;
  summary: string;
  responsibilities: string;
  requirements: string;
  status: JobStatus;
};

const emptyForm: JobForm = {
  slug: "",
  title: "",
  location: "",
  employmentType:
    "FULL_TIME",
  summary: "",
  responsibilities: "",
  requirements: "",
  status: "DRAFT",
};

const employmentLabels: Record<
  EmploymentType,
  string
> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Kontrak",
  INTERNSHIP: "Magang",
};

const applicationLabels: Record<
  ApplicationStatus,
  string
> = {
  NEW: "Baru",
  REVIEWING: "Ditinjau",
  SHORTLISTED:
    "Shortlisted",
  REJECTED: "Ditolak",
  HIRED: "Diterima",
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
    .slice(0, 120);
}

export function CareerManager({
  jobs,
  applications,
}: {
  jobs: JobItem[];
  applications: ApplicationItem[];
}) {
  const router =
    useRouter();

  const [
    applicationRows,
    setApplicationRows,
    ] = useState<ApplicationItem[]>(
    applications,
    );

  const [
    form,
    setForm,
  ] =
    useState<JobForm>(
      emptyForm,
    );

  const [
    editingId,
    setEditingId,
  ] = useState<
    string | null
  >(null);

  const [
    slugTouched,
    setSlugTouched,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    actionLoading,
    setActionLoading,
  ] = useState<
    string | null
  >(null);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    message,
    setMessage,
  ] = useState<
    string | null
  >(null);

  function resetForm() {
    setForm(
      emptyForm,
    );

    setEditingId(
      null,
    );

    setSlugTouched(
      false,
    );

    setError(null);
  }

  function editJob(
    job: JobItem,
  ) {
    setEditingId(
      job.id,
    );

    setSlugTouched(
      true,
    );

    setForm({
      slug: job.slug,
      title: job.title,
      location:
        job.location,

      employmentType:
        job.employmentType,

      summary:
        job.summary,

      responsibilities:
        job.responsibilities,

      requirements:
        job.requirements,

      status:
        job.status,
    });

    setError(null);
    setMessage(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function submitJob(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const endpoint =
        editingId
          ? `/api/admin/jobs/${encodeURIComponent(
              editingId,
            )}`
          : "/api/admin/jobs";

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

            body:
              JSON.stringify(
                form,
              ),
          },
        );

      const body =
        await response.json();

      if (!response.ok) {
        const fieldMessages =
            body.fields &&
            typeof body.fields === "object"
            ? Object.entries(body.fields)
                .flatMap(([field, messages]) =>
                    Array.isArray(messages)
                    ? messages.map(
                        (message) =>
                            `${field}: ${message}`,
                        )
                    : [],
                )
                .join(" ")
            : "";

        setError(
            fieldMessages ||
            body.error ||
            "Lowongan belum dapat disimpan.",
        );

        return;
        }

      setMessage(
        editingId
          ? "Lowongan berhasil diperbarui."
          : "Lowongan berhasil dibuat.",
      );

      resetForm();
      router.refresh();
    } catch {
      setError(
        "Tidak dapat terhubung ke server.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function changeJobStatus(
    job: JobItem,
    status: JobStatus,
  ) {
    if (
      actionLoading
    ) {
      return;
    }

    setActionLoading(
      job.id,
    );

    setError(null);
    setMessage(null);

    try {
      const response =
        await fetch(
          `/api/admin/jobs/${encodeURIComponent(
            job.id,
          )}`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                slug:
                  job.slug,

                title:
                  job.title,

                location:
                  job.location,

                employmentType:
                  job.employmentType,

                summary:
                  job.summary,

                responsibilities:
                  job.responsibilities,

                requirements:
                  job.requirements,

                status,
              }),
          },
        );

      const body =
        await response.json();

      if (!response.ok) {
        setError(
          body.error ??
            "Status lowongan gagal diperbarui.",
        );

        return;
      }

      setMessage(
        status ===
          "PUBLISHED"
          ? "Lowongan diterbitkan."
          : status ===
              "CLOSED"
            ? "Lowongan ditutup."
            : "Lowongan disimpan sebagai draft.",
      );

      router.refresh();
    } catch {
      setError(
        "Tidak dapat terhubung ke server.",
      );
    } finally {
      setActionLoading(
        null,
      );
    }
  }

  async function deleteJob(
    job: JobItem,
  ) {
    if (
      actionLoading
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Hapus lowongan "${job.title}"?`,
      );

    if (!confirmed) {
      return;
    }

    setActionLoading(
      job.id,
    );

    setError(null);
    setMessage(null);

    try {
      const response =
        await fetch(
          `/api/admin/jobs/${encodeURIComponent(
            job.id,
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
            "Lowongan belum dapat dihapus.",
        );

        return;
      }

      if (
        editingId ===
        job.id
      ) {
        resetForm();
      }

      setMessage(
        "Lowongan berhasil dihapus.",
      );

      router.refresh();
    } catch {
      setError(
        "Tidak dapat terhubung ke server.",
      );
    } finally {
      setActionLoading(
        null,
      );
    }
  }

  async function updateCandidateStatus(
    application: ApplicationItem,
    status: ApplicationStatus,
    ) {
    if (actionLoading) {
        return;
    }

    setActionLoading(
        application.id,
    );

    setError(null);
    setMessage(null);

    try {
        const response =
        await fetch(
            `/api/admin/applications/${encodeURIComponent(
            application.id,
            )}/status`,
            {
            method: "PATCH",

            headers: {
                "Content-Type":
                "application/json",
            },

            body:
                JSON.stringify({
                status,
                }),
            },
        );

        const body =
        await response.json();

        if (!response.ok) {
        setError(
            body.error ??
            "Status pelamar gagal diperbarui.",
        );

        return;
        }

        setApplicationRows(
        (current) =>
            current.map(
            (item) =>
                item.id ===
                application.id
                ? {
                    ...item,
                    status:
                        body.application
                        ?.status ??
                        status,
                    }
                : item,
            ),
        );

        setMessage(
        `Status ${application.name} diperbarui menjadi ${applicationLabels[status]}.`,
        );

        router.refresh();
    } catch {
        setError(
        "Tidak dapat terhubung ke server.",
        );
    } finally {
        setActionLoading(
        null,
        );
    }
    }

  return (
    <div className="space-y-20">
      <section className="grid gap-14 lg:grid-cols-[420px_minmax(0,1fr)]">
        <div>
          <div className="lg:sticky lg:top-28">
            <p className="text-xs uppercase tracking-[0.2em] text-genteng">
              {editingId
                ? "Edit lowongan"
                : "Lowongan baru"}
            </p>

            <h2 className="mt-3 font-display text-3xl font-light">
              {editingId
                ? "Perbarui posisi."
                : "Buka kesempatan baru."}
            </h2>

            <form
              onSubmit={
                submitJob
              }
              className="mt-8 space-y-6"
            >
              <label className="block">
                <span className="mb-2 block text-sm">
                  Nama posisi
                </span>

                <input
                  required
                  minLength={
                    3
                  }
                  maxLength={
                    160
                  }
                  value={
                    form.title
                  }
                  onChange={(
                    event,
                  ) => {
                    const title =
                      event
                        .target
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
                  className="h-12 w-full border border-pasir bg-transparent px-4 outline-none focus:border-seduh"
                  placeholder="Contoh: Barista"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm">
                  Slug URL
                </span>

                <input
                  required
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
                  className="h-12 w-full border border-pasir bg-transparent px-4 font-mono text-sm outline-none focus:border-seduh"
                />

                <span className="mt-2 block text-xs text-seduh-soft">
                  /karier/
                  {form.slug ||
                    "nama-posisi"}
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm">
                  Lokasi
                </span>

                <input
                  required
                  value={
                    form.location
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        location:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  className="h-12 w-full border border-pasir bg-transparent px-4 outline-none focus:border-seduh"
                  placeholder="Depok"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm">
                  Tipe kerja
                </span>

                <select
                  value={
                    form.employmentType
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        employmentType:
                          event
                            .target
                            .value as EmploymentType,
                      }),
                    )
                  }
                  className="h-12 w-full border border-pasir bg-transparent px-4"
                >
                  <option value="FULL_TIME">
                    Full-time
                  </option>

                  <option value="PART_TIME">
                    Part-time
                  </option>

                  <option value="CONTRACT">
                    Kontrak
                  </option>

                  <option value="INTERNSHIP">
                    Magang
                  </option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm">
                  Ringkasan
                </span>

                <textarea
                  required
                  rows={4}
                  value={
                    form.summary
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        summary:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  className="w-full border border-pasir bg-transparent p-4 leading-7 outline-none focus:border-seduh"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm">
                  Tanggung jawab
                </span>

                <textarea
                  required
                  rows={8}
                  value={
                    form.responsibilities
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        responsibilities:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  className="w-full border border-pasir bg-transparent p-4 leading-7 outline-none focus:border-seduh"
                  placeholder="Pisahkan poin atau paragraf dengan baris baru."
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm">
                  Persyaratan
                </span>

                <textarea
                  required
                  rows={8}
                  value={
                    form.requirements
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        requirements:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  className="w-full border border-pasir bg-transparent p-4 leading-7 outline-none focus:border-seduh"
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
                            .value as JobStatus,
                      }),
                    )
                  }
                  className="h-12 w-full border border-pasir bg-transparent px-4"
                >
                  <option value="DRAFT">
                    Draft
                  </option>

                  <option value="PUBLISHED">
                    Published
                  </option>

                  <option value="CLOSED">
                    Closed
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
                  className="h-11 bg-seduh px-5 text-gading disabled:opacity-50"
                >
                  {loading
                    ? "Menyimpan..."
                    : editingId
                      ? "Simpan perubahan"
                      : "Buat lowongan"}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={
                      resetForm
                    }
                    className="h-11 border border-seduh px-5"
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div>
          <div className="flex items-end justify-between border-b border-seduh pb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-seduh-soft">
                Rekrutmen
              </p>

              <h2 className="mt-2 font-display text-3xl font-light">
                Lowongan
              </h2>
            </div>

            <p className="text-sm text-seduh-soft">
              {jobs.length} posisi
            </p>
          </div>

          {jobs.length ===
          0 ? (
            <p className="py-12 text-seduh-soft">
              Belum ada lowongan.
            </p>
          ) : (
            <div className="divide-y divide-pasir">
              {jobs.map(
                (job) => (
                  <article
                    key={
                      job.id
                    }
                    className="py-8"
                  >
                    <div className="flex flex-wrap justify-between gap-6">
                      <div className="max-w-[600px]">
                        <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.14em] text-seduh-soft">
                          <span className="text-genteng">
                            {
                              job.status
                            }
                          </span>

                          <span>
                            {
                              employmentLabels[
                                job
                                  .employmentType
                              ]
                            }
                          </span>

                          <span>
                            {
                              job.location
                            }
                          </span>
                        </div>

                        <h3 className="mt-3 font-display text-3xl font-light">
                          {
                            job.title
                          }
                        </h3>

                        <p className="mt-3 leading-7 text-seduh-soft">
                          {
                            job.summary
                          }
                        </p>

                        <p className="mt-3 text-xs text-seduh-soft">
                          {
                            job.applicationCount
                          }{" "}
                          pelamar
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-4 text-sm">
                      <button
                        type="button"
                        onClick={() =>
                          editJob(
                            job,
                          )
                        }
                        className="border-b border-seduh pb-1"
                      >
                        Edit
                      </button>

                      {job.status !==
                        "PUBLISHED" && (
                        <button
                          type="button"
                          disabled={Boolean(
                            actionLoading,
                          )}
                          onClick={() =>
                            changeJobStatus(
                              job,
                              "PUBLISHED",
                            )
                          }
                          className="border-b border-seduh pb-1 disabled:opacity-50"
                        >
                          Publish
                        </button>
                      )}

                      {job.status ===
                        "PUBLISHED" && (
                        <button
                          type="button"
                          disabled={Boolean(
                            actionLoading,
                          )}
                          onClick={() =>
                            changeJobStatus(
                              job,
                              "CLOSED",
                            )
                          }
                          className="border-b border-seduh pb-1 disabled:opacity-50"
                        >
                          Tutup
                        </button>
                      )}

                      {job.status !==
                        "DRAFT" && (
                        <button
                          type="button"
                          disabled={Boolean(
                            actionLoading,
                          )}
                          onClick={() =>
                            changeJobStatus(
                              job,
                              "DRAFT",
                            )
                          }
                          className="border-b border-seduh pb-1 disabled:opacity-50"
                        >
                          Jadikan draft
                        </button>
                      )}

                      {job.status ===
                        "PUBLISHED" && (
                        <a
                          href={`/karier/${job.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="border-b border-seduh pb-1"
                        >
                          Lihat publik
                        </a>
                      )}

                      {job.applicationCount ===
                        0 && (
                        <button
                          type="button"
                          disabled={Boolean(
                            actionLoading,
                          )}
                          onClick={() =>
                            deleteJob(
                              job,
                            )
                          }
                          className="border-b border-genteng pb-1 text-genteng disabled:opacity-50"
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
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between border-b border-seduh pb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-genteng">
              Kandidat
            </p>

            <h2 className="mt-2 font-display text-4xl font-light">
              Pelamar
            </h2>
          </div>

          <p className="text-sm text-seduh-soft">
            {applicationRows.length} lamaran
          </p>
        </div>

        {applicationRows.length ===
        0 ? (
          <p className="py-14 text-seduh-soft">
            Belum ada lamaran masuk.
          </p>
        ) : (
          <div className="divide-y divide-pasir">
            {applicationRows.map(
              (
                application,
              ) => (
                <article
                  key={
                    application.id
                  }
                  className="grid gap-8 py-9 lg:grid-cols-[minmax(0,1fr)_260px]"
                >
                  <div>
                    <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.14em]">
                      <span className="text-genteng">
                        {
                          applicationLabels[
                            application
                              .status
                          ]
                        }
                      </span>

                      <span className="text-seduh-soft">
                        {
                          application
                            .job
                            .title
                        }
                      </span>
                    </div>

                    <h3 className="mt-3 font-display text-3xl font-light">
                      {
                        application.name
                      }
                    </h3>

                    <div className="mt-5 space-y-2 text-sm">
                      <a
                        href={`mailto:${application.email}`}
                        className="block w-fit border-b border-pasir"
                      >
                        {
                          application.email
                        }
                      </a>

                      <a
                        href={`tel:${application.phone}`}
                        className="block w-fit border-b border-pasir"
                      >
                        {
                          application.phone
                        }
                      </a>

                      {application.portfolioUrl && (
                        <a
                          href={
                            application.portfolioUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="block w-fit border-b border-seduh"
                        >
                          Buka portfolio ↗
                        </a>
                      )}
                    </div>

                    {application.message && (
                      <p className="mt-6 max-w-[65ch] whitespace-pre-line leading-7 text-seduh-soft">
                        {
                          application.message
                        }
                      </p>
                    )}

                    <p className="mt-5 text-xs text-seduh-soft">
                      Dikirim{" "}
                      {new Date(
                        application.createdAt,
                      ).toLocaleString(
                        "id-ID",
                      )}
                    </p>
                  </div>

                  <div>
                    <label className="block">
                      <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-seduh-soft">
                        Status kandidat
                      </span>

                      <select
                        value={
                          application.status
                        }
                        disabled={
                          actionLoading ===
                          application.id
                        }
                        onChange={(
                          event,
                        ) =>
                          updateCandidateStatus(
                            application,
                            event
                              .target
                              .value as ApplicationStatus,
                          )
                        }
                        className="h-12 w-full border border-pasir bg-transparent px-4 disabled:opacity-50"
                      >
                        <option value="NEW">
                          Baru
                        </option>

                        <option value="REVIEWING">
                          Ditinjau
                        </option>

                        <option value="SHORTLISTED">
                          Shortlisted
                        </option>

                        <option value="REJECTED">
                          Ditolak
                        </option>

                        <option value="HIRED">
                          Diterima
                        </option>
                      </select>
                    </label>
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