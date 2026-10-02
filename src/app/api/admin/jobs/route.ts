import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  adminJobInputSchema,
} from "@/lib/career-contract";

import {
  ADMIN_SESSION_COOKIE,
  getAdminFromSessionToken,
} from "@/server/auth/admin-session";

import {
  isSameOriginRequest,
  rateAllowed,
} from "@/server/chat-security";

import {
  CareerServiceError,
  createJob,
} from "@/server/services/careers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const admin =
    await getAdminFromSessionToken(
      req.cookies.get(
        ADMIN_SESSION_COOKIE,
      )?.value,
    );

  if (!admin) {
    return json(
      {
        error:
          "Sesi admin tidak valid.",
      },
      401,
    );
  }

  if (
    !rateAllowed(
      `admin:jobs:${admin.id}`,
      60,
    )
  ) {
    return json(
      {
        error:
          "Terlalu banyak perubahan. Tunggu sebentar.",
      },
      429,
    );
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return json(
      {
        error:
          "Data lowongan tidak valid.",
      },
      400,
    );
  }

  const parsed =
    adminJobInputSchema.safeParse(
      body,
    );

  if (!parsed.success) {
    return json(
      {
        error:
          "Data lowongan belum lengkap atau tidak valid.",

        fields:
          parsed.error.flatten()
            .fieldErrors,
      },
      400,
    );
  }

  try {
    const job =
      await createJob(
        parsed.data,
      );

    return json(
      {
        job,
      },
      201,
    );
  } catch (error) {
    if (
      error instanceof
        CareerServiceError &&
      error.code ===
        "JOB_SLUG_TAKEN"
    ) {
      return json(
        {
          error:
            "Slug lowongan sudah digunakan.",
        },
        409,
      );
    }

    console.error(
      "[admin:job:create]",
      {
        code:
          "JOB_CREATE_FAILED",
      },
    );

    return json(
      {
        error:
          "Lowongan belum dapat dibuat.",
      },
      500,
    );
  }
}