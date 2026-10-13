import "dotenv/config";
import { db } from "../src/lib/db";
import { cloudPrototype, localAdapters } from "../src/lib/deployment";
import { enrichCulturalContent } from "../src/lib/services/cultural-content";

async function main() {
  if (
    !localAdapters() &&
    !(
      cloudPrototype() &&
      process.env.VERCEL_ENV === "production" &&
      process.env.BOOTSTRAP_DEMO === "true"
    )
  )
    throw new Error(
      "Editorial update only supports the authorized local or Vercel coursework prototype",
    );
  console.log("Cultural content update:", await enrichCulturalContent());
}
main()
  .catch(() => {
    console.error(
      "Cultural content update failed; no credentials logged and its transaction was rolled back.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
