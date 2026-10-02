import { auth } from "@/auth"
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

/**
 * Ruta exclusiva para el panel del veterinario y admin.
 * Tanto vets como admins ven TODAS las mascotas.
 * El control de acceso al historial médico se gestiona
 * por separado mediante el sistema de permisos (MedicalPermission).
 */
export async function GET() {
  const session = await auth()
  const user = session?.user

  if (!user?.id) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  if (user.role !== "veterinario" && user.role !== "admin") {
    return NextResponse.json({ message: "Acceso restringido" }, { status: 403 })
  }

  try {
    const pets = await prisma.pet.findMany({
      include: {
        user: { select: { name: true, email: true, phone: true, cedula: true, role: true } }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(pets)
  } catch (error) {
    console.error("Error al obtener pacientes del dashboard:", error)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}

