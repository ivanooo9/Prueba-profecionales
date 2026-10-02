import { auth } from "@/auth"
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { TreatmentCreateSchema, formatZodError } from "@/lib/validations"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { buildTreatmentOwnerNotificationMessage } from "@/lib/medical-notification-copy"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  const { id, role } = session.user

  try {
    const userPets = await prisma.pet.findMany({
      where: role === "admin" ? {} : { userId: id },
      select: { id: true, nombre: true },
    })
    const userPetIds = userPets.map((p) => p.id)

    const whereClause: Prisma.TreatmentWhereInput = {}
    if (role === "admin") {
      // No filter
    } else if (role === "veterinario") {
      whereClause.vetId = id
    } else {
      whereClause.petId = { in: userPetIds }
    }

    const tratamientos = await prisma.treatment.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: { vet: { select: { name: true } } },
    })
    return NextResponse.json(tratamientos)
  } catch (error) {
    console.error("Error al obtener tratamientos:", error)
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
    const validatedData = TreatmentCreateSchema.parse(data)

    const tratamiento = await prisma.treatment.create({
      data: {
        mascota: validatedData.mascota ?? "",
        medicamento: validatedData.medicamento ?? "",
        dosis: validatedData.dosis ?? "",
        duracion: validatedData.duracion ?? "",
        notas: validatedData.notas,
        petId: validatedData.petId ?? null,
        vetId: id,
        veterinario: name ?? "Veterinario",
      },
      include: { vet: { select: { name: true, clinicName: true, address: true, phone: true } } },
    })

    // --- Lógica de Cierre de Cita ---
    const appointmentId = data.appointmentId
    if (appointmentId) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { estado: "completada" }
      }).catch(err => console.error("Error updating appointment (ID):", err))
    } else if (tratamiento.petId) {
      const lastCita = await prisma.appointment.findFirst({
        where: {
          petId: tratamiento.petId,
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

    if (tratamiento.petId) {
      try {
        const petWithOwner = await prisma.pet.findUnique({
          where: { id: tratamiento.petId },
          include: { user: true },
        })

        if (petWithOwner?.user) {
          const { createNotification } = await import("@/lib/notification")
          const vetName = tratamiento.vet?.name ?? name ?? "Veterinario"
          const vetClinicName = tratamiento.vet && 'clinicName' in tratamiento.vet ? (tratamiento.vet as {clinicName?: string | null}).clinicName : null;
          const vetAddress = tratamiento.vet && 'address' in tratamiento.vet ? (tratamiento.vet as {address?: string | null}).address : null;
          const vetPhone = tratamiento.vet && 'phone' in tratamiento.vet ? (tratamiento.vet as {phone?: string | null}).phone : null;

          const message = buildTreatmentOwnerNotificationMessage({
            vetName,
            petName: petWithOwner.nombre,
            medicamento: tratamiento.medicamento ?? "",
            dosis: tratamiento.dosis ?? "",
            duracion: tratamiento.duracion ?? "",
            notas: tratamiento.notas ?? undefined,
            clinicName: vetClinicName,
            address: vetAddress,
            phone: vetPhone,
          })

          await createNotification({
            userId: petWithOwner.userId as string,
            title: "Nuevo Tratamiento Registrado",
            message,
            type: "medical_treatment",
            userEmail: petWithOwner.user.email!,
            sendEmailFlag: true,
            emailSubject: `Nuevo Tratamiento: ${petWithOwner.nombre}`,
            actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/mi-mascota?tab=historial`,
            metadata: {
              petName: petWithOwner.nombre,
              vetClinicName,
              vetAddress,
              vetPhone,
              veterinario: vetName,
              medicamento: tratamiento.medicamento ?? undefined,
              dosis: tratamiento.dosis ?? undefined,
              duracion: tratamiento.duracion ?? undefined,
              notas: tratamiento.notas ?? undefined,
            },
          })
        }
      } catch (notifyError) {
        console.error("Error sending treatment notification:", notifyError)
      }
    }

    return NextResponse.json(tratamiento)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Datos inválidos", error: formatZodError(error) }, { status: 400 })
    }
    console.error("Error al crear tratamiento:", error)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}
