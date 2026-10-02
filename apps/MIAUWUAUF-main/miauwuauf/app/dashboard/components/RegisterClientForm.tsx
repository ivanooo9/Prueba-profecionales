"use client"

import React, { useState } from "react"
import { User, PawPrint, Save, X, Dog, Smartphone, CreditCard, Mail, ClipboardList, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  ensureEcuadorPhoneInputPrefix,
  formatEcuadorPhoneDisplay,
  normalizeEcuadorPhoneInput,
} from "@/lib/phone"

interface UserData {
  nombre: string
  email: string
  cedula: string
  telefono: string
}

interface PetData {
  nombre: string
  raza: string
  edad: string
  especie: string
}

interface RegisterClientFormProps {
  onClose: () => void
  onRegister: (userData: UserData, petData: PetData) => void | Promise<unknown>
}

export const RegisterClientForm: React.FC<RegisterClientFormProps> = ({ onClose, onRegister }) => {
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    cedula: "",
    telefono: "",
    petNombre: "",
    petRaza: "",
    petEdad: "",
    petEspecie: "Canino"
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.name === "telefono") {
      setFormData({ ...formData, telefono: normalizeEcuadorPhoneInput(e.target.value) })
      return
    }
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    const userData: UserData = {
      nombre: formData.nombre,
      email: formData.email,
      cedula: formData.cedula,
      telefono: formData.telefono,
    }

    const petData: PetData = {
      nombre: formData.petNombre,
      raza: formData.petRaza,
      edad: formData.petEdad,
      especie: formData.petEspecie,
    }

    setSubmitting(true)
    try {
      await Promise.resolve(onRegister(userData, petData))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-2xl bg-[#fdfaf5] border-[3px] border-foreground shadow-[8px_8px_0px_0px_#000000] rounded-[2.5rem] overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar p-0">
        <CardHeader className="sticky top-0 z-10 gap-0 rounded-t-[2.5rem] bg-[#a8d5ba] border-b-[3px] border-foreground p-6">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-black font-heading flex items-center gap-2">
                <User className="h-6 w-6" /> Registrar Nuevo Cliente
              </CardTitle>
              <CardDescription className="font-bold text-foreground/80 lowercase">
                Ingresa los datos del dueño y su mascota
              </CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              disabled={submitting}
              className="rounded-full hover:bg-black/10 text-foreground disabled:opacity-50"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Sección Dueño */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[#000000]/40 border-b-[2px] border-foreground/10 pb-2">
                <User className="h-5 w-5" />
                <h3 className="font-black uppercase tracking-widest text-sm">Datos del Propietario</h3>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nombre" className="text-xs font-bold px-2">Nombre Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                    <Input
                      id="nombre"
                      name="nombre"
                      placeholder="Ej. Juan Pérez"
                      value={formData.nombre}
                      onChange={handleChange}
                      required
                      className="pl-10 rounded-xl border-[2px] border-foreground/20 bg-white font-medium focus-visible:ring-0 focus-visible:border-foreground"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-bold px-2">Correo Electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="juan@ejemplo.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="pl-10 rounded-xl border-[2px] border-foreground/20 bg-white font-medium focus-visible:ring-0 focus-visible:border-foreground"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cedula" className="text-xs font-bold px-2">Cédula / ID</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                    <Input
                      id="cedula"
                      name="cedula"
                      placeholder="1723456789"
                      value={formData.cedula}
                      onChange={handleChange}
                      required
                      className="pl-10 rounded-xl border-[2px] border-foreground/20 bg-white font-medium focus-visible:ring-0 focus-visible:border-foreground"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="telefono" className="text-xs font-bold px-2">Teléfono</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                    <Input
                      id="telefono"
                      name="telefono"
                      placeholder="+593 99 123 4567"
                      value={formatEcuadorPhoneDisplay(formData.telefono)}
                      onChange={handleChange}
                      onFocus={() => setFormData((prev) => ({ ...prev, telefono: ensureEcuadorPhoneInputPrefix(prev.telefono) }))}
                      required
                      className="pl-10 rounded-xl border-[2px] border-foreground/20 bg-white font-medium focus-visible:ring-0 focus-visible:border-foreground"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sección Mascota */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2 text-[#000000]/40 border-b-[2px] border-foreground/10 pb-2">
                <PawPrint className="h-5 w-5" />
                <h3 className="font-black uppercase tracking-widest text-sm">Datos de la Mascota</h3>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="petNombre" className="text-xs font-bold px-2">Nombre de la Mascota</Label>
                  <div className="relative">
                    <Dog className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                    <Input
                      id="petNombre"
                      name="petNombre"
                      placeholder="Ej. Max"
                      value={formData.petNombre}
                      onChange={handleChange}
                      required
                      className="pl-10 rounded-xl border-[2px] border-foreground/20 bg-white font-medium focus-visible:ring-0 focus-visible:border-foreground"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="petEspecie" className="text-xs font-bold px-2">Especie</Label>
                  <select 
                    id="petEspecie"
                    name="petEspecie"
                    value={formData.petEspecie}
                    onChange={(e) => setFormData({...formData, petEspecie: e.target.value})}
                    className="w-full h-10 rounded-xl border-[2px] border-foreground/20 bg-white font-medium px-3 focus:border-foreground outline-none transition-colors"
                  >
                    <option value="Canino">Canino</option>
                    <option value="Felino">Felino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="petRaza" className="text-xs font-bold px-2">Raza</Label>
                  <div className="relative">
                    <ClipboardList className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                    <Input
                      id="petRaza"
                      name="petRaza"
                      placeholder="Ej. Golden Retriever"
                      value={formData.petRaza}
                      onChange={handleChange}
                      required
                      className="pl-10 rounded-xl border-[2px] border-foreground/20 bg-white font-medium focus-visible:ring-0 focus-visible:border-foreground"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="petEdad" className="text-xs font-bold px-2">Edad</Label>
                  <Input
                    id="petEdad"
                    name="petEdad"
                    placeholder="Ej. 2 años"
                    value={formData.petEdad}
                    onChange={handleChange}
                    required
                    className="rounded-xl border-[2px] border-foreground/20 bg-white font-medium focus-visible:ring-0 focus-visible:border-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={submitting}
                className="flex-1 rounded-2xl border-[3px] border-foreground font-black text-lg h-14 bg-white/50 shadow-[4px_4px_0px_0px_#000000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-60"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={submitting}
                className="flex-1 rounded-2xl border-[3px] border-foreground font-black text-lg h-14 bg-[#a8d5ba] text-foreground shadow-[4px_4px_0px_0px_#000000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Registrando…
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" /> Registrar Cliente
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
