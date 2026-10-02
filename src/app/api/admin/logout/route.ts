import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_COOKIE_OPTIONS,
} from "@/server/auth/admin-session";

import {
  isSameOriginRequest,
} from "@/server/chat-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json(
      {
        error:
          "Permintaan tidak diizinkan.",
      },
      {
        status: 403,
      },
    );
  }

  const response =
    NextResponse.json({
      ok: true,
    });

  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    "",
    {
      ...ADMIN_SESSION_COOKIE_OPTIONS,
      maxAge: 0,
    },
  );

  return response;
}