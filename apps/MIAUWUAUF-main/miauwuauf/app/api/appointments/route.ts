import { auth } from "@/auth"
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { formatDate } from "@/lib/utils"

export async function GET() {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  try {
    const citas = await prisma.appointment.findMany({
      where: session.user.role === "admin" 
        ? {} 
        : session.user.role === "veterinario" 
          ? { vetId: session.user.id }
          : { 
              OR: [
                { dueno: session.user.name || "" },
                { pet: { userId: session.user.id } }
              ]
            },
      orderBy: { createdAt: "desc" }
    })
    return NextResponse.json(citas)
  } catch (error) {
    console.error("Error al obtener citas:", error)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  
  // Todos los usuarios logueados pueden crear una cita
  if (!session?.user) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  try {
    const data = await req.json()
    
    // Si el que crea la cita es un veterinario, se auto-asigna. Si es un usuario, debe proveer vetId
    const finalVetId = session.user.role === "veterinario" ? session.user.id : data.vetId;

    if (!finalVetId) {
      return NextResponse.json({ message: "Se requiere asignar un veterinario (vetId)" }, { status: 400 })
    }

    const cita = await prisma.appointment.create({
      data: {
        ...data,
        vetId: finalVetId,
        veterinario: session.user.role === "veterinario" ? (session.user.name || "Veterinario") : data.veterinario
      }
    })

    // Sincronizar "vet de confianza" con la cita reciente (acceso historial sin burocracia en futuras visitas)
    if (cita.petId) {
      try {
        await prisma.pet.update({
          where: { id: cita.petId },
          data: { assignedVetId: finalVetId }
        })
      } catch (e) {
        console.error("No se pudo actualizar assignedVetId de la mascota:", e)
      }
    }

    // Notification for the pet owner
    if (cita.petId) {
      try {
        const petWithOwner = await prisma.pet.findUnique({
          where: { id: cita.petId },
          include: { user: true }
        })

        if (petWithOwner?.user) {
          const { createNotification } = await import("@/lib/notification")
          const appBase = process.env.NEXTAUTH_URL || "http://localhost:3000"
          const vetUser = cita.vetId
            ? await prisma.user.findUnique({
                where: { id: cita.vetId },
                select: { name: true, email: true, clinicName: true, address: true, phone: true }
              })
            : null
          const vetName =
            (vetUser?.name && vetUser.name.trim()) ||
            (cita.veterinario && String(cita.veterinario).trim()) ||
            "Veterinario MIAUWUAUF"
          const fnRaw = (cita.fecha && String(cita.fecha).trim()) || "Por confirmar con la clínica"
          const fn = formatDate(fnRaw)
          const ho = (cita.hora && String(cita.hora).trim()) || "Por confirmar con la clínica"
          const reason =
            (cita.motivo && String(cita.motivo).trim()) ||
            (cita.tipo && String(cita.tipo).trim()) ||
            "Consulta médica"
          const duenoName =
            petWithOwner.user.name?.trim() ||
            petWithOwner.user.email?.split("@")[0]?.trim() ||
            cita.dueno?.trim() ||
            "Cliente"
          // 1. Notificar al Dueño
          await createNotification({
            userId: petWithOwner.userId as string,
            title: "Confirmación de Cita",
            message: `Hola ${duenoName}, tu cita para ${petWithOwner.nombre} quedó agendada para el ${fn} a las ${ho} con ${vetName}. Motivo: ${reason}.`,
            type: "appointment_confirmation",
            userEmail: petWithOwner.user.email!,
            sendEmailFlag: true,
            emailSubject: `Cita: ${petWithOwner.nombre} — ${fn} a las ${ho}`,
            actionUrl: `${appBase}/mi-mascota?tab=citas`,
            metadata: {
              petName: petWithOwner.nombre,
              fecha: fn,
              hora: ho,
              veterinario: vetName,
              motivo: reason,
              duenoName,
              emailAudience: "owner",
              emailTitle: "¡Cita programada!",
              vetClinicName: vetUser?.clinicName || null,
              vetAddress: vetUser?.address || null,
              vetPhone: vetUser?.phone || null
            }
          })

          // 2. Notificar al Veterinario (mismo vet resuelto arriba)
          if (cita.vetId && vetUser?.email) {
            await createNotification({
              userId: cita.vetId,
              title: "Nueva cita asignada",
              message: `Hola ${vetName}, tienes a ${petWithOwner.nombre} (${petWithOwner.raza || "Mascota"}) el ${fn} a las ${ho} con el/la dueño/a ${duenoName}. Motivo: ${reason}.`,
              type: "appointment_confirmation",
              userEmail: vetUser.email,
              sendEmailFlag: true,
              emailSubject: `Cita: ${petWithOwner.nombre} con ${duenoName} — ${fn} ${ho}`,
              actionUrl: `${appBase}/dashboard?tab=citas`,
              metadata: {
                petName: petWithOwner.nombre,
                fecha: fn,
                hora: ho,
                veterinario: vetName,
                motivo: reason,
                duenoName,
                emailAudience: "vet",
                emailTitle: "Nueva cita asignada"
              }
            })
          }
        }
      } catch (notifyError) {
        console.error("Error sending user/vet notification:", notifyError)
      }
    }

    return NextResponse.json(cita)
  } catch (error) {
    console.error("Error al crear cita:", error)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}
