import {
  NextRequest,
  NextResponse,
} from "next/server";

import { Role } from "@prisma/client";
import { z } from "zod";

import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_COOKIE_OPTIONS,
  createAdminSessionToken,
} from "@/server/auth/admin-session";

import {
  hashPassword,
  verifyPassword,
} from "@/server/auth/password";

import {
  isSameOriginRequest,
  rateAllowed,
} from "@/server/chat-security";

import { db } from "@/server/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((value) =>
        value.toLowerCase(),
      ),

    password: z
      .string()
      .min(1)
      .max(200),
  })
  .strict();

const DUMMY_PASSWORD_HASH =
  hashPassword(
    "tehyan-dummy-password-never-used",
  );

function json(
  body: unknown,
  status = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(
  req: NextRequest,
) {
  if (!isSameOriginRequest(req)) {
    return json(
      {
        error: "Permintaan tidak diizinkan.",
      },
      403,
    );
  }

  if (
    !rateAllowed(
      "admin:login:global",
      20,
    )
  ) {
    const response = json(
      {
        error:
          "Terlalu banyak percobaan login. Coba lagi sebentar.",
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
        error: "Data login tidak valid.",
      },
      400,
    );
  }

  const parsed =
    loginSchema.safeParse(body);

  if (!parsed.success) {
    return json(
      {
        error:
          "Email atau password tidak valid.",
      },
      400,
    );
  }

  const user =
    await db.user.findUnique({
      where: {
        email: parsed.data.email,
      },

      select: {
        id: true,
        name: true,
        role: true,
        passwordHash: true,
      },
    });

  const passwordMatches =
    verifyPassword(
      parsed.data.password,
      user?.passwordHash ??
        DUMMY_PASSWORD_HASH,
    );

  if (
    !user ||
    user.role !== Role.ADMIN ||
    !passwordMatches
  ) {
    return json(
      {
        error:
          "Email atau password salah.",
      },
      401,
    );
  }

  let token: string;

  try {
    token =
      createAdminSessionToken(
        user.id,
      );
  } catch {
    console.error(
      "[admin:login]",
      {
        code:
          "SESSION_CONFIGURATION_ERROR",
      },
    );

    return json(
      {
        error:
          "Login admin belum dikonfigurasi.",
      },
      503,
    );
  }

  const response = json({
    ok: true,
    admin: {
      name: user.name,
    },
  });

  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    token,
    ADMIN_SESSION_COOKIE_OPTIONS,
  );

  return response;
}