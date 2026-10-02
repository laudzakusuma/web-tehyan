import type {
  EmploymentType,
} from "@prisma/client";

import Link from "next/link";

import {
  listPublishedJobs,
} from "@/server/services/careers";

export const dynamic =
  "force-dynamic";

const employmentLabel: Record<
  EmploymentType,
  string
> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Kontrak",
  INTERNSHIP: "Magang",
};

export default async function CareersPage() {
  const jobs =
    await listPublishedJobs();

  return (
    <main>
      <section className="mx-auto max-w-[1200px] px-4 pb-16 pt-16 md:px-10 md:pb-24 md:pt-24">
        <p className="text-xs uppercase tracking-[0.24em] text-genteng">
          Karier
        </p>

        <div>
            <p className="max-w-[42ch] leading-8 text-seduh-soft">
                Kami mencari orang yang
                peduli pada detail,
                pelayanan, dan pengalaman
                sederhana yang terasa
                baik.
            </p>

            <Link
                href="/karier/status"
                className="mt-6 inline-flex border-b border-seduh pb-1 text-sm"
            >
                Sudah melamar? Cek status →
            </Link>
        </div>
      </section>

      <section className="border-y border-pasir">
        <div className="mx-auto max-w-[1200px] px-4 md:px-10">
          <div className="flex items-end justify-between gap-5 border-b border-pasir py-7">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-seduh-soft">
                Posisi terbuka
              </p>

              <p className="mt-2 font-display text-2xl">
                {jobs.length} posisi
              </p>
            </div>
          </div>

          {jobs.length === 0 ? (
            <div className="grid gap-10 py-20 md:py-28 lg:grid-cols-[minmax(0,1fr)_340px]">
              <h2 className="max-w-[13ch] font-display text-4xl font-light leading-tight md:text-5xl">
                Belum ada posisi yang
                sedang dibuka.
              </h2>

              <p className="max-w-[42ch] leading-7 text-seduh-soft">
                Saat ada kesempatan
                baru untuk bergabung,
                posisi tersebut akan
                muncul di halaman ini.
              </p>
            </div>
          ) : (
            <ol>
              {jobs.map(
                (
                  job,
                  index,
                ) => (
                  <li
                    key={job.id}
                    className="grid gap-7 border-b border-pasir py-10 last:border-b-0 md:grid-cols-[80px_minmax(0,1fr)_240px] md:py-12"
                  >
                    <span className="font-display text-2xl text-genteng">
                      {String(
                        index + 1,
                      ).padStart(
                        2,
                        "0",
                      )}
                    </span>

                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-seduh-soft">
                        {
                          employmentLabel[
                            job
                              .employmentType
                          ]
                        }
                      </p>

                      <h2 className="mt-3 font-display text-3xl font-light md:text-4xl">
                        <Link
                          href={`/karier/${job.slug}`}
                          className="transition-colors hover:text-genteng"
                        >
                          {
                            job.title
                          }
                        </Link>
                      </h2>

                      <p className="mt-5 max-w-[60ch] leading-7 text-seduh-soft">
                        {
                          job.summary
                        }
                      </p>
                    </div>

                    <aside className="border-t border-pasir pt-5 md:border-l md:border-t-0 md:pl-7 md:pt-0">
                      <p className="text-xs uppercase tracking-[0.16em] text-seduh-soft">
                        Lokasi
                      </p>

                      <p className="mt-2 font-display text-lg">
                        {
                          job.location
                        }
                      </p>

                      <Link
                        href={`/karier/${job.slug}`}
                        className="mt-7 inline-flex border-b border-seduh pb-1 text-sm"
                      >
                        Lihat posisi →
                      </Link>
                    </aside>
                  </li>
                ),
              )}
            </ol>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-16 md:px-10 md:py-24">
        <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
          <p className="text-xs uppercase tracking-[0.2em] text-genteng">
            Cara kami bekerja
          </p>

          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <span className="font-display text-2xl text-genteng">
                01
              </span>

              <h2 className="mt-4 font-display text-2xl">
                Peduli pada detail.
              </h2>
            </div>

            <div>
              <span className="font-display text-2xl text-genteng">
                02
              </span>

              <h2 className="mt-4 font-display text-2xl">
                Tidak berhenti
                belajar.
              </h2>
            </div>

            <div>
              <span className="font-display text-2xl text-genteng">
                03
              </span>

              <h2 className="mt-4 font-display text-2xl">
                Menghargai orang dan
                waktu.
              </h2>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}