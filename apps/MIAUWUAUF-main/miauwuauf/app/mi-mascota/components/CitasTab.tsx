import React, { useState } from "react"
import { Calendar, ChevronRight, Clock, User as UserIcon, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Cita, MascotaUsuario, Veterinario } from "../types"
import { CitaDetailModal } from "./CitaDetailModal"
import { AgendarCitaModal } from "./AgendarCitaModal"
import { formatDate } from "@/lib/utils"

interface CitasTabProps {
  citas: Cita[]
  mascotaActiva: MascotaUsuario | null
  assignedVet: Veterinario | null
  vets: Veterinario[]
  userName: string
  refreshData: () => void
}

export const CitasTab = ({ citas, mascotaActiva, assignedVet, vets, userName, refreshData }: CitasTabProps) => {
  const [selectedCita, setSelectedCita] = useState<Cita | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAgendarModalOpen, setIsAgendarModalOpen] = useState(false)

  if (!mascotaActiva) return null

  const activeId = mascotaActiva?.id ? String(mascotaActiva.id) : ""
  const activeName = (mascotaActiva?.nombre || "").toLowerCase().trim()
  
  const misCitas = citas.filter(c => {
    if (!c) return false
    const cPetId = c.petId ? String(c.petId) : null
    const cMascota = c.mascota ? c.mascota.toLowerCase().trim() : null
    return (activeId && cPetId === activeId) || (activeName && cMascota === activeName)
  })

  const handleOpenDetail = (cita: Cita) => {
    setSelectedCita(cita)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-1">Mis Citas Médicas</h2>
          <p className="text-muted-foreground text-sm">Gestiona tus próximas visitas al veterinario</p>
        </div>
        <Button 
          className="rounded-lg font-bold gap-2 px-6 shadow-[3px_3px_0px_0px_#000000] hover:translate-y-0.5 hover:shadow-none transition-all"
          onClick={() => setIsAgendarModalOpen(true)}
        >
          <Calendar className="h-4 w-4" />
          Agendar Nueva Cita
        </Button>
      </div>

      <div className="grid gap-4">
        {misCitas.length === 0 ? (
          <Card className="p-20 text-center border-dashed bg-muted/20">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">No tienes citas programadas para {mascotaActiva?.nombre || "tu mascota"}</p>
          </Card>
        ) : (
          misCitas.map(c => (
            <Card key={c.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-stretch">
                <div className="flex flex-1 flex-col gap-4 p-4 min-w-0 md:flex-row md:items-center md:justify-between md:p-6">
                  <div className="flex min-w-0 flex-1 flex-col items-center gap-4 sm:flex-row sm:items-start">
                    <div className={`h-12 w-12 shrink-0 rounded-full flex items-center justify-center
                      ${c.estado === "completada" ? "bg-green-100 text-green-700" : 
                        c.estado === "rechazada" ? "bg-red-100 text-red-700" : 
                        "bg-primary/10 text-primary"}
                    `}>
                      <Calendar className="h-6 w-6" />
                    </div>
                    
                    <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
                      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                        <h4 className="font-bold text-lg leading-none break-words">{c.tipo || "Consulta"}</h4>
                      </div>
                      <div className="flex flex-col items-center gap-2 text-sm font-medium text-muted-foreground sm:flex-row sm:flex-wrap sm:justify-start">
                        <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 shrink-0" /> {formatDate(c.fecha)}</span>
                        <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 shrink-0" /> {c.hora}</span>
                        <span className="flex min-w-0 max-w-full items-center justify-center gap-1.5 break-words sm:justify-start"><UserIcon className="h-4 w-4 shrink-0" /> {c.veterinario || "Por asignar"}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
                    <Badge className={`border-0 gap-1.5 px-3 py-1.5 font-bold text-xs ring-4 ring-transparent
                      ${c.estado === "pendiente" ? "bg-amber-100 text-amber-700 animate-pulse border-2 border-amber-300 ring-amber-50" : 
                        c.estado === "confirmada" ? "bg-green-100 text-green-700 hover:bg-green-200" : 
                        c.estado === "completada" ? "bg-blue-100 text-blue-700 hover:bg-blue-100" : 
                        c.estado === "rechazada" ? "bg-red-100 text-red-700 hover:bg-red-100" : 
                        "bg-primary/10 text-primary hover:bg-primary/10"}
                    `}>
                      {c.estado === "completada" && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {c.estado === "rechazada" && <XCircle className="h-3.5 w-3.5" />}
                      {c.estado === "pendiente" ? "ESPERANDO CONFIRMACIÓN" : 
                       c.estado === "confirmada" ? "CITA CONFIRMADA" : 
                       (c.estado || "PENDIENTE").toUpperCase()}
                    </Badge>
                    
                    <Button 
                      variant="ghost" 
                      onClick={() => handleOpenDetail(c)}
                      className="text-muted-foreground hover:text-primary transition-colors font-bold gap-2"
                    >
                      Detalles
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <CitaDetailModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cita={selectedCita}
      />

      <AgendarCitaModal 
        isOpen={isAgendarModalOpen}
        onClose={() => setIsAgendarModalOpen(false)}
        mascotaActiva={mascotaActiva}
        assignedVet={assignedVet}
        allVets={vets}
        userName={userName}
        onSuccess={refreshData}
      />
    </div>
  )
}
