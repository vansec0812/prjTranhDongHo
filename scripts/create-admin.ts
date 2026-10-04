import "dotenv/config";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import { hashPassword } from "../src/lib/password";
import { db } from "../src/lib/db";
import { z } from "zod";
async function main() {
  const email = z.email().parse(process.argv[2]);
  if (await db.adminUser.findUnique({ where: { email } }))
    throw new Error("Admin already exists; no password was changed");
  const password = randomBytes(18).toString("base64url");
  await db.adminUser.create({
    data: {
      email,
      name: "Quản trị viên",
      passwordHash: await hashPassword(password),
    },
  });
  fs.mkdirSync(".local", { recursive: true });
  fs.writeFileSync(
    ".local/demo-access.txt",
    `Local prototype admin\nURL: http://127.0.0.1:3000/admin/login\nEmail: ${email}\nPassword: ${password}\nKeep this file private.\n`,
    { flag: "wx" },
  );
  console.log(
    "Admin created. Random credentials written to .local/demo-access.txt",
  );
}
main().finally(() => db.$disconnect());
