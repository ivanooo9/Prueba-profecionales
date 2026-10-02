const patchScript = `
const fs = require('fs');
const path = 'miauwuauf/lib/email-templates.ts';
let content = fs.readFileSync(path, 'utf8');

const startMarker = 'export function getNeobrutalistTemplate(';
const endMarker = '\\nexport function getNewPetTemplate(';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);
if (startIdx === -1 || endIdx === -1) {
  console.log('ERROR: markers not found startIdx=' + startIdx + ' endIdx=' + endIdx);
  process.exit(1);
}

const newFn = \`export function getNeobrutalistTemplate({
  title,
  message,
  actionUrl,
  actionText,
  fichaHtml,
  headerBgHex,
}: TemplateOptions) {
  const safeTitle = stripNotificationEmojis(title);
  const safeMessage = stripNotificationEmojis(message).replace(/\\\\n/g, '<br>');
  const year = new Date().getFullYear();

  return \\\`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="x-apple-disable-message-reformatting" />
      <meta name="color-scheme" content="light only">
      <meta name="supported-color-schemes" content="light only">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;700;800&display=swap');

        :root { color-scheme: light only; supported-color-schemes: light only; }

        html, body {
          margin: 0 !important; padding: 0 !important; width: 100% !important;
          -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;
          color: #000000;
        }

        body {
          font-family: 'Montserrat', 'Helvetica Neue', Arial, sans-serif;
          background-color: #e5e2e1;
          -webkit-font-smoothing: antialiased;
        }

        *, *::before, *::after { box-sizing: border-box; }

        .title, .subtitle, .message, .detail, p, span, td, strong, th, h1, h2, h3, h4, h5, h6 {
          color: #000000;
        }

        table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; max-width: 100%; height: auto; }

        .main-wrapper {
          max-width: 600px;
          width: 100% !important;
          margin: 32px auto;
          background-color: #fcf9f8 !important;
          border: 2.5px solid #000000 !important;
          border-radius: 16px !important;
          box-shadow: 6px 6px 0px 0px #000000 !important;
          overflow: hidden;
        }

        .email-header {
          background-color: \\\${headerBgHex || '#f2619c'};
          padding: 28px 24px 24px 24px;
          border-bottom: 2.5px solid #000000;
          text-align: center;
        }

        .content-body {
          color: #000000;
          padding: 36px 28px 28px 28px;
          background-color: #fcf9f8;
        }

        .title {
          font-size: 24px;
          font-weight: 800;
          margin: 0 0 16px 0;
          line-height: 1.3;
          font-family: 'Montserrat', 'Helvetica Neue', Arial, sans-serif;
          word-break: break-word;
          overflow-wrap: anywhere;
          color: #000000;
        }

        .message {
          font-size: 16px;
          font-weight: 400;
          color: #000000;
          line-height: 1.6;
          margin-bottom: 28px;
          font-family: 'Montserrat', 'Helvetica Neue', Arial, sans-serif;
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        .message strong { font-weight: 700; }

        .note-block {
          font-size: 12px;
          font-weight: 300;
          color: #000000;
          line-height: 1.5;
          border-left: 2px solid #000000;
          padding-left: 12px;
          margin-top: 8px;
          font-family: 'Montserrat', 'Helvetica Neue', Arial, sans-serif;
        }

        .btn-action {
          display: inline-block;
          max-width: 100%;
          padding: 14px 32px;
          background-color: #ede986;
          border: 2px solid #000000;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 4px 4px 0px 0px #000000;
          margin: 8px 0 24px 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-family: 'Montserrat', 'Helvetica Neue', Arial, sans-serif;
          word-break: break-word;
          box-sizing: border-box;
          color: #000000 !important;
        }

        .footer {
          padding: 28px 24px;
          background-color: #fcf9f8;
          border-top: 2.5px solid #000000;
          text-align: center;
        }

        .footer-copy {
          font-size: 12px;
          font-weight: 300;
          color: #000000;
          line-height: 1.6;
          margin: 0 0 12px 0;
          font-family: 'Montserrat', 'Helvetica Neue', Arial, sans-serif;
        }

        .footer-links {
          margin: 0;
          padding: 0;
        }

        .footer-link {
          font-size: 12px;
          font-weight: 700;
          color: #000000 !important;
          text-decoration: underline;
          margin: 0 10px;
          font-family: 'Montserrat', 'Helvetica Neue', Arial, sans-serif;
        }

        .email-ficha table { table-layout: fixed !important; width: 100% !important; }

        @media only screen and (max-width: 480px) {
          .main-wrapper { margin: 8px auto !important; border-radius: 12px !important; max-width: 100% !important; }
          .content-body { padding: 24px 16px !important; }
          .title { font-size: 20px !important; }
          .message { font-size: 14px !important; }
          .btn-action { padding: 12px 20px !important; width: 100% !important; max-width: 100% !important; display: block !important; box-sizing: border-box !important; }
          .footer { padding: 20px 14px !important; }
        }
      </style>
    </head>
    <body style="background-color: #e5e2e1; margin: 0; padding: 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #e5e2e1; table-layout: fixed; width: 100%;">
        <tr>
          <td align="center" style="padding: 16px 8px; width: 100%;">
            <div class="main-wrapper" style="max-width: 600px; width: 100%; background-color: #fcf9f8;">

              <!-- Header con logo -->
              <div class="email-header" style="background-color: \\\${headerBgHex || '#f2619c'}; padding: 28px 24px 24px 24px; border-bottom: 2.5px solid #000000; text-align: center;">
                <a href="https://miauwuauf.com" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: inline-block;">
                  <img
                    src="https://res.cloudinary.com/du8zslrhq/image/upload/v1776827595/miauwuauf_logo_email.png"
                    alt="MIAUWUAUF"
                    width="160"
                    height="auto"
                    style="height: 55px; width: auto; display: block; margin: 0 auto; border: none; outline: none;"
                  />
                </a>
              </div>

              <!-- Cuerpo -->
              <div class="content-body">
                <h2 class="title">\\\${safeTitle}</h2>
                <div class="message">\\\${safeMessage}</div>

                \\\${fichaHtml ? \\\`<div style="margin-bottom: 28px;">\\\${fichaHtml}</div>\\\` : ''}

                \\\${actionUrl ? \\\`
                  <div style="text-align: center; margin: 20px 0;">
                    <a href="\\\${actionUrl}" class="btn-action" style="background-color: #ede986; color: #000000;">
                      \\\${actionText || 'Ver Detalles'}
                    </a>
                  </div>
                \\\` : ''}
              </div>

              <!-- Footer -->
              <div class="footer">
                <p class="footer-copy">
                  &copy; \\\${year} MIAUWUAUF. Todos los derechos reservados.<br>
                  Informaci&oacute;n legal y t&eacute;rminos de uso.
                </p>
                <p class="footer-links">
                  <a class="footer-link" href="#">Privacidad</a>
                  <a class="footer-link" href="#">T&eacute;rminos</a>
                  <a class="footer-link" href="#">Contacto</a>
                </p>
              </div>

            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  \\\`;
}\`;

const newContent = content.slice(0, startIdx) + newFn + content.slice(endIdx);
fs.writeFileSync(path, newContent, 'utf8');
console.log('OK - replaced getNeobrutalistTemplate successfully');
`;

require('fs').writeFileSync('patch-neobrutalist.js', patchScript);
