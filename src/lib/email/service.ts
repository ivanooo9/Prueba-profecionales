import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";
import nodemailer from "nodemailer";
const MailComposer = require("nodemailer/lib/mail-composer");
import { db } from "../db";
import { CACHE_TTL_SECONDS, cachedFetch, cacheKeyFactory as cacheKey } from "../cache";
import {
  EmailType,
  EmailPayloadMap,
  SendEmailResult,
  EmailConfig,
  SendEmailOptions,
} from "./types";
import {
  baseLayout,
  emailHeader,
  emailFooter,
  escapeHtml,
  greeting,
  paragraph,
  infoTable,
  codeBlock,
  callout,
  ctaButton,
  divider,
  mutedNote,
  contentBody,
  statusPill,
} from "./templates/shared";

// =====================================================================
// Subjects por tipo de email
// =====================================================================

const EMAIL_SUBJECTS: Record<EmailType, string> = {
  "appointment-requested": "Nueva cita solicitada",
  "appointment-status-changed": "Actualización de tu cita",
  "appointment-rescheduled": "Tu cita ha sido reprogramada",
  "professional-created": "Tu cuenta profesional ha sido creada",
  "professional-approved": "¡Tu perfil ha sido aprobado!",
  "professional-rejected": "Actualización de tu solicitud de perfil",
  "payment-registered": "Pago registrado",
  "stale-transfer-payment-admin-alert": "Transferencia pendiente por más de 24 horas",
  "event-enrolled": "Inscripción confirmada",
  "certificate-requested": "Solicitud de certificado registrada",
  "certificate-available": "Tu certificado está disponible",
  "welcome-registration": "Bienvenido a Profesionales Ecuador",
  "password-updated": "Tu contraseña ha sido actualizada",
  "password-reset": "Recuperación de contraseña",
  invoice: "Factura emitida",
  "appointment-legacy": "Actualización de cita",
  "credentials-legacy": "Tus credenciales de acceso",
  "enrollment-legacy": "Inscripción confirmada",
};

// =====================================================================
// Helpers para variantes de estado (colores coherentes)
// =====================================================================

type StatusVariant = "info" | "success" | "warning" | "danger";

/** Mapea un estado crudo a una variante visual. */
function statusToVariant(status: string): StatusVariant {
  const s = (status || "").toUpperCase();
  if (s === "CONFIRMADA" || s === "ATENDIDA" || s === "COMPLETADA") return "success";
  if (s === "CANCELADA" || s === "RECHAZADA" || s === "REJECTED") return "danger";
  if (s === "REPROGRAMADA" || s === "PENDIENTE") return "info";
  return "info";
}

/** Formatea un monto numérico con dos decimales. */
function formatAmount(amount: number, currency: string): string {
  const formatted = amount.toLocaleString("es-EC", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${formatted}`;
}

export class EmailService {
  private config: EmailConfig | null = null;
  private configLoadedAt: number = 0;
  private readonly CONFIG_TTL_MS = CACHE_TTL_SECONDS * 1000;
  private gmailClient: any = null;

  async initialize(): Promise<void> {
    await this.ensureConfig();
  }

  async invalidateConfig(): Promise<void> {
    this.config = null;
    this.gmailClient = null;
    this.configLoadedAt = 0;
  }

  private async ensureConfig(): Promise<EmailConfig> {
    const now = Date.now();
    if (this.config && now - this.configLoadedAt < this.CONFIG_TTL_MS) {
      return this.config;
    }

    const systemConfig = await cachedFetch(cacheKey.systemConfig.singleton(), () =>
      db.systemConfig.findUnique({ where: { id: 1 } })
    );

    let fromEmail = systemConfig?.resendFromEmail || process.env.RESEND_FROM_EMAIL || "soporte@profesionales.ec";
    if (!fromEmail.includes("@")) {
      fromEmail = "soporte@profesionales.ec";
    }
    const fromName = process.env.RESEND_FROM_NAME || "Profesionales Ecuador";
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";

    const resendApiKey = systemConfig?.resendApiKey || process.env.RESEND_API_KEY || "";
    const smtpHost = systemConfig?.smtpHost || process.env.SMTP_HOST || "";
    const smtpPort = systemConfig?.smtpPort || (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587);
    const smtpUser = systemConfig?.smtpUser || process.env.SMTP_USER || "";
    const smtpPass = systemConfig?.smtpPass || process.env.SMTP_PASS || "";
    const smtpSecure = systemConfig?.smtpSecure ?? (process.env.SMTP_SECURE === "true" || smtpPort === 465);

    if (!this.gmailClient) {
      try {
        let clientId = process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID;
        let clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET;
        let redirectUri = process.env.GOOGLE_REDIRECT_URI || process.env.GMAIL_REDIRECT_URI || "http://localhost:3001";
        let refreshToken = process.env.GOOGLE_REFRESH_TOKEN || process.env.GMAIL_REFRESH_TOKEN;
        let accessToken = process.env.GOOGLE_ACCESS_TOKEN || process.env.GMAIL_ACCESS_TOKEN;

        let tokenPathToUpdate: string | null = null;

        // Si no están todas en variables de entorno, buscar archivos JSON en disco
        if (!clientId || !clientSecret || !refreshToken) {
          const findJsonFile = (filename: string): string | null => {
            const possiblePaths = [
              path.join(process.cwd(), "src", "services", filename),
              path.join(process.cwd(), "dist", "services", filename),
              path.join(process.cwd(), filename),
              path.join(__dirname, "..", "..", "services", filename),
              path.join(__dirname, "..", "..", "..", "src", "services", filename),
              path.join(__dirname, "..", "services", filename),
            ];
            for (const p of possiblePaths) {
              if (fs.existsSync(p)) return p;
            }
            return null;
          };

          const secretPath = findJsonFile("client_secret.json");
          const tokenPath = findJsonFile("token.json");

          if (secretPath) {
            try {
              const secretContent = JSON.parse(fs.readFileSync(secretPath, "utf8"));
              const configObj = secretContent.web || secretContent.installed || secretContent;
              if (configObj.client_id) clientId = configObj.client_id;
              if (configObj.client_secret) clientSecret = configObj.client_secret;
              if (configObj.redirect_uris && configObj.redirect_uris[0]) {
                redirectUri = configObj.redirect_uris[0];
              }
            } catch (err) {
              console.warn("[EmailService] Error parsing client_secret.json:", err);
            }
          }

          if (tokenPath) {
            try {
              tokenPathToUpdate = tokenPath;
              const tokenContent = JSON.parse(fs.readFileSync(tokenPath, "utf8"));
              if (tokenContent.refresh_token) refreshToken = tokenContent.refresh_token;
              if (tokenContent.access_token) accessToken = tokenContent.access_token;
            } catch (err) {
              console.warn("[EmailService] Error parsing token.json:", err);
            }
          }
        }

        if (clientId && clientSecret && refreshToken) {
          const oAuth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            redirectUri
          );

          oAuth2Client.setCredentials({
            refresh_token: refreshToken,
            access_token: accessToken,
          });

          oAuth2Client.on("tokens", (tokens) => {
            try {
              if (tokenPathToUpdate && fs.existsSync(tokenPathToUpdate)) {
                const current = JSON.parse(fs.readFileSync(tokenPathToUpdate, "utf8"));
                const updated = { ...current, ...tokens };
                fs.writeFileSync(tokenPathToUpdate, JSON.stringify(updated, null, 2));
                console.log("[EmailService] Google OAuth tokens refreshed & saved to disk.");
              } else {
                console.log("[EmailService] Google OAuth tokens refreshed in memory.");
              }
            } catch (tokenErr) {
              console.warn("[EmailService] Token refreshed in memory (disk write skipped/failed):", tokenErr);
            }
          });

          this.gmailClient = google.gmail({ version: "v1", auth: oAuth2Client });
          console.log("[EmailService] Gmail API client successfully initialized.");
        } else {
          console.warn("[EmailService] Incomplete Google OAuth credentials. Missing clientId, clientSecret, or refreshToken.");
        }
      } catch (err) {
        console.error("[EmailService] Error initializing Gmail client:", err);
      }
    }

    this.config = {
      apiKey: "gmail-api",
      fromEmail,
      fromName,
      baseUrl,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpSecure
    };

    this.configLoadedAt = now;
    return this.config;
  }

  private async createRawMessage(from: string, to: string, subject: string, html: string, attachments?: any[]): Promise<string> {
    const mailOptions = {
      from,
      to,
      subject,
      html,
      attachments
    };
    
    // @ts-ignore
    const mail = new MailComposer(mailOptions);
    const message = await mail.compile().build();
    return Buffer.from(message).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  async sendEmail<T extends EmailType>(
    type: T,
    to: string,
    payload: EmailPayloadMap[T],
    options?: SendEmailOptions
  ): Promise<SendEmailResult> {
    try {
      const config = await this.ensureConfig();
      const subject = options?.subject || EMAIL_SUBJECTS[type] || "Notificación";
      const html = this.renderHtml(type, payload, config);

      return await this.dispatchEmail({
        to,
        subject,
        html,
        attachments: options?.attachments,
        config
      });
    } catch (err: any) {
      console.error(`[EmailService] Excepción al enviar ${type} a ${to}:`, err);
      return { success: false, error: err.message || String(err) };
    }
  }

  async sendRawEmail(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<SendEmailResult> {
    try {
      const config = await this.ensureConfig();
      return await this.dispatchEmail({
        to: params.to,
        subject: params.subject,
        html: params.html,
        config
      });
    } catch (err: any) {
      console.error(`[EmailService] Excepción al enviar raw email a ${params.to}:`, err);
      return { success: false, error: err.message || String(err) };
    }
  }

  private async dispatchEmail(params: {
    to: string;
    subject: string;
    html: string;
    attachments?: any[];
    config: EmailConfig;
  }): Promise<SendEmailResult> {
    const { to, subject, html, attachments, config } = params;

    const errors: string[] = [];

    // 1. Probar Gmail API (Google OAuth2)
    if (this.gmailClient) {
      try {
        const fromEmailToUse = process.env.GMAIL_USER || config.fromEmail || "profesionalesecuadoroficial@gmail.com";
        const senderName = process.env.SENDER_NAME || config.fromName || "Profesionales Ecuador";
        const from = `"${senderName}" <${fromEmailToUse}>`;

        const raw = await this.createRawMessage(from, to, subject, html, attachments);
        const res = await this.gmailClient.users.messages.send({
          userId: "me",
          requestBody: { raw }
        });

        if (res.data && res.data.id) {
          return { success: true, messageId: res.data.id };
        }
      } catch (gmailErr: any) {
        const msg = `Gmail API Error: ${gmailErr.message || gmailErr}`;
        console.warn(`[EmailService] ⚠️ Gmail API no pudo entregar el correo: ${msg}`);
        errors.push(msg);
      }
    } else {
      errors.push("Gmail API (Google OAuth) no está inicializado.");
    }

    // 2. Si el administrador configuró un Servidor SMTP -> Probar SMTP
    if (config.smtpHost && config.smtpUser && config.smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: config.smtpHost,
          port: config.smtpPort,
          secure: config.smtpSecure,
          auth: {
            user: config.smtpUser,
            pass: config.smtpPass
          }
        });

        const mailOptions = {
          from: `${config.fromName} <${config.smtpUser}>`,
          to,
          subject,
          html,
          attachments
        };

        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
      } catch (smtpErr: any) {
        const msg = `SMTP Error: ${smtpErr.message || smtpErr}`;
        console.warn(`[EmailService] ⚠️ Servidor SMTP falló: ${msg}`);
        errors.push(msg);
      }
    }

    const finalError = errors.length > 0 ? errors.join(" | ") : "Ningún proveedor de correo activo (Google OAuth o SMTP).";
    console.error(`[EmailService] ❌ Falló el envío de correo a ${to}. Detalle: ${finalError}`);
    return {
      success: false,
      error: finalError
    };
  }

  private renderHtml<T extends EmailType>(
    type: T,
    payload: EmailPayloadMap[T],
    config: EmailConfig
  ): string {
    const p = payload as any;
    const recipientName = escapeHtml(
      p.recipientName || p.customerName || p.userName || p.professionalName || "Usuario"
    );

    // Header y footer compartidos
    const header = emailHeader(config.fromName);
    const footer = emailFooter();

    let body = "";

    switch (type) {
      // ===============================================================
      // 1. Cita solicitada
      // ===============================================================
      case "appointment-requested": {
        const isForPatient = !!p.recipientName && p.recipientName === p.customerName;
        const intro = isForPatient
          ? "Hemos recibido tu solicitud de cita. A continuación encontrarás los detalles para tu registro."
          : `Has recibido una nueva solicitud de cita. Revisa los detalles a continuación y confírmala desde tu panel.`;

        const motivoRow = p.motivo
          ? [{ label: "Motivo de la consulta", value: escapeHtml(p.motivo) }]
          : [];

        body = contentBody(`
          ${greeting(recipientName)}
          ${paragraph(intro)}
          ${infoTable([
            { label: isForPatient ? "Profesional" : "Paciente", value: escapeHtml(isForPatient ? p.professionalName : p.customerName) },
            { label: "Fecha", value: escapeHtml(p.date) },
            { label: "Hora", value: escapeHtml(p.time) },
            ...motivoRow,
          ])}
          ${isForPatient
            ? callout("El profesional confirmará tu cita en breve. Te avisaremos por correo cuando haya una respuesta.", "info")
            : callout("Recuerda confirmar o rechazar esta solicitud desde tu panel de profesional para que el paciente sea notificado.", "info")}
          ${p.appointmentUrl ? ctaButton(p.appointmentUrl, isForPatient ? "Ver detalles de mi cita" : "Ver solicitud de cita") : ""}
        `);
        break;
      }

      // ===============================================================
      // 2. Estado de cita cambiado
      // ===============================================================
      case "appointment-status-changed": {
        const statusVariant = statusToVariant(p.status);
        const statusLabel = p.statusLabel || p.status || "Actualizada";
        const isCancelled = (p.status || "").toUpperCase() === "CANCELADA";
        const isCompleted = (p.status || "").toUpperCase() === "ATENDIDA" || (p.status || "").toUpperCase() === "COMPLETADA";

        const motivoRow = p.motivo
          ? [{ label: "Motivo", value: escapeHtml(p.motivo) }]
          : [];

        let extraNote = "";
        if (isCompleted) {
          extraNote = callout("Gracias por tu visita. Si necesitas atención nuevamente, puedes agendar una nueva cita desde la plataforma.", "success");
        } else if (isCancelled) {
          extraNote = callout("Lamentamos los inconvenientes. Si deseas reprogramar, puedes hacerlo desde la plataforma.", "info");
        }

        body = contentBody(`
          ${greeting(recipientName)}
          <p style="font-size:15px; line-height:1.65; color:#374151; margin:0 0 20px 0;">
            Tu cita ha sido actualizada. El nuevo estado es:
          </p>
          <div style="text-align:center; margin:8px 0 24px 0;">
            ${statusPill(statusLabel, statusVariant)}
          </div>
          ${infoTable([
            { label: "Profesional", value: escapeHtml(p.professionalName) },
            { label: "Fecha", value: escapeHtml(p.date) },
            { label: "Hora", value: escapeHtml(p.time) },
            ...motivoRow,
          ])}
          ${extraNote}
          ${p.appointmentUrl ? ctaButton(p.appointmentUrl, "Ver detalles de la cita") : ""}
        `);
        break;
      }

      // ===============================================================
      // 3. Cita reprogramada
      // ===============================================================
      case "appointment-rescheduled": {
        const byWho = p.rescheduledBy
          ? (p.rescheduledBy === "cliente"
              ? "La reprogramación fue solicitada por el paciente."
              : p.rescheduledBy === "profesional"
                ? "La reprogramación fue solicitada por el profesional."
                : "La reprogramación fue realizada por un administrador.")
          : "";

        const motivoRow = p.motivo
          ? [{ label: "Motivo", value: escapeHtml(p.motivo) }]
          : [];

        body = contentBody(`
          ${greeting(recipientName)}
          ${paragraph("Tu cita ha sido reprogramada. A continuación puedes ver el horario anterior y el nuevo.")}
          ${infoTable([
            { label: "Anterior", value: `<span style="color:#6b7280; text-decoration:line-through;">${escapeHtml(p.oldDate)} &middot; ${escapeHtml(p.oldTime)}</span>` },
            { label: "Nueva", value: `<span style="color:#0A3C84;">${escapeHtml(p.newDate)} &middot; ${escapeHtml(p.newTime)}</span>` },
            { label: "Profesional", value: escapeHtml(p.professionalName) },
            { label: "Paciente", value: escapeHtml(p.customerName) },
            ...motivoRow,
          ])}
          ${byWho ? callout(byWho, "info") : ""}
          ${p.appointmentUrl ? ctaButton(p.appointmentUrl, "Ver cita actualizada") : ""}
        `);
        break;
      }

      // ===============================================================
      // 4. Cuenta profesional creada
      // ===============================================================
      case "professional-created": {
        const credentialsBlock = p.temporaryPassword
          ? codeBlock(escapeHtml(p.temporaryPassword), "Contraseña temporal")
          : "";

        const accessRows = [
          { label: "Correo de acceso", value: escapeHtml(p.email) },
        ];

        body = contentBody(`
          ${greeting(recipientName)}
          ${paragraph("Tu cuenta profesional en Profesionales Ecuador ha sido creada. Ya puedes acceder a la plataforma con las credenciales que aparecen a continuación.")}
          ${infoTable(accessRows)}
          ${credentialsBlock}
          ${callout("Al iniciar sesión por primera vez, el sistema te pedirá que cambies tu contraseña por una nueva.", "info")}
          ${p.loginUrl ? ctaButton(p.loginUrl, "Iniciar sesión") : ""}
          ${p.profileUrl ? mutedNote(`También puedes completar tu perfil público desde <a href="${escapeHtml(p.profileUrl)}" style="color:#0A3C84; text-decoration:none;">este enlace</a>.`) : ""}
        `);
        break;
      }

      // ===============================================================
      // 5. Perfil profesional aprobado
      // ===============================================================
      case "professional-approved": {
        const approvedRow = p.approvedAt
          ? [{ label: "Fecha de aprobación", value: escapeHtml(p.approvedAt) }]
          : [];

        const directorioUrl = p.publicProfileUrl;

        body = contentBody(`
          ${greeting(recipientName)}
          <p style="font-size:18px; line-height:1.5; color:${statusToVariant("CONFIRMADA") === "success" ? "#065f46" : "#1f2937"}; margin:0 0 20px 0; font-weight:600;">
            ¡Tu perfil ha sido aprobado!
          </p>
          ${paragraph("Tu perfil profesional ya es visible en el directorio de Profesionales Ecuador y puedes comenzar a recibir solicitudes de cita.")}
          ${infoTable(approvedRow)}
          ${directorioUrl ? ctaButton(directorioUrl, "Ver mi perfil público") : (p.loginUrl ? ctaButton(p.loginUrl, "Iniciar sesión") : "")}
        `);
        break;
      }

      // ===============================================================
      // 6. Perfil profesional rechazado
      // ===============================================================
      case "professional-rejected": {
        const reasonBlock = p.rejectionReason
          ? callout(`<strong>Motivo:</strong> ${escapeHtml(p.rejectionReason)}`, "warning")
          : "";

        const supportBlock = p.supportEmail
          ? `<p style="font-size:14px; color:#374151; line-height:1.6; margin:16px 0 0 0;">Si consideras que se trata de un error o tienes preguntas, escríbenos a <a href="mailto:${escapeHtml(p.supportEmail)}" style="color:#0A3C84; text-decoration:none;">${escapeHtml(p.supportEmail)}</a>.</p>`
          : `<p style="font-size:14px; color:#374151; line-height:1.6; margin:16px 0 0 0;">Si consideras que se trata de un error, puedes contactarnos para revisar tu caso.</p>`;

        body = contentBody(`
          ${greeting(recipientName)}
          ${paragraph("Gracias por tu interés en formar parte de Profesionales Ecuador. Tras revisar tu solicitud, lamentamos informarte que tu perfil profesional no ha sido aprobado en esta ocasión.")}
          ${reasonBlock}
          ${supportBlock}
        `);
        break;
      }

      // ===============================================================
      // 7. Pago registrado
      // ===============================================================
      case "payment-registered": {
        const referenceRow = p.reference
          ? [{ label: "Referencia", value: escapeHtml(p.reference) }]
          : [];

        body = contentBody(`
          ${greeting(recipientName)}
          ${paragraph("Hemos registrado tu pago correctamente. A continuación encontrarás el detalle de la transacción.")}
          ${infoTable([
            { label: "Concepto", value: escapeHtml(p.concept) },
            { label: "Monto", value: escapeHtml(formatAmount(Number(p.amount) || 0, p.currency)) },
            { label: "Método de pago", value: escapeHtml(p.paymentMethod) },
            { label: "Fecha del pago", value: escapeHtml(p.paymentDate) },
            ...referenceRow,
          ])}
          ${callout("Tu pago está en proceso de validación. Te notificaremos por correo cuando haya sido confirmado.", "info")}
          ${p.invoiceUrl ? ctaButton(p.invoiceUrl, "Ver comprobante") : ""}
        `);
        break;
      }

      // ===============================================================
      // 8. Alerta admin: transferencia pendiente más de 24 horas
      // ===============================================================
      case "stale-transfer-payment-admin-alert": {
        const referenceRow = p.reference
          ? [{ label: "Referencia", value: escapeHtml(p.reference) }]
          : [];

        body = contentBody(`
          ${greeting(recipientName)}
          ${paragraph("Hay un pago por transferencia que lleva más de 24 horas pendiente de revisión en el panel administrativo.")}
          ${infoTable([
            { label: "ID de pago", value: `#${escapeHtml(String(p.paymentId))}` },
            { label: "Tipo", value: escapeHtml(p.paymentType) },
            { label: "Solicitante", value: escapeHtml(p.payerName) },
            { label: "Monto", value: escapeHtml(formatAmount(Number(p.amount) || 0, p.currency)) },
            { label: "Banco / método", value: escapeHtml(p.bankName) },
            { label: "Fecha de registro", value: escapeHtml(p.requestedAt) },
            { label: "Antigüedad aproximada", value: `${Number(p.ageHours) || 0} horas` },
            ...referenceRow,
          ])}
          ${callout("Revisa el comprobante y aprueba o rechaza el pago para evitar retrasos al usuario.", "warning")}
          ${p.dashboardUrl ? ctaButton(p.dashboardUrl, "Revisar pago en el panel") : ""}
        `);
        break;
      }

      // ===============================================================
      // 9. Inscripción a evento
      // ===============================================================
      case "event-enrolled": {
        const modalityRow = p.modality
          ? [{ label: "Modalidad", value: escapeHtml(p.modality) }]
          : [];
        const endDateRow = p.endDate
          ? [{ label: "Fecha de finalización", value: escapeHtml(p.endDate) }]
          : [];

        const credentialsBlock = p.temporaryPassword
          ? codeBlock(escapeHtml(p.temporaryPassword), "Contraseña temporal de acceso")
          : "";

        body = contentBody(`
          ${greeting(recipientName)}
          ${paragraph("Tu inscripción ha sido confirmada. Estos son los detalles del evento:")}
          ${infoTable([
            { label: "Evento", value: escapeHtml(p.eventName) },
            { label: "Tipo", value: escapeHtml(p.eventType) },
            { label: "Fecha de inicio", value: escapeHtml(p.startDate) },
            ...endDateRow,
            ...modalityRow,
          ])}
          ${callout("Tu cupo ha sido reservado. Guarda este correo como comprobante de inscripción.", "success")}
          ${p.accessUrl ? ctaButton(p.accessUrl, "Acceder al evento") : ""}
          ${credentialsBlock}
          ${p.loginUrl ? ctaButton(p.loginUrl, "Iniciar sesión en la plataforma") : ""}
          ${p.temporaryPassword ? mutedNote("Al ingresar por primera vez, deberás cambiar esta contraseña por una nueva.", "center") : ""}
        `);
        break;
      }

      // ===============================================================
      // 9. Certificado solicitado
      // ===============================================================
      case "certificate-requested": {
        body = contentBody(`
          ${greeting(recipientName)}
          ${paragraph("Hemos recibido tu solicitud de certificado. La estamos revisando y te avisaremos cuando esté disponible para descargar.")}
          ${infoTable([
            { label: "Evento", value: escapeHtml(p.eventName) },
            { label: "Fecha de solicitud", value: escapeHtml(p.requestDate) },
          ])}
          ${callout("Estado actual: <strong>En revisión</strong>. Los certificados suelen procesarse en un plazo de 24 a 48 horas hábiles.", "info")}
        `);
        break;
      }

      // ===============================================================
      // 10. Certificado disponible
      // ===============================================================
      case "certificate-available": {
        const issuedRow = p.issuedAt
          ? [{ label: "Fecha de emisión", value: escapeHtml(p.issuedAt) }]
          : [];

        body = contentBody(`
          ${greeting(recipientName)}
          <p style="font-size:18px; line-height:1.5; color:#065f46; margin:0 0 20px 0; font-weight:600;">
            ¡Tu certificado está disponible!
          </p>
          ${paragraph("Puedes descargar tu certificado cuando lo necesites desde los siguientes enlaces:")}
          ${infoTable([
            { label: "Evento", value: escapeHtml(p.eventName) },
            ...issuedRow,
          ])}
          ${ctaButton(p.certificateUrl, "Descargar certificado")}
          ${p.downloadUrl ? mutedNote(`Si el botón no funciona, también puedes usar este enlace directo: <a href="${escapeHtml(p.downloadUrl)}" style="color:#0A3C84; text-decoration:none; word-break:break-all;">${escapeHtml(p.downloadUrl)}</a>`, "center") : ""}
        `);
        break;
      }

      // ===============================================================
      // 11. Bienvenida
      // ===============================================================
      case "welcome-registration": {
        const credentialsBlock = p.temporaryPassword
          ? codeBlock(escapeHtml(p.temporaryPassword), "Contraseña temporal")
          : "";

        // Mensaje según el tipo de usuario
        let statusMessage = "";
        let ctaText = "Iniciar sesión";
        let ctaUrl = p.loginUrl || "";

        if (p.profileStatus === "PENDIENTE") {
          // Nuevo profesional con perfil en revisión (no debe tener botón de login)
          statusMessage = callout(
            "Tu perfil profesional está actualmente en proceso de revisión por nuestro equipo. Te enviaremos un correo electrónico notificando el estado de tu perfil (aprobado o rechazado) en las próximas horas. Hasta entonces, no podrás acceder completamente a la plataforma.",
            "info"
          );
        } else if (p.profileStatus === "APROBADO") {
          // Nuevo profesional con plan pago (ya aprobado, tampoco botón de login)
          statusMessage = callout(
            "Tu perfil profesional está siendo revisado. Te enviaremos un correo electrónico notificando el estado de tu perfil en las próximas horas. Hasta entonces, no podrás acceder completamente a la plataforma.",
            "info"
          );
        } else {
          // Usuario normal (cliente): comportamiento original
          statusMessage = paragraph(
            "Ya puedes buscar profesionales, agendar citas, inscribirte a eventos y acceder a todo el contenido de la plataforma."
          );
          ctaText = "Explorar la plataforma";
          ctaUrl = p.loginUrl || "";
        }

        const ctaBlock = (p.profileStatus === "PENDIENTE" || p.profileStatus === "APROBADO" || !ctaUrl)
          ? ""
          : ctaButton(ctaUrl, ctaText);

        body = contentBody(`
          ${greeting(recipientName)}
          <p style="font-size:18px; line-height:1.5; color:#0A3C84; margin:0 0 20px 0; font-weight:600;">
            ¡Bienvenido a Profesionales Ecuador!
          </p>
          ${paragraph("Tu cuenta ha sido creada correctamente. A continuación te proporcionamos tus credenciales de acceso.")}
          ${infoTable([
            { label: "Correo de acceso", value: escapeHtml(p.email) },
          ])}
          ${credentialsBlock}
          ${statusMessage}
          ${ctaBlock}
        `);
        break;
      }

      // ===============================================================
      // 12. Contraseña actualizada
      // ===============================================================
      case "password-updated": {
        const supportLine = p.supportEmail
          ? `Si no realizaste este cambio, contacta a soporte de inmediato escribiendo a <a href="mailto:${escapeHtml(p.supportEmail)}" style="color:#991b1b; text-decoration:none; font-weight:600;">${escapeHtml(p.supportEmail)}</a>.`
          : "Si no realizaste este cambio, contacta a soporte de inmediato para proteger tu cuenta.";

        body = contentBody(`
          ${greeting(recipientName)}
          ${paragraph("Te confirmamos que la contraseña de tu cuenta ha sido actualizada correctamente.")}
          ${infoTable([
            { label: "Fecha del cambio", value: escapeHtml(p.updateDate) },
          ])}
          ${divider()}
          ${callout(`<strong>¿No fuiste tú?</strong> ${supportLine}`, "danger")}
        `);
        break;
      }

      // ===============================================================
      // 13. Recuperar contraseña
      // ===============================================================
      case "password-reset": {
        body = contentBody(`
          ${greeting(recipientName)}
          ${paragraph("Recibimos una solicitud para restablecer la contraseña de tu cuenta. Si la realizaste tú, haz clic en el siguiente botón para definir una nueva contraseña.")}
          ${ctaButton(p.resetUrl, "Restablecer mi contraseña")}
          ${callout(`Este enlace es de un solo uso y expira en <strong>${p.expiresInMinutes} minutos</strong>.`, "info")}
          ${mutedNote("Si no solicitaste este cambio, puedes ignorar este mensaje. Tu contraseña actual seguirá siendo válida.", "center")}
        `);
        break;
      }

      // ===============================================================
      // 14. Factura electrónica
      // ===============================================================
      case "invoice": {
        body = contentBody(`
          ${greeting(escapeHtml(p.customerName))}
          ${paragraph(`Adjuntamos tu factura electrónica <strong>${escapeHtml(p.invoiceNumber)}</strong> emitida por <strong>${escapeHtml(p.businessName)}</strong>.`)}
          ${infoTable([
            { label: "Empresa emisora", value: escapeHtml(p.businessName) },
            { label: "Número de factura", value: escapeHtml(p.invoiceNumber) },
            { label: "Cliente", value: escapeHtml(p.customerName) },
          ])}
          <p style="font-size:14px; color:#374151; line-height:1.6; margin:20px 0 8px 0; font-weight:600;">Archivos adjuntos:</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px 0;">
            <tr>
              <td style="padding:10px 14px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px; font-size:14px; color:#1f2937;">
                <strong>PDF (RIDE)</strong> &mdash; Representación visual imprimible de la factura.
              </td>
            </tr>
            <tr><td style="height:8px; font-size:0; line-height:0;">&nbsp;</td></tr>
            <tr>
              <td style="padding:10px 14px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px; font-size:14px; color:#1f2937;">
                <strong>XML</strong> &mdash; Documento tributario electrónico autorizado por el SRI.
              </td>
            </tr>
          </table>
          ${mutedNote("Documento autorizado por el Servicio de Rentas Internas (SRI) del Ecuador.", "left")}
        `);
        break;
      }

      // ===============================================================
      // 15. Cita legacy
      // ===============================================================
      case "appointment-legacy": {
        const motivoRow = p.motivo
          ? [{ label: "Motivo", value: escapeHtml(p.motivo) }]
          : [];

        body = contentBody(`
          ${greeting(escapeHtml(p.customerName))}
          ${paragraph("Hay una actualización sobre tu cita. Revisa los detalles a continuación:")}
          ${infoTable([
            { label: "Profesional", value: escapeHtml(p.professionalName) },
            { label: "Fecha", value: escapeHtml(p.date) },
            { label: "Hora", value: escapeHtml(p.time) },
            { label: "Estado", value: escapeHtml(p.status) },
            ...motivoRow,
          ])}
        `);
        break;
      }

      // ===============================================================
      // 16. Credenciales legacy
      // ===============================================================
      case "credentials-legacy": {
        const credentialsBlock = codeBlock(escapeHtml(p.tempPassword), "Contraseña temporal");
        const accessRows = p.email
          ? [{ label: "Correo de acceso", value: escapeHtml(p.email) }]
          : [];

        body = contentBody(`
          ${greeting("")}
          ${paragraph("Hemos generado tus credenciales de acceso a la plataforma. Úsalas para ingresar al evento:")}
          ${infoTable([
            { label: "Evento", value: escapeHtml(p.eventName) },
            { label: "Tipo", value: escapeHtml(p.eventType) },
            ...accessRows,
          ])}
          ${credentialsBlock}
          ${callout("Al ingresar por primera vez, el sistema te pedirá que completes la configuración de tu cuenta.", "info")}
          ${p.loginUrl ? ctaButton(p.loginUrl, "Iniciar sesión") : ""}
          ${mutedNote("Por seguridad, te recomendamos cambiar esta contraseña después de tu primer inicio de sesión.", "center")}
        `);
        break;
      }

      // ===============================================================
      // 17. Inscripción legacy
      // ===============================================================
      case "enrollment-legacy": {
        body = contentBody(`
          ${greeting(escapeHtml(p.userName))}
          <p style="font-size:18px; line-height:1.5; color:#065f46; margin:0 0 20px 0; font-weight:600;">
            ¡Inscripción confirmada!
          </p>
          ${paragraph("Te confirmamos que tu inscripción al evento ha sido registrada con éxito.")}
          ${infoTable([
            { label: "Evento", value: escapeHtml(p.eventName) },
            { label: "Tipo", value: escapeHtml(p.eventType) },
          ])}
          ${callout("Pronto recibirás más información sobre el evento en tu correo electrónico.", "success")}
        `);
        break;
      }

      default:
        body = contentBody(`
          ${greeting("")}
          ${paragraph("Tienes una nueva notificación en tu cuenta de Profesionales Ecuador.")}
        `);
    }

    return baseLayout(header + body + footer, EMAIL_SUBJECTS[type] || "Notificación");
  }

  // =====================================================================
  // Métodos específicos (convenience wrappers)
  // =====================================================================

  async sendAppointmentRequested(to: string, payload: EmailPayloadMap["appointment-requested"], options?: SendEmailOptions): Promise<SendEmailResult> {
    return this.sendEmail("appointment-requested", to, payload, options);
  }

  async sendAppointmentStatusChanged(to: string, payload: EmailPayloadMap["appointment-status-changed"], options?: SendEmailOptions): Promise<SendEmailResult> {
    return this.sendEmail("appointment-status-changed", to, payload, options);
  }

  async sendAppointmentRescheduled(to: string, payload: EmailPayloadMap["appointment-rescheduled"], options?: SendEmailOptions): Promise<SendEmailResult> {
    return this.sendEmail("appointment-rescheduled", to, payload, options);
  }

  async sendProfessionalCreated(to: string, payload: EmailPayloadMap["professional-created"], options?: SendEmailOptions): Promise<SendEmailResult> {
    return this.sendEmail("professional-created", to, payload, options);
  }

  async sendProfessionalApproved(to: string, payload: EmailPayloadMap["professional-approved"], options?: SendEmailOptions): Promise<SendEmailResult> {
    return this.sendEmail("professional-approved", to, payload, options);
  }

  async sendProfessionalRejected(to: string, payload: EmailPayloadMap["professional-rejected"], options?: SendEmailOptions): Promise<SendEmailResult> {
    return this.sendEmail("professional-rejected", to, payload, options);
  }

  async sendPaymentRegistered(to: string, payload: EmailPayloadMap["payment-registered"], options?: SendEmailOptions): Promise<SendEmailResult> {
    return this.sendEmail("payment-registered", to, payload, options);
  }

  async sendStaleTransferPaymentAdminAlert(to: string, payload: EmailPayloadMap["stale-transfer-payment-admin-alert"], options?: SendEmailOptions): Promise<SendEmailResult> {
    return this.sendEmail("stale-transfer-payment-admin-alert", to, payload, options);
  }

  async sendEventEnrolled(to: string, payload: EmailPayloadMap["event-enrolled"], options?: SendEmailOptions): Promise<SendEmailResult> {
    return this.sendEmail("event-enrolled", to, payload, options);
  }

  async sendCertificateRequested(to: string, payload: EmailPayloadMap["certificate-requested"], options?: SendEmailOptions): Promise<SendEmailResult> {
    return this.sendEmail("certificate-requested", to, payload, options);
  }

  async sendCertificateAvailable(to: string, payload: EmailPayloadMap["certificate-available"], options?: SendEmailOptions): Promise<SendEmailResult> {
    return this.sendEmail("certificate-available", to, payload, options);
  }

  async sendWelcomeRegistration(to: string, payload: EmailPayloadMap["welcome-registration"], options?: SendEmailOptions): Promise<SendEmailResult> {
    return this.sendEmail("welcome-registration", to, payload, options);
  }

  async sendPasswordUpdated(to: string, payload: EmailPayloadMap["password-updated"], options?: SendEmailOptions): Promise<SendEmailResult> {
    return this.sendEmail("password-updated", to, payload, options);
  }

  async sendPasswordReset(to: string, payload: EmailPayloadMap["password-reset"], options?: SendEmailOptions): Promise<SendEmailResult> {
    return this.sendEmail("password-reset", to, payload, options);
  }

  // Legacy wrappers
  async sendInvoice(to: string, payload: EmailPayloadMap["invoice"], options?: SendEmailOptions): Promise<SendEmailResult> {
    return this.sendEmail("invoice", to, payload, options);
  }

  async sendAppointmentLegacy(to: string, payload: EmailPayloadMap["appointment-legacy"], options?: SendEmailOptions): Promise<SendEmailResult> {
    return this.sendEmail("appointment-legacy", to, payload, options);
  }

  async sendCredentialsLegacy(to: string, payload: EmailPayloadMap["credentials-legacy"], options?: SendEmailOptions): Promise<SendEmailResult> {
    return this.sendEmail("credentials-legacy", to, payload, options);
  }

  async sendEnrollmentLegacy(to: string, payload: EmailPayloadMap["enrollment-legacy"], options?: SendEmailOptions): Promise<SendEmailResult> {
    return this.sendEmail("enrollment-legacy", to, payload, options);
  }
}

export const emailService = new EmailService();
