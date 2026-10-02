import { auth } from "@/auth"
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { formatDate } from "@/lib/utils"
import { writeAdminAudit } from "@/lib/admin-audit"

// Obtener mascotas del refugio (Disponibles para adopción)
export async function GET() {
  try {
    const pets = await prisma.shelterPet.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })
    return NextResponse.json(pets)
  } catch (error) {
    console.error("Error al obtener mascotas del refugio:", error)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}

// Agregar mascota al refugio (Solo Admin)
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  try {
    const data = await req.json()
    const { nombre, raza, edad, peso, sexo, color, vacunado, esterilizado, descripcion, hogarRecomendado, foto } = data

    if (!nombre || !raza || !edad) {
      return NextResponse.json({ message: "Faltan campos obligatorios" }, { status: 400 })
    }

    const pet = await prisma.shelterPet.create({
      data: {
        nombre,
        raza,
        edad,
        peso,
        sexo,
        color,
        vacunado: !!vacunado,
        esterilizado: !!esterilizado,
        descripcion,
        hogarRecomendado,
        foto,
        estado: "disponible"
      }
    })

    // Auto-generar un Post en el Blog para esta mascota
    await prisma.blogPost.create({
      data: {
        title: `En Adopción: ¡Conoce a ${pet.nombre}! `,
        excerpt: pet.descripcion?.substring(0, 100) || `Un hermoso ${pet.raza} buscando un hogar amoroso. ¡Ven a conocerlo!`,
        content: `
          <h3> Conoce a ${pet.nombre}</h3>
          <p>Estamos buscando una familia amorosa para <strong>${pet.nombre}</strong>. Aquí tienes todos sus detalles:</p>
          <ul>
            <li><strong>Raza:</strong> ${pet.raza}</li>
            <li><strong>Edad:</strong> ${pet.edad}</li>
            <li><strong>Peso:</strong> ${pet.peso}</li>
            <li><strong>Sexo:</strong> ${pet.sexo}</li>
            <li><strong>Color:</strong> ${pet.color}</li>
            <li><strong>Vacunado:</strong> ${pet.vacunado ? 'Sí' : 'No'}</li>
            <li><strong>Esterilizado:</strong> ${pet.esterilizado ? 'Sí' : 'No'}</li>
          </ul>
          <h4>Sobre ${pet.nombre}</h4>
          <p>${pet.descripcion}</p>
          <h4>Hogar Recomendado</h4>
          <p>${pet.hogarRecomendado}</p>
          <br/>
          <p><strong> ¿Te animas a adoptarlo?</strong> Ve a nuestro panel de <em>"Mi Mascota"</em> o <em>"Centro de Adopción"</em> para enviar tu solicitud.</p>
        `,
        author: "Centro de Adopción",
        authorId: session.user.id || "",
        date: formatDate(new Date()),
        category: "Historias de Rescate",
      }
    })

    // [OJO DE DIOS] Notificar a los Admins sobre la nueva mascota en el refugio
    try {
      const { notifyAdmins } = await import("@/lib/notification")
      await notifyAdmins({
        title: "Nueva Mascota en Adopción ",
        message: `${pet.nombre} se ha unido al refugio para buscar un hogar.`,
        type: "shelter_pet_new",
        metadata: {
          resourceId: pet.id,
          petName: pet.nombre
        }
      });
    } catch (adminError) {
      console.error("Error notifying admins about new shelter pet:", adminError)
    }

    await writeAdminAudit({
      action: "create",
      entity: "mascota_refugio",
      entityId: pet.id,
      title: "Mascota agregada al refugio",
      message: `${pet.nombre} (${pet.raza}) se agregó al centro de acogida.`,
      metadata: {
        petName: pet.nombre,
        status: pet.estado,
      },
      actorId: session.user.id,
      actorName: session.user.name || undefined,
      actorEmail: session.user.email || undefined,
    })

    return NextResponse.json(pet, { status: 201 })
  } catch (error) {
    console.error("Error al crear mascota del refugio:", error)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}

// Actualizar mascota del refugio (Solo Admin)
export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  try {
    const data = await req.json()
    const { id, ...updateData } = data

    if (!id) {
      return NextResponse.json({ message: "ID requerido" }, { status: 400 })
    }

    // Obtener mascota antigua para buscar su post en el blog por título
    const oldPet = await prisma.shelterPet.findUnique({ where: { id } })

    const pet = await prisma.shelterPet.update({
      where: { id },
      data: updateData
    })

    await writeAdminAudit({
      action: "update",
      entity: "mascota_refugio",
      entityId: pet.id,
      title: "Mascota de refugio actualizada",
      message: `${pet.nombre} fue actualizada en el centro de acogida.`,
      metadata: {
        petName: pet.nombre,
        oldStatus: oldPet?.estado ?? null,
        newStatus: pet.estado,
      },
      actorId: session.user.id,
      actorName: session.user.name || undefined,
      actorEmail: session.user.email || undefined,
    })

    // Si encontramos la mascota vieja y se actualizó, actualizar también su post en el blog
    if (oldPet) {
      const oldTitle = `En Adopción: ¡Conoce a ${oldPet.nombre}! `
      const adoptadoTitle = `¡ADOPTADO: ${oldPet.nombre} ya tiene un hogar! `
      
      const existingPost = await prisma.blogPost.findFirst({ 
        where: { 
          OR: [
            { title: oldTitle },
            { title: adoptadoTitle }
          ]
        } 
      })
      
      if (existingPost) {
        const isAdopted = pet.estado === "adoptado" || existingPost.title.startsWith("¡ADOPTADO:")
        const newTitle = isAdopted 
          ? `¡ADOPTADO: ${pet.nombre} ya tiene un hogar! `
          : `En Adopción: ¡Conoce a ${pet.nombre}! `

        await prisma.blogPost.update({
          where: { id: existingPost.id },
          data: {
            title: newTitle,
            excerpt: pet.descripcion?.substring(0, 100) || `Un hermoso ${pet.raza} buscando un hogar amoroso. ¡Ven a conocerlo!`,
            content: `
              <h3> Conoce a ${pet.nombre}</h3>
              <p>Estamos buscando una familia amorosa para <strong>${pet.nombre}</strong>. Aquí tienes todos sus detalles:</p>
              <ul>
                <li><strong>Raza:</strong> ${pet.raza}</li>
                <li><strong>Edad:</strong> ${pet.edad}</li>
                <li><strong>Peso:</strong> ${pet.peso}</li>
                <li><strong>Sexo:</strong> ${pet.sexo}</li>
                <li><strong>Color:</strong> ${pet.color}</li>
                <li><strong>Vacunado:</strong> ${pet.vacunado ? 'Sí' : 'No'}</li>
                <li><strong>Esterilizado:</strong> ${pet.esterilizado ? 'Sí' : 'No'}</li>
              </ul>
              <h4>Sobre ${pet.nombre}</h4>
              <p>${pet.descripcion}</p>
              <h4>Hogar Recomendado</h4>
              <p>${pet.hogarRecomendado}</p>
              <br/>
              <p><strong> ¿Te animas a adoptarlo?</strong> Ve a nuestro panel de <em>"Mi Mascota"</em> o <em>"Centro de Adopción"</em> para enviar tu solicitud.</p>
            `,
            image: pet.foto || existingPost.image
          }
        })
      }
    }

    return NextResponse.json(pet)
  } catch (error) {
    console.error("Error al actualizar mascota del refugio:", error)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}

// Eliminar mascota del refugio (Solo Admin)
export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ message: "ID requerido" }, { status: 400 })
  }

  try {
    const pet = await prisma.shelterPet.findUnique({ where: { id } })
    
    if (pet) {
      // 1. Limpiar el post del blog auto-generado para esta mascota
      const title = `En Adopción: ¡Conoce a ${pet.nombre}! `
      const adoptadoTitle = `¡ADOPTADO: ${pet.nombre} ya tiene un hogar! `
      await prisma.blogPost.deleteMany({
        where: { 
          OR: [
            { title },
            { title: adoptadoTitle }
          ]
        }
      })

      // 2. Limpiar las solicitudes de adopción asociadas para evitar el error P2014 (Constraint)
      await prisma.adoptionRequest.deleteMany({
        where: { perroId: id }
      })

      // 3. Finalmente, eliminar el perrito
      await prisma.shelterPet.delete({
        where: { id }
      })

      await writeAdminAudit({
        action: "delete",
        entity: "mascota_refugio",
        entityId: id,
        title: "Mascota eliminada del refugio",
        message: `${pet.nombre} fue eliminada del centro de acogida.`,
        metadata: {
          petName: pet.nombre,
          previousStatus: pet.estado,
        },
        actorId: session.user.id,
        actorName: session.user.name || undefined,
        actorEmail: session.user.email || undefined,
      })
    }
    
    return NextResponse.json({ message: "Mascota eliminada del refugio y base limpia" })
  } catch (error) {
    console.error("Error al eliminar mascota del refugio:", error)
    return NextResponse.json({ message: "Error del servidor al eliminar" }, { status: 500 })
  }
}
