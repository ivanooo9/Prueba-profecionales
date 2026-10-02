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
    const plans = await prisma.plan.findMany({
      orderBy: { createdAt: "asc" }
    })
    return NextResponse.json(plans)
  } catch (error) {
    console.error("GET /api/plans error:", error)
    return NextResponse.json({ message: "Error fetching plans" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const data = await req.json()
    const { id, name, price, description, features, badge, color, sectionId, billingCycle } = data

    if (id) {
      // Update
      const plan = await prisma.plan.update({
        where: { id },
        data: {
          name,
          price,
          description,
          features,
          badge: badge || "",
          color: color || "bg-primary",
          sectionId,
          billingCycle
        }
      })
      return NextResponse.json(plan)
    } else {
      // Create
      const plan = await prisma.plan.create({
        data: {
          name,
          price,
          description,
          features,
          badge: badge || "",
          color: color || "bg-primary",
          sectionId: sectionId || "products-plans",
          billingCycle: billingCycle || "al mes"
        }
      })
      return NextResponse.json(plan, { status: 201 })
    }
  } catch (error) {
    console.error("POST /api/plans error:", error)
    return NextResponse.json({ message: "Error saving plan" }, { status: 500 })
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

    await prisma.plan.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Plan deleted successfully" })
  } catch (error) {
    console.error("DELETE /api/plans error:", error)
    return NextResponse.json({ message: "Error deleting plan" }, { status: 500 })
  }
}
