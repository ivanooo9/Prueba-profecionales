"use client"

import React from "react"
import { ShieldCheck, Calendar, User, Plus, Eye, Info, FlaskConical, Shield, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Mascota, Preventivo } from "@/lib/admin-service"
import { formatDate } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface PreventivoFormState {
  mascota: string;
  tipo: string;
  fecha: string;
  proximaFecha: string;
  dosis: string;
  notas: string;
}

interface PreventivosSectionProps {
  preventivos: Preventivo[]
  mascotas: Mascota[]
  selectedPetId: string | null
  selectedPatient: string | null
  showForm: boolean
  setShowForm: (show: boolean) => void
  onBack: () => void
  onSubmit: (e: React.FormEvent) => void | Promise<unknown>
  form: PreventivoFormState
  setForm: (form: PreventivoFormState) => void
}

export const PreventivosSection: React.FC<PreventivosSectionProps> = ({
  preventivos, mascotas, selectedPetId, selectedPatient, showForm, setShowForm, onBack, onSubmit, form, setForm
}) => {
  const [selectedPreventivo, setSelectedPreventivo] = React.useState<Preventivo | null>(null)
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
          <h2 className="text-3xl font-black font-heading">Medicina Preventiva</h2>
          {selectedPetId && (
            <p className="font-bold text-lg mt-2 italic text-foreground/70">Viendo preventivos de <span className="font-black bg-[#9bf6ff] px-2 py-1 border-[2px] border-foreground rounded-lg ml-1 shadow-[2px_2px_0px_0px_#000000]">{selectedPatient}</span></p>
          )}
        </div>
        <div className="flex items-center gap-3">
           <Button size="sm" variant="outline" onClick={onBack} className="h-12 px-6 font-bold border-[3px] border-foreground bg-white text-foreground hover:bg-[#ffadad] rounded-xl shadow-[3px_3px_0px_0px_#000000] transition-all active:translate-y-0.5 active:shadow-none">← Volver</Button>
           <Button onClick={() => setShowForm(!showForm)} className="gap-2 bg-[#9bf6ff] text-foreground hover:bg-[#8aecf5] border-[3px] border-foreground shadow-[3px_3px_0px_0px_#000000] font-bold rounded-xl h-12 px-6 transition-all active:translate-y-0.5 active:shadow-none">
             <Plus className="h-5 w-5" /> {showForm ? "Cerrar" : "Nuevo Control"}
           </Button>
        </div>
      </div>

      {showForm && (
        <Card className="bg-[#fdfaf5] border-[3px] border-foreground shadow-[6px_6px_0px_0px_#000000] rounded-3xl mb-8 border-t-8 border-t-[#9bf6ff]">
          <CardHeader className="gap-0 px-6 pt-6">
            <CardTitle className="font-black text-2xl flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-[#178f9c]" /> Registrar Control Preventivo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <form onSubmit={handleFormSubmit} className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold">Mascota</Label>
                <select
                  className="w-full min-h-11 p-3 rounded-xl border-[2px] border-foreground bg-white text-base md:text-sm font-medium focus:ring-[3px] focus:ring-[#9bf6ff] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
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
                <Label className="font-bold">Tipo de Control</Label>
                <Input
                  placeholder="Ej: Desparasitación Interna, Control de Peso..."
                  className="border-[2px] border-foreground bg-white p-3 rounded-xl font-medium"
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Siguiente Dosis / Control</Label>
                <Input
                  type="date"
                  className="border-[2px] border-foreground bg-white p-3 rounded-xl font-medium"
                  min={new Date().toISOString().split('T')[0]}
                  value={form.proximaFecha}
                  onChange={(e) => setForm({ ...form, proximaFecha: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Número de Dosis (si aplica)</Label>
                <Input
                  type="number"
                  className="border-[2px] border-foreground bg-white p-3 rounded-xl font-medium"
                  value={form.dosis}
                  onChange={(e) => setForm({ ...form, dosis: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label className="font-bold">Notas adicionales (opcional)</Label>
                <Textarea
                  placeholder="Observaciones, indicaciones especiales..."
                  className="border-[2px] border-foreground bg-white rounded-xl font-medium resize-none"
                  rows={3}
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 flex gap-3 pt-2 pb-2">
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
                    "Guardar Registro"
                  )}
                </Button>
                <Button type="button" variant="outline" disabled={formSubmitting} onClick={() => setShowForm(false)} className="bg-white font-bold border-[2px] border-foreground rounded-xl">Cancelar</Button>
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
                <TableHead className="font-black text-foreground">Control</TableHead>
                <TableHead className="font-black text-foreground">Fecha Aplicación</TableHead>
                <TableHead className="font-black text-foreground">Próximo Refuerzo</TableHead>
                <TableHead className="font-black text-foreground">Dosis #</TableHead>
                <TableHead className="font-black text-foreground text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preventivos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 font-bold text-foreground/50">No hay controles registrados</TableCell>
                </TableRow>
              ) : (
                preventivos.map((p) => (
                  <TableRow key={p.id} className="border-b-[2px] border-foreground/20 hover:bg-white/50 transition-colors">
                    <TableCell className="font-black">{p.mascota}</TableCell>
                    <TableCell>
                      <Badge className="bg-[#9bf6ff] text-foreground border-[2px] border-foreground/20 shadow-[2px_2px_0px_0px_#00000020] font-bold">
                        {p.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-foreground/60">{formatDate(p.fecha)}</TableCell>
                    <TableCell className="font-black text-[#178f9c]">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {formatDate(p.proximaFecha)}
                      </div>
                    </TableCell>
                    <TableCell className="font-black text-xl"># {p.dosis}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0 rounded-lg border-[2px] border-transparent hover:border-foreground hover:bg-[#9bf6ff] transition-all"
                        onClick={() => setSelectedPreventivo(p)}
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
      <Dialog open={!!selectedPreventivo} onOpenChange={(open) => !open && setSelectedPreventivo(null)}>
        <DialogContent className="flex flex-col gap-0 overflow-hidden rounded-[32px] border-[4px] border-foreground bg-[#fdfaf5] p-0 sm:p-0 shadow-[8px_8px_0px_0px_#000000] max-w-[95vw] w-[95vw] sm:max-w-md sm:w-full max-h-[90dvh] focus:outline-none">
          <DialogHeader className="shrink-0 border-b-4 border-foreground bg-[#fdffb6] p-6 sm:p-8 space-y-0 text-left">
            <DialogTitle className="text-2xl sm:text-3xl font-black flex items-center gap-3">
              <Shield className="h-8 w-8" /> Detalle de Preventivo
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 sm:p-10 space-y-8 overflow-y-auto min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white border-[3px] border-foreground shadow-[4px_4px_0px_0px_#000000] rounded-2xl">
                <p className="text-[10px] font-black uppercase text-foreground/40 mb-1">Mascota</p>
                <p className="font-black text-lg">{selectedPreventivo?.mascota}</p>
              </div>
              <div className="p-4 bg-white border-[3px] border-foreground shadow-[4px_4px_0px_0px_#000000] rounded-2xl">
                <p className="text-[10px] font-black uppercase text-foreground/40 mb-1">Tipo</p>
                <p className="font-black text-lg text-primary">{selectedPreventivo?.tipo}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-foreground/5 rounded-2xl border-2 border-dashed border-foreground/20">
                <span className="font-bold flex items-center gap-2 text-sm"><FlaskConical className="h-4 w-4" /> Número de Dosis</span>
                <Badge className="bg-[#93ABD9] text-foreground border-2 border-foreground font-black"># {selectedPreventivo?.dosis}</Badge>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-white border-[3px] border-foreground rounded-2xl shadow-[4px_4px_0px_0px_#a8d5ba]">
                <span className="font-bold text-sm">Fecha Aplicación</span>
                <span className="font-black">{selectedPreventivo ? formatDate(selectedPreventivo.fecha) : "-"}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-white border-[3px] border-foreground rounded-2xl shadow-[4px_4px_0px_0px_#ffadad]">
                <span className="font-bold text-sm">Próxima Fecha</span>
                <span className="font-black text-[#8a8d1a] flex items-center gap-1">
                  <Calendar className="h-4 w-4" /> {selectedPreventivo ? formatDate(selectedPreventivo.proximaFecha) : "-"}
                </span>
              </div>

              <div className="p-4 bg-[#9bf6ff] border-[3px] border-foreground rounded-2xl shadow-[4px_4px_0px_0px_#000000]">
                <p className="text-[10px] font-black uppercase text-foreground/40 mb-1 flex items-center gap-1"><User className="h-3 w-3" /> Veterinario Responsable</p>
                <p className="font-bold">{selectedPreventivo?.vet?.name || selectedPreventivo?.veterinario || "No asignado"}</p>
              </div>

              {selectedPreventivo?.notas && (
                <div className="p-4 bg-white border-[3px] border-foreground/30 rounded-2xl">
                  <p className="text-[10px] font-black uppercase text-foreground/40 mb-1 flex items-center gap-1"><Info className="h-3 w-3" /> Notas adicionales</p>
                  <p className="text-sm font-medium text-foreground/80 whitespace-pre-wrap">{selectedPreventivo.notas}</p>
                </div>
              )}
            </div>

            <Button 
              onClick={() => setSelectedPreventivo(null)}
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
