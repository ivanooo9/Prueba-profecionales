import React from "react"
import { Calendar, Clock, CheckCircle, ChevronDown, PawPrint, User, Phone, XCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Cita } from "@/lib/admin-service"
import { formatDate } from "@/lib/utils"
import { formatEcuadorPhoneDisplay } from "@/lib/phone"

interface CitasTabProps {
  citas: Cita[]
  mascotas?: {
    id: string | number
    nombre: string
    tipo?: string
    especie?: string
    phone?: string
    telefono?: string
    dueno?: string
    user?: { name?: string; phone?: string; telefono?: string }
  }[]
  onCompletarCita: (id: string | number) => void
  onConfirmarCita: (id: string | number) => void
  onAtenderCita: (citaId: string, petId: string) => void
  onReagendarCita: (cita: Cita) => void
  onRechazarCita: (id: string | number) => void
  onViewFullHistory?: () => void
  onAgendarInvitado?: () => void
}

export const CitasTab: React.FC<CitasTabProps> = React.memo(({ 
  citas, 
  mascotas = [],
  onCompletarCita, 
  onConfirmarCita,
  onAtenderCita,
  onReagendarCita,
  onRechazarCita,
  onViewFullHistory,
  onAgendarInvitado
}) => {
  const normalizeDateOnly = (value?: string) => {
    if (!value) return ""
    const trimmed = value.trim()
    const isoDate = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed)
    if (isoDate) return isoDate[1]
    const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed)
    if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`
    return trimmed
  }

  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' })
  const fechaBadge = formatDate(new Date()).toUpperCase()
  const [openCards, setOpenCards] = React.useState<Record<string, boolean>>({})

  const citasHoyConfirmadas = React.useMemo(
    () =>
      citas
        .filter((c) => c.estado === "confirmada" && normalizeDateOnly(c.fecha) <= hoy)
        .sort((a, b) => {
          const dateA = normalizeDateOnly(a.fecha)
          const dateB = normalizeDateOnly(b.fecha)
          if (dateA !== dateB) return dateA.localeCompare(dateB)
          return a.hora.localeCompare(b.hora)
        }),
    [citas, hoy]
  )

  const restoAgendaConfirmadas = React.useMemo(
    () =>
      citas
        .filter((c) => c.estado === "confirmada" && normalizeDateOnly(c.fecha) > hoy)
        .sort((a, b) => {
          const dateA = new Date(`${normalizeDateOnly(a.fecha)}T${a.hora || "00:00"}`).getTime()
          const dateB = new Date(`${normalizeDateOnly(b.fecha)}T${b.hora || "00:00"}`).getTime()
          return dateA - dateB
        }),
    [citas, hoy]
  )

  const pendingCitas = React.useMemo(
    () => citas.filter((c) => c.estado === "pendiente"),
    [citas]
  )

  const pendingCount = pendingCitas.length

  const groupedPendingEntries = React.useMemo(() => {
    const grouped = pendingCitas.reduce((acc, cita) => {
      const key = cita.petId || cita.mascota
      if (!acc[key]) {
        acc[key] = {
          nombre: cita.mascota,
          dueno: cita.dueno,
          petId: cita.petId,
          citas: [],
        }
      }
      acc[key].citas.push(cita)
      return acc
    }, {} as Record<string, { nombre: string; dueno: string; petId?: string; citas: Cita[] }>)
    return Object.entries(grouped)
  }, [pendingCitas])

  const getHistoryEventDateRaw = React.useCallback((cita: Cita) => {
    // For completed/rejected records, use the timestamp when status changed.
    if (cita.estado === "completada" || cita.estado === "rechazada") {
      return cita.updatedAt || cita.createdAt || cita.fecha
    }
    return cita.fecha || cita.createdAt || ""
  }, [])

  const getHistoryEventLabel = React.useCallback((cita: Cita) => {
    if (cita.estado === "rechazada") return "Rechazada"
    if (cita.estado === "completada") return "Atendida/Completada"
    return "Evento"
  }, [])

  const historyStats = React.useMemo(() => {
    const stats = citas.reduce(
      (acc, c) => {
        if (c.estado === "completada") {
          return {
            ...acc,
            completedCount: acc.completedCount + 1,
            filtered: [...acc.filtered, c],
          }
        }
        if (c.estado === "rechazada") {
          return {
            ...acc,
            rejectedCount: acc.rejectedCount + 1,
            filtered: [...acc.filtered, c],
          }
        }
        return acc
      },
      { completedCount: 0, rejectedCount: 0, filtered: [] as Cita[] }
    )
    const parseEventTime = (cita: Cita) => {
      const raw = getHistoryEventDateRaw(cita)
      const parsed = new Date(raw || "").getTime()
      return Number.isNaN(parsed) ? 0 : parsed
    }

    const recent = [...stats.filtered]
      .sort((a, b) => parseEventTime(b) - parseEventTime(a))
      .slice(0, 8)

    return {
      completedCount: stats.completedCount,
      rejectedCount: stats.rejectedCount,
      recent,
    }
  }, [citas, getHistoryEventDateRaw])

  const petSpeciesById = React.useMemo(
    () =>
      mascotas.reduce(
        (acc, pet) => {
          const species = (pet.especie || pet.tipo || "").trim()
          if (species) {
            acc[String(pet.id)] = species
          }
          return acc
        },
        {} as Record<string, string>
      ),
    [mascotas]
  )

  const petSpeciesByName = React.useMemo(
    () =>
      mascotas.reduce(
        (acc, pet) => {
          const species = (pet.especie || pet.tipo || "").trim()
          const nameKey = (pet.nombre || "").trim().toLowerCase()
          if (species && nameKey) {
            acc[nameKey] = species
          }
          return acc
        },
        {} as Record<string, string>
      ),
    [mascotas]
  )

  const petOwnerById = React.useMemo(
    () =>
      mascotas.reduce(
        (acc, pet) => {
          const owner = (pet.user?.name || pet.dueno || "").trim()
          if (owner) {
            acc[String(pet.id)] = owner
          }
          return acc
        },
        {} as Record<string, string>
      ),
    [mascotas]
  )

  const petOwnerByName = React.useMemo(
    () =>
      mascotas.reduce(
        (acc, pet) => {
          const owner = (pet.user?.name || pet.dueno || "").trim()
          const nameKey = (pet.nombre || "").trim().toLowerCase()
          if (owner && nameKey) {
            acc[nameKey] = owner
          }
          return acc
        },
        {} as Record<string, string>
      ),
    [mascotas]
  )

  const petPhoneById = React.useMemo(
    () =>
      mascotas.reduce(
        (acc, pet) => {
          const phone = (pet.user?.phone || pet.user?.telefono || pet.phone || pet.telefono || "").trim()
          if (phone) {
            acc[String(pet.id)] = phone
          }
          return acc
        },
        {} as Record<string, string>
      ),
    [mascotas]
  )

  const petPhoneByName = React.useMemo(
    () =>
      mascotas.reduce(
        (acc, pet) => {
          const phone = (pet.user?.phone || pet.user?.telefono || pet.phone || pet.telefono || "").trim()
          const nameKey = (pet.nombre || "").trim().toLowerCase()
          if (phone && nameKey) {
            acc[nameKey] = phone
          }
          return acc
        },
        {} as Record<string, string>
      ),
    [mascotas]
  )

  const isLikelyId = (value: string) => /^[a-f0-9]{20,}$/i.test(value) || /^[0-9a-f-]{16,}$/i.test(value)

  const normalizeTypeLabel = (tipo: string) => {
    const tipoLower = tipo.toLowerCase()
    if (tipoLower.includes("vacun")) return "VACUNACION"
    if (tipoLower.includes("control") || tipoLower.includes("prevent")) return "CONTROL PREVENTIVO"
    return tipo.toUpperCase()
  }

  const getRelativeDayLabel = (fecha: string) => {
    const normalized = normalizeDateOnly(fecha)
    if (!normalized) return ""
    const target = new Date(`${normalized}T00:00:00`)
    const today = new Date(`${hoy}T00:00:00`)
    const msPerDay = 24 * 60 * 60 * 1000
    const diffDays = Math.round((target.getTime() - today.getTime()) / msPerDay)

    if (diffDays <= 0) return "hoy"
    if (diffDays === 1) return "mañana"
    return `en ${diffDays} días`
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h2 className="text-4xl font-black font-heading tracking-tight text-foreground">Gestión de Citas</h2>
          <p className="font-bold text-foreground/70 text-lg">Organización cronológica de tus pacientes</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {onAgendarInvitado && (
            <button
              onClick={onAgendarInvitado}
              className="flex items-center gap-2 h-11 px-4 bg-[#93ABD9] text-foreground border-[2px] border-foreground font-black rounded-xl shadow-[3px_3px_0px_0px_#000000] hover:bg-[#7f9dca] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000000] transition-all text-sm"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Agendar Invitado</span>
            </button>
          )}
          <div className="hidden md:block">
            <Badge className="bg-[#a8d5ba] text-foreground border-[3px] border-foreground shadow-[3px_3px_0px_0px_#000000] font-black px-4 py-2 rounded-xl text-lg">
              {fechaBadge}
            </Badge>
          </div>
        </div>
      </div>


      {/* Hoy */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ffadad] border-[3px] border-foreground shadow-[2px_2px_0px_0px_#000000] flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
          <h3 className="text-2xl font-black uppercase tracking-wider text-foreground">Citas para Hoy</h3>
        </div>
        <p className="text-xs font-bold text-foreground/60">Cada tarjeta funciona de forma independiente.</p>
        <div className="grid items-start gap-6 lg:grid-cols-2">
          {citasHoyConfirmadas.length === 0 ? (
            <div className="lg:col-span-2 py-10 text-center bg-white/50 border-[3px] border-dashed border-foreground/20 rounded-3xl">
              <p className="font-bold text-foreground/40 text-xl">Sin citas confirmadas para hoy</p>
            </div>
          ) : (
            citasHoyConfirmadas.map((cita) => (
              <Card key={cita.id} className="self-start bg-[#f6fff2] border-[3px] border-[#6f9d52] p-0 shadow-[8px_8px_0px_0px_#000000] rounded-3xl overflow-hidden hover:translate-x-1 hover:translate-y-1 transition-all">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    <div className="w-full sm:w-32 bg-[#d8f0b5] border-b-[3px] sm:border-b-0 sm:border-r-[3px] border-foreground flex flex-row sm:flex-col items-center justify-center p-4 gap-2">
                      <p className="font-black text-2xl">{cita.hora}</p>
                      <Badge className="bg-white text-foreground border-2 border-foreground font-black text-[10px] whitespace-nowrap">{cita.tipo}</Badge>
                    </div>
                    <div className="flex-1 p-6 relative">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-black text-2xl leading-none mb-1 text-foreground">{cita.mascota}</h4>
                          {(() => {
                            const ownerFromPet =
                              (cita.petId ? petOwnerById[String(cita.petId)] : "") ||
                              petOwnerByName[(cita.mascota || "").trim().toLowerCase()] ||
                              ""
                            const ownerFromCita = (cita.dueno || "").trim()
                            const owner =
                              ownerFromPet || (ownerFromCita && !isLikelyId(ownerFromCita) ? ownerFromCita : "")
                            return (
                              <p className="text-[11px] font-bold text-foreground/60">
                                Dueño: <span className="font-black text-foreground">{owner || "No registrado"}</span>
                              </p>
                            )
                          })()}
                          {(() => {
                            const phoneFromPet =
                              (cita.petId ? petPhoneById[String(cita.petId)] : "") ||
                              petPhoneByName[(cita.mascota || "").trim().toLowerCase()] ||
                              ""
                            const phoneFromCita = String(
                              (cita as Cita & { telefono?: string; phone?: string }).telefono ||
                                (cita as Cita & { telefono?: string; phone?: string }).phone ||
                                "",
                            ).trim()
                            const phone = phoneFromPet || phoneFromCita
                            const phoneDisplay = formatEcuadorPhoneDisplay(phone) || phone
                            return (
                              <p className="text-[11px] font-bold text-foreground/60">
                                Teléfono: <span className="font-black text-foreground">{phoneDisplay || "No registrado"}</span>
                              </p>
                            )
                          })()}
                          <Badge className="mt-1 bg-[#a8d5ba] text-foreground border-2 border-foreground font-black text-[10px] py-0.5 px-2.5">
                            HOY
                          </Badge>
                        </div>
                        <Badge className={`border-2 border-foreground font-black px-3 py-1 shadow-[2px_2px_0px_0px_#000000] ${
                            cita.estado === "confirmada" ? "bg-[#93ABD9] text-foreground" : 
                            cita.estado === "pendiente" ? "bg-[#ffd6a5] text-foreground animate-pulse" :
                            "bg-white text-foreground"
                        }`}>
                          {cita.estado.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button 
                          onClick={() => onAtenderCita(String(cita.id), cita.petId || "")}
                          className="flex-1 min-w-[120px] bg-primary text-primary-foreground hover:bg-primary/85 font-bold border-2 border-foreground rounded-xl h-11 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)] flex items-center justify-center gap-2"
                        >
                          Atender Cita
                        </button>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => onCompletarCita(cita.id)}
                            className="w-11 h-11 p-0 border-2 border-foreground bg-[#93ABD9] hover:bg-[#7f9dca] rounded-xl shadow-[2px_2px_0px_0px_#000000]"
                            title="Completar"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => onReagendarCita(cita)}
                            className="w-11 h-11 p-0 border-2 border-foreground bg-[#ffd6a5] hover:bg-[#ffc28d] rounded-xl shadow-[2px_2px_0px_0px_#000000]"
                            title="Reagendar"
                          >
                            <Calendar className="h-5 w-5" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => onRechazarCita(cita.id)}
                            className="w-11 h-11 p-0 border-2 border-foreground bg-[#ffadad] hover:bg-[#ff8f8f] rounded-xl shadow-[2px_2px_0px_0px_#000000]"
                            title="Rechazar"
                          >
                            <XCircle className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                      <p className="mt-3 text-[11px] font-bold text-foreground/55">
                        Estos botones aplican solo a esta cita.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* Resto de Agenda (Nombre Original Restaurado) */}
      <section className="space-y-4 pt-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#93ABD9] border-[3px] border-foreground shadow-[2px_2px_0px_0px_#000000] flex items-center justify-center">
            <Calendar className="h-5 w-5" />
          </div>
          <h3 className="text-2xl font-black uppercase tracking-wider text-foreground">Resto de Agenda</h3>
        </div>
        <p className="text-xs font-bold text-foreground/60">Cada tarjeta funciona de forma independiente.</p>
        <div className="grid items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
          {restoAgendaConfirmadas.length === 0 ? (
            <div className="lg:col-span-3 py-10 text-center bg-white/50 border-[3px] border-dashed border-foreground/20 rounded-3xl">
              <p className="font-bold text-foreground/40 text-xl">Sin citas próximas agendadas</p>
            </div>
          ) : (
            restoAgendaConfirmadas.map((cita) => (
              <Card key={cita.id} className="self-start bg-[#f5f9ff] border-[3px] border-[#93ABD9] p-0 shadow-[6px_6px_0px_0px_#000000] rounded-3xl overflow-hidden hover:translate-x-1 hover:translate-y-1 transition-all">
                <CardContent className="p-0">
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h5 className="font-black text-xl text-foreground">{cita.mascota}</h5>
                        {(() => {
                          const ownerFromPet =
                            (cita.petId ? petOwnerById[String(cita.petId)] : "") ||
                            petOwnerByName[(cita.mascota || "").trim().toLowerCase()] ||
                            ""
                          const ownerFromCita = (cita.dueno || "").trim()
                          const owner =
                            ownerFromPet || (ownerFromCita && !isLikelyId(ownerFromCita) ? ownerFromCita : "")
                          return owner ? (
                            <p className="mt-0.5 text-[11px] font-bold text-foreground/60">
                              Dueño: <span className="font-black text-foreground">{owner}</span>
                            </p>
                          ) : null
                        })()}
                        {(() => {
                          const phoneFromPet =
                            (cita.petId ? petPhoneById[String(cita.petId)] : "") ||
                            petPhoneByName[(cita.mascota || "").trim().toLowerCase()] ||
                            ""
                          const phoneFromCita = String((cita as Cita & { telefono?: string; phone?: string }).telefono || (cita as Cita & { telefono?: string; phone?: string }).phone || "").trim()
                          const phone = phoneFromPet || phoneFromCita
                          const phoneDisplay = formatEcuadorPhoneDisplay(phone) || phone
                          return (
                            <p className="mt-0.5 text-[11px] font-bold text-foreground/60">
                              Teléfono: <span className="font-black text-foreground">{phoneDisplay || "No registrado"}</span>
                            </p>
                          )
                        })()}
                        <Badge className="mt-1 bg-[#93ABD9] text-foreground border-2 border-foreground font-black text-[10px] py-0.5 px-2.5">
                          PRÓXIMA
                        </Badge>
                      </div>
                      <div className="bg-white border-2 border-foreground rounded-xl px-3 py-1.5 shadow-[2px_2px_0px_0px_#000000] flex flex-col items-end">
                        <p className="font-black text-sm text-foreground">{formatDate(cita.fecha)}</p>
                        <p className="text-[10px] font-bold text-foreground/50">{cita.hora}</p>
                        <p className="text-[10px] font-black uppercase text-[#5f7fb3]">
                          {getRelativeDayLabel(cita.fecha)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-5">
                      <Badge className="bg-[#bdb2ff] text-foreground border-2 border-foreground font-black text-[10px] py-1 px-3">
                        {cita.tipo.toUpperCase()}
                      </Badge>
                      <Badge className="bg-white text-foreground border-2 border-foreground font-bold text-[10px] py-1 px-3">
                        {cita.estado}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => onReagendarCita(cita)} 
                        className="w-full px-4 bg-[#ffd6a5] hover:bg-[#ffc28d] text-foreground border-2 border-foreground shadow-[2px_2px_0px_0px_#000000] font-black rounded-xl active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center"
                        title="Reagendar"
                      >
                        Reagendar
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => onRechazarCita(cita.id)} 
                        className="w-full px-4 bg-[#ffadad] hover:bg-[#ff8f8f] text-foreground border-2 border-foreground shadow-[2px_2px_0px_0px_#000000] font-black rounded-xl active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center"
                        title="Rechazar"
                      >
                        Rechazar
                      </Button>
                    </div>
                    <p className="mt-3 text-[11px] font-bold text-foreground/55">
                      Estos botones aplican solo a esta cita.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>
  
      {/* SECCION PENDIENTES (NUEVO NOMBRE AQUÍ) */}
      <section className="space-y-4 pt-10 border-t-4 border-dashed border-foreground/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ffd6a5] border-[3px] border-foreground shadow-[2px_2px_0px_0px_#000000] flex items-center justify-center relative">
             <Calendar className="h-5 w-5" />
             {pendingCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce-slow">
                  {pendingCount}
                </span>
             )}
          </div>
          <h3 className="text-2xl font-black uppercase tracking-wider text-foreground">Solicitudes y Seguimientos</h3>
        </div>
        <p className="text-xs font-bold text-foreground/60">Cada tarjeta funciona de forma independiente.</p>
        
        <div className="px-3 pb-10">
          {pendingCount === 0 ? (
            <div className="w-full py-12 text-center bg-[#fffcf4] border-[3px] border-dashed border-[#ffd6a5]/30 rounded-[32px]">
              <p className="font-bold text-[#b49061] text-lg italic">No tienes seguimientos o solicitudes pendientes por ahora</p>
            </div>
          ) : (
            <div className="columns-1 gap-6 md:columns-2 lg:columns-3">
              {groupedPendingEntries.map(([petKey, group]) => {
              const petById = mascotas.find((pet) => group.petId && String(pet.id) === String(group.petId))
              const petByName = mascotas.find((pet) => pet.nombre === group.nombre)
              const ownerFromPet = petById?.user?.name || petById?.dueno || petByName?.user?.name || petByName?.dueno
              const ownerFromCita = (group.dueno || "").trim()
              const ownerLabel = ownerFromPet || (ownerFromCita && !isLikelyId(ownerFromCita) ? ownerFromCita : "No registrado")
              const phoneFromPet =
                petById?.user?.phone ||
                petById?.user?.telefono ||
                petById?.phone ||
                petById?.telefono ||
                petByName?.user?.phone ||
                petByName?.user?.telefono ||
                petByName?.phone ||
                petByName?.telefono
              const phoneFromCita = String(
                (group.citas[0] as Cita & { telefono?: string; phone?: string })?.telefono ||
                  (group.citas[0] as Cita & { telefono?: string; phone?: string })?.phone ||
                  "",
              ).trim()
              const rawPhoneLabel = phoneFromPet || phoneFromCita
              const phoneLabel = formatEcuadorPhoneDisplay(rawPhoneLabel) || rawPhoneLabel || "No registrado"
              const isExpanded = openCards[petKey] ?? true
              const citasByType = group.citas.reduce((acc, cita) => {
                const typeKey = normalizeTypeLabel(cita.tipo)
                if (!acc[typeKey]) acc[typeKey] = []
                acc[typeKey].push(cita)
                return acc
              }, {} as Record<string, Cita[]>)

              return (
              <Card key={petKey} className="mb-4 break-inside-avoid self-start bg-[#f8f6f3] border-[3px] border-[#f0c9a3] p-0 rounded-[30px] overflow-hidden shadow-[6px_6px_0px_0px_#e7c4a0] transition-all hover:-translate-y-1">
                <CardContent className="p-5 space-y-5">
                  <Badge className="bg-[#f4cfab] text-foreground border-[3px] border-foreground text-sm font-black px-4 py-1.5 rounded-full shadow-[2px_2px_0px_0px_#000000]">
                    REFUERZO/SIGUIENTE
                  </Badge>

                  <div className="rounded-3xl border-[3px] border-foreground bg-[#f4cfab] p-4 flex items-center justify-between gap-3">
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-3">
                        <PawPrint className="h-5 w-5 shrink-0" />
                        <p className="text-lg font-bold truncate">
                          Mascota: <span className="font-black">{group.nombre}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 shrink-0" />
                        <p className="text-lg font-bold truncate">
                          Dueño: <span className="font-black">{ownerLabel}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 shrink-0" />
                        <p className="text-lg font-bold truncate">
                          Teléfono: <span className="font-black">{phoneLabel}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setOpenCards((prev) => ({ ...prev, [petKey]: !isExpanded }))}
                      className="flex items-center gap-3 pl-2"
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? "Colapsar detalles" : "Expandir detalles"}
                    >
                      <div className="h-24 w-px bg-foreground/40" />
                      <ChevronDown className={`h-8 w-8 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="space-y-4">
                      {Object.entries(citasByType).map(([tipo, typeCitas]) => {
                        const sortedByDate = [...typeCitas].sort((a, b) => {
                          const dateA = new Date(`${normalizeDateOnly(a.fecha)}T${a.hora || "00:00"}`).getTime();
                          const dateB = new Date(`${normalizeDateOnly(b.fecha)}T${b.hora || "00:00"}`).getTime();
                          return dateA - dateB;
                        })

                        return (
                          <section key={tipo} className="rounded-[26px] border-2 border-dashed border-[#f0c9a3] bg-[#fffaf2] p-4">
                            <Badge className="mb-3 bg-[#f4cfab] text-foreground border-[3px] border-foreground text-sm font-black px-4 py-1 rounded-full">
                              {tipo}
                            </Badge>

                            {sortedByDate.map((cita) => (
                              <div key={cita.id} className="border-t border-dashed border-[#f0c9a3] py-3">
                                <div className="rounded-2xl border-2 border-[#f0c9a3] bg-white/70 p-3 space-y-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <Badge className="bg-white text-foreground border-2 border-foreground font-black text-xs py-1 px-3 rounded-full">
                                      {normalizeDateOnly(cita.fecha) === hoy ? "CITA DE HOY" : "PRÓXIMA CITA"}
                                    </Badge>
                                    <p className="text-sm font-black text-foreground/70">
                                      Creación: {formatDate(cita.createdAt || cita.fecha)}
                                    </p>
                                  </div>
                                  {normalizeDateOnly(cita.fecha) === hoy && (
                                    <p className="text-[11px] font-black text-[#5f7fb3] uppercase">
                                      Al confirmar, pasa a Citas para Hoy
                                    </p>
                                  )}

                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-[11px] font-black text-foreground/55 uppercase">Proxima Cita</p>
                                      <p className="text-xl font-black text-foreground/80">{formatDate(cita.fecha)}</p>
                                    </div>
                                    <div>
                                      <p className="text-[11px] font-black text-foreground/55 uppercase">Hora</p>
                                      <p className="text-xl font-black text-foreground/80">{cita.hora || "--:--"}</p>
                                    </div>
                                  </div>

                                  <p className="text-xs font-bold text-foreground/60">
                                    Estos botones aplican solo a esta cita.
                                  </p>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <Button
                                      onClick={() => {
                                        // Aceptar siempre confirma la cita; "completar" solo tras la atención.
                                        onConfirmarCita(cita.id)
                                      }}
                                      className="bg-[#f4cfab] hover:bg-[#efc096] text-foreground border-[3px] border-foreground shadow-[2px_2px_0px_0px_#000000] font-black rounded-xl h-10 text-sm"
                                    >
                                      Aceptar
                                    </Button>
                                    <Button
                                      onClick={() => onRechazarCita(cita.id)}
                                      className="bg-[#f4cfab] hover:bg-[#efc096] text-foreground border-[3px] border-foreground shadow-[2px_2px_0px_0px_#000000] font-black rounded-xl h-10 text-sm"
                                    >
                                      Rechazar
                                    </Button>
                                    <Button
                                      onClick={() => onReagendarCita(cita)}
                                      className="bg-[#f4cfab] hover:bg-[#efc096] text-foreground border-[3px] border-foreground shadow-[2px_2px_0px_0px_#000000] font-black rounded-xl h-10 text-sm"
                                    >
                                      Reagendar
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </section>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
              )
            })}
          </div>
        )}
      </div>
    </section>

      {/* Completadas */}
      {historyStats.recent.length > 0 && (
        <section className="space-y-4 pt-10 mt-10 border-t-4 border-dashed border-foreground/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-xl font-black text-foreground uppercase tracking-[0.15em]">Historial Reciente</h3>
              <div className="flex gap-2 text-xs font-bold text-foreground/60 bg-white border-2 border-foreground rounded-full px-3 py-1 shadow-[2px_2px_0px_0px_#000000]">
                <span className="text-green-600">{historyStats.completedCount} Completadas</span>
                <span>•</span>
                <span className="text-red-500">{historyStats.rejectedCount} Rechazadas</span>
              </div>
            </div>
            {onViewFullHistory && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewFullHistory}
                className="self-start border-2 border-foreground bg-[#fdffb6] hover:bg-[#fcf3a6] font-black text-xs shadow-[2px_2px_0px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-xl h-9"
              >
                Ver todo el historial →
              </Button>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {historyStats.recent.map((cita) => {
              const isRechazada = cita.estado === "rechazada"
              return (
                <div 
                  key={cita.id} 
                  className={`border-[3px] border-foreground rounded-2xl p-4 flex justify-between items-center shadow-[4px_4px_0px_0px_#000000] transition-all hover:-translate-y-0.5 ${
                    isRechazada 
                      ? "bg-[#fff5f5] border-[#d9534f]" 
                      : "bg-[#f6fff2] border-[#6f9d52]"
                  }`}
                >
                  <div className="space-y-1.5">
                    <p className="font-black text-lg text-foreground leading-tight">{cita.mascota}</p>
                    {(() => {
                      const species =
                        (cita.petId ? petSpeciesById[String(cita.petId)] : "") ||
                        petSpeciesByName[(cita.mascota || "").trim().toLowerCase()] ||
                        ""
                      return species ? (
                        <Badge className="bg-white text-foreground border border-foreground font-black text-[9px] uppercase px-1.5 py-0">
                          {species}
                        </Badge>
                      ) : null
                    })()}
                    {(() => {
                      const ownerFromPet =
                        (cita.petId ? petOwnerById[String(cita.petId)] : "") ||
                        petOwnerByName[(cita.mascota || "").trim().toLowerCase()] ||
                        ""
                      const ownerFromCita = (cita.dueno || "").trim()
                      const owner =
                        ownerFromPet || (ownerFromCita && !isLikelyId(ownerFromCita) ? ownerFromCita : "")
                      return owner ? (
                        <p className="text-[11px] font-bold text-foreground/75">
                          Dueño: <span className="font-black text-foreground">{owner}</span>
                        </p>
                      ) : null
                    })()}
                    <p className="text-[11px] font-bold text-foreground/75">
                      {getHistoryEventLabel(cita)}:{" "}
                      <span className="font-black text-foreground">
                        {formatDate(getHistoryEventDateRaw(cita))}
                        {cita.hora ? ` • ${cita.hora}` : ""}
                      </span>
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <p className="text-[10px] font-black text-foreground/50 uppercase">{cita.tipo}</p>
                      <span className="text-foreground/30 text-[10px]">•</span>
                      <Badge className={`font-black text-[9px] uppercase tracking-wider py-0.5 ${
                        isRechazada 
                          ? "bg-red-100 text-red-700 border border-red-300" 
                          : "bg-green-100 text-green-700 border border-green-300"
                      }`}>
                        {cita.estado}
                      </Badge>
                    </div>
                  </div>
                  {isRechazada ? (
                    <XCircle className="h-6 w-6 text-[#d9534f] shrink-0" />
                  ) : (
                    <CheckCircle className="h-6 w-6 text-[#6f9d52] shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
})

CitasTab.displayName = "CitasTab"
