import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  promotionInputSchema,
} from "@/lib/promotion-contract";

import {
  ADMIN_SESSION_COOKIE,
  getAdminFromSessionToken,
} from "@/server/auth/admin-session";

import {
  isSameOriginRequest,
  rateAllowed,
} from "@/server/chat-security";

import {
  deletePromotion,
  PromotionServiceError,
  updatePromotion,
} from "@/server/services/catalog";

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
      `admin:promotions:${admin.id}`,
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

function serviceError(
  error: unknown,
) {
  if (
    error instanceof
    PromotionServiceError
  ) {
    if (
      error.code ===
      "PROMOTION_NOT_FOUND"
    ) {
      return json(
        {
          error:
            "Promo tidak ditemukan.",
        },
        404,
      );
    }

    if (
      error.code ===
      "PROMOTION_DELETE_ACTIVE"
    ) {
      return json(
        {
          error:
            "Nonaktifkan promo sebelum menghapusnya.",
        },
        409,
      );
    }
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
          "ID promo tidak valid.",
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
          "Data promo tidak valid.",
      },
      400,
    );
  }

  const parsed =
    promotionInputSchema.safeParse(
      body,
    );

  if (!parsed.success) {
    return json(
      {
        error:
          "Data promo belum lengkap atau tidak valid.",

        fields:
          parsed.error.flatten()
            .fieldErrors,
      },
      400,
    );
  }

  try {
    const promotion =
      await updatePromotion(
        id,
        parsed.data,
      );

    return json({
      promotion,
    });
  } catch (error) {
    const mapped =
      serviceError(error);

    if (mapped) {
      return mapped;
    }

    console.error(
      "[admin:promotion:update]",
      {
        code:
          "PROMOTION_UPDATE_FAILED",
      },
    );

    return json(
      {
        error:
          "Promo belum dapat diperbarui.",
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
          "ID promo tidak valid.",
      },
      400,
    );
  }

  try {
    await deletePromotion(id);

    return json({
      ok: true,
    });
  } catch (error) {
    const mapped =
      serviceError(error);

    if (mapped) {
      return mapped;
    }

    console.error(
      "[admin:promotion:delete]",
      {
        code:
          "PROMOTION_DELETE_FAILED",
      },
    );

    return json(
      {
        error:
          "Promo belum dapat dihapus.",
      },
      500,
    );
  }
}