import type {
  EmploymentType,
} from "@prisma/client";

import type {
  Metadata,
} from "next";

import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import {
  JobApplicationForm,
} from "@/features/careers/JobApplicationForm";

import {
  getPublishedJobBySlug,
} from "@/server/services/careers";

export const dynamic =
  "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const employmentLabel: Record<
  EmploymentType,
  string
> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Kontrak",
  INTERNSHIP: "Magang",
};

function paragraphs(
  value: string,
) {
  return value
    .split(/\n+/)
    .map((item) =>
      item.trim(),
    )
    .filter(Boolean);
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } =
    await params;

  const job =
    await getPublishedJobBySlug(
      slug,
    );

  if (!job) {
    return {
      title:
        "Karier | Kedai Tehyan",
    };
  }

  return {
    title: `${job.title} | Karier Kedai Tehyan`,
    description:
      job.summary,
  };
}

export default async function JobPage({
  params,
}: PageProps) {
  const { slug } =
    await params;

  const job =
    await getPublishedJobBySlug(
      decodeURIComponent(slug),
    );

  if (!job) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-[1000px] px-4 py-16 md:px-10 md:py-24">
      <article>
        <header className="border-b border-seduh pb-12">
          <Link
            href="/karier"
            className="text-xs uppercase tracking-[0.2em] text-genteng"
          >
            ← Karier
          </Link>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs uppercase tracking-[0.16em] text-seduh-soft">
            <span>
              {
                employmentLabel[
                  job.employmentType
                ]
              }
            </span>

            <span>
              {job.location}
            </span>
          </div>

          <h1 className="mt-5 max-w-[14ch] font-display text-5xl font-light leading-[0.96] md:text-7xl">
            {job.title}
          </h1>

          <p className="mt-7 max-w-[58ch] text-lg leading-8 text-seduh-soft">
            {job.summary}
          </p>

          <a
            href="#lamar"
            className="mt-9 inline-flex h-12 items-center bg-seduh px-6 text-gading"
          >
            Lamar posisi ini
          </a>
        </header>

        <div className="grid gap-12 py-14 md:py-20 lg:grid-cols-[220px_minmax(0,1fr)]">
          <h2 className="font-display text-2xl font-light">
            Tanggung jawab
          </h2>

          <div className="max-w-[650px] space-y-5 leading-8 text-seduh-soft">
            {paragraphs(
              job.responsibilities,
            ).map(
              (
                paragraph,
                index,
              ) => (
                <p
                  key={index}
                >
                  {paragraph}
                </p>
              ),
            )}
          </div>
        </div>

        <div className="grid gap-12 border-t border-pasir py-14 md:py-20 lg:grid-cols-[220px_minmax(0,1fr)]">
          <h2 className="font-display text-2xl font-light">
            Yang kami cari
          </h2>

          <div className="max-w-[650px] space-y-5 leading-8 text-seduh-soft">
            {paragraphs(
              job.requirements,
            ).map(
              (
                paragraph,
                index,
              ) => (
                <p
                  key={index}
                >
                  {paragraph}
                </p>
              ),
            )}
          </div>
        </div>

        <JobApplicationForm
          jobSlug={job.slug}
          jobTitle={job.title}
        />
      </article>
    </main>
  );
}