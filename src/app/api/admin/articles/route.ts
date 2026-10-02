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
  createArticle,
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
      `admin:articles:${admin.id}`,
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
      await createArticle(
        parsed.data,
      );

    return json(
      {
        article,
      },
      201,
    );
  } catch (error) {
    if (
      error instanceof
        ArticleServiceError &&
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

    console.error(
      "[admin:article:create]",
      {
        code:
          "ARTICLE_CREATE_FAILED",
      },
    );

    return json(
      {
        error:
          "Artikel belum dapat dibuat.",
      },
      500,
    );
  }
}