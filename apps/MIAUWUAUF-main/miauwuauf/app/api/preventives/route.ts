import { auth } from "@/auth"
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { PreventiveCreateSchema, formatZodError } from "@/lib/validations"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { buildPreventiveOwnerNotificationMessage } from "@/lib/medical-notification-copy"

// Definir el tipo para el payload de preventivo con el veterinario incluido
type PreventiveWithVet = Prisma.PreventiveGetPayload<{
  include: { vet: { select: { name: true } } }
}>

export async function GET() {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  const { id, role } = session.user

  try {
    const userPets = await prisma.pet.findMany({
      where: role === "admin" ? {} : { userId: id },
      select: { id: true, nombre: true }
    })
    const userPetIds = userPets.map(p => p.id)

    const whereClause: Prisma.PreventiveWhereInput = {}
    if (role === "admin") {
      // Sin filtro
    } else if (role === "veterinario") {
      whereClause.vetId = id
    } else {
      whereClause.petId = { in: userPetIds }
    }

    const preventativos = await prisma.preventive.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        vet: {
          select: { name: true }
        }
      }
    })
    return NextResponse.json(preventativos)
  } catch (error) {
    console.error("Error al obtener preventivos:", error)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  const { id, role, name } = session.user

  if (role !== "veterinario" && role !== "admin") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  try {
    const data = await req.json()
    const validatedData = PreventiveCreateSchema.parse(data)
    
    const fechaActual = new Date().toISOString().split('T')[0]

    const preventativo = await prisma.preventive.create({
      data: {
        mascota: validatedData.mascota ?? "",
        tipo: validatedData.tipo ?? "",
        fecha: fechaActual,
        proximaFecha: validatedData.proximaFecha ?? "",
        dosis: validatedData.dosis ?? 1,
        petId: validatedData.petId || null,
        vetId: id,
        veterinario: name || "Veterinario",
        notas: validatedData.notas || null,
      },
      include: {
        vet: {
          select: { name: true, clinicName: true, address: true, phone: true }
        }
      }
    }) as PreventiveWithVet

    // --- Lógica de Cierre de Cita ---
    const appointmentId = data.appointmentId
    if (appointmentId) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { estado: "completada" }
      }).catch(err => console.error("Error updating appointment (ID):", err))
    } else if (preventativo.petId) {
      const lastCita = await prisma.appointment.findFirst({
        where: {
          petId: preventativo.petId,
          vetId: id,
          estado: "confirmada"
        },
        orderBy: { createdAt: "desc" }
      })
      if (lastCita) {
        await prisma.appointment.update({
          where: { id: lastCita.id },
          data: { estado: "completada" }
        }).catch(err => console.error("Error updating appointment (Auto):", err))
      }
    }

    if (preventativo.petId) {
      try {
        const petWithOwner = await prisma.pet.findUnique({
          where: { id: preventativo.petId },
          include: { user: true }
        })
        if (!petWithOwner) {
          throw new Error("Pet not found for post-preventive logic")
        }

        const vetName = preventativo.vet?.name || name || "Veterinario"
          const vetClinicName = preventativo.vet && 'clinicName' in preventativo.vet ? (preventativo.vet as {clinicName?: string | null}).clinicName : null;
          const vetAddress = preventativo.vet && 'address' in preventativo.vet ? (preventativo.vet as {address?: string | null}).address : null;
          const vetPhone = preventativo.vet && 'phone' in preventativo.vet ? (preventativo.vet as {phone?: string | null}).phone : null;
          const duenoNombre = petWithOwner.user?.name?.trim() || "Dueño"

        // Cita de refuerzo solo si hay próxima fecha
        if (preventativo.proximaFecha) {
          await prisma.appointment.create({
            data: {
              petId: preventativo.petId,
              mascota: petWithOwner.nombre,
              dueno: duenoNombre,
              fecha: preventativo.proximaFecha,
              hora: "09:00",
              tipo: "Control de Dosis",
              motivo: `Refuerzo Preventivo: ${preventativo.tipo}`,
              estado: "pendiente",
              vetId: id,
              veterinario: vetName
            }
          })
        }

        // Notificación siempre que haya petId
        if (petWithOwner.user?.email && petWithOwner.userId) {
          const { createNotification } = await import("@/lib/notification")
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || ""

          const message = buildPreventiveOwnerNotificationMessage({
            vetName,
            petName: petWithOwner.nombre,
            tipo: preventativo.tipo ?? "",
            proximaFecha: preventativo.proximaFecha ?? "",
            dosis: preventativo.dosis ?? 1,
            notas: preventativo.notas ?? undefined,
            clinicName: vetClinicName,
            address: vetAddress,
            phone: vetPhone,
          })

          await createNotification({
            userId: petWithOwner.userId as string,
            title: "Nuevo Preventivo Registrado",
            message,
            type: "medical_preventive",
            userEmail: petWithOwner.user.email,
            sendEmailFlag: true,
            emailSubject: `Acción Preventiva: ${petWithOwner.nombre}`,
            actionUrl: `${appUrl}/mi-mascota?tab=historial`,
            metadata: {
              petName: petWithOwner.nombre,
              vetClinicName,
              vetAddress,
              vetPhone,
              veterinario: vetName,
              tipoPreventivo: preventativo.tipo ?? undefined,
              numeroDosis: preventativo.dosis?.toString() ?? undefined,
              proximaFecha: preventativo.proximaFecha ?? undefined,
              notas: preventativo.notas ?? undefined,
            },
          })
        }
      } catch (notifyError) {
        console.error("Error in post-preventive logic:", notifyError)
      }
    }

    return NextResponse.json(preventativo)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Datos inválidos", error: formatZodError(error) }, { status: 400 })
    }
    console.error("Error al crear preventivo:", error)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}
