"use client"

import React from "react"
import { Pill, Plus, User, Eye, FileText, Calendar, Activity, CheckCircle2, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

import { Mascota, Tratamiento } from "@/lib/admin-service"
import { formatDate } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface TratamientosSectionProps {
  tratamientos: Tratamiento[]
  mascotas: Mascota[]
  selectedPetId: string | null
  selectedPatient: string | null
  showForm: boolean
  setShowForm: (show: boolean) => void
  onBack: () => void
  onSubmit: (e: React.FormEvent) => void | Promise<unknown>
  form: { mascota: string; medicamento: string; dosis: string; duracion: string; notas: string }
  setForm: (form: { mascota: string; medicamento: string; dosis: string; duracion: string; notas: string }) => void
}

export const TratamientosSection: React.FC<TratamientosSectionProps> = ({
  tratamientos, mascotas, selectedPetId, selectedPatient, showForm, setShowForm, onBack, onSubmit, form, setForm
}) => {
  const [selectedTratamiento, setSelectedTratamiento] = React.useState<Tratamiento | null>(null)
  const [formSubmitting, setFormSubmitting] = React.useState(false)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formSubmitting) return
    setFormSubmitting(true)
    try {
      await Promise.resolve(onSubmit(e))
    } finally {
      setFormSubmitting(false)
    }
  }
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-black font-heading">Tratamientos Médicos</h2>
          {selectedPetId && (
            <p className="font-bold text-lg mt-2 italic text-foreground/70">Viendo tratamientos de <span className="font-black bg-[#ffc6ff] px-2 py-1 border-[2px] border-foreground rounded-lg ml-1 shadow-[2px_2px_0px_0px_#000000]">{selectedPatient}</span></p>
          )}
        </div>
        <div className="flex items-center gap-3">
           <Button size="sm" variant="outline" onClick={onBack} className="h-12 px-6 font-bold border-[3px] border-foreground bg-white text-foreground hover:bg-[#ffadad] rounded-xl shadow-[3px_3px_0px_0px_#000000] transition-all active:translate-y-0.5 active:shadow-none">← Volver</Button>
           <Button onClick={() => setShowForm(!showForm)} className="gap-2 bg-[#ffc6ff] text-foreground hover:bg-[#eeb1ee] border-[3px] border-foreground shadow-[3px_3px_0px_0px_#000000] font-bold rounded-xl h-12 px-6 transition-all active:translate-y-0.5 active:shadow-none">
             <Plus className="h-5 w-5" /> {showForm ? "Cerrar" : "Nuevo Tratamiento"}
           </Button>
        </div>
      </div>

      {showForm && (
        <Card className="bg-[#fdfaf5] border-[3px] border-foreground shadow-[6px_6px_0px_0px_#000000] rounded-3xl mb-8 border-t-8 border-t-[#ffc6ff]">
          <CardHeader className="gap-0 px-6 pt-6">
            <CardTitle className="font-black text-2xl flex items-center gap-2">
              <Pill className="h-6 w-6 text-[#d073d0]" /> Registrar Tratamiento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <form onSubmit={handleFormSubmit} className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold">Mascota</Label>
                <select
                  className="w-full min-h-11 p-3 rounded-xl border-[2px] border-foreground bg-white text-base md:text-sm font-medium focus:ring-[3px] focus:ring-[#ffc6ff] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  value={form.mascota}
                  onChange={(e) => setForm({ ...form, mascota: e.target.value })}
                  disabled={!!selectedPetId}
                >
                  <option value="">Seleccionar mascota...</option>
                  {(() => {
                    const grouped = mascotas.reduce((acc, m) => {
                      const owner = m.user?.name || m.dueno || 'Sin Dueño';
                      if (!acc[owner]) acc[owner] = [];
                      acc[owner].push(m);
                      return acc;
                    }, {} as Record<string, Mascota[]>);
                    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([dueno, pets]) => (
                      <optgroup key={dueno} label={`Mascotas de ${dueno}`}>
                        {pets.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                      </optgroup>
                    ));
                  })()}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Medicamento</Label>
                <Input
                  placeholder="Nombre del medicamento"
                  className="border-[2px] border-foreground bg-white p-3 rounded-xl font-medium focus-visible:ring-0 focus:border-[#ffc6ff]"
                  value={form.medicamento}
                  onChange={(e) => setForm({ ...form, medicamento: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Dosis</Label>
                <Input
                  placeholder="Ej: 1 tableta cada 12h"
                  className="border-[2px] border-foreground bg-white p-3 rounded-xl font-medium focus-visible:ring-0 focus:border-[#ffc6ff]"
                  value={form.dosis}
                  onChange={(e) => setForm({ ...form, dosis: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Duración</Label>
                <Input
                  placeholder="Ej: 7 dias"
                  className="border-[2px] border-foreground bg-white p-3 rounded-xl font-medium focus-visible:ring-0 focus:border-[#ffc6ff]"
                  value={form.duracion}
                  onChange={(e) => setForm({ ...form, duracion: e.target.value })}
                />
              </div>
               <div className="md:col-span-2 space-y-2">
                <Label className="font-bold">Notas adicionales</Label>
                <textarea
                  className="w-full p-3 rounded-xl border-[2px] border-foreground bg-white min-h-[100px] text-base md:text-sm font-medium focus:outline-none focus:border-[#ffc6ff]"
                  placeholder="Observaciones clínicas, instrucciones de uso, etc."
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 flex gap-3 pt-6 pb-2">
                <Button
                  type="submit"
                  disabled={formSubmitting}
                  className="rounded-xl border-[2px] border-foreground bg-primary font-bold text-primary-foreground hover:bg-primary/85 disabled:opacity-60"
                >
                  {formSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando…
                    </>
                  ) : (
                    "Guardar Tratamiento"
                  )}
                </Button>
                <Button type="button" variant="outline" disabled={formSubmitting} onClick={() => setShowForm(false)} className="bg-white font-bold border-[2px] border-foreground rounded-xl">Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tratamientos.length === 0 ? (
          <div className="md:col-span-2 text-center py-20 bg-white/50 border-[3px] border-dashed border-foreground/20 rounded-3xl">
            <p className="font-bold text-foreground/50 text-xl">No hay tratamientos registrados</p>
          </div>
        ) : (
          tratamientos.map((t) => (
            <Card key={t.id} className="bg-[#fdfaf5] border-[3px] border-foreground shadow-[6px_6px_0px_0px_#000000] rounded-3xl p-0 hover:-translate-y-1 transition-transform">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4 pb-4 border-b-[2px] border-foreground/10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#ffc6ff] border-[2px] border-foreground shadow-[2px_2px_0px_0px_#000000] flex items-center justify-center transform rotate-3">
                      <Pill className="h-6 w-6 text-foreground" />
                    </div>
                    <div>
                      <h3 className="font-black text-xl">{t.mascota}</h3>
                      <p className="font-bold text-foreground/70">{t.medicamento}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0 border-[2px] border-transparent hover:border-foreground hover:bg-[#ffc6ff] transition-all"
                      onClick={() => setSelectedTratamiento(t)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Badge className={`border-[2px] border-foreground font-bold shadow-[2px_2px_0px_0px_#000000] ${t.estado === "activo" ? "bg-[#93ABD9] text-[#000000]" : "bg-white text-foreground"}`}>
                      {t.estado.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center p-3 bg-white rounded-xl border-[2px] border-foreground/20">
                    <span className="font-bold text-foreground/70">Dosis</span>
                    <span className="font-black">{t.dosis}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-xl border-[2px] border-foreground/20">
                    <span className="font-bold text-foreground/70">Duración</span>
                    <span className="font-black">{t.duracion}</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t-2 border-foreground/5 flex items-center gap-2 text-[10px] font-black uppercase text-foreground/30">
                  <User className="h-3 w-3" /> Dr. {t.vet?.name || t.veterinario || "Veterinario"}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

    {/* Modal de Detalle */}
    <Dialog open={!!selectedTratamiento} onOpenChange={(open) => !open && setSelectedTratamiento(null)}>
      <DialogContent className="flex flex-col gap-0 overflow-hidden rounded-[32px] border-[4px] border-foreground bg-[#fdfaf5] p-0 sm:p-0 shadow-[8px_8px_0px_0px_#000000] max-w-[95vw] w-[95vw] sm:max-w-lg sm:w-full max-h-[90dvh] focus:outline-none">
        <DialogHeader className="shrink-0 border-b-4 border-foreground bg-[#ffc6ff] p-6 sm:p-8 space-y-0 text-left">
          <DialogTitle className="text-2xl sm:text-3xl font-black flex items-center gap-3">
            <Pill className="h-8 w-8" /> Detalle del Tratamiento
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 sm:p-10 space-y-8 overflow-y-auto min-h-0">
          <div className="flex items-center gap-4">
             <div className="h-16 w-16 bg-white border-[3px] border-foreground shadow-[4px_4px_0px_0px_#000000] rounded-2xl flex items-center justify-center flex-shrink-0">
                <Activity className="h-8 w-8 text-[#ffc6ff]" />
             </div>
             <div>
                <p className="text-[10px] font-black uppercase text-foreground/40">Mascota en Tratamiento</p>
                <p className="text-2xl font-black">{selectedTratamiento?.mascota}</p>
             </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-white border-[3px] border-foreground rounded-2xl shadow-[4px_4px_0px_0px_#ffc6ff]">
              <p className="text-[10px] font-black uppercase text-foreground/40 mb-1 flex items-center gap-1"><Pill className="h-3 w-3" /> Medicamento</p>
              <p className="font-black text-xl text-primary">{selectedTratamiento?.medicamento}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white border-[3px] border-foreground rounded-2xl shadow-[4px_4px_0px_0px_#00000010]">
                <p className="text-[10px] font-black uppercase text-foreground/40 mb-1">Dosis Prescrita</p>
                <p className="font-bold">{selectedTratamiento?.dosis}</p>
              </div>
              <div className="p-4 bg-white border-[3px] border-foreground rounded-2xl shadow-[4px_4px_0px_0px_#00000010]">
                <p className="text-[10px] font-black uppercase text-foreground/40 mb-1">Duración</p>
                <p className="font-bold">{selectedTratamiento?.duracion}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-foreground/5 rounded-2xl border-2 border-dashed border-foreground/20">
               <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-foreground/40">Estado Actual</p>
                  <p className="font-black text-lg uppercase">{selectedTratamiento?.estado}</p>
               </div>
               <div className="bg-[#93ABD9] border-2 border-foreground p-2 rounded-xl shadow-[3px_3px_0px_0px_#000000]">
                  <CheckCircle2 className="h-6 w-6" />
               </div>
            </div>

            {selectedTratamiento?.notas && (
              <div className="p-6 bg-white border-[3px] border-foreground rounded-2xl shadow-[4px_4px_0px_0px_#fdffb6]">
                <p className="text-[10px] font-black uppercase text-foreground/40 mb-2 flex items-center gap-1"><FileText className="h-3 w-3" /> Instrucciones Adicionales</p>
                <div className="font-medium text-foreground/80 bg-[#fdfaf5] p-3 rounded-xl border-2 border-dashed border-foreground/10">
                  {selectedTratamiento.notas}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-[11px] font-black uppercase text-foreground/40 px-2 justify-between">
              <span className="flex items-center gap-1"><User className="h-3 w-3" /> Dr. {selectedTratamiento?.vet?.name || selectedTratamiento?.veterinario || "Veterinario"}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Registrado: {selectedTratamiento?.createdAt ? formatDate(selectedTratamiento.createdAt) : formatDate(selectedTratamiento?.fecha || "")}</span>
            </div>
          </div>

          <Button 
            onClick={() => setSelectedTratamiento(null)}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/85 border-[3px] border-foreground shadow-[4px_4px_0px_0px_#000000] font-black py-6 rounded-2xl active:translate-y-1 active:shadow-none transition-all"
          >
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </div>
  )
}
