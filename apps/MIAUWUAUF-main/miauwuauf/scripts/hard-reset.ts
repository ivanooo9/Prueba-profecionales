import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("⚠️ INICIANDO HARD RESET DE LA BASE DE DATOS...");

  try {
    // 1. Tienda y Pedidos
    console.log("- Eliminando Counters (Reset de numeración)...");
    await prisma.counter.deleteMany();
    
    console.log("- Eliminando OrderItems...");
    await prisma.orderItem.deleteMany();
    
    console.log("- Eliminando Orders (Transacciones)...");
    await prisma.order.deleteMany();

    console.log("- Eliminando Productos...");
    await prisma.product.deleteMany();

    // 2. Comunicaciones y Eventos
    console.log("- Eliminando Notificaciones (Mensajes)...");
    await prisma.notification.deleteMany();

    console.log("- Eliminando EventRegistrations...");
    await prisma.eventRegistration.deleteMany();

    console.log("- Eliminando Events...");
    await prisma.event.deleteMany();

    // 3. Adopciones
    console.log("- Eliminando AdoptionRequests...");
    await prisma.adoptionRequest.deleteMany();

    console.log("- Eliminando ShelterPets...");
    await prisma.shelterPet.deleteMany();

    // 4. Médico y Citas
    console.log("- Eliminando Appointments...");
    await prisma.appointment.deleteMany();

    console.log("- Eliminando Diagnoses...");
    await prisma.diagnosis.deleteMany();

    console.log("- Eliminando Treatments...");
    await prisma.treatment.deleteMany();

    console.log("- Eliminando Preventives...");
    await prisma.preventive.deleteMany();

    console.log("- Eliminando Vaccinations...");
    await prisma.vaccination.deleteMany();

    console.log("- Eliminando MedicalPermissions...");
    await prisma.medicalPermission.deleteMany();

    // 5. Mascotas
    console.log("- Eliminando Pets...");
    await prisma.pet.deleteMany();

    // 6. Blog
    console.log("- Eliminando BlogPosts...");
    await prisma.blogPost.deleteMany();

    // 7. Usuarios
    console.log("- Eliminando usuarios (excepto Admin)...");
    const resultUsers = await prisma.user.deleteMany({
      where: {
        role: {
          not: "admin"
        }
      }
    });
    console.log(`  -> Eliminados ${resultUsers.count} usuarios no administradores.`);

    console.log("✅ ¡Hard Reset completado con éxito!");
    console.log("✅ Se conservaron: CategoryStore, SubcategoryStore, Plan, TechFeature, SectionContent, BlogCategory, y cuenta Admin.");
  } catch (error) {
    console.error("❌ Error durante el Hard Reset:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
