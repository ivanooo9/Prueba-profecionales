import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { generateSlug } from "@/lib/slug"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idOrSlug } = await params
    
    // Intentar buscar por ID (MongoDB ObjectId)
    let post = null
    if (idOrSlug.length === 24) {
      post = await prisma.blogPost.findUnique({ where: { id: idOrSlug } })
    }

    // Si no se encontró por ID, intentar por SLUG
    if (!post) {
      post = await prisma.blogPost.findUnique({ where: { slug: idOrSlug } })
    }

    if (!post) {
      return NextResponse.json({ error: "Artículo no encontrado" }, { status: 404 })
    }

    return NextResponse.json(post)
  } catch (error) {
    console.error("Error fetching single blog post:", error)
    return NextResponse.json({ error: "Error al obtener el artículo" }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { role } = session.user
  if (role !== "admin" && role !== "bloguer") {
    return NextResponse.json({ error: "Prohibido" }, { status: 403 })
  }

  try {
    const { id: idOrSlug } = await params
    
    // Primero necesitamos el ID real si lo que pasaron fue un slug
    let realId = idOrSlug
    if (idOrSlug.length !== 24) {
      const post = await prisma.blogPost.findUnique({ where: { slug: idOrSlug }, select: { id: true } })
      if (post) realId = post.id
    }

    await prisma.blogPost.delete({ where: { id: realId } })
    return NextResponse.json({ message: "Artículo eliminado" })
  } catch (error) {
    console.error("Error deleting blog post:", error)
    return NextResponse.json({ error: "Error al eliminar el artículo" }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { role } = session.user
  if (role !== "admin" && role !== "bloguer") {
    return NextResponse.json({ error: "Prohibido" }, { status: 403 })
  }

  try {
    const { id: idOrSlug } = await params
    const data = await req.json() as {
      title?: string
      excerpt?: string
      content?: string
      category?: string
      image?: string
      images?: string[]
      slug?: string
    }

    // Identificar el ID real
    let realId = idOrSlug
    if (idOrSlug.length !== 24) {
      const post = await prisma.blogPost.findUnique({ where: { slug: idOrSlug }, select: { id: true } })
      if (post) realId = post.id
    }

    const updated = await prisma.blogPost.update({
      where: { id: realId },
      data: {
        title: data.title,
        slug: data.title ? generateSlug(data.title) : data.slug,
        excerpt: data.excerpt,
        content: data.content,
        category: data.category,
        image: data.image,
        images: data.images ?? [],
      }
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating blog post:", error)
    return NextResponse.json({ error: "Error al actualizar el artículo" }, { status: 500 })
  }
}
