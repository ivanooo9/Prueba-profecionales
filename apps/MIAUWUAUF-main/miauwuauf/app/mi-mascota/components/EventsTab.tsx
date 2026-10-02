import React, { useState } from "react"
import Image from "next/image"
import { Calendar, MapPin, CheckCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Evento, MascotaUsuario } from "../types"
import { formatDate } from "@/lib/utils"

interface EventsTabProps {
  eventos: Evento[]
  misMascotas: MascotaUsuario[]
  mascotaActiva?: MascotaUsuario | null
  currentUserId?: string
  onInscribirse: (eventoId: string | number, mascotaId: string | number) => void | Promise<unknown>
}

export const EventsTab = ({
  eventos,
  misMascotas,
  mascotaActiva,
  currentUserId,
  onInscribirse
}: EventsTabProps) => {
  const [selectedPetId, setSelectedPetId] = useState<string>(String(mascotaActiva?.id || ""))
  const [enrollingId, setEnrollingId] = useState<string | number | null>(null)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold mb-2">Eventos y Comunidad</h2>
          <p className="text-muted-foreground">Inscribete en actividades para ti y tu mascota</p>
        </div>
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium whitespace-nowrap">Inscribir a:</Label>
          <select 
            className="p-2 rounded-lg border bg-background text-base min-w-0 w-full max-w-[240px] sm:min-w-[200px]"
            value={selectedPetId}
            onChange={(e) => setSelectedPetId(e.target.value)}
          >
            <option value="">Seleccionar mascota...</option>
            {misMascotas.map(m => (
              <option key={m.id} value={String(m.id)}>{m.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {eventos.map((evento) => {
          const isRegisteredWithPet = selectedPetId && evento.inscritos?.some(ins => String(ins.mascotaId) === String(selectedPetId))
          const isUserRegistered = currentUserId && evento.inscritos?.some(ins => String(ins.userId) === String(currentUserId))
          const isRegistered = isRegisteredWithPet || isUserRegistered
          
          return (
            <Card
              key={evento.id}
              className="gap-0 overflow-hidden rounded-2xl border-[3px] border-[#000000] bg-[#93ABD9] p-0 shadow-[6px_6px_0px_0px_#000000]"
            >
              {/* Imagen a todo el ancho (mismo criterio que portadas / tarjetas neo) */}
              <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden border-b-[3px] border-[#000000] bg-[#93ABD9]">
                <Image
                  src={evento.image || "/placeholder.svg"}
                  alt={evento.titulo}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover object-center"
                />
                <div className="absolute right-3 top-3 z-10 sm:right-4 sm:top-4">
                  <Badge className="border-[2px] border-[#000000] bg-primary text-primary-foreground font-black shadow-[2px_2px_0px_0px_#000000]">
                    {evento.tipo}
                  </Badge>
                </div>
              </div>
              <CardContent className="border-t-0 bg-white p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold">{evento.titulo}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                      <div className="flex items-center gap-1"><Calendar className="h-4 w-4 text-primary" /> {formatDate(evento.fecha)} - {evento.hora}</div>
                      <div className="flex items-center gap-1"><MapPin className="h-4 w-4 text-primary" /> {evento.lugar}</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{evento.descripcion}</p>
                  
                  <div className="flex flex-col gap-4 border-t-2 border-foreground/5 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-1 -space-x-3 items-center justify-center sm:justify-start">
                      {(evento.inscritos || []).slice(0, 4).map((inscrito, idx) => (
                        <div 
                          key={inscrito.id} 
                          className="h-9 w-9 rounded-full border-2 border-foreground bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] relative overflow-hidden group hover:-translate-y-1 transition-transform cursor-pointer"
                          style={{ zIndex: 10 - idx }}
                          title={inscrito.nombre}
                        >
                           <Image 
                             src={inscrito.userImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(inscrito.nombre)}&background=random&color=fff&bold=true`} 
                             fill 
                             className="object-cover" 
                             alt={inscrito.nombre} 
                           />
                        </div>
                      ))}
                      {(evento.inscritos?.length || 0) > 4 && (
                        <div 
                          className="h-9 w-9 rounded-full border-2 border-foreground bg-[#FFDE59] text-foreground flex items-center justify-center text-[10px] font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] relative"
                          style={{ zIndex: 0 }}
                        >
                          +{ (evento.inscritos?.length || 0) - 4 }
                        </div>
                      )}
                      {(evento.inscritos?.length || 0) === 0 && (
                        <span className="text-[10px] font-bold text-muted-foreground ml-2 italic">Sé el primero en inscribirte</span>
                      )}
                    </div>
                    {isRegistered ? (
                      <Button
                        disabled
                        size="sm"
                        className="w-full rounded-xl border-[2px] border-[#000000] bg-[#E7BEF8] font-black text-[#000000] shadow-[2px_2px_0px_0px_#000000] sm:w-auto"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Ya estás inscrito
                      </Button>
                    ) : (
                      <Button
                        disabled={!selectedPetId || enrollingId === evento.id}
                        onClick={async () => {
                          if (!selectedPetId || enrollingId === evento.id) return
                          setEnrollingId(evento.id)
                          try {
                            await Promise.resolve(onInscribirse(evento.id, selectedPetId))
                          } finally {
                            setEnrollingId(null)
                          }
                        }}
                        size="sm"
                        className="w-full rounded-xl border-[2px] border-[#000000] bg-primary font-black text-primary-foreground shadow-[2px_2px_0px_0px_#000000] sm:w-auto disabled:opacity-60"
                      >
                        {enrollingId === evento.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Inscribiendo…
                          </>
                        ) : (
                          "Inscribirse"
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
