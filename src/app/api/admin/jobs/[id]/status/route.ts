import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  ApplicationStatus,
} from "@prisma/client";

import {
  applicationStatusInputSchema,
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
  updateApplicationStatus,
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

export async function PATCH(
  req: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
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
      `admin:applications:${admin.id}`,
      100,
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

  const { id } =
    await context.params;

  if (
    !id ||
    id.length > 100
  ) {
    return json(
      {
        error:
          "ID lamaran tidak valid.",
      },
      400,
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
          "Status lamaran tidak valid.",
      },
      400,
    );
  }

  const parsed =
    applicationStatusInputSchema.safeParse(
      body,
    );

  if (!parsed.success) {
    return json(
      {
        error:
          "Status lamaran tidak valid.",
      },
      400,
    );
  }

  try {
    const application =
      await updateApplicationStatus(
        id,
        parsed.data
          .status as ApplicationStatus,
      );

    return json({
      application,
    });
  } catch (error) {
    if (
      error instanceof
        CareerServiceError &&
      error.code ===
        "APPLICATION_NOT_FOUND"
    ) {
      return json(
        {
          error:
            "Lamaran tidak ditemukan.",
        },
        404,
      );
    }

    console.error(
      "[admin:application:status]",
      {
        code:
          "APPLICATION_STATUS_UPDATE_FAILED",
      },
    );

    return json(
      {
        error:
          "Status lamaran belum dapat diperbarui.",
      },
      500,
    );
  }
}