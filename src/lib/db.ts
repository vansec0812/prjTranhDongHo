import { PrismaClient } from "@prisma/client";
import { runtimeDatabaseUrl } from "./database-config";
const globalDb = globalThis as typeof globalThis & { donghoDb?: PrismaClient };
export const db =
  globalDb.donghoDb ??
  new PrismaClient({ datasourceUrl: runtimeDatabaseUrl() });
if (process.env.NODE_ENV !== "production") globalDb.donghoDb = db;
