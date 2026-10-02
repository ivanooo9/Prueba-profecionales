"use client"

import React from "react"
import { Calendar, Clock, User, X, ClipboardList, CheckCircle2, XCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Cita } from "../types"
import { formatDate } from "@/lib/utils"

interface CitaDetailModalProps {
  isOpen: boolean
  onClose: () => void
  cita: Cita | null
}

export const CitaDetailModal: React.FC<CitaDetailModalProps> = ({ isOpen, onClose, cita }) => {
  if (!cita) return null

  const getStatusStyle = (estado?: string) => {
    const s = estado?.toLowerCase() || "pendiente"
    switch (s) {
      case "completada": return { bg: "bg-green-50", text: "text-green-700", icon: <CheckCircle2 className="h-5 w-5" />, label: "Completada" }
      case "rechazada": return { bg: "bg-red-50", text: "text-destructive", icon: <XCircle className="h-5 w-5" />, label: "Rechazada" }
      case "cancelada": return { bg: "bg-orange-50", text: "text-orange-700", icon: <XCircle className="h-5 w-5" />, label: "Cancelada" }
      default: return { bg: "bg-primary/5", text: "text-primary", icon: <Clock className="h-5 w-5" />, label: estado || "Pendiente" }
    }
  }

  const status = getStatusStyle(cita.estado)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent hideClose className="bg-transparent border-none shadow-none p-0 w-auto max-w-none overflow-visible">
        <div className="w-[92vw] sm:w-[450px] bg-[#EDE986] border-[3px] border-[#000000] shadow-[12px_12px_0px_0px_#000000] rounded-[2.5rem] flex flex-col max-h-[90dvh] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <DialogHeader className={`p-6 sm:p-8 relative border-b-[3px] border-[#000000] ${status.bg}`}>
            <div className="flex items-center gap-3 mb-3">
              <Badge className={`${status.bg} ${status.text} border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000] font-bold text-[11px] px-4 py-1.5 uppercase tracking-wider`}>
                {status.label}
              </Badge>
            </div>
            <DialogTitle className="text-3xl font-black text-[#000000] tracking-tight">
              Detalles de la Cita
            </DialogTitle>
            <button 
              onClick={onClose}
              className="absolute right-6 top-8 p-2.5 bg-white border-[2px] border-[#000000] shadow-[3px_3px_0px_0px_#000000] hover:bg-[#E7BEF8] transition-all rounded-full text-[#000000]"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogHeader>

          <div className="p-6 sm:p-8 space-y-7 overflow-y-auto flex-1 custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="p-5 bg-white rounded-2xl border-[3px] border-[#000000] shadow-[4px_4px_0px_0px_#000000]">
                <div className="flex items-center gap-2 text-[#000000]/60 mb-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-[11px] font-black uppercase tracking-widest">Fecha</span>
                </div>
                <p className="font-extrabold text-xl text-[#000000]">{formatDate(cita.fecha)}</p>
              </div>
              <div className="p-5 bg-white rounded-2xl border-[3px] border-[#000000] shadow-[4px_4px_0px_0px_#000000]">
                <div className="flex items-center gap-2 text-[#000000]/60 mb-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-[11px] font-black uppercase tracking-widest">Hora</span>
                </div>
                <p className="font-extrabold text-xl text-[#000000]">{cita.hora}</p>
              </div>
            </div>

            <div className="p-6 bg-white rounded-3xl border-[3px] border-[#000000] shadow-[6px_6px_0px_0px_#000000] space-y-6">
              <div className="flex items-center gap-5">
                <div className="p-3.5 bg-[#EDE986] rounded-2xl border-[2px] border-[#000000] text-[#000000] shadow-[3px_3px_0px_0px_#000000]">
                  <User className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-[#000000]/50 uppercase leading-none mb-2">Veterinario</p>
                  <p className="font-black text-xl text-[#000000]">{cita.veterinario || "Por asignar"}</p>
                </div>
              </div>

              <div className="flex items-center gap-5 pt-6 border-t-[3px] border-[#000000]/10 border-dashed">
                <div className="p-3.5 bg-[#EDE986] rounded-2xl border-[2px] border-[#000000] text-[#000000] shadow-[3px_3px_0px_0px_#000000]">
                  <ClipboardList className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-[#000000]/50 uppercase leading-none mb-2">Tipo de Servicio</p>
                  <p className="font-black text-xl text-[#000000] capitalize">{cita.tipo}</p>
                </div>
              </div>
            </div>

            {cita.motivo && (
              <div className="p-6 bg-[#EDE986] rounded-2xl border-[3px] border-[#000000] shadow-[4px_4px_0px_0px_#000000]/20 bg-amber-50/30">
                <p className="text-[11px] font-black text-amber-600/80 uppercase mb-3 ml-1 tracking-widest">Motivo de la Cita</p>
                <p className="font-bold text-[#000000] text-base leading-relaxed px-1">&quot;{cita.motivo}&quot;</p>
              </div>
            )}

            <Button 
              onClick={onClose}
              className="w-full h-16 rounded-2xl border-[3px] border-[#000000] bg-[#E7BEF8] hover:bg-[#e0dc7a] text-[#000000] font-black text-lg shadow-[6px_6px_0px_0px_#000000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0px_0px_#000000] active:translate-x-[5px] active:translate-y-[5px] active:shadow-none"
            >
              ¡Entendido!
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
