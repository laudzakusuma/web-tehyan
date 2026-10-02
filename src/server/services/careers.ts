import {
  ApplicationStatus,
  JobStatus,
} from "@prisma/client";

import { cache } from "react";

import type {
  AdminJobInput,
  JobApplicationInput,
} from "@/lib/career-contract";

import {
  db,
} from "@/server/db/client";

import {
  createCareerTrackingCode,
  parseCareerTrackingCode,
} from "@/server/auth/career-tracking";

export type CareerServiceErrorCode =
  | "JOB_NOT_FOUND"
  | "JOB_NOT_OPEN"
  | "JOB_SLUG_TAKEN"
  | "JOB_DELETE_HAS_APPLICATIONS"
  | "DUPLICATE_APPLICATION"
  | "APPLICATION_NOT_FOUND";

export class CareerServiceError extends Error {
  constructor(
    public readonly code:
      CareerServiceErrorCode,
    message: string,
  ) {
    super(message);

    this.name =
      "CareerServiceError";
  }
}

export const listPublishedJobs =
  cache(async () => {
    const now =
      new Date();

    return db.jobPosting.findMany({
      where: {
        status:
          JobStatus.PUBLISHED,

        publishedAt: {
          lte: now,
        },
      },

      orderBy: [
        {
          publishedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],

      select: {
        id: true,
        slug: true,
        title: true,
        location: true,
        employmentType: true,
        summary: true,
        publishedAt: true,
      },
    });
  });

export const getPublishedJobBySlug =
  cache(
    async (
      slug: string,
    ) => {
      const now =
        new Date();

      return db.jobPosting.findFirst({
        where: {
          slug,

          status:
            JobStatus.PUBLISHED,

          publishedAt: {
            lte: now,
          },
        },

        select: {
          id: true,
          slug: true,
          title: true,
          location: true,
          employmentType: true,
          summary: true,
          responsibilities: true,
          requirements: true,
          publishedAt: true,
        },
      });
    },
  );

export async function createJobApplication(
  input: JobApplicationInput,
) {
  const job =
    await db.jobPosting.findUnique({
      where: {
        slug:
          input.jobSlug,
      },

      select: {
        id: true,
        status: true,
        publishedAt: true,
      },
    });

  if (!job) {
    throw new CareerServiceError(
      "JOB_NOT_FOUND",
      "Lowongan tidak ditemukan.",
    );
  }

  const now =
    new Date();

  if (
    job.status !==
      JobStatus.PUBLISHED ||
    !job.publishedAt ||
    job.publishedAt > now
  ) {
    throw new CareerServiceError(
      "JOB_NOT_OPEN",
      "Lowongan tidak sedang dibuka.",
    );
  }

  const normalizedEmail =
    input.email
      .trim()
      .toLowerCase();

  const activeApplication =
    await db.jobApplication.findFirst({
      where: {
        jobId:
          job.id,

        email:
          normalizedEmail,

        status: {
          notIn: [
            ApplicationStatus.REJECTED,
            ApplicationStatus.HIRED,
          ],
        },
      },

      select: {
        id: true,
        status: true,
      },
    });

  if (activeApplication) {
    throw new CareerServiceError(
      "DUPLICATE_APPLICATION",
      "Kamu masih memiliki lamaran aktif untuk posisi ini. Tunggu sampai proses lamaran selesai sebelum melamar kembali.",
    );
  }

  return db.jobApplication.create({
    data: {
      jobId:
        job.id,

      name:
        input.name.trim(),

      email:
        normalizedEmail,

      phone:
        input.phone.trim(),

      portfolioUrl:
        input.portfolioUrl
          ?.trim() ||
        null,

      message:
        input.message
          ?.trim() ||
        null,

      status:
        ApplicationStatus.NEW,
    },

    select: {
      id: true,
      status: true,
      createdAt: true,

      job: {
        select: {
          slug: true,
          title: true,
        },
      },
    },
  });
}

export const listAdminJobs =
  () =>
    db.jobPosting.findMany({
      orderBy: [
        {
          updatedAt: "desc",
        },
      ],

      select: {
        id: true,
        slug: true,
        title: true,
        location: true,
        employmentType: true,
        summary: true,
        responsibilities: true,
        requirements: true,
        status: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,

        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

export const listAdminApplications =
  () =>
    db.jobApplication.findMany({
      orderBy: [
        {
          createdAt: "desc",
        },
      ],

      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        portfolioUrl: true,
        message: true,
        status: true,
        createdAt: true,
        updatedAt: true,

        job: {
          select: {
            id: true,
            slug: true,
            title: true,
          },
        },
      },
    });

export async function createJob(
  input: AdminJobInput,
) {
  const existing =
    await db.jobPosting.findUnique({
      where: {
        slug: input.slug,
      },

      select: {
        id: true,
      },
    });

  if (existing) {
    throw new CareerServiceError(
      "JOB_SLUG_TAKEN",
      "Slug lowongan sudah digunakan.",
    );
  }

  const publishing =
    input.status ===
    JobStatus.PUBLISHED;

  return db.jobPosting.create({
    data: {
      slug:
        input.slug,

      title:
        input.title.trim(),

      location:
        input.location.trim(),

      employmentType:
        input.employmentType,

      summary:
        input.summary.trim(),

      responsibilities:
        input.responsibilities.trim(),

      requirements:
        input.requirements.trim(),

      status:
        input.status,

      publishedAt:
        publishing
          ? new Date()
          : null,
    },
  });
}

export async function updateJob(
  id: string,
  input: AdminJobInput,
) {
  const current =
    await db.jobPosting.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        slug: true,
        status: true,
        publishedAt: true,
      },
    });

  if (!current) {
    throw new CareerServiceError(
      "JOB_NOT_FOUND",
      "Lowongan tidak ditemukan.",
    );
  }

  if (
    input.slug !==
    current.slug
  ) {
    const duplicate =
      await db.jobPosting.findUnique({
        where: {
          slug: input.slug,
        },

        select: {
          id: true,
        },
      });

    if (
      duplicate &&
      duplicate.id !== id
    ) {
      throw new CareerServiceError(
        "JOB_SLUG_TAKEN",
        "Slug lowongan sudah digunakan.",
      );
    }
  }

  const publishing =
    input.status ===
      JobStatus.PUBLISHED &&
    current.status !==
      JobStatus.PUBLISHED;

  const leavingPublished =
    input.status !==
      JobStatus.PUBLISHED &&
    current.status ===
      JobStatus.PUBLISHED;

  return db.jobPosting.update({
    where: {
      id,
    },

    data: {
      slug:
        input.slug,

      title:
        input.title.trim(),

      location:
        input.location.trim(),

      employmentType:
        input.employmentType,

      summary:
        input.summary.trim(),

      responsibilities:
        input.responsibilities.trim(),

      requirements:
        input.requirements.trim(),

      status:
        input.status,

      publishedAt:
        publishing
          ? new Date()
          : leavingPublished
            ? null
            : current.publishedAt,
    },
  });
}

export async function deleteJob(
  id: string,
) {
  const job =
    await db.jobPosting.findUnique({
      where: {
        id,
      },

      select: {
        id: true,

        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

  if (!job) {
    throw new CareerServiceError(
      "JOB_NOT_FOUND",
      "Lowongan tidak ditemukan.",
    );
  }

  if (
    job._count.applications > 0
  ) {
    throw new CareerServiceError(
      "JOB_DELETE_HAS_APPLICATIONS",
      "Lowongan yang sudah memiliki pelamar tidak dapat dihapus.",
    );
  }

  await db.jobPosting.delete({
    where: {
      id,
    },
  });

  return {
    id,
  };
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
) {
  const application =
    await db.jobApplication.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
      },
    });

  if (!application) {
    throw new CareerServiceError(
      "APPLICATION_NOT_FOUND",
      "Lamaran tidak ditemukan.",
    );
  }

  return db.jobApplication.update({
    where: {
      id,
    },

    data: {
      status,
    },

    select: {
      id: true,
      status: true,
      updatedAt: true,
    },
  });
}

export async function getPublicApplicationTracking(
  code: string,
) {
  const applicationId =
    parseCareerTrackingCode(
      code,
    );

  if (!applicationId) {
    return null;
  }

  const application =
    await db.jobApplication.findUnique({
      where: {
        id: applicationId,
      },

      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,

        job: {
          select: {
            title: true,
          },
        },
      },
    });

  if (!application) {
    return null;
  }

  return {
    code:
      createCareerTrackingCode(
        application.id,
      ),

    status:
      application.status,

    createdAt:
      application.createdAt,

    updatedAt:
      application.updatedAt,

    job: {
      title:
        application.job.title,
    },
  };
}