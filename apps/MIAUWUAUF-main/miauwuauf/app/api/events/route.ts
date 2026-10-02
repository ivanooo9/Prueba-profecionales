import { auth } from "@/auth"
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// Obtener todos los eventos
export async function GET() {
  try {
    const events = await prisma.event.findMany({
      include: {
        registrations: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
                cedula: true,
                image: true
              }
            }
          }
        }
      },
      orderBy: {
        fecha: 'asc'
      }
    })

    // Map registrations to inscritos for the frontend
    const mappedEvents = events.map(event => ({
      ...event,
      inscritos: event.registrations.map(reg => ({
        id: reg.id,
        userId: reg.userId,
        nombre: reg.user.name || "Usuario",
        email: reg.user.email,
        userImage: reg.user.image,
        mascotaId: reg.mascotaId,
        mascota: reg.petName,
        telefono: reg.user.phone,
        cedula: reg.user.cedula,
        fecha: reg.createdAt.toISOString()
      }))
    }))

    return NextResponse.json(mappedEvents)
  } catch (error) {
    console.error("Error al obtener eventos:", error)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}

// Crear un nuevo evento (Solo Admin)
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  try {
    const data = await req.json()
    const { titulo, descripcion, fecha, hora, lugar, tipo, maximo, image } = data

    if (!titulo || !fecha || !maximo) {
      return NextResponse.json({ message: "Faltan campos obligatorios" }, { status: 400 })
    }

    const event = await prisma.event.create({
      data: {
        titulo,
        descripcion,
        fecha,
        hora,
        lugar,
        tipo,
        maximo: parseInt(maximo.toString()),
        image: image || null
      }
    })

    // Auto-generar un Post en el Blog para este evento
    await prisma.blogPost.create({
      data: {
        title: `Próximo Evento: ${event.titulo}`,
        excerpt: event.descripcion?.substring(0, 100) || `Únete a nosotros este ${event.fecha} en ${event.lugar}. ¡No faltes a nuestro evento de ${event.tipo}!`,
        content: `
          <h3> Únete a nuestro evento: ${event.titulo}</h3>
          <p>${event.descripcion}</p>
          <h4>Detalles del Evento</h4>
          <ul>
            <li><strong>Tipo de Evento:</strong> ${event.tipo}</li>
            <li><strong>Fecha:</strong> ${event.fecha}</li>
            <li><strong>Hora:</strong> ${event.hora}</li>
            <li><strong>Lugar:</strong> ${event.lugar}</li>
            <li><strong>Cupos Máximos:</strong> ${event.maximo} personas</li>
          </ul>
          <br/>
          <p><strong> ¡Inscríbete ahora!</strong> Puedes asegurar tu cupo dirigiéndote a nuestro panel de <em>"Eventos"</em>. ¡Te esperamos!</p>
        `,
        author: "Admin MIAUWUAUF",
        authorId: session.user.id || "",
        date: event.fecha, // Fecha del evento como fecha del artículo
        category: "Eventos y Campañas",
        image: event.image || "/placeholder.svg"
      }
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error("Error al crear evento:", error)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}

// Actualizar evento (Solo Admin)
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

    if (updateData.maximo) {
      updateData.maximo = parseInt(updateData.maximo.toString())
    }

    // Obtener evento antiguo para buscar su post en el blog por título
    const oldEvent = await prisma.event.findUnique({ where: { id } })

    const event = await prisma.event.update({
      where: { id },
      data: updateData
    })

    // Actualizar el post del blog si existía
    if (oldEvent) {
      const oldTitle = `Próximo Evento: ${oldEvent.titulo}`
      const existingPost = await prisma.blogPost.findFirst({ where: { title: oldTitle } })
      
      if (existingPost) {
        await prisma.blogPost.update({
          where: { id: existingPost.id },
          data: {
            title: `Próximo Evento: ${event.titulo}`,
            excerpt: event.descripcion?.substring(0, 100) || `Únete a nosotros este ${event.fecha} en ${event.lugar}. ¡No faltes a nuestro evento de ${event.tipo}!`,
            content: `
              <h3> Únete a nuestro evento: ${event.titulo}</h3>
              <p>${event.descripcion}</p>
              <h4>Detalles del Evento</h4>
              <ul>
                <li><strong>Tipo de Evento:</strong> ${event.tipo}</li>
                <li><strong>Fecha:</strong> ${event.fecha}</li>
                <li><strong>Hora:</strong> ${event.hora}</li>
                <li><strong>Lugar:</strong> ${event.lugar}</li>
                <li><strong>Cupos Máximos:</strong> ${event.maximo} personas</li>
              </ul>
              <br/>
              <p><strong> ¡Inscríbete ahora!</strong> Puedes asegurar tu cupo dirigiéndote a nuestro panel de <em>"Eventos"</em>. ¡Te esperamos!</p>
            `,
            date: event.fecha,
            image: event.image || existingPost.image
          }
        })
      }
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error("Error al actualizar evento:", error)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}

// Eliminar evento (Solo Admin)
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
    const event = await prisma.event.findUnique({ where: { id } })
    
    if (event) {
      // 1. Limpiar el post de blog auto-generado
      const title = `Próximo Evento: ${event.titulo}`
      await prisma.blogPost.deleteMany({
        where: { title }
      })

      // 2. Eliminar el evento (las inscripciones se eliminan en cascada según el schema)
      await prisma.event.delete({
        where: { id }
      })
    }

    return NextResponse.json({ message: "Evento eliminado y blog limpio" })
  } catch (error) {
    console.error("Error al eliminar evento:", error)
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 })
  }
}
