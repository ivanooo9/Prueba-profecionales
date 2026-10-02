"use client"

import React, { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { 
  User, Mail, Phone, MapPin, Lock, Camera, Save, 
  CreditCard, Building, Loader2, Stethoscope, Eye, EyeOff
} from "lucide-react"
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
  specialty: string
  clinicName: string
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
    clinicName: "",
    image: "",
    specialty: ""
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
          clinicName: data.clinicName || "",
          image: data.image || "",
          specialty: data.specialty || ""
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
        <Loader2 className="h-10 w-10 text-[#a8d5ba] animate-spin" />
        <p className="font-bold text-muted-foreground uppercase tracking-widest text-xs">Cargando Credenciales...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in pb-20">
      <div className="flex flex-col lg:flex-row gap-12 items-start">
        
        {/* Lado Izquierdo: Perfil Card */}
        <div className="w-full lg:w-1/3 flex flex-col items-center">
          <div className="bg-white border-[3px] border-[#000000] rounded-[40px] p-8 shadow-[8px_8px_0px_0px_#000000] w-full flex flex-col items-center gap-6 relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 left-0 w-full h-24 bg-[#a8d5ba] border-b-[3px] border-[#000000]" />
            
            <div className="relative group mt-4">
              <div className="w-40 h-40 rounded-full border-[4px] border-[#000000] overflow-hidden shadow-[6px_6px_0px_0px_#000000] bg-white relative">
                {profile.image ? (
                  <Image src={profile.image} alt={profile.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#a8d5ba]/20">
                    <User className="h-16 w-16 text-[#a8d5ba]" />
                  </div>
                )}
              </div>
              <label className={`absolute bottom-1 right-1 p-3 bg-[#bdb2ff] text-[#000000] rounded-full border-[3px] border-[#000000] cursor-pointer shadow-[3px_3px_0px_0px_#000000] hover:translate-y-0.5 hover:shadow-none transition-all ${uploadingImage ? "pointer-events-none opacity-60" : ""}`}>
                <Camera className="h-5 w-5" />
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
              </label>
            </div>

            <div className="text-center z-10 space-y-1">
              <h3 className="text-2xl font-black text-[#000000] font-heading">{profile.name || "Veterinario"}</h3>
              <div className="bg-[#a8d5ba] px-4 py-1 rounded-full border-2 border-[#000000] text-xs font-black uppercase tracking-tighter inline-block">
                {profile.specialty || "Médico General"}
              </div>
              <p className="text-[#000000]/50 text-sm font-bold mt-2 italic">{profile.email}</p>
            </div>

            <div className="w-full pt-6 border-t-2 border-[#000000]/10 flex flex-col gap-3">
              <div className="flex items-center gap-3 text-sm font-bold text-[#000000]/70">
                <Mail className="h-4 w-4 text-[#a8d5ba]" />
                <span>{profile.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-bold text-[#000000]/70">
                <Phone className="h-4 w-4 text-[#a8d5ba]" />
                <span>{profile.phone || "Sin teléfono"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lado Derecho: Formulario */}
        <div className="w-full lg:w-2/3">
          <form onSubmit={handleUpdate} className="grid grid-cols-1 gap-8">
            
            {/* Card: Información Profesional */}
            <div className="bg-white border-[3px] border-[#000000] rounded-[32px] p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] space-y-6">
              <div className="flex items-center gap-3 border-b-2 border-dashed border-[#000000]/10 pb-4">
                <div className="bg-[#a8d5ba] p-2 rounded-xl border-2 border-[#000000]">
                  <Stethoscope className="h-5 w-5 text-[#000000]" />
                </div>
                <h4 className="text-xl font-black text-[#000000] font-heading">Información Profesional</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="vetName" className="font-black text-[#000000]">Nombre Completo</Label>
                  <Input 
                    id="vetName"
                    className="h-12 border-[3px] border-[#000000] rounded-2xl focus:ring-0 focus:bg-white bg-[#fdfaf5] transition-all font-bold placeholder:text-muted-foreground/30"
                    placeholder="Tu nombre legal"
                    value={profile.name}
                    onChange={e => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vetSpecialty" className="font-black text-[#000000]">Especialidad</Label>
                  <Input 
                    id="vetSpecialty"
                    className="h-12 border-[3px] border-[#000000] rounded-2xl focus:ring-0 focus:bg-white bg-[#fdfaf5] transition-all font-bold placeholder:text-muted-foreground/30"
                    placeholder="Ej: Cirugía, Dermatología..."
                    value={profile.specialty}
                    onChange={e => setProfile({ ...profile, specialty: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vetCedula" className="font-black text-[#000000]">Cédula de Identidad</Label>
                  <Input 
                    id="vetCedula"
                    className="h-12 border-[3px] border-[#000000] rounded-2xl focus:ring-0 focus:bg-white bg-[#fdfaf5] transition-all font-bold placeholder:text-muted-foreground/30"
                    placeholder="ID Nacional"
                    value={profile.cedula}
                    onChange={e => setProfile({ ...profile, cedula: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vetPhone" className="font-black text-[#000000]">Teléfono de Contacto</Label>
                  <Input 
                    id="vetPhone"
                    className="h-12 border-[3px] border-[#000000] rounded-2xl focus:ring-0 focus:bg-white bg-[#fdfaf5] transition-all font-bold placeholder:text-muted-foreground/30"
                    placeholder="Número móvil"
                    value={formatEcuadorPhoneDisplay(profile.phone)}
                    onChange={e => setProfile({ ...profile, phone: normalizeEcuadorPhoneInput(e.target.value) })}
                    onFocus={() => setProfile((prev) => ({ ...prev, phone: ensureEcuadorPhoneInputPrefix(prev.phone) }))}
                  />
                </div>
              </div>
            </div>

            {/* Card: Ubicación */}
            <div className="bg-white border-[3px] border-[#000000] rounded-[32px] p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] space-y-6">
              <div className="flex items-center gap-3 border-b-2 border-dashed border-[#000000]/10 pb-4">
                <div className="bg-[#bdb2ff] p-2 rounded-xl border-2 border-[#000000]">
                  <MapPin className="h-5 w-5 text-[#000000]" />
                </div>
                <h4 className="text-xl font-black text-[#000000] font-heading">Ubicación y Oficina</h4>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="vetCity" className="font-black text-[#000000]">Ciudad</Label>
                  <Input 
                    id="vetCity"
                    className="h-12 border-[3px] border-[#000000] rounded-2xl focus:ring-0 focus:bg-white bg-[#fdfaf5] transition-all font-bold placeholder:text-muted-foreground/30"
                    placeholder="Ciudad de residencia"
                    value={profile.city}
                    onChange={e => setProfile({ ...profile, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vetClinicName" className="font-black text-[#000000]">Nombre del Local / Clínica Veterinaria</Label>
                  <Input 
                    id="vetClinicName"
                    className="h-12 border-[3px] border-[#000000] rounded-2xl focus:ring-0 focus:bg-white bg-[#fdfaf5] transition-all font-bold placeholder:text-muted-foreground/30"
                    placeholder="Ej: VetSalud, Clínica San Francisco"
                    value={profile.clinicName}
                    onChange={e => setProfile({ ...profile, clinicName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vetAddress" className="font-black text-[#000000]">Dirección de Oficina / Domicilio</Label>
                  <textarea 
                    id="vetAddress"
                    className="w-full min-h-[100px] p-4 border-[3px] border-[#000000] rounded-2xl focus:ring-0 focus:bg-white bg-[#fdfaf5] transition-all font-bold placeholder:text-muted-foreground/30 resize-none outline-none"
                    placeholder="Calle principal, secundaria y referencias locales..."
                    value={profile.address}
                    onChange={e => setProfile({ ...profile, address: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Card: Seguridad */}
            <div className="bg-white border-[3px] border-[#000000] rounded-[32px] p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] space-y-6">
              <div className="flex items-center gap-3 border-b-2 border-dashed border-[#000000]/10 pb-4">
                <div className="bg-[#ffadad] p-2 rounded-xl border-2 border-[#000000]">
                  <Lock className="h-5 w-5 text-[#000000]" />
                </div>
                <h4 className="text-xl font-black text-[#000000] font-heading">Seguridad</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="vetPass" className="font-black text-[#000000]">Nueva Contraseña</Label>
                  <div className="relative">
                    <Input 
                      id="vetPass"
                      type={showPassword ? "text" : "password"}
                      className="h-12 border-[3px] border-[#000000] rounded-2xl focus:ring-0 focus:bg-white bg-[#fdfaf5] transition-all font-bold placeholder:text-muted-foreground/30 pr-12"
                      placeholder="Opcional"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#000000] hover:scale-110 transition-transform focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vetPassConfirm" className="font-black text-[#000000]">Confirmar</Label>
                  <div className="relative">
                    <Input 
                      id="vetPassConfirm"
                      type={showConfirmPassword ? "text" : "password"}
                      className="h-12 border-[3px] border-[#000000] rounded-2xl focus:ring-0 focus:bg-white bg-[#fdfaf5] transition-all font-bold placeholder:text-muted-foreground/30 pr-12"
                      placeholder="Repite la clave"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#000000] hover:scale-110 transition-transform focus:outline-none"
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
              className="h-16 bg-[#a8d5ba] text-[#000000] border-[4px] border-[#000000] rounded-3xl shadow-[8px_8px_0px_0px_#000000] hover:translate-y-1 hover:shadow-none transition-all text-xl font-black active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                  Sincronizando Cambios...
                </>
              ) : (
                <>
                  <Save className="mr-3 h-6 w-6" />
                  Guardar Mi Perfil Profesional
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
