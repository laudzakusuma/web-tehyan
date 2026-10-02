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
  deleteJob,
  updateJob,
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

async function authorize(
  req: NextRequest,
) {
  if (!isSameOriginRequest(req)) {
    return {
      error: json(
        {
          error:
            "Permintaan tidak diizinkan.",
        },
        403,
      ),
    };
  }

  const admin =
    await getAdminFromSessionToken(
      req.cookies.get(
        ADMIN_SESSION_COOKIE,
      )?.value,
    );

  if (!admin) {
    return {
      error: json(
        {
          error:
            "Sesi admin tidak valid.",
        },
        401,
      ),
    };
  }

  if (
    !rateAllowed(
      `admin:jobs:${admin.id}`,
      60,
    )
  ) {
    return {
      error: json(
        {
          error:
            "Terlalu banyak perubahan. Tunggu sebentar.",
        },
        429,
      ),
    };
  }

  return {
    admin,
  };
}

function mapServiceError(
  error: unknown,
) {
  if (
    !(error instanceof
      CareerServiceError)
  ) {
    return null;
  }

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

  if (
    error.code ===
    "JOB_DELETE_HAS_APPLICATIONS"
  ) {
    return json(
      {
        error:
          "Lowongan yang sudah memiliki pelamar tidak dapat dihapus.",
      },
      409,
    );
  }

  return null;
}

export async function PATCH(
  req: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const auth =
    await authorize(req);

  if (auth.error) {
    return auth.error;
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
          "ID lowongan tidak valid.",
      },
      400,
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
      await updateJob(
        id,
        parsed.data,
      );

    return json({
      job,
    });
  } catch (error) {
    const mapped =
      mapServiceError(error);

    if (mapped) {
      return mapped;
    }

    console.error(
      "[admin:job:update]",
      {
        code:
          "JOB_UPDATE_FAILED",
      },
    );

    return json(
      {
        error:
          "Lowongan belum dapat diperbarui.",
      },
      500,
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const auth =
    await authorize(req);

  if (auth.error) {
    return auth.error;
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
          "ID lowongan tidak valid.",
      },
      400,
    );
  }

  try {
    await deleteJob(id);

    return json({
      ok: true,
    });
  } catch (error) {
    const mapped =
      mapServiceError(error);

    if (mapped) {
      return mapped;
    }

    console.error(
      "[admin:job:delete]",
      {
        code:
          "JOB_DELETE_FAILED",
      },
    );

    return json(
      {
        error:
          "Lowongan belum dapat dihapus.",
      },
      500,
    );
  }
}