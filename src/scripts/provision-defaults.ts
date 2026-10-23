import { db } from "../lib/db";
import { closeRedis } from "../lib/cache";
import { ensureDefaultAdminOnStartup } from "../lib/bootstrap/ensure-default-admin";
import { ensureDefaultCarousels, ensureDefaultTemplates } from "../routes/admin.routes";

async function provisionDefaults(): Promise<void> {
  try {
    await ensureDefaultAdminOnStartup();
    await ensureDefaultCarousels();
    await ensureDefaultTemplates();
  } catch (error) {
    console.error("[Provision Defaults] Failed:", error);
    process.exitCode = 1;
  } finally {
    await closeRedis();
    await db.$disconnect();
  }
}

void provisionDefaults();