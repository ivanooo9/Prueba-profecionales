import { auth } from "@/auth"
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { normalizeEcuadorPhone } from "@/lib/phone"
import { Prisma } from "@prisma/client"
import { writeAdminAudit } from "@/lib/admin-audit"
import { createNotification } from "@/lib/notification"
import bcrypt from "bcryptjs"

export const dynamic = "force-dynamic"

// Obtener todos los usuarios (Solo Admin)
export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        cedula: true,
        city: true,
        address: true,
        image: true,
        isActive: true,
        createdAt: true,
        pets: {
          include: {
            assignedVet: {
              select: { name: true }
            }
          }
        },
        solicitudes: {
          include: {
            shelterPet: {
              select: { nombre: true }
            }
          }
        },
        eventRegistrations: {
          include: {
            event: {
              select: { titulo: true }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Obtener la cantidad de posts agrupados por autor
    const postsCount = await prisma.blogPost.groupBy({
      by: ['authorId'],
      _count: true
    })
    
    const postsCountMap = new Map()
    postsCount.forEach(p => postsCountMap.set(p.authorId, p._count))

    const usersWithCounts = users.map(user => ({
      ...user,
      articulos: postsCountMap.get(user.id) || 0
    }))

    return NextResponse.json(usersWithCounts)
  } catch (error) {
    console.error("Error al obtener usuarios:", error)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}

// Actualizar usuario (Solo Admin)
export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { id, nombre, email, telefono, phone, cedula, city, address, image, role, isActive } = body
    const normalizedPhone = normalizeEcuadorPhone(telefono || phone)
    
    if (!id) {
      return NextResponse.json({ message: "ID de usuario requerido" }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({ where: { id }, select: { isActive: true, role: true } })

    const updateData: any = {
      name: nombre,
      email: email,
      phone: normalizedPhone,
      cedula: cedula,
      city: city,
      address: address,
      image: image,
      role: role,
      isActive: isActive !== undefined ? isActive : undefined
    }

    if (body.password && body.password.trim() !== "") {
      updateData.password = await bcrypt.hash(body.password, 10)
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData
    })

    if (existingUser && isActive !== undefined && existingUser.isActive !== isActive) {
      const isActivating = isActive;
      const isVet = existingUser.role === "veterinario" || updatedUser.role === "veterinario";
      
      const roleName = isVet ? "Veterinario" : "Usuario";
      const title = isActivating ? `¡Cuenta de ${roleName} Activada!` : "Cuenta Desactivada";
      const message = isActivating 
        ? `Hola ${updatedUser.name || roleName}, tu cuenta ${isVet ? "profesional " : ""}en MIAUWUAUF ha sido activada exitosamente. Ya puedes acceder al sistema.`
        : `Hola ${updatedUser.name || roleName}, tu cuenta ${isVet ? "profesional " : ""}en MIAUWUAUF ha sido desactivada por un administrador. No podrás acceder al sistema por el momento.`;
      
      const actionUrl = isActivating 
        ? (isVet ? "/login?tab=veterinario" : "/login?tab=usuario")
        : `https://wa.me/593984656026?text=${encodeURIComponent(`Hola, mi cuenta de ${roleName.toLowerCase()} a nombre de ${updatedUser.name || "sin nombre"} fue desactivada y me gustaría saber el motivo.`)}`;
      const actionText = isActivating ? (isVet ? "Acceder al Dashboard" : "Acceder a mi Cuenta") : "Contactar Soporte";

      await createNotification({
        userId: updatedUser.id,
        userEmail: updatedUser.email || undefined,
        title,
        message,
        type: "info",
        sendEmailFlag: true,
        actionUrl,
        actionText
      });
    }

    if (body.password && body.password.trim() !== "") {
      const isVet = existingUser?.role === "veterinario" || updatedUser.role === "veterinario";
      await createNotification({
        userId: updatedUser.id,
        userEmail: updatedUser.email || undefined,
        title: "🔑 Contraseña Actualizada",
        message: `Hola ${updatedUser.name || "Usuario"}, tu contraseña ha sido actualizada por el administrador. \n\nTu nueva contraseña es: **${body.password}**\n\nTe recomendamos guardar esta información en un lugar seguro.`,
        type: "info",
        sendEmailFlag: true,
        actionUrl: isVet ? "/login?tab=veterinario" : "/login?tab=usuario",
        actionText: "Iniciar Sesión"
      });
    }

    await writeAdminAudit({
      action: "update",
      entity: updatedUser.role === "veterinario" ? "veterinario" : "usuario",
      entityId: updatedUser.id,
      title: "Usuario actualizado",
      message: `${updatedUser.name || updatedUser.email || "Usuario"} fue actualizado por admin.`,
      metadata: {
        email: updatedUser.email,
        role: updatedUser.role,
      },
      actorId: session.user.id,
      actorName: session.user.name || undefined,
      actorEmail: session.user.email || undefined,
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("Error al actualizar usuario:", error)
    return NextResponse.json({ message: "Error al actualizar usuario" }, { status: 500 })
  }
}
// Eliminar usuario (Solo Admin)
export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  let id = ""
  try {
    const { searchParams } = new URL(req.url)
    id = searchParams.get("id") || ""

    if (!id) {
      return NextResponse.json({ message: "ID de usuario requerido" }, { status: 400 })
    }

    const userToDelete = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true },
    })

    await prisma.user.delete({
      where: { id }
    })

    await writeAdminAudit({
      action: "delete",
      entity: userToDelete?.role === "veterinario" ? "veterinario" : "usuario",
      entityId: id,
      title:
        userToDelete?.role === "veterinario"
          ? "Veterinario eliminado"
          : "Usuario eliminado",
      message: `${userToDelete?.name || userToDelete?.email || id} fue eliminado del sistema.`,
      metadata: {
        email: userToDelete?.email ?? null,
        role: userToDelete?.role ?? null,
      },
      actorId: session.user.id,
      actorName: session.user.name || undefined,
      actorEmail: session.user.email || undefined,
    })

    return NextResponse.json({ message: "Usuario eliminado correctamente" })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      await writeAdminAudit({
        action: "delete",
        entity: "usuario",
        entityId: id,
        title: "Intento de eliminación sobre usuario inexistente",
        message: `Se intentó eliminar el usuario ${id}, pero ya no existía.`,
        actorId: session.user.id,
        actorName: session.user.name || undefined,
        actorEmail: session.user.email || undefined,
      })
      // Idempotente: si ya no existe, devolvemos éxito para evitar fallos visuales.
      return NextResponse.json(
        { message: "El usuario ya estaba eliminado" },
        { status: 200 },
      )
    }
    console.error("Error al eliminar usuario:", error)
    return NextResponse.json({ message: "Error al eliminar usuario" }, { status: 500 })
  }
}
