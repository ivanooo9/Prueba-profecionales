
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfill() {
  console.log(" Iniciando backfill de citas médicas...");

  // 1. Obtener todas las vacunas con próximas fechas futuras
  const vacunas = await prisma.vaccination.findMany({
    include: { pet: true, vet: true }
  });

  // 2. Obtener todos los preventivos con próximas fechas futuras
  const preventivos = await prisma.preventive.findMany({
    include: { pet: true, vet: true }
  });

  let createdCount = 0;

  // Procesar Vacunas
  for (const v of vacunas) {
    if (!v.proximaFecha) continue;

    // Verificar si ya existe una cita para esta mascota en esa fecha con ese motivo
    const motivo = `Refuerzo Vacuna: ${v.vacunaId || 'General'}`;
    const existing = await prisma.appointment.findFirst({
      where: {
        petId: v.petId,
        fecha: v.proximaFecha,
        motivo: { contains: v.vacunaId ?? '' }
      }
    });

    if (!existing && v.pet) {
      await prisma.appointment.create({
        data: {
          mascota: v.mascota,
          dueno: v.pet.userId, // El campo dueno en el modelo parece esperar un string o nombre, pero vamos a usar lo que tenemos
          fecha: v.proximaFecha,
          hora: "09:00", // Hora por defecto para recordatorios
          tipo: "vacunacion",
          estado: "pendiente",
          motivo: motivo,
          petId: v.petId,
          vetId: v.vetId,
          veterinario: v.veterinario || "Veterinario"
        }
      });
      createdCount++;
      console.log(` Cita de vacuna creada para ${v.mascota} (${v.proximaFecha})`);
    }
  }

  // Procesar Preventivos
  for (const p of preventivos) {
    if (!p.proximaFecha) continue;

    const motivo = `Control Preventivo: ${p.tipo}`;
    const existing = await prisma.appointment.findFirst({
      where: {
        petId: p.petId,
        fecha: p.proximaFecha,
        motivo: { contains: p.tipo ?? '' }
      }
    });

    if (!existing && p.pet) {
      await prisma.appointment.create({
        data: {
          mascota: p.mascota,
          dueno: p.pet.userId,
          fecha: p.proximaFecha,
          hora: (p.tipo ?? '').toLowerCase().includes("peso") ? "10:00" : "09:30",
          tipo: "preventivo",
          estado: "pendiente",
          motivo: motivo,
          petId: p.petId,
          vetId: p.vetId,
          veterinario: p.veterinario || "Veterinario"
        }
      });
      createdCount++;
      console.log(` Cita de preventivo creada para ${p.mascota} (${p.proximaFecha})`);
    }
  }

  console.log(` Backfill completado. Se crearon ${createdCount} citas nuevas.`);
}

backfill()
  .catch(e => {
    console.error(" Error en backfill:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
