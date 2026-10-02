import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

const KEY_LENGTH = 64;
const PREFIX = "scrypt";

export function hashPassword(
  password: string,
) {
  const normalized =
    password.normalize("NFKC");

  if (
    normalized.length < 12 ||
    normalized.length > 200
  ) {
    throw new Error(
      "PASSWORD_LENGTH_INVALID",
    );
  }

  const salt = randomBytes(16)
    .toString("hex");

  const digest = scryptSync(
    normalized,
    salt,
    KEY_LENGTH,
  ).toString("hex");

  return `${PREFIX}$${salt}$${digest}`;
}

export function verifyPassword(
  password: string,
  encoded: string,
) {
  try {
    const parts = encoded.split("$");

    if (parts.length !== 3) {
      return false;
    }

    const [
      scheme,
      salt,
      expectedHex,
    ] = parts;

    if (
      scheme !== PREFIX ||
      !salt ||
      expectedHex.length !==
        KEY_LENGTH * 2 ||
      !/^[0-9a-f]+$/i.test(
        expectedHex,
      )
    ) {
      return false;
    }

    const expected = Buffer.from(
      expectedHex,
      "hex",
    );

    const actual = scryptSync(
      password.normalize("NFKC"),
      salt,
      KEY_LENGTH,
    );

    if (
      expected.length !==
      actual.length
    ) {
      return false;
    }

    return timingSafeEqual(
      expected,
      actual,
    );
  } catch {
    return false;
  }
}