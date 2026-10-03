import "dotenv/config";
const url = new URL(process.env.DATABASE_URL ?? "");
if (url.hostname !== "127.0.0.1" || process.env.APP_MODE !== "prototype")
  throw new Error("Tests require a local prototype database");
url.pathname = "/dongho_test";
process.env.DATABASE_URL = url.toString();
process.env.DIRECT_URL = url.toString();
