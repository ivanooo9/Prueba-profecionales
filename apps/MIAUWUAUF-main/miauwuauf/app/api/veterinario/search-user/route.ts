import { auth } from "@/auth"
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== "veterinario") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json({ found: false, users: [] })
  }

  try {
    const query = q.toLowerCase()
    const users = await prisma.user.findMany({
      where: {
        role: "usuario",
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { cedula: { contains: query } },
          {
            pets: {
              some: {
                nombre: { contains: query, mode: 'insensitive' }
              }
            }
          }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cedula: true,
        pets: {
          select: {
            nombre: true
          }
        }
      },
      take: 5
    })

    return NextResponse.json({
      found: users.length > 0,
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        cedula: u.cedula,
        petNames: u.pets.map(p => p.nombre)
      }))
    })
  } catch (error) {
    console.error("Error al buscar usuarios:", error)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}
