/**
 * URLs y marca para correos HTML (solo servidor — usa process.env).
 */

function escapeHtmlAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")
}

/** Dominio público principal (href del logo y enlaces en plantillas). */
export function getSiteUrlForEmail(): string {
  const fromEnv =
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    ""
  const vercel = process.env.VERCEL_URL?.trim() || ""
  const fallback = fromEnv || (vercel ? `https://${vercel}` : "") || "https://miauwuauf.com"
  try {
    if (fallback.startsWith("http://") || fallback.startsWith("https://")) {
      return fallback.replace(/\/$/, "")
    }
    return `https://${fallback}`.replace(/\/$/, "")
  } catch {
    return "https://miauwuauf.com"
  }
}

/** Logo URL de Cloudinary para correos */
const LOGO_URL = "https://res.cloudinary.com/du8zslrhq/image/upload/e_trim/v1776827595/miauwuauf_logo_email.png"

/** Bloque visual de cabecera con logo real de Cloudinary sobre fondo rosa. */
export function renderEmailBrandedHeader(
  siteUrl?: string,
  headerBgColor = "#f2619c",
): string {
  const link = escapeHtmlAttr(siteUrl || getSiteUrlForEmail())
  const bg = escapeHtmlAttr(headerBgColor || "#f2619c")

  return `
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${bg}; background-image: linear-gradient(${bg}, ${bg}); border-bottom: 3px solid #000000;">
      <tr>
        <td align="center" style="padding: 24px 16px; background-color: ${bg}; background-image: linear-gradient(${bg}, ${bg});">
          <a href="${link}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: inline-block;">
            <img
              src="${LOGO_URL}"
              alt="MIAUWUAUF"
              width="280"
              height="38"
              style="width: 280px; height: 38px; display: block; border: none; outline: none; text-decoration: none;"
            />
          </a>
        </td>
      </tr>
    </table>`
}
