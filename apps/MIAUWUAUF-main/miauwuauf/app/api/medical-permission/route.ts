import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { vetHasCareRelationship } from "@/lib/medical-access-vet"

/**
 * Devuelve el estado de permiso historial clínico del veterinario actual para una mascota.
 * admin → siempre aceptado (bypass)
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }
  const petId = req.nextUrl.searchParams.get("petId")
  if (!petId) {
    return NextResponse.json({ message: "petId requerido" }, { status: 400 })
  }

  if (session.user.role === "admin") {
    return NextResponse.json({ status: "ACCEPTED", permissionId: null, bypass: true as const })
  }

  if (session.user.role !== "veterinario") {
    return NextResponse.json({ message: "Solo aplica a veterinarios" }, { status: 403 })
  }

  try {
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      select: { id: true, assignedVetId: true }
    })
    if (!pet) {
      return NextResponse.json({ message: "Mascota no encontrada" }, { status: 404 })
    }

    // Veterinario de confianza (campo en BD)
    if (pet.assignedVetId && pet.assignedVetId === session.user.id) {
      return NextResponse.json({
        status: "ACCEPTED" as const,
        permissionId: null,
        bypass: true as const,
        trustVet: true as const
      })
    }

    // Ya es el médico de esta mascota en citas / historial (no exigir permiso otra vez)
    if (await vetHasCareRelationship(petId, session.user.id)) {
      return NextResponse.json({
        status: "ACCEPTED" as const,
        permissionId: null,
        bypass: true as const,
        careRelationship: true as const
      })
    }

    // Si no es el veterinario más reciente pero ya hay registros clínicos en el sistema,
    // significa que otro veterinario atiende a la mascota actualmente.
    // Revocamos el acceso del veterinario anterior borrando su fila de permisos.
    const [lastAppt, lastDx, lastTx, lastPv, lastVa] = await Promise.all([
      prisma.appointment.findFirst({ where: { petId }, orderBy: { createdAt: "desc" } }),
      prisma.diagnosis.findFirst({ where: { petId }, orderBy: { createdAt: "desc" } }),
      prisma.treatment.findFirst({ where: { petId }, orderBy: { createdAt: "desc" } }),
      prisma.preventive.findFirst({ where: { petId }, orderBy: { createdAt: "desc" } }),
      prisma.vaccination.findFirst({ where: { petId }, orderBy: { createdAt: "desc" } }),
    ])

    const hasAnyRecord = !!(lastAppt || lastDx || lastTx || lastPv || lastVa)
    if (hasAnyRecord) {
      await prisma.medicalPermission.deleteMany({
        where: { petId, vetId: session.user.id }
      })
      return NextResponse.json({
        status: "NONE" as const,
        permissionId: null
      })
    }

    const row = await prisma.medicalPermission.findUnique({
      where: { petId_vetId: { petId, vetId: session.user.id } }
    })
    if (row?.status === "ACCEPTED") {
      return NextResponse.json({
        status: "ACCEPTED" as const,
        permissionId: row.id,
        bypass: false as const
      })
    }
    const status = (row?.status as "PENDING" | "REJECTED" | undefined) || "NONE"
    return NextResponse.json({
      status,
      permissionId: row?.id || null
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}
