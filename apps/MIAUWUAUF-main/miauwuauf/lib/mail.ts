import nodemailer from "nodemailer"
import { stripNotificationEmojis } from "@/lib/email-templates"
import { getSiteUrlForEmail } from "@/lib/email-branding"

function buildPlainTextPart(html: string, subject: string): string {
  const site = getSiteUrlForEmail()
  const stripped = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t\f\v]+/g, " ")
    .trim()
    .slice(0, 12000)

  const head = `MIAUWUAUF\n${subject}\n${"─".repeat(Math.min(32, subject.length + 8))}\n\n`
  if (stripped.length < 24) {
    return `${head}Abre el mensaje en un cliente con HTML o visita: ${site}\n`
  }
  return `${head}${stripped}\n\n—\n${site}\n`
}

/**
 * Función interna para intercambiar el refresh_token por un accessToken de un solo uso.
 * Esto evita usar el puerto SMTP y utiliza HTTPS (Puerto 443).
 */
async function getAccessToken() {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

    if (!clientId || !clientSecret || !refreshToken) {
        throw new Error("Faltan credenciales de Google OAuth2 en el .env");
    }

    const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
        }),
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(`Error al refrescar token: ${JSON.stringify(data)}`);
    }
    return data.access_token;
}

/**
 * Envía un correo electrónico utilizando la API REST de Gmail (HTTPS).
 * Este método es inmune a bloqueos de puertos SMTP tradicionales (465/587).
 */
export async function sendEmail(to: string, subject: string, html: string) {
    const safeSubject = stripNotificationEmojis(subject)
    try {
        const user = process.env.GOOGLE_EMAIL
        const clientId = process.env.GOOGLE_CLIENT_ID
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET
        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

        // Modo Simulación (si no hay credenciales)
        if (!user || !clientId || !clientSecret || !refreshToken) {
            const isDev = process.env.NODE_ENV === 'development';
            if (isDev) {
                console.log("\n---  [EMAIL SIMULADO] ---");
                console.log(`PARA:    ${to}`);
                console.log(`ASUNTO:  ${safeSubject}`);
                console.log(`ESTADO:  Simulado (Sin variables GOOGLE_* en .env)`);
                console.log("---------------------------\n");
            }
            return true;
        }

        // 1. Obtener Access Token dinámico
        const accessToken = await getAccessToken();

        // 2. Generar el contenido del correo (RFC 2822) usando Nodemailer en modo "stream"
        // Esto NO usa la red, solo genera el formato de texto del email.
        const transporter = nodemailer.createTransport({
            streamTransport: true,
            newline: 'unix',
            buffer: true
        });

        const mailData = await transporter.sendMail({
            from: `"MIAUWUAUF" <${user}>`,
            to,
            subject: safeSubject,
            html,
            text: buildPlainTextPart(html, safeSubject),
        });

        // 3. Codificar el mensaje en Base64Url (formato requerido por Gmail API)
        const raw = mailData.message
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        // 4. Enviar mediante la API REST de Gmail usando HTTPS (Puerto 443)
        const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ raw }),
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(`Error en Gmail API: ${JSON.stringify(result)}`);
        }

        console.log(` [MAIL_SUCCESS] Correo enviado a ${to} (ID: ${result.id})`);
        return true;

    } catch (error) {
        console.error(" [MAIL_ERROR] Fallo crítico al enviar email por API REST:", error);
        return false;
    }
}
