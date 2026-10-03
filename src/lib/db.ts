import { PrismaClient } from "@prisma/client";
const globalDb = globalThis as typeof globalThis & { donghoDb?: PrismaClient };
export const db = globalDb.donghoDb ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalDb.donghoDb = db;
