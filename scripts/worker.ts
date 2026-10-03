import "dotenv/config";
import { runScheduled, deliverOne } from "../src/lib/services/worker";
import { db } from "../src/lib/db";
async function tick() {
  try {
    await runScheduled();
    for (let n = 0; n < 100 && (await deliverOne()); n++) {
      /* durable database claims serialize delivery */
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "worker-error",
        type: error instanceof Error ? error.name : "Unknown",
      }),
    );
  }
}
async function main() {
  await tick();
  if (process.argv.includes("--once")) return;
  console.log(
    "Durable local worker active. Email adapter: " +
      (process.env.MAIL_MODE ?? "smtp"),
  );
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await tick();
  }
}
main().finally(() => db.$disconnect());
