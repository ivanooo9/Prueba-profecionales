import { auth } from "@/auth"
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: { 
        userId: session.user.id,
        type: { not: "admin_audit" }
      },
      orderBy: { createdAt: "desc" },
      take: 20
    })
    return NextResponse.json(notifications)
  } catch (error) {
    console.error("Error fetching notifications:", error)
    const detail = error instanceof Error ? error.message : "unknown"
    return NextResponse.json(
      { message: "No se pudieron cargar las notificaciones", detail },
      { status: 503 }
    )
  }
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  try {
    const { id, readAll } = await req.json()

    if (readAll) {
      await prisma.notification.updateMany({
        where: { userId: session.user.id, read: false },
        data: { read: true }
      })
      return NextResponse.json({ message: "Todas las notificaciones marcadas como leídas" })
    }

    if (!id) {
      return NextResponse.json({ message: "ID requerido" }, { status: 400 })
    }

    const notification = await prisma.notification.update({
      where: { id, userId: session.user.id },
      data: { read: true }
    })

    return NextResponse.json(notification)
  } catch (error) {
    console.error("Error updating notification:", error)
    const detail = error instanceof Error ? error.message : "unknown"
    return NextResponse.json({ message: "No se pudo actualizar la notificación", detail }, { status: 503 })
  }
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const onlyRead = searchParams.get("onlyRead") === "true"

  try {
    let id: string | null = null;
    try {
      const body = await req.json();
      id = body.id;
    } catch {
      // No body or invalid JSON, fallback to query params if needed
    }

    if (id) {
      await prisma.notification.delete({
        where: { id, userId: session.user.id }
      });
      return NextResponse.json({ message: "Notificación eliminada" });
    }

    await prisma.notification.deleteMany({
      where: { 
        userId: session.user.id,
        // Mantener intacta la bitácora administrativa persistente.
        type: { not: "admin_audit" },
        ...(onlyRead ? { read: true } : {})
      }
    })
    return NextResponse.json({ 
      message: onlyRead ? "Notificaciones leídas borradas" : "Historial de notificaciones borrado" 
    })
  } catch (error) {
    console.error("Error deleting notifications:", error)
    const detail = error instanceof Error ? error.message : "unknown"
    return NextResponse.json({ message: "No se pudieron eliminar las notificaciones", detail }, { status: 503 })
  }
}
