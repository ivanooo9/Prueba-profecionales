import { auth } from "@/auth"
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { DiagnosisCreateSchema, formatZodError } from "@/lib/validations"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { buildDiagnosisOwnerNotificationMessage } from "@/lib/medical-notification-copy"

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

    const whereClause: Prisma.DiagnosisWhereInput = {}
    if (role === "admin") {
      // No filter — see all
    } else if (role === "veterinario") {
      whereClause.vetId = id
    } else {
      whereClause.petId = { in: userPetIds }
    }

    const diagnósticos = await prisma.diagnosis.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: { vet: { select: { name: true } } },
    })
    return NextResponse.json(diagnósticos)
  } catch (error) {
    console.error("Error al obtener diagnósticos:", error)
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
    const validatedData = DiagnosisCreateSchema.parse(data)

    const fechaActual = new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" })

    const diagnóstico = await prisma.diagnosis.create({
      data: {
        mascota: validatedData.mascota ?? "",
        diagnostico: validatedData.diagnostico ?? "",
        notas: validatedData.notas ?? null,
        petId: validatedData.petId ?? null,
        fecha: fechaActual,
        vetId: id,
        veterinario: name ?? "Veterinario",
        motivoConsulta: validatedData.motivoConsulta ?? null,
        fRespiratoria: validatedData.fRespiratoria ?? null,
        fCardiaca: validatedData.fCardiaca ?? null,
        temperatura: validatedData.temperatura ?? null,
        pulso: validatedData.pulso ?? null,
        tiempoLlenado: validatedData.tiempoLlenado ?? null,
        ganglios: validatedData.ganglios ?? null,
        mucosas: validatedData.mucosas ?? null,
        actitud: validatedData.actitud ?? null,
        sistemas: validatedData.sistemas ?? null,
        hallazgosClinicos: validatedData.hallazgosClinicos ?? null,
        listaProblemas: validatedData.listaProblemas ?? null,
        diagnosticosDiferenciales: validatedData.diagnosticosDiferenciales ?? null,
        examenesComplementarios: validatedData.examenesComplementarios ?? null,
        hallazgosPruebas: validatedData.hallazgosPruebas ?? null,
      },
      include: { vet: { select: { name: true, clinicName: true, address: true, phone: true } } },
    })

    // Vincular exámenes subidos durante este diagnóstico
    const examIds = validatedData.examIds
    if (Array.isArray(examIds) && examIds.length > 0) {
      await prisma.exam.updateMany({
        where: {
          id: { in: examIds },
        },
        data: {
          diagnosisId: diagnóstico.id,
        },
      }).catch(err => console.error("Error linking exams to diagnosis:", err))
    }

    // --- Lógica de Cierre de Cita ---
    const appointmentId = data.appointmentId
    if (appointmentId) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { estado: "completada" }
      }).catch(err => console.error("Error updating appointment (ID):", err))
    } else if (diagnóstico.petId) {
      // Intentar encontrar la cita confirmada más reciente para este pet y este vet
      const lastCita = await prisma.appointment.findFirst({
        where: {
          petId: diagnóstico.petId,
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

    if (diagnóstico.petId) {
      try {
        const petWithOwner = await prisma.pet.findUnique({
          where: { id: diagnóstico.petId },
          include: { user: true },
        })

        if (petWithOwner?.user) {
          const { createNotification } = await import("@/lib/notification")
          const vetName = diagnóstico.vet?.name || name || "Veterinario";
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

          const vetClinicName = diagnóstico.vet && 'clinicName' in diagnóstico.vet ? (diagnóstico.vet as {clinicName?: string | null}).clinicName : null;
          const vetAddress = diagnóstico.vet && 'address' in diagnóstico.vet ? (diagnóstico.vet as {address?: string | null}).address : null;
          const vetPhone = diagnóstico.vet && 'phone' in diagnóstico.vet ? (diagnóstico.vet as {phone?: string | null}).phone : null;

          const message = buildDiagnosisOwnerNotificationMessage({
            vetName,
            petName: petWithOwner.nombre,
            diagnostico: diagnóstico.diagnostico ?? "",
            notas: diagnóstico.notas ?? undefined,
            motivoConsulta: diagnóstico.motivoConsulta ?? undefined,
            examenes: (diagnóstico.examenesComplementarios as string[])?.join(', ') || null,
            clinicName: vetClinicName,
            address: vetAddress,
            phone: vetPhone,
          })
          
          await createNotification({
            userId: petWithOwner.userId as string,
            title: "Nuevo Diagnóstico Registrado",
            message,
            type: "medical_diagnosis",
            userEmail: petWithOwner.user.email!,
            sendEmailFlag: true,
            emailSubject: `Actualización Médica: ${petWithOwner.nombre}`,
            actionUrl: `${appUrl}/mi-mascota?tab=historial`,
            metadata: {
              petName: petWithOwner.nombre,
              vetClinicName,
              vetAddress,
              vetPhone,
              veterinario: vetName,
              diagnostico: diagnóstico.diagnostico ?? undefined,
              motivoConsulta: diagnóstico.motivoConsulta ?? undefined,
              fRespiratoria: diagnóstico.fRespiratoria ?? undefined,
              fCardiaca: diagnóstico.fCardiaca ?? undefined,
              temperatura: diagnóstico.temperatura ?? undefined,
              pulso: diagnóstico.pulso ?? undefined,
              tiempoLlenado: diagnóstico.tiempoLlenado ?? undefined,
              ganglios: diagnóstico.ganglios ?? undefined,
              mucosas: diagnóstico.mucosas ?? undefined,
              actitud: diagnóstico.actitud ?? undefined,
              sistemas: diagnóstico.sistemas ? JSON.stringify(diagnóstico.sistemas) : undefined,
              hallazgosClinicos: diagnóstico.hallazgosClinicos ?? undefined,
              listaProblemas: diagnóstico.listaProblemas ?? undefined,
              diagnosticosDiferenciales: diagnóstico.diagnosticosDiferenciales ?? undefined,
              examenesComplementarios: diagnóstico.examenesComplementarios ? (diagnóstico.examenesComplementarios as string[])?.join(', ') : undefined,
              hallazgosPruebas: diagnóstico.hallazgosPruebas ?? undefined,
              notas: diagnóstico.notas ?? undefined,
            },
          })
        }
      } catch (notifyError) {
        console.error("Error sending diagnosis notification:", notifyError)
      }
    }

    return NextResponse.json(diagnóstico)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Datos inválidos", error: formatZodError(error) }, { status: 400 })
    }
    console.error("Error al crear diagnóstico:", error)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}
