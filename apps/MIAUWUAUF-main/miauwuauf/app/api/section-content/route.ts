import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"

// Helper to check if user is admin
async function isAdmin() {
  const session = await auth()
  return session?.user?.role === "admin"
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const sectionId = searchParams.get("sectionId")

    if (!sectionId) {
      const allSections = await prisma.sectionContent.findMany({
        orderBy: { createdAt: "desc" }
      })
      return NextResponse.json(allSections)
    }

    const content = await prisma.sectionContent.findUnique({
      where: { sectionId }
    })
    
    return NextResponse.json(content || { sectionId, badge: "", title: "", subtitle: "" })
  } catch (error) {
    console.error("GET /api/section-content error:", error)
    return NextResponse.json({ message: "Error fetching section content" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const data = await req.json()
    const { sectionId, badge, title, subtitle } = data

    if (!sectionId) {
      return NextResponse.json({ message: "Section ID is required" }, { status: 400 })
    }

    const content = await prisma.sectionContent.upsert({
      where: { sectionId },
      update: { badge, title, subtitle },
      create: { sectionId, badge, title, subtitle }
    })
    
    return NextResponse.json(content)
  } catch (error) {
    console.error("POST /api/section-content error:", error)
    return NextResponse.json({ message: "Error saving section content" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const sectionId = searchParams.get("sectionId")

    if (!sectionId) {
      return NextResponse.json({ message: "sectionId is required" }, { status: 400 })
    }

    if (sectionId === "products-plans") {
      return NextResponse.json({ message: "Cannot delete the main plans section" }, { status: 400 })
    }

    await prisma.sectionContent.delete({
      where: { sectionId }
    })

    return NextResponse.json({ message: "Section deleted successfully" })
  } catch (error) {
    console.error("DELETE /api/section-content error:", error)
    return NextResponse.json({ message: "Error deleting section" }, { status: 500 })
  }
}
