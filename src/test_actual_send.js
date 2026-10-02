const { PrismaClient } = require("@prisma/client");
const { Resend } = require("resend");

const db = new PrismaClient();

async function testFallback() {
  const config = await db.systemConfig.findFirst();
  const dbApiKey = config?.resendApiKey;

  console.log("=== Testing DB Key with onboarding@resend.dev ===");
  if (dbApiKey) {
    const resendDb = new Resend(dbApiKey);
    const test1 = await resendDb.emails.send({
      from: "Profesionales Ecuador <onboarding@resend.dev>",
      to: "delivered@resend.dev",
      subject: "Test email with onboarding@resend.dev",
      html: "<p>Test message</p>"
    });
    console.log("Fallback result:", JSON.stringify(test1, null, 2));
  }

  await db.$disconnect();
}

testFallback();
