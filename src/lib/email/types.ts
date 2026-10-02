// Tipos y contratos para el módulo de email.
//
// EmailType es la unión cerrada de los 18 tipos de email soportados por el
// sistema. Cada tipo tiene un payload fuertemente tipado asociado en
// EmailPayloadMap, lo que permite que `emailService.sendEmail<T>(type, to,
// payload)` haga inferencia correcta del payload según el tipo.
//
// El módulo se divide en 5 categorías:
//   - Citas (3)
//   - Profesionales (3)
//   - Pagos (2)
//   - Eventos (3)
//   - Cuenta (3)
//   - Legacy (4) — wrappers sobre los 4 emails que ya existen en src/lib/email.ts

// =====================================================================
// EmailType — unión cerrada de tipos soportados
// =====================================================================

export type EmailType =
  // Citas
  | "appointment-requested"
  | "appointment-status-changed"
  | "appointment-rescheduled"
  // Profesionales
  | "professional-created"
  | "professional-approved"
  | "professional-rejected"
  // Pagos
  | "payment-registered"
  | "stale-transfer-payment-admin-alert"
  // Eventos
  | "event-enrolled"
  | "certificate-requested"
  | "certificate-available"
  // Cuenta
  | "welcome-registration"
  | "password-updated"
  | "password-reset"
  // Legacy
  | "invoice"
  | "appointment-legacy"
  | "credentials-legacy"
  | "enrollment-legacy";

// =====================================================================
// Payloads: Citas
// =====================================================================

export interface AppointmentRequestedPayload {
  /** Nombre del destinatario (cliente que solicita la cita). */
  recipientName: string;
  customerName: string;
  professionalName: string;
  motivo: string;
  /** Fecha formateada (legible para el usuario, ej: "Lunes 5 de junio de 2026"). */
  date: string;
  /** Hora formateada (ej: "10:30 AM"). */
  time: string;
  appointmentId: number | string;
  /** URL absoluta para ver/gestionar la cita. */
  appointmentUrl?: string;
  companyName?: string;
  companyLogo?: string;
  primaryColor?: string;
}

export interface AppointmentStatusChangedPayload {
  recipientName: string;
  customerName: string;
  professionalName: string;
  motivo: string;
  date: string;
  time: string;
  /** Estado crudo (PENDIENTE | CONFIRMADA | REPROGRAMADA | ATENDIDA | CANCELADA). */
  status: string;
  /** Etiqueta humana del estado (ej: "Confirmada"). */
  statusLabel: string;
  appointmentId: number | string;
  appointmentUrl?: string;
}

export interface AppointmentRescheduledPayload {
  recipientName: string;
  customerName: string;
  professionalName: string;
  oldDate: string;
  oldTime: string;
  newDate: string;
  newTime: string;
  motivo: string;
  appointmentId: number | string;
  appointmentUrl?: string;
  /** Quien solicitó la reprogramación ("cliente" | "profesional" | "admin"). */
  rescheduledBy?: string;
}

// =====================================================================
// Payloads: Profesionales
// =====================================================================

export interface ProfessionalCreatedPayload {
  recipientName: string;
  professionalName: string;
  email: string;
  /** Contraseña temporal (solo si el admin la asigna manualmente). */
  temporaryPassword?: string;
  loginUrl?: string;
  profileUrl?: string;
}

export interface ProfessionalApprovedPayload {
  recipientName: string;
  professionalName: string;
  /** ID legacy del perfil profesional; no se usa para construir la URL pública canónica. */
  professionalId?: number | string;
  /** URL pública del perfil en el directorio. */
  publicProfileUrl?: string;
  approvedAt?: string;
}

export interface ProfessionalRejectedPayload {
  recipientName: string;
  professionalName: string;
  /** Motivo de rechazo (opcional, puede ser sensible). */
  rejectionReason?: string;
  supportEmail?: string;
}

// =====================================================================
// Payloads: Pagos
// =====================================================================

export interface PaymentRegisteredPayload {
  recipientName: string;
  amount: number;
  /** Código de moneda (USD, EUR, etc). */
  currency: string;
  /** Concepto del pago (ej: "Membresía Premium", "Curso de Derecho"). */
  concept: string;
  reference?: string;
  /** Método de pago (PayPhone, Transferencia, Efectivo, etc). */
  paymentMethod: string;
  invoiceUrl?: string;
  /** Fecha del pago (formateada). */
  paymentDate: string;
  transactionId?: string;
}

export interface StaleTransferPaymentAdminAlertPayload {
  recipientName: string;
  paymentId: number | string;
  paymentType: string;
  payerName: string;
  amount: number;
  currency: string;
  reference?: string;
  bankName: string;
  requestedAt: string;
  ageHours: number;
  dashboardUrl?: string;
}

// =====================================================================
// Payloads: Eventos
// =====================================================================

export interface EventEnrolledPayload {
  recipientName: string;
  eventName: string;
  /** 'curso' | 'conversatorio' | 'webinar' | etc. */
  eventType: string;
  startDate: string;
  endDate?: string;
  /** 'presencial' | 'virtual' | 'hibrido'. */
  modality?: string;
  accessUrl?: string;
  temporaryPassword?: string;
  loginUrl?: string;
}

export interface CertificateRequestedPayload {
  recipientName: string;
  eventName: string;
  requestId: number | string;
  requestDate: string;
}

export interface CertificateAvailablePayload {
  recipientName: string;
  eventName: string;
  certificateUrl: string;
  downloadUrl?: string;
  issuedAt?: string;
}

// =====================================================================
// Payloads: Cuenta
// =====================================================================

export interface WelcomeRegistrationPayload {
  recipientName: string;
  email: string;
  temporaryPassword?: string;
  loginUrl?: string;
  profileUrl?: string;
  profileStatus?: string; // "PENDIENTE" | "APROBADO" | null para clientes
}

export interface PasswordUpdatedPayload {
  recipientName: string;
  /** Fecha/hora de la actualización (formateada). */
  updateDate: string;
  ipAddress?: string;
  userAgent?: string;
  supportEmail?: string;
}

export interface PasswordResetPayload {
  recipientName: string;
  /** Token de un solo uso. */
  resetToken?: string;
  /** URL completa con el token ya incluido. */
  resetUrl: string;
  /** Minutos hasta que expire el token. */
  expiresInMinutes: number;
}

// =====================================================================
// Payloads: Legacy (mapean 1-a-1 a las funciones actuales en email.ts)
// =====================================================================

export interface InvoicePayload {
  invoiceNumber: string;
  xmlContent: string;
  pdfBuffer: Buffer;
  businessName: string;
  customerName: string;
}

export interface AppointmentLegacyPayload {
  customerName: string;
  professionalName: string;
  motivo: string;
  date: string;
  time: string;
  status: string;
}

export interface CredentialsLegacyPayload {
  /** Correo del usuario recién registrado (se muestra en el email). */
  email?: string;
  tempPassword: string;
  eventName: string;
  eventType: string;
  /** URL absoluta de inicio de sesión (se usa como CTA en el email). */
  loginUrl?: string;
}

export interface EnrollmentLegacyPayload {
  userName: string;
  eventName: string;
  eventType: string;
}

// =====================================================================
// EmailPayloadMap — mapa tipo -> payload (usado para inferencia)
// =====================================================================

export interface EmailPayloadMap {
  "appointment-requested": AppointmentRequestedPayload;
  "appointment-status-changed": AppointmentStatusChangedPayload;
  "appointment-rescheduled": AppointmentRescheduledPayload;
  "professional-created": ProfessionalCreatedPayload;
  "professional-approved": ProfessionalApprovedPayload;
  "professional-rejected": ProfessionalRejectedPayload;
  "payment-registered": PaymentRegisteredPayload;
  "stale-transfer-payment-admin-alert": StaleTransferPaymentAdminAlertPayload;
  "event-enrolled": EventEnrolledPayload;
  "certificate-requested": CertificateRequestedPayload;
  "certificate-available": CertificateAvailablePayload;
  "welcome-registration": WelcomeRegistrationPayload;
  "password-updated": PasswordUpdatedPayload;
  "password-reset": PasswordResetPayload;
  invoice: InvoicePayload;
  "appointment-legacy": AppointmentLegacyPayload;
  "credentials-legacy": CredentialsLegacyPayload;
  "enrollment-legacy": EnrollmentLegacyPayload;
}

// =====================================================================
// Contratos comunes
// =====================================================================

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  baseUrl: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
}

export interface SendEmailOptions {
  /** Override del subject. Si se omite, se usa el subject por defecto del tipo. */
  subject?: string;
  /** Adjuntos opcionales (PDFs, XMLs, etc). Compatible con Resend Attachment. */
  attachments?: any[];
}
