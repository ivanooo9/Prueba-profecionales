import nodemailer from "nodemailer"
import SMTPTransport from "nodemailer/lib/smtp-transport"

async function testEmail() {
  // CONFIGURACIÓN DEFINITIVA DEL USUARIO (CON NUEVO TOKEN)
  const clientId = "295268856331-08td5k5e64o4l07jbaqabmc8fgr29nf1.apps.googleusercontent.com"
  const clientSecret = "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"
  const refreshToken = "1//04V2wteIXaGBfCgYIARAAGAQSNwF-L9Irzr5we_x_-GlCy1oGpDfGyH-wJQiLKChrSI1W4pQUkzrNPg-OUYqiObBl-XLjOvAvKkQ"

  console.log("--- PROBANDO VARIANTE 'UAUF' (con U) ---")
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { type: 'OAuth2', user: "notificaciones.miauwuauf@gmail.com", clientId, clientSecret, refreshToken }
    })
    await transporter.verify()
    console.log(" ÉXITO CON 'UAUF'!")
  } catch (err: unknown) {
    console.log(" FALLÓ 'UAUF'. Error:", err instanceof Error ? err.message : err)
  }

  console.log("--- PROBANDO VARIANTE 'UAF' (sin U) ---")
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { type: 'OAuth2', user: "notificaciones.miauwuaf@gmail.com", clientId, clientSecret, refreshToken }
    })
    await transporter.verify()
    console.log(" ÉXITO CON 'UAF'!")
  } catch (err: unknown) {
    console.log(" FALLÓ 'UAF'. Error:", err instanceof Error ? err.message : err)
  }
}

testEmail()
