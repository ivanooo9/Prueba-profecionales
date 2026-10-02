import { auth } from "@/auth"
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"



interface RegisterBody {
  eventId?: string
  mascotaId?: string
  petName?: string
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  const { id: userId, email: userEmail } = session.user

  try {
    let body: RegisterBody = {}
    try {
      body = await req.json()
    } catch {
      // Ignore if body is not JSON or empty
    }

    const { searchParams } = new URL(req.url)
    const eventId = body.eventId || searchParams.get("eventId")
    const mascotaId = body.mascotaId || searchParams.get("mascotaId")
    const petName = body.petName || searchParams.get("petName")

    if (!eventId) {
      return NextResponse.json({ message: "Evento requerido" }, { status: 400 })
    }

    // Unchecked because we already have the IDs
    const registro = await prisma.eventRegistration.create({
      data: {
        eventId: eventId,
        userId,
        mascotaId: mascotaId ?? null,
        petName: petName ?? null,
      },
      include: {
        event: {
          select: { titulo: true, fecha: true, hora: true }
        },
        user: {
          select: { name: true, email: true }
        }
      }
    })

    // Notification for registration
    try {
      const { createNotification } = await import("@/lib/notification")
      const eventInfo = registro.event;

      await createNotification({
        userId,
        title: "Registro a Evento",
        message: `¡Te has registrado exitosamente al evento "${eventInfo?.titulo}"! Te esperamos el ${eventInfo?.fecha} a las ${eventInfo?.hora}.`,
        type: "event_registration",
        userEmail: userEmail ?? "",
        sendEmailFlag: true,
        emailSubject: `Registro confirmado: ${eventInfo?.titulo}`,
      })
    } catch (notifyError) {
      console.error("Error sending event registration notification:", notifyError)
    }

    // [OJO DE DIOS] Notificar a los Admins sobre la nueva inscripción
    try {
      const { notifyAdmins } = await import("@/lib/notification")
      await notifyAdmins({
        title: "Nueva Inscripción a Evento",
        message: `${registro.user?.name || "Un usuario"} se ha inscrito al evento: ${registro.event?.titulo || "Evento"}`,
        type: "event_registration",
        metadata: {
          resourceId: registro.eventId,
          userName: registro.user?.name || undefined
        }
      })
    } catch (adminError) {
      console.error("Error notifying admins about new event registration:", adminError)
    }

    return NextResponse.json(registro)
  } catch (error) {
    console.error("Error al registrar evento:", error)
    return NextResponse.json({ message: "Error al realizar el registro" }, { status: 500 })
  }
}
