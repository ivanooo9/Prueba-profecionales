"use client"

import React, { useState, useEffect } from "react"
import Image from "next/image"
import {
  Plus, Trash2, Camera, ArrowLeft, Pencil, Loader2, ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MascotaUsuario, TabType } from "../types"
import { calcularEdad } from "@/lib/utils"
import { validateUpload } from "@/lib/upload-validation"
import QRCard from "./QRCard"

interface MascotasTabProps {
  misMascotas: MascotaUsuario[]
  mascotaActiva: MascotaUsuario | null
  setMascotaActiva: (m: MascotaUsuario) => void
  onDeletePet: (id: string | number) => void
  onSavePet: (formData: Partial<MascotaUsuario>) => void | boolean | Promise<boolean | void>
  onUpdatePet: (id: string | number, formData: Partial<MascotaUsuario>) => void | boolean | Promise<boolean | void>
  setActiveTab: (tab: TabType) => void
  petToEdit: MascotaUsuario | null
  setPetToEdit: (m: MascotaUsuario | null) => void
}

export const MascotasTab = ({
  misMascotas,
  mascotaActiva,
  setMascotaActiva,
  onDeletePet,
  onSavePet,
  onUpdatePet,
  setActiveTab,
  petToEdit,
  setPetToEdit
}: MascotasTabProps) => {
  const [isAddingPet, setIsAddingPet] = useState(false)
  const [isEditingPet, setIsEditingPet] = useState(false)
  const [savingPet, setSavingPet] = useState(false)
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({})
  const [formData, setFormData] = useState({
    nombre: "", especie: "Perro", raza: "", fechaNacimiento: "", peso: "", sexo: "Macho", foto: ""
  })
  const [whatsappPhone, setWhatsappPhone] = useState("");

  useEffect(() => {
    const fetchPhone = async () => {
      try {
        const res = await fetch("/api/plan-contact");
        if (res.ok) {
          const data = await res.json();
          if (data.phone) {
            setWhatsappPhone(data.phone.replace(/\D/g, ""));
          }
        }
      } catch (error) {
        console.error("Error fetching whatsapp phone:", error);
      }
    };
    fetchPhone();
  }, []);

  const buildWhatsappUrl = (petName: string) => {
    const phone = whatsappPhone || "593984251410";
    const message = `¡Hola MIAUWUAUF! Quiero activar el Plan Premium QR Anti-Pérdida para mi mascota: ${petName}. ¿Me podrían ayudar con la activación?`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const resetForm = () => {
    setFormData({ nombre: "", especie: "Perro", raza: "", fechaNacimiento: "", peso: "", sexo: "Macho", foto: "" })
    setIsAddingPet(false)
    setIsEditingPet(false)
  }

  const handleEdit = (m: MascotaUsuario) => {
    setFormData({
      nombre: m.nombre || "",
      especie: m.tipo || "Perro",
      raza: m.raza || "",
      fechaNacimiento: m.fechaNacimiento || "",
      peso: String(m.peso || ""),
      sexo: m.sexo || "Macho",
      foto: m.foto || ""
    })
    setIsEditingPet(true)
  }

  // Auto-edit logic when coming from sidebar (Purely Reactive)
  React.useEffect(() => {
    if (petToEdit) {
      handleEdit(petToEdit)
      setPetToEdit(null) // Clean up after initializing edit
    }
  }, [petToEdit, setPetToEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (savingPet) return
    setSavingPet(true)
    try {
      const submissionData = {
        ...formData,
        tipo: formData.especie,
        edad: calcularEdad(formData.fechaNacimiento, formData.fechaNacimiento, formData.especie, formData.raza) || formData.fechaNacimiento
      }
      let result: boolean | void
      if (isEditingPet && mascotaActiva) {
        result = await Promise.resolve(onUpdatePet(mascotaActiva.id, submissionData))
      } else {
        result = await Promise.resolve(onSavePet(submissionData))
      }
      if (result !== false) {
        resetForm()
      }
    } finally {
      setSavingPet(false)
    }
  }

  if (isAddingPet || isEditingPet) {
    return (
      <div className="animate-fade-in space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={resetForm} className="shrink-0 rounded-full"><ArrowLeft className="h-5 w-5" /></Button>
          <h2 className="min-w-0 text-xl font-bold sm:text-2xl md:text-3xl">{isEditingPet ? "Editar Mascota" : "Nueva Mascota"}</h2>
        </div>
        <Card className="border-[3px] border-[#000000] bg-[#e7bef8] p-0 shadow-[6px_6px_0px_0px_#000000] sm:shadow-[8px_8px_0px_0px_#000000]">
          <CardContent className="p-4 sm:p-6 md:p-8">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input 
                    value={formData.nombre} 
                    onChange={e => setFormData({ ...formData, nombre: e.target.value })} 
                    className="rounded-lg h-12" 
                    placeholder="Ej: Max" 
                    required 
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Especie</Label>
                    <select 
                      value={formData.especie} 
                      onChange={e => setFormData({ ...formData, especie: e.target.value })} 
                      className="w-full p-2 rounded-lg border h-12 bg-background text-base"
                    >
                      <option>Perro</option>
                      <option>Gato</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sexo</Label>
                    <select 
                      value={formData.sexo} 
                      onChange={e => setFormData({ ...formData, sexo: e.target.value })} 
                      className="w-full p-2 rounded-lg border h-12 bg-background text-base"
                    >
                      <option>Macho</option>
                      <option>Hembra</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Raza</Label>
                    <Input value={formData.raza} onChange={e => setFormData({ ...formData, raza: e.target.value })} className="rounded-lg h-12" placeholder="Ej: Pitbull" />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Nacimiento</Label>
                    <Input
                      type="date"
                      value={formData.fechaNacimiento}
                      onChange={e => setFormData({ ...formData, fechaNacimiento: e.target.value })}
                      className="rounded-lg h-12"
                      max={new Date().toISOString().split('T')[0]}
                    />
                    {formData.fechaNacimiento && (
                      <p className="text-xs text-muted-foreground font-medium">
                         Edad calculada: <span className="font-bold text-foreground">{calcularEdad(formData.fechaNacimiento, null, formData.especie, formData.raza)}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Peso (kg)</Label>
                  <Input value={formData.peso} onChange={e => setFormData({ ...formData, peso: e.target.value })} className="rounded-lg h-12" placeholder="Ej: 15" />
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Foto de perfil</Label>
                  <div className="relative aspect-video w-full cursor-pointer overflow-hidden rounded-lg border-2 border-dashed border-foreground/20 bg-muted transition-colors hover:bg-muted/80 flex flex-col items-center justify-center" onClick={() => document.getElementById('photo-input')?.click()}>
                    {formData.foto ? (
                      <Image src={formData.foto} alt="Preview" fill sizes="(max-width:768px) 100vw, 400px" className="object-cover object-center" />
                    ) : (
                      <>
                        <Camera className="h-10 w-10 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground font-medium">Click para subir foto</span>
                      </>
                    )}
                  </div>
                  <input id="photo-input" type="file" className="hidden" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file && validateUpload(file)) {
                      const reader = new FileReader()
                      reader.onloadend = () => setFormData({ ...formData, foto: reader.result as string })
                      reader.readAsDataURL(file)
                    }
                  }} />
                </div>
                <Button type="submit" disabled={savingPet} className="h-14 w-full rounded-lg text-lg font-bold disabled:opacity-60">
                  {savingPet ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Guardando…
                    </>
                  ) : isEditingPet ? (
                    "Guardar Cambios"
                  ) : (
                    "Guardar Mascota"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0 text-center sm:text-left">
          <h2 className="mb-1 text-2xl font-bold sm:mb-2 sm:text-3xl">Mis Mascotas</h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            {misMascotas.length > 0
              ? `Tienes ${misMascotas.length} mascota${misMascotas.length > 1 ? "s" : ""} registrada${misMascotas.length > 1 ? "s" : ""}`
              : "Aun no tienes mascotas registradas."
            }
          </p>
        </div>
        <Button onClick={() => setIsAddingPet(true)} className="h-11 w-full shrink-0 gap-2 font-bold sm:h-auto sm:w-auto">
          <Plus className="h-4 w-4 shrink-0" />
          Agregar Mascota
        </Button>
      </div>

      <div className="max-md:flex max-md:max-w-full max-md:flex-col max-md:gap-4 md:block md:columns-2 md:gap-4 lg:columns-3">
        {misMascotas.map((pet) => (
          (() => {
            const petKey = String(pet.id)
            const isExpanded = openCards[petKey] ?? false
            return (
          <Card 
            key={pet.id} 
            className={`group w-full max-w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-foreground/10 p-0 shadow-sm transition-all max-md:mb-0 hover:border-primary/30 hover:shadow-md md:mb-4 md:break-inside-avoid sm:rounded-[28px] md:rounded-[32px] ${
              mascotaActiva?.id === pet.id ? 'ring-4 ring-primary/10 border-primary/40' : ''
            }`}
            onClick={() => { setMascotaActiva(pet); setActiveTab("perfil") }}
          >
            <div className="relative aspect-[16/10] w-full min-h-[10rem] overflow-hidden bg-muted border-b border-foreground/5 sm:min-h-0">
              <Image 
                src={pet.foto || "/placeholder.svg"} 
                alt={pet.nombre} 
                fill 
                sizes="(max-width:768px) 100vw, (max-width:1024px) 50vw, 33vw"
                className="object-cover object-center" 
              />
              <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-100 transition-opacity max-md:opacity-100 md:opacity-0 md:group-hover:opacity-100">
                <Button size="icon" variant="secondary" className="h-9 w-9 bg-white/95 shadow-sm sm:h-8 sm:w-8" onClick={(e) => { e.stopPropagation(); handleEdit(pet); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="destructive" className="h-9 w-9 sm:h-8 sm:w-8" onClick={(e) => { e.stopPropagation(); onDeletePet(pet.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-3 sm:p-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2 sm:mb-4 sm:gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <h4 className="wrap-break-word text-lg font-black capitalize italic tracking-tight text-foreground sm:text-[1.35rem]">{pet.nombre}</h4>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Raza</span>
                    <span className="text-sm font-bold text-foreground/70 break-words">{pet.raza || "Mestiza"}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenCards((prev) => ({ ...prev, [petKey]: !isExpanded }))
                  }}
                  className="h-10 w-10 rounded-xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center"
                  aria-label={isExpanded ? "Ocultar detalle" : "Mostrar detalle"}
                  aria-expanded={isExpanded}
                >
                  <ChevronDown className={`h-5 w-5 text-primary transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>
              </div>
              
              {isExpanded && (
              <div className="grid grid-cols-1 gap-3 pt-4 border-t border-foreground/5 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground/30">Edad</span>
                  <div className="bg-[#e7bef8] px-3 py-1.5 rounded-lg border-2 border-foreground/10 font-bold text-sm text-[#000000]">
                    {calcularEdad(pet.fechaNacimiento, pet.edad, pet.tipo, pet.raza)}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground/30">Sexo</span>
                  <div className="bg-[#e7bef8] px-3 py-1.5 rounded-lg border-2 border-foreground/10 font-bold text-sm text-[#000000]">
                    {pet.sexo}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground/30">Peso</span>
                  <div className="bg-[#e7bef8] px-3 py-1.5 rounded-lg border-2 border-foreground/10 font-bold text-sm text-[#000000]">
                    {String(pet.peso).replace(/[\s]*kg$/i, '')} kg
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground/30">Tipo</span>
                  <div className="bg-[#e7bef8] px-3 py-1.5 rounded-lg border-2 border-foreground/10 font-bold text-sm text-[#000000] capitalize">
                    {pet.tipo}
                  </div>
                </div>
              </div>
              )}

              {/* QR Anti-Pérdida — visible solo si el plan está activo */}
              <div
                className="mt-3 pt-3 border-t border-foreground/5"
                onClick={(e) => e.stopPropagation()}
              >
                {pet.qrEnabled ? (
                  <QRCard petId={String(pet.id)} petName={pet.nombre} petPhoto={pet.foto} />
                ) : (
                  <div className="relative overflow-hidden bg-gradient-to-br from-[#fdfaf5] to-[#f0ebff] border-[3px] border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] p-4 flex flex-col gap-3">
                    {/* Lock badge */}
                    <div className="absolute top-3 right-3 bg-black text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-white/20">
                      Plan Premium
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-[#e7bef8] border-[2px] border-black flex items-center justify-center shadow-[2px_2px_0px_0px_#000] shrink-0 p-2.5">
                        <Image src="/security-lock.svg" alt="Security" width={24} height={24} className="w-full h-full" />
                      </div>
                      <div>
                        <p className="font-black text-black text-sm leading-tight">Plan QR Anti-Pérdida</p>
                        <p className="text-black/60 font-bold text-xs mt-0.5">Protege a {pet.nombre} con un QR de collar</p>
                      </div>
                    </div>
                    <ul className="text-xs font-bold text-black/70 space-y-1 pl-1">
                      <li className="flex items-center gap-1.5"><span className="text-[#7c3aed]">✦</span> QR único para imprimir en su collar</li>
                      <li className="flex items-center gap-1.5"><span className="text-[#7c3aed]">✦</span> Notificación inmediata si la encuentran</li>
                      <li className="flex items-center gap-1.5"><span className="text-[#7c3aed]">✦</span> Tus datos protegidos y privados</li>
                    </ul>
                    <a
                      href={buildWhatsappUrl(pet.nombre)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-center py-2.5 bg-[#EDE986] text-black font-black text-sm border-[2px] border-black rounded-xl shadow-[3px_3px_0px_0px_#000] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_#000] transition-all"
                    >
                      Activar este plan
                    </a>
                  </div>
                )}
              </div>
            </div>
          </Card>
          )
          })()
        ))}
      </div>
    </div>
  )
}
