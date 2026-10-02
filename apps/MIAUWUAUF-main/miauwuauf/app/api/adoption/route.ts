import { auth } from "@/auth"
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { normalizeEcuadorPhone } from "@/lib/phone"
import { writeAdminAudit } from "@/lib/admin-audit"

// Definir el tipo para la respuesta de Prisma con las relaciones incluidas
type AdoptionRequestWithRelations = Prisma.AdoptionRequestGetPayload<{
  include: {
    user: { select: { name: true, email: true } },
    shelterPet: { select: { nombre: true } },
  }
}>

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  const { id } = session.user

  try {
    const solicitudes = await prisma.adoptionRequest.findMany({
      where: { userId: id },
      include: {
        user: { select: { name: true, email: true } },
        shelterPet: true,
      },
    })
    return NextResponse.json(solicitudes)
  } catch (error) {
    console.error("Error al obtener solicitudes:", error)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  const { id: userId, email: userEmail, name: userName } = session.user

  try {
    const data = await req.json() as Record<string, unknown>
    const perroId = data.perroId as string;

    const shelterPet = await prisma.shelterPet.findUnique({
      where: { id: perroId },
    })

    if (!shelterPet) {
      return NextResponse.json({ message: "Mascota no encontrada" }, { status: 404 })
    }

    const fechaActual = new Date().toISOString().split("T")[0]

    // 1. Verificar si ya existe una solicitud de este usuario para este perro
    const solicitudExistente = await prisma.adoptionRequest.findFirst({
      where: {
        userId,
        perroId,
      },
    })

    if (solicitudExistente) {
      return NextResponse.json(
        { message: "Ya has enviado una solicitud para esta mascota" },
        { status: 400 }
      )
    }

    // Sanitizar los datos para que solo pasen los campos que existen en la base de datos
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { aceptaResponsabilidad, aceptaSeguimiento, perroId: _, ...cleanData } = data
    const normalizedTelefono = normalizeEcuadorPhone(
      typeof cleanData.telefono === "string" ? cleanData.telefono : undefined,
    )

    // Usamos un casting específico a la entrada de Prisma para evitar 'any'
    const solicitud = await prisma.adoptionRequest.create({
      data: {
        ...(cleanData as Omit<Prisma.AdoptionRequestUncheckedCreateInput, 'user' | 'shelterPet' | 'perroId' | 'userId' | 'fecha' | 'perroNombre'>),
        telefono: normalizedTelefono || "",
        perroId, // Reclama perroId explícitamente para cumplir con el esquema
        perroNombre: shelterPet.nombre,
        fecha: fechaActual,
        userId,
      },
      include: {
        user: { select: { name: true, email: true } },
        shelterPet: { select: { nombre: true } },
      },
    }) as AdoptionRequestWithRelations

    // Notification for the user
    try {
      const { createNotification } = await import("@/lib/notification")
      
      const clientName = solicitud.user?.name ?? userName ?? "Cliente";
      const petName = solicitud.shelterPet?.nombre ?? shelterPet.nombre;
      const clientEmail = solicitud.user?.email ?? userEmail ?? "";

      await createNotification({
        userId,
        title: "Solicitud de Adopción Recibida",
        message: `Hola ${clientName}, hemos recibido tu solicitud para adoptar a ${petName}. Nuestro equipo la revisará pronto.`,
        type: "adoption_request",
        userEmail: clientEmail,
        sendEmailFlag: true,
        emailSubject: "Hemos recibido tu solicitud de adopción - MIAUWUAUF",
      })
    } catch (notifyError) {
      console.error("Error sending adoption submission notification:", notifyError)
    }

    // [OJO DE DIOS] Notificar a los Admins sobre la nueva solicitud de adopción
    try {
      const { notifyAdmins } = await import("@/lib/notification")
      await notifyAdmins({
        title: "Nueva Solicitud de Adopción",
        message: `${solicitud.user?.name ?? userName ?? "Un usuario"} desea adoptar a ${solicitud.shelterPet?.nombre ?? "una mascota"}.`,
        type: "adoption",
        metadata: { resourceId: solicitud.id }
      })
    } catch (adminError) {
      console.error("Error notifying admins about new adoption request:", adminError)
    }

    await writeAdminAudit({
      action: "create",
      entity: "adopcion",
      entityId: solicitud.id,
      title: "Nueva solicitud de adopción",
      message: `${solicitud.user?.name ?? userName ?? "Usuario"} solicitó adoptar a ${solicitud.shelterPet?.nombre ?? shelterPet.nombre}.`,
      metadata: {
        solicitudId: solicitud.id,
        petName: solicitud.shelterPet?.nombre ?? shelterPet.nombre,
        adopterName: solicitud.user?.name ?? userName ?? "",
        adopterEmail: solicitud.user?.email ?? userEmail ?? "",
      },
    })

    return NextResponse.json(solicitud, { status: 201 })
  } catch (error) {
    console.error("Error al crear solicitud:", error)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}
