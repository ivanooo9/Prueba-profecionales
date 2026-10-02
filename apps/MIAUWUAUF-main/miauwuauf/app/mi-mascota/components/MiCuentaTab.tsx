"use client"

import React, { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { 
  User, Mail, Phone, MapPin, Lock, Camera, Save, 
  Map as MapIcon, CreditCard, Building, Loader2, Eye, EyeOff
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { validateUpload } from "@/lib/upload-validation"
import {
  ensureEcuadorPhoneInputPrefix,
  formatEcuadorPhoneDisplay,
  normalizeEcuadorPhoneInput,
} from "@/lib/phone"

interface UserProfile {
  name: string
  email: string
  cedula: string
  phone: string
  city: string
  address: string
  image: string
}

interface UpdatePayload extends UserProfile {
  password?: string
}

export const MiCuentaTab = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const updateLockRef = useRef(false)
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    email: "",
    cedula: "",
    phone: "",
    city: "",
    address: "",
    image: ""
  })
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/user/me")
      if (res.ok) {
        const data = await res.json()
        setProfile({
          name: data.name || "",
          email: data.email || "",
          cedula: data.cedula || "",
          phone: data.phone || "",
          city: data.city || "",
          address: data.address || "",
          image: data.image || ""
        })
      } else {
        toast.error("Error al cargar perfil")
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
      toast.error("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving || updateLockRef.current) return
    
    if (password && password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden")
      return
    }

    updateLockRef.current = true
    setSaving(true)
    try {
      const updatePayload: UpdatePayload = { ...profile }
      if (password) updatePayload.password = password

      const res = await fetch("/api/user/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload)
      })

      if (res.ok) {
        toast.success("Perfil actualizado correctamente")
        setPassword("")
        setConfirmPassword("")
        fetchProfile()
      } else {
        const err = await res.json()
        toast.error(err.error || "Error al actualizar")
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("Error de conexión")
    } finally {
      setSaving(false)
      updateLockRef.current = false
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (uploadingImage) return
    const file = e.target.files?.[0]
    if (!file || !validateUpload(file)) return

    const formData = new FormData()
    formData.append("file", file)

    const toastId = toast.loading("Subiendo imagen...")
    setUploadingImage(true)
    
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      })

      if (res.ok) {
        const data = await res.json()
        setProfile(prev => ({ ...prev, image: data.secure_url }))
        toast.success("Imagen subida con éxito", { id: toastId })
      } else {
        toast.error("Error al subir imagen", { id: toastId })
      }
    } catch (error) {
      console.error("Error uploading image:", error)
      toast.error("Error de conexión", { id: toastId })
    } finally {
      setUploadingImage(false)
      e.target.value = ""
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="font-bold text-muted-foreground">Cargando tu información...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-fade-in mb-20">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Foto de Perfil */}
        <div className="w-full md:w-1/3 flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="w-40 h-40 rounded-full border-[3px] border-[#000000] overflow-hidden shadow-[6px_6px_0px_0px_#000000] bg-white relative">
              {profile.image ? (
                <Image src={profile.image} alt={profile.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                  <User className="h-20 w-20 text-primary/40" />
                </div>
              )}
            </div>
            <label className={`absolute bottom-1 right-1 p-2.5 bg-primary text-primary-foreground rounded-full border-2 border-[#000000] cursor-pointer shadow-[3px_3px_0px_0px_#000000] hover:translate-y-0.5 hover:shadow-none transition-all ${uploadingImage ? "pointer-events-none opacity-60" : ""}`}>
              <Camera className="h-4 w-4" />
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
            </label>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-black text-[#000000] tracking-tight">{profile.name || "Usuario"}</h3>
            <p className="text-[#000000]/40 font-bold text-xs uppercase tracking-widest mt-1">{profile.email}</p>
          </div>
        </div>

        {/* Formulario de Edición */}
        <div className="w-full md:w-2/3">
          <form onSubmit={handleUpdate} className="space-y-6">
            
            {/* Sección: Datos Personales */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-black uppercase tracking-wider text-xs">
                <CreditCard className="h-4 w-4" />
                <span>Datos de Identidad</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="userName" className="text-[10px] font-black uppercase tracking-widest text-[#000000]/40 ml-1">Nombre Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="userName"
                      className="pl-10 h-12 bg-white border-2 border-[#000000] rounded-xl focus:ring-0 focus:border-primary transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
                      placeholder="Tu nombre"
                      value={profile.name}
                      onChange={e => setProfile({ ...profile, name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userCedula" className="text-[10px] font-black uppercase tracking-widest text-[#000000]/40 ml-1">Cédula / ID</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="userCedula"
                      className="pl-10 h-12 bg-white border-2 border-[#000000] rounded-xl focus:ring-0 focus:border-primary transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
                      placeholder="Número de identificación"
                      value={profile.cedula}
                      onChange={e => setProfile({ ...profile, cedula: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sección: Ubicación y Contacto */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[#E7BEF8] font-black uppercase tracking-wider text-xs">
                <MapPin className="h-4 w-4" />
                <span>Contacto y Ubicación</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="userPhone" className="text-[10px] font-black uppercase tracking-widest text-[#000000]/40 ml-1">Teléfono</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="userPhone"
                      className="pl-10 h-12 bg-white border-2 border-[#000000] rounded-xl focus:ring-0 focus:border-primary transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
                      placeholder="Número de celular"
                      value={formatEcuadorPhoneDisplay(profile.phone)}
                      onChange={e => setProfile({ ...profile, phone: normalizeEcuadorPhoneInput(e.target.value) })}
                      onFocus={() => setProfile((prev) => ({ ...prev, phone: ensureEcuadorPhoneInputPrefix(prev.phone) }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userCity" className="text-[10px] font-black uppercase tracking-widest text-[#000000]/40 ml-1">Ciudad</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="userCity"
                      className="pl-10 h-12 bg-white border-2 border-[#000000] rounded-xl focus:ring-0 focus:border-primary transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
                      placeholder="Tu ciudad"
                      value={profile.city}
                      onChange={e => setProfile({ ...profile, city: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="userAddress" className="text-[10px] font-black uppercase tracking-widest text-[#000000]/40 ml-1">Dirección Completa</Label>
                <div className="relative">
                  <MapIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <textarea 
                    id="userAddress"
                    className="w-full pl-10 pt-3 min-h-[100px] bg-white border-2 border-[#000000] rounded-xl focus:ring-0 focus:border-primary transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] resize-none"
                    placeholder="Calle principal, secundaria y referencias..."
                    value={profile.address}
                    onChange={e => setProfile({ ...profile, address: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Sección: Seguridad */}
            <div className="space-y-4 pt-4 border-t border-[#000000]/10">
              <div className="flex items-center gap-2 text-[#93ABD9] font-black uppercase tracking-wider text-xs">
                <Lock className="h-4 w-4" />
                <span>Seguridad (Opcional)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-[10px] font-black uppercase tracking-widest text-[#000000]/40 ml-1">Nueva Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      className="pl-10 pr-10 h-12 bg-white border-2 border-[#000000] rounded-xl focus:ring-0 focus:border-primary transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
                      placeholder="Dejar vacío si no deseas cambiar"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-[10px] font-black uppercase tracking-widest text-[#000000]/40 ml-1">Confirmar Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      className="pl-10 pr-10 h-12 bg-white border-2 border-[#000000] rounded-xl focus:ring-0 focus:border-primary transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
                      placeholder="Repite tu nueva contraseña"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={saving}
              className="w-full h-12 bg-primary text-[#000000] text-sm font-black rounded-xl border-2 border-[#000000] shadow-[4px_4px_0px_0px_#000000] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50 mt-4"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Actualizar Mi Perfil
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
