import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const [
      userCount,
      roleCounts,
      petCount,
      shelterPetsDisponibles,
      shelterPetsAdoptadas,
      adoptionRequestStats,
      adoptedCount,
      diagnosisCount,
      treatmentCount,
      vaccinationCount,
      preventiveCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({
        by: ['role'],
        _count: {
          role: true
        }
      }),
      prisma.pet.count(),
      // Solo los que AÚN buscan hogar (disponible o en proceso)
      prisma.shelterPet.count({ where: { estado: { in: ['disponible', 'en_proceso'] } } }),
      // Los que ya encontraron familia
      prisma.shelterPet.count({ where: { estado: 'adoptado' } }),
      prisma.adoptionRequest.groupBy({
        by: ['estado'],
        _count: {
          estado: true
        }
      }),
      prisma.adoptionRequest.count({ where: { estado: 'entregada' } }),
      prisma.diagnosis.count(),
      prisma.treatment.count(),
      prisma.vaccination.count(),
      prisma.preventive.count()
    ]);

    // Format role counts
    const usersByRole = roleCounts.reduce<Record<string, number>>((acc, curr) => {
      acc[curr.role as string] = curr._count.role;
      return acc;
    }, {});

    // Format adoption stats
    const adoptionStats = adoptionRequestStats.reduce<Record<string, number>>((acc, curr) => {
      acc[curr.estado as string] = curr._count.estado;
      return acc;
    }, {});

    return NextResponse.json({
      users: {
        total: userCount,
        ...usersByRole
      },
      pets: {
        total: petCount + shelterPetsDisponibles + shelterPetsAdoptadas,
        userPets: petCount,
        shelterPets: shelterPetsDisponibles,      // En espera de hogar
        shelterPetsAdoptadas: shelterPetsAdoptadas // Ya adoptados
      },
      adoptions: {
        totalRequests: adoptionRequestStats.reduce((sum, curr) => sum + curr._count.estado, 0),
        entregadas: adoptedCount,
        ...adoptionStats
      },
      health: {
        diagnoses: diagnosisCount,
        treatments: treatmentCount,
        vaccinations: vaccinationCount,
        preventives: preventiveCount,
        totalActions: diagnosisCount + treatmentCount + vaccinationCount + preventiveCount
      }
    });

  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
