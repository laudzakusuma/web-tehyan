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
  createPromotion,
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
      `admin:promotions:${admin.id}`,
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
      await createPromotion(
        parsed.data,
      );

    return json(
      {
        promotion,
      },
      201,
    );
  } catch {
    console.error(
      "[admin:promotion:create]",
      {
        code:
          "PROMOTION_CREATE_FAILED",
      },
    );

    return json(
      {
        error:
          "Promo belum dapat dibuat.",
      },
      500,
    );
  }
}