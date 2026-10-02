"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { validateUpload } from "@/lib/upload-validation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dog, Heart, Home, PawPrint, ArrowLeft, LogIn, Eye, EyeOff, Upload, X, User } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { MiauLoading } from "@/components/MiauLoading"
import { SmartBackButton } from "@/components/SmartBackButton"
import { BrandLogo } from "@/components/brand-logo"
import { LogoHorizontal } from "@/components/LogoHorizontal"
import { ensureEcuadorPhoneInputPrefix, formatEcuadorPhoneDisplay, normalizeEcuadorPhoneInput } from "@/lib/phone"

export default function RegistroPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    cedula: "",
    city: "",
    address: "",
    password: "",
    confirmPassword: "",
    image: "",
  })
  /** Foto elegida localmente; se sube en el servidor al registrar (sin /api/upload). */
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Solo permitir números en la cédula
    if (e.target.name === "cedula") {
      const val = e.target.value.replace(/\D/g, "")
      if (val.length <= 10) {
        setFormData({ ...formData, [e.target.name]: val })
      }
      return
    }
    if (e.target.name === "telefono") {
      setFormData({ ...formData, telefono: normalizeEcuadorPhoneInput(e.target.value) })
      return
    }
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !validateUpload(file)) return

    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setAvatarFile(file)
    setImagePreview(URL.createObjectURL(file))
    setFormData((prev) => ({ ...prev, image: "" }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      toast.error("Las contraseñas no coinciden")
      return
    }
    
    if (formData.cedula.length !== 10) {
      toast.error("La cédula debe tener 10 dígitos")
      return
    }

    setLoading(true)

    try {
      let response: Response
      if (avatarFile) {
        const fd = new FormData()
        fd.append("file", avatarFile)
        fd.append("nombre", formData.nombre)
        fd.append("email", formData.email)
        fd.append("telefono", formData.telefono)
        fd.append("cedula", formData.cedula)
        fd.append("password", formData.password)
        fd.append("city", formData.city)
        fd.append("address", formData.address)
        response = await fetch("/api/register", { method: "POST", body: fd })
      } else {
        response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: formData.nombre,
            email: formData.email,
            telefono: formData.telefono,
            cedula: formData.cedula,
            password: formData.password,
            image: formData.image,
            city: formData.city,
            address: formData.address,
          }),
        })
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Error al registrar")
      }

      const { signIn } = await import("next-auth/react")
      const result = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
      })

      if (result?.error) {
        throw new Error("Registro exitoso, pero hubo un problema al iniciar sesion.")
      }

      if (callbackUrl) {
        router.push(callbackUrl)
      } else {
        router.push("/mi-mascota")
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message?.trim() || "Ocurrió un error inesperado")
      } else {
        toast.error("Ocurrio un error inesperado")
      }
    } finally {
      setLoading(false)
    }
  }

  const fieldInputClass =
    "rounded-full border-[2px] border-[#000000] bg-white/90 font-bold text-[#000000] placeholder:text-[#000000]/60 shadow-[2px_2px_0px_0px_#000000]/20 transition-all focus-visible:translate-x-px focus-visible:translate-y-px focus-visible:border-[#000000] focus-visible:shadow-[2px_2px_0px_0px_#000000] focus-visible:ring-0 h-11 px-5 text-base md:h-10 md:px-4 md:text-sm"

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center max-md:justify-start md:justify-center bg-white px-4 py-12 font-body text-[#000000] max-md:px-3 max-md:py-6 max-md:pb-[max(2rem,env(safe-area-inset-bottom))] md:py-8">

      <div className="z-50 flex w-full max-w-[420px] shrink-0 justify-start max-md:pt-[calc(0.5rem+env(safe-area-inset-top))] max-md:pb-2 max-md:pl-1 md:absolute md:left-8 md:top-8 md:max-w-none md:w-auto md:pl-0 md:pb-0 md:pt-0">
        <SmartBackButton />
      </div>

      <Card className="relative w-full max-w-[420px] rounded-[3rem] border-[3px] border-[#000000] bg-white py-6 shadow-[8px_8px_0px_0px_#000000] max-md:rounded-[2rem] max-md:py-4 max-md:shadow-[5px_5px_0px_0px_#000000] md:max-w-[40rem] md:rounded-[2rem] md:py-5 md:shadow-[6px_6px_0px_0px_#000000]">
        <CardHeader className="pt-2 text-center max-md:px-3 max-md:pt-1 md:px-8 md:pb-1 md:pt-1">
          <div className="flex w-full justify-center pb-2 pt-2 max-md:pb-1 max-md:pt-1 md:pb-1 md:pt-0">
            <LogoHorizontal size="md" className="scale-125 max-md:max-w-[min(100%,17rem)] md:hidden" />
            <LogoHorizontal size="sm" className="hidden scale-[1.15] md:block" />
          </div>
          <CardDescription className="mt-2 text-xs font-bold uppercase tracking-wide text-[#000000]/80 md:mt-1 md:text-[11px]">
            Crea tu cuenta para unirte a la comunidad
          </CardDescription>
        </CardHeader>

        <CardContent className="md:px-8 md:pb-1">
          <div className="mb-6 flex flex-col items-center pt-2 max-md:mb-6 md:mb-3 md:pt-0">
            <div className="relative shrink-0 group">
              <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-[3px] border-[#000000] bg-white shadow-[4px_4px_0px_0px_#000000] transition-all group-hover:scale-105 md:h-[4.5rem] md:w-[4.5rem] md:shadow-[3px_3px_0px_0px_#000000]">
                {imagePreview || formData.image ? (
                  <Image
                    src={imagePreview || formData.image}
                    alt="Perfil"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <User className="h-12 w-12 text-[#000000]/20 md:h-9 md:w-9" />
                )}
              </div>
              
              <label className="absolute -bottom-1 -right-1 z-10 cursor-pointer rounded-full border-[2px] border-[#000000] bg-[#e7bef8] p-2 text-[#000000] shadow-[2px_2px_0px_0px_#000000] transition-all hover:bg-[#d94884] active:translate-y-0.5 active:shadow-none md:p-1.5">
                <Upload className="h-4 w-4 md:h-3.5 md:w-3.5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              {(imagePreview || formData.image) && (
                <button
                  type="button"
                  onClick={() => {
                    if (imagePreview) URL.revokeObjectURL(imagePreview)
                    setImagePreview(null)
                    setAvatarFile(null)
                    setFormData(prev => ({ ...prev, image: "" }))
                  }}
                  className="absolute -top-1 -right-1 bg-white hover:bg-red-50 text-[#000000] p-1 rounded-full border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000] transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="mt-3 text-center text-[10px] font-black uppercase tracking-widest text-[#000000]/40 md:mt-2 md:text-[9px]">
              Foto de Perfil
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 px-4 pb-2 max-md:space-y-3.5 md:space-y-3 md:px-0">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-4 md:gap-y-3">
              <div className="space-y-1">
                <Label htmlFor="nombre" className="ml-1 px-2 text-xs font-bold text-[#000000] md:text-[11px]">
                  Nombre Completo
                </Label>
                <Input
                  id="nombre"
                  name="nombre"
                  type="text"
                  placeholder="Juan Pérez"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                  className={fieldInputClass}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="email" className="ml-1 px-2 text-xs font-bold text-[#000000] md:text-[11px]">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={fieldInputClass}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="telefono" className="ml-1 px-2 text-xs font-bold text-[#000000] md:text-[11px]">
                  Teléfono
                </Label>
                <Input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  placeholder="+593 99 123 4567"
                  value={formatEcuadorPhoneDisplay(formData.telefono)}
                  onChange={handleChange}
                  onFocus={() => setFormData((prev) => ({ ...prev, telefono: ensureEcuadorPhoneInputPrefix(prev.telefono) }))}
                  required
                  className={fieldInputClass}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cedula" className="ml-1 px-2 text-xs font-bold text-[#000000] md:text-[11px]">
                  Cédula (10 dígitos)
                </Label>
                <Input
                  id="cedula"
                  name="cedula"
                  type="text"
                  placeholder="0123456789"
                  value={formData.cedula}
                  onChange={handleChange}
                  required
                  className={fieldInputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-4 md:gap-y-3">
              <div className="space-y-1">
                <Label htmlFor="city" className="ml-1 px-2 text-xs font-bold text-[#000000] md:text-[11px]">
                  Ciudad
                </Label>
                <Input
                  id="city"
                  name="city"
                  type="text"
                  placeholder="Quito"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  className={fieldInputClass}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="address" className="ml-1 px-2 text-xs font-bold text-[#000000] md:text-[11px]">
                  Dirección Exacta
                </Label>
                <Input
                  id="address"
                  name="address"
                  type="text"
                  placeholder="Calle, Sector, Referencia"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  className={fieldInputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-4 md:gap-y-3">
              <div className="space-y-1">
                <Label htmlFor="password" className="ml-1 px-2 text-xs font-bold text-[#000000] md:text-[11px]">
                  Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className={`${fieldInputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#000000] hover:scale-110 transition-transform focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirmPassword" className="ml-1 px-2 text-xs font-bold text-[#000000] md:text-[11px]">
                  Confirmar
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className={`${fieldInputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#000000] hover:scale-110 transition-transform focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pb-2 pt-4 max-md:pt-2 md:pt-2">
              <Button
                type="submit"
                className="flex h-14 w-full items-center justify-center gap-2 rounded-[3rem] border-[3px] border-[#000000] bg-[#E7BEF8] font-heading text-lg font-black text-[#000000] shadow-[6px_6px_0px_0px_#000000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:bg-[#EDE986] hover:shadow-[3px_3px_0px_0px_#000000] max-md:min-h-[3.25rem] md:h-12 md:gap-2.5 md:text-lg md:shadow-[5px_5px_0px_0px_#000000]"
                disabled={loading}
              >
                <LogIn className="h-6 w-6 md:h-6 md:w-6" strokeWidth={2.5} />
                {loading ? "Registrando..." : "Crear Cuenta"}
              </Button>
            </div>

            <div className="mt-4 space-y-3 rounded-[2rem] border-[2px] border-[#000000]/10 bg-[#cad1e9]/20 p-4 max-md:mt-3 max-md:rounded-3xl max-md:p-3 md:mt-3 md:space-y-2 md:p-3">
              <p className="text-center text-[10px] font-black uppercase leading-none tracking-widest text-[#000000]/60 max-md:px-1 md:text-[9px]">
                Al registrarte podrás:
              </p>
              <div className="grid grid-cols-1 gap-2 pl-2 max-md:pl-1 md:grid-cols-3 md:gap-2 md:pl-0">
                <div className="flex items-center gap-2 text-xs font-bold leading-tight text-[#000000]/80 md:gap-1.5 md:text-[10px]">
                  <Heart className="h-3.5 w-3.5 shrink-0 text-pink-500 md:h-3 md:w-3" />
                  Adoptar una mascota
                </div>
                <div className="flex items-center gap-2 text-xs font-bold leading-tight text-[#000000]/80 md:gap-1.5 md:text-[10px]">
                  <PawPrint className="h-3.5 w-3.5 shrink-0 text-[#8b7fc7] md:h-3 md:w-3" />
                  Registrar tus mascotas
                </div>
                <div className="flex items-center gap-2 text-xs font-bold leading-tight text-[#000000]/80 md:gap-1.5 md:text-[10px]">
                  <Home className="h-3.5 w-3.5 shrink-0 text-[#E7BEF8] md:h-3 md:w-3" />
                  Acceder a eventos y veterinario
                </div>
              </div>
            </div>

            <p className="mt-6 text-center text-xs font-bold text-[#000000]/80 max-md:mt-6 md:mt-4">
              ¿Ya tienes cuenta?{" "}
              <Link 
                href={`/login${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`} 
                className="text-[#e7bef8] hover:text-[#d94884] font-black hover:underline"
              >
                Inicia sesión aquí
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
