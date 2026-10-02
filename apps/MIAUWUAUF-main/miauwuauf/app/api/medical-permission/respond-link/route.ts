import { NextRequest, NextResponse } from "next/server"
import { respondByToken } from "@/lib/medical-permission-respond"

/**
 * Aceptar / rechazar desde el enlace del correo (sin exigir sesión; valida token).
 * Redirige a una página pública; así no se manda a /mi-mascota a quien tenga otra sesión (p. ej. veterinario).
 */
export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
  const resultBase = `${appUrl}/respuesta-permiso-historial`
  const p = req.nextUrl.searchParams.get("p")
  const d = req.nextUrl.searchParams.get("d")
  const t = req.nextUrl.searchParams.get("t")
  if (!p || !t || (d !== "accept" && d !== "reject")) {
    return NextResponse.redirect(`${resultBase}?r=invalid`)
  }
  const accept = d === "accept"
  const r = await respondByToken(p, t, accept)
  if (r.error === "invalid") {
    return NextResponse.redirect(`${resultBase}?r=invalid`)
  }
  if (r.error === "not_pending") {
    return NextResponse.redirect(`${resultBase}?r=done`)
  }
  return NextResponse.redirect(`${resultBase}?r=${accept ? "ok_a" : "ok_r"}`)
}
