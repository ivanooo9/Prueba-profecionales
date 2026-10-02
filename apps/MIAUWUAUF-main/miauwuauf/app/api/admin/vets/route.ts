import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { normalizeEcuadorPhone } from "@/lib/phone"
import { writeAdminAudit } from "@/lib/admin-audit"
import { createNotification } from "@/lib/notification"
import bcrypt from "bcryptjs"

export async function GET() {
  const session = await auth()

  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  try {
    const vets = await prisma.user.findMany({
      where: { role: "veterinario" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cedula: true,
        city: true,
        address: true,
        clinicName: true,
        specialty: true,
        createdAt: true,
        image: true,
        isActive: true
      },
      orderBy: { createdAt: "desc" }
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

export async function PUT(request: Request) {
  const session = await auth()

  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  try {
    const { id, nombre, email, especialidad, telefono, cedula, city, address, clinicName, image, isActive, password } = await request.json()
    const normalizedPhone = normalizeEcuadorPhone(telefono)

    if (!id) {
      return NextResponse.json({ message: "ID requerido" }, { status: 400 })
    }

    const existingVet = await prisma.user.findUnique({ where: { id }, select: { isActive: true } })

    const updateData: any = {
      name: nombre,
      email: email,
      specialty: especialidad,
      phone: normalizedPhone,
      cedula: cedula,
      city: city,
      address: address,
      clinicName: clinicName,
      image: image,
      isActive: isActive !== undefined ? isActive : undefined
    }

    if (password && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, 10)
    }

    const updatedVet = await prisma.user.update({
      where: { id },
      data: updateData
    })

    if (existingVet && isActive !== undefined && existingVet.isActive !== isActive) {
      const isActivating = isActive;
      const title = isActivating ? "¡Cuenta Profesional Activada!" : "Cuenta Desactivada";
      const message = isActivating 
        ? `Hola ${updatedVet.name || "Veterinario"}, tu cuenta profesional en MIAUWUAUF ha sido activada exitosamente. Ya puedes acceder a tu dashboard para gestionar pacientes, citas y tu agenda.`
        : `Hola ${updatedVet.name || "Veterinario"}, tu cuenta profesional en MIAUWUAUF ha sido desactivada por un administrador. No podrás acceder al sistema por el momento.`;
      
      const actionUrl = isActivating 
        ? "/login?tab=veterinario" 
        : `https://wa.me/593984656026?text=${encodeURIComponent(`Hola, mi cuenta de veterinario a nombre de ${updatedVet.name || "sin nombre"} fue desactivada y me gustaría saber el motivo.`)}`;
      const actionText = isActivating ? "Acceder al Dashboard" : "Contactar Soporte";

      await createNotification({
        userId: updatedVet.id,
        userEmail: updatedVet.email || undefined,
        title,
        message,
        type: "info",
        sendEmailFlag: true,
        actionUrl,
        actionText
      });
    }

    if (password && password.trim() !== "") {
      await createNotification({
        userId: updatedVet.id,
        userEmail: updatedVet.email || undefined,
        title: "🔑 Contraseña Actualizada",
        message: `Hola ${updatedVet.name || "Veterinario"}, tu contraseña ha sido actualizada por el administrador. \n\nTu nueva contraseña es: **${password}**\n\nTe recomendamos guardar esta información en un lugar seguro.`,
        type: "info",
        sendEmailFlag: true,
        actionUrl: "/login?tab=veterinario",
        actionText: "Iniciar Sesión"
      });
    }

    await writeAdminAudit({
      action: "update",
      entity: "veterinario",
      entityId: updatedVet.id,
      title: "Veterinario actualizado",
      message: `${updatedVet.name || updatedVet.email || "Veterinario"} fue actualizado.`,
      metadata: {
        email: updatedVet.email,
      },
      actorId: session.user.id,
      actorName: session.user.name || undefined,
      actorEmail: session.user.email || undefined,
    })

    return NextResponse.json(updatedVet)
  } catch (error) {
    console.error("Error al actualizar veterinario:", error)
    return NextResponse.json(
      { message: "Error al actualizar veterinario" },
      { status: 500 }
    )
  }
}
