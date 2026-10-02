import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

const PREFIX = "KAR";

function getTrackingSecret() {
  const secret =
    process.env.CAREER_TRACKING_SECRET?.trim();

  if (
    !secret ||
    secret.length < 32
  ) {
    throw new Error(
      "CAREER_TRACKING_SECRET belum dikonfigurasi.",
    );
  }

  return secret;
}

function signApplicationId(
  applicationId: string,
) {
  return createHmac(
    "sha256",
    getTrackingSecret(),
  )
    .update(
      `career-tracking:${applicationId}`,
    )
    .digest("base64url")
    .slice(0, 22);
}

export function createCareerTrackingCode(
  applicationId: string,
) {
  if (
    !/^[a-z0-9]+$/.test(
      applicationId,
    )
  ) {
    throw new Error(
      "Application ID tidak valid.",
    );
  }

  return `${PREFIX}.${applicationId}.${signApplicationId(
    applicationId,
  )}`;
}

export function parseCareerTrackingCode(
  code: string,
) {
  const normalized =
    code.trim();

  const match =
    /^KAR\.([a-z0-9]+)\.([A-Za-z0-9_-]{22})$/.exec(
      normalized,
    );

  if (!match) {
    return null;
  }

  const applicationId =
    match[1];

  const suppliedSignature =
    match[2];

  const expectedSignature =
    signApplicationId(
      applicationId,
    );

  const supplied =
    Buffer.from(
      suppliedSignature,
      "utf8",
    );

  const expected =
    Buffer.from(
      expectedSignature,
      "utf8",
    );

  if (
    supplied.length !==
    expected.length
  ) {
    return null;
  }

  if (
    !timingSafeEqual(
      supplied,
      expected,
    )
  ) {
    return null;
  }

  return applicationId;
}