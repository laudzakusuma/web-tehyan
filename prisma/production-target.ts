import { PrismaClient } from "@prisma/client";

export function productionTarget(args: string[]) {
  const expectedHost = args.find(arg => arg.startsWith("--host="))?.slice(7);
  const connection = process.env.DATABASE_URL_UNPOOLED;
  if (!connection || !expectedHost) throw new Error("TARGET_REQUIRED");

  const url = new URL(connection);
  if (url.hostname !== expectedHost || !url.hostname.endsWith(".neon.tech") ||
      url.hostname.includes("-pooler.") || !["postgresql:", "postgres:"].includes(url.protocol) ||
      !["require", "verify-full"].includes(url.searchParams.get("sslmode") ?? "")) {
    throw new Error("TARGET_INVALID");
  }

  return new PrismaClient({ datasourceUrl: connection });
}
