import { emailService } from "./email/service";
import { baseLayout, emailHeader, emailFooter, greeting, paragraph, infoTable, codeBlock, ctaButton, callout } from "./email/templates/shared";

export async function sendReferralWelcomeEmail(params: {
  to: string;
  tempPassword: string;
  loginUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const content = `
    ${greeting("Nuevo Referido")}
    ${paragraph("¡Bienvenido al Programa de Referidos de <strong>Profesionales Ecuador</strong>! Tu cuenta ha sido creada exitosamente por la administración.")}
    ${paragraph("Con este rol podrás comercializar nuestros Conversatorios, Cursos y Planes de Afiliación y generar excelentes ingresos por comisiones.")}
    
    ${callout("Durante tu primer inicio de sesión se te solicitará completar tu información personal, tus datos bancarios para cobrar tus comisiones y establecer tu nueva contraseña personal.", "info")}
    
    ${infoTable([
      { label: "Correo de Acceso", value: params.to },
      { label: "Contraseña Temporal", value: `<code>${params.tempPassword}</code>` },
      { label: "Estado Inicial", value: "Pendiente de Configuración" },
    ])}

    ${ctaButton(params.loginUrl, "Configurar mi Cuenta Ahora")}
    ${paragraph("Por tu seguridad, no compartas estas credenciales con nadie.")}
  `;

  const html = baseLayout(
    emailHeader("Bienvenido al Programa de Referidos") + content + emailFooter(),
    "Bienvenido al Programa de Referidos"
  );

  const result = await emailService.sendRawEmail({
    to: params.to,
    subject: "Bienvenido al Programa de Referidos - Credenciales de Acceso",
    html,
  });

  return { success: result.success, error: result.error };
}

export async function sendSaleApprovedClientWelcomeEmail(params: {
  to: string;
  clientName: string;
  tempPassword?: string;
  loginUrl: string;
  productName: string;
}): Promise<{ success: boolean; error?: string }> {
  const isNewAccount = !!params.tempPassword;

  const content = `
    ${greeting(params.clientName)}
    ${paragraph(`Te confirmamos que tu inscripción a <strong>${params.productName}</strong> ha sido aprobada y procesada exitosamente en <strong>Profesionales Ecuador</strong>.`)}
    
    ${isNewAccount ? `
      ${paragraph("Se ha creado una cuenta personal para ti en nuestra plataforma para que puedas ingresar y acceder a tu contenido:")}
      ${infoTable([
        { label: "Usuario", value: params.to },
        { label: "Contraseña Temporal", value: `<code>${params.tempPassword}</code>` },
      ])}
      ${callout("Te recomendamos iniciar sesión e ir a la sección de configuración para actualizar tu contraseña.", "info")}
    ` : `
      ${paragraph("Ya puedes acceder a tu panel con tus credenciales habituales para disfrutar de tu contenido.")}
    `}

    ${ctaButton(params.loginUrl, "Acceder a Mi Cuenta")}
  `;

  const html = baseLayout(
    emailHeader("Confirmación de Inscripción") + content + emailFooter(),
    "Confirmación de Inscripción"
  );

  const result = await emailService.sendRawEmail({
    to: params.to,
    subject: `Confirmación de Inscripción - ${params.productName}`,
    html,
  });

  return { success: result.success, error: result.error };
}

export async function sendSaleApprovedReferralNotification(params: {
  to: string;
  saleId: number;
  productName: string;
  clientName: string;
  commissionAmount: number;
}): Promise<{ success: boolean; error?: string }> {
  const content = `
    ${greeting("Referido")}
    ${paragraph(`¡Excelente noticia! Tu venta registrado <strong>#${params.saleId}</strong> ha sido <strong>APROBADA</strong> por la administración.`)}
    
    ${infoTable([
      { label: "Producto", value: params.productName },
      { label: "Cliente", value: params.clientName },
      { label: "Comisión Acreditada", value: `$${params.commissionAmount.toFixed(2)}` },
    ])}

    ${callout(`Se ha acreditado el monto de <strong>$${params.commissionAmount.toFixed(2)}</strong> directamente en tu Billetera Virtual.`, "success")}
  `;

  const html = baseLayout(
    emailHeader("¡Comisión Acreditada!") + content + emailFooter(),
    "Comisión Acreditada"
  );

  const result = await emailService.sendRawEmail({
    to: params.to,
    subject: `Venta #${params.saleId} Aprobada - Comisión Acreditada ($${params.commissionAmount.toFixed(2)})`,
    html,
  });

  return { success: result.success, error: result.error };
}

export async function sendSaleRejectedReferralNotification(params: {
  to: string;
  saleId: number;
  productName: string;
  clientName: string;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  const content = `
    ${greeting("Referido")}
    ${paragraph(`Te informamos que tu registro de venta <strong>#${params.saleId}</strong> para <strong>${params.productName}</strong> ha sido rechazado.`)}
    
    ${infoTable([
      { label: "Cliente", value: params.clientName },
      { label: "Motivo de Rechazo", value: params.reason || "Comprobante no válido o pago no verificado" },
    ])}

    ${paragraph("Si consideras que se trata de un error o deseas volver a adjuntar el comprobante correcto, puedes comunicarte con la administración.")}
  `;

  const html = baseLayout(
    emailHeader("Actualización de Venta Registrada") + content + emailFooter(),
    "Actualización de Venta Registrada"
  );

  const result = await emailService.sendRawEmail({
    to: params.to,
    subject: `Venta #${params.saleId} Rechazada`,
    html,
  });

  return { success: result.success, error: result.error };
}
