import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalizeEcuadorPhone(rawValue) {
  if (typeof rawValue !== "string") return undefined;

  const trimmed = rawValue.trim();
  if (!trimmed) return undefined;

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return undefined;

  if (digits.startsWith("593")) return digits;
  if (digits.startsWith("0") && digits.length >= 10) return `593${digits.slice(1)}`;
  if (digits.length === 9) return `593${digits}`;
  return `593${digits}`;
}

async function normalizeUsers() {
  const users = await prisma.user.findMany({
    where: { phone: { not: null } },
    select: { id: true, phone: true },
  });

  let updated = 0;
  for (const user of users) {
    const normalized = normalizeEcuadorPhone(user.phone);
    if (!normalized || normalized === user.phone) continue;
    await prisma.user.update({
      where: { id: user.id },
      data: { phone: normalized },
    });
    updated += 1;
  }
  return { scanned: users.length, updated };
}

async function normalizeAdoptions() {
  const records = await prisma.adoptionRequest.findMany({
    select: { id: true, telefono: true },
  });

  let updated = 0;
  for (const record of records) {
    const normalized = normalizeEcuadorPhone(record.telefono);
    if (!normalized || normalized === record.telefono) continue;
    await prisma.adoptionRequest.update({
      where: { id: record.id },
      data: { telefono: normalized },
    });
    updated += 1;
  }
  return { scanned: records.length, updated };
}

async function normalizeOrders() {
  const orders = await prisma.order.findMany({
    where: { telefono: { not: null } },
    select: { id: true, telefono: true },
  });

  let updated = 0;
  for (const order of orders) {
    const normalized = normalizeEcuadorPhone(order.telefono);
    if (!normalized || normalized === order.telefono) continue;
    await prisma.order.update({
      where: { id: order.id },
      data: { telefono: normalized },
    });
    updated += 1;
  }
  return { scanned: orders.length, updated };
}

async function normalizePlanWhatsappContact() {
  const sectionId = "plans-whatsapp-contact";
  const setting = await prisma.sectionContent.findUnique({
    where: { sectionId },
    select: { id: true, subtitle: true },
  });

  if (!setting?.id) return { scanned: 0, updated: 0 };

  const normalized = normalizeEcuadorPhone(setting.subtitle);
  if (!normalized || normalized === setting.subtitle) {
    return { scanned: 1, updated: 0 };
  }

  await prisma.sectionContent.update({
    where: { sectionId },
    data: { subtitle: normalized },
  });
  return { scanned: 1, updated: 1 };
}

async function main() {
  console.log("Starting phone normalization to Ecuador format (593...)");

  const [users, adoptions, orders, planContact] = await Promise.all([
    normalizeUsers(),
    normalizeAdoptions(),
    normalizeOrders(),
    normalizePlanWhatsappContact(),
  ]);

  const totalScanned = users.scanned + adoptions.scanned + orders.scanned + planContact.scanned;
  const totalUpdated = users.updated + adoptions.updated + orders.updated + planContact.updated;

  console.log("Done.");
  console.log(`Users: scanned=${users.scanned}, updated=${users.updated}`);
  console.log(`Adoption requests: scanned=${adoptions.scanned}, updated=${adoptions.updated}`);
  console.log(`Orders: scanned=${orders.scanned}, updated=${orders.updated}`);
  console.log(`Plan WhatsApp contact: scanned=${planContact.scanned}, updated=${planContact.updated}`);
  console.log(`Total: scanned=${totalScanned}, updated=${totalUpdated}`);
}

main()
  .catch((error) => {
    console.error("Phone normalization failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
