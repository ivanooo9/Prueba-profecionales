import { auth } from "@/auth"
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * PATCH /api/admin/pets/[petId]/qr
 * Activa o desactiva el Plan QR Anti-Pérdida para una mascota específica.
 * Solo accesible por administradores.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ petId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { petId } = await params
    if (!petId) {
      return NextResponse.json({ error: "ID de mascota requerido" }, { status: 400 })
    }

    const body = await req.json()
    const { qrEnabled } = body

    if (typeof qrEnabled !== "boolean") {
      return NextResponse.json({ error: "El campo qrEnabled debe ser un booleano" }, { status: 400 })
    }

    const pet = await prisma.pet.update({
      where: { id: petId },
      data: { qrEnabled },
      include: {
        user: { select: { name: true, email: true } }
      }
    })

    return NextResponse.json({
      success: true,
      pet: {
        id: pet.id,
        nombre: pet.nombre,
        qrEnabled: pet.qrEnabled,
        ownerName: pet.user?.name || "Sin nombre",
        ownerEmail: pet.user?.email || "Sin email",
      }
    })
  } catch (error) {
    console.error("Error actualizando plan QR:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
