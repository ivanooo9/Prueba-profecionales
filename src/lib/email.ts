import { emailService } from "./email/service";

export { emailService };

export async function sendInvoiceEmail(params: {
  to: string;
  invoiceNumber: string;
  xmlContent: string;
  pdfBuffer: Buffer;
  businessName: string;
  customerName: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return emailService.sendEmail("invoice", params.to, {
    invoiceNumber: params.invoiceNumber,
    xmlContent: params.xmlContent,
    pdfBuffer: params.pdfBuffer,
    businessName: params.businessName,
    customerName: params.customerName,
  }, {
    subject: `Comprobante Electronico Autorizado - Factura ${params.invoiceNumber}`,
    attachments: [
      {
        filename: `Factura_${params.invoiceNumber}.pdf`,
        content: params.pdfBuffer.toString("base64"),
      },
      {
        filename: `Factura_${params.invoiceNumber}.xml`,
        content: Buffer.from(params.xmlContent).toString("base64"),
      },
    ],
  });
}

export async function sendAppointmentEmail(params: {
  to: string;
  customerName: string;
  professionalName: string;
  motivo: string;
  date: string;
  time: string;
  status: string;
}): Promise<{ success: boolean; error?: string }> {
  const statusLabels: Record<string, string> = {
    PENDIENTE: "Pendiente de Confirmacion",
    CONFIRMADA: "Confirmada",
    REPROGRAMADA: "Reprogramada",
    ATENDIDA: "Completada/Atendida",
    CANCELADA: "Cancelada",
  };
  const result = await emailService.sendEmail("appointment-legacy", params.to, {
    customerName: params.customerName,
    professionalName: params.professionalName,
    motivo: params.motivo,
    date: params.date,
    time: params.time,
    status: params.status,
  }, {
    subject: `Notificacion de Cita - Estado: ${statusLabels[params.status] || params.status}`,
  });
  return { success: result.success, error: result.error };
}

export async function sendCredentialsEmail(params: {
  to: string;
  tempPassword: string;
  eventName: string;
  eventType: string;
}): Promise<{ success: boolean; error?: string }> {
  const result = await emailService.sendEmail("credentials-legacy", params.to, {
    tempPassword: params.tempPassword,
    eventName: params.eventName,
    eventType: params.eventType,
  });
  return { success: result.success, error: result.error };
}

export async function sendEnrollmentNotificationEmail(params: {
  to: string;
  userName: string;
  eventName: string;
  eventType: string;
}): Promise<{ success: boolean; error?: string }> {
  const result = await emailService.sendEmail("enrollment-legacy", params.to, {
    userName: params.userName,
    eventName: params.eventName,
    eventType: params.eventType,
  });
  return { success: result.success, error: result.error };
}
