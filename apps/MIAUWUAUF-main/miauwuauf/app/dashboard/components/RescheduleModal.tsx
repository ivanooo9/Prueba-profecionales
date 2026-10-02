"use client"

import React, { useState } from "react"
import { Calendar, Clock, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Cita } from "@/lib/admin-service"

interface RescheduleModalProps {
  isOpen: boolean
  onClose: () => void
  onReschedule: (id: string, fecha: string, hora: string) => void | Promise<unknown>
  cita: Cita | null
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({ 
  isOpen, 
  onClose, 
  onReschedule, 
  cita 
}) => {
  const [fecha, setFecha] = useState("")
  const [hora, setHora] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [lastCitaId, setLastCitaId] = useState<string | number | null>(null)

  // Adjusting state when prop changes (React pattern to avoid useEffect)
  if (cita && cita.id !== lastCitaId) {
    setLastCitaId(cita.id)
    
    // Intentar formatear la fecha para el input type="date" (YYYY-MM-DD)
    let formattedFecha = cita.fecha
    if (cita.fecha.includes('/')) {
      const [d, m, y] = cita.fecha.split('/')
      formattedFecha = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
    setFecha(formattedFecha)
    setHora(cita.hora)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cita || !fecha || !hora || submitting) return
    setSubmitting(true)
    try {
      await Promise.resolve(onReschedule(String(cita.id), fecha, hora))
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="grid w-[95vw] max-w-[95vw] gap-0 overflow-hidden rounded-3xl border-[4px] border-foreground bg-[#fdfaf5] p-0 sm:p-0 shadow-[10px_10px_0px_0px_#000000] sm:max-w-[425px] sm:w-full focus:outline-none">
        <DialogHeader className="relative border-b-4 border-foreground bg-[#e7bef8] p-6 sm:p-8 space-y-0 text-left">
          <DialogTitle className="text-3xl font-black font-heading flex items-center gap-3">
            <div className="bg-white p-2 rounded-xl border-[3px] border-foreground shadow-[3px_3px_0px_0px_#000000]">
              <Calendar className="h-6 w-6" />
            </div>
            Reagendar Cita
          </DialogTitle>
          <DialogDescription className="text-foreground/80 font-bold mt-4">
            Selecciona el nuevo horario para {cita?.mascota}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-black text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Nueva Fecha
              </Label>
              <Input
                type="date"
                value={fecha}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="h-14 border-[3px] border-foreground rounded-2xl bg-white shadow-[4px_4px_0px_0px_#000000] focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all font-bold text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-black text-lg flex items-center gap-2">
                <Clock className="h-4 w-4" /> Nueva Hora
              </Label>
              <Input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                required
                className="h-14 border-[3px] border-foreground rounded-2xl bg-white shadow-[4px_4px_0px_0px_#000000] focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all font-bold text-lg"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={onClose}
              className="flex-1 h-14 border-[3px] border-foreground bg-white hover:bg-foreground/5 font-black text-xl rounded-2xl shadow-[4px_4px_0px_0px_#000000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:opacity-60"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 h-14 border-[3px] border-foreground bg-[#e7bef8] hover:bg-[#d8a8e8] text-foreground font-black text-xl rounded-2xl shadow-[4px_4px_0px_0px_#000000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Guardando…
                </>
              ) : (
                "Confirmar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
