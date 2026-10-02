import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { sendEmail } from "@/lib/mail";
import { 
  getWelcomeTemplate, 
  getNeobrutalistTemplate, 
  getMedicalRecordTemplate,
  getAdoptionStatusTemplate,
  getNewPetTemplate,
  getAppointmentTemplate,
  getDeliveredOrderTemplate,
  getMedicalAccessRequestTemplate,
  OrderItemTemplate,
  stripNotificationEmojis,
} from "@/lib/email-templates";
import { getStoreTaxSettings } from "@/lib/store-settings.server";
import { formatDate } from "@/lib/utils";

/**
 * Notificación inteligente para MIAUWUAUF
 */

export interface NotificationMetadata {
  nombre?: string;
  petName?: string;
  fecha?: string;
  hora?: string;
  veterinario?: string;
  motivo?: string;
  sede?: string;
  clinica?: string;
  tipo?: string;
  raza?: string;
  genero?: string;
  edad?: string | number;
  peso?: string | number;
  resourceId?: string | number;
  blogTitle?: string;
  orderId?: string;
  userName?: string;
  email?: string;
  plainPassword?: string;
  petData?: {
    nombre: string;
    tipo: string;
    raza: string;
    edad?: string;
    peso?: string | number;
    sexo?: string;
    esterilizado?: string;
  };
  permissionId?: string;
  petId?: string;
  vetName?: string;
  vetId?: string;
  /** Nombre del consultorio del veterinario */
  vetClinicName?: string | null;
  /** Dirección del consultorio del veterinario */
  vetAddress?: string | null;
  /** Teléfono del veterinario */
  vetPhone?: string | null;
  medicalInAppUrl?: string;
  medicalLinkAccept?: string;
  medicalLinkReject?: string;
  /** Nombre del dueño de la mascota (correo de citas) */
  duenoName?: string;
  /** "owner" = email al usuario; "vet" = email al veterinario asignado */
  emailAudience?: "owner" | "vet";
  emailTitle?: string;
  /** Campos para bitácora administrativa (Admin Audit) */
  entity?: string;
  entityId?: string;
  /** IP del visitante para alertas de mascota encontrada (pet_found) */
  ip?: string;
  // --- Campos médicos estructurados para emails detallados ---
  /** Diagnóstico */
  diagnostico?: string;
  motivoConsulta?: string;
  fRespiratoria?: string;
  fCardiaca?: string;
  temperatura?: string;
  pulso?: string;
  tiempoLlenado?: string;
  ganglios?: string;
  mucosas?: string;
  actitud?: string;
  sistemas?: string;
  hallazgosClinicos?: string;
  listaProblemas?: string;
  diagnosticosDiferenciales?: string;
  examenesComplementarios?: string;
  hallazgosPruebas?: string;
  /** Tratamiento */
  medicamento?: string;
  dosis?: string;
  duracion?: string;
  notas?: string;
  /** Vacuna */
  vacunaNombre?: string;
  /** Preventivo */
  tipoPreventivo?: string;
  numeroDosis?: string;
  proximaFecha?: string;
}

function absoluteActionUrl(href: string | undefined, appUrl: string, fallback: string) {
  const path = (href && href.trim()) || fallback
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  return `${appUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`
}

interface NotificationOptions {
  userId?: string | null;
  title: string;
  message: string;
  type?: string;
  userEmail?: string;
  sendEmailFlag?: boolean;
  emailSubject?: string;
  actionUrl?: string;
  actionText?: string;
  metadata?: NotificationMetadata;
  orderData?: {
    orderId: string;
    orderCode?: string;
    items: OrderItemTemplate[];
    total: number;
    ivaRate?: number;
    taxName?: string;
    taxEnabled?: boolean;
    surchargeRate?: number;
    surchargeEnabled?: boolean;
    clienteNombre?: string;
    cedula?: string;
    telefono?: string;
    metodoPago?: string;
  };
}

export async function createNotification({
  userId,
  title,
  message,
  type = "info",
  userEmail,
  sendEmailFlag = false,
  emailSubject,
  actionUrl,
  actionText,
  metadata,
  orderData
}: NotificationOptions) {
  const cleanTitle = stripNotificationEmojis(title)
  const cleanMessage = stripNotificationEmojis(message)
  try {
    // 1. Notificación en Base de Datos (In-app)
    let createdNotification = null;
    if (userId) {
      createdNotification = await prisma.notification.create({
        data: {
          userId,
          title: cleanTitle,
          message: cleanMessage,
          type: type || "info",
          actionUrl: actionUrl || null,
          metadata: metadata ? (metadata as unknown as Prisma.InputJsonValue) : null
        }
      });
    }

    // 2. Notificación por Correo Electrónico
    if (sendEmailFlag && userEmail) {
      const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
      let emailHtml = ""

      if (["veterinario", "bloguer", "usuario", "welcome"].includes(type)) {
        emailHtml = getWelcomeTemplate({
          nombre: metadata?.nombre || metadata?.userName || "Usuario",
          role: type || "usuario",
          actionUrl: actionUrl || (type === "veterinario" ? `${appUrl}/login?tab=veterinario` : `${appUrl}/login`),
          email: metadata?.email,
          plainPassword: metadata?.plainPassword,
          petData: metadata?.petData
        });
      } else if (type === "appointment_confirmation" || cleanTitle.includes("Cita Confirmada")) {
        const petMatch = cleanMessage.match(/para ([^,]+?)(?:,| ha)/) || cleanMessage.match(/para (.*?) ha/)
        const fechaMatch = cleanMessage.match(/(?:para el|el) ([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i) || cleanMessage.match(/el ([^a]+?)\s+a las/)
        const horaMatch = cleanMessage.match(/a las ([0-9]{1,2}:[0-9]{2}[^.]*?)(?:\.|$)/)

        const petName =
          (metadata?.petName && String(metadata.petName).trim()) ||
          (petMatch && petMatch[1] ? String(petMatch[1]).trim() : "")
        const fechaStr =
          (metadata?.fecha && String(metadata.fecha).trim()) ||
          (fechaMatch && fechaMatch[1] ? String(fechaMatch[1]).trim() : "")
        const normalizedFechaStr = fechaStr ? formatDate(fechaStr) : ""
        const horaStr =
          (metadata?.hora && String(metadata.hora).trim()) ||
          (horaMatch && horaMatch[1] ? String(horaMatch[1]).trim() : "")
        const vetStr =
          (metadata?.veterinario && String(metadata.veterinario).trim()) || ""
        const motivoStr =
          (metadata?.motivo && String(metadata.motivo).trim()) || "Consulta médica"
        const duenoStr = (metadata?.duenoName && String(metadata.duenoName).trim()) || ""
        const audience = metadata?.emailAudience === "vet" ? "vet" : "owner"
        const defaultPath =
          audience === "vet" ? "/dashboard?tab=citas" : "/mi-mascota?tab=citas"
        const link = absoluteActionUrl(actionUrl, appUrl, defaultPath)

        emailHtml = getAppointmentTemplate({
          petName: petName || "Mascota",
          fecha: normalizedFechaStr || "Por confirmar con la clínica",
          hora: horaStr || "Por confirmar con la clínica",
          veterinario: vetStr || "Especialista asignado",
          motivo: motivoStr,
          actionUrl: link,
          duenoName: duenoStr || undefined,
          audience,
          emailTitle: metadata?.emailTitle,
          clinicName: metadata?.vetClinicName,
          address: metadata?.vetAddress,
          phone: metadata?.vetPhone
        });
      } else if (type === "medical_access_request" && metadata?.medicalLinkAccept && metadata?.medicalLinkReject && metadata?.medicalInAppUrl) {
        emailHtml = getMedicalAccessRequestTemplate({
          vetName: metadata.vetName || "Tu veterinario",
          petName: metadata.petName || "tu mascota",
          inAppUrl: metadata.medicalInAppUrl,
          linkAccept: metadata.medicalLinkAccept,
          linkReject: metadata.medicalLinkReject
        });
      } else if (type.startsWith("medical_") || cleanTitle.includes("Vacuna") || cleanTitle.includes("Diagn\u00f3stico")) {
        const petMatch = cleanMessage.match(/para ([^:]+):/);
        const details: Record<string, string | undefined> = {};

        // Campos comunes
        if (metadata?.veterinario) details['Veterinario'] = metadata.veterinario;
        if (metadata?.vetName) details['Veterinario'] = metadata.vetName;
        if (metadata?.notas) details['Notas / recomendaciones'] = metadata.notas;

        // Campos de diagnóstico
        if (metadata?.motivoConsulta) details['Motivo de consulta'] = metadata.motivoConsulta;
        if (metadata?.diagnostico) details['Diagn\u00f3stico'] = metadata.diagnostico;
        if (metadata?.fRespiratoria) details['F. respiratoria'] = metadata.fRespiratoria;
        if (metadata?.fCardiaca) details['F. card\u00edaca'] = metadata.fCardiaca;
        if (metadata?.temperatura) details['Temperatura'] = metadata.temperatura;
        if (metadata?.pulso) details['Pulso'] = metadata.pulso;
        if (metadata?.tiempoLlenado) details['Tiempo llenado capilar'] = metadata.tiempoLlenado;
        if (metadata?.ganglios) details['Ganglios'] = metadata.ganglios;
        if (metadata?.mucosas) details['Mucosas'] = metadata.mucosas;
        if (metadata?.actitud) details['Actitud'] = metadata.actitud;
        if (metadata?.sistemas) details['Sistemas afectados'] = metadata.sistemas;
        if (metadata?.hallazgosClinicos) details['Hallazgos cl\u00ednicos'] = metadata.hallazgosClinicos;
        if (metadata?.listaProblemas) details['Lista de problemas'] = metadata.listaProblemas;
        if (metadata?.diagnosticosDiferenciales) details['Diagn\u00f3sticos diferenciales'] = metadata.diagnosticosDiferenciales;
        if (metadata?.examenesComplementarios) details['Ex\u00e1menes complementarios'] = metadata.examenesComplementarios;
        if (metadata?.hallazgosPruebas) details['Hallazgos de pruebas'] = metadata.hallazgosPruebas;

        // Campos de tratamiento
        if (metadata?.medicamento) details['Medicamento'] = metadata.medicamento;
        if (metadata?.dosis) details['Dosis'] = metadata.dosis;
        if (metadata?.duracion) details['Duraci\u00f3n'] = metadata.duracion;

        // Campos de vacuna
        if (metadata?.vacunaNombre) details['Vacuna'] = metadata.vacunaNombre;
        if (metadata?.numeroDosis) details['N\u00famero de dosis'] = metadata.numeroDosis;

        // Campos de preventivo
        if (metadata?.tipoPreventivo) details['Tipo de preventivo'] = metadata.tipoPreventivo;

        // Próxima fecha
        if (metadata?.proximaFecha) {
          const isVaccine = type.includes('vaccine') || cleanTitle.includes('Vacuna');
          details[isVaccine ? 'Pr\u00f3xima dosis (refuerzo)' : 'Pr\u00f3ximo control'] = metadata.proximaFecha;
        }

        emailHtml = getMedicalRecordTemplate({
          petName: metadata?.petName || (petMatch ? petMatch[1].trim() : "tu mascota"),
          title: cleanTitle,
          message: cleanMessage,
          actionUrl: actionUrl || `${appUrl}/mi-mascota`,
          clinicName: metadata?.vetClinicName,
          address: metadata?.vetAddress,
          phone: metadata?.vetPhone,
          details: Object.keys(details).length > 0 ? details : undefined,
        });
      } else if (cleanTitle.includes("Adopción") || type === "adoption" || type === "adoption_request") {
        const petMatch = cleanTitle.match(/Adopción de ([^!]+)/);
        emailHtml = getAdoptionStatusTemplate({
          petName: metadata?.petName || (petMatch ? petMatch[1].trim() : "Mascota"),
          title: cleanTitle,
          message: cleanMessage,
          actionUrl: actionUrl || `${appUrl}/dashboard`
        });
      } else if (type === "pet_registration" || cleanTitle.includes("Nueva Mascota")) {
        const tipoMatch = cleanMessage.match(/Tipo: ([^,]+)/);
        const razaMatch = cleanMessage.match(/Raza: ([^,.]+)/);
        
        emailHtml = getNewPetTemplate({
          petName: metadata?.petName || cleanTitle.replace(" Nueva Mascota: ", "").trim() || "Mascota",
          tipo: metadata?.tipo || (tipoMatch ? tipoMatch[1] : "Desconocido"),
          raza: metadata?.raza || (razaMatch ? razaMatch[1].trim() : "Mestizo"),
          genero: metadata?.genero,
          edad: metadata?.edad?.toString(),
          peso: metadata?.peso,
          actionUrl: actionUrl || `${appUrl}/mi-mascota`
        });
      } else if (type === "order_delivery" && orderData) {
        const taxSettings = await getStoreTaxSettings();
        emailHtml = getDeliveredOrderTemplate({
          orderId: orderData.orderId,
          orderCode: orderData.orderCode,
          items: orderData.items,
          total: orderData.total,
          clienteNombre: orderData.clienteNombre,
          cedula: orderData.cedula,
          telefono: orderData.telefono,
          metodoPago: orderData.metodoPago,
          ivaRate: orderData.ivaRate ?? taxSettings.ivaRate,
          taxName: orderData.taxName ?? taxSettings.taxName,
          taxEnabled: orderData.taxEnabled ?? taxSettings.taxEnabled,
          surchargeRate: orderData.surchargeRate ?? taxSettings.surchargeRate,
          surchargeEnabled: orderData.surchargeEnabled ?? taxSettings.surchargeEnabled,
          actionUrl: actionUrl || `${appUrl}/mi-mascota?tab=compras`
        });
      } else {
        emailHtml = getNeobrutalistTemplate({
          title: cleanTitle,
          message: cleanMessage,
          actionUrl: actionUrl ? absoluteActionUrl(actionUrl, appUrl, "") : undefined,
          actionText
        });
      }

      if (emailHtml && userEmail) {
        const cleanSubject = emailSubject ? stripNotificationEmojis(emailSubject) : cleanTitle;
        sendEmail(userEmail, cleanSubject, emailHtml).catch(e => 
          console.error(" Notification error (email):", e.message)
        );
      }
    }

    return createdNotification;
  } catch (error) {
    console.error(" Notification error (critical):", error);
    return null;
  }
}

/**
 * Notifica a todos los administradores del sistema
 */
export async function notifyAdmins({
  title,
  message,
  type = "info",
  sendEmailFlag = false,
  emailSubject,
  actionUrl,
  actionText,
  metadata
}: Omit<NotificationOptions, 'userId' | 'userEmail'>) {
  try {
    // 1. Encontrar todos los administradores
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true, email: true }
    });

    if (admins.length === 0) {
      console.warn(" No se encontraron administradores para notificar.");
      return [];
    }

    // 2. Crear notificaciones para cada admin (paralelo)
    const notificationPromises = admins.map(admin => 
      createNotification({
        userId: admin.id,
        userEmail: admin.email || undefined,
        title,
        message,
        type,
        sendEmailFlag,
        emailSubject,
        actionUrl,
        actionText,
        metadata
      })
    );

    return await Promise.all(notificationPromises);
  } catch (error) {
    console.error(" Error en notifyAdmins:", error);
    return [];
  }
}
