"use client"

import React, { useMemo, useState, useEffect } from "react"
import { History as HistoryIcon, ClipboardList, Pill, Shield, Syringe, Calendar, User, PawPrint } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { Mascota, HistoryItem, AdminService, AnamnesicoData } from "@/lib/admin-service"
import { cn, formatDate } from "@/lib/utils"

interface HistorialTimelineProps {
  selectedPetId: string | null
  mascotas: Mascota[]
  historial: HistoryItem[]
  onBack: () => void
}

type TimelineEvent = HistoryItem & { icon: React.ElementType, color: string };

export const HistorialTimeline: React.FC<HistorialTimelineProps> = ({
  selectedPetId, mascotas, historial, onBack
}) => {
  const [anamnesico, setAnamnesico] = useState<AnamnesicoData | null>(null)

  useEffect(() => {
    if (selectedPetId) {
      AdminService.getAnamnesico(selectedPetId).then(data => {
        if (data) setAnamnesico(data)
      })
    }
  }, [selectedPetId])

  const patientData = useMemo(() => {
    if (!selectedPetId) return null;
    return mascotas.find(m => m.id === selectedPetId);
  }, [selectedPetId, mascotas]);

  const sortedTimeline: TimelineEvent[] = useMemo(() => {
    const filtered = selectedPetId 
      ? historial.filter(item => item.petId === selectedPetId)
      : historial;

    return filtered.map(item => {
      let icon = HistoryIcon;
      let color = 'bg-gray-200';
      const type = item.tipo?.toLowerCase();

      if (type.includes('diagn')) { icon = ClipboardList; color = 'bg-[#bdb2ff]'; }
      else if (type.includes('tratamient')) { icon = Pill; color = 'bg-[#ffc6ff]'; }
      else if (type.includes('preven')) { icon = Shield; color = 'bg-[#9bf6ff]'; }
      else if (type.includes('vacun')) { icon = Syringe; color = 'bg-[#fdffb6]'; }
      else if (type.includes('cita')) { icon = Calendar; color = 'bg-[#a8d5ba]'; }

      return { ...item, icon, color };
    });
  }, [selectedPetId, historial]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-xl font-black leading-tight sm:text-2xl md:text-3xl">Historial Clínico Unificado</h2>
          {patientData && (
            <p className="mt-1 text-sm font-bold leading-snug text-foreground/70 sm:text-base md:text-lg">Cronología completa de salud para <span className="break-words">{patientData.nombre}</span></p>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={onBack} className="h-10 w-full shrink-0 border-[2px] border-foreground bg-white px-4 font-bold text-foreground hover:bg-[#ffadad] sm:w-auto">← Volver</Button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Patient Summary Card -> Now Anamnesicos Summary */}
        {patientData && (
          <div className="lg:col-span-1">
            <Card className="bg-[#f0f9ff] border-[3px] border-foreground shadow-[6px_6px_0px_0px_#000000] rounded-3xl p-0 sticky top-24">
              <CardHeader className="gap-0 text-center pt-8 pb-4 border-b-4 border-foreground/10 bg-[#e0f2fe] rounded-t-3xl">
                <div className="w-16 h-16 rounded-2xl bg-white border-[3px] border-foreground shadow-[3px_3px_0px_0px_#000000] flex items-center justify-center mx-auto mb-4 transform -rotate-3">
                   <ClipboardList className="h-8 w-8 text-[#000000]" />
                </div>
                <CardTitle className="font-black text-2xl mb-1">Anamnésicos</CardTitle>
                <Badge className="bg-[#93ABD9] text-[#000000] border-2 border-foreground font-black mx-auto uppercase text-[9px]">Resumen Médico</Badge>
              </CardHeader>
              <CardContent className="space-y-4 font-bold pt-6 pb-8">
                {anamnesico ? (
                  <>
                    {anamnesico.enfermedadesAnteriores && (
                      <div className="bg-white p-3 rounded-2xl border-[2px] border-foreground/10 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]">
                         <span className="block text-[10px] text-foreground/50 uppercase font-black mb-1">Enfermedades Previas</span>
                         <span className="text-sm leading-tight block">{anamnesico.enfermedadesAnteriores}</span>
                      </div>
                    )}
                    {anamnesico.vacunas && (
                      <div className="bg-white p-3 rounded-2xl border-[2px] border-foreground/10 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]">
                         <span className="block text-[10px] text-foreground/50 uppercase font-black mb-1">Vacunas</span>
                         <span className="text-sm leading-tight block">{anamnesico.vacunas}</span>
                      </div>
                    )}
                    {anamnesico.ultimaDesparasitacion && (
                      <div className="bg-white p-3 rounded-2xl border-[2px] border-foreground/10 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]">
                         <span className="block text-[10px] text-foreground/50 uppercase font-black mb-1">Últ. Desparasitación</span>
                         <span className="text-sm leading-tight block">{anamnesico.ultimaDesparasitacion}</span>
                      </div>
                    )}
                    {anamnesico.historiaReproductiva && (
                      <div className="bg-white p-3 rounded-2xl border-[2px] border-foreground/10 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]">
                         <span className="block text-[10px] text-foreground/50 uppercase font-black mb-1">Reproductiva</span>
                         <span className="text-sm leading-tight block">{anamnesico.historiaReproductiva}</span>
                      </div>
                    )}
                    {(!anamnesico.enfermedadesAnteriores && !anamnesico.vacunas && !anamnesico.ultimaDesparasitacion && !anamnesico.historiaReproductiva) && (
                      <p className="text-center text-sm font-bold text-foreground/50 italic py-4">No hay datos importantes registrados.</p>
                    )}
                  </>
                ) : (
                  <p className="text-center text-sm font-bold text-foreground/50 italic py-4">No hay datos registrados.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Timeline */}
        <div
          className={cn(
            patientData ? "lg:col-span-2" : "lg:col-span-3",
            "relative space-y-10 md:space-y-12 px-3 pb-10",
            sortedTimeline.length > 0 &&
              "before:absolute before:left-5 before:inset-y-0 before:w-0.5 before:border-l-2 before:border-dashed before:border-foreground/20 md:before:pointer-events-none md:before:absolute md:before:inset-y-0 md:before:left-1/2 md:before:z-0 md:before:ml-[-2px] md:before:h-full md:before:w-1 md:before:-translate-x-px md:before:border-l-2 md:before:border-dashed md:before:border-foreground/20 md:before:bg-foreground/10",
          )}
        >
          {sortedTimeline.length === 0 ? (
            <div className="text-center py-20 bg-white/50 border-[3px] border-dashed border-foreground/20 rounded-3xl">
              <p className="font-bold text-foreground/50 text-xl">No hay historial disponible</p>
            </div>
          ) : (
            sortedTimeline.map((event, index) => (
              <div
                key={index}
                className="group relative pb-2 pl-14 md:flex md:items-center md:justify-normal md:pb-0 md:pl-0 md:odd:flex-row-reverse"
              >
                <div className="absolute left-0 top-2 z-20 flex h-11 w-11 items-center justify-center rounded-2xl border-[3px] border-foreground bg-white text-foreground shadow-[3px_3px_0px_0px_#000000] transition-transform group-hover:scale-110 md:left-1/2 md:top-1/2 md:h-12 md:w-12 md:-translate-x-1/2 md:-translate-y-1/2">
                  <event.icon className="h-5 w-5 md:h-6 md:w-6" />
                </div>

                <Card className="w-full min-w-0 overflow-hidden rounded-3xl border-[3px] border-foreground bg-[#fdfaf5] p-0 shadow-[6px_6px_0px_0px_#000000] transition-all hover:translate-y-[-4px] md:w-[calc(50%-2.5rem)]">
                  <CardHeader
                    className={cn(
                      event.color,
                      "gap-0 border-b-2 border-foreground px-3 py-2.5 md:px-5 md:py-3",
                    )}
                  >
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <time className="shrink-0 font-black text-xs text-[#000000]/80 sm:text-sm">
                        {formatDate(event.fecha || event.createdAt || "")}
                      </time>
                      <Badge className="max-w-full break-words border-2 border-foreground bg-white/80 font-black text-[9px] uppercase text-foreground shadow-[2px_2px_0px_0px_#000000] sm:text-[10px]">
                        {event.tipo}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 md:p-5">
                    <div className="space-y-3">
                       {(event.tipo?.toLowerCase().includes('diagn')) && (
                         <div className="bg-white/40 p-3 rounded-xl border-b-4 border-foreground/5 mb-2">
                           <p className="text-[10px] font-black uppercase text-foreground/30 mb-1">Diagnóstico Clínico</p>
                           <h4 className="break-words font-black text-lg leading-tight text-[#000000] sm:text-xl">{event.diagnostico}</h4>
                           
                           {/* Nuevos Campos */}
                           {(event as any).motivoConsulta && (
                             <div className="mt-2 text-sm font-medium text-[#000000]/80">
                               <span className="font-bold">Motivo:</span> {(event as any).motivoConsulta}
                             </div>
                           )}

                           {((event as any).temperatura || (event as any).fCardiaca || (event as any).fRespiratoria) && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {(event as any).temperatura && <span className="text-[10px] bg-white border border-foreground/10 px-2 py-0.5 rounded-md font-bold">T: {(event as any).temperatura}°C</span>}
                                {(event as any).fCardiaca && <span className="text-[10px] bg-white border border-foreground/10 px-2 py-0.5 rounded-md font-bold">FC: {(event as any).fCardiaca}</span>}
                                {(event as any).fRespiratoria && <span className="text-[10px] bg-white border border-foreground/10 px-2 py-0.5 rounded-md font-bold">FR: {(event as any).fRespiratoria}</span>}
                              </div>
                           )}

                           {event.notas && (
                             <div className="mt-2 pl-3 border-l-4 border-[#bdb2ff]/40">
                               <p className="text-sm font-bold text-foreground/60 italic">&quot;{event.notas}&quot;</p>
                             </div>
                           )}
                         </div>
                       )}
                       {(event.tipo?.toLowerCase().includes('tratamient')) && (
                         <div className="bg-white/40 p-3 rounded-xl border-b-4 border-foreground/5 mb-2">
                           <p className="text-[10px] font-black uppercase text-foreground/30 mb-1">Medicamento Asignado</p>
                           <h4 className="break-words font-black text-lg leading-tight text-[#000000] sm:text-xl">{event.medicamento}</h4>
                           <p className="mt-1 flex flex-col items-start gap-2 text-sm font-bold text-foreground/70 md:flex-row md:flex-wrap md:items-center">
                             <span className="max-w-full shrink-0 rounded-lg bg-[#ffc6ff] px-2 py-0.5 text-xs text-foreground break-words">{event.dosis}</span> 
                             <span className="shrink-0 text-foreground/40">durante</span> 
                             <span className="min-w-0 text-foreground break-words">{event.duracion}</span>
                           </p>
                         </div>
                       )}
                       {(event.tipo?.toLowerCase().includes('preven')) && (
                         <div className="bg-white/40 p-3 rounded-xl border-b-4 border-foreground/5 mb-2">
                           <p className="text-[10px] font-black uppercase text-foreground/30 mb-1">Control Preventivo</p>
                           <h4 className="break-words font-black text-lg leading-tight text-[#000000] sm:text-xl">{event.tipo}</h4>
                           <div className="mt-2 flex flex-col items-start gap-2 rounded-lg border border-[#9bf6ff]/40 bg-[#9bf6ff]/20 p-2 md:flex-row md:items-center">
                             <Calendar className="h-3 w-3 shrink-0 text-foreground/40 md:mt-0.5" />
                             <p className="min-w-0 text-sm font-bold leading-snug text-foreground/70">Siguiente refuerzo: <span className="font-black text-foreground break-words">{formatDate(event.proximaFecha)}</span></p>
                           </div>
                         </div>
                       )}
                       {(event.tipo?.toLowerCase().includes('vacun')) && (
                         <div className="bg-white/40 p-3 rounded-xl border-b-4 border-foreground/5 mb-2">
                            <p className="text-[10px] font-black uppercase text-foreground/30 mb-1">Registro de Vacunación</p>
                            <h4 className="break-words font-black text-lg leading-tight text-[#000000] sm:text-xl">{event.tipo}</h4>
                           <div className="mt-2 space-y-1">
                             <p className="text-xs font-bold text-foreground/60">Dosis aplicada: <span className="text-foreground">{event.dosis}</span></p>
                             <div className="flex flex-col items-start gap-2 rounded-lg border border-[#fdffb6] bg-[#fdffb6]/40 p-2 md:flex-row md:items-center">
                               <Shield className="h-3 w-3 shrink-0 text-foreground/40 md:mt-0.5" />
                               <p className="min-w-0 text-sm font-bold leading-snug text-foreground/70">Próxima dosis: <span className="font-black text-foreground break-words">{formatDate(event.proximaFecha)}</span></p>
                             </div>
                           </div>
                         </div>
                       )}
                       {(event.tipo?.toLowerCase().includes('cita')) && (
                         <div className="bg-white/40 p-3 rounded-xl border-b-4 border-foreground/5 mb-2">
                           <p className="text-[10px] font-black uppercase text-foreground/30 mb-1">Atención Médica Finalizada</p>
                           <h4 className="break-words font-black text-lg leading-tight text-[#000000] sm:text-xl">{event.descripcion || "Consulta General"}</h4>
                           {event.motivo && (
                             <div className="mt-2 pl-3 border-l-4 border-[#a8d5ba]/40">
                               <p className="text-sm font-bold text-foreground/60 italic">Motivo: {event.motivo}</p>
                             </div>
                           )}
                         </div>
                       )}
                    </div>
                     <div className="mt-4 flex min-w-0 flex-col items-start gap-2 border-t-2 border-foreground/5 pt-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex min-w-0 items-center gap-2 text-[10px] font-black uppercase text-foreground/30">
                          <User className="h-3 w-3 shrink-0" />
                          <span className="min-w-0 break-words">Dr. {event.vet?.name || event.veterinario || "Veterinario"}</span>
                        </div>
                     </div>
                  </CardContent>
                </Card>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
