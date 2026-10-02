import { auth } from "@/auth"
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { VaccinationCreateSchema, formatZodError } from "@/lib/validations"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { buildVaccinationOwnerNotificationMessage } from "@/lib/medical-notification-copy"

// Definir el tipo para el payload de vacunación con el veterinario incluido
type VaccinationWithVet = Prisma.VaccinationGetPayload<{
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

    const whereClause: Prisma.VaccinationWhereInput = {}
    if (role === "admin") {
      // Sin filtro
    } else if (role === "veterinario") {
      whereClause.vetId = id
    } else {
      whereClause.petId = { in: userPetIds }
    }

    const vacunaciones = await prisma.vaccination.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        vet: {
          select: { name: true }
        }
      }
    })
    return NextResponse.json(vacunaciones)
  } catch (error) {
    console.error("Error al obtener vacunaciones:", error)
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
    const validatedData = VaccinationCreateSchema.parse(data)
    
    const fechaActual = new Date().toISOString().split('T')[0]

    const vacunacion = await prisma.vaccination.create({
      data: {
        mascota: validatedData.mascota ?? "",
        dosis: validatedData.dosis ?? "",
        vacunaId: validatedData.vacunaId ?? "",
        proximaFecha: validatedData.proximaFecha ?? "",
        periodicidad: validatedData.periodicidad,
        petId: validatedData.petId || null,
        fecha: fechaActual,
        vetId: id,
        veterinario: name || "Veterinario",
        notas: validatedData.notas || null,
      },
      include: {
        vet: {
          select: { name: true, clinicName: true, address: true, phone: true }
        }
      }
    }) as VaccinationWithVet

    // --- Lógica de Cierre de Cita ---
    const appointmentId = data.appointmentId
    if (appointmentId) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { estado: "completada" }
      }).catch(err => console.error("Error updating appointment (ID):", err))
    } else if (vacunacion.petId) {
      const lastCita = await prisma.appointment.findFirst({
        where: {
          petId: vacunacion.petId,
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

    if (vacunacion.petId) {
      try {
        const petWithOwner = await prisma.pet.findUnique({
          where: { id: vacunacion.petId },
          include: { user: true }
        })
        if (!petWithOwner) {
          throw new Error("Pet not found for post-vaccination logic")
        }

        const vetName = vacunacion.vet?.name || name || "Veterinario"
          const vetClinicName = vacunacion.vet && 'clinicName' in vacunacion.vet ? (vacunacion.vet as {clinicName?: string | null}).clinicName : null;
          const vetAddress = vacunacion.vet && 'address' in vacunacion.vet ? (vacunacion.vet as {address?: string | null}).address : null;
          const vetPhone = vacunacion.vet && 'phone' in vacunacion.vet ? (vacunacion.vet as {phone?: string | null}).phone : null;
          const duenoNombre = petWithOwner.user?.name?.trim() || "Dueño"

        // Cita de refuerzo solo si hay próxima fecha
        if (vacunacion.proximaFecha) {
          await prisma.appointment.create({
            data: {
              petId: vacunacion.petId,
              mascota: petWithOwner.nombre,
              dueno: duenoNombre,
              fecha: vacunacion.proximaFecha,
              hora: "09:00",
              tipo: "Control de Dosis",
              motivo: `Refuerzo de Vacuna: ${vacunacion.vacunaId}`,
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

          const message = buildVaccinationOwnerNotificationMessage({
            vetName,
            petName: petWithOwner.nombre,
            vacunaId: vacunacion.vacunaId ?? "",
            dosis: vacunacion.dosis ?? "",
            proximaFecha: vacunacion.proximaFecha ?? "",
            notas: vacunacion.notas ?? undefined,
            clinicName: vetClinicName,
            address: vetAddress,
            phone: vetPhone,
          })

          await createNotification({
            userId: petWithOwner.userId as string,
            title: "Nueva Vacuna Registrada",
            message,
            type: "medical_vaccine",
            userEmail: petWithOwner.user.email,
            sendEmailFlag: true,
            emailSubject: `Vacuna Registrada: ${petWithOwner.nombre}`,
            actionUrl: `${appUrl}/mi-mascota?tab=historial`,
            metadata: {
              petName: petWithOwner.nombre,
              vetClinicName,
              vetAddress,
              vetPhone,
              veterinario: vetName,
              vacunaNombre: vacunacion.vacunaId ?? undefined,
              numeroDosis: vacunacion.dosis ?? undefined,
              proximaFecha: vacunacion.proximaFecha ?? undefined,
              notas: vacunacion.notas ?? undefined,
            },
          })
        }
      } catch (notifyError) {
        console.error("Error in post-vaccination logic:", notifyError)
      }
    }

    return NextResponse.json(vacunacion)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Datos inválidos", error: formatZodError(error) }, { status: 400 })
    }
    console.error("Error al crear vacunación:", error)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}
