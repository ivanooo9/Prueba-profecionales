import { auth } from "@/auth"
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { PetCreateSchema, PetUpdateSchema, formatZodError } from "@/lib/validations"
import { z } from "zod"
import { v2 as cloudinary } from 'cloudinary'
import { writeAdminAudit } from "@/lib/admin-audit"

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

async function uploadToCloudinary(base64Image: string) {
  try {
    const response = await cloudinary.uploader.upload(base64Image, {
      folder: 'miauwuauf/pets',
    })
    return response.secure_url
  } catch (error) {
    console.error("Error al subir a Cloudinary:", error)
    return null
  }
}

export async function GET() {
  const session = await auth()
  const user = session?.user;
  if (!session || !user) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  try {
    const pets = await prisma.pet.findMany({
      where: { userId: user.id as string },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            role: true,
            cedula: true,
          }
        }
      }
    })
    return NextResponse.json(pets)
  } catch (error) {
    console.error("Error al obtener mascotas:", error)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  const user = session?.user;
  if (!session || !user) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  try {
    const data = await req.json()
    const validatedData = PetCreateSchema.parse(data)

    // Upload image to Cloudinary if it's Base64
    if (validatedData.foto && (validatedData.foto as string).startsWith('data:image')) {
      const cloudinaryUrl = await uploadToCloudinary(validatedData.foto as string)
      if (cloudinaryUrl) {
        validatedData.foto = cloudinaryUrl
      }
    }

    const pet = await prisma.pet.create({
      data: {
        nombre: validatedData.nombre,
        raza: validatedData.raza,
        edad: validatedData.edad,
        peso: validatedData.peso,
        tipo: validatedData.tipo,
        color: validatedData.color,
        sexo: validatedData.sexo,
        esterilizado: validatedData.esterilizado,
        foto: validatedData.foto,
        fechaNacimiento: validatedData.fechaNacimiento,
        descripcion: validatedData.descripcion,
        alergias: validatedData.alergias,
        userId: user.id as string
      },
      include: {
        user: { select: { name: true, email: true, phone: true, cedula: true } }
      }
    })
    // Enviar notificación al dueño
    try {
      const { createNotification } = await import("@/lib/notification")
      await createNotification({
        userId: user.id as string,
        title: `Nueva Mascota: ${pet.nombre}`,
        message: `¡Bienvenido(a) a la familia, ${pet.nombre}! Tipo: ${pet.tipo}, Raza: ${pet.raza}${pet.sexo ? `, Género: ${pet.sexo}` : ""}${pet.edad ? `, Edad: ${pet.edad}` : ""}${pet.peso ? `, Peso: ${pet.peso}` : ""}.`,
        type: "pet_registration",
        userEmail: pet.user.email!,
        sendEmailFlag: true,
        emailSubject: `¡Bienvenido ${pet.nombre} a MIAUWUAUF!`,
        metadata: {
          petName: pet.nombre,
          tipo: pet.tipo,
          raza: pet.raza,
          genero: pet.sexo,
          edad: pet.edad,
          peso: pet.peso
        }
      })
    } catch (notifyError) {
      console.error("Error sending pet registration notification:", notifyError)
    }

    // [OJO DE DIOS] Notificar a los Admins sobre la nueva mascota
    try {
      const { notifyAdmins } = await import("@/lib/notification")
      await notifyAdmins({
        title: "Nueva Mascota Registrada",
        message: `${pet.nombre} ha sido registrada por ${pet.user.name || "un usuario"}.`,
        type: "pet_registration",
        metadata: {
          resourceId: pet.id,
          petName: pet.nombre
        }
      });
    } catch (adminError) {
      console.error("Error notifying admins about new pet:", adminError)
    }

    await writeAdminAudit({
      action: "create",
      entity: "mascota_usuario",
      entityId: pet.id,
      title: "Mascota de usuario registrada",
      message: `${pet.nombre} fue registrada por ${pet.user.name || pet.user.email || "usuario"}.`,
      metadata: {
        petName: pet.nombre,
        ownerName: pet.user.name ?? "",
        ownerEmail: pet.user.email ?? "",
      },
    })

    return NextResponse.json(pet, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Datos inválidos", error: formatZodError(error) }, { status: 400 })
    }
    console.error("Error al crear mascota:", error)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const session = await auth()
  const user = session?.user;
  if (!session || !user) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ message: "ID requerido" }, { status: 400 })
  }

  try {
    const pet = await prisma.pet.findUnique({
      where: { id }
    })

    if (!pet || pet.userId !== user.id) {
      return NextResponse.json({ message: "No encontrado o no autorizado" }, { status: 404 })
    }

    await prisma.pet.delete({
      where: { id }
    })

    await writeAdminAudit({
      action: "delete",
      entity: "mascota_usuario",
      entityId: pet.id,
      title: "Mascota de usuario eliminada",
      message: `${pet.nombre} fue eliminada por su propietario.`,
      metadata: {
        petName: pet.nombre,
        ownerId: pet.userId,
      },
    })

    return NextResponse.json({ message: "Mascota eliminada" })
  } catch (error) {
    console.error("Error al eliminar mascota:", error)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const session = await auth()
  const user = session?.user;
  if (!session || !user) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  try {
    const data = await req.json()
    const validatedData = PetUpdateSchema.parse(data)
    const { id, ...updateData } = validatedData

    const pet = await prisma.pet.findUnique({
      where: { id }
    })

    if (!pet || pet.userId !== user.id) {
      return NextResponse.json({ message: "No encontrado o no autorizado" }, { status: 404 })
    }

    // Upload image to Cloudinary if it's Base64
    if (updateData.foto && (updateData.foto as string).startsWith('data:image')) {
      const cloudinaryUrl = await uploadToCloudinary(updateData.foto as string)
      if (cloudinaryUrl) {
        updateData.foto = cloudinaryUrl
      }
    }

    const updatedPet = await prisma.pet.update({
      where: { id },
      data: {
        nombre: updateData.nombre,
        raza: updateData.raza,
        edad: updateData.edad,
        peso: updateData.peso,
        tipo: updateData.tipo,
        color: updateData.color,
        sexo: updateData.sexo,
        esterilizado: updateData.esterilizado,
        foto: updateData.foto,
        fechaNacimiento: updateData.fechaNacimiento,
        descripcion: updateData.descripcion,
        alergias: updateData.alergias
      }
    })

    return NextResponse.json(updatedPet)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Datos inválidos", error: formatZodError(error) }, { status: 400 })
    }
    console.error("Error al actualizar mascota:", error)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}
