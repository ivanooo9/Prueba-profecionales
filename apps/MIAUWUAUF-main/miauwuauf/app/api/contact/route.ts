import { NextResponse } from "next/server"
import { sendEmail } from "@/lib/mail"
import { CONTACT_INFO } from "@/lib/constants"
import { getNeobrutalistTemplate, getFichaTecnica } from "@/lib/email-templates"

/**
 * POST /api/contact
 * Recibe nombre, email y mensaje del formulario de contacto público
 * y envía un correo automático a la cuenta de soporte usando Gmail API.
 * Utiliza la plantilla neobrutalista estándar de notificaciones.
 */
export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json()

    // Validaciones básicas
    if (!email || !message) {
      return NextResponse.json(
        { error: "Email y mensaje son obligatorios." },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "El email proporcionado no es válido." },
        { status: 400 }
      )
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: "El mensaje es demasiado largo (máximo 5000 caracteres)." },
        { status: 400 }
      )
    }

    const subject = `Contacto web — ${name || "Visitante anónimo"}`

    // Ficha técnica con los datos del visitante
    const fichaHtml = getFichaTecnica("DATOS DEL VISITANTE", {
      "Nombre": name || "No proporcionado",
      "Email de contacto": email,
    })

    // Escapar el mensaje para HTML (preservar saltos de línea)
    const safeMessage = message
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>")

    const html = getNeobrutalistTemplate({
      title: "Nuevo mensaje de contacto",
      message: `Se ha recibido un nuevo mensaje desde el formulario de contacto de la web:<br><br><div style="background: #f5f5f5; border-left: 4px solid #e7bef8; border-radius: 0 12px 12px 0; padding: 16px 20px; margin: 16px 0; text-align: left;"><span style="font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #555; display: block; margin-bottom: 8px;">MENSAJE:</span><span style="font-size: 15px; font-weight: 700; color: #222; line-height: 1.6; white-space: pre-wrap;">${safeMessage}</span></div>`,
      fichaHtml,
      actionUrl: `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${encodeURIComponent(`Re: ${subject}`)}`,
      actionText: "Responder al visitante",
    })

    const sent = await sendEmail(CONTACT_INFO.supportEmail, subject, html)

    if (!sent) {
      return NextResponse.json(
        { error: "No se pudo enviar el mensaje. Intenta más tarde." },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[CONTACT_API_ERROR]", error)
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    )
  }
}
