import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"

// Helper to check if user is admin
async function isAdmin() {
  const session = await auth()
  return session?.user?.role === "admin"
}

export async function GET() {
  try {
    const features = await prisma.techFeature.findMany({
      orderBy: { order: "asc" }
    })
    return NextResponse.json(features)
  } catch (error) {
    console.error("GET /api/tech-features error:", error)
    return NextResponse.json({ message: "Error fetching tech features" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const data = await req.json()
    const { id, iconName, title, description, color, bg, order, customIcon } = data

    if (id) {
      // Update
      const feature = await prisma.techFeature.update({
        where: { id },
        data: { iconName, title, description, color, bg, order: Number(order) || 0, customIcon: customIcon || null }
      })
      return NextResponse.json(feature)
    } else {
      // Create
      const feature = await prisma.techFeature.create({
        data: { iconName, title, description, color, bg, order: Number(order) || 0, customIcon: customIcon || null }
      })
      return NextResponse.json(feature, { status: 201 })
    }
  } catch (error) {
    console.error("POST /api/tech-features error:", error)
    return NextResponse.json({ message: "Error saving tech feature" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ message: "ID is required" }, { status: 400 })
    }

    await prisma.techFeature.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Tech feature deleted successfully" })
  } catch (error) {
    console.error("DELETE /api/tech-features error:", error)
    return NextResponse.json({ message: "Error deleting tech feature" }, { status: 500 })
  }
}
