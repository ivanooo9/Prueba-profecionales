"use client"

import React, { useState, useMemo } from "react"
import { Calendar, Clock, PawPrint, X, Zap, AlertCircle, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Cita } from "@/lib/admin-service"

interface Mascota {
  id: string | number
  nombre: string
  especie?: string
  tipo?: string
  raza?: string
  user?: { name?: string; email?: string; phone?: string }
  dueno?: string
}

interface CitaRapidaModalProps {
  isOpen: boolean
  onClose: () => void
  mascotas: Mascota[]
  onCitaCreada: (cita: Cita) => void
}


export const CitaRapidaModal: React.FC<CitaRapidaModalProps> = ({
  isOpen,
  onClose,
  mascotas,
  onCitaCreada,
}) => {
  const [petSearch, setPetSearch] = useState("")
  const [selectedPet, setSelectedPet] = useState<Mascota | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [tipoCita, setTipoCita] = useState("")
  const [fecha, setFecha] = useState(() => {
    // Default to today in Ecuador timezone (YYYY-MM-DD)
    return new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" })
  })
  const [hora, setHora] = useState("09:00")
  const [motivo, setMotivo] = useState("")
  const [loading, setLoading] = useState(false)

  // Filter mascotas based on search
  const filteredMascotas = useMemo(() => {
    const q = petSearch.toLowerCase().trim()
    if (!q) return mascotas.slice(0, 8)
    return mascotas.filter(
      (m) =>
        m.nombre?.toLowerCase().includes(q) ||
        m.user?.name?.toLowerCase().includes(q) ||
        m.dueno?.toLowerCase().includes(q) ||
        m.especie?.toLowerCase().includes(q) ||
        m.tipo?.toLowerCase().includes(q) ||
        m.raza?.toLowerCase().includes(q)
    ).slice(0, 8)
  }, [mascotas, petSearch])

  const handleSelectPet = (pet: Mascota) => {
    setSelectedPet(pet)
    setPetSearch(pet.nombre)
    setShowDropdown(false)
  }

  const handleReset = () => {
    setSelectedPet(null)
    setPetSearch("")
    setTipoCita("Consulta General")
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
    if (!selectedPet) {
      toast.error("Selecciona una mascota primero")
      return
    }
    if (!fecha || !hora) {
      toast.error("La fecha y hora son requeridas")
      return
    }

    setLoading(true)
    const toastId = toast.loading("Agendando cita rápida...")
    try {
      const payload = {
        mascota: selectedPet.nombre,
        petId: String(selectedPet.id),
        dueno: selectedPet.user?.name || selectedPet.dueno || "",
        tipo: tipoCita,
        motivo: motivo || tipoCita,
        fecha,
        hora,
        estado: "confirmada", // Vet-created appointments are auto-confirmed
      }

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const newCita = await res.json()
        toast.success(
          `Cita agendada para ${selectedPet.nombre} el ${fecha} a las ${hora}. Se notificó al dueño por correo.`,
          { id: toastId, duration: 5000 }
        )
        onCitaCreada(newCita)
        handleClose()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.message || "No se pudo crear la cita", { id: toastId })
      }
    } catch (error) {
      console.error("Error creating quick cita:", error)
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
        <div className="bg-[#a8d5ba] border-b-[3px] border-foreground px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white border-[3px] border-foreground rounded-2xl flex items-center justify-center shadow-[3px_3px_0px_0px_#000000]">
              <Zap className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <h2 className="font-black text-xl text-foreground leading-tight">Cita Rápida</h2>
              <p className="text-xs font-bold text-foreground/70">El dueño recibirá notificación por correo</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Pet Selector */}
          <div className="space-y-2">
            <Label className="font-black text-sm uppercase tracking-wide text-foreground flex items-center gap-2">
              <PawPrint className="h-4 w-4" />
              Mascota
            </Label>
            <div className="relative">
              <Input
                value={petSearch}
                onChange={(e) => {
                  setPetSearch(e.target.value)
                  setSelectedPet(null)
                  setShowDropdown(true)
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Buscar por nombre de mascota o dueño..."
                className="h-12 border-[3px] border-foreground rounded-xl font-bold shadow-[3px_3px_0px_0px_#000000] focus-visible:ring-0 bg-white placeholder:text-foreground/40"
              />
              {showDropdown && filteredMascotas.length > 0 && !selectedPet && (
                <div
                  className="absolute z-50 w-full mt-1 bg-white border-[3px] border-foreground rounded-2xl shadow-[6px_6px_0px_0px_#000000] overflow-hidden"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div className="max-h-56 overflow-y-auto">
                  {filteredMascotas.map((pet) => (
                    <button
                      key={String(pet.id)}
                      type="button"
                      onClick={() => handleSelectPet(pet)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#a8d5ba]/30 transition-colors border-b border-foreground/10 last:border-b-0 text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#a8d5ba]/30 border border-foreground/20 flex items-center justify-center shrink-0">
                        <PawPrint className="h-4 w-4 text-foreground/60" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-sm text-foreground leading-tight">{pet.nombre}</p>
                        <p className="font-bold text-xs text-foreground/50 truncate">
                          {pet.especie || pet.tipo || "Mascota"} • Dueño: {pet.user?.name || pet.dueno || "Sin registrar"}
                        </p>
                      </div>
                    </button>
                  ))}
                  </div>
                </div>
              )}
            </div>
            {selectedPet && (
              <div className="flex items-center gap-2 bg-[#a8d5ba]/20 border-2 border-[#a8d5ba] rounded-xl px-3 py-2">
                <PawPrint className="h-4 w-4 text-foreground/60 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="font-black text-sm text-foreground">{selectedPet.nombre}</span>
                  <span className="font-bold text-xs text-foreground/60 ml-2">
                    — {selectedPet.user?.name || selectedPet.dueno || "Dueño no registrado"}
                  </span>
                </div>
                <Badge className="bg-white text-foreground border border-foreground font-black text-[9px] uppercase shrink-0">
                  {selectedPet.especie || selectedPet.tipo || "Mascota"}
                </Badge>
              </div>
            )}
          </div>

          {/* Tipo de Cita — texto libre */}
          <div className="space-y-2">
            <Label className="font-black text-sm uppercase tracking-wide text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Tipo de Cita
            </Label>
            <Input
              value={tipoCita}
              onChange={(e) => setTipoCita(e.target.value)}
              placeholder="Ej: Consulta general, Vacunación, Control mensual..."
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
              placeholder="Ej: Control post-vacuna, seguimiento desparasitación..."
              maxLength={150}
              className="h-12 border-[3px] border-foreground rounded-xl font-bold shadow-[3px_3px_0px_0px_#000000] focus-visible:ring-0 bg-white placeholder:text-foreground/40"
            />
          </div>

          {/* Info notice */}
          <div className="flex items-start gap-3 bg-[#fdffb6] border-2 border-foreground rounded-xl px-4 py-3">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-foreground/60" />
            <p className="text-xs font-bold text-foreground/70 leading-relaxed">
              La cita se creará como <span className="font-black text-foreground">confirmada</span> y el dueño de la mascota recibirá automáticamente una notificación por correo.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              onClick={handleClose}
              variant="outline"
              className="flex-1 h-13 border-[3px] border-foreground font-black rounded-2xl shadow-[3px_3px_0px_0px_#000000] hover:bg-[#ffadad] transition-all active:translate-y-0.5 active:shadow-none"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedPet || !fecha || !hora || !tipoCita.trim()}
              className="flex-2 h-13 bg-[#a8d5ba] text-foreground border-[3px] border-foreground font-black rounded-2xl shadow-[3px_3px_0px_0px_#000000] hover:bg-[#90c9a7] transition-all active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:active:translate-y-0 flex items-center gap-2 px-8"
            >
              <Zap className="h-5 w-5" />
              {loading ? "Agendando..." : "Agendar Cita"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

CitaRapidaModal.displayName = "CitaRapidaModal"
