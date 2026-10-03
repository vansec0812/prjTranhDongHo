import "dotenv/config";
import { defineConfig } from "prisma/config";
import {
  migrationDatabaseUrl,
  runtimeDatabaseUrl,
} from "./src/lib/database-config";

// Prisma 6 CLI uses the direct connection. Runtime keeps its pooled URL.
process.env.DATABASE_URL = runtimeDatabaseUrl();
export default defineConfig({
  schema: "prisma/schema.prisma",
  engine: "classic",
  datasource: { url: migrationDatabaseUrl() },
});
