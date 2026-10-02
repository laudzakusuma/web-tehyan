import Link from "next/link";

import {
  ApplicationStatusLookupForm,
} from "@/features/careers/ApplicationStatusLookupForm";

import {
  getPublicApplicationTracking,
} from "@/server/services/careers";

export const dynamic =
  "force-dynamic";

type PageProps = {
  params: Promise<{
    code: string;
  }>;
};

const statusCopy = {
  NEW: {
    label:
      "Lamaran diterima",

    message:
      "Lamaranmu sudah masuk dan menunggu proses peninjauan.",
  },

  REVIEWING: {
    label:
      "Sedang ditinjau",

    message:
      "Tim Tehyan sedang meninjau informasi yang kamu kirim.",
  },

  SHORTLISTED: {
    label:
      "Lanjut ke tahap berikutnya",

    message:
      "Profilmu masuk ke tahap berikutnya. Tim Tehyan dapat menghubungimu melalui informasi kontak yang kamu berikan.",
  },

  REJECTED: {
    label:
      "Proses tidak dilanjutkan",

    message:
      "Untuk posisi ini, proses lamaranmu tidak dilanjutkan ke tahap berikutnya.",
  },

  HIRED: {
    label:
      "Diterima bergabung",

    message:
      "Lamaranmu telah ditandai diterima. Tim Tehyan akan menghubungimu untuk proses selanjutnya.",
  },
} as const;

const formatter =
  new Intl.DateTimeFormat(
    "id-ID",
    {
      dateStyle: "long",
      timeStyle: "short",
      timeZone:
        "Asia/Jakarta",
    },
  );

export default async function ApplicationTrackingPage({
  params,
}: PageProps) {
  const { code } =
    await params;

  const tracking =
    await getPublicApplicationTracking(
      decodeURIComponent(
        code,
      ),
    );

  if (!tracking) {
    return (
      <main className="mx-auto max-w-[900px] px-4 py-16 md:px-10 md:py-24">
        <p className="text-xs uppercase tracking-[0.22em] text-genteng">
          Status Lamaran
        </p>

        <h1 className="mt-5 max-w-[12ch] font-display text-5xl font-light leading-tight">
          Kode tidak ditemukan.
        </h1>

        <p className="mt-6 max-w-[52ch] leading-7 text-seduh-soft">
          Periksa kembali kode
          lamaran yang kamu
          masukkan.
        </p>

        <div className="mt-10 max-w-[620px] border-t border-pasir pt-8">
          <ApplicationStatusLookupForm />
        </div>
      </main>
    );
  }

  const copy =
    statusCopy[
      tracking.status
    ];

  return (
    <main className="mx-auto max-w-[900px] px-4 py-16 md:px-10 md:py-24">
      <Link
        href="/karier"
        className="text-xs uppercase tracking-[0.2em] text-genteng"
      >
        ← Karier
      </Link>

      <header className="mt-8 border-b border-seduh pb-12">
        <p className="text-xs uppercase tracking-[0.2em] text-seduh-soft">
          Status lamaran
        </p>

        <h1 className="mt-4 max-w-[13ch] font-display text-5xl font-light leading-[0.98] md:text-6xl">
          {copy.label}
        </h1>

        <p className="mt-6 max-w-[58ch] text-lg leading-8 text-seduh-soft">
          {copy.message}
        </p>
      </header>

      <dl className="grid gap-8 py-10 md:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-[0.16em] text-seduh-soft">
            Posisi
          </dt>

          <dd className="mt-2 font-display text-2xl">
            {
              tracking.job
                .title
            }
          </dd>
        </div>

        <div>
          <dt className="text-xs uppercase tracking-[0.16em] text-seduh-soft">
            Status
          </dt>

          <dd className="mt-2 font-display text-2xl text-genteng">
            {copy.label}
          </dd>
        </div>

        <div>
          <dt className="text-xs uppercase tracking-[0.16em] text-seduh-soft">
            Lamaran dikirim
          </dt>

          <dd className="mt-2">
            {formatter.format(
              tracking.createdAt,
            )}
          </dd>
        </div>

        <div>
          <dt className="text-xs uppercase tracking-[0.16em] text-seduh-soft">
            Terakhir diperbarui
          </dt>

          <dd className="mt-2">
            {formatter.format(
              tracking.updatedAt,
            )}
          </dd>
        </div>
      </dl>

      <div className="border-t border-pasir pt-8">
        <p className="text-xs uppercase tracking-[0.16em] text-seduh-soft">
          Kode lamaran
        </p>

        <code className="mt-3 block break-all font-mono text-sm">
          {tracking.code}
        </code>
      </div>
    </main>
  );
}