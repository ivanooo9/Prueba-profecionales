// Layouts y fragmentos HTML compartidos para todas las plantillas de email.
//
// El estilo es 100% inline (compatibilidad con clientes de email como Gmail,
// Outlook, Apple Mail). Los colores se mantienen como constantes para que las
// fases 2-3 puedan parametrizarlos por sistema o agregar overrides.
//
// Todas las funciones retornan strings HTML listos para concatenar dentro de
// `baseLayout` o insertar en otros layouts.

const DEFAULT_PRIMARY_COLOR = "#0A3C84";
const DEFAULT_SYSTEM_NAME = "Profesionales Ecuador";
const BACKGROUND_COLOR = "#f3f4f6";
const CARD_COLOR = "#ffffff";
const TEXT_COLOR = "#1f2937";
const MUTED_COLOR = "#6b7280";
const BORDER_COLOR = "#e5e7eb";
const SOFT_TEXT_COLOR = "#9ca3af";
const FONT_STACK = "'Helvetica Neue', Helvetica, Arial, sans-serif";

// =====================================================================
// Utilidades
// =====================================================================

/**
 * Escapa caracteres HTML inseguros en strings para prevenir inyecciones al
 * renderizar payloads (que vienen de la base de datos) dentro de los emails.
 */
export function escapeHtml(value: string | null | undefined): string {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// =====================================================================
// Layouts
// =====================================================================

/**
 * Layout HTML completo con DOCTYPE, head y body. Envuelve el contenido en una
 * tarjeta centrada (max-width 600px) sobre fondo gris muy claro. Incluye un
 * bloque CSS con media query para hacer el layout responsive en clientes de
 * email.
 *
 * @param content - HTML ya renderizado del cuerpo del email (típicamente
 *                  `emailHeader + body + emailFooter`).
 * @param title    - Título del email, usado en la etiqueta <title>.
 */
export function baseLayout(content: string, title: string): string {
  const safeTitle = escapeHtml(title);
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${safeTitle}</title>
  <style>
    @media only screen and (max-width: 620px) {
      .pe-container { width: 100% !important; }
      .pe-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .pe-button { width: 100% !important; box-sizing: border-box; }
      .pe-button a { display: block !important; width: 100% !important; box-sizing: border-box; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:${BACKGROUND_COLOR}; font-family:${FONT_STACK}; color:${TEXT_COLOR}; -webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BACKGROUND_COLOR};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="pe-container" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%; max-width:600px; background-color:${CARD_COLOR}; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.08); overflow:hidden;">
          <tr>
            <td style="padding:0;">
              ${content}
            </td>
          </tr>
        </table>
        <table role="presentation" class="pe-container" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%; max-width:600px; margin-top:16px;">
          <tr>
            <td align="center" style="color:${SOFT_TEXT_COLOR}; font-size:12px; line-height:1.5; padding:0 16px;">
              Este es un correo generado automáticamente. Por favor no respondas a este mensaje.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Header con branding del sistema. Si se pasa `systemLogo` (URL o base64),
 * se renderiza arriba del nombre. El nombre del sistema siempre aparece en
 * el color primario como título principal.
 */
export function emailHeader(
  systemName: string,
  systemLogo?: string | null
): string {
  const safeName = escapeHtml(systemName || DEFAULT_SYSTEM_NAME);
  const logoHtml = systemLogo
    ? `<img src="${escapeHtml(systemLogo)}" alt="${safeName}" height="40" style="display:block; margin:0 auto 12px auto; max-width:180px; height:auto;" />`
    : "";
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${CARD_COLOR};">
  <tr>
    <td align="center" style="padding:28px 24px 24px 24px; border-bottom:1px solid ${BORDER_COLOR};">
      ${logoHtml}
      <h1 style="margin:0; color:${DEFAULT_PRIMARY_COLOR}; font-size:20px; font-weight:600; letter-spacing:-0.01em; line-height:1.3;">${safeName}</h1>
    </td>
  </tr>
</table>`;
}

/**
 * Footer con links a redes sociales y copyright. Solo se renderizan los
 * enlaces para los que se proporcionó una URL (los `null`/`undefined` se
 * omiten sin dejar separadores huérfanos).
 */
export function emailFooter(
  facebookUrl?: string | null,
  instagramUrl?: string | null,
  youtubeUrl?: string | null,
  tiktokUrl?: string | null,
  linkedinUrl?: string | null,
  systemName?: string | null
): string {
  const safeName = escapeHtml(systemName || DEFAULT_SYSTEM_NAME);
  const links: { url: string; label: string }[] = [];
  if (facebookUrl) links.push({ url: facebookUrl, label: "Facebook" });
  if (instagramUrl) links.push({ url: instagramUrl, label: "Instagram" });
  if (youtubeUrl) links.push({ url: youtubeUrl, label: "YouTube" });
  if (tiktokUrl) links.push({ url: tiktokUrl, label: "TikTok" });
  if (linkedinUrl) links.push({ url: linkedinUrl, label: "LinkedIn" });

  const socialHtml = links.length
    ? `<p style="margin:0 0 12px 0; font-size:13px; color:${MUTED_COLOR};">${links
        .map(
          (l, i) =>
            (i > 0 ? '<span style="color:#d1d5db; margin:0 6px;">&middot;</span>' : "") +
            `<a href="${escapeHtml(l.url)}" style="color:${DEFAULT_PRIMARY_COLOR}; text-decoration:none;">${escapeHtml(l.label)}</a>`
        )
        .join("")}</p>`
    : "";

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${CARD_COLOR};">
  <tr>
    <td align="center" style="padding:24px 24px 32px 24px; border-top:1px solid ${BORDER_COLOR}; color:${SOFT_TEXT_COLOR}; font-size:12px; line-height:1.6;">
      ${socialHtml}
      <p style="margin:0;">&copy; ${new Date().getFullYear()} ${safeName}. Todos los derechos reservados.</p>
    </td>
  </tr>
</table>`;
}

// =====================================================================
// Bloques reusables (exportados para uso en service.ts)
// =====================================================================

/**
 * Bloque de saludo. Devuelve un `<p>` con el nombre del destinatario en
 * negrita. Si `name` está vacío, devuelve un saludo genérico "Hola,".
 * `name` ya debe estar escapado.
 */
export function greeting(name: string): string {
  if (!name) {
    return `<p style="font-size:16px; color:${TEXT_COLOR}; margin:0 0 16px 0; line-height:1.5;">Hola,</p>`;
  }
  return `<p style="font-size:16px; color:${TEXT_COLOR}; margin:0 0 16px 0; line-height:1.5;">Hola <strong style="color:${TEXT_COLOR};">${name}</strong>,</p>`;
}

/**
 * Bloque de párrafo principal (mensaje introductorio o de cierre).
 * `text` ya debe estar escapado.
 */
export function paragraph(text: string): string {
  return `<p style="font-size:15px; line-height:1.65; color:#374151; margin:0 0 20px 0;">${text}</p>`;
}

/**
 * Fila de tabla info: label a la izquierda (gris), valor a la derecha
 * (oscuro, negrita). Usado dentro de `infoTable`.
 */
export function infoRow(label: string, value: string, isLast: boolean = false): string {
  const cellBorder = isLast ? "" : "border-bottom:1px solid #f3f4f6;";
  return `<tr>
    <td style="padding:10px 0; color:#6b7280; font-size:14px; ${cellBorder}">${label}</td>
    <td style="padding:10px 0; color:${TEXT_COLOR}; font-size:14px; font-weight:600; ${cellBorder} text-align:right;">${value}</td>
  </tr>`;
}

/**
 * Tabla sobria de información (label/value). Cada item es `{ label, value }`
 * y los valores ya deben venir pre-escapados (pueden incluir HTML simple).
 */
export function infoTable(rows: { label: string; value: string }[]): string {
  if (!rows || rows.length === 0) return "";
  const body = rows
    .map((r, i) => infoRow(r.label, r.value, i === rows.length - 1))
    .join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; border-collapse:collapse; margin:8px 0 24px 0;">
    ${body}
  </table>`;
}

/**
 * Bloque destacado para contraseñas, códigos o información sensible.
 * Fondo gris claro, texto monospace, borde sutil.
 */
export function codeBlock(content: string, label?: string): string {
  const labelHtml = label
    ? `<p style="margin:0 0 8px 0; font-size:13px; color:${MUTED_COLOR}; font-weight:600; text-transform:uppercase; letter-spacing:0.04em;">${escapeHtml(label)}</p>`
    : "";
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:16px 0 24px 0;">
    <tr>
      <td style="padding:16px 20px; background:#f9fafb; border:1px solid ${BORDER_COLOR}; border-radius:8px;">
        ${labelHtml}
        <p style="margin:0; font-family:'SF Mono','Menlo','Consolas',monospace; font-size:18px; color:${TEXT_COLOR}; font-weight:600; letter-spacing:0.02em; word-break:break-all;">${content}</p>
      </td>
    </tr>
  </table>`;
}

/**
 * Callout/caja destacada para avisos, notas o contexto adicional.
 * Variantes: info, success, warning, danger. `text` puede incluir HTML.
 */
export function callout(
  text: string,
  variant: "info" | "success" | "warning" | "danger" = "info"
): string {
  const styles: Record<typeof variant, { bg: string; border: string; text: string }> = {
    info: { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
    success: { bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46" },
    warning: { bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
    danger: { bg: "#fef2f2", border: "#fecaca", text: "#991b1b" },
  };
  const v = styles[variant];
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;">
    <tr>
      <td style="padding:14px 18px; background:${v.bg}; border:1px solid ${v.border}; border-radius:8px; color:${v.text}; font-size:14px; line-height:1.6;">
        ${text}
      </td>
    </tr>
  </table>`;
}

/**
 * Botón de call-to-action centrado. Color sólido primario.
 */
export function ctaButton(url: string, text: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:32px 0 8px 0;">
    <tr>
      <td align="center">
        <a href="${escapeHtml(url)}" class="pe-button" style="display:inline-block; padding:14px 32px; background:${DEFAULT_PRIMARY_COLOR}; color:#ffffff; text-decoration:none; border-radius:6px; font-weight:600; font-size:14px; letter-spacing:0.01em;">${escapeHtml(text)}</a>
      </td>
    </tr>
  </table>`;
}

/**
 * Línea separadora fina horizontal.
 */
export function divider(): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
    <tr>
      <td style="border-top:1px solid ${BORDER_COLOR}; font-size:0; line-height:0;">&nbsp;</td>
    </tr>
  </table>`;
}

/**
 * Texto secundario / nota al pie del cuerpo. Color gris suave.
 */
export function mutedNote(text: string, align: "left" | "center" = "left"): string {
  return `<p style="font-size:13px; color:${MUTED_COLOR}; line-height:1.6; margin:16px 0 0 0; text-align:${align};">${text}</p>`;
}

/**
 * Contenedor principal de padding para el cuerpo del email. 32px en todos
 * los lados para mantener consistencia entre plantillas.
 */
export function contentBody(inner: string): string {
  return `<div style="padding:32px;">${inner}</div>`;
}

/**
 * Bloque de "píldora" de estado (badge). Usado para destacar el estado
 * de una cita o un pago.
 */
export function statusPill(label: string, variant: "info" | "success" | "warning" | "danger" = "info"): string {
  const styles: Record<typeof variant, { bg: string; text: string }> = {
    info: { bg: "#dbeafe", text: "#1e40af" },
    success: { bg: "#d1fae5", text: "#065f46" },
    warning: { bg: "#fef3c7", text: "#92400e" },
    danger: { bg: "#fee2e2", text: "#991b1b" },
  };
  const v = styles[variant];
  return `<span style="display:inline-block; padding:6px 14px; background:${v.bg}; color:${v.text}; font-size:13px; font-weight:600; border-radius:999px; letter-spacing:0.01em;">${escapeHtml(label)}</span>`;
}
