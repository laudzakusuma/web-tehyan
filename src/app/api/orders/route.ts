import { NextRequest, NextResponse } from "next/server";

import { createOrderSchema } from "@/lib/order-contract";
import {
  OrderServiceError,
  createOrder,
} from "@/server/services/orders";
import {
  isSameOriginRequest,
  rateAllowed,
} from "@/server/chat-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function mapServiceError(error: OrderServiceError) {
  switch (error.code) {
    case "PRODUCT_NOT_FOUND":
      return json(
        {
          error:
            "Ada produk di keranjang yang sudah tidak tersedia di sistem.",
          code: error.code,
        },
        404,
      );

    case "PRODUCT_UNAVAILABLE":
      return json(
        {
          error: error.message,
          code: error.code,
        },
        409,
      );

    case "FULFILLMENT_UNAVAILABLE":
      return json(
        {
          error:
            "Metode pengiriman tersebut belum tersedia.",
          code: error.code,
        },
        409,
      );

    case "INVALID_QUANTITY":
      return json(
        {
          error: error.message,
          code: error.code,
        },
        400,
      );

    default:
      return json(
        {
          error:
            "Pesanan belum dapat dibuat. Coba lagi sebentar.",
        },
        500,
      );
  }
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return json(
      {
        error: "Permintaan tidak diizinkan.",
      },
      403,
    );
  }

  if (
    !rateAllowed("orders:create:global", 60)
  ) {
    const response = json(
      {
        error:
          "Terlalu banyak permintaan pesanan. Coba lagi sebentar.",
      },
      429,
    );

    response.headers.set(
      "Retry-After",
      "60",
    );

    return response;
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return json(
      {
        error: "Data checkout tidak valid.",
      },
      400,
    );
  }

  const parsed =
    createOrderSchema.safeParse(body);

  if (!parsed.success) {
    return json(
      {
        error:
          "Data checkout belum lengkap atau tidak valid.",

        fields:
          parsed.error.flatten()
            .fieldErrors,
      },
      400,
    );
  }

  try {
    /*
     * Auth belum diimplementasikan,
     * jadi order dibuat sebagai guest.
     *
     * Nanti ketika auth masuk, userId
     * berasal dari session server,
     * BUKAN dari request body.
     */
    const order = await createOrder(
      parsed.data,
      null,
    );

    return json(
      {
        order,
      },
      201,
    );
  } catch (error) {
    if (
      error instanceof OrderServiceError
    ) {
      return mapServiceError(error);
    }

    /*
     * Jangan log customerName,
     * phone, address, notes,
     * atau request body.
     */
    console.error("[orders:create]", {
      code: "ORDER_CREATE_FAILED",
    });

    return json(
      {
        error:
          "Pesanan belum dapat dibuat. Coba lagi sebentar.",
        code: "ORDER_CREATE_FAILED",
      },
      500,
    );
  }
}