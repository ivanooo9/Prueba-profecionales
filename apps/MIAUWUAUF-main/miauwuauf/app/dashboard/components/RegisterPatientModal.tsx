import React, { useState, useRef, useEffect } from "react"
import { User, Dog, X, Check, ArrowRight, ArrowLeft, Camera, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Mascota } from "@/lib/admin-service"
import Image from "next/image"
import { validateUpload } from "@/lib/upload-validation"
import {
  ensureEcuadorPhoneInputPrefix,
  formatEcuadorPhoneDisplay,
  normalizeEcuadorPhoneInput,
} from "@/lib/phone"
import { calcularEdad } from "@/lib/utils"

interface RegisterPatientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (result?: { user: { id: string; name: string; email: string }; pet: Mascota }) => void
  onRegister: (data: { 
    owner: { name: string; email: string; phone: string; cedula: string }, 
    pet: Partial<Mascota>,
    isNewOwner?: boolean
  }) => Promise<{ user: { id: string; name: string; email: string }; pet: Mascota }>
}

export const RegisterPatientModal: React.FC<RegisterPatientModalProps> = ({
  isOpen, onClose, onSuccess, onRegister
}) => {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const submitLockRef = useRef(false)

  const [isRegisteredOwner, setIsRegisteredOwner] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState("")
  const [suggestions, setSuggestions] = useState<{ id: string, name: string, email: string, cedula: string, phone: string, petNames: string[] }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    if (!isRegisteredOwner || searchQuery.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/veterinario/search-user?q=${encodeURIComponent(searchQuery)}`)
        const data = await res.json()
        if (res.ok && data.found) {
          setSuggestions(data.users)
          setShowSuggestions(true)
        } else {
          setSuggestions([])
          setShowSuggestions(false)
        }
      } catch (e) {
        console.error("Error fetching suggestions:", e)
      } finally {
        setSearching(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [searchQuery, isRegisteredOwner])
  
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    owner: {
      name: "",
      email: "",
      phone: "",
      cedula: "",
    },
    pet: {
      nombre: "",
      tipo: "perro",
      raza: "",
      edad: "",
      fechaNacimiento: "",
      peso: "",
      sexo: "macho",
      esterilizado: "si",
      foto: "",
    }
  })

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !validateUpload(file)) return

    setUploading(true)
    try {
      const data = new FormData()
      data.append("file", file)
      const res = await fetch("/api/upload", {
        method: "POST",
        body: data,
      })
      if (!res.ok) throw new Error("Error al subir imagen")
      const result = await res.json()
      setFormData(prev => ({
        ...prev,
        pet: { ...prev.pet, foto: result.secure_url }
      }))
      toast.success("Foto subida correctamente")
    } catch {
      toast.error("Error al subir la imagen")
    } finally {
      setUploading(false)
    }
  }

  const handleOwnerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const nextValue = name === "phone" ? normalizeEcuadorPhoneInput(value) : value
    setFormData(prev => ({
      ...prev,
      owner: { ...prev.owner, [name]: nextValue }
    }))
  }

  const handlePetChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      pet: { ...prev.pet, [name]: value }
    }))
  }

  const handleSearchOwner = async () => {
    if (!searchQuery.trim()) {
      setSearchError("Ingresa un email o cédula para buscar.")
      return
    }
    setSearching(true)
    setSearchError("")
    try {
      const res = await fetch(`/api/veterinario/search-user?q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      if (res.ok && data.found) {
        setFormData(prev => ({
          ...prev,
          owner: {
            name: data.user.name || "",
            email: data.user.email || "",
            phone: data.user.phone || "",
            cedula: data.user.cedula || "",
          }
        }))
        toast.success("Dueño encontrado correctamente.")
      } else {
        setSearchError(data.message || "Usuario no encontrado.")
        setFormData(prev => ({
          ...prev,
          owner: { name: "", email: "", phone: "", cedula: "" }
        }))
      }
    } catch {
      setSearchError("Error de conexión al buscar usuario.")
    } finally {
      setSearching(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step === 1) {
      if (isRegisteredOwner && !formData.owner.email) {
        toast.error("Por favor, busca y selecciona un dueño registrado primero.")
        return
      }
      setStep(2)
      return
    }

    if (submitLockRef.current || loading) return
    submitLockRef.current = true
    setLoading(true)
    try {
      const calculatedAge = calcularEdad(
        formData.pet.fechaNacimiento,
        formData.pet.fechaNacimiento,
        formData.pet.tipo,
        formData.pet.raza
      ) || formData.pet.fechaNacimiento;

      const submitData = {
        ...formData,
        pet: {
          ...formData.pet,
          edad: calculatedAge
        },
        isNewOwner: !isRegisteredOwner
      }

      const res = await onRegister(submitData)
      toast.success("Paciente y dueño registrados correctamente")
      onSuccess(res)
      onClose()
      resetForm()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al registrar paciente"
      toast.error(message)
    } finally {
      submitLockRef.current = false
      setLoading(false)
    }
  }

  const resetForm = () => {
    setStep(1)
    setIsRegisteredOwner(false)
    setSearchQuery("")
    setSearchError("")
    setFormData({
      owner: { name: "", email: "", phone: "", cedula: "" },
      pet: { nombre: "", tipo: "perro", raza: "", edad: "", fechaNacimiento: "", peso: "", sexo: "macho", esterilizado: "si", foto: "" }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent hideClose className="flex max-h-[95dvh] w-[95vw] max-w-[95vw] flex-col gap-0 overflow-hidden rounded-[40px] border-[4px] border-[#000000] bg-[#fffaf5] p-0 sm:p-0 shadow-[12px_12px_0px_0px_#000000] sm:max-w-2xl sm:w-full transition-all duration-500 focus:outline-none">
        <DialogHeader className="relative w-full shrink-0 border-b-[4px] border-[#000000] bg-gradient-to-r from-[#E7BEF8] to-[#d6c7ed] p-6 pr-16 text-[#000000]">
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-white/20 rounded-full blur-3xl pointer-events-none" />
          <DialogTitle className="flex items-center gap-4 font-heading text-2xl font-black text-[#000000] sm:text-3xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-[3px] border-[#000000] bg-white shadow-[4px_4px_0px_0px_#000000]">
              {step === 1 ? <User className="h-6 w-6 stroke-[3]" /> : <Dog className="h-6 w-6 stroke-[3]" />}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#000000]/50">MIAUWUAUF • REGISTRO</span>
              <span className="leading-none">{step === 1 ? "Datos del Dueño" : "Datos de Mascota"}</span>
            </div>
          </DialogTitle>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-2xl border-[3px] border-[#000000] bg-white shadow-[4px_4px_0px_0px_#000000] transition-all bg-hover-[#ffadad] disabled:pointer-events-none disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5 stroke-[3]" />
          </button>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 flex flex-col overflow-hidden bg-transparent">
          <div className="overflow-y-auto p-6 md:p-10 space-y-6 no-scrollbar">
            {/* Steps Progress */}
            <div className="flex items-center justify-between gap-6 mb-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex-1 flex flex-col gap-2">
                  <div className={`h-4 rounded-full border-[3px] border-[#000000] transition-all duration-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] ${step >= i ? "bg-[#E7BEF8] shadow-[2px_2px_0px_0px_#000000]" : "bg-white"}`} />
                  <span className={`text-[11px] font-black uppercase tracking-wider text-center ${step >= i ? "text-[#000000]" : "text-[#000000]/30"}`}>
                    Paso {i}: {i === 1 ? "Dueño" : "Mascota"}
                  </span>
                </div>
              ))}
            </div>

            {/* Toggles between New and Registered Owner */}
            {step === 1 && (
              <div className="flex gap-4 border-[3px] border-[#000000] p-1.5 rounded-2xl bg-white/40 shadow-[4px_4px_0px_0px_#000000] mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisteredOwner(false)
                    setFormData(prev => ({
                      ...prev,
                      owner: { name: "", email: "", phone: "", cedula: "" }
                    }))
                    setSearchError("")
                    setSearchQuery("")
                  }}
                  className={`flex-1 py-3 text-sm font-black uppercase rounded-xl border-[2px] transition-all ${!isRegisteredOwner ? "bg-[#EDE986] border-[#000000] shadow-[2px_2px_0px_0px_#000000]" : "bg-transparent border-transparent text-[#000000]/60"}`}
                >
                  Nuevo Dueño
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisteredOwner(true)
                    setFormData(prev => ({
                      ...prev,
                      owner: { name: "", email: "", phone: "", cedula: "" }
                    }))
                    setSearchError("")
                    setSearchQuery("")
                  }}
                  className={`flex-1 py-3 text-sm font-black uppercase rounded-xl border-[2px] transition-all ${isRegisteredOwner ? "bg-[#EDE986] border-[#000000] shadow-[2px_2px_0px_0px_#000000]" : "bg-transparent border-transparent text-[#000000]/60"}`}
                >
                  Dueño Registrado
                </button>
              </div>
            )}

            {step === 1 && isRegisteredOwner && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-500">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-wider text-[#000000]/60 ml-1">
                    Buscar Dueño por Email o Cédula
                  </Label>
                  <div className="flex gap-4 relative">
                    <div className="flex-1 relative">
                      <Input
                        type="text"
                        placeholder="Ej: juan o 1712345678"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleSearchOwner()
                          }
                        }}
                        className="h-14 w-full border-[3px] border-[#000000] rounded-2xl bg-white px-5 text-base font-bold shadow-[4px_4px_0px_0px_#000000] transition-all focus:shadow-[6px_6px_0px_0px_#000000] focus-visible:ring-0 placeholder:text-[#000000]/20"
                      />
                      {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border-[3px] border-[#000000] rounded-2xl shadow-[6px_6px_0px_0px_#000000] overflow-hidden max-h-60 overflow-y-auto">
                          {suggestions.map((user) => (
                            <div 
                              key={user.id} 
                              className="p-4 border-b-[2px] border-[#000000]/10 last:border-0 hover:bg-[#E7BEF8]/20 cursor-pointer transition-colors"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  owner: {
                                    name: user.name || "",
                                    email: user.email || "",
                                    phone: user.phone || "",
                                    cedula: user.cedula || ""
                                  }
                                }))
                                setSearchQuery(user.email || user.name || "")
                                setShowSuggestions(false)
                                setSearchError("")
                                toast.success("Dueño seleccionado correctamente.")
                              }}
                            >
                              <p className="font-black text-[#000000]">{user.name}</p>
                              <div className="flex items-center gap-3 mt-1 text-sm text-[#000000]/60 font-bold">
                                <span>{user.email}</span>
                                {user.cedula && <span>• {user.cedula}</span>}
                              </div>
                              {user.petNames && user.petNames.length > 0 && (
                                <p className="text-xs font-bold mt-2 text-[#93ABD9]">
                                  Mascotas: {user.petNames.join(", ")}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      disabled={searching}
                      onClick={handleSearchOwner}
                      className="h-14 px-6 rounded-2xl border-[3px] border-[#000000] bg-[#E7BEF8] font-black text-sm uppercase text-[#000000] shadow-[4px_4px_0px_0px_#000000] hover:bg-[#a89fc4] hover:shadow-[6px_6px_0px_0px_#000000] transition-all active:translate-y-0.5 active:shadow-none"
                    >
                      {searching ? <Loader2 className="h-5 w-5 animate-spin" /> : "Buscar"}
                    </Button>
                  </div>
                  {searchError && (
                    <p className="text-sm font-black text-[#ff6b6b] ml-1">{searchError}</p>
                  )}
                </div>

                {formData.owner.email && (
                  <div className="p-5 border-[3px] border-[#000000] rounded-3xl bg-[#a8d5ba] shadow-[6px_6px_0px_0px_#000000] animate-in fade-in duration-300">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#000000] bg-white shadow-[2px_2px_0px_0px_#000000]">
                        <Check className="h-5 w-5 stroke-[3] text-green-600" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-[#000000]/60">Dueño Encontrado</h4>
                        <p className="text-lg font-black text-[#000000]">{formData.owner.name}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm font-bold text-[#000000]/80">
                      <div>
                        <span className="text-[10px] uppercase text-[#000000]/40 block tracking-wider">Email</span>
                        {formData.owner.email}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-[#000000]/40 block tracking-wider">Cédula</span>
                        {formData.owner.cedula}
                      </div>
                      {formData.owner.phone && (
                        <div className="col-span-2">
                          <span className="text-[10px] uppercase text-[#000000]/40 block tracking-wider">Teléfono</span>
                          {formatEcuadorPhoneDisplay(formData.owner.phone)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 1 && !isRegisteredOwner && (
              <div className="grid md:grid-cols-2 gap-x-6 gap-y-6 animate-in fade-in slide-in-from-bottom-10 duration-500">
                <div className="space-y-2 group">
                  <Label className="text-xs font-black uppercase tracking-wider text-[#000000]/60 ml-1">Nombre Completo</Label>
                  <Input name="name" value={formData.owner.name} onChange={handleOwnerChange} required placeholder="Ej: Juan Pérez" 
                    className="h-14 border-[3px] border-[#000000] rounded-2xl bg-white px-5 text-base font-bold shadow-[4px_4px_0px_0px_#000000] transition-all focus:shadow-[6px_6px_0px_0px_#000000] focus-visible:ring-0 placeholder:text-[#000000]/20" />
                </div>
                <div className="space-y-2 group">
                  <Label className="text-xs font-black uppercase tracking-wider text-[#000000]/60 ml-1">Email Principal</Label>
                  <Input type="email" name="email" value={formData.owner.email} onChange={handleOwnerChange} required placeholder="juan@ejemplo.com" 
                    className="h-14 border-[3px] border-[#000000] rounded-2xl bg-white px-5 text-base font-bold shadow-[4px_4px_0px_0px_#000000] transition-all focus:shadow-[6px_6px_0px_0px_#000000] focus-visible:ring-0 placeholder:text-[#000000]/20" />
                </div>
                <div className="space-y-2 group">
                  <Label className="text-xs font-black uppercase tracking-wider text-[#000000]/60 ml-1">Número de Teléfono</Label>
                  <Input name="phone" value={formatEcuadorPhoneDisplay(formData.owner.phone)} onChange={handleOwnerChange} onFocus={() => setFormData((prev) => ({ ...prev, owner: { ...prev.owner, phone: ensureEcuadorPhoneInputPrefix(prev.owner.phone) } }))} required placeholder="Ej: +593 99 123 4567" 
                    className="h-14 border-[3px] border-[#000000] rounded-2xl bg-white px-5 text-base font-bold shadow-[4px_4px_0px_0px_#000000] transition-all focus:shadow-[6px_6px_0px_0px_#000000] focus-visible:ring-0 placeholder:text-[#000000]/20" />
                </div>
                <div className="space-y-2 group">
                  <Label className="text-xs font-black uppercase tracking-wider text-[#000000]/60 ml-1">Cédula / DNI</Label>
                  <Input name="cedula" value={formData.owner.cedula} onChange={handleOwnerChange} required placeholder="Ej: 1712345678" 
                    className="h-14 border-[3px] border-[#000000] rounded-2xl bg-[#fffcf4] px-5 text-lg font-black tracking-tight shadow-[4px_4px_0px_0px_#000000] transition-all focus:shadow-[6px_6px_0px_0px_#000000] focus-visible:ring-0 placeholder:text-[#000000]/10" />
                </div>
               
                {/* Security Info Card - Full Width */}
                <div className="md:col-span-2 relative overflow-hidden rounded-[24px] border-[3px] border-[#000000] bg-[#ffd6a5] p-5 shadow-[6px_6px_0px_0px_#000000] transition-transform duration-300">
                  <div className="absolute -right-4 -top-4 text-white/20 rotate-12">
                     <Loader2 className="h-20 w-20 animate-[spin_10s_linear_infinite]" />
                  </div>
                  <div className="flex gap-4 items-center">
                     <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-[#000000] bg-white shadow-[2px_2px_0px_0px_#000000]">
                        <span className="text-2xl"></span>
                     </div>
                     <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                           <h4 className="text-[12px] font-black uppercase tracking-widest text-[#000000]">Acceso Automático</h4>
                           <div className="h-1.5 w-1.5 rounded-full bg-[#000000] animate-pulse" />
                        </div>
                        <p className="text-sm font-bold leading-tight text-[#000000]">
                           Contraseña temporal para el dueño:{" "}
                           <span className="inline-block ml-2 font-black text-lg text-[#000000] bg-white/50 px-3 py-0.5 rounded-lg border-2 border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                              MIAUW-{formData.owner.cedula || "XXXXXXXX"}
                           </span>
                        </p>
                     </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid md:grid-cols-2 gap-x-6 gap-y-6 animate-in fade-in slide-in-from-bottom-10 duration-500">
                <div className="space-y-6 md:col-span-1">
                  <div className="space-y-2 group">
                    <Label className="text-xs font-black uppercase tracking-wider text-[#000000]/60 ml-1">Nombre Mascota</Label>
                    <Input name="nombre" value={formData.pet.nombre} onChange={handlePetChange} required placeholder="Ej: Bobby" 
                      className="h-14 border-[3px] border-[#000000] rounded-2xl bg-white px-5 text-base font-bold shadow-[4px_4px_0px_0px_#000000] transition-all focus:shadow-[6px_6px_0px_0px_#000000] focus-visible:ring-0" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <Label className="text-xs font-black uppercase tracking-wider text-[#000000]/60 ml-1">Especie</Label>
                       <div className="relative">
                          <select 
                            name="tipo" value={formData.pet.tipo} onChange={handlePetChange}
                            className="h-14 w-full rounded-2xl border-[3px] border-[#000000] bg-white px-5 text-base font-bold shadow-[4px_4px_0px_0px_#000000] appearance-none focus:outline-none focus:shadow-[6px_6px_0px_0px_#000000] transition-all"
                          >
                            <option value="perro">Perro</option>
                            <option value="gato">Gato</option>
                          </select>
                          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                             <ArrowRight className="h-4 w-4 rotate-90 text-[#000000]" />
                          </div>
                       </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-wider text-[#000000]/60 ml-1">Sexo</Label>
                      <div className="relative">
                          <select 
                            name="sexo" value={formData.pet.sexo} onChange={handlePetChange}
                            className="h-14 w-full rounded-2xl border-[3px] border-[#000000] bg-white px-5 text-base font-bold shadow-[4px_4px_0px_0px_#000000] appearance-none focus:outline-none focus:shadow-[6px_6px_0px_0px_#000000] transition-all"
                          >
                            <option value="macho">Macho</option>
                            <option value="hembra">Hembra</option>
                          </select>
                          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                             <ArrowRight className="h-4 w-4 rotate-90 text-[#000000]" />
                          </div>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 md:col-span-1">
                  <div className="space-y-2 group">
                    <Label className="text-xs font-black uppercase tracking-wider text-[#000000]/60 ml-1">Raza / Tipo</Label>
                    <Input name="raza" value={formData.pet.raza} onChange={handlePetChange} required placeholder="Ej: Golden Retriever" 
                      className="h-14 border-[3px] border-[#000000] rounded-2xl bg-white px-5 text-base font-bold shadow-[4px_4px_0px_0px_#000000] transition-all focus:shadow-[6px_6px_0px_0px_#000000] focus-visible:ring-0" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <Label className="text-xs font-black uppercase tracking-wider text-[#000000]/60 ml-1">F. Nacimiento</Label>
                       <Input 
                         type="date"
                         name="fechaNacimiento" 
                         value={formData.pet.fechaNacimiento} 
                         onChange={handlePetChange} 
                         required 
                         max={new Date().toISOString().split('T')[0]}
                         className="h-14 border-[3px] border-[#000000] rounded-2xl bg-white px-5 text-base font-bold shadow-[4px_4px_0px_0px_#000000] transition-all focus:shadow-[6px_6px_0px_0px_#000000] focus-visible:ring-0" 
                       />
                       {formData.pet.fechaNacimiento && (
                         <p className="text-[10px] font-bold text-[#000000]/60 mt-1 leading-tight">
                           Edad: <span className="font-black text-[#000000]">{calcularEdad(formData.pet.fechaNacimiento, null, formData.pet.tipo, formData.pet.raza)}</span>
                         </p>
                       )}
                    </div>
                    <div className="space-y-2">
                       <Label className="text-xs font-black uppercase tracking-wider text-[#000000]/60 ml-1">Peso (kg)</Label>
                       <Input name="peso" value={formData.pet.peso} onChange={handlePetChange} required placeholder="10" 
                         className="h-14 border-[3px] border-[#000000] rounded-2xl bg-white px-5 text-base font-bold shadow-[4px_4px_0px_0px_#000000] transition-all focus:shadow-[6px_6px_0px_0px_#000000] focus-visible:ring-0" />
                    </div>
                  </div>
                </div>

                {/* Foto Section */}
                <div className="md:col-span-2 grid md:grid-cols-3 gap-6 items-center border-[3px] border-dashed border-[#000000]/20 bg-white/40 p-6 rounded-[32px]">
                   <div className="md:col-span-1 text-center md:text-left space-y-1">
                      <h4 className="font-black text-[#000000]">Foto de Mascota</h4>
                      <p className="text-[10px] uppercase font-bold text-[#000000]/40 tracking-widest">Formatos: JPG, PNG, WEBP • Max 10MB</p>
                   </div>
                   <div className="md:col-span-2">
                      <div 
                        className="relative h-28 w-full rounded-2xl border-[3px] border-[#000000] bg-white flex flex-col items-center justify-center cursor-pointer hover:bg-[#fdffb6] transition-all overflow-hidden shadow-[4px_4px_0px_0px_#000000]"
                        onClick={() => document.getElementById('pet-photo')?.click()}
                      >
                        {formData.pet.foto ? (
                          <>
                            <Image src={formData.pet.foto} alt="Preview" fill className="object-cover opacity-80" />
                            <div className="absolute inset-0 flex items-center justify-center bg-[#000000]/40 opacity-0 hover:opacity-100 transition-opacity">
                               <Camera className="h-8 w-8 text-white" />
                            </div>
                          </>
                        ) : uploading ? (
                          <div className="flex items-center gap-3">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="text-sm font-black text-[#000000]">SUBIENDO...</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-[#E7BEF8] flex items-center justify-center border-2 border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                               <Camera className="h-6 w-6 text-[#000000]" />
                            </div>
                            <span className="text-sm font-black text-[#000000]">CLIC PARA SUBIR FOTO</span>
                          </div>
                        )}
                      </div>
                      <input type="file" id="pet-photo" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                   </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="shrink-0 bg-white border-t-[4px] border-[#000000] p-6 md:px-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
               {step === 2 && (
                  <Button type="button" variant="ghost" disabled={loading} onClick={() => setStep(1)} className="w-full sm:w-auto h-12 gap-2 text-[#000000] font-black uppercase text-xs tracking-tighter hover:bg-[#000000]/5 decoration-none transition-all disabled:opacity-50">
                    <ArrowLeft className="h-4 w-4" /> Volver al Paso 1
                  </Button>
               )}
            </div>
            
            <Button 
               type="submit" 
               disabled={loading} 
               className={`h-14 px-10 rounded-2xl border-[3px] border-[#000000] font-black text-sm uppercase tracking-widest shadow-[6px_6px_0px_0px_#000000] transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#000000] active:translate-y-0.5 active:shadow-none min-w-[220px] ${step === 2 ? "bg-[#93ABD9] text-[#000000] hover:bg-[#7f9dca]" : "bg-[#000000] text-[#EDE986] hover:bg-[#EDE986] hover:text-[#000000]"}`}
            >
              {loading ? (
                <div className="flex items-center gap-3">
                   <Loader2 className="h-5 w-5 animate-spin" /> REGISTRANDO...
                </div>
              ) : step === 1 ? (
                <div className="flex items-center gap-3">SIGUIENTE PASO <ArrowRight className="h-5 w-5" /></div>
              ) : (
                <div className="flex items-center gap-3">FINALIZAR REGISTRO <Check className="h-5 w-5 stroke-[4]" /></div>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
