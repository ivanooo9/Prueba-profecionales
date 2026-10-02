"use client"

import React, { useState } from "react"
import { Calendar, Clock, X, User, Mail, Phone, FileText, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface CitaInvitadoModalProps {
  isOpen: boolean
  onClose: () => void
  onCitaCreada: (cita: Record<string, unknown>) => void
}

export const CitaInvitadoModal: React.FC<CitaInvitadoModalProps> = ({
  isOpen,
  onClose,
  onCitaCreada,
}) => {
  const [nombre, setNombre] = useState("")
  const [correo, setCorreo] = useState("")
  const [telefono, setTelefono] = useState("")
  const [tipoCita, setTipoCita] = useState("")
  const [fecha, setFecha] = useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" })
  )
  const [hora, setHora] = useState("09:00")
  const [motivo, setMotivo] = useState("")
  const [loading, setLoading] = useState(false)

  const handleReset = () => {
    setNombre("")
    setCorreo("")
    setTelefono("")
    setTipoCita("")
    setFecha(new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" }))
    setHora("09:00")
    setMotivo("")
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) {
      toast.error("El nombre del cliente es requerido")
      return
    }
    if (!correo.trim() || !correo.includes("@")) {
      toast.error("El correo electrónico no es válido")
      return
    }
    if (!fecha || !hora) {
      toast.error("La fecha y hora son requeridas")
      return
    }

    setLoading(true)
    const toastId = toast.loading("Agendando cita para cliente externo...")
    try {
      const res = await fetch("/api/appointments/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          correo: correo.trim(),
          telefono: telefono.trim(),
          tipo: tipoCita,
          motivo: motivo || tipoCita,
          fecha,
          hora,
        }),
      })

      if (res.ok) {
        const newCita = await res.json()
        toast.success(
          `Cita agendada para ${nombre.trim()} el ${fecha} a las ${hora}. Se le notificó por correo a ${correo}.`,
          { id: toastId, duration: 6000 }
        )
        onCitaCreada(newCita)
        handleClose()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error((err as { message?: string }).message || "No se pudo crear la cita", { id: toastId })
      }
    } catch (error) {
      console.error("Error creating guest cita:", error)
      toast.error("Error de red al crear la cita", { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#fdfaf5] border-[3px] border-foreground rounded-[2.5rem] shadow-[10px_10px_0px_0px_#000000] overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="bg-[#93ABD9] border-b-[3px] border-foreground px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white border-[3px] border-foreground rounded-2xl flex items-center justify-center shadow-[3px_3px_0px_0px_#000000]">
              <User className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <h2 className="font-black text-xl text-foreground leading-tight">Agendar Invitado</h2>
              <p className="text-xs font-bold text-foreground/70">Para personas que no están registradas en la plataforma</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-xl bg-white/80 border-2 border-foreground flex items-center justify-center shadow-[2px_2px_0px_0px_#000000] hover:bg-[#ffadad] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* Nombre */}
          <div className="space-y-2">
            <Label className="font-black text-sm uppercase tracking-wide text-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              Nombre completo
            </Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Juan Pérez"
              required
              className="h-12 border-[3px] border-foreground rounded-xl font-bold shadow-[3px_3px_0px_0px_#000000] focus-visible:ring-0 bg-white placeholder:text-foreground/40"
            />
          </div>

          {/* Correo */}
          <div className="space-y-2">
            <Label className="font-black text-sm uppercase tracking-wide text-foreground flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Correo electrónico
            </Label>
            <Input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="Ej: juan@correo.com"
              required
              className="h-12 border-[3px] border-foreground rounded-xl font-bold shadow-[3px_3px_0px_0px_#000000] focus-visible:ring-0 bg-white placeholder:text-foreground/40"
            />
          </div>

          {/* Teléfono */}
          <div className="space-y-2">
            <Label className="font-black text-sm uppercase tracking-wide text-foreground flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Teléfono
              <span className="font-bold text-foreground/40 normal-case text-xs">(opcional)</span>
            </Label>
            <Input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej: 0999123456"
              className="h-12 border-[3px] border-foreground rounded-xl font-bold shadow-[3px_3px_0px_0px_#000000] focus-visible:ring-0 bg-white placeholder:text-foreground/40"
            />
          </div>

          {/* Tipo de Cita */}
          <div className="space-y-2">
            <Label className="font-black text-sm uppercase tracking-wide text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Tipo de Cita
            </Label>
            <Input
              value={tipoCita}
              onChange={(e) => setTipoCita(e.target.value)}
              placeholder="Ej: Consulta general, Vacunación, Revisión..."
              maxLength={80}
              required
              className="h-12 border-[3px] border-foreground rounded-xl font-bold shadow-[3px_3px_0px_0px_#000000] focus-visible:ring-0 bg-white placeholder:text-foreground/40"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-black text-sm uppercase tracking-wide text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha
              </Label>
              <Input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="h-12 border-[3px] border-foreground rounded-xl font-bold shadow-[3px_3px_0px_0px_#000000] focus-visible:ring-0 bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-black text-sm uppercase tracking-wide text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Hora
              </Label>
              <Input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                required
                className="h-12 border-[3px] border-foreground rounded-xl font-bold shadow-[3px_3px_0px_0px_#000000] focus-visible:ring-0 bg-white"
              />
            </div>
          </div>

          {/* Motivo (optional) */}
          <div className="space-y-2">
            <Label className="font-black text-sm uppercase tracking-wide text-foreground">
              Motivo / Nota{" "}
              <span className="font-bold text-foreground/40 normal-case text-xs">(opcional)</span>
            </Label>
            <Input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Detalles adicionales..."
              maxLength={150}
              className="h-12 border-[3px] border-foreground rounded-xl font-bold shadow-[3px_3px_0px_0px_#000000] focus-visible:ring-0 bg-white placeholder:text-foreground/40"
            />
          </div>

          {/* Info notice */}
          <div className="flex items-start gap-3 bg-[#93ABD9]/20 border-2 border-[#93ABD9] rounded-xl px-4 py-3">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#93ABD9]" />
            <p className="text-xs font-bold text-foreground/70 leading-relaxed">
              El cliente recibirá un <span className="font-black text-foreground">correo de confirmación</span> con los detalles de su cita. No necesita estar registrado en la plataforma.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              onClick={handleClose}
              variant="outline"
              className="flex-1 h-12 border-[3px] border-foreground font-black rounded-2xl shadow-[3px_3px_0px_0px_#000000] hover:bg-[#ffadad] transition-all active:translate-y-0.5 active:shadow-none"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !nombre.trim() || !correo.trim() || !fecha || !hora || !tipoCita.trim()}
              className="flex-1 h-12 bg-[#93ABD9] text-foreground border-[3px] border-foreground font-black rounded-2xl shadow-[3px_3px_0px_0px_#000000] hover:bg-[#7f9dca] transition-all active:translate-y-0.5 active:shadow-none disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <User className="h-5 w-5" />
              {loading ? "Agendando..." : "Agendar Cita"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

CitaInvitadoModal.displayName = "CitaInvitadoModal"
