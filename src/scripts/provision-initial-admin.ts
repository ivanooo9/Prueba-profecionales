import { db } from "../lib/db";
import { closeRedis } from "../lib/cache";
import { provisionInitialAdmin } from "../lib/bootstrap/ensure-default-admin";

async function main(): Promise<void> {
  try {
    const result = await provisionInitialAdmin();
    console.log(`[Provision Admin] ${result.message}`);
  } catch (error: any) {
    console.error(`[Provision Admin Error] ${error.message || error}`);
    process.exitCode = 1;
  } finally {
    await closeRedis();
    await db.$disconnect();
  }
}

void main();
