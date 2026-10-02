import { auth } from "@/auth"
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { PetCreateSchema, formatZodError } from "@/lib/validations"
import { normalizeEcuadorPhone } from "@/lib/phone"
import { z } from "zod"

const RegisterPatientSchema = z.object({
  owner: z.object({
    name: z.string().min(2, "Nombre requerido"),
    email: z.string().email("Email inválido"),
    phone: z.string().min(7, "Teléfono requerido"),
    cedula: z.string().min(5, "Cédula requerida"),
  }),
  pet: PetCreateSchema,
  isNewOwner: z.boolean().optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user?.role !== "veterinario") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const validation = RegisterPatientSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { message: "Datos inválidos", errors: formatZodError(validation.error) },
        { status: 400 }
      )
    }

    const { owner, pet, isNewOwner } = validation.data
    const normalizedOwnerPhone = normalizeEcuadorPhone(owner.phone)

    let tempPasswordForNotification: string | null = null;

    // First check outside transaction if we need to block it
    if (isNewOwner) {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: owner.email.toLowerCase() },
            { cedula: owner.cedula }
          ]
        }
      })
      if (existingUser) {
        return NextResponse.json(
          { message: "Ya existe un usuario con este email o cédula. Por favor, usa la opción 'Dueño Registrado'." },
          { status: 400 }
        )
      }
    }

    // Transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find or Create Owner
      let user = await tx.user.findFirst({
        where: {
          OR: [
            { email: owner.email.toLowerCase() },
            { cedula: owner.cedula }
          ]
        }
      })

      if (!user) {
        // Create user with a placeholder password: MIAUW-cedula
        const tempPassword = `MIAUW-${owner.cedula}`
        const hashedPassword = await bcrypt.hash(tempPassword, 10)
        
        user = await tx.user.create({
          data: {
            name: owner.name,
            email: owner.email.toLowerCase(),
            phone: normalizedOwnerPhone,
            cedula: owner.cedula,
            password: hashedPassword,
            role: "usuario"
          }
        })
        
        tempPasswordForNotification = tempPassword;
      } else if (normalizedOwnerPhone && user.phone !== normalizedOwnerPhone) {
        user = await tx.user.update({
          where: { id: user.id },
          data: { phone: normalizedOwnerPhone },
        })
      }

      // 2. Create Pet linked to the user
      const createdPet = await tx.pet.create({
        data: {
          nombre: pet.nombre,
          raza: pet.raza,
          edad: pet.edad,
          peso: pet.peso,
          tipo: pet.tipo,
          color: pet.color,
          sexo: pet.sexo,
          esterilizado: pet.esterilizado,
          foto: pet.foto,
          fechaNacimiento: pet.fechaNacimiento,
          descripcion: pet.descripcion,
          alergias: pet.alergias,
          userId: user.id,
          assignedVetId: session.user.id
        },
        include: {
          user: { select: { name: true, email: true } }
        }
      })

      // 3. Create pre-approved MedicalPermission for this vet & pet to guarantee instant access
      const token = `AUTO-${user.id}-${createdPet.id}-${Math.random().toString(36).substring(2, 10)}`
      await tx.medicalPermission.create({
        data: {
          petId: createdPet.id,
          vetId: session.user.id,
          status: "ACCEPTED",
          responseToken: token
        }
      })

      return { user, pet: createdPet }
    })

    const { user, pet: createdPet } = result

    // 3. Send Notification manually if new user was created
    if (tempPasswordForNotification) {
      try {
        const { createNotification, notifyAdmins } = await import("@/lib/notification")
        
        // Welcome + Pet notification for the user
        await createNotification({
          userId: user.id,
          title: `¡Bienvenido y gracias por confiar en nosotros!`,
          message: `Hola ${owner.name}, tu veterinario ha registrado a ${pet.nombre} en nuestro sistema. Aquí están tus credenciales de acceso para que puedas gestionar su salud.`,
          type: "welcome",
          userEmail: user.email!,
          sendEmailFlag: true,
          emailSubject: "¡Tu mascota ya es parte de MIAUWUAUF! ",
          metadata: {
            nombre: owner.name,
            email: user.email!,
            plainPassword: tempPasswordForNotification,
            petData: {
              nombre: pet.nombre,
              tipo: pet.tipo || "Mascota",
              raza: pet.raza || "No especificada",
              edad: pet.edad || "Desconocida",
              peso: pet.peso,
              sexo: pet.sexo === "M" ? "Macho" : pet.sexo === "H" ? "Hembra" : (pet.sexo || "Desconocido"),
              esterilizado: pet.esterilizado ? "Sí" : "No"
            }
          }
        })

        // Admin notification
        await notifyAdmins({
          title: " Nuevo Paciente y Dueño Registrados",
          message: `El veterinario ${session.user.name || "activo"} ha registrado a ${owner.name} y a su mascota ${pet.nombre}.`,
          type: "veterinario_registration",
          metadata: { resourceId: createdPet.id }
        })

      } catch (notifyErr) {
        console.error("Error sending register-patient notifications:", notifyErr)
      }
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("Error in register-patient:", error)
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
