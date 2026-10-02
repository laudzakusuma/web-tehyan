import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  articleInputSchema,
} from "@/lib/article-contract";

import {
  ADMIN_SESSION_COOKIE,
  getAdminFromSessionToken,
} from "@/server/auth/admin-session";

import {
  isSameOriginRequest,
  rateAllowed,
} from "@/server/chat-security";

import {
  ArticleServiceError,
  deleteArticle,
  updateArticle,
} from "@/server/services/articles";

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
      `admin:articles:${admin.id}`,
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
      ArticleServiceError)
  ) {
    return null;
  }

  if (
    error.code ===
    "ARTICLE_NOT_FOUND"
  ) {
    return json(
      {
        error:
          "Artikel tidak ditemukan.",
      },
      404,
    );
  }

  if (
    error.code ===
    "ARTICLE_SLUG_TAKEN"
  ) {
    return json(
      {
        error:
          "Slug artikel sudah digunakan.",
      },
      409,
    );
  }

  if (
    error.code ===
    "ARTICLE_DELETE_PUBLISHED"
  ) {
    return json(
      {
        error:
          "Jadikan artikel draft sebelum menghapusnya.",
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

  if (!id || id.length > 100) {
    return json(
      {
        error:
          "ID artikel tidak valid.",
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
          "Data artikel tidak valid.",
      },
      400,
    );
  }

  const parsed =
    articleInputSchema.safeParse(
      body,
    );

  if (!parsed.success) {
    return json(
      {
        error:
          "Data artikel belum lengkap atau tidak valid.",

        fields:
          parsed.error.flatten()
            .fieldErrors,
      },
      400,
    );
  }

  try {
    const article =
      await updateArticle(
        id,
        parsed.data,
      );

    return json({
      article,
    });
  } catch (error) {
    const mapped =
      mapServiceError(error);

    if (mapped) {
      return mapped;
    }

    console.error(
      "[admin:article:update]",
      {
        code:
          "ARTICLE_UPDATE_FAILED",
      },
    );

    return json(
      {
        error:
          "Artikel belum dapat diperbarui.",
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

  if (!id || id.length > 100) {
    return json(
      {
        error:
          "ID artikel tidak valid.",
      },
      400,
    );
  }

  try {
    await deleteArticle(id);

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
      "[admin:article:delete]",
      {
        code:
          "ARTICLE_DELETE_FAILED",
      },
    );

    return json(
      {
        error:
          "Artikel belum dapat dihapus.",
      },
      500,
    );
  }
}