"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  MascotaUsuario, Vacuna, Diagnostico, Tratamiento, Preventivo, ExamData 
} from "../types"
import {
  Syringe,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  History,
  Stethoscope,
  Pill,
  ShieldCheck,
  User,
  Hash,
  FileText,
  Eye,
  Download,
  Image as ImageIcon
} from "lucide-react"
import { cn, formatDate, formatDateTime } from "@/lib/utils"

interface HealthTabProps {
  mascotaActiva: MascotaUsuario | null
  vacunaciones: Vacuna[]
  diagnosticos: Diagnostico[]
  tratamientos: Tratamiento[]
  preventivos: Preventivo[]
  exams: ExamData[]
  view: "vacunacion" | "historial"
}

type HealthRecord = Vacuna | Diagnostico | Tratamiento | Preventivo

function sortByCreatedDesc<T extends { createdAt?: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
  )
}

function vetLabel(
  item: { veterinario?: string | null; vet?: { name?: string | null } },
): string {
  return (item.veterinario || item.vet?.name || "").trim() || "Veterinario"
}

function shortRecordRef(id: string | number): string {
  const s = String(id)
  if (s.length <= 8) return s
  return s.slice(-8).toUpperCase()
}

function treatmentDisplayDate(t: Tratamiento): string {
  if (t.fecha?.trim()) return formatDate(t.fecha)
  if (t.createdAt) return formatDate(t.createdAt)
  return "—"
}

export const HealthTab = ({
  mascotaActiva,
  vacunaciones,
  diagnosticos,
  tratamientos,
  preventivos,
  exams,
  view
}: HealthTabProps) => {
  if (!mascotaActiva) return null

  // Filtros por mascota activa (Robusto: id y nombre case-insensitive)
  const activeId = mascotaActiva?.id ? String(mascotaActiva.id) : ""
  const activeName = (mascotaActiva?.nombre || "").toLowerCase().trim()

  const matchPet = (item: HealthRecord) => {
    if (!item) return false
    // Both types from admin-service.ts have petId?: string and mascota: string
    const itemPetId = item.petId ? String(item.petId) : null
    const itemMascota = item.mascota ? item.mascota.toLowerCase().trim() : null
    return (activeId && itemPetId === activeId) || (activeName && itemMascota === activeName)
  }

  const listVacunas = vacunaciones.filter(matchPet)
  const listDiagnosticos = sortByCreatedDesc(diagnosticos.filter(matchPet))
  const listTratamientos = sortByCreatedDesc(tratamientos.filter(matchPet))
  const listPreventivos = sortByCreatedDesc(preventivos.filter(matchPet))

  const listExams = (exams || []).filter(exam => {
    if (!exam) return false
    const examPetId = exam.petId ? String(exam.petId) : null
    const examMascota = exam.mascota ? exam.mascota.toLowerCase().trim() : null
    return (activeId && examPetId === activeId) || (activeName && examMascota === activeName)
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">
            {view === "vacunacion" ? "Carnet de Vacunación" : "Historial Médico"}
          </h2>
          <p className="text-muted-foreground">
            {view === "vacunacion" 
              ? `Control de inmunización para ${mascotaActiva.nombre}` 
              : `Registro clínico detallado de ${mascotaActiva.nombre}`}
          </p>
        </div>
        {view === "vacunacion" ? (
          <Syringe className="h-10 w-10 text-primary/40" />
        ) : (
          <History className="h-10 w-10 text-primary/40" />
        )}
      </div>

      {view === "vacunacion" && (
        <div className="grid gap-4">
          {listVacunas.length === 0 ? (
            <Card className="p-10 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No hay vacunas registradas aun</p>
            </Card>
          ) : (
            listVacunas.map((vac) => (
              <Card key={vac.id} className="p-0 overflow-hidden shadow-sm">
                <CardContent className="p-0 flex flex-col md:flex-row md:items-stretch min-w-0">
                  <div className="h-2 w-full shrink-0 bg-primary md:h-auto md:w-2" />
                  <div className="flex flex-1 flex-col gap-4 p-4 min-w-0 md:flex-row md:items-center md:justify-between md:p-6">
                    <div className="flex min-w-0 flex-1 flex-col items-center gap-3 md:flex-row md:items-center">
                      <div className="h-12 w-12 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                      <div className="w-full min-w-0 text-center md:text-left">
                        <h4 className="font-bold text-lg break-all md:break-words">{vac.vacunaId || "Vacunación"}</h4>
                        <div className="mt-2 flex flex-col items-center gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:justify-center md:justify-start">
                          <span className="flex items-center justify-center gap-1 sm:justify-start"><Calendar className="h-3.5 w-3.5 shrink-0" /> {formatDate(vac.fecha)}</span>
                          <span className="flex items-center justify-center gap-1 text-center sm:text-left md:justify-start"><Clock className="h-3.5 w-3.5 shrink-0" /> <span className="min-w-0 break-words">Proxima: {formatDate(vac.proximaFecha)}</span></span>
                        </div>
                      </div>
                    </div>
                    <Badge className="w-full shrink-0 justify-center bg-green-100 text-green-700 hover:bg-green-100 border-0 gap-1 px-3 py-1.5 md:w-auto">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Aplicada
                    </Badge>
                  </div>
                  {vac.notas && (
                    <div className="mx-4 mb-4 p-3 rounded-xl bg-[#000000]/2 border border-[#000000]/10">
                      <span className="text-[10px] font-black uppercase tracking-wide text-[#000000]/40 block mb-1">Observaciones</span>
                      <p className="text-sm text-[#000000]/70 whitespace-pre-wrap">{vac.notas}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {view === "historial" && (
        <div className="space-y-10">
          {/* Diagnosticos */}
          <div className="space-y-4">
            <div className="flex flex-col gap-1 border-b-2 border-[#000000]/10 pb-3 sm:flex-row sm:items-end sm:justify-between">
              <h3 className="flex items-center gap-2 text-xl font-black text-[#000000]">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border-[3px] border-[#000000] bg-[#93ABD9] shadow-[3px_3px_0px_0px_#000000]">
                  <Stethoscope className="h-5 w-5 text-[#000000]" strokeWidth={2.5} />
                </span>
                Revisión y Diagnóstico
              </h3>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {listDiagnosticos.length} registro{listDiagnosticos.length === 1 ? "" : "s"}
              </p>
            </div>
            {listDiagnosticos.length === 0 ? (
              <Card className="rounded-2xl border-[3px] border-dashed border-[#000000]/25 bg-[#fdfaf5] p-8 text-center">
                <AlertCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm font-bold text-muted-foreground">Sin diagnósticos registrados para esta mascota.</p>
              </Card>
            ) : (
              <div className="grid gap-5">
                {listDiagnosticos.map((diag) => {
                  const vetName = vetLabel(diag)
                  const registroAt = diag.createdAt ? formatDateTime(diag.createdAt) : null
                  const matchingExams = listExams.filter(exam => 
                    exam.diagnosisId === diag.id
                  )
                  return (
                    <Card
                      key={diag.id}
                      className="p-0 overflow-hidden rounded-2xl border-[3px] border-[#000000] bg-[#fdfaf5] shadow-[6px_6px_0px_0px_#000000] transition-transform hover:-translate-y-0.5"
                    >
                      <div className="flex flex-col gap-3 border-b-[3px] border-[#000000] bg-[#93ABD9] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                        <Badge className="w-fit border-2 border-[#000000] bg-white font-black uppercase tracking-wide text-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                          Diagnóstico clínico
                        </Badge>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-black text-[#000000]/90 sm:text-sm">
                          <span className="inline-flex items-center gap-1 rounded-lg border-2 border-[#000000]/30 bg-white/90 px-2 py-1">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            Consulta: {formatDate(diag.fecha)}
                          </span>
                          {registroAt && (
                            <span className="inline-flex items-center gap-1 rounded-lg border-2 border-[#000000]/20 bg-white/60 px-2 py-1 font-bold">
                              <Clock className="h-3.5 w-3.5 shrink-0" />
                              Registro: {registroAt}
                            </span>
                          )}
                        </div>
                      </div>
                      <CardContent className="space-y-4 p-4 sm:p-6">
                        {diag.motivoConsulta && (
                          <div className="rounded-xl border-2 border-[#000000]/15 bg-[#fdffb6]/30 p-4 mb-3">
                            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#000000]/45">Motivo de Consulta</p>
                            <p className="text-sm font-medium leading-relaxed text-[#000000]/80">{diag.motivoConsulta}</p>
                          </div>
                        )}
                        <div className="min-w-0 mb-3">
                          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#000000]/45">
                            Diagnóstico Final
                          </p>
                          <h4 className="break-words text-xl font-black leading-tight tracking-tight text-[#000000] sm:text-2xl">
                            {diag.diagnostico}
                          </h4>
                        </div>
                        
                        {(diag.temperatura || diag.fCardiaca || diag.fRespiratoria || diag.actitud) && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                            {diag.temperatura && <div className="rounded-lg border-2 border-[#000000]/10 bg-white p-2"><p className="text-[9px] font-black uppercase text-[#000000]/40">Temp</p><p className="text-sm font-bold">{diag.temperatura} °C</p></div>}
                            {diag.fCardiaca && <div className="rounded-lg border-2 border-[#000000]/10 bg-white p-2"><p className="text-[9px] font-black uppercase text-[#000000]/40">FC</p><p className="text-sm font-bold">{diag.fCardiaca} lpm</p></div>}
                            {diag.fRespiratoria && <div className="rounded-lg border-2 border-[#000000]/10 bg-white p-2"><p className="text-[9px] font-black uppercase text-[#000000]/40">FR</p><p className="text-sm font-bold">{diag.fRespiratoria} rpm</p></div>}
                            {diag.actitud && <div className="rounded-lg border-2 border-[#000000]/10 bg-white p-2"><p className="text-[9px] font-black uppercase text-[#000000]/40">Actitud</p><p className="text-sm font-bold">{diag.actitud}</p></div>}
                          </div>
                        )}

                        {/* Sistemas y Hallazgos Clinicos */}
                        {(diag.sistemas || diag.hallazgosClinicos) && (
                          <div className="p-4 bg-white border-[2px] border-[#000000]/15 rounded-xl shadow-sm mb-3">
                            <p className="text-[10px] font-black uppercase text-[#000000]/45 mb-3 flex items-center gap-1">Examen Físico Especial</p>
                            
                            {diag.sistemas && Object.keys(diag.sistemas as Record<string, string>).length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {Object.entries(diag.sistemas as Record<string, string>).map(([organo, estado]) => {
                                   if (estado === "NE") return null;
                                   const isAnormal = estado === "AN";
                                   return (
                                     <span key={organo} className={`text-[10px] font-bold px-2 py-1 rounded-md border border-[#000000]/10 ${isAnormal ? 'bg-[#ffadad] text-black' : 'bg-[#a8d5ba] text-black'}`}>
                                       {organo}: {isAnormal ? 'Anormal' : 'Normal'}
                                     </span>
                                   )
                                })}
                              </div>
                            )}

                            {diag.hallazgosClinicos && (
                              <div className="mt-2 text-sm font-medium text-[#000000]/80 whitespace-pre-wrap">
                                {diag.hallazgosClinicos}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Listas y Problemas */}
                        <div className="grid sm:grid-cols-2 gap-4 mb-3">
                           {diag.listaProblemas && (
                              <div className="p-4 bg-[#fdffb6]/30 border-[2px] border-[#fdffb6] rounded-xl">
                                <p className="text-[10px] font-black uppercase text-[#000000]/45 mb-2">Lista de Problemas</p>
                                <p className="font-medium text-sm whitespace-pre-wrap">{diag.listaProblemas}</p>
                              </div>
                           )}
                           {diag.diagnosticosDiferenciales && (
                              <div className="p-4 bg-[#ffc6ff]/20 border-[2px] border-[#ffc6ff] rounded-xl">
                                <p className="text-[10px] font-black uppercase text-[#000000]/45 mb-2">Diag. Diferenciales</p>
                                <p className="font-medium text-sm whitespace-pre-wrap">{diag.diagnosticosDiferenciales}</p>
                              </div>
                           )}
                        </div>

                        {diag.examenesComplementarios && (diag.examenesComplementarios as string[]).length > 0 && (
                          <div className="rounded-xl border-2 border-[#000000]/15 bg-white p-4 mb-3">
                            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#000000]/45">
                              Exámenes Solicitados
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {(diag.examenesComplementarios as string[]).map((ex: string) => (
                                <span key={ex} className="bg-gray-100 border border-[#000000]/20 px-2 py-1 rounded-md text-xs font-bold">{ex}</span>
                              ))}
                            </div>
                            {diag.hallazgosPruebas && (
                              <p className="mt-3 text-sm font-medium border-t-2 border-dashed border-[#000000]/10 pt-2">{diag.hallazgosPruebas}</p>
                            )}
                          </div>
                        )}

                        {matchingExams.length > 0 && (
                          <div className="rounded-xl border-2 border-[#000000]/15 bg-white p-4 mb-3 space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#000000]/45 flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5 text-primary" />
                              Resultados de Exámenes Subidos
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {matchingExams.map((exam) => (
                                <div key={exam.id} className="flex flex-col justify-between p-3 rounded-lg border-2 border-[#000000] bg-white shadow-[2px_2px_0px_0px_#000000] hover:bg-gray-50 transition-colors">
                                  <div className="flex items-start gap-2.5 min-w-0">
                                    <div className={cn(
                                      "p-1.5 rounded-md border border-[#000000] shrink-0",
                                      (exam.fileType === "pdf" || exam.fileUrl.toLowerCase().split('?')[0].endsWith(".pdf") || exam.fileName?.toLowerCase().endsWith(".pdf") || exam.fileUrl.includes("/raw/upload/")) ? "bg-red-100" : "bg-blue-100"
                                    )}>
                                      {(exam.fileType === "pdf" || exam.fileUrl.toLowerCase().split('?')[0].endsWith(".pdf") || exam.fileName?.toLowerCase().endsWith(".pdf") || exam.fileUrl.includes("/raw/upload/")) ? (
                                        <FileText className="h-4 w-4 text-red-600" />
                                      ) : (
                                        <ImageIcon className="h-4 w-4 text-blue-600" />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-black truncate text-[#000000]/90" title={exam.titulo}>
                                        {exam.titulo}
                                      </p>
                                      {exam.descripcion && (
                                        <p className="text-[10px] text-[#000000]/60 line-clamp-1">
                                          {exam.descripcion}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="mt-2.5 pt-2 border-t border-dashed border-[#000000]/15 flex items-center gap-2">
                                    {!(exam.fileType === "pdf" || exam.fileUrl.toLowerCase().split('?')[0].endsWith(".pdf") || exam.fileName?.toLowerCase().endsWith(".pdf") || exam.fileUrl.includes("/raw/upload/")) ? (
                                      <>
                                        <a
                                          href={`/api/download?url=${encodeURIComponent(exam.fileUrl)}&filename=${encodeURIComponent(exam.fileName || 'examen')}&inline=true`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex-1 flex items-center justify-center gap-1.5 h-8 bg-[#E7BEF8] hover:bg-[#E7BEF8]/80 border border-[#000000] rounded-md text-[10px] font-black uppercase tracking-wider transition-colors shadow-[1px_1px_0px_0px_#000]"
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                          Ver examen
                                        </a>
                                        <a
                                          href={`/api/download?url=${encodeURIComponent(exam.fileUrl)}&filename=${encodeURIComponent(exam.fileName || 'examen')}`}
                                          className="h-8 w-8 flex items-center justify-center bg-[#a8d5ba] hover:bg-[#a8d5ba]/80 border border-[#000000] rounded-md text-foreground transition-colors shadow-[1px_1px_0px_0px_#000]"
                                          title="Descargar"
                                        >
                                          <Download className="h-3.5 w-3.5" />
                                        </a>
                                      </>
                                    ) : (
                                      <a
                                        href={`/api/download?url=${encodeURIComponent(exam.fileUrl)}&filename=${encodeURIComponent(exam.fileName || 'examen')}`}
                                        className="flex-1 flex items-center justify-center gap-1.5 h-8 bg-[#a8d5ba] hover:bg-[#a8d5ba]/80 border border-[#000000] rounded-md text-[10px] font-black uppercase tracking-wider transition-colors shadow-[1px_1px_0px_0px_#000] text-foreground"
                                      >
                                        <Download className="h-3.5 w-3.5 mr-1" />
                                        Descargar examen (PDF)
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="rounded-xl border-2 border-[#000000]/15 bg-[#bdb2ff]/10 p-4">
                          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#000000]/45">
                            Plan y Observaciones
                          </p>
                          <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-[#000000]/80">
                            {diag.notas?.trim() ? diag.notas : "Sin notas adicionales en el expediente."}
                          </p>
                        </div>
                        <div className="grid gap-3 border-t-2 border-dashed border-[#000000]/15 pt-4">
                          <div className="flex min-w-0 gap-3 rounded-xl border-2 border-[#000000] bg-[#E7BEF8] p-3 shadow-[3px_3px_0px_0px_#000000]">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-[#000000] bg-white">
                              <User className="h-5 w-5 text-[#000000]" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-wide text-[#000000]/55">Veterinario</p>
                              <p className="truncate text-sm font-black text-[#000000]">{vetName}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* Tratamientos */}
          <div className="space-y-4">
            <div className="flex flex-col gap-1 border-b-2 border-[#000000]/10 pb-3 sm:flex-row sm:items-end sm:justify-between">
              <h3 className="flex items-center gap-2 text-xl font-black text-[#000000]">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border-[3px] border-[#000000] bg-[#ffc6ff] shadow-[3px_3px_0px_0px_#000000]">
                  <Pill className="h-5 w-5 text-[#000000]" strokeWidth={2.5} />
                </span>
                Tratamientos
              </h3>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {listTratamientos.length} registro{listTratamientos.length === 1 ? "" : "s"}
              </p>
            </div>
            {listTratamientos.length === 0 ? (
              <Card className="rounded-2xl border-[3px] border-dashed border-[#000000]/25 bg-[#fdfaf5] p-8 text-center">
                <Pill className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm font-bold text-muted-foreground">Sin tratamientos registrados para esta mascota.</p>
              </Card>
            ) : (
              <div className="grid gap-5">
                {listTratamientos.map((treat) => {
                  const estado = String(treat.estado || "activo").toLowerCase()
                  const activo = estado === "activo"
                  const vetName = vetLabel(treat)
                  return (
                    <Card
                      key={treat.id}
                      className="p-0 overflow-hidden rounded-2xl border-[3px] border-[#000000] bg-[#fdfaf5] shadow-[6px_6px_0px_0px_#000000]"
                    >
                      <div className="flex flex-col gap-3 border-b-[3px] border-[#000000] bg-[#ffc6ff] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            className={cn(
                              "border-2 border-[#000000] font-black uppercase shadow-[2px_2px_0px_0px_#000000]",
                              activo ? "bg-[#a8d5ba] text-[#000000]" : "bg-white text-[#000000]/80",
                            )}
                          >
                            {activo ? "Activo" : "Completado"}
                          </Badge>
                          <span className="inline-flex items-center gap-1 text-xs font-black text-[#000000] sm:text-sm">
                            <Calendar className="h-3.5 w-3.5" />
                            {treatmentDisplayDate(treat)}
                          </span>
                        </div>
                        {treat.createdAt && (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-[#000000]/70 sm:text-xs">
                            Registro: {formatDateTime(treat.createdAt)}
                          </span>
                        )}
                      </div>
                      <CardContent className="space-y-4 p-4 sm:p-6">
                        <div className="min-w-0">
                          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#000000]/45">Medicamento</p>
                          <h4 className="break-words text-xl font-black text-[#000000] sm:text-2xl">{treat.medicamento}</h4>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div className="rounded-xl border-2 border-[#000000]/20 bg-white p-3">
                            <p className="text-[10px] font-black uppercase text-[#000000]/45">Dosis</p>
                            <p className="text-sm font-black text-[#000000]">{treat.dosis || "—"}</p>
                          </div>
                          <div className="rounded-xl border-2 border-[#000000]/20 bg-white p-3">
                            <p className="text-[10px] font-black uppercase text-[#000000]/45">Duración</p>
                            <p className="text-sm font-black text-[#000000]">{treat.duracion || "—"}</p>
                          </div>
                          <div className="rounded-xl border-2 border-[#000000]/20 bg-[#E7BEF8]/40 p-3">
                            <p className="text-[10px] font-black uppercase text-[#000000]/45">Veterinario</p>
                            <p className="truncate text-sm font-black text-[#000000]">{vetName}</p>
                          </div>
                        </div>
                        {treat.notas?.trim() && (
                          <div className="rounded-xl border-2 border-[#000000]/15 bg-white p-4">
                            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#000000]/45">
                              Indicaciones y notas
                            </p>
                            <p className="whitespace-pre-wrap text-sm font-medium text-[#000000]/80">{treat.notas}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* Preventivos */}
          <div className="space-y-4">
            <div className="flex flex-col gap-1 border-b-2 border-[#000000]/10 pb-3 sm:flex-row sm:items-end sm:justify-between">
              <h3 className="flex items-center gap-2 text-xl font-black text-[#000000]">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border-[3px] border-[#000000] bg-[#9bf6ff] shadow-[3px_3px_0px_0px_#000000]">
                  <ShieldCheck className="h-5 w-5 text-[#000000]" strokeWidth={2.5} />
                </span>
                Control preventivo
              </h3>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {listPreventivos.length} registro{listPreventivos.length === 1 ? "" : "s"}
              </p>
            </div>
            {listPreventivos.length === 0 ? (
              <Card className="rounded-2xl border-[3px] border-dashed border-[#000000]/25 bg-[#fdfaf5] p-8 text-center">
                <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm font-bold text-muted-foreground">Sin controles preventivos registrados.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {listPreventivos.map((prev) => {
                  const vetName = vetLabel(prev)
                  return (
                    <Card
                      key={prev.id}
                      className="p-0 overflow-hidden rounded-2xl border-[3px] border-[#000000] bg-[#fdfaf5] shadow-[6px_6px_0px_0px_#000000]"
                    >
                      <div className="border-b-[3px] border-[#000000] bg-[#9bf6ff] px-4 py-3 sm:px-5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h4 className="min-w-0 flex-1 break-words text-lg font-black text-[#000000] sm:text-xl">{prev.tipo}</h4>
                          <Badge className="shrink-0 border-2 border-[#000000] bg-white font-black uppercase text-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                            Dosis #{prev.dosis}
                          </Badge>
                        </div>
                        {prev.createdAt && (
                          <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-[#000000]/65">
                            Registrado: {formatDateTime(prev.createdAt)}
                          </p>
                        )}
                      </div>
                      <CardContent className="space-y-4 p-4 sm:p-5">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl border-2 border-[#000000]/20 bg-white p-3">
                            <p className="text-[10px] font-black uppercase text-[#000000]/45">Última aplicación</p>
                            <p className="text-sm font-black text-[#000000]">{formatDate(prev.fecha)}</p>
                          </div>
                          <div className="rounded-xl border-2 border-[#000000] bg-[#EDE986] p-3 shadow-[2px_2px_0px_0px_#000000]">
                            <p className="text-[10px] font-black uppercase text-[#000000]/55">Próxima</p>
                            <p className="text-sm font-black text-[#000000]">{formatDate(prev.proximaFecha)}</p>
                          </div>
                        </div>
                        <div className="flex gap-3 rounded-xl border-2 border-[#000000] bg-[#E7BEF8]/50 p-3">
                          <User className="mt-0.5 h-5 w-5 shrink-0 text-[#000000]" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase text-[#000000]/50">Veterinario</p>
                            <p className="text-sm font-black text-[#000000]">{vetName}</p>
                          </div>
                        </div>
                        {prev.notas?.trim() && (
                          <div className="rounded-xl border-2 border-[#000000]/15 bg-white p-3">
                            <p className="mb-1 text-[10px] font-black uppercase text-[#000000]/45">Observaciones</p>
                            <p className="whitespace-pre-wrap text-sm text-[#000000]/75">{prev.notas}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
