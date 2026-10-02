import { auth } from "@/auth"
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { formatDate } from "@/lib/utils"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || (session.user.role !== "veterinario" && session.user.role !== "admin")) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  try {
    const { id } = await params
    const data = await req.json()
    
    // 1. Obtener la cita actual para saber a quién notificar
    const currentAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        pet: {
          include: {
            user: true
          }
        }
      }
    })

    if (!currentAppointment) {
      return NextResponse.json({ message: "Cita no encontrada" }, { status: 404 })
    }

    // Un veterinario solo puede editar citas que le pertenecen.
    if (session.user.role === "veterinario" && currentAppointment.vetId !== session.user.id) {
      return NextResponse.json({ message: "No autorizado para modificar esta cita" }, { status: 403 })
    }

    // 2. Actualizar la cita
    const updateData: {
      estado: string;
      fecha?: string;
      hora?: string;
    } = {
      estado: data.estado
    }
    if (data.fecha) updateData.fecha = data.fecha
    if (data.hora) updateData.hora = data.hora

    const updated = await prisma.appointment.update({
      where: { id },
      data: updateData
    })

    // 3. Crear notificación para el dueño si es confirmada, reagendada o rechazada
    let ownerId = currentAppointment.pet?.userId
    let ownerEmail = currentAppointment.pet?.user?.email
    let ownerName =
      currentAppointment.pet?.user?.name?.trim() ||
      currentAppointment.dueno?.trim() ||
      "Cliente"

    // Fallback para citas antiguas sin relación pet->user.
    if (!ownerId && currentAppointment.dueno) {
      const ownerUserFallback = await prisma.user.findFirst({
        where: {
          OR: [
            { email: currentAppointment.dueno },
            { name: currentAppointment.dueno },
          ],
        },
        select: { id: true, email: true, name: true },
      })
      if (ownerUserFallback) {
        ownerId = ownerUserFallback.id
        ownerEmail = ownerUserFallback.email || ownerEmail
        ownerName = ownerUserFallback.name?.trim() || ownerName
      }
    }

    const hasDateChanged = !!data.fecha && String(data.fecha) !== String(currentAppointment.fecha)
    const hasTimeChanged = !!data.hora && String(data.hora) !== String(currentAppointment.hora)
    const isRescheduled = hasDateChanged || hasTimeChanged
    const shouldNotifyOwner =
      data.estado === "confirmada" || data.estado === "rechazada" || isRescheduled

    if (ownerId && shouldNotifyOwner) {
      const { createNotification } = await import("@/lib/notification")
      const appBase = process.env.NEXTAUTH_URL || "http://localhost:3000"
      const petName =
        currentAppointment.pet?.nombre || currentAppointment.mascota || "Mascota"
      const vetUserForName = currentAppointment.vetId
        ? await prisma.user.findUnique({
            where: { id: currentAppointment.vetId },
            select: { name: true, clinicName: true, address: true, phone: true }
          })
        : null
      const vetAssignName =
        (vetUserForName?.name && String(vetUserForName.name).trim()) ||
        (currentAppointment.veterinario &&
          String(currentAppointment.veterinario).trim()) ||
        session.user.name ||
        "Especialista"
      const fnRaw =
        (data.fecha && String(data.fecha)) ||
        (updated.fecha && String(updated.fecha)) ||
        (currentAppointment.fecha && String(currentAppointment.fecha)) ||
        "Por confirmar"
      const fnDisplay = formatDate(fnRaw)
      const hoDisplay =
        (data.hora && String(data.hora)) ||
        (updated.hora && String(updated.hora)) ||
        (currentAppointment.hora && String(currentAppointment.hora)) ||
        "Por confirmar"
      const reason =
        (currentAppointment.motivo && String(currentAppointment.motivo).trim()) ||
        (currentAppointment.tipo && String(currentAppointment.tipo).trim()) ||
        "Consulta programada"

      let title = "Actualización de Cita"
      let message = `Tu cita para ${petName} ha sido actualizada.`
      let type: string = "info"
      let emailSubject = `Actualización de Cita: ${petName} `
      let useAppointmentTemplate = false
      let emailTitle: string | undefined
      const metaBase = {
        petName,
        fecha: fnDisplay,
        hora: hoDisplay,
        veterinario: String(vetAssignName).trim(),
        motivo: reason,
        duenoName: ownerName,
        vetClinicName: vetUserForName?.clinicName || null,
        vetAddress: vetUserForName?.address || null,
        vetPhone: vetUserForName?.phone || null
      }

      if (data.estado === "rechazada") {
        title = "Cita Rechazada "
        message = `Hola ${ownerName}, tu cita para ${petName} del ${fnDisplay} a las ${hoDisplay} fue rechazada. Te invitamos a reservar otra fecha.`
        type = "warning"
        emailSubject = `Cita no disponible: ${petName} `
      } else if (isRescheduled) {
        title = "Cita Reagendada "
        message = `Hola ${ownerName}, tu cita para ${petName} quedó para el ${fnDisplay} a las ${hoDisplay} con ${String(vetAssignName).trim()}.`
        type = "appointment_confirmation"
        useAppointmentTemplate = true
        emailTitle = "Cita reagendada"
        emailSubject = ` Nueva fecha: ${petName} — ${fnDisplay} a las ${hoDisplay}`
      } else if (data.estado === "confirmada") {
        const vetName = String(vetAssignName).trim()
        title = "Cita Confirmada "
        message = `Hola ${ownerName}, ${vetName} ha confirmado la cita para ${petName} el ${fnDisplay} a las ${hoDisplay}. Motivo: ${reason}.`
        type = "appointment_confirmation"
        useAppointmentTemplate = true
        emailTitle = "Cita confirmada"
        emailSubject = ` Cita confirmada: ${petName} — ${fnDisplay} a las ${hoDisplay}`
      }

      await createNotification({
        userId: ownerId,
        title,
        message,
        type: useAppointmentTemplate ? "appointment_confirmation" : type,
        userEmail: ownerEmail || undefined,
        sendEmailFlag: !!ownerEmail,
        emailSubject,
        actionUrl: `${appBase}/mi-mascota?tab=citas`,
        metadata: useAppointmentTemplate
          ? {
              ...metaBase,
              emailAudience: "owner" as const,
              emailTitle
            }
          : { ...metaBase, duenoName: ownerName }
      })
    }
    
    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error al actualizar cita:", error)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}
