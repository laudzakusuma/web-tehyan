import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import { Role } from "@prisma/client";
import { cookies } from "next/headers";

import { db } from "@/server/db/client";

export const ADMIN_SESSION_COOKIE =
  "tehyan_admin_session";

const SESSION_SECONDS =
  8 * 60 * 60;

export const ADMIN_SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure:
    process.env.NODE_ENV ===
    "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_SECONDS,
};

type AdminSessionPayload = {
  v: 1;
  sub: string;
  exp: number;
};

function sessionSecret() {
  const secret =
    process.env.ADMIN_SESSION_SECRET;

  if (
    !secret ||
    secret.length < 32
  ) {
    throw new Error(
      "ADMIN_SESSION_SECRET_INVALID",
    );
  }

  return secret;
}

function sign(
  body: string,
  secret: string,
) {
  return createHmac(
    "sha256",
    secret,
  )
    .update(body)
    .digest("base64url");
}

export function createAdminSessionToken(
  userId: string,
) {
  const payload: AdminSessionPayload = {
    v: 1,
    sub: userId,
    exp:
      Date.now() +
      SESSION_SECONDS * 1000,
  };

  const body = Buffer.from(
    JSON.stringify(payload),
  ).toString("base64url");

  return `${body}.${sign(
    body,
    sessionSecret(),
  )}`;
}

export function verifyAdminSessionToken(
  token?: string | null,
): AdminSessionPayload | null {
  if (!token) return null;

  try {
    const parts = token.split(".");

    if (parts.length !== 2) {
      return null;
    }

    const [body, supplied] =
      parts;

    const expected = sign(
      body,
      sessionSecret(),
    );

    const expectedBuffer =
      Buffer.from(expected);

    const suppliedBuffer =
      Buffer.from(supplied);

    if (
      expectedBuffer.length !==
      suppliedBuffer.length
    ) {
      return null;
    }

    if (
      !timingSafeEqual(
        expectedBuffer,
        suppliedBuffer,
      )
    ) {
      return null;
    }

    const parsed = JSON.parse(
      Buffer.from(
        body,
        "base64url",
      ).toString("utf8"),
    ) as Partial<AdminSessionPayload>;

    if (
      parsed.v !== 1 ||
      typeof parsed.sub !==
        "string" ||
      !parsed.sub ||
      typeof parsed.exp !==
        "number" ||
      !Number.isFinite(
        parsed.exp,
      ) ||
      parsed.exp <= Date.now()
    ) {
      return null;
    }

    return {
      v: 1,
      sub: parsed.sub,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

export async function getAdminFromSessionToken(
  token?: string | null,
) {
  const payload =
    verifyAdminSessionToken(token);

  if (!payload) {
    return null;
  }

  /*
   * Role tidak dipercaya dari cookie.
   * Database selalu menjadi authority.
   */
  return db.user.findFirst({
    where: {
      id: payload.sub,
      role: Role.ADMIN,
    },

    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
}

export async function getCurrentAdmin() {
  const cookieStore =
    await cookies();

  return getAdminFromSessionToken(
    cookieStore.get(
      ADMIN_SESSION_COOKIE,
    )?.value,
  );
}