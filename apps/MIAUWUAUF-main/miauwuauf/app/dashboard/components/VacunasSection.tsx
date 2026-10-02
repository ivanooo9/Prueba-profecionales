"use client"

import React from "react"
import { Syringe, Plus, Calendar, User, Eye, Info, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Mascota, Vacuna } from "@/lib/admin-service"
import { formatDate } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface VacunasSectionProps {
  vacunaciones: Vacuna[]
  mascotas: Mascota[]
  selectedPetId: string | null
  selectedPatient: string | null
  showForm: boolean
  setShowForm: (show: boolean) => void
  onBack: () => void
  onSubmit: (e: React.FormEvent) => void | Promise<unknown>
  form: { mascota: string; dosis: string; fecha: string; vacunaId: string; proximaFecha: string; periodicidad: string; notas: string }
  setForm: (form: { mascota: string; dosis: string; fecha: string; vacunaId: string; proximaFecha: string; periodicidad: string; notas: string }) => void
}

export const VacunasSection: React.FC<VacunasSectionProps> = ({
  vacunaciones, mascotas, selectedPetId, selectedPatient, showForm, setShowForm, onBack, onSubmit, form, setForm
}) => {
  const [selectedVacuna, setSelectedVacuna] = React.useState<Vacuna | null>(null)
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
          <h2 className="text-3xl font-black font-heading">Control de Vacunación</h2>
          {selectedPetId && (
            <p className="font-bold text-lg mt-2 italic text-foreground/70">Viendo registros de <span className="font-black bg-[#fdffb6] px-2 py-1 border-[2px] border-foreground rounded-lg ml-1 shadow-[2px_2px_0px_0px_#000000]">{selectedPatient}</span></p>
          )}
        </div>
        <div className="flex items-center gap-3">
           <Button size="sm" variant="outline" onClick={onBack} className="h-12 px-6 font-bold border-[3px] border-foreground bg-white text-foreground hover:bg-[#ffadad] rounded-xl shadow-[3px_3px_0px_0px_#000000] transition-all active:translate-y-0.5 active:shadow-none">← Volver</Button>
           <Button onClick={() => setShowForm(!showForm)} className="gap-2 bg-[#fdffb6] text-foreground hover:bg-[#f3f5a3] border-[3px] border-foreground shadow-[3px_3px_0px_0px_#000000] font-bold rounded-xl h-12 px-6 transition-all active:translate-y-0.5 active:shadow-none">
             <Plus className="h-5 w-5" /> {showForm ? "Cerrar" : "Nueva Vacuna"}
           </Button>
        </div>
      </div>

      {showForm && (
        <Card className="bg-[#fdfaf5] border-[3px] border-foreground shadow-[6px_6px_0px_0px_#000000] rounded-3xl mb-8 border-t-8 border-t-[#fdffb6]">
          <CardHeader className="gap-0 px-6 pt-6">
            <CardTitle className="font-black text-2xl flex items-center gap-2">
              <Syringe className="h-6 w-6 text-[#9b9e1e]" /> Registrar Nueva Dosis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <form onSubmit={handleFormSubmit} className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2 lg:col-span-2">
                <Label className="font-bold">Mascota</Label>
                <select
                  className="w-full min-h-11 p-3 rounded-xl border-[2px] border-foreground bg-white text-base md:text-sm font-medium focus:ring-[3px] focus:ring-[#fdffb6] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
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
                <Label className="font-bold">Vacuna</Label>
                <Input
                  placeholder="Ej: Rabia, Parvovirus, Moquillo..."
                  className="border-[2px] border-foreground bg-white p-3 rounded-xl font-medium"
                  value={form.vacunaId}
                  onChange={(e) => setForm({ ...form, vacunaId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Dosis</Label>
                <Input
                  placeholder="Ej: 1ra Dosis"
                  className="border-[2px] border-foreground bg-white p-3 rounded-xl font-medium"
                  value={form.dosis}
                  onChange={(e) => setForm({ ...form, dosis: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Periodicidad (Meses)</Label>
                <Input
                  type="number"
                  placeholder="Cada cuantos meses?"
                  className="border-[2px] border-foreground bg-white p-3 rounded-xl font-medium"
                  value={form.periodicidad}
                  onChange={(e) => setForm({ ...form, periodicidad: e.target.value })}
                />
              </div>
              <div className="lg:col-span-4 space-y-2">
                <Label className="font-bold">Notas adicionales (opcional)</Label>
                <Textarea
                  placeholder="Observaciones, reacciones, indicaciones especiales..."
                  className="border-[2px] border-foreground bg-white rounded-xl font-medium resize-none"
                  rows={3}
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-4 flex flex-wrap gap-3 pt-4 pb-2">
                <Button
                  type="submit"
                  disabled={formSubmitting}
                  className="min-w-[8rem] flex-1 rounded-xl border-[2px] border-foreground bg-primary font-bold text-primary-foreground hover:bg-primary/85 disabled:opacity-60 sm:flex-none"
                >
                  {formSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando…
                    </>
                  ) : (
                    "Registrar"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={formSubmitting}
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border-[2px] border-foreground bg-white font-bold hover:bg-muted"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="bg-[#fdfaf5] border-[3px] border-foreground shadow-[6px_6px_0px_0px_#000000] rounded-3xl overflow-hidden p-0">
        <CardContent className="p-0">
          <div className="overflow-x-auto [-webkit-overflow-scrolling:touch] overscroll-x-contain">
          <Table className="min-w-[720px] md:min-w-full">
            <TableHeader className="bg-muted/30">
              <TableRow className="border-b-[3px] border-foreground hover:bg-transparent">
                <TableHead className="font-black text-foreground">Mascota</TableHead>
                <TableHead className="font-black text-foreground">Vacuna</TableHead>
                <TableHead className="font-black text-foreground">Dosis</TableHead>
                <TableHead className="font-black text-foreground">Fecha Aplicación</TableHead>
                <TableHead className="font-black text-foreground">Próxima Dosis</TableHead>
                <TableHead className="font-black text-foreground text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vacunaciones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 font-bold text-foreground/50">No hay vacunas registradas</TableCell>
                </TableRow>
              ) : (
                vacunaciones.map((v) => (
                  <TableRow key={v.id} className="border-b-[2px] border-foreground/20 hover:bg-white/50 transition-colors">
                    <TableCell className="font-black">{v.mascota}</TableCell>
                    <TableCell>
                      <Badge className="bg-[#fdffb6] text-foreground border-[2px] border-foreground/20 font-bold">
                        {v.vacunaId}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{v.dosis}</TableCell>
                    <TableCell className="font-medium text-foreground/60">{formatDate(v.fecha)}</TableCell>
                    <TableCell className="font-black text-[#8a8d1a]">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {formatDate(v.proximaFecha)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0 rounded-lg border-[2px] border-transparent hover:border-foreground hover:bg-[#fdffb6] transition-all"
                        onClick={() => setSelectedVacuna(v)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Detalle */}
      <Dialog open={!!selectedVacuna} onOpenChange={(open) => !open && setSelectedVacuna(null)}>
        <DialogContent className="flex flex-col gap-0 overflow-hidden rounded-[32px] border-[4px] border-foreground bg-[#fdfaf5] p-0 sm:p-0 shadow-[8px_8px_0px_0px_#000000] max-w-[95vw] w-[95vw] sm:max-w-md sm:w-full max-h-[90dvh] focus:outline-none">
          <DialogHeader className="shrink-0 border-b-4 border-foreground bg-[#fdffb6] p-6 sm:p-8 space-y-0 text-left">
            <DialogTitle className="text-2xl sm:text-3xl font-black flex items-center gap-3">
              <Syringe className="h-8 w-8" /> Detalle de Vacunación
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 sm:p-10 space-y-8 overflow-y-auto min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white border-[3px] border-foreground shadow-[4px_4px_0px_0px_#000000] rounded-2xl">
                <p className="text-[10px] font-black uppercase text-foreground/40 mb-1">Mascota</p>
                <p className="font-black text-lg">{selectedVacuna?.mascota}</p>
              </div>
              <div className="p-4 bg-white border-[3px] border-foreground shadow-[4px_4px_0px_0px_#000000] rounded-2xl">
                <p className="text-[10px] font-black uppercase text-foreground/40 mb-1">Vacuna</p>
                <p className="break-all font-black text-base text-primary md:text-lg">{selectedVacuna?.vacunaId}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-3 rounded-2xl border-2 border-dashed border-foreground/20 bg-foreground/5 p-4 md:flex-row md:items-center md:justify-between">
                <span className="flex items-center gap-2 text-sm font-bold"><Plus className="h-4 w-4 shrink-0" /> Dosis Recibida</span>
                <Badge className="w-full shrink-0 justify-center bg-[#93ABD9] text-foreground border-2 border-foreground font-black md:w-auto">{selectedVacuna?.dosis}</Badge>
              </div>
              
              <div className="flex flex-col gap-2 rounded-2xl border-[3px] border-foreground bg-white p-4 shadow-[4px_4px_0px_0px_#a8d5ba] md:flex-row md:items-center md:justify-between">
                <span className="font-bold text-sm">Fecha Aplicación</span>
                <span className="break-words text-left font-black md:text-right">{selectedVacuna ? formatDate(selectedVacuna.fecha) : "-"}</span>
              </div>

              <div className="flex flex-col gap-2 rounded-2xl border-[3px] border-foreground bg-white p-4 shadow-[4px_4px_0px_0px_#ffadad] md:flex-row md:items-center md:justify-between">
                <span className="font-bold text-sm">Próxima Dosis</span>
                <span className="flex min-w-0 flex-col items-start gap-1 font-black text-[#8a8d1a] sm:flex-row sm:items-center sm:gap-1 md:items-center">
                  <Calendar className="h-4 w-4 shrink-0" /> <span className="break-words">{selectedVacuna ? formatDate(selectedVacuna.proximaFecha) : "-"}</span>
                </span>
              </div>

              <div className="p-4 bg-[#9bf6ff] border-[3px] border-foreground rounded-2xl shadow-[4px_4px_0px_0px_#000000]">
                <p className="text-[10px] font-black uppercase text-foreground/40 mb-1 flex items-center gap-1"><User className="h-3 w-3" /> Veterinario Responsable</p>
                <p className="font-bold">{selectedVacuna?.vet?.name || selectedVacuna?.veterinario || "No asignado"}</p>
              </div>

              {selectedVacuna?.notas && (
                <div className="p-4 bg-white border-[3px] border-foreground/30 rounded-2xl">
                  <p className="text-[10px] font-black uppercase text-foreground/40 mb-1 flex items-center gap-1"><Info className="h-3 w-3" /> Notas adicionales</p>
                  <p className="text-sm font-medium text-foreground/80 whitespace-pre-wrap">{selectedVacuna.notas}</p>
                </div>
              )}
            </div>

            <Button 
              onClick={() => setSelectedVacuna(null)}
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
