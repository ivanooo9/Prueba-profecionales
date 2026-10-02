const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const userCount = await prisma.user.count();
    console.log(`Table User Count: ${userCount}`);
    
    // Check other tables just in case
    const petCount = await prisma.pet.count();
    const appointmentCount = await prisma.appointment.count();
    console.log(`Table Pet Count: ${petCount}`);
    console.log(`Table Appointment Count: ${appointmentCount}`);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
