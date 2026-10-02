import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session || !session.user?.id) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }

    const { id } = await params

    const exam = await prisma.exam.findUnique({
      where: { id }
    })

    if (!exam) {
      return NextResponse.json({ message: "Examen no encontrado" }, { status: 404 })
    }

    // Opcional: Solo el vet que lo creó o el admin pueden borrarlo
    if (exam.vetId !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ message: "No autorizado para eliminar este examen" }, { status: 403 })
    }

    await prisma.exam.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Examen eliminado exitosamente" })
  } catch (error) {
    console.error("Error deleting exam:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}
