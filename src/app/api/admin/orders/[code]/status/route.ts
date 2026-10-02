import {
  NextRequest,
  NextResponse,
} from "next/server";

import { z } from "zod";

import {
  ADMIN_SESSION_COOKIE,
  getAdminFromSessionToken,
} from "@/server/auth/admin-session";

import {
  isSameOriginRequest,
  rateAllowed,
} from "@/server/chat-security";

import {
  OrderServiceError,
  updateOrderStatus,
} from "@/server/services/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statusSchema = z
  .object({
    status: z.enum([
      "CONFIRMED",
      "PREPARING",
      "READY",
      "COMPLETED",
      "CANCELLED",
    ]),
  })
  .strict();

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
  context: {
    params: Promise<{
      code: string;
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
      `admin:orders:${admin.id}`,
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

  const { code } =
    await context.params;

  const normalizedCode =
    decodeURIComponent(code)
      .trim()
      .toUpperCase();

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return json(
      {
        error:
          "Data status tidak valid.",
      },
      400,
    );
  }

  const parsed =
    statusSchema.safeParse(body);

  if (!parsed.success) {
    return json(
      {
        error:
          "Status tidak valid.",
      },
      400,
    );
  }

  try {
    const order =
      await updateOrderStatus(
        normalizedCode,
        parsed.data.status,
      );

    return json({
      order,
    });
  } catch (error) {
    if (
      error instanceof
        OrderServiceError &&
      error.code ===
        "ORDER_NOT_FOUND"
    ) {
      return json(
        {
          error:
            "Pesanan tidak ditemukan.",
        },
        404,
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "ORDER_STATUS_TRANSITION_INVALID"
    ) {
      return json(
        {
          error:
            "Perubahan status tersebut tidak diizinkan.",
        },
        409,
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "ORDER_STATUS_CONFLICT"
    ) {
      return json(
        {
          error:
            "Status pesanan sudah berubah. Muat ulang halaman.",
        },
        409,
      );
    }

    console.error(
      "[admin:order-status]",
      {
        code:
          "ORDER_STATUS_UPDATE_FAILED",
      },
    );

    return json(
      {
        error:
          "Status pesanan belum dapat diperbarui.",
      },
      500,
    );
  }
}