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

    const exams = await prisma.exam.findMany({
      where: {
        ...(petId ? { petId } : {}),
      },
      include: {
        vet: {
          select: { name: true, clinicName: true }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(exams)
  } catch (error) {
    console.error("Error fetching exams:", error)
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
    const { mascota, fecha, titulo, descripcion, fileUrl, fileType, fileName, petId, diagnosisId } = body

    if (!mascota) {
      return NextResponse.json({ message: "Falta el campo mascota" }, { status: 400 })
    }

    const exam = await prisma.exam.create({
      data: {
        mascota,
        fecha: fecha || new Date().toISOString().split('T')[0],
        titulo: titulo || "",
        descripcion,
        fileUrl: fileUrl || "",
        fileType: fileType || "",
        fileName,
        petId: petId || null,
        diagnosisId: diagnosisId || null,
        vetId: session.user.id,
        veterinario: session.user.name || "Veterinario"
      }
    })

    return NextResponse.json(exam, { status: 201 })
  } catch (error) {
    console.error("Error creating exam:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}
