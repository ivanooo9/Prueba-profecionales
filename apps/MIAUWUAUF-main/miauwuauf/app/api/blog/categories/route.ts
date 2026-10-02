import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { auth } from "@/auth"

// Use a local PrismaClient instance to access BlogCategory which is defined in the schema.
// The global singleton in lib/prisma may have been generated before BlogCategory was added.
const db = new PrismaClient()

const INITIAL_CATEGORIES = ["Salud y Bienestar", "Nutrición", "Entrenamiento", "Historias de Rescate", "Eventos y Campañas"]

export async function GET() {
  try {
    let categories = await db.blogCategory.findMany({
      orderBy: { nombre: "asc" }
    })

    // Semilla inicial si está vacío
    if (categories.length === 0) {
      for (const catName of INITIAL_CATEGORIES) {
        await db.blogCategory.create({ data: { nombre: catName } })
      }
      categories = await db.blogCategory.findMany({ orderBy: { nombre: "asc" } })
    }

    return NextResponse.json(categories)
  } catch (error) {
    console.error("Error fetching blog categories:", error)
    return NextResponse.json({ error: "Error al obtener categorías" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { role } = session.user
  if (role !== "admin" && role !== "bloguer") {
    return NextResponse.json({ error: "Prohibido" }, { status: 403 })
  }

  try {
    const body = await req.json() as { nombre?: string }
    if (!body.nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })

    const category = await db.blogCategory.create({
      data: { nombre: body.nombre.trim() }
    })
    return NextResponse.json(category)
  } catch (error) {
    console.error("Error creating blog category:", error)
    return NextResponse.json({ error: "Error al crear categoría" }, { status: 500 })
  }
}
