import { Role, Prisma } from "@prisma/client";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { hashPassword, verifyPassword } from "../src/server/auth/password";
import { productionTarget } from "./production-target";

async function main() {
  const args = process.argv.slice(2);
  const create = args.includes("--create-first-admin");
  const rotate = args.includes("--rotate-first-admin");
  if (create === rotate || process.stdin.isTTY ||
      Object.hasOwn(process.env, "ADMIN_BOOTSTRAP_PASSWORD")) {
    throw new Error("PRIVATE_INPUT_REQUIRED");
  }
  const email = z.string().trim().max(254).email().parse(args.find(arg => arg.startsWith("--email="))?.slice(8)).toLowerCase();
  const name = z.string().trim().min(1).max(100).parse(args.find(arg => arg.startsWith("--name="))?.slice(7) ?? "Admin Tehyan");
  const input = readFileSync(0, "utf8").replace(/\r?\n$/, "");
  const password = z.string().min(20).max(200).regex(/^[\x21-\x7e]+$/).parse(input);
  const db = productionTarget(args);
  try {
    await db.$transaction(async tx => {
      if (rotate) {
        const [admin, adminCount] = await Promise.all([
          tx.user.findUnique({ where: { email }, select: { id: true, role: true, passwordHash: true } }),
          tx.user.count({ where: { role: Role.ADMIN } }),
        ]);
        if (adminCount !== 1 || admin?.role !== Role.ADMIN) throw new Error("ADMIN_MISMATCH");
        if (verifyPassword(password, admin.passwordHash)) throw new Error("PASSWORD_REUSED");
        await tx.user.update({ where: { id: admin.id }, data: { passwordHash: hashPassword(password) } });
        return;
      }
      const existingAdmin = await tx.user.findFirst({ where: { role: Role.ADMIN }, select: { id: true } });
      const existingEmail = await tx.user.findUnique({ where: { email }, select: { id: true } });
      if (existingAdmin || existingEmail) throw new Error("ACCOUNT_EXISTS");
      await tx.user.create({ data: { email, name, passwordHash: hashPassword(password), role: Role.ADMIN } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    console.log(rotate ? "Administrator password rotated." : "First administrator created.");
  } finally {
    await db.$disconnect();
  }
}

main().catch(error => {
  const messages: Record<string, string> = {
    ACCOUNT_EXISTS: "Bootstrap refused because an administrator or the requested email already exists.",
    ADMIN_MISMATCH: "Rotation refused. Enter the email of the sole Production administrator.",
    PASSWORD_REUSED: "Rotation refused. Generate a different password and try again.",
  };
  const message = error instanceof Error && Object.hasOwn(messages, error.message) ? messages[error.message] : undefined;
  console.error(message ?? "Administrator operation failed. Check the guarded target and privately supplied details.");
  process.exitCode = 1;
});
