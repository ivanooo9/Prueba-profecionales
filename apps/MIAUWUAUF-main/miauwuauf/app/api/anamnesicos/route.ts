import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session || !session.user?.id) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const petId = searchParams.get("petId")

    if (!petId) {
      return NextResponse.json({ message: "Se requiere petId" }, { status: 400 })
    }

    const anamnesico = await prisma.anamnesico.findUnique({
      where: { petId },
    })

    return NextResponse.json(anamnesico || {})
  } catch (error) {
    console.error("Error fetching anamnesico:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session || !session.user?.id) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }

    const body = await req.json()
    const { petId, ...fields } = body

    if (!petId) {
      return NextResponse.json({ message: "Falta petId" }, { status: 400 })
    }

    const anamnesico = await prisma.anamnesico.upsert({
      where: { petId },
      update: { ...fields },
      create: { petId, ...fields },
    })

    return NextResponse.json(anamnesico, { status: 200 })
  } catch (error) {
    console.error("Error saving anamnesico:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}
