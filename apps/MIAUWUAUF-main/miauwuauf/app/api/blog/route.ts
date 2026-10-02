import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { formatDate } from "@/lib/utils"
import { generateSlug } from "@/lib/slug"

export async function GET() {
  try {
    const posts = await prisma.blogPost.findMany({
      orderBy: { createdAt: "desc" }
    })
    return NextResponse.json(posts)
  } catch (error) {
    console.error("Error fetching blog posts:", error)
    return NextResponse.json({ error: "Error al obtener posts" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { role, name, id } = session.user
  if (role !== "admin" && role !== "bloguer") {
    return NextResponse.json({ error: "Prohibido: No tienes permisos de bloguer" }, { status: 403 })
  }

  try {
    const data = await req.json() as {
      title?: string
      excerpt?: string
      content?: string
      category?: string
      image?: string
      images?: string[]
      date?: string
    }

    const title = data.title ?? ""
    const slug = generateSlug(title)

    const post = await prisma.blogPost.create({
      data: {
        title,
        slug,
        excerpt: data.excerpt ?? "",
        content: data.content ?? "",
        category: data.category ?? "",
        image: data.image ?? "",
        images: data.images ?? [],
        date: data.date ?? formatDate(new Date()),
        author: name ?? "Bloguer",
        authorId: id ?? "",
      }
    })

    // [OJO DE DIOS] Notificar a los Admins sobre el nuevo artículo
    try {
      const { notifyAdmins } = await import("@/lib/notification")
      await notifyAdmins({
        title: "Nuevo Artículo Publicado",
        message: `${name ?? "Un bloguer"} ha publicado: ${data.title ?? "Sin título"}`,
        type: "blog_post",
        metadata: { resourceId: post.id }
      })
    } catch (adminError) {
      console.error("Error notifying admins about new blog post:", adminError)
    }

    return NextResponse.json(post)
  } catch (error) {
    console.error("Error creating blog post:", error)
    return NextResponse.json({ error: "Error al crear el artículo" }, { status: 500 })
  }
}
