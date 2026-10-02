import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  const { id } = await context.params
  
  if (!id || id === "undefined") {
    return NextResponse.json({ message: "ID de mascota no proporcionado o inválido" }, { status: 400 })
  }

  try {
    const pet = await prisma.pet.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            cedula: true
          }
        }
      }
    })

    if (!pet) {
      return NextResponse.json({ message: "Mascota no encontrada" }, { status: 404 })
    }

    // Check permissions: admin, veterinario or owner
    const isOwner = pet.userId === session.user.id
    const isAdminOrVet = session.user.role === "admin" || session.user.role === "veterinario"

    if (!isOwner && !isAdminOrVet) {
      return NextResponse.json({ message: "No autorizado para ver este paciente" }, { status: 403 })
    }

    return NextResponse.json(pet)
  } catch (error) {
    console.error("Error al obtener mascota por ID:", error)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}
