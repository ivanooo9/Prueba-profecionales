const { PrismaClient } = require("@prisma/client");
const { Resend } = require("resend");

const db = new PrismaClient();

async function testOtherRecipient() {
  const config = await db.systemConfig.findFirst();
  const dbApiKey = config?.resendApiKey;

  console.log("=== Testing DB Key with onboarding@resend.dev to a real external recipient ===");
  if (dbApiKey) {
    const resendDb = new Resend(dbApiKey);
    const test1 = await resendDb.emails.send({
      from: "Profesionales Ecuador <onboarding@resend.dev>",
      to: "profesionalesecuador2026@gmail.com", // testing external email
      subject: "Test email to external address",
      html: "<p>Test message</p>"
    });
    console.log("External recipient result:", JSON.stringify(test1, null, 2));
  }

  await db.$disconnect();
}

testOtherRecipient();
