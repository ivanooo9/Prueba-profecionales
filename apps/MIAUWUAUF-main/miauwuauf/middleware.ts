import { NextResponse } from "next/server"
import { auth } from "@/auth"

// Rutas que requieren autenticación y su rol permitido
const PROTECTED_ROUTES: Record<string, string[]> = {
  "/admin":      ["admin"],
  "/dashboard":  ["admin", "veterinario"],
  "/mi-mascota": ["usuario", "admin"],
  "/blog-admin": ["admin", "bloguer"],
}

// A dónde redirigir según el rol
const ROLE_HOME: Record<string, string> = {
  admin:       "/admin",
  veterinario: "/dashboard",
  usuario:     "/mi-mascota",
  bloguer:     "/blog-admin",
}

export default auth((req) => {
  const { pathname } = req.nextUrl
  const user = req.auth?.user

  // Buscar si la ruta actual está protegida
  const matchedRoute = Object.keys(PROTECTED_ROUTES).find(
    (route) => pathname === route || pathname.startsWith(route + "/")
  )

  if (!matchedRoute) return NextResponse.next()

  // No hay sesión → al login
  if (!user) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    const response = NextResponse.redirect(loginUrl)
    // Evitar que el navegador guarde esta página en caché
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")
    return response
  }

  // Cuenta desactivada → al login
  if (user.isActive === false) {
    const loginUrl = new URL("/login?error=AccountDeactivated", req.url)
    return NextResponse.redirect(loginUrl)
  }

  const role = user.role as string | undefined

  // Rol no permitido para esta ruta → redirigir a su panel correcto
  const allowedRoles = PROTECTED_ROUTES[matchedRoute]
  if (role && !allowedRoles.includes(role)) {
    const home = ROLE_HOME[role] ?? "/"
    return NextResponse.redirect(new URL(home, req.url))
  }

  // Todo OK → agregar headers anti-caché y continuar
  const response = NextResponse.next()
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
  response.headers.set("Pragma", "no-cache")
  response.headers.set("Expires", "0")
  return response
})

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/mi-mascota/:path*",
    "/blog-admin/:path*",
  ],
}
