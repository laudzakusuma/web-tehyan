"use client";

import Link from "next/link";

import {
  FormEvent,
  useState,
} from "react";

type Props = {
  jobSlug: string;
  jobTitle: string;
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  portfolioUrl: string;
  message: string;
};

const initialForm: FormState = {
  name: "",
  email: "",
  phone: "",
  portfolioUrl: "",
  message: "",
};

export function JobApplicationForm({
  jobSlug,
  jobTitle,
}: Props) {
  const [form, setForm] =
    useState<FormState>(
      initialForm,
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  const [
    trackingCode,
    setTrackingCode,
    ] = useState<string | null>(
    null,
    );

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError(null);
    setTrackingCode(null);

    try {
      const response =
        await fetch(
          "/api/careers/apply",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              jobSlug,

              name:
                form.name,

              email:
                form.email,

              phone:
                form.phone,

              portfolioUrl:
                form.portfolioUrl
                  .trim() ||
                null,

              message:
                form.message
                  .trim() ||
                null,
            }),
          },
        );

      const body =
        await response.json();

      if (!response.ok) {
        setError(
          body.error ??
            "Lamaran belum dapat dikirim.",
        );

        return;
      }

      if (
  typeof body.trackingCode !==
    "string"
    ) {
    setError(
        "Lamaran tersimpan, tetapi kode tracking belum dapat dibuat.",
    );

    return;
    }

    setTrackingCode(
    body.trackingCode,
    );

    setForm(initialForm);
    } catch {
      setError(
        "Tidak dapat terhubung ke server.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      id="lamar"
      className="border-t border-pasir pt-12"
    >
      <p className="text-xs uppercase tracking-[0.2em] text-genteng">
        Lamar posisi ini
      </p>

      <h2 className="mt-4 max-w-[14ch] font-display text-4xl font-light leading-tight">
        Tertarik bergabung sebagai{" "}
        {jobTitle}?
      </h2>

      <p className="mt-5 max-w-[56ch] leading-7 text-seduh-soft">
        Ceritakan sedikit tentang
        dirimu. Link portfolio dapat
        berupa website, LinkedIn,
        GitHub, atau dokumen yang
        dapat diakses melalui tautan.
      </p>

      {trackingCode ? (
        <div
          aria-live="polite"
          className="mt-10 border-y border-seduh py-10"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-genteng">
            Lamaran terkirim
          </p>

          <h3 className="mt-3 font-display text-3xl font-light">
            Terima kasih sudah
            menghubungi Tehyan.
          </h3>

          <div className="mt-7 border border-pasir p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-seduh-soft">
                Kode lamaran
            </p>

            <code className="mt-3 block break-all font-mono text-sm">
                {trackingCode}
            </code>

            <p className="mt-3 text-xs leading-5 text-seduh-soft">
                Simpan kode ini untuk
                mengecek perkembangan
                lamaranmu.
            </p>
            </div>

            <Link
            href={`/karier/status/${encodeURIComponent(
                trackingCode,
            )}`}
            className="mt-6 inline-flex h-11 items-center bg-seduh px-5 text-gading"
            >
            Cek status lamaran
            </Link>

          <p className="mt-4 max-w-[55ch] leading-7 text-seduh-soft">
            Lamaranmu sudah kami
            terima. Jika profilmu
            sesuai dengan kebutuhan
            posisi, tim Tehyan dapat
            menghubungimu melalui
            informasi kontak yang
            dikirim.
          </p>

          <button
            type="button"
            onClick={() =>
                setTrackingCode(null)
            }
            className="mt-7 border-b border-seduh pb-1 text-sm"
          >
            Kirim lamaran lain
          </button>
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="mt-10 grid gap-6"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm">
                Nama lengkap
              </span>

              <input
                required
                minLength={2}
                maxLength={120}
                autoComplete="name"
                value={
                  form.name
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,
                      name:
                        event
                          .target
                          .value,
                    }),
                  )
                }
                className="h-12 w-full border border-pasir bg-transparent px-4 outline-none transition-colors focus:border-seduh"
                placeholder="Nama kamu"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm">
                Email
              </span>

              <input
                required
                type="email"
                maxLength={200}
                autoComplete="email"
                value={
                  form.email
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,
                      email:
                        event
                          .target
                          .value,
                    }),
                  )
                }
                className="h-12 w-full border border-pasir bg-transparent px-4 outline-none transition-colors focus:border-seduh"
                placeholder="nama@email.com"
              />
            </label>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm">
                WhatsApp
              </span>

              <input
                required
                type="tel"
                minLength={8}
                maxLength={30}
                autoComplete="tel"
                value={
                  form.phone
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,
                      phone:
                        event
                          .target
                          .value,
                    }),
                  )
                }
                className="h-12 w-full border border-pasir bg-transparent px-4 outline-none transition-colors focus:border-seduh"
                placeholder="+62 812..."
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm">
                Portfolio / LinkedIn
              </span>

              <input
                type="url"
                maxLength={500}
                value={
                  form.portfolioUrl
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      portfolioUrl:
                        event
                          .target
                          .value,
                    }),
                  )
                }
                className="h-12 w-full border border-pasir bg-transparent px-4 outline-none transition-colors focus:border-seduh"
                placeholder="https://..."
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm">
              Ceritakan tentang dirimu
            </span>

            <textarea
              rows={7}
              maxLength={2000}
              value={
                form.message
              }
              onChange={(
                event,
              ) =>
                setForm(
                  (
                    current,
                  ) => ({
                    ...current,

                    message:
                      event
                        .target
                        .value,
                  }),
                )
              }
              className="w-full resize-y border border-pasir bg-transparent p-4 leading-7 outline-none transition-colors focus:border-seduh"
              placeholder="Pengalaman, alasan tertarik bergabung, atau hal lain yang ingin kamu ceritakan."
            />
          </label>

          {error && (
            <div
              role="alert"
              className="border border-genteng p-4 text-sm text-genteng"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-12 w-fit items-center bg-seduh px-7 text-gading transition-opacity disabled:opacity-50"
          >
            {loading
              ? "Mengirim..."
              : "Kirim lamaran"}
          </button>

          <p className="max-w-[65ch] text-xs leading-5 text-seduh-soft">
            Dengan mengirim formulir
            ini, data yang kamu
            berikan akan digunakan
            untuk proses rekrutmen
            posisi yang dipilih.
          </p>
        </form>
      )}
    </section>
  );
}