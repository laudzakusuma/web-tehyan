import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  jobApplicationInputSchema,
} from "@/lib/career-contract";

import {
  isSameOriginRequest,
  rateAllowed,
} from "@/server/chat-security";

import {
  CareerServiceError,
  createJobApplication,
} from "@/server/services/careers";

import {
  createCareerTrackingCode,
} from "@/server/auth/career-tracking";

export const runtime = "nodejs";
export const dynamic =
  "force-dynamic";

function json(
  body: unknown,
  status = 200,
) {
  return NextResponse.json(body, {
    status,

    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options":
        "nosniff",
    },
  });
}

export async function POST(
  req: NextRequest,
) {
  if (!isSameOriginRequest(req)) {
    return json(
      {
        error:
          "Permintaan tidak diizinkan.",
      },
      403,
    );
  }

  const forwardedFor =
    req.headers.get(
      "x-forwarded-for",
    );

  const ip =
    forwardedFor
      ?.split(",")[0]
      ?.trim() ||
    req.headers.get(
      "x-real-ip",
    ) ||
    "unknown";

  if (
    !rateAllowed(
      `career:apply:${ip}`,
      8,
    )
  ) {
    return json(
      {
        error:
          "Terlalu banyak percobaan. Tunggu sebentar sebelum mengirim lagi.",
      },
      429,
    );
  }

  let body: unknown;

  try {
    body =
      await req.json();
  } catch {
    return json(
      {
        error:
          "Data lamaran tidak valid.",
      },
      400,
    );
  }

  const parsed =
    jobApplicationInputSchema.safeParse(
      body,
    );

  if (!parsed.success) {
    return json(
      {
        error:
          "Data lamaran belum lengkap atau tidak valid.",

        fields:
          parsed.error.flatten()
            .fieldErrors,
      },
      400,
    );
  }

  try {
    const application =
      await createJobApplication(
        parsed.data,
      );
    
    const trackingCode =
      createCareerTrackingCode(
        application.id,
    );

    return json(
      {
        ok: true,

        trackingCode,

        application: {
          status:
            application.status,

          createdAt:
            application.createdAt,

          job: {
            slug:
              application.job.slug,

            title:
              application.job.title,
          },
        },
      },
      201,
    );
  } catch (error) {
    if (
      error instanceof
      CareerServiceError
    ) {
      if (
        error.code ===
        "JOB_NOT_FOUND"
      ) {
        return json(
          {
            error:
              "Lowongan tidak ditemukan.",
          },
          404,
        );
      }

      if (
        error.code ===
        "JOB_NOT_OPEN"
      ) {
        return json(
          {
            error:
              "Lowongan ini tidak sedang dibuka.",
          },
          409,
        );
      }

      if (
        error.code ===
        "DUPLICATE_APPLICATION"
      ) {
        return json(
          {
            error:
              "Kamu masih memiliki lamaran aktif untuk posisi ini. Tunggu sampai prosesnya selesai sebelum melamar kembali.",
          },
          409,
        );
      }
    }

    console.error(
      "[career:application:create]",
      {
        code:
          "CAREER_APPLICATION_CREATE_FAILED",
      },
    );

    return json(
      {
        error:
          "Lamaran belum dapat dikirim.",
      },
      500,
    );
  }
}