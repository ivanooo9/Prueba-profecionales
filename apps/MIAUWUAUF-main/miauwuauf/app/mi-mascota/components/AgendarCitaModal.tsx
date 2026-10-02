"use client"

import React, { useState, useEffect } from "react"
import { Calendar, Clock, ClipboardList, X, Loader2, CheckCircle2, User } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { AdminService } from "@/lib/admin-service"
import { MascotaUsuario, Veterinario } from "../types"

interface AgendarCitaModalProps {
  isOpen: boolean
  onClose: () => void
  mascotaActiva: MascotaUsuario | null
  assignedVet: Veterinario | null
  allVets: Veterinario[]
  userName: string
  onSuccess: () => void
}

export const AgendarCitaModal: React.FC<AgendarCitaModalProps> = ({
  isOpen,
  onClose,
  mascotaActiva,
  assignedVet,
  allVets,
  userName,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false)
  const safeVets = Array.isArray(allVets) ? allVets : []

  const [formData, setFormData] = useState({
    fecha: "",
    hora: "",
    tipo: "Consulta General",
    motivo: "",
    vetId: assignedVet?.id ? String(assignedVet.id) : ""
  })

  const [minDate, setMinDate] = useState("")

  useEffect(() => {
    const toLocalYmd = (d: Date) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, "0")
      const day = String(d.getDate()).padStart(2, "0")
      return `${y}-${m}-${day}`
    }
    // Calculamos la fecha de mañana para bloquear el pasado y hoy
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setMinDate(toLocalYmd(tomorrow))
  }, [])

  // Update initial vet selection if props change
  useEffect(() => {
    if (assignedVet?.id) {
      setFormData(prev => ({ ...prev, vetId: String(assignedVet.id) }))
    }
  }, [assignedVet])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mascotaActiva) {
      toast.error("No hay una mascota seleccionada")
      return
    }

    setLoading(true)
    try {
      const selectedVet = safeVets.find(v => v?.id && String(v.id) === String(formData.vetId))
      
      const payload = {
        mascota: mascotaActiva.nombre || "Mascota",
        dueno: userName || "Usuario",
        petId: mascotaActiva.id ? String(mascotaActiva.id) : "",
        vetId: formData.vetId,
        veterinario: selectedVet?.name || "Por asignar",
        fecha: formData.fecha,
        hora: formData.hora,
        tipo: formData.tipo,
        motivo: formData.motivo,
        estado: "pendiente" as const
      }

      const result = await AdminService.createAppointment(payload)
      if (result) {
        toast.success("¡Solicitud enviada! Tu veterinario recibirá la notificación para confirmar.")
        onSuccess()
        onClose()
        resetForm()
      } else {
        toast.error("Error al agendar la cita")
      }
    } catch (error) {
      console.error("Submit Error:", error)
      toast.error("Ocurrió un error al enviar la solicitud")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      fecha: "",
      hora: "",
      tipo: "Consulta General",
      motivo: "",
      vetId: assignedVet?.id ? String(assignedVet.id) : ""
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        hideClose 
        className="bg-transparent border-none shadow-none p-0 sm:p-0 gap-0 w-[92vw] sm:w-[480px] max-w-[92vw] sm:max-w-[480px] overflow-visible z-[9999]"
      >
        <div className="w-full bg-[#EDE986] border-[3px] border-[#000000] shadow-[12px_12px_0px_0px_#000000] rounded-[2.5rem] flex flex-col max-h-[90dvh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          <DialogHeader className="bg-[#E7BEF8] p-6 sm:p-7 border-b-[3px] border-[#000000] relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white rounded-xl border-[2px] border-[#000000] shadow-[3px_3px_0px_0px_#000000] text-[#000000]">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
            <DialogTitle className="text-2xl sm:text-3xl font-black text-[#000000] tracking-tight">
              Agendar Nueva Cita
            </DialogTitle>
            <p className="text-[#000000]/80 text-xs sm:text-sm font-bold mt-0.5">
              Solicita una visita para <span className="text-[#000000] underline decoration-[2px] decoration-[#000000]/20">{mascotaActiva?.nombre || "tu mascota"}</span>
            </p>
            <button 
              onClick={onClose}
              type="button"
              className="absolute right-5 top-7 p-2.5 bg-white border-[2px] border-[#000000] shadow-[3px_3px_0px_0px_#000000] hover:bg-[#ffadad] transition-all rounded-full text-[#000000]"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar scrollbar-thin scrollbar-thumb-[#000000]/20">
            <div className="space-y-2.5">
              <Label className="font-bold text-[12px] text-[#000000] uppercase tracking-wider flex items-center gap-2 ml-1 opacity-70">
                <User className="h-3.5 w-3.5" /> Veterinario
              </Label>
              <select 
                name="vetId"
                value={formData.vetId || ""}
                onChange={handleChange}
                required
                className="w-full h-12 px-4 bg-white border-[3px] border-[#000000] rounded-2xl text-base font-bold text-[#000000] focus:outline-none focus:ring-0 shadow-[3px_3px_0px_0px_#000000] transition-all focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_#000000]"
              >
                <option value="" disabled>Selecciona un profesional...</option>
                {safeVets.map(vet => (
                  <option key={vet?.id ? String(vet.id) : Math.random().toString()} value={vet?.id ? String(vet.id) : ""}>
                    {vet?.name || "Veterinario"} - {vet?.specialty || 'General'}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1.5 mt-1 ml-1.5">
                <CheckCircle2 className="h-3 w-3 text-black" />
                <p className="text-[10px] font-black text-black uppercase tracking-tight">
                  Todos los veterinarios son certificados por MIAUWUAUF
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <Label className="font-bold text-[12px] text-[#000000] uppercase tracking-wider flex items-center gap-2 ml-1 opacity-70">
                  <Calendar className="h-3.5 w-3.5" /> Fecha
                </Label>
                <Input 
                  type="date" 
                  name="fecha"
                  required
                  min={minDate}
                  value={formData.fecha || ""}
                  onChange={handleChange}
                  className="bg-white border-[3px] border-[#000000] rounded-2xl h-12 text-base font-bold text-[#000000] shadow-[3px_3px_0px_0px_#000000] focus-visible:ring-0 transition-all focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_#000000]"
                />
              </div>
              <div className="space-y-2.5">
                <Label className="font-bold text-[12px] text-[#000000] uppercase tracking-wider flex items-center gap-2 ml-1 opacity-70">
                  <Clock className="h-3.5 w-3.5" /> Hora
                </Label>
                <Input 
                  type="time" 
                  name="hora"
                  required
                  value={formData.hora || ""}
                  onChange={handleChange}
                  className="bg-white border-[3px] border-[#000000] rounded-2xl h-12 text-base font-bold text-[#000000] shadow-[3px_3px_0px_0px_#000000] focus-visible:ring-0 transition-all focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_#000000]"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <Label className="font-bold text-[12px] text-[#000000] uppercase tracking-wider flex items-center gap-2 ml-1 opacity-70">
                <ClipboardList className="h-3.5 w-3.5" /> Servicio
              </Label>
              <select 
                name="tipo"
                value={formData.tipo || "Consulta General"}
                onChange={handleChange}
                className="w-full h-12 px-4 bg-white border-[3px] border-[#000000] rounded-2xl text-base font-bold text-[#000000] focus:outline-none focus:ring-0 shadow-[3px_3px_0px_0px_#000000] transition-all focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_#000000]"
              >
                <option value="Consulta General">Consulta General</option>
                <option value="Vacunación">Vacunación</option>
                <option value="Desparasitación">Desparasitación</option>
                <option value="Urgencia">Urgencia</option>
                <option value="Control">Control / Seguimiento</option>
                <option value="Cirugía">Programación Cirugía</option>
              </select>
            </div>

            <div className="space-y-2.5">
              <Label className="font-bold text-[12px] text-[#000000] uppercase tracking-wider ml-1 opacity-70">Motivo (Opcional)</Label>
              <Textarea 
                name="motivo"
                value={formData.motivo || ""}
                onChange={handleChange}
                placeholder="Escribe el motivo..."
                className="bg-white border-[3px] border-[#000000] rounded-2xl min-h-[100px] p-4 text-base font-medium text-[#000000] shadow-[3px_3px_0px_0px_#000000] focus-visible:ring-0 resize-none transition-all focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_#000000]"
              />
            </div>

            <div className="bg-[#E7BEF8]/10 border-[2px] border-[#E7BEF8]/40 border-dashed rounded-2xl p-4 flex gap-3 items-start">
              <Clock className="h-4 w-4 text-[#E7BEF8] mt-0.5 shrink-0" />
              <p className="text-[11px] font-bold text-[#000000]/60 leading-normal">
                Tu solicitud será enviada al veterinario asignado para su confirmación.
              </p>
            </div>

            <Button 
              type="submit"
              disabled={loading}
              className="w-full h-14 rounded-2xl border-[3px] border-[#000000] bg-[#E7BEF8] hover:bg-[#e0dc7a] text-[#000000] font-black text-xl shadow-[5px_5px_0px_0px_#000000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <> <CheckCircle2 className="h-6 w-6" /> Agendar Cita </>}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
