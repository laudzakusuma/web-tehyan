import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  AdminLogoutButton,
} from "@/features/admin/AdminLogoutButton";

import {
  CareerManager,
} from "@/features/admin/CareerManager";

import {
  getCurrentAdmin,
} from "@/server/auth/admin-session";

import {
  listAdminApplications,
  listAdminJobs,
} from "@/server/services/careers";

export const dynamic =
  "force-dynamic";

export default async function AdminCareerPage() {
  const admin =
    await getCurrentAdmin();

  if (!admin) {
    redirect(
      "/admin/login",
    );
  }

  const [
    jobs,
    applications,
  ] = await Promise.all([
    listAdminJobs(),
    listAdminApplications(),
  ]);

  const serializedJobs =
    jobs.map(
      (job) => ({
        id: job.id,
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

        publishedAt:
          job.publishedAt
            ?.toISOString() ??
          null,

        applicationCount:
          job._count
            .applications,
      }),
    );

  const serializedApplications =
    applications.map(
      (application) => ({
        id:
          application.id,

        name:
          application.name,

        email:
          application.email,

        phone:
          application.phone,

        portfolioUrl:
          application.portfolioUrl,

        message:
          application.message,

        status:
          application.status,

        createdAt:
          application.createdAt.toISOString(),

        job: {
          id:
            application.job.id,

          slug:
            application.job.slug,

          title:
            application.job.title,
        },
      }),
    );

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-14 md:px-10 md:py-20">
      <header className="border-b border-seduh pb-8">
        <p className="text-xs uppercase tracking-[0.22em] text-genteng">
          Admin Tehyan
        </p>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-5xl font-light md:text-6xl">
              Karier
            </h1>

            <p className="mt-3 max-w-[58ch] text-seduh-soft">
              Kelola lowongan dan
              kandidat yang ingin
              bergabung bersama
              Kedai Tehyan.
            </p>
          </div>

          <nav className="flex flex-wrap gap-5 text-sm">
            <Link
              href="/admin/pesanan"
              className="border-b border-transparent pb-1 hover:border-seduh"
            >
              Pesanan
            </Link>

            <Link
              href="/admin/promo"
              className="border-b border-transparent pb-1 hover:border-seduh"
            >
              Promo
            </Link>

            <Link
              href="/admin/journal"
              className="border-b border-transparent pb-1 hover:border-seduh"
            >
              Journal
            </Link>

            <Link
              href="/karier"
              className="border-b border-transparent pb-1 hover:border-seduh"
            >
              Lihat Karier
            </Link>

            <AdminLogoutButton />
          </nav>
        </div>
      </header>

      <div className="pt-10">
        <CareerManager
          jobs={
            serializedJobs
          }
          applications={
            serializedApplications
          }
        />
      </div>
    </main>
  );
}