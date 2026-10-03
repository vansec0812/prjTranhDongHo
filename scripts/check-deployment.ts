import "dotenv/config";
import {
  migrationDatabaseUrl,
  runtimeDatabaseUrl,
} from "../src/lib/database-config";
import { productionGuard } from "../src/lib/config";

try {
  // This command targets Vercel even when invoked from a local terminal.
  process.env.VERCEL = "1";
  runtimeDatabaseUrl();
  migrationDatabaseUrl();
  productionGuard();
  console.log("Vercel environment config validated; no database was modified.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid config");
  process.exitCode = 1;
}
