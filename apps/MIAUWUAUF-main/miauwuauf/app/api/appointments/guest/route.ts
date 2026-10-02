import { auth } from "@/auth"
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { formatDate } from "@/lib/utils"

export async function POST(req: Request) {
  const session = await auth()

  // Solo veterinarios autenticados pueden crear citas para invitados
  if (!session?.user || session.user.role !== "veterinario") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  try {
    const data = await req.json()
    const { nombre, correo, telefono, tipo, motivo, fecha, hora } = data

    if (!nombre || !correo || !fecha || !hora || !tipo) {
      return NextResponse.json(
        { message: "Nombre, correo, tipo, fecha y hora son requeridos" },
        { status: 400 }
      )
    }

    // Crear la cita como invitado (sin petId, sin userId)
    const cita = await prisma.appointment.create({
      data: {
        mascota: `Invitado: ${nombre}`,
        dueno: nombre,
        fecha,
        hora,
        tipo,
        motivo: motivo || tipo,
        estado: "confirmada",
        vetId: session.user.id,
        veterinario: session.user.name || "Veterinario",
      },
    })

    // Enviar correo de confirmación al invitado
    try {
      const { createNotification } = await import("@/lib/notification")
      const appBase = process.env.NEXTAUTH_URL || "http://localhost:3000"
      const vetName = session.user.name || "Veterinario MIAUWUAUF"
      const fn = formatDate(fecha)
      const reason = (motivo || tipo || "Consulta médica").trim()

      await createNotification({
        userId: null, // No tiene cuenta en la plataforma
        title: "Confirmación de Cita — MIAUWUAUF",
        message: `Hola ${nombre}, tu cita quedó agendada para el ${fn} a las ${hora} con ${vetName}. Motivo: ${reason}.`,
        type: "appointment_confirmation",
        userEmail: correo,
        sendEmailFlag: true,
        emailSubject: `Cita confirmada — ${fn} a las ${hora}`,
        actionUrl: `${appBase}/`,
        metadata: {
          petName: "Tu mascota",
          fecha: fn,
          hora,
          veterinario: vetName,
          motivo: reason,
          duenoName: nombre,
          emailAudience: "owner",
          emailTitle: "¡Cita confirmada!",
        },
      })

      // Notificar también al veterinario (en su dashboard)
      await createNotification({
        userId: session.user.id,
        title: "Nueva cita de invitado",
        message: `Has agendado una cita para ${nombre} (${correo}) el ${fn} a las ${hora}. Motivo: ${reason}.`,
        type: "appointment_confirmation",
        userEmail: session.user.email || undefined,
        sendEmailFlag: false,
        actionUrl: `${appBase}/dashboard?tab=citas`,
        metadata: {
          petName: nombre,
          fecha: fn,
          hora,
          veterinario: vetName,
          motivo: reason,
          duenoName: nombre,
          emailAudience: "vet",
          emailTitle: "Nueva cita de invitado",
        },
      })
    } catch (notifyError) {
      console.error("Error sending guest appointment notification:", notifyError)
    }

    return NextResponse.json(cita)
  } catch (error) {
    console.error("Error al crear cita de invitado:", error)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}
