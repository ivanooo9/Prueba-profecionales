import { auth } from "@/auth"
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { writeAdminAudit } from "@/lib/admin-audit"

// Obtener todas las solicitudes de adopción (Solo Admin)
export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  try {
    const solicitudes = await prisma.adoptionRequest.findMany({
      include: {
        user: { select: { name: true, email: true } },
        shelterPet: true
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(solicitudes)
  } catch (error) {
    console.error("Error al obtener solicitudes globales:", error)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}

// Actualizar estado de solicitud (Solo Admin)
export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  try {
    const data = await req.json()
    const { id, estado, observacion } = data

    if (!id || !estado) {
      return NextResponse.json({ message: "ID y estado requeridos" }, { status: 400 })
    }

    const solicitudAnterior = await prisma.adoptionRequest.findUnique({
      where: { id },
      include: { shelterPet: true }
    })

    if (!solicitudAnterior) {
      return NextResponse.json({ message: "Solicitud no encontrada" }, { status: 404 })
    }

    const solicitud = await prisma.adoptionRequest.update({
      where: { id },
      data: { estado, observacion }
    })

    // Update shelter pet status if approved/rejected
    if (estado === "aprobada") {
      await prisma.shelterPet.update({
        where: { id: solicitudAnterior.perroId },
        data: { estado: "adoptado" }
      })
      // Actualizar título del blog
      const oldTitle = `En Adopción: ¡Conoce a ${solicitudAnterior.perroNombre}! `
      await prisma.blogPost.updateMany({
        where: { title: oldTitle },
        data: { title: `¡ADOPTADO: ${solicitudAnterior.perroNombre} ya tiene un hogar! ` }
      })
    } else if (estado === "rechazada" && solicitudAnterior.estado === "aprobada") {
      // Si la estaban regresando de aprobada a rechazada, devolver el perro a disponible
      await prisma.shelterPet.update({
        where: { id: solicitudAnterior.perroId },
        data: { estado: "disponible" }
      })
      // Restaurar título del blog
      const adoptadoTitle = `¡ADOPTADO: ${solicitudAnterior.perroNombre} ya tiene un hogar! `
      await prisma.blogPost.updateMany({
        where: { title: adoptadoTitle },
        data: { title: `En Adopción: ¡Conoce a ${solicitudAnterior.perroNombre}! ` }
      })
    }

    // Send notification email & in-app
    let subject = ""
    let message = ""
    let nType = "info"

    if (estado === "entrevista") {
      subject = `Entrevista Programada: Adopción de ${solicitud.perroNombre}`
      message = `Hola ${solicitud.nombreCompleto}, nos alegra informarte que tu solicitud de adopción para ${solicitud.perroNombre} ha avanzado a la fase de entrevista. ${observacion ? `\n\nMensaje adicional: ${observacion}` : ""}`
      nType = "warning"
    } else if (estado === "aprobada") {
      subject = `¡Aprobado! Adopción de ${solicitud.perroNombre}`
      message = `¡Felicidades! Se ha aprobado tu solicitud de adopción para ${solicitud.perroNombre}. ${observacion ? `\n\nMensaje adicional: ${observacion}` : ""}`
      nType = "success"
    } else if (estado === "rechazada") {
      subject = `Actualización de Solicitud: ${solicitud.perroNombre}`
      message = `Gracias por tu interés en adoptar a ${solicitud.perroNombre}. Tras revisar tu solicitud, lamentamos informarte que en esta ocasión no podemos proceder. ${observacion ? `\n\nMensaje adicional: ${observacion}` : ""}`
      nType = "info"
    } else if (estado === "entregada") {
      subject = `¡Entrega Exitosa! Certificado de Adopción de ${solicitud.perroNombre}`
      message = `Estimado/a ${solicitud.nombreCompleto},\n\nNos emociona inmensamente notificarte de manera oficial que ha concluido con éxito el proceso de adopción y que ${solicitud.perroNombre} ahora está bajo tu cuidado.\n\nAl formalizar esta entrega, hemos agregado automáticamente el perfil clínico de ${solicitud.perroNombre} a tu cuenta personal de MIAUWUAUF. Desde allí podrás gestionar sus futuras citas, vacunas y llevar el control de todo su historial médico.\n\n${observacion ? `Por favor, atiende con especial cariño esta última recomendación por parte de la fundación:\n\n ${observacion}\n\n` : ""}De parte de todo nuestro equipo, queremos agradecerte profundamente por creer en las segundas oportunidades y transformar una vida. Te deseamos muchísimos años de felicidad incondicional.\n\nCon enorme gratitud,\nEl equipo de Familia MIAUWUAUF. `
      nType = "success"

      if (solicitudAnterior.estado !== "entregada" && solicitudAnterior.shelterPet) {
        await prisma.pet.create({
          data: {
            nombre: solicitudAnterior.shelterPet.nombre,
            raza: solicitudAnterior.shelterPet.raza,
            edad: solicitudAnterior.shelterPet.edad,
            peso: solicitudAnterior.shelterPet.peso,
            color: solicitudAnterior.shelterPet.color,
            sexo: solicitudAnterior.shelterPet.sexo,
            esterilizado: solicitudAnterior.shelterPet.esterilizado ? "si" : "no",
            foto: solicitudAnterior.shelterPet.foto,
            userId: solicitud.userId,
          }
        })
      }
    }

    if (subject && message) {
      const { createNotification } = await import("@/lib/notification")
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      await createNotification({
        userId: solicitud.userId,
        title: subject,
        message,
        type: nType,
        userEmail: solicitud.email,
        sendEmailFlag: true,
        actionUrl: estado === "entregada" ? `${appUrl}/mi-mascota` : undefined,
        actionText: estado === "entregada" ? "Conoce a tu Mascota " : undefined
      })
    }

    await writeAdminAudit({
      action: estado === "entregada" ? "adoption_delivered" : "status_change",
      entity: "adopcion",
      entityId: solicitud.id,
      title:
        estado === "entregada"
          ? "Adopción entregada"
          : "Estado de adopción actualizado",
      message:
        estado === "entregada"
          ? `${solicitud.perroNombre} fue entregado a ${solicitud.nombreCompleto}.`
          : `La solicitud de ${solicitud.perroNombre} cambió a estado ${estado}.`,
      metadata: {
        previousStatus: solicitudAnterior.estado,
        newStatus: estado,
        petName: solicitud.perroNombre,
        adopterName: solicitud.nombreCompleto,
        adopterEmail: solicitud.email,
      },
      actorId: session.user.id,
      actorName: session.user.name || undefined,
      actorEmail: session.user.email || undefined,
    })

    return NextResponse.json(solicitud)
  } catch (error) {
    console.error("Error al actualizar solicitud:", error)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}
