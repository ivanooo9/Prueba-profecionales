"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users, MapPin } from "lucide-react"
import { formatDate } from "@/lib/utils"

const defaultEvents = [
  {
    id: "1",
    title: "Jornada de Vacunación Gratuita",
    date: "2025-02-01",
    time: "9:00 AM - 5:00 PM",
    location: "Parque Central",
    attendees: 45,
    maxAttendees: 100,
    description: "Vacunación gratuita contra rabia y parvovirus",
  },
  {
    id: "2",
    title: "Feria de Adopción",
    date: "2025-02-15",
    time: "10:00 AM - 6:00 PM",
    location: "Centro Comercial Plaza",
    attendees: 28,
    maxAttendees: 50,
    description: "Conoce a nuestros perritos en busca de un hogar",
  },
  {
    id: "3",
    title: "Taller de Cuidado Canino",
    date: "2025-02-20",
    time: "3:00 PM - 5:00 PM",
    location: "Centro MIAUWUAUF",
    attendees: 15,
    maxAttendees: 30,
    description: "Aprende sobre nutrición, higiene y cuidados básicos",
  },
]

interface EventData {
  id: string
  title: string
  date: string
  time: string
  location: string
  attendees: number
  maxAttendees: number
  description: string
  type?: string
}

export default function Events() {
  const [events, setEvents] = useState<EventData[]>(defaultEvents)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch("/api/events")
        if (res.ok) {
          const data = await res.json()
          const mappedEvents: EventData[] = data.map((e: {
            id: string
            titulo: string
            fecha: string
            hora?: string
            lugar: string
            registrations?: Record<string, unknown>[]
            maximo?: number
            descripcion?: string
            tipo?: string
          }) => ({
            id: e.id,
            title: e.titulo,
            date: e.fecha,
            time: e.hora || "Horario por confirmar",
            location: e.lugar,
            attendees: e.registrations ? e.registrations.length : 0,
            maxAttendees: e.maximo || 100,
            description: e.descripcion || `Evento de tipo ${e.tipo || "General"}`,
            type: e.tipo,
          }))
          setEvents(mappedEvents.slice(0, 3)) // Mostrar los 3 más recientes
        }
      } catch (error) {
        console.error("Error fetching events:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [])

  return (
    <section id="eventos" className="relative py-12 md:py-16">


      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        <div className="mb-8 animate-fade-in-up space-y-3 text-center md:mb-10 md:space-y-4">
          <div className="inline-block">
            <span className="section-title-pill section-title-pill-pink">
              ÚNETE A NOSOTROS
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl md:text-7xl font-black text-balance tracking-tight text-[#000000]">Próximos Eventos</h2>
          <p className="text-xl text-[#000000]/70 max-w-2xl mx-auto text-pretty leading-relaxed font-bold">
            Participa en nuestras ferias de adopción y jornadas de salud
          </p>
        </div>
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground font-bold animate-pulse">Cargando eventos...</p>
            </div>
          ) : events.length > 0 ? events.map((event, index) => (
            <Card
              key={event.id}
              className="animate-in fade-in slide-in-from-bottom-4 overflow-hidden rounded-[2rem] border-[3px] border-[#000000] bg-[#e7bef8] p-0 shadow-[8px_8px_0px_0px_#000000] transition-all duration-300 hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_#000000]"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <CardHeader className="gap-0 rounded-t-[2rem] border-b-2 border-[#000000]/20 bg-[#e7bef8] p-8 pb-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <CardTitle className="text-2xl md:text-3xl font-heading font-black text-foreground leading-tight">
                        {event.title}
                      </CardTitle>
                      {event.type && (
                        <Badge className="border-[3px] border-[#000000] bg-[#EDE986] px-3 font-black text-[10px] uppercase tracking-tighter text-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                          {event.type}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-bold text-foreground/70">
                      {event.description}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {event.attendees >= event.maxAttendees ? (
                      <Button
                        size="lg"
                        className="bg-[#e8e4db] border-2 border-foreground/20 text-foreground/40 font-bold rounded-full px-8 py-6 shadow-none cursor-not-allowed w-full md:w-auto"
                        disabled
                      >
                        Cupos Llenos
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        className="w-full rounded-full border-[3px] border-[#000000] bg-[#e7bef8] px-8 py-6 font-black text-base text-[#000000] shadow-[6px_6px_0px_0px_#000000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#EDE986] hover:shadow-[3px_3px_0px_0px_#000000] active:translate-y-[1px] active:shadow-none md:w-auto"
                        asChild
                      >
                        <a href="/login?callbackUrl=/mi-mascota?tab=eventos">Inscribirme</a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="bg-[#e7bef8] p-8">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {/* Fecha */}
                  <div className="group flex items-center gap-4 rounded-3xl border-2 border-[#000000] bg-[#e7bef8] p-4 shadow-[3px_3px_0px_0px_#000000]">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-[3px] border-[#000000] bg-white shadow-[3px_3px_0px_0px_#000000] transition-colors group-hover:bg-[#EDE986]">
                      <Calendar className="h-5 w-5 text-[#4A4A4A] transition-colors group-hover:text-[#000000]" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-foreground/60 uppercase tracking-widest leading-none mb-1">Fecha</p>
                      <p className="text-sm md:text-base font-black text-foreground truncate">
                        {formatDate(event.date)}
                      </p>
                      <p className="text-[11px] font-bold text-foreground/50 truncate">
                        {event.time}
                      </p>
                    </div>
                  </div>

                  {/* Ubicación */}
                  <div className="group flex items-center gap-4 rounded-3xl border-2 border-[#000000] bg-[#e7bef8] p-4 shadow-[3px_3px_0px_0px_#000000]">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-[3px] border-[#000000] bg-white shadow-[3px_3px_0px_0px_#000000] transition-colors group-hover:bg-[#EDE986]">
                      <MapPin className="h-5 w-5 text-[#4A4A4A] transition-colors group-hover:text-[#000000]" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-foreground/60 uppercase tracking-widest leading-none mb-1">Ubicación</p>
                      <p className="text-sm md:text-base font-black text-foreground truncate">
                        {event.location}
                      </p>
                    </div>
                  </div>

                  {/* Inscritos */}
                  <div className="group flex items-center gap-4 rounded-3xl border-2 border-[#000000] bg-[#e7bef8] p-4 shadow-[3px_3px_0px_0px_#000000]">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-[3px] border-[#000000] bg-white shadow-[3px_3px_0px_0px_#000000] transition-colors group-hover:bg-[#EDE986]">
                      <Users className="h-5 w-5 text-[#4A4A4A] transition-colors group-hover:text-[#000000]" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-foreground/60 uppercase tracking-widest leading-none mb-1">Inscritos</p>
                      <p className="text-sm md:text-base font-black text-foreground truncate">
                        {event.attendees}/{event.maxAttendees}
                      </p>
                      <p className="text-[11px] font-bold text-foreground/50 truncate">personas</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground font-bold">No hay eventos programados en este momento.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
