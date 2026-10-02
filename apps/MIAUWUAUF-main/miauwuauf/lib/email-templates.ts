/**
 * Email Template System - Neobrutalist Style
 * 
 * This system provides a consistent, high-contrast look for all automated emails,
 * matching the web application's aesthetic.
 */
import { buildIvaLabel, formatIvaPercent, normalizeIvaRate } from "@/lib/store-settings";
import { formatEcuadorPhoneDisplay } from "@/lib/phone";
import { formatDate } from "@/lib/utils";
import { renderEmailBrandedHeader, getSiteUrlForEmail } from "@/lib/email-branding";

/** Quita emoji del texto de notificaciones/correos (mejor lectura en móvil y clientes de correo). */
export function stripNotificationEmojis(text: string): string {
  if (!text) return text;
  let s = text;
  try {
    s = s.replace(/\p{Extended_Pictographic}/gu, "");
  } catch {
    /* entornos sin Unicode property escapes */
  }
  s = s.replace(/\uFE0F/g, "");
  s = s.replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, "");
  s = s.replace(/[ \t]+/g, " "); // colapsar solo espacios horizontales
  s = s.replace(/\r/g, "");
  s = s.replace(/\n\s*\n/g, "\n\n"); // mantener máximo 2 saltos de línea
  return s.trim();
}

function escapeForEmail(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface TemplateOptions {
  title: string;
  message: string;
  type?: string;
  actionUrl?: string;
  actionText?: string;
  fichaHtml?: string; // Bloque opcional para ficha técnica amarilla
  headerBgHex?: string; // algunas plantillas (ej. entrega) usan otro tinte distintivo
}

/**
 * Genera el HTML para la Ficha Técnica Neobrutalista
 */
export function getFichaTecnica(titulo: string, datos: Record<string, string | undefined>) {
  const safeTitulo = escapeForEmail(stripNotificationEmojis(titulo.trim()));
  const rows = Object.entries(datos)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([label, value]) => {
      const normalizedValue =
        /fecha/i.test(label) && value
          ? formatDate(value)
          : String(value);
      const safeLabel = escapeForEmail(stripNotificationEmojis(label));
      const safeValue = escapeForEmail(stripNotificationEmojis(normalizedValue));
      return `
      <tr>
        <td style="padding: 8px 10px; border-bottom: 2px solid #eeeeee; vertical-align: top; font-family: 'Gilroy', 'Outfit', Arial, sans-serif;">
          <div style="font-weight: 900; font-size: 12px; text-align: left; text-transform: uppercase; letter-spacing: 0.04em; color: #000000; margin-bottom: 3px; line-height: 1.35; font-family: 'Gilroy', 'Outfit', Arial, sans-serif;">${safeLabel}</div>
          <div style="font-size: 15px; font-weight: 700; text-align: left; color: #222222; line-height: 1.4; word-break: break-word; overflow-wrap: anywhere; max-width: 100%; font-family: 'Gilroy', 'Outfit', Arial, sans-serif;">${safeValue}</div>
        </td>
      </tr>
    `;
    }).join("");

  return `
    <div class="email-ficha" style="width: 100%; max-width: 100%; box-sizing: border-box; margin: 0 auto; border: 3px solid #000000; border-radius: 20px; background-color: #FDF9F0; background-image: linear-gradient(#FDF9F0, #FDF9F0); overflow: hidden; -webkit-box-shadow: 8px 8px 0px #000000; box-shadow: 8px 8px 0px #000000; font-family: 'Gilroy', 'Outfit', Arial, sans-serif;">
      <div style="background-color: #FFDE59; background-image: linear-gradient(#FFDE59, #FFDE59); border-bottom: 3px solid #000000; padding: 12px 14px; text-align: center; font-family: 'Gilroy', 'Outfit', Arial, sans-serif;">
        <span style="font-weight: 900; font-size: 14px; color: #000000; text-transform: uppercase; letter-spacing: 0.06em; word-break: break-word; font-family: 'Gilroy', 'Outfit', Arial, sans-serif;">${safeTitulo}</span>
      </div>
      <div style="padding: 8px 10px; box-sizing: border-box;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 100%; table-layout: fixed;">
          ${rows}
        </table>
      </div>
    </div>
  `;
}

export function getNeobrutalistTemplate({
  title,
  message,
  actionUrl,
  actionText,
  fichaHtml,
  headerBgHex,
}: TemplateOptions) {
  const safeTitle = stripNotificationEmojis(title);
  const safeMessage = stripNotificationEmojis(message).replace(/\n/g, "<br>");
  const siteUrl = getSiteUrlForEmail();

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="x-apple-disable-message-reformatting" />
      <meta name="color-scheme" content="light only">
      <meta name="supported-color-schemes" content="light only">
      <title>Plantilla de Correo - MIAUWUAUF</title>
      <link href="https://fonts.googleapis.com" rel="preconnect">
      <link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect">
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;700;800&amp;display=swap" rel="stylesheet">
      <style>
        @font-face {
            font-family: 'Gilroy';
            src: url('${siteUrl}/fonts/gilroy/Gilroy-Light.otf') format('opentype');
            font-weight: 300;
            font-style: normal;
        }
        @font-face {
            font-family: 'Gilroy';
            src: url('${siteUrl}/fonts/gilroy/Gilroy-Light.otf') format('opentype');
            font-weight: 400;
            font-style: normal;
        }
        @font-face {
            font-family: 'Gilroy';
            src: url('${siteUrl}/fonts/gilroy/Gilroy-ExtraBold.otf') format('opentype');
            font-weight: 700;
            font-style: normal;
        }
        @font-face {
            font-family: 'Gilroy';
            src: url('${siteUrl}/fonts/gilroy/Gilroy-ExtraBold.otf') format('opentype');
            font-weight: 800;
            font-style: normal;
        }
        @font-face {
            font-family: 'Gilroy';
            src: url('${siteUrl}/fonts/gilroy/Gilroy-ExtraBold.otf') format('opentype');
            font-weight: 900;
            font-style: normal;
        }
      </style>
      <style>
        :root {
          color-scheme: light only;
          supported-color-schemes: light only;
        }

        html, body {
          color: #000000;
          margin: 0 !important; padding: 0 !important; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;
        }
        *, *::before, *::after { box-sizing: border-box; }

        body {
          color: #000000;
          font-family: 'Gilroy', 'Montserrat', sans-serif;
          background-color: #e5e2e1;
          -webkit-font-smoothing: antialiased;
        }

        /* Hack CSS for text in Gmail */
        .title, .subtitle, .message, .detail, p, span, td, strong, th, h1, h2, h3, h4, h5, h6 {
          color: #000000;
        }

        strong {
          font-weight: 700;
        }

        table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; max-width: 100%; height: auto; }

        .main-wrapper {
          max-width: 600px;
          width: 100% !important;
          margin: 24px auto;
          background-color: #fcf9f8 !important;
          border: 3px solid #000000 !important;
          border-radius: 20px !important;
          -webkit-box-shadow: 8px 8px 0px #000000 !important;
          box-shadow: 8px 8px 0px #000000 !important;
          overflow: hidden;
        }

        .content-body {
          color: #000000;
          background-color: #fcf9f8;
          text-align: left;
        }

        .title {
          font-size: 24px;
          font-weight: 900;
          margin-bottom: 12px;
          line-height: 1.3;
          font-family: 'Gilroy', 'Montserrat', sans-serif;
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        .subtitle {
          font-size: 18px;
          font-weight: 400;
          color: #000000;
          margin-bottom: 8px;
          font-family: 'Gilroy', 'Montserrat', sans-serif;
        }

        .message {
          font-size: 16px;
          font-weight: 300;
          color: #000000;
          line-height: 1.6;
          margin-bottom: 16px;
          font-family: 'Gilroy', 'Montserrat', sans-serif;
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        .detail {
          font-size: 13px;
          font-weight: 700;
          color: #555555;
          line-height: 1.5;
          font-family: 'Gilroy', 'Montserrat', sans-serif;
        }

        .btn-action {
          display: inline-block;
          max-width: 100%;
          padding: 12px 32px;
          background-color: #ede986;
          border: 2px solid #000000;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 4px 4px 0px 0px #000000;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-family: 'Gilroy', 'Montserrat', sans-serif;
          word-break: break-word;
          box-sizing: border-box;
          color: #000000 !important;
        }

        .footer {
          background-color: #fcf9f8;
          text-align: center;
        }
        
        .footer-dark {
          font-family: 'Gilroy', 'Montserrat', sans-serif;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #000000;
          margin: 0 0 10px 0;
        }

        .footer-light {
          font-family: 'Gilroy', 'Montserrat', sans-serif;
          font-size: 11px;
          font-weight: 300;
          line-height: 1.6;
          color: #666666;
          margin: 0;
        }

        .email-ficha table { table-layout: fixed !important; width: 100% !important; }

        @media only screen and (max-width: 480px) {
          .order-two-col-stack td { display: block !important; width: 100% !important; max-width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; padding-bottom: 14px !important; box-sizing: border-box !important; }
          .order-two-col-stack td:last-child { padding-bottom: 0 !important; }
          .main-wrapper { margin: 8px auto !important; border-radius: 16px !important; max-width: 100% !important; }
          .content-body td { padding: 16px 12px !important; }
          .title { font-size: 20px !important; margin-bottom: 8px !important; }
          .message { font-size: 14px !important; margin-bottom: 12px !important; }
          .btn-action { padding: 12px 24px !important; width: 100% !important; max-width: 100% !important; display: block !important; box-sizing: border-box !important; }
          .footer td { padding: 14px 12px !important; }
        }
        @media (prefers-color-scheme: dark) {
          /* FORCE LIGHT MODE — nunca invertir colores */
          html {
            color-scheme: light !important;
          }
          body, table, td, div, p, span, h1, h2, h3, h4, h5, h6, a, strong {
            color: #000000 !important;
            text-shadow: none !important;
          }
          body {
            background-color: #e5e2e1 !important;
            background-image: linear-gradient(#e5e2e1, #e5e2e1) !important;
          }
          table {
            background-color: transparent !important;
            background-image: none !important;
          }
          .main-wrapper {
            background-color: #fcf9f8 !important;
            background-image: linear-gradient(#fcf9f8, #fcf9f8) !important;
            border-color: #000000 !important;
          }
          .content-body, .footer {
            background-color: #fcf9f8 !important;
            background-image: linear-gradient(#fcf9f8, #fcf9f8) !important;
          }
          .footer-dark { color: #000000 !important; }
          .footer-light { color: #666666 !important; }
          .btn-action {
            background-color: #ede986 !important;
            background-image: linear-gradient(#ede986, #ede986) !important;
            color: #000000 !important;
            border-color: #000000 !important;
          }
          .email-ficha {
            background-color: #FDF9F0 !important;
            background-image: linear-gradient(#FDF9F0, #FDF9F0) !important;
            border-color: #000000 !important;
          }
          /* Header rosa — nunca oscurecer */
          table[style*="background-color: #f2619c"],
          table[style*="background-color:#f2619c"],
          td[style*="background-color: #f2619c"],
          td[style*="background-color:#f2619c"] {
            background-color: #f2619c !important;
            background-image: linear-gradient(#f2619c, #f2619c) !important;
          }
          td[style*="background-color: #fcf9f8"],
          td[style*="background-color:#fcf9f8"],
          div[style*="background-color: #fcf9f8"],
          div[style*="background-color:#fcf9f8"] {
            background-color: #fcf9f8 !important;
            background-image: linear-gradient(#fcf9f8, #fcf9f8) !important;
          }
          td[style*="background-color: #e5e2e1"],
          td[style*="background-color:#e5e2e1"],
          div[style*="background-color: #e5e2e1"],
          div[style*="background-color:#e5e2e1"] {
            background-color: #e5e2e1 !important;
            background-image: linear-gradient(#e5e2e1, #e5e2e1) !important;
          }
          div[style*="background-color: #FDF9F0"],
          div[style*="background-color:#FDF9F0"] {
            background-color: #FDF9F0 !important;
            background-image: linear-gradient(#FDF9F0, #FDF9F0) !important;
          }
          div[style*="background-color: #FFDE59"],
          div[style*="background-color:#FFDE59"] {
            background-color: #FFDE59 !important;
            background-image: linear-gradient(#FFDE59, #FFDE59) !important;
          }
          a[style*="background-color: #ede986"],
          a[style*="background-color:#ede986"] {
            background-color: #ede986 !important;
            background-image: linear-gradient(#ede986, #ede986) !important;
            color: #000000 !important;
          }
        }
      </style>
      <style>
        /* === Gmail Dark Mode Hack (u + .body) === */
        u + .body .title, u + .body .subtitle, u + .body .message,
        u + .body .detail, u + .body p, u + .body span,
        u + .body td, u + .body strong, u + .body th,
        u + .body h1, u + .body h2, u + .body h3,
        u + .body h4, u + .body h5, u + .body h6 {
          color: transparent !important;
          text-shadow: 0 0 0 #000000 !important;
        }
        u + .body .footer-light, u + .body .detail {
          color: transparent !important;
          text-shadow: 0 0 0 #666666 !important;
        }
        u + .body a { color: transparent !important; text-shadow: 0 0 0 #000000 !important; }
        u + .body {
          background-color: #e5e2e1 !important;
          background-image: linear-gradient(#e5e2e1, #e5e2e1) !important;
        }
        u + .body .main-wrapper {
          background-color: #fcf9f8 !important;
          background-image: linear-gradient(#fcf9f8, #fcf9f8) !important;
          border-color: #000000 !important;
        }
        u + .body .content-body, u + .body .footer {
          background-color: #fcf9f8 !important;
          background-image: linear-gradient(#fcf9f8, #fcf9f8) !important;
        }
        u + .body .btn-action {
          background-color: #ede986 !important;
          background-image: linear-gradient(#ede986, #ede986) !important;
          color: transparent !important;
          text-shadow: 0 0 0 #000000 !important;
        }
        u + .body .email-ficha {
          background-color: #FDF9F0 !important;
          background-image: linear-gradient(#FDF9F0, #FDF9F0) !important;
        }
        /* Header rosa — Gmail dark mode */
        u + .body table[style*="background-color: #f2619c"],
        u + .body table[style*="background-color:#f2619c"],
        u + .body td[style*="background-color: #f2619c"],
        u + .body td[style*="background-color:#f2619c"] {
          background-color: #f2619c !important;
          background-image: linear-gradient(#f2619c, #f2619c) !important;
        }
        u + .body td[style*="background-color: #fcf9f8"],
        u + .body td[style*="background-color:#fcf9f8"] {
          background-color: #fcf9f8 !important;
          background-image: linear-gradient(#fcf9f8, #fcf9f8) !important;
        }
        u + .body td[style*="background-color: #e5e2e1"],
        u + .body td[style*="background-color:#e5e2e1"] {
          background-color: #e5e2e1 !important;
          background-image: linear-gradient(#e5e2e1, #e5e2e1) !important;
        }

        /* === Gmail Dark Mode Hack ([data-ogsc]) === */
        [data-ogsc] .title, [data-ogsc] .subtitle, [data-ogsc] .message,
        [data-ogsc] .detail, [data-ogsc] p, [data-ogsc] span,
        [data-ogsc] td, [data-ogsc] strong, [data-ogsc] th,
        [data-ogsc] h1, [data-ogsc] h2, [data-ogsc] h3,
        [data-ogsc] h4, [data-ogsc] h5, [data-ogsc] h6 {
          color: transparent !important;
          text-shadow: 0 0 0 #000000 !important;
        }
        [data-ogsc] .footer-light, [data-ogsc] .detail {
          color: transparent !important;
          text-shadow: 0 0 0 #666666 !important;
        }
        [data-ogsc] a { color: transparent !important; text-shadow: 0 0 0 #000000 !important; }
        [data-ogsc] {
          background-color: #e5e2e1 !important;
          background-image: linear-gradient(#e5e2e1, #e5e2e1) !important;
        }
        [data-ogsc] .main-wrapper {
          background-color: #fcf9f8 !important;
          background-image: linear-gradient(#fcf9f8, #fcf9f8) !important;
          border-color: #000000 !important;
        }
        [data-ogsc] .content-body, [data-ogsc] .footer {
          background-color: #fcf9f8 !important;
          background-image: linear-gradient(#fcf9f8, #fcf9f8) !important;
        }
        [data-ogsc] .btn-action {
          background-color: #ede986 !important;
          background-image: linear-gradient(#ede986, #ede986) !important;
          color: transparent !important;
          text-shadow: 0 0 0 #000000 !important;
        }
        [data-ogsc] .email-ficha {
          background-color: #FDF9F0 !important;
          background-image: linear-gradient(#FDF9F0, #FDF9F0) !important;
        }
        /* Header rosa — data-ogsc dark mode */
        [data-ogsc] table[style*="background-color: #f2619c"],
        [data-ogsc] table[style*="background-color:#f2619c"],
        [data-ogsc] td[style*="background-color: #f2619c"],
        [data-ogsc] td[style*="background-color:#f2619c"] {
          background-color: #f2619c !important;
          background-image: linear-gradient(#f2619c, #f2619c) !important;
        }
        [data-ogsc] td[style*="background-color: #fcf9f8"],
        [data-ogsc] td[style*="background-color:#fcf9f8"] {
          background-color: #fcf9f8 !important;
          background-image: linear-gradient(#fcf9f8, #fcf9f8) !important;
        }
        [data-ogsc] td[style*="background-color: #e5e2e1"],
        [data-ogsc] td[style*="background-color:#e5e2e1"] {
          background-color: #e5e2e1 !important;
          background-image: linear-gradient(#e5e2e1, #e5e2e1) !important;
        }
      </style>
    </head>
    <body style="background-color: #e5e2e1; background-image: linear-gradient(#e5e2e1, #e5e2e1); margin: 0; padding: 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" background="https://dummyimage.com/1x1/e5e2e1/e5e2e1.png" style="background-color: #e5e2e1; background-image: linear-gradient(#e5e2e1, #e5e2e1); table-layout: fixed; width: 100%;">
        <tr>
          <td align="center" background="https://dummyimage.com/1x1/e5e2e1/e5e2e1.png" style="padding: 16px 8px; width: 100%; background-image: linear-gradient(#e5e2e1, #e5e2e1);">
            <table class="main-wrapper" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #fcf9f8; background-image: linear-gradient(#fcf9f8, #fcf9f8); border: 3px solid #000000; border-radius: 20px; -webkit-box-shadow: 8px 8px 0px #000000; box-shadow: 8px 8px 0px #000000; overflow: hidden; box-sizing: border-box;">
              <tr>
                <td background="https://dummyimage.com/1x1/fcf9f8/fcf9f8.png" style="background-color: #fcf9f8; background-image: linear-gradient(#fcf9f8, #fcf9f8);">
                  <!-- Header -->
                  ${renderEmailBrandedHeader(undefined, headerBgHex)}

                  <!-- Body -->
                  <table class="content-body" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fcf9f8; background-image: linear-gradient(#fcf9f8, #fcf9f8);">
                    <tr>
                      <td background="https://dummyimage.com/1x1/fcf9f8/fcf9f8.png" style="padding: 24px 20px; background-color: #fcf9f8; background-image: linear-gradient(#fcf9f8, #fcf9f8); text-align: left;">
                        <h2 class="title">${safeTitle}</h2>
                        <div class="message">${safeMessage}</div>

                        ${fichaHtml ? `<div style="margin-bottom: 16px;">${fichaHtml}</div>` : ''}

                        ${actionUrl ? `
                          <div style="margin: 12px 0 4px 0; text-align: center;">
                            <a href="${actionUrl}" class="btn-action" style="display: inline-block; max-width: 100%; padding: 12px 32px; background-color: #ede986; background-image: linear-gradient(#ede986, #ede986); border: 2px solid #000000; border-radius: 8px; font-size: 16px; font-weight: 700; text-decoration: none; -webkit-box-shadow: 4px 4px 0px #000000; box-shadow: 4px 4px 0px #000000; margin: 0; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Gilroy', 'Montserrat', Arial, sans-serif; box-sizing: border-box; color: #000000 !important;">
                              ${actionText || 'Ver Detalles'}
                            </a>
                          </div>
                        ` : ''}
                      </td>
                    </tr>
                  </table>

                  <!-- Footer -->
                  <table class="footer" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fcf9f8; background-image: linear-gradient(#fcf9f8, #fcf9f8); border-top: 3px solid #000000;">
                    <tr>
                      <td background="https://dummyimage.com/1x1/fcf9f8/fcf9f8.png" style="padding: 32px 16px; text-align: center; background-image: linear-gradient(#fcf9f8, #fcf9f8);">
                        <p class="footer-dark" style="margin: 0 0 10px 0; font-size: 12px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">
                          CUIDADO, AMOR Y TECNOLOGÍA
                        </p>
                        <p class="footer-light" style="margin: 0; font-size: 11px; font-weight: 300; line-height: 1.6; color: #666666;">
                          ${new Date().getFullYear()} MIAUWUAUF. Todos los derechos reservados.<br>
                          Estás recibiendo este correo como parte de nuestra comunidad.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    </body>
    </html>
  `;
}

export function getNewPetTemplate({
  petName,
  tipo,
  raza,
  genero,
  edad,
  peso,
  actionUrl
}: {
  petName: string;
  tipo: string;
  raza: string;
  genero?: string;
  edad?: string;
  peso?: string | number;
  actionUrl: string;
}) {
  const fichaHtml = getFichaTecnica("FICHA TÉCNICA DE REGISTRO", {
    "Especie": tipo,
    "Raza": raza,
    "Género": genero,
    "Edad": edad,
    "Peso": peso ? `${peso} kg` : undefined
  });

  return getNeobrutalistTemplate({
    title: `¡Bienvenido, ${petName}!`,
    message: `¡Enhorabuena! Has registrado a <strong>${petName}</strong> correctamente en MIAUWUAUF. Aquí tienes los detalles técnicos del registro:`,
    actionUrl: actionUrl,
    actionText: "Ver su Perfil",
    fichaHtml
  });
}

export function getAppointmentTemplate({
  petName,
  fecha,
  hora,
  veterinario,
  motivo,
  actionUrl,
  duenoName,
  audience = "owner",
  emailTitle,
  clinicName,
  address,
  phone
}: {
  petName: string
  fecha: string
  hora: string
  veterinario: string
  motivo: string
  actionUrl: string
  /** Nombre del dueño (titular) para el saludo */
  duenoName?: string
  /** dueño: recibe cita; vet: asignación profesional */
  audience?: "owner" | "vet"
  emailTitle?: string
  clinicName?: string | null
  address?: string | null
  phone?: string | null
}) {
  const normalizedFecha = formatDate(fecha);
  const safe = {
    pet: escapeForEmail(petName),
    vet: escapeForEmail(veterinario),
    mot: escapeForEmail(motivo),
    fe: escapeForEmail(normalizedFecha),
    ho: escapeForEmail(hora),
    dueno: duenoName ? escapeForEmail(duenoName) : ""
  }
  const fichaHtml = getFichaTecnica("DETALLES DE TU CITA", {
    "Mascota": petName,
    "Fecha": normalizedFecha,
    "Hora": hora,
    "Veterinario": veterinario,
    "Motivo": motivo
  })

  const title = stripNotificationEmojis(
    emailTitle || (audience === "vet" ? "Nueva cita asignada" : "¡Cita programada!"),
  )

  const messageOwner = duenoName
    ? `Hola <strong>${safe.dueno}</strong>, tienes una cita agendada para <strong>${safe.pet}</strong> con <strong>${safe.vet}</strong>. Revisa la fecha y la hora.`
    : `Tienes una cita médica agendada para <strong>${safe.pet}</strong> con <strong>${safe.vet}</strong>. Revisa la fecha y la hora.`

  const messageVet = `Hola <strong>${safe.vet}</strong>, se te asignó una cita con <strong>${safe.pet}</strong>${duenoName ? `. Dueño o dueña: <strong>${safe.dueno}</strong>.` : "."} Revisa fechas y motivo en el resumen.`

  // Build the location card if vet has clinic info and it is for the owner
  let locationBlock = '';
  if (audience === "owner" && (clinicName || address)) {
    const safeClinic = clinicName ? escapeForEmail(clinicName) : '';
    const safeAddress = address ? escapeForEmail(address) : '';
    const safePhone = phone ? escapeForEmail(phone) : '';
    const mapsQuery = encodeURIComponent(
      clinicName && address ? (clinicName + ', ' + address) : (address || clinicName || '')
    );
    const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + mapsQuery;
    locationBlock =
      '<div style="margin-top:24px;border:3px solid #000000;border-radius:20px;overflow:hidden;-webkit-box-shadow:8px 8px 0px #000000;box-shadow:8px 8px 0px #000000;font-family:Outfit,Arial,sans-serif;background-color:#FDF9F0;background-image:linear-gradient(#FDF9F0, #FDF9F0);">' +
      '<div style="background:#FFDE59;background-image:linear-gradient(#FFDE59, #FFDE59);border-bottom:3px solid #000000;padding:10px 16px;">' +
      '<span style="font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#000;">Consultorio del Veterinario</span>' +
      '</div>' +
      '<div style="background:#FDF9F0;background-image:linear-gradient(#FDF9F0, #FDF9F0);padding:14px 16px;text-align:left;">' +
      (safeClinic ? '<div style="font-weight:900;font-size:15px;color:#000;margin-bottom:6px;">' + safeClinic + '</div>' : '') +
      (safeAddress ? '<div style="font-size:13px;font-weight:600;color:#444;margin-bottom:10px;">' + safeAddress + '</div>' : '') +
      (safePhone ? '<div style="font-size:13px;font-weight:600;color:#444;margin-bottom:10px;">' + safePhone + '</div>' : '') +
      '<a href="' + mapsUrl + '" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#000;color:#FFDE59;font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;padding:8px 16px;border-radius:8px;text-decoration:none;border:2px solid #000;box-shadow:3px 3px 0px 0px #FFDE59;">Ver en Google Maps</a>' +
      '</div>' +
      '</div>';
  }

  return getNeobrutalistTemplate({
    title,
    message: (audience === "vet" ? messageVet : messageOwner) + locationBlock,
    actionUrl: actionUrl,
    actionText: audience === "vet" ? "Abrir mis citas" : "Ver mis citas en MIAUWUAUF",
    fichaHtml
  })
}

export function getWelcomeTemplate({
  nombre,
  role,
  actionUrl,
  email,
  plainPassword,
  petData
}: {
  nombre: string;
  role: string;
  actionUrl: string;
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
}) {
  const safeNombre = escapeForEmail(nombre);
  let roleTitle = "¡Bienvenido a la Familia!";
  let roleMessage = `Estamos felices de que te unas a MIAUWUAUF. Aquí podrás gestionar la salud de tus mascotas y encontrar nuevos amigos para adoptar.`;

  if (role === "veterinario") {
    roleTitle = "¡Bienvenido, Doctor/a!";
    roleMessage = `Tu experiencia es vital para nosotros. Prepárate para gestionar historias clínicas, recetar tratamientos y cuidar a cientos de peludos con nuestra tecnología.`;
  } else if (role === "bloguer") {
    roleTitle = "¡Bienvenido al Equipo Creativo!";
    roleMessage = `Tu voz ayudará a concientizar sobre el cuidado animal. Empieza a redactar artículos, comparte historias de rescate y construye comunidad con nosotros.`;
  }

  let fichaHtml = "";
  if (email && plainPassword) {
    fichaHtml += getFichaTecnica("TUS CREDENCIALES DE ACCESO", {
      Correo: email,
      Contraseña: plainPassword,
    })
    fichaHtml += `
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top:14px;"><tr><td style="font-size:12px;font-weight:700;line-height:1.55;color:#333333;text-align:center;padding:0 8px;">
      Por seguridad, <strong>cambia esta contraseña</strong> después de iniciar sesión y no reenvíes este correo públicamente.
    </td></tr></table>`
  }
  if (petData) {
    const fichaDatos: Record<string, string | undefined> = {
      "Paciente": petData.nombre,
      "Especie": petData.tipo,
      "Raza": petData.raza,
      "Edad": petData.edad,
      "Peso": petData.peso ? `${petData.peso} kg` : undefined,
      "Sexo": petData.sexo,
      "Esterilizado/a": petData.esterilizado
    };

    fichaHtml += `<div style="margin-top: 20px;">${getFichaTecnica("DATOS DE REGISTRO CLÍNICO", fichaDatos)}</div>`;
  }

  return getNeobrutalistTemplate({
    title: roleTitle,
    message: `¡Hola <strong>${safeNombre}</strong>! ${roleMessage}`,
    actionUrl: actionUrl,
    actionText: "Iniciar Sesión",
    fichaHtml
  });
}

function escapeHtmlMedical(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getMedicalRecordTemplate({
  petName,
  title,
  message,
  actionUrl,
  clinicName,
  address,
  phone,
  details,
}: {
  petName: string;
  title: string;
  message: string;
  actionUrl: string;
  clinicName?: string | null;
  address?: string | null;
  phone?: string | null;
  details?: Record<string, string | undefined>;
}) {
  const safeMessage = escapeHtmlMedical(message).replace(/\n/g, '<br>');
  const safePetName = escapeHtmlMedical(petName);

  // Usar datos estructurados si se pasan; si no, parsear del texto plano (fallback)
  let fichaDatos: Record<string, string | undefined>;

  if (details && Object.keys(details).length > 0) {
    fichaDatos = { ...details };
  } else {
    fichaDatos = {};
    const msgClean = message.replace(/\n\u2014 Consultorio del Veterinario \u2014[\s\S]*/g, '');
    const vetMatch = msgClean.match(/El veterinario ([^\n]+?) ha registrado/);
    if (vetMatch) fichaDatos['Veterinario'] = vetMatch[1].trim();

    const fieldMap: Record<string, string> = {
      'Medicamento': 'Medicamento',
      'Dosis': 'Dosis',
      'Duraci\u00f3n': 'Duraci\u00f3n',
      'Vacuna': 'Vacuna',
      'Pr\u00f3xima dosis': 'Pr\u00f3xima dosis (refuerzo)',
      'Pr\u00f3ximo control': 'Pr\u00f3ximo control',
      'Tipo': 'Tipo de preventivo',
      'Diagn\u00f3stico': 'Diagn\u00f3stico',
      'Motivo de consulta': 'Motivo de consulta',
      'Ex\u00e1menes solicitados': 'Ex\u00e1menes solicitados',
      'Indicaciones': 'Indicaciones',
      'Observaciones': 'Observaciones',
      'Notas / recomendaciones': 'Notas / recomendaciones',
    };

    for (const [key, label] of Object.entries(fieldMap)) {
      const regex = new RegExp(`^${key}:\\s*(.+)$`, 'm');
      const match = msgClean.match(regex);
      if (match && match[1]?.trim()) {
        fichaDatos[label] = match[1].trim();
      }
    }

    const dosisNumMatch = msgClean.match(/^Dosis #(\d+)/m);
    if (dosisNumMatch) fichaDatos['N\u00famero de dosis'] = `#${dosisNumMatch[1]}`;
  }

  const fichaHtml = Object.keys(fichaDatos).length > 0
    ? getFichaTecnica('RESUMEN DEL REGISTRO M\u00c9DICO', fichaDatos)
    : '';

  let locationBlock = '';
  if (clinicName || address) {
    const safeClinic = clinicName ? escapeHtmlMedical(clinicName) : '';
    const safeAddress = address ? escapeHtmlMedical(address) : '';
    const safePhone = phone ? escapeHtmlMedical(phone) : '';
    const mapsQuery = encodeURIComponent(
      clinicName && address ? (clinicName + ', ' + address) : (address || clinicName || '')
    );
    const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + mapsQuery;
    locationBlock =
      '<div style="margin-top:24px;border:3px solid #000000;border-radius:20px;overflow:hidden;-webkit-box-shadow:8px 8px 0px #000000;box-shadow:8px 8px 0px #000000;font-family:Outfit,Arial,sans-serif;background-color:#FDF9F0;background-image:linear-gradient(#FDF9F0, #FDF9F0);">' +
      '<div style="background:#FFDE59;background-image:linear-gradient(#FFDE59, #FFDE59);border-bottom:3px solid #000000;padding:10px 16px;">' +
      '<span style="font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#000;">Consultorio del Veterinario</span>' +
      '</div>' +
      '<div style="background:#FDF9F0;background-image:linear-gradient(#FDF9F0, #FDF9F0);padding:14px 16px;">' +
      (safeClinic ? '<div style="font-weight:900;font-size:15px;color:#000;margin-bottom:6px;">' + safeClinic + '</div>' : '') +
      (safeAddress ? '<div style="font-size:13px;font-weight:600;color:#444;margin-bottom:10px;">' + safeAddress + '</div>' : '') +
      (safePhone ? '<div style="font-size:13px;font-weight:600;color:#444;margin-bottom:10px;">' + safePhone + '</div>' : '') +
      '<a href="' + mapsUrl + '" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#000;color:#FFDE59;font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;padding:8px 16px;border-radius:8px;text-decoration:none;border:2px solid #000;box-shadow:3px 3px 0px 0px #FFDE59;">Ver en Google Maps</a>' +
      '</div>' +
      '</div>';
  }

  return getNeobrutalistTemplate({
    title: title,
    message: 'Informaci\u00f3n importante para <strong>' + safePetName + '</strong>:<br><br>' + safeMessage,
    fichaHtml: fichaHtml + locationBlock,
    actionUrl: actionUrl,
    actionText: 'Ver Historial'
  });
}

export function getAdoptionStatusTemplate({
  petName,
  title,
  message,
  actionUrl,
}: {
  petName: string;
  title: string;
  message: string;
  actionUrl: string;
}) {
  return getNeobrutalistTemplate({
    title: `${petName}: ${title}`,
    message: message.replace(/\n/g, '<br>'),
    actionUrl: actionUrl || '#',
    actionText: "Ver Mi Solicitud"
  });
}

export interface OrderItemTemplate {
  nombre: string;
  cantidad: number;
  precio: number;
  precioFinal?: number;
}

export function getOrderConfirmationTemplate({
  title,
  message,
  orderId,
  orderCode,
  total,
  items,
  clienteNombre,
  cedula,
  telefono,
  email,
  ciudad,
  direccion,
  metodoPago = "Transferencia",
  estado,
  ivaRate = 15,
  taxName = "IVA",
  taxEnabled = true,
  surchargeRate = 0,
  surchargeEnabled = false,
  actionUrl,
  actionText
}: {
  title: string;
  message: string;
  orderId: string;
  orderCode?: string;
  total: number;
  items: OrderItemTemplate[];
  clienteNombre?: string;
  cedula?: string;
  telefono?: string;
  email?: string;
  ciudad?: string;
  direccion?: string;
  metodoPago?: string;
  estado?: string;
  ivaRate?: number;
  taxName?: string;
  taxEnabled?: boolean;
  surchargeRate?: number;
  surchargeEnabled?: boolean;
  actionUrl?: string;
  actionText?: string;
}) {
  const subtotalFactura = items.reduce((acc, item) => acc + ((item.precioFinal ?? item.precio) * item.cantidad), 0);
  const subtotal = subtotalFactura;
  const normalizedIvaRate = normalizeIvaRate(ivaRate);
  const activeTaxRate = taxEnabled ? normalizedIvaRate : 0;
  const iva = subtotal * (activeTaxRate / 100);
  const normalizedSurchargeRate = normalizeIvaRate(surchargeRate);
  const activeSurchargeRate = surchargeEnabled ? normalizedSurchargeRate : 0;
  const surcharge = subtotal * (activeSurchargeRate / 100);

  const itemsHtml = items.map(item => {
    const pFinal = item.precioFinal ?? item.precio;
    return `
    <tr>
      <td style="padding: 15px 0; border-bottom: 2px dashed rgba(0,0,0,0.15); text-align: left;">
        <div style="font-size: 15px; font-weight: 700; color: #000000;">${item.nombre} <span style="font-size: 12px; color: #666; font-weight: 400;">(${item.cantidad} x $${pFinal.toFixed(2)})</span></div>
      </td>
      <td align="right" style="padding: 15px 0; border-bottom: 2px dashed rgba(0,0,0,0.15); font-size: 18px; font-weight: 900; color: #000000;">
        $${(pFinal * item.cantidad).toFixed(2)}
      </td>
    </tr>
  `;
  }).join('');

  const resumeFicha = `
    <div style="background-color: #FDF9F0; background-image: linear-gradient(#FDF9F0, #FDF9F0); border: 3px solid #000000; border-radius: 20px; -webkit-box-shadow: 8px 8px 0px #000000; box-shadow: 8px 8px 0px #000000; padding: 25px; text-align: left;">
      <span style="font-size: 18px; font-weight: 900; color: #000000; text-transform: uppercase; letter-spacing: 1px;">Resumen de Compra</span>
      <div style="height: 3px; background-color: #000000; margin: 15px 0 20px 0;"></div>
      <table width="100%" border="0" cellspacing="0" cellpadding="0">
        ${itemsHtml}
        <tr>
          <td style="padding: 20px 0 10px 0; font-size: 16px; font-weight: 700; color: #666; text-align: left;">Subtotal</td>
          <td align="right" style="padding: 20px 0 10px 0; font-size: 16px; font-weight: 700; color: #666;">$${subtotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 0 0 15px 0; border-bottom: 2px dashed #000000; font-size: 16px; font-weight: 700; color: #666; text-align: left;">${buildIvaLabel(activeTaxRate, taxName)}</td>
          <td align="right" style="padding: 0 0 15px 0; border-bottom: 2px dashed #000000; font-size: 16px; font-weight: 700; color: #666;">$${iva.toFixed(2)}</td>
        </tr>
        ${activeSurchargeRate > 0 ? `
        <tr>
          <td style="padding: 0 0 15px 0; border-bottom: 2px dashed #000000; font-size: 16px; font-weight: 700; color: #666; text-align: left;">RECARGO (${formatIvaPercent(activeSurchargeRate)}%)</td>
          <td align="right" style="padding: 0 0 15px 0; border-bottom: 2px dashed #000000; font-size: 16px; font-weight: 700; color: #666;">$${surcharge.toFixed(2)}</td>
        </tr>
        ` : ""}
        <tr>
          <td style="padding: 20px 0 0 0; font-size: 20px; font-weight: 900; color: #000000; text-align: left;">TOTAL FINAL</td>
          <td align="right" style="padding: 20px 0 0 0; font-size: 28px; font-weight: 900; color: #000000 !important;">$${total.toFixed(2)}</td>
        </tr>
      </table>
    </div>
    ${metodoPago?.toLowerCase() === 'transferencia' ? `
    <div style="background-color: #EDE986; background-image: linear-gradient(#EDE986, #EDE986); border: 3px dashed #000000; border-radius: 20px; padding: 20px; margin-top: 25px; text-align: left;">
      <h4 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 900; color: #000000; text-transform: uppercase;">Datos para Transferencia</h4>
      <div style="font-size: 13px; color: #333; line-height: 1.6;">
        <strong>Banco:</strong> Banco Pichincha<br>
        <strong>Tipo de cuenta:</strong> Ahorros<br>
        <strong>N° Cuenta:</strong> 2200XXXXXXX<br>
        <strong>Titular:</strong> MIAUWUAUF<br>
        <strong>RUC/Cédula:</strong> 17XXXXXXXX001
      </div>
    </div>
    ` : ''}

    <table role="presentation" class="order-two-col-stack" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 25px; max-width: 100%; table-layout: fixed;">
      <tr>
        <td width="50%" valign="top" style="padding: 0 10px 0 0; vertical-align: top; word-break: break-word; overflow-wrap: anywhere;">
          <div style="background-color: #FDF9F0; background-image: linear-gradient(#FDF9F0, #FDF9F0); border: 3px solid #000000; border-radius: 15px; -webkit-box-shadow: 4px 4px 0px #000000; box-shadow: 4px 4px 0px #000000; padding: 15px; text-align: left; max-width: 100%; box-sizing: border-box;">
            <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 900; color: #000000; text-transform: uppercase;">Facturación</h4>
            <div style="font-size: 12px; color: #333; line-height: 1.5; word-break: break-word; overflow-wrap: anywhere;">
              <strong>Cliente:</strong> ${clienteNombre || 'N/A'}<br>
              <strong>Cédula/RUC:</strong> ${cedula || 'N/A'}<br>
              <strong>Correo:</strong> ${email || 'N/A'}<br>
              <strong>Teléfono:</strong> ${formatEcuadorPhoneDisplay(telefono) || telefono || 'N/A'}<br>
              <strong>Ciudad:</strong> ${ciudad || 'N/A'}<br>
              <strong>Dirección:</strong> ${direccion || 'N/A'}
            </div>
          </div>
        </td>
        <td width="50%" valign="top" style="padding: 0 0 0 10px; vertical-align: top; word-break: break-word; overflow-wrap: anywhere;">
          <div style="background-color: #FDF9F0; background-image: linear-gradient(#FDF9F0, #FDF9F0); border: 3px solid #000000; border-radius: 15px; -webkit-box-shadow: 4px 4px 0px #000000; box-shadow: 4px 4px 0px #000000; padding: 15px; text-align: left; max-width: 100%; box-sizing: border-box;">
            <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 900; color: #000000; text-transform: uppercase;">Orden</h4>
            <div style="font-size: 12px; color: #333; line-height: 1.4; word-break: break-word;">
              <strong>Método:</strong> ${metodoPago}<br>
              <strong>ID:</strong> ${orderCode || `#${orderId.slice(-6).toUpperCase()}`}<br>
              ${estado ? `<strong>Estado:</strong> ${estado}` : ''}
            </div>
          </div>
        </td>
      </tr>
    </table>
  `;

  return getNeobrutalistTemplate({
    title: title || "¡Gracias por tu compra!",
    message: message,
    actionUrl: actionUrl,
    actionText: actionText || "Ver mis Pedidos",
    fichaHtml: resumeFicha,
  });
}
export function getDeliveredOrderTemplate({
  orderId,
  orderCode,
  items,
  total,
  clienteNombre,
  cedula,
  telefono,
  metodoPago,
  ivaRate = 15,
  taxName = "IVA",
  taxEnabled = true,
  surchargeRate = 0,
  surchargeEnabled = false,
  actionUrl
}: {
  orderId: string;
  orderCode?: string;
  items: OrderItemTemplate[];
  total: number;
  clienteNombre?: string;
  cedula?: string;
  telefono?: string;
  metodoPago?: string;
  ivaRate?: number;
  taxName?: string;
  taxEnabled?: boolean;
  surchargeRate?: number;
  surchargeEnabled?: boolean;
  actionUrl?: string;
}) {
  const subtotal = items.reduce((acc, item) => {
    const p = Number(item.precioFinal ?? item.precio) || 0;
    const q = Number(item.cantidad) || 0;
    return acc + (p * q);
  }, 0);
  const normalizedIvaRate = normalizeIvaRate(ivaRate);
  const activeTaxRate = taxEnabled ? normalizedIvaRate : 0;
  const iva = subtotal * (activeTaxRate / 100);
  const normalizedSurchargeRate = normalizeIvaRate(surchargeRate);
  const activeSurchargeRate = surchargeEnabled ? normalizedSurchargeRate : 0;
  const surcharge = subtotal * (activeSurchargeRate / 100);

  const itemsHtml = items.map(item => {
    const pFinal = Number(item.precioFinal ?? item.precio) || 0;
    const q = Number(item.cantidad) || 0;
    return `
    <tr>
      <td style="padding: 18px 0; border-bottom: 2px dashed #000000; text-align: left;">
        <div style="font-size: 16px; font-weight: 900; color: #000000; font-family: 'Outfit', sans-serif; text-transform: uppercase;">
          ${item.nombre} <span style="font-size: 12px; color: #555; font-weight: 700;">(x${q})</span>
        </div>
        <div style="font-size: 11px; color: #000; font-weight: 900; text-transform: uppercase; margin-top: 4px; background: #eee; display: inline-block; padding: 2px 6px; border: 1.5px solid #000;">
          UNIDAD: $${pFinal.toFixed(2)}
        </div>
      </td>
      <td align="right" style="padding: 18px 0; border-bottom: 2px dashed #000000; font-size: 20px; font-weight: 900; color: #000000;">
        $${(pFinal * q).toFixed(2)}
      </td>
    </tr>
  `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta name="color-scheme" content="light only">
      <meta name="supported-color-schemes" content="light only">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
        
        :root {
          color-scheme: light only;
          supported-color-schemes: light only;
        }

        html, body {
          color: #000000;
 margin: 0 !important; padding: 0 !important; width: 100% !important; -webkit-text-size-adjust: 100%; }
        *, *::before, *::after { box-sizing: border-box; }
        img { max-width: 100%; height: auto; }

        /* Hack CSS for text in Gmail */
        h2, h4, p, span, td, strong, th, div {
          color: #000000;
        }
        
        .light-text {
          color: #555555;
        }

        @media only screen and (max-width: 480px) {
          .mobile-stack { display: block !important; width: 100% !important; margin-bottom: 20px !important; }
          .mobile-hide { display: none !important; }
          .mobile-padding { padding: 22px 14px !important; }
          .responsive-logo { width: 85% !important; max-width: 280px !important; }
          .mobile-title { font-size: 24px !important; }
          .mobile-total { font-size: 28px !important; }
        }
        @media (prefers-color-scheme: dark) {
          body, table {
            background-color: #e5e2e1 !important;
            background-image: linear-gradient(#e5e2e1, #e5e2e1) !important;
          }
          .main-wrapper {
            background-color: #fcf9f8 !important;
            background-image: linear-gradient(#fcf9f8, #fcf9f8) !important;
            border-color: #000000 !important;
          }
          .mobile-padding, .footer {
            background-color: #fcf9f8 !important;
            background-image: linear-gradient(#fcf9f8, #fcf9f8) !important;
          }
          h2, h4, p, span, td, strong, th, div, a {
            color: #000000 !important;
            text-shadow: none !important;
          }
          .light-text {
            color: #555555 !important;
          }
          .btn-action {
            background-color: #ede986 !important;
            background-image: linear-gradient(#ede986, #ede986) !important;
            color: #000000 !important;
            border-color: #000000 !important;
          }
        }
        /* Hack for Gmail Dark Mode Text */
        u + .body h2, 
        u + .body h4, 
        u + .body p, 
        u + .body span, 
        u + .body td, 
        u + .body strong, 
        u + .body th, 
        u + .body div,
        u + .body a,
        u + .body .btn-action {
          color: transparent !important;
          text-shadow: 0 0 0 #000000 !important;
        }
        u + .body .light-text {
          color: transparent !important;
          text-shadow: 0 0 0 #555555 !important;
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #e5e2e1; background-image: linear-gradient(#e5e2e1, #e5e2e1); font-family: 'Gilroy', 'Montserrat', sans-serif;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #e5e2e1; background-image: linear-gradient(#e5e2e1, #e5e2e1); padding: 24px 8px; table-layout: fixed;">
        <tr>
          <td align="center">
            <div class="main-wrapper" style="max-width: 600px; width: 100%; border: 3px solid #000000; border-radius: 20px; background-color: #fcf9f8; background-image: linear-gradient(#fcf9f8, #fcf9f8); -webkit-box-shadow: 8px 8px 0px #000000; box-shadow: 8px 8px 0px #000000; overflow: hidden; box-sizing: border-box;">

              <!-- Header (sin CDN rota); mismo bloque centrado que el resto de correos -->
              ${renderEmailBrandedHeader(undefined, "#f2619c")}

              <!-- Body -->
              <div class="mobile-padding" style="padding: 50px 40px; background-color: #fcf9f8; background-image: linear-gradient(#fcf9f8, #fcf9f8);">
                <div style="text-align: center; margin-bottom: 45px;">
                  <h2 class="mobile-title" style="font-size: 38px; font-weight: 900; color: #000000; margin: 0 0 12px 0; letter-spacing: -1.5px; text-transform: uppercase;">¡Gracias por tu compra!</h2>
                  <p style="font-size: 18px; font-weight: 700; color: #000000; margin: 0; opacity: 0.7;">¡Pedido entregado! Esperamos que lo disfruten.</p>
                </div>

                <!-- Info Grid Pesado -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 40px;">
                  <tr>
                    <td width="48%" valign="top" class="mobile-stack">
                      <div style="border: 4px solid #000000; border-radius: 20px; padding: 22px; background-color: #FDF9F0; background-image: linear-gradient(#FDF9F0, #FDF9F0); box-shadow: 8px 8px 0px 0px #000000; min-height: 120px;">
                        <h4 style="margin: 0 0 15px 0; font-size: 13px; font-weight: 900; color: #000000; text-transform: uppercase; background-color: #ede986; background-image: linear-gradient(#ede986, #ede986); display: inline-block; padding: 2px 8px; border: 2px solid #000; font-family: 'Gilroy','Outfit',Arial,sans-serif;">Datos de Facturación</h4>
                        <div style="font-size: 14px; font-weight: 800; color: #000; line-height: 1.6; word-break: break-word; overflow-wrap: anywhere;">
                          <div style="margin-bottom: 6px;"><strong>CLIENTE:</strong> ${clienteNombre || 'SANTI'}</div>
                          <div style="margin-bottom: 6px;"><strong>CÉDULA:</strong> <span style="text-decoration: underline;">${cedula || '1106002410'}</span></div>
                          <div style="margin-bottom: 6px;"><strong>TELÉFONO:</strong> ${formatEcuadorPhoneDisplay(telefono) || telefono || '0980176949'}</div>
                        </div>
                      </div>
                    </td>
                    <td width="4%" class="mobile-hide"></td>
                    <td width="48%" valign="top" class="mobile-stack">
                      <div style="border: 4px solid #000000; border-radius: 20px; padding: 22px; background-color: #FDF9F0; background-image: linear-gradient(#FDF9F0, #FDF9F0); box-shadow: 8px 8px 0px 0px #000000; min-height: 120px;">
                        <h4 style="margin: 0 0 15px 0; font-size: 13px; font-weight: 900; color: #000000; text-transform: uppercase; background-color: #ede986; background-image: linear-gradient(#ede986, #ede986); display: inline-block; padding: 2px 8px; border: 2px solid #000; font-family: 'Gilroy','Outfit',Arial,sans-serif;">Detalle del Pago</h4>
                        <div style="font-size: 14px; font-weight: 800; color: #000; line-height: 1.6;">
                          <div style="margin-bottom: 6px;"><strong>MÉTODO:</strong> ${metodoPago || 'TRANSFERENCIA'}</div>
                          <div style="margin-bottom: 6px;"><strong>ESTADO:</strong> <span style="background: #93ABD9; padding: 2px 10px; border: 2.5px solid #000; border-radius: 6px; box-shadow: 3px 3px 0px #000;">ENTREGADO</span></div>
                          <div style="margin-bottom: 6px;"><strong>ORDEN:</strong> ${orderCode || `#${orderId.slice(-6).toUpperCase()}`}</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- Summary Section Pesado -->
                <div style="border: 4px solid #000000; border-radius: 25px; padding: 35px; background-color: #FDF9F0; background-image: linear-gradient(#FDF9F0, #FDF9F0); box-shadow: 10px 10px 0px 0px #000000;">
                   <h4 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 940; color: #000000; text-transform: uppercase; letter-spacing: -0.5px;">Resumen de Compra</h4>
                   <div style="height: 6px; background-color: #000000; margin-bottom: 10px;"></div>
                   
                   <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      ${itemsHtml}
                      <tr>
                        <td style="padding: 25px 0 8px 0; font-size: 18px; font-weight: 800; color: #444; text-align: left;">SUBTOTAL</td>
                        <td align="right" style="padding: 25px 0 8px 0; font-size: 18px; font-weight: 800; color: #444;">$${subtotal.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 20px 0; border-bottom: 4px solid #000000; font-size: 18px; font-weight: 800; color: #444; text-align: left;">${buildIvaLabel(activeTaxRate, taxName)}</td>
                        <td align="right" style="padding: 0 0 20px 0; border-bottom: 4px solid #000000; font-size: 18px; font-weight: 800; color: #444;">$${iva.toFixed(2)}</td>
                      </tr>
                      ${activeSurchargeRate > 0 ? `
                      <tr>
                        <td style="padding: 0 0 20px 0; border-bottom: 4px solid #000000; font-size: 18px; font-weight: 800; color: #444; text-align: left;">RECARGO (${formatIvaPercent(activeSurchargeRate)}%)</td>
                        <td align="right" style="padding: 0 0 20px 0; border-bottom: 4px solid #000000; font-size: 18px; font-weight: 800; color: #444;">$${surcharge.toFixed(2)}</td>
                      </tr>
                      ` : ""}
                      <tr>
                        <td style="padding: 25px 0 0 0; font-size: 28px; font-weight: 940; color: #000000; text-align: left; text-transform: uppercase; letter-spacing: -1.5px;">TOTAL FINAL</td>
                        <td align="right" class="mobile-total" style="padding: 25px 0 0 0; font-size: 46px; font-weight: 940; color: #000000;">$${total.toFixed(2)}</td>
                      </tr>
                   </table>
                </div>

                <!-- Footer CTA -->
                <div style="margin-top: 45px; text-align: center;">
                  <a href="${actionUrl || '#'}" class="btn-action" style="display: inline-block; padding: 20px 48px; background-color: #ede986; background-image: linear-gradient(#ede986, #ede986); color: #000000 !important; text-decoration: none; font-size: 18px; font-weight: 900; border: 4px solid #000000; border-radius: 100px; box-shadow: 8px 8px 0px 0px #000000; text-transform: uppercase; letter-spacing: 1px; font-family: 'Gilroy','Outfit',Arial,sans-serif;">
                    VER MIS COMPRAS
                  </a>
                </div>

              </div>

              <!-- Extra Footer -->
              <div class="footer" style="padding: 32px 16px; background-color: #fcf9f8; background-image: linear-gradient(#fcf9f8, #fcf9f8); border-top: 3px solid #000000; text-align: center;">
                <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #000000; font-family: 'Gilroy', 'Montserrat', sans-serif;">
                  CUIDADO, AMOR Y TECNOLOGÍA
                </p>
                <p style="margin: 0; font-size: 11px; font-weight: 300; line-height: 1.6; color: #666666; font-family: 'Gilroy', 'Montserrat', sans-serif;">
                  ${new Date().getFullYear()} MIAUWUAUF. Todos los derechos reservados.<br>
                  Estás recibiendo este correo como parte de nuestra comunidad.
                </p>
              </div>

            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Solicitud de acceso al historial: marca lila/crema (#9E97B1 / #FDF9F0) en acciones.
 */
export function getMedicalAccessRequestTemplate({
  vetName,
  petName,
  inAppUrl,
  linkAccept,
  linkReject
}: {
  vetName: string
  petName: string
  inAppUrl: string
  linkAccept: string
  linkReject: string
}) {
  const safeVet = escapeForEmail(vetName)
  const safePet = escapeForEmail(petName)

  // Buttons block rendered inside fichaHtml so it is inside the branded wrapper
  const buttonsBlock = `
    <div style="margin-top:24px;border:3px solid #000000;border-radius:20px;overflow:hidden;-webkit-box-shadow:8px 8px 0px #000000;box-shadow:8px 8px 0px #000000;font-family:'Gilroy','Outfit',Arial,sans-serif;">
      <div style="background-color:#93abd9;background-image:linear-gradient(#93abd9,#93abd9);border-bottom:3px solid #000000;padding:12px 16px;text-align:center;">
        <span style="font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;color:#000000;">¿Qué deseas hacer?</span>
      </div>
      <div style="background-color:#FDF9F0;background-image:linear-gradient(#FDF9F0,#FDF9F0);padding:20px 16px;text-align:center;">
        <a href="${inAppUrl}" style="display:inline-block;margin:6px 4px 16px 4px;padding:14px 22px;background-color:#93abd9;background-image:linear-gradient(#93abd9,#93abd9);color:#000000;font-weight:900;font-size:14px;text-decoration:none;border:3px solid #000000;border-radius:999px;-webkit-box-shadow:4px 4px 0 #000000;box-shadow:4px 4px 0 #000000;font-family:'Gilroy','Outfit',Arial,sans-serif;">
          Abrir MIAUWUAUF (notificaciones)
        </a>
        <div style="margin:8px 0 14px 0;font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#555555;font-family:'Gilroy','Outfit',Arial,sans-serif;">O responde en un clic</div>
        <a href="${linkAccept}" style="display:inline-block;margin:6px 4px;padding:14px 22px;background-color:#FDF9F0;background-image:linear-gradient(#FDF9F0,#FDF9F0);color:#000000;font-weight:900;font-size:14px;text-decoration:none;border:3px solid #000000;border-radius:999px;-webkit-box-shadow:4px 4px 0 #000000;box-shadow:4px 4px 0 #000000;font-family:'Gilroy','Outfit',Arial,sans-serif;">
          Aceptar
        </a>
        <a href="${linkReject}" style="display:inline-block;margin:6px 4px;padding:14px 22px;background-color:#ffffff;background-image:linear-gradient(#ffffff,#ffffff);color:#000000;font-weight:900;font-size:14px;text-decoration:none;border:3px solid #000000;border-radius:999px;-webkit-box-shadow:4px 4px 0 #000000;box-shadow:4px 4px 0 #000000;font-family:'Gilroy','Outfit',Arial,sans-serif;">
          Rechazar
        </a>
      </div>
    </div>
  `

  return getNeobrutalistTemplate({
    title: 'Permiso al historial clínico',
    message: `<strong>${safeVet}</strong> ha pedido permiso para revisar el historial médico de <strong>${safePet}</strong>.<br><br>Puedes decidir desde la aplicación (campanita de notificaciones) o usando los botones de abajo directamente.`,
    fichaHtml: buttonsBlock,
    actionUrl: undefined,
  })
}

