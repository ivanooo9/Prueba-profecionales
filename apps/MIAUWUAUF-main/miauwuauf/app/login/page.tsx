"use client"

import type React from "react"
import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dog, Stethoscope, LogIn, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { SmartBackButton } from "@/components/SmartBackButton"
import { MiauLoading } from "@/components/MiauLoading"
import { useSession } from "next-auth/react"

function LoginFormContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl")
  const tabParam = searchParams.get("tab")
  const defaultTab = tabParam === "veterinario" ? "veterinario" : "usuario"
  const [vetEmail, setVetEmail] = useState("")
  const [vetPassword, setVetPassword] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [userPassword, setUserPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showUserPassword, setShowUserPassword] = useState(false)
  const [showVetPassword, setShowVetPassword] = useState(false)

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const userRole = session.user.role
      if (callbackUrl) {
        router.push(callbackUrl)
      } else if (userRole === "admin") {
        router.push("/admin")
      } else if (userRole === "bloguer") {
        router.push("/blog-admin")
      } else if (userRole === "veterinario") {
        router.push("/dashboard")
      } else {
        router.push("/mi-mascota")
      }
    }
  }, [status, session, callbackUrl, router])

  if (status === "loading" || status === "authenticated") {
    return <MiauLoading text="Preparando acceso..." />
  }

  const handleLogin = async (email: string, pass: string, isVet: boolean) => {
    setLoading(true)
    try {
      const { signIn } = await import("next-auth/react")
      const result = await signIn("credentials", {
        redirect: false,
        email: email,
        password: pass,
      })

      if (result?.error) {
        // Verificamos si la cuenta está desactivada mediante un API dedicado
        // para evitar que NextAuth oculte el error real por seguridad.
        try {
          const checkRes = await fetch("/api/auth/check-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          const { inactive } = await checkRes.json();
          
          if (inactive) {
            toast.error("Tu cuenta ha sido desactivada por un administrador.")
          } else {
            toast.error("Email o contrasena incorrectos")
          }
        } catch {
          toast.error("Email o contrasena incorrectos")
        }
      } else {
        toast.success("Sesion iniciada exitosamente")

        // Obtenemos la sesión actualizada para ver el rol
        const { getSession } = await import("next-auth/react")
        const session = await getSession()
        const userRole = session?.user?.role

        console.log("Login exitoso. Rol detectado:", userRole)

        // --- VALIDACIÓN DE PESTAÑA VS ROL ---
        const { signOut } = await import("next-auth/react");
        
        if (isVet) {
          // Pestaña Veterinario: Solo permite veterinarios y admins
          if (userRole !== "veterinario" && userRole !== "admin") {
            await signOut({ redirect: false });
            toast.error("Acceso denegado: Esta pestaña es exclusiva para personal veterinario.");
            setLoading(false);
            return;
          }
        } else {
          // Pestaña Usuario: Evita que entren veterinarios por aquí
          if (userRole === "veterinario") {
            await signOut({ redirect: false });
            toast.error("Acceso denegado: Eres personal veterinario, por favor usa la pestaña correspondiente.");
            setLoading(false);
            return;
          }
        }
        // ------------------------------------

        // Redirección dinámica según el ROL de la base de datos
        await new Promise((resolve) => setTimeout(resolve, 350))
        if (callbackUrl) {
          router.push(callbackUrl)
        } else if (userRole === "admin") {
          router.push("/admin")
        } else if (userRole === "bloguer") {
          router.push("/blog-admin")
        } else if (userRole === "veterinario") {
          router.push("/dashboard")
        } else {
          router.push("/mi-mascota")
        }
      }
    } catch {
      toast.error("Error al iniciar sesion")
    } finally {
      setLoading(false)
    }
  }

  const handleVetLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleLogin(vetEmail, vetPassword, true)
  }

  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleLogin(userEmail, userPassword, false)
  }


  return (
    <div className="relative flex min-h-screen w-full flex-col items-center max-md:justify-start md:justify-center bg-white px-4 font-body max-md:px-3 max-md:py-4 max-md:pb-[max(1.5rem,env(safe-area-inset-bottom))] md:py-0">

      <div className="z-50 flex w-full max-w-[420px] shrink-0 justify-start max-md:pt-[calc(0.5rem+env(safe-area-inset-top))] max-md:pb-2 max-md:pl-1 md:absolute md:left-8 md:top-8 md:max-w-none md:w-auto md:pl-0 md:pb-0 md:pt-0">
        <SmartBackButton fallbackUrl={callbackUrl || "/"} />
      </div>

      <Card className="relative w-full max-w-[420px] rounded-[3rem] border-[3px] border-foreground bg-white py-6 shadow-[8px_8px_0px_0px_#000000] max-md:rounded-[2rem] max-md:py-4 max-md:shadow-[5px_5px_0px_0px_#000000]">
        <CardHeader className="pt-2 text-center max-md:px-3 max-md:pt-1">
          <div className="flex w-full justify-center pb-2 pt-2 max-md:pb-1 max-md:pt-1">
            <div className="relative aspect-[4/1] w-full max-w-[280px] overflow-hidden max-md:max-w-[min(100%,15.5rem)]">
              <div 
                className="absolute inset-0 flex items-center justify-center scale-[1.8] max-md:scale-[1.45]"
                style={{ mixBlendMode: 'multiply' }}
              >
                <Image
                  src="/logoLargoAmarillo.PNG"
                  alt="MIAUWUAUF Logo"
                  width={600}
                  height={150}
                  className="object-contain w-full h-full"
                  priority
                />
              </div>
            </div>
          </div>
          <CardDescription className="text-xs font-bold text-[#000000]/80 mt-2 tracking-wide uppercase">Inicia sesión para acceder a tu cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="!grid mb-8 grid h-auto w-full grid-cols-1 gap-2 rounded-[1.75rem] border-[2px] border-[#000000]/15 bg-[#E7BEF8]/40 p-1.5 shadow-inner max-md:mb-5 md:grid-cols-2 md:gap-1.5 md:rounded-full md:min-h-14">
              <TabsTrigger value="usuario" className="flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-2xl text-xs font-bold text-[#000000]/70 transition-all data-[state=active]:border-[3px] data-[state=active]:border-[#000000] data-[state=active]:bg-[#93ABD9] data-[state=active]:text-[#000000] data-[state=active]:shadow-[2px_2px_0px_0px_#000000] max-md:py-2.5 md:h-full md:min-h-0 md:w-auto md:rounded-full">
                <Dog className="h-4 w-4 shrink-0 md:h-4" />
                Usuario
              </TabsTrigger>
              <TabsTrigger value="veterinario" className="flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-2xl text-xs font-bold text-[#000000]/70 transition-all data-[state=active]:border-[3px] data-[state=active]:border-[#000000] data-[state=active]:bg-[#93ABD9] data-[state=active]:text-[#000000] data-[state=active]:shadow-[2px_2px_0px_0px_#000000] max-md:py-2.5 md:h-full md:min-h-0 md:w-auto md:rounded-full">
                <Stethoscope className="h-4 w-4 shrink-0 md:h-4" />
                Veterinario
              </TabsTrigger>
            </TabsList>

            <TabsContent value="usuario">
              <form onSubmit={handleUserLogin} className="space-y-5 px-4 pb-2 max-md:space-y-4 md:px-6">
                <div className="space-y-1">
                  <Label htmlFor="user-email" className="text-xs font-bold text-[#000000] px-2 ml-1">Email</Label>
                  <Input
                    id="user-email"
                    type="email"
                    placeholder="tu@email.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    required
                    className="h-12 rounded-full border-[2px] border-[#000000] bg-white/90 px-5 text-base font-bold text-[#000000] placeholder:text-[#000000]/60 shadow-[2px_2px_0px_0px_#000000]/20 transition-all focus-visible:translate-x-[1px] focus-visible:translate-y-[1px] focus-visible:border-[#000000] focus-visible:shadow-[2px_2px_0px_0px_#000000] focus-visible:ring-0 md:text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="user-password" className="text-xs font-bold text-[#000000] px-2 ml-1">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="user-password"
                      type={showUserPassword ? "text" : "password"}
                      placeholder="********"
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      required
                      className="h-12 rounded-full border-[2px] border-[#000000] bg-white/90 px-5 pr-12 text-base font-bold text-[#000000] placeholder:text-[#000000]/60 shadow-[2px_2px_0px_0px_#000000]/20 transition-all focus-visible:translate-x-[1px] focus-visible:translate-y-[1px] focus-visible:border-[#000000] focus-visible:shadow-[2px_2px_0px_0px_#000000] focus-visible:ring-0 md:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUserPassword(!showUserPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#000000] hover:scale-110 transition-transform focus:outline-none"
                    >
                      {showUserPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <div className="pt-4 max-md:pt-2">
                  <Button type="submit" className="flex h-14 w-full items-center justify-center gap-2 rounded-[3rem] border-[3px] border-[#000000] bg-[#E7BEF8] font-heading text-lg font-black text-[#000000] shadow-[6px_6px_0px_0px_#000000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:bg-[#EDE986] hover:shadow-[3px_3px_0px_0px_#000000] max-md:min-h-[3.25rem] md:h-16 md:gap-3 md:text-2xl" disabled={loading}>
                    <LogIn className="w-6 h-6 md:w-8 md:h-8" strokeWidth={2.5} />
                    {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
                  </Button>
                </div>
                <p className="text-xs text-center text-[#000000]/80 mt-6 font-bold">
                  ¿No tienes cuenta?{" "}
                  <Link 
                    href={`/registro${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`} 
                    className="text-[#e7bef8] hover:text-[#d94884] font-black hover:underline"
                  >
                    Regístrate aquí
                  </Link>
                </p>
              </form>
            </TabsContent>

            <TabsContent value="veterinario">
              <form onSubmit={handleVetLogin} className="space-y-5 px-4 pb-2 max-md:space-y-4 md:px-6">
                <div className="space-y-1">
                  <Label htmlFor="vet-email" className="text-xs font-bold text-[#000000] px-2 ml-1">Email Profesional</Label>
                  <Input
                    id="vet-email"
                    type="email"
                    placeholder="veterinario@miauwuauf.com"
                    value={vetEmail}
                    onChange={(e) => setVetEmail(e.target.value)}
                    required
                    className="h-12 rounded-full border-[2px] border-[#000000] bg-white/90 px-5 text-base font-bold text-[#000000] placeholder:text-[#000000]/60 shadow-[2px_2px_0px_0px_#000000]/20 transition-all focus-visible:translate-x-[1px] focus-visible:translate-y-[1px] focus-visible:border-[#000000] focus-visible:shadow-[2px_2px_0px_0px_#000000] focus-visible:ring-0 md:text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="vet-password" className="text-xs font-bold text-[#000000] px-2 ml-1">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="vet-password"
                      type={showVetPassword ? "text" : "password"}
                      placeholder="********"
                      value={vetPassword}
                      onChange={(e) => setVetPassword(e.target.value)}
                      required
                      className="h-12 rounded-full border-[2px] border-[#000000] bg-white/90 px-5 pr-12 text-base font-bold text-[#000000] placeholder:text-[#000000]/60 shadow-[2px_2px_0px_0px_#000000]/20 transition-all focus-visible:translate-x-[1px] focus-visible:translate-y-[1px] focus-visible:border-[#000000] focus-visible:shadow-[2px_2px_0px_0px_#000000] focus-visible:ring-0 md:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowVetPassword(!showVetPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#000000] hover:scale-110 transition-transform focus:outline-none"
                    >
                      {showVetPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <div className="pt-4 max-md:pt-2">
                  <Button type="submit" className="flex h-14 w-full items-center justify-center gap-2 rounded-[3rem] border-[3px] border-[#000000] bg-[#E7BEF8] font-heading text-base font-black leading-tight text-[#000000] shadow-[6px_6px_0px_0px_#000000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:bg-[#EDE986] hover:shadow-[3px_3px_0px_0px_#000000] max-md:min-h-[3.25rem] max-md:px-2 md:h-16 md:gap-3 md:text-xl" disabled={loading}>
                    <LogIn className="w-6 h-6 md:w-8 md:h-8" strokeWidth={2.5} />
                    {loading ? "Iniciando sesión..." : "Acceder al Dashboard"}
                  </Button>
                </div>
                <p className="text-xs font-bold text-center text-[#000000]/80 mt-6">
                  Acceso exclusivo para personal veterinario
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<MiauLoading text="Preparando acceso..." />}>
      <LoginFormContent />
    </Suspense>
  )
}
