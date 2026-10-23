import { db } from "../lib/db";
import { closeRedis } from "../lib/cache";
import { runStartupMaintenance } from "../lib/bootstrap/ensure-default-admin";

async function runMaintenance(): Promise<void> {
  try {
    await runStartupMaintenance();
  } catch (error) {
    console.error("[Startup Maintenance] Failed:", error);
    process.exitCode = 1;
  } finally {
    await closeRedis();
    await db.$disconnect();
  }
}

void runMaintenance();