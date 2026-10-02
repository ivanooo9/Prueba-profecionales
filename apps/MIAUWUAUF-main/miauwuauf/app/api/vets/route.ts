import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET() {
  try {
    const vets = await prisma.user.findMany({
      where: { 
        role: {
          in: ["veterinario", "VETERINARIO", "Veterinario", "vet", "VET"]
        }
      },
      select: {
        id: true,
        name: true,
        specialty: true,
        phone: true,
        image: true,
        clinicName: true,
        address: true,
      },
      orderBy: { name: "asc" }
    })

    return NextResponse.json(vets)
  } catch (error) {
    console.error("Error al obtener veterinarios:", error)
    return NextResponse.json(
      { message: "Error al obtener veterinarios" },
      { status: 500 }
    )
  }
}
