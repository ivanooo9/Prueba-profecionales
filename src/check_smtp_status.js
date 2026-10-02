const { PrismaClient } = require("@prisma/client");
const { Resend } = require("resend");

const db = new PrismaClient();

async function checkSmtp() {
  try {
    const config = await db.systemConfig.findFirst();
    console.log("=== DB SystemConfig Email Settings ===");
    console.log("resendApiKey:", config?.resendApiKey ? `${config.resendApiKey.substring(0, 8)}...` : "NOT CONFIGURED IN DB");
    console.log("resendFromEmail:", config?.resendFromEmail || "NOT CONFIGURED IN DB");
    console.log("adminEmail:", config?.adminEmail || "NOT CONFIGURED IN DB");

    console.log("\n=== Environment Variables ===");
    console.log("RESEND_API_KEY:", process.env.RESEND_API_KEY ? `${process.env.RESEND_API_KEY.substring(0, 8)}...` : "NOT SET IN ENV");
    console.log("RESEND_FROM_EMAIL:", process.env.RESEND_FROM_EMAIL || "NOT SET IN ENV");

    const apiKey = config?.resendApiKey || process.env.RESEND_API_KEY || "";

    if (!apiKey) {
      console.log("\n[CRITICAL ERROR]: No Resend API Key found in SystemConfig or process.env!");
    } else {
      console.log("\nTesting Resend API Key validity...");
      const resend = new Resend(apiKey);
      try {
        const domains = await resend.domains.list();
        console.log("Resend API Key is VALID! Domains list:", JSON.stringify(domains, null, 2));
      } catch (err) {
        console.error("Resend API Key verification failed:", err.message || err);
      }
    }
  } catch (err) {
    console.error("Error checking SMTP:", err);
  } finally {
    await db.$disconnect();
  }
}

checkSmtp();
