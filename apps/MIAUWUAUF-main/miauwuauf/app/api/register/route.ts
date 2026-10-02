import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"
import { v2 as cloudinary } from "cloudinary"
import { normalizeEcuadorPhone } from "@/lib/phone"
import { writeAdminAudit } from "@/lib/admin-audit"

const MAX_AVATAR_BYTES = 5 * 1024 * 1024

function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
}

async function uploadAvatarToCloudinary(file: File): Promise<string> {
  configureCloudinary()
  const buffer = Buffer.from(await file.arrayBuffer())
  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "miauwuauf" },
      (error, res) => {
        if (error || !res?.secure_url) reject(error ?? new Error("Fallo al subir imagen"))
        else resolve({ secure_url: res.secure_url })
      },
    )
    stream.end(buffer)
  })
  return result.secure_url
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || ""

    let nombre: string
    let email: string
    let telefono: string | undefined
    let password: string
    let role: string | undefined
    let especialidad: string | undefined
    let cedula: string | undefined
    let city: string | undefined
    let address: string | undefined
    let clinicName: string | undefined
    let image: string | undefined

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData()
      const get = (key: string) => {
        const v = formData.get(key)
        return v == null ? "" : String(v)
      }
      nombre = get("nombre")
      email = get("email")
      telefono = get("telefono") || undefined
      password = get("password")
      role = get("role") || undefined
      especialidad = get("especialidad") || undefined
      cedula = get("cedula") || undefined
      city = get("city") || undefined
      address = get("address") || undefined
      clinicName = get("clinicName") || undefined

      const file = formData.get("file")
      if (file instanceof File && file.size > 0) {
        if (file.size > MAX_AVATAR_BYTES) {
          return NextResponse.json(
            { message: "La imagen es demasiado grande. Máximo 5MB." },
            { status: 400 },
          )
        }
        image = await uploadAvatarToCloudinary(file)
      }
    } else {
      const body = await req.json()
      nombre = body.nombre
      email = body.email
      telefono = body.telefono
      password = body.password
      role = body.role
      especialidad = body.especialidad
      cedula = body.cedula
      image = body.image
      city = body.city
      address = body.address
      clinicName = body.clinicName
    }

    // El teléfono es opcional para el rol bloguer pero obligatorio para otros roles
    const isBloguer = role === "bloguer"

    // Validamos con Zod si es un registro de usuario normal
    if (!role || role === "usuario") {
      const { UserRegisterSchema } = await import("@/lib/validations")
      const validation = UserRegisterSchema.safeParse({
        nombre,
        email,
        telefono,
        cedula,
        password,
        city,
        address,
      })

      if (!validation.success) {
        const { formatZodError } = await import("@/lib/validations")
        return NextResponse.json(
          { message: formatZodError(validation.error) },
          { status: 400 },
        )
      }
    } else {
      // Para otros roles, validación básica manual (puedes extender esto luego)
      if (!nombre || !email || !password || (!isBloguer && !telefono)) {
        return NextResponse.json(
          { message: "Todos los campos obligatorios deben estar completos" },
          { status: 400 },
        )
      }
    }

    const normalizedTelefono = normalizeEcuadorPhone(telefono)

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: email.toLowerCase() }, { cedula: cedula }],
      },
    })

    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? "email" : "cédula"
      return NextResponse.json(
        { message: `El ${field} ya está registrado` },
        { status: 400 },
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Lógica de asignación de roles
    let finalRole = "usuario"
    if (email.toLowerCase() === "admin@miauwuauf.com") {
      finalRole = "admin"
    } else if (role === "veterinario") {
      finalRole = "veterinario"
    } else if (role === "bloguer") {
      finalRole = "bloguer"
    }

    const user = await prisma.user.create({
      data: {
        name: nombre,
        email: email.toLowerCase(),
        phone: normalizedTelefono,
        cedula: cedula,
        password: hashedPassword,
        role: finalRole,
        specialty: especialidad,
        image: image,
        city: city,
        address: address,
        clinicName: clinicName,
      },
    })

    await writeAdminAudit({
      action: "create",
      entity: finalRole === "veterinario" ? "veterinario" : "usuario",
      entityId: user.id,
      title:
        finalRole === "veterinario"
          ? "Veterinario creado"
          : "Usuario creado",
      message: `${nombre} (${email.toLowerCase()}) fue creado con rol ${finalRole}.`,
      metadata: {
        role: finalRole,
        email: user.email,
        nombre,
      },
    })

    // Welcome Notification & Email
    try {
      const { createNotification } = await import("@/lib/notification")
      await createNotification({
        userId: user.id,
        title: `¡Bienvenido ${nombre}!`,
        message: `Hola ${nombre}, gracias por unirte a nuestra comunidad. Aquí podrás gestionar todo lo relacionado con MIAUWUAUF.`,
        type: finalRole, // Pasamos el rol para la lógica de plantilla
        userEmail: user.email!,
        sendEmailFlag: true,
        emailSubject: "¡Bienvenido a la familia MIAUWUAUF!",
        metadata: {
          nombre: nombre,
          email: email.toLowerCase(),
          plainPassword: password
        }
      })
    } catch (notifyError) {
      console.error("Error sending welcome notification:", notifyError)
    }

    // [OJO DE DIOS] Notificar a los Admins sobre el nuevo usuario
    try {
      const { notifyAdmins } = await import("@/lib/notification")
      const isVet = finalRole === "veterinario"
      const isBloguerNotify = finalRole === "bloguer"

      let title = "Nuevo miembro en la familia"
      if (isVet) title = "Nuevo veterinario registrado"
      if (isBloguerNotify) title = "Nuevo autor de blog registrado"

      await notifyAdmins({
        title,
        message: isVet
          ? `${nombre} se ha unido como profesional al equipo.`
          : isBloguerNotify
            ? `${nombre} se ha unido como colaborador del blog.`
            : `${nombre} se acaba de unir a MIAUWUAUF.`,
        type: isVet
          ? "veterinario_registration"
          : isBloguerNotify
            ? "bloguer_registration"
            : "user_registration",
        metadata: { resourceId: user.id, nombre },
      })
    } catch (adminError) {
      console.error("Error notifying admins about new user:", adminError)
    }

    return NextResponse.json(
      { message: "Usuario registrado correctamente", userId: user.id },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error en registro:", error)
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 },
    )
  }
}
