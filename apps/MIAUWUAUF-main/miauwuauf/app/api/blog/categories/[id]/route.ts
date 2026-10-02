import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { auth } from "@/auth"

const db = new PrismaClient()

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { role } = session.user
  if (role !== "admin" && role !== "bloguer") {
    return NextResponse.json({ error: "Prohibido" }, { status: 403 })
  }

  try {
    const { id } = await params
    await db.blogCategory.delete({ where: { id } })
    return NextResponse.json({ message: "Categoría eliminada" })
  } catch (error) {
    console.error("Error deleting blog category:", error)
    return NextResponse.json({ error: "Error al eliminar categoría" }, { status: 500 })
  }
}
