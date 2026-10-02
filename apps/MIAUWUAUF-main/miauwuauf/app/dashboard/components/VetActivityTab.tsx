"use client"

import React, { useMemo, useState } from "react"
import { ClipboardList, Pill, Shield, Syringe, Calendar, Search, PawPrint, FileText } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { Cita, Diagnostico, Tratamiento, Preventivo, Vacuna, Mascota } from "@/lib/admin-service"

interface VetActivityTabProps {
  historial: { tipo?: string | null; estado?: string | null; petId?: string | number | null; mascota?: string | null; dueno?: string | null; fecha?: string | null; createdAt?: string | null; descripcion?: string | null; diagnostico?: string | null; medicamento?: string | null; vacunaId?: string | null; notas?: string | null; dosis?: string | number | null; duracion?: string | number | null; proximaFecha?: string | null; motivo?: string | null; [key: string]: unknown }[]
  mascotas: Mascota[]
}

export const VetActivityTab: React.FC<VetActivityTabProps> = ({ historial, mascotas }) => {
  const [searchTerm, setSearchTerm] = useState("")

  // Map to speed up looking up pet details by name or id
  const petMap = useMemo(() => {
    const map = new Map<string, Mascota>()
    mascotas.forEach(pet => {
      if (pet.id) map.set(String(pet.id), pet)
      if (pet.nombre) map.set(pet.nombre.trim().toLowerCase(), pet)
    })
    return map
  }, [mascotas])

  // Get stats
  const stats = useMemo(() => {
    const uniquePets = new Set<string>()
    let diagnosesCount = 0
    let treatmentsCount = 0
    let vaccinesCount = 0
    let preventivesCount = 0
    let completedAppointmentsCount = 0
    let rejectedAppointmentsCount = 0

    historial.forEach(item => {
      // Track unique pets
      const petIdOrName = item.petId || item.mascota
      if (petIdOrName) {
        uniquePets.add(String(petIdOrName).trim().toLowerCase())
      }

      // Count by type
      const type = (item.tipo || "").toLowerCase()
      if (type.includes("diagn")) diagnosesCount++
      else if (type.includes("tratam")) treatmentsCount++
      else if (type.includes("vacun")) vaccinesCount++
      else if (type.includes("preven")) preventivesCount++
      else if (type.includes("cita")) {
        if (item.estado === "rechazada") {
          rejectedAppointmentsCount++
        } else {
          completedAppointmentsCount++
        }
      }
    })

    return {
      totalPetsAttended: uniquePets.size,
      diagnosesCount,
      treatmentsCount,
      vaccinesCount,
      preventivesCount,
      completedAppointmentsCount,
      rejectedAppointmentsCount,
      totalActions: historial.length
    }
  }, [historial])

  // Filtered history list
  const filteredHistorial = useMemo(() => {
    if (!searchTerm.trim()) return historial

    const query = searchTerm.toLowerCase().trim()

    return historial.filter(item => {
      // Find associated pet and owner info for matching
      const petIdStr = item.petId ? String(item.petId) : ""
      const petNameKey = (item.mascota || "").trim().toLowerCase()
      
      const pet = petMap.get(petIdStr) || petMap.get(petNameKey)
      const ownerName = pet?.user?.name || pet?.dueno || item.dueno || ""
      const ownerCedula = pet?.user?.cedula || ""
      
      const itemDate = formatDate(item.fecha || item.createdAt || "")
      const itemType = item.tipo || ""
      const itemDesc = item.descripcion || item.diagnostico || item.medicamento || item.vacunaId || item.tipo || ""
      const itemNotas = item.notas || ""

      return (
        item.mascota?.toLowerCase().includes(query) ||
        ownerName.toLowerCase().includes(query) ||
        ownerCedula.includes(query) ||
        itemDate.toLowerCase().includes(query) ||
        itemType.toLowerCase().includes(query) ||
        itemDesc.toLowerCase().includes(query) ||
        itemNotas.toLowerCase().includes(query)
      )
    })
  }, [historial, searchTerm, petMap])

  const getEventIconAndColor = (event: { tipo?: string | null; estado?: string | null; [key: string]: unknown }) => {
    const t = (event.tipo || "").toLowerCase()
    if (t.includes("diagn")) return { icon: ClipboardList, color: "bg-[#bdb2ff]" }
    if (t.includes("tratam")) return { icon: Pill, color: "bg-[#ffc6ff]" }
    if (t.includes("preven")) return { icon: Shield, color: "bg-[#9bf6ff]" }
    if (t.includes("vacun")) return { icon: Syringe, color: "bg-[#fdffb6]" }
    
    // Citas
    if (event.estado === "rechazada") {
      return { icon: Calendar, color: "bg-[#ffadad]" }
    }
    return { icon: Calendar, color: "bg-[#a8d5ba]" }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-4xl font-black font-heading tracking-tight text-foreground">Mi Historial de Actividad</h2>
        <p className="font-bold text-foreground/70 text-lg">Estadísticas y registro de todas tus consultas y atenciones médicas</p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        {/* Pets Attended */}
        <Card className="bg-[#e2f0d9] border-[3px] border-foreground shadow-[4px_4px_0px_0px_#000000] rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-white border-2 border-foreground shadow-[2px_2px_0px_0px_#000000] flex items-center justify-center mb-3">
              <PawPrint className="h-4 w-4" />
            </div>
            <p className="text-xs font-black uppercase text-foreground/50">Pacientes Atendidos</p>
          </div>
          <p className="text-3xl font-black mt-2">{stats.totalPetsAttended}</p>
        </Card>

        {/* Diagnósticos */}
        <Card className="bg-[#e8dff5] border-[3px] border-foreground shadow-[4px_4px_0px_0px_#000000] rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-white border-2 border-foreground shadow-[2px_2px_0px_0px_#000000] flex items-center justify-center mb-3">
              <ClipboardList className="h-4 w-4 text-[#bdb2ff]" />
            </div>
            <p className="text-xs font-black uppercase text-foreground/50">Revisión y Diagnóstico</p>
          </div>
          <p className="text-3xl font-black mt-2">{stats.diagnosesCount}</p>
        </Card>

        {/* Tratamientos */}
        <Card className="bg-[#fce1e4] border-[3px] border-foreground shadow-[4px_4px_0px_0px_#000000] rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-white border-2 border-foreground shadow-[2px_2px_0px_0px_#000000] flex items-center justify-center mb-3">
              <Pill className="h-4 w-4 text-[#ffc6ff]" />
            </div>
            <p className="text-xs font-black uppercase text-foreground/50">Tratamientos</p>
          </div>
          <p className="text-3xl font-black mt-2">{stats.treatmentsCount}</p>
        </Card>

        {/* Vacunas */}
        <Card className="bg-[#fcf6bd] border-[3px] border-foreground shadow-[4px_4px_0px_0px_#000000] rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-white border-2 border-foreground shadow-[2px_2px_0px_0px_#000000] flex items-center justify-center mb-3">
              <Syringe className="h-4 w-4 text-[#fdffb6]" />
            </div>
            <p className="text-xs font-black uppercase text-foreground/50">Vacunas</p>
          </div>
          <p className="text-3xl font-black mt-2">{stats.vaccinesCount}</p>
        </Card>

        {/* Preventivos */}
        <Card className="bg-[#d0f4de] border-[3px] border-foreground shadow-[4px_4px_0px_0px_#000000] rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-white border-2 border-foreground shadow-[2px_2px_0px_0px_#000000] flex items-center justify-center mb-3">
              <Shield className="h-4 w-4 text-[#9bf6ff]" />
            </div>
            <p className="text-xs font-black uppercase text-foreground/50">Preventivos</p>
          </div>
          <p className="text-3xl font-black mt-2">{stats.preventivesCount}</p>
        </Card>

        {/* Citas Completadas */}
        <Card className="bg-[#c5dedd] border-[3px] border-foreground shadow-[4px_4px_0px_0px_#000000] rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-white border-2 border-foreground shadow-[2px_2px_0px_0px_#000000] flex items-center justify-center mb-3">
              <Calendar className="h-4 w-4 text-[#a8d5ba]" />
            </div>
            <p className="text-xs font-black uppercase text-foreground/50">Citas Completas</p>
          </div>
          <p className="text-3xl font-black mt-2">{stats.completedAppointmentsCount}</p>
        </Card>

        {/* Citas Rechazadas */}
        <Card className="bg-[#fff5f5] border-[3px] border-foreground shadow-[4px_4px_0px_0px_#000000] rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-white border-2 border-foreground shadow-[2px_2px_0px_0px_#000000] flex items-center justify-center mb-3">
              <Calendar className="h-4 w-4 text-[#ffadad]" />
            </div>
            <p className="text-xs font-black uppercase text-foreground/50">Citas Rechazadas</p>
          </div>
          <p className="text-3xl font-black mt-2">{stats.rejectedAppointmentsCount}</p>
        </Card>
      </div>

      {/* Search Input Section */}
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/50" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por mascota, dueño, cédula, fecha, tipo de atención o notas..."
            className="pl-12 h-14 bg-white border-[3px] border-foreground shadow-[3px_3px_0px_0px_#000000] rounded-2xl font-bold placeholder:text-foreground/40 text-lg focus-visible:ring-0 focus-visible:border-foreground"
          />
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="space-y-4">
        {filteredHistorial.length === 0 ? (
          <div className="text-center py-20 bg-white/50 border-[3px] border-dashed border-foreground/20 rounded-3xl">
            <p className="font-bold text-foreground/50 text-xl">
              {searchTerm ? "No se encontraron resultados para tu búsqueda" : "No has registrado ninguna actividad médica todavía"}
            </p>
          </div>
        ) : (
          filteredHistorial.map((event, index) => {
            const { icon: Icon, color: iconBg } = getEventIconAndColor(event)
            
            // Map pet details
            const petIdStr = event.petId ? String(event.petId) : ""
            const petNameKey = (event.mascota || "").trim().toLowerCase()
            const pet = petMap.get(petIdStr) || petMap.get(petNameKey)
            
            const ownerName = pet?.user?.name || pet?.dueno || event.dueno || "No registrado"
            const ownerCedula = pet?.user?.cedula || ""
            const petSpecies = pet?.especie || pet?.tipo || ""

            return (
              <Card key={index} className="bg-white border-[3px] border-foreground shadow-[4px_4px_0px_0px_#000000] rounded-2xl overflow-hidden p-0 flex flex-col md:flex-row">
                {/* Event Type & Date Header Sidebar on MD+ screen */}
                <div className={`w-full md:w-48 ${iconBg} border-b-[3px] md:border-b-0 md:border-r-[3px] border-foreground p-4 flex flex-row md:flex-col items-center justify-between md:justify-center md:gap-2`}>
                  <div className="flex items-center gap-2 md:flex-col md:gap-1">
                    <div className="w-10 h-10 rounded-xl bg-white border-2 border-foreground shadow-[2px_2px_0px_0px_#000000] flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge className="bg-white text-foreground border-2 border-foreground font-black text-[10px] uppercase tracking-wide">
                      {event.tipo}
                    </Badge>
                  </div>
                  <p className="font-black text-sm text-[#000000] text-right md:text-center md:mt-2">
                    {formatDate(event.fecha || event.createdAt || "")}
                  </p>
                </div>

                {/* Patient / Details body */}
                <div className="flex-1 p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    {/* Patient / Owner Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-2xl text-foreground">{event.mascota}</h4>
                        {petSpecies && (
                          <Badge className="bg-foreground/5 text-foreground/70 border border-foreground/20 font-bold text-[10px] uppercase">
                            {petSpecies}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs font-bold text-foreground/60 mt-1">
                        Dueño: <span className="font-black text-foreground">{ownerName}</span>
                        {ownerCedula && (
                          <span className="ml-2 bg-foreground/5 px-2 py-0.5 rounded border border-foreground/10 text-[10px]">
                            C.I: {ownerCedula}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Diagnosis, Treatment, Vacc, Prev notes */}
                  <div className="bg-foreground/5 border-2 border-foreground/10 p-4 rounded-xl">
                    {/* Diagnosis */}
                    {event.tipo?.toLowerCase().includes("diagn") && (
                      <div>
                        <p className="text-[10px] font-black uppercase text-foreground/40 mb-1">Diagnóstico Clínico</p>
                        <h5 className="font-black text-lg text-[#000000]">{event.diagnostico}</h5>
                        {event.notas && <p className="text-sm font-bold text-foreground/60 italic mt-2 border-l-4 border-[#bdb2ff] pl-3">"{event.notas}"</p>}
                      </div>
                    )}

                    {/* Treatment */}
                    {event.tipo?.toLowerCase().includes("tratam") && (
                      <div>
                        <p className="text-[10px] font-black uppercase text-foreground/40 mb-1">Medicamento y Tratamiento</p>
                        <h5 className="font-black text-lg text-[#000000]">{event.medicamento}</h5>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-bold text-foreground/70">
                          <span className="bg-[#ffc6ff] border border-foreground/20 rounded-lg px-2.5 py-0.5 text-xs text-foreground font-black">{event.dosis}</span>
                          <span>durante</span>
                          <span className="font-black text-foreground">{event.duracion}</span>
                        </p>
                        {event.notas && <p className="text-sm font-bold text-foreground/60 italic mt-2 border-l-4 border-[#ffc6ff] pl-3">"{event.notas}"</p>}
                      </div>
                    )}

                    {/* Vaccination */}
                    {event.tipo?.toLowerCase().includes("vacun") && (
                      <div>
                        <p className="text-[10px] font-black uppercase text-foreground/40 mb-1">Vacuna Aplicada</p>
                        <h5 className="font-black text-lg text-[#000000]">{event.vacunaId || "Vacuna"}</h5>
                        <p className="text-xs font-bold text-foreground/60 mt-1">Dosis: <span className="text-foreground font-black">{event.dosis}</span></p>
                        <p className="text-xs font-bold text-foreground/60">
                          Siguiente dosis programada: <span className="text-foreground font-black">{formatDate(event.proximaFecha)}</span>
                        </p>
                        {event.notas && <p className="text-sm font-bold text-foreground/60 italic mt-2 border-l-4 border-[#fdffb6] pl-3">"{event.notas}"</p>}
                      </div>
                    )}

                    {/* Preventive */}
                    {event.tipo?.toLowerCase().includes("preven") && (
                      <div>
                        <p className="text-[10px] font-black uppercase text-foreground/40 mb-1">Control Preventivo</p>
                        <h5 className="font-black text-lg text-[#000000]">{event.tipo || "Control"}</h5>
                        <p className="text-xs font-bold text-foreground/60 mt-1">
                          Próxima dosis: <span className="text-foreground font-black">{formatDate(event.proximaFecha)}</span>
                        </p>
                        {event.notas && <p className="text-sm font-bold text-foreground/60 italic mt-2 border-l-4 border-[#9bf6ff] pl-3">"{event.notas}"</p>}
                      </div>
                    )}

                    {/* Appointment */}
                    {event.tipo?.toLowerCase().includes("cita") && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[10px] font-black uppercase text-foreground/40">Atención por Cita</p>
                          <Badge className={`font-black text-[9px] uppercase tracking-wider py-0 px-1.5 ${
                            event.estado === "rechazada" 
                              ? "bg-red-100 text-red-700 border border-red-300" 
                              : "bg-green-100 text-green-700 border border-green-300"
                          }`}>
                            {event.estado}
                          </Badge>
                        </div>
                        <h5 className="font-black text-lg text-[#000000]">{event.descripcion || (event.estado === "rechazada" ? "Cita Cancelada/Rechazada" : "Consulta General Completada")}</h5>
                        {event.motivo && <p className="text-sm font-bold text-foreground/60 mt-1">Motivo: <span className="text-foreground font-black">{event.motivo}</span></p>}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}

VetActivityTab.displayName = "VetActivityTab"
