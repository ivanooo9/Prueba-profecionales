"use client"

import React, { useState, useRef } from "react"
import { ClipboardList, Plus, PawPrint, Eye, User, FileText, Calendar, Activity, Loader2, HeartPulse, Stethoscope, Microscope, CheckCircle, UploadCloud, X, File, Image as ImageIcon, Download } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Diagnostico, Mascota, ExamData } from "@/lib/admin-service"
import { formatDate, cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"

interface DiagnosticosSectionProps {
  diagnosticos: Diagnostico[]
  mascotas: Mascota[]
  selectedPetId: string | null
  selectedPatient: string | null
  showForm: boolean
  setShowForm: (show: boolean) => void
  onBack: () => void
  onSubmit: (payload: any) => void | Promise<unknown>
  onAddExam?: (examData: { mascota: string; petId: string; fecha: string; titulo: string; descripcion: string; fileUrl: string; fileType: string; fileName: string }) => Promise<any>
  exams?: ExamData[]
}

const ORGANOS = [
  "Estado general y Condición Corporal",
  "Estado de Hidratación",
  "Sistema Tegumentario",
  "Ojos",
  "Oídos",
  "Nariz",
  "Sistema Digestivo",
  "S. Respiratorio",
  "S. Nervioso",
  "S. Musculoesquelético",
  "S. Cardiovascular",
  "S. Genitourinario"
];

const EXAMENES = [
  "Química Sanguínea", "Rayos X", "Ecografía", "Cuadro Hemático", 
  "Frotis (raspado piel)", "Coprológico", "Endoscopía", "ECG", 
  "EEG", "Parcial de Orina", "Coproscópico", "Cultivos", 
  "Antibiograma", "Biopsia", "Otros"
];

const ACTITUDES = ["Letárgico", "Estuporoso", "Comatoso", "Alerta", "Otro"];

export const DiagnosticosSection: React.FC<DiagnosticosSectionProps> = ({
  diagnosticos, mascotas, selectedPetId, selectedPatient, showForm, setShowForm, onBack, onSubmit, onAddExam, exams = []
}) => {
  const [selectedDiagnostico, setSelectedDiagnostico] = useState<Diagnostico | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [uploadedExamIds, setUploadedExamIds] = useState<string[]>([])
  
  const defaultForm = {
    mascota: selectedPatient || "",
    motivoConsulta: "",
    fRespiratoria: "",
    fCardiaca: "",
    temperatura: "",
    pulso: "",
    tiempoLlenado: "",
    ganglios: "",
    mucosas: "",
    actitud: "",
    sistemas: {} as Record<string, string>,
    hallazgosClinicos: "",
    listaProblemas: "",
    diagnosticosDiferenciales: "",
    examenesComplementarios: [] as string[],
    hallazgosPruebas: "",
    diagnostico: "",
    notas: ""
  }
  
  const [form, setForm] = useState(defaultForm)

  React.useEffect(() => {
    if (!showForm) {
      setForm(defaultForm)
      setUploadedExamIds([])
    }
  }, [showForm])

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formSubmitting) return
    setFormSubmitting(true)
    try {
      await Promise.resolve(onSubmit({ ...form, examIds: uploadedExamIds }))
      setForm(defaultForm) // reset form after success
      setUploadedExamIds([]) // clear after success
    } finally {
      setFormSubmitting(false)
    }
  }

  const toggleExamen = (examen: string) => {
    setForm(prev => {
      const current = prev.examenesComplementarios || [];
      if (current.includes(examen)) {
        return { ...prev, examenesComplementarios: current.filter(e => e !== examen) };
      } else {
        return { ...prev, examenesComplementarios: [...current, examen] };
      }
    });
  }



  // --- Upload Examen Inline ---
  const [showUploadExamen, setShowUploadExamen] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadTitulo, setUploadTitulo] = useState("")
  const [uploadDescripcion, setUploadDescripcion] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const uploadFileRef = useRef<HTMLInputElement>(null)

  const handleUploadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files).filter(f => f.type.includes('image') || f.type === 'application/pdf')
      if (selected.length > 0) {
        setUploadFiles(prev => [...prev, ...selected])
        // Auto-fill title from selected exams if empty
        if (!uploadTitulo && form.examenesComplementarios.length > 0) {
          setUploadTitulo(form.examenesComplementarios.join(" + "))
        }
      }
    }
  }

  const removeUploadFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUploadExamen = async () => {
    if (uploadFiles.length === 0 || !selectedPetId || !selectedPatient) return
    if (!onAddExam) return
    setIsUploading(true)
    try {
      for (const file of uploadFiles) {
        const formDataUpload = new FormData()
        formDataUpload.append('file', file)
        const uploadRes = await fetch('/api/upload/exam', { method: 'POST', body: formDataUpload })
        if (!uploadRes.ok) throw new Error("Error subiendo archivo: " + file.name)
        const uploadResult = await uploadRes.json()
        const fileType = (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) ? 'pdf' : 'image'
        
        const createdExam = await onAddExam({
          mascota: selectedPatient,
          petId: selectedPetId,
          fecha: new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" }),
          titulo: uploadTitulo || (form.examenesComplementarios.length > 0 ? form.examenesComplementarios.join(" + ") : file.name),
          descripcion: uploadDescripcion,
          fileUrl: uploadResult.secure_url || uploadResult.url,
          fileType,
          fileName: file.name
        })
        if (createdExam && createdExam.id) {
          setUploadedExamIds(prev => [...prev, createdExam.id])
        }
      }
      setUploadFiles([])
      setUploadTitulo("")
      setUploadDescripcion("")
      if (uploadFileRef.current) uploadFileRef.current.value = ''
      setShowUploadExamen(false)
      toast.success("Exámenes subidos y guardados con éxito.")
    } catch (err) {
      console.error(err)
      toast.error("Ocurrió un error al subir uno o más archivos.")
    } finally {
      setIsUploading(false)
    }
  }

  const updateSistema = (organo: string, valor: string) => {
    setForm(prev => ({
      ...prev,
      sistemas: { ...prev.sistemas, [organo]: valor }
    }));
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-black font-heading">Revisión y Diagnóstico</h2>
          {selectedPetId && (
            <p className="font-bold text-lg mt-2 italic text-foreground/70">Viendo diagnósticos de <span className="font-black bg-[#bdb2ff] px-2 py-1 border-[2px] border-foreground rounded-lg ml-1 shadow-[2px_2px_0px_0px_#000000]">{selectedPatient}</span></p>
          )}
        </div>
        <div className="flex items-center gap-3">
           <Button size="sm" variant="outline" onClick={onBack} className="h-12 px-6 font-bold border-[3px] border-foreground bg-white text-foreground hover:bg-[#ffadad] rounded-xl shadow-[3px_3px_0px_0px_#000000] transition-all active:translate-y-0.5 active:shadow-none">← Volver</Button>
           <Button onClick={() => setShowForm(!showForm)} className="gap-2 bg-[#bdb2ff] text-foreground hover:bg-[#a69cf0] border-[3px] border-foreground shadow-[3px_3px_0px_0px_#000000] font-bold rounded-xl h-12 px-6 transition-all active:translate-y-0.5 active:shadow-none">
             <Plus className="h-5 w-5" /> {showForm ? "Cerrar" : "Nuevo Diagnóstico"}
           </Button>
        </div>
      </div>

      {showForm && (
        <Card className="bg-[#fdfaf5] border-[3px] border-foreground shadow-[6px_6px_0px_0px_#000000] rounded-3xl mb-8 border-t-8 border-t-[#bdb2ff]">
          <CardHeader className="gap-0 px-6 pt-6">
            <CardTitle className="font-black text-2xl flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-[#bdb2ff]" /> Examen Clínico y Diagnóstico
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <form onSubmit={handleFormSubmit} className="space-y-6">
              
              <Tabs defaultValue="constantes" className="w-full">
                <TabsList className="grid grid-cols-2 md:grid-cols-4 bg-foreground/5 p-1 rounded-xl mb-6 h-auto">
                  <TabsTrigger value="constantes" className="font-bold py-3 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-2 data-[state=active]:border-foreground">Constantes</TabsTrigger>
                  <TabsTrigger value="clinico" className="font-bold py-3 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-2 data-[state=active]:border-foreground">Examen Clínico</TabsTrigger>
                  <TabsTrigger value="pruebas" className="font-bold py-3 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-2 data-[state=active]:border-foreground">Pruebas</TabsTrigger>
                  <TabsTrigger value="diagnostico" className="font-bold py-3 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-2 data-[state=active]:border-foreground">Diagnóstico</TabsTrigger>
                </TabsList>

                {/* TABS CONSTANTES */}
                <TabsContent value="constantes" className="space-y-4 animate-fade-in">
                  <div className="bg-[#a8d5ba]/20 border-[2px] border-foreground p-4 rounded-xl space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-bold">Mascota</Label>
                        <select
                          className="w-full min-h-11 p-3 rounded-xl border-[2px] border-foreground bg-white text-base md:text-sm font-medium focus:ring-[3px] focus:ring-[#bdb2ff] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <Label className="font-bold">Motivo de Consulta</Label>
                        <Input
                          placeholder="Ej: Dolor luego de haberle caído un colchón..."
                          className="border-[2px] border-foreground bg-white p-3 rounded-xl font-medium focus-visible:ring-0 focus:border-[#a8d5ba]"
                          value={form.motivoConsulta}
                          onChange={(e) => setForm({ ...form, motivoConsulta: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <h3 className="font-black text-lg flex items-center gap-2 pt-2"><HeartPulse className="h-5 w-5 text-[#ffc6ff]" /> Constantes Fisiológicas</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold">F. Respiratoria (rpm)</Label>
                      <Input placeholder="Ej: 30" className="border-2 border-foreground rounded-xl" value={form.fRespiratoria} onChange={(e) => setForm({...form, fRespiratoria: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">F. Cardiaca (lpm)</Label>
                      <Input placeholder="Ej: 100" className="border-2 border-foreground rounded-xl" value={form.fCardiaca} onChange={(e) => setForm({...form, fCardiaca: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Temperatura (°C)</Label>
                      <Input placeholder="Ej: 39.5" className="border-2 border-foreground rounded-xl" value={form.temperatura} onChange={(e) => setForm({...form, temperatura: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Pulso</Label>
                      <Input placeholder="Fuerte y rítmico" className="border-2 border-foreground rounded-xl" value={form.pulso} onChange={(e) => setForm({...form, pulso: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">T. Llenado Capilar</Label>
                      <Input placeholder="< 2s" className="border-2 border-foreground rounded-xl" value={form.tiempoLlenado} onChange={(e) => setForm({...form, tiempoLlenado: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Ganglios Linfáticos</Label>
                      <Input placeholder="Normales" className="border-2 border-foreground rounded-xl" value={form.ganglios} onChange={(e) => setForm({...form, ganglios: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Mucosas</Label>
                      <Input placeholder="Rosadas" className="border-2 border-foreground rounded-xl" value={form.mucosas} onChange={(e) => setForm({...form, mucosas: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Actitud / Temperamento</Label>
                      <select className="w-full h-10 px-3 rounded-xl border-2 border-foreground bg-white text-sm focus:outline-none" value={form.actitud} onChange={(e) => setForm({...form, actitud: e.target.value})}>
                        <option value="">Seleccione...</option>
                        {ACTITUDES.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                  </div>
                </TabsContent>

                {/* TABS EXAMEN CLINICO */}
                <TabsContent value="clinico" className="space-y-4 animate-fade-in">
                  <h3 className="font-black text-lg flex items-center gap-2"><Stethoscope className="h-5 w-5 text-[#9bf6ff]" /> Órganos y Sistemas</h3>
                  <div className="bg-white border-2 border-foreground rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="font-black text-foreground">Sistema</TableHead>
                          <TableHead className="font-black text-foreground text-center">N (Normal)</TableHead>
                          <TableHead className="font-black text-foreground text-center">AN (Anormal)</TableHead>
                          <TableHead className="font-black text-foreground text-center">NE (No exam.)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ORGANOS.map((organo) => (
                          <TableRow key={organo} className="border-b border-foreground/10 hover:bg-transparent">
                            <TableCell className="font-bold text-sm">{organo}</TableCell>
                            <TableCell className="text-center p-2">
                              <Button type="button" variant="outline" size="sm" onClick={() => updateSistema(organo, "N")} className={`w-8 h-8 p-0 rounded-md border-2 border-foreground ${form.sistemas[organo] === "N" ? "bg-[#a8d5ba] text-black" : "bg-white"}`}>
                                {form.sistemas[organo] === "N" && <CheckCircle className="h-4 w-4" />}
                              </Button>
                            </TableCell>
                            <TableCell className="text-center p-2">
                              <Button type="button" variant="outline" size="sm" onClick={() => updateSistema(organo, "AN")} className={`w-8 h-8 p-0 rounded-md border-2 border-foreground ${form.sistemas[organo] === "AN" ? "bg-[#ffadad] text-black" : "bg-white"}`}>
                                {form.sistemas[organo] === "AN" && <CheckCircle className="h-4 w-4" />}
                              </Button>
                            </TableCell>
                            <TableCell className="text-center p-2">
                              <Button type="button" variant="outline" size="sm" onClick={() => updateSistema(organo, "NE")} className={`w-8 h-8 p-0 rounded-md border-2 border-foreground ${form.sistemas[organo] === "NE" ? "bg-gray-200 text-black" : "bg-white"}`}>
                                {form.sistemas[organo] === "NE" && <CheckCircle className="h-4 w-4" />}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label className="font-bold">Descripción de los Hallazgos</Label>
                    <textarea
                      className="w-full p-3 rounded-xl border-2 border-foreground bg-white min-h-[80px] text-sm focus:outline-none focus:border-[#9bf6ff]"
                      placeholder="Detalle de hallazgos anormales..."
                      value={form.hallazgosClinicos}
                      onChange={(e) => setForm({ ...form, hallazgosClinicos: e.target.value })}
                    />
                  </div>
                </TabsContent>

                {/* TABS PRUEBAS Y PROBLEMAS */}
                <TabsContent value="pruebas" className="space-y-6 animate-fade-in">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="font-bold text-lg flex items-center gap-2"><ClipboardList className="h-5 w-5 text-[#fdffb6]" /> Lista de Problemas</Label>
                      <textarea
                        className="w-full p-3 rounded-xl border-2 border-foreground bg-white min-h-[120px] text-sm focus:outline-none focus:border-[#fdffb6]"
                        placeholder="1. Cojera miembro posterior derecho&#10;2. Dolor a la palpación..."
                        value={form.listaProblemas}
                        onChange={(e) => setForm({ ...form, listaProblemas: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-[#fdffb6]" /> Diag. Diferenciales</Label>
                      <textarea
                        className="w-full p-3 rounded-xl border-2 border-foreground bg-white min-h-[120px] text-sm focus:outline-none focus:border-[#fdffb6]"
                        placeholder="1. Fractura de fémur&#10;2. Luxación patelar..."
                        value={form.diagnosticosDiferenciales}
                        onChange={(e) => setForm({ ...form, diagnosticosDiferenciales: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="font-bold text-lg flex items-center gap-2"><Microscope className="h-5 w-5 text-[#bdb2ff]" /> Exámenes Complementarios</Label>
                    <div className="flex flex-wrap gap-2">
                      {EXAMENES.map(examen => {
                        const isSelected = (form.examenesComplementarios || []).includes(examen);
                        return (
                          <Button
                            key={examen}
                            type="button"
                            variant="outline"
                            onClick={() => toggleExamen(examen)}
                            className={`rounded-full border-2 border-foreground font-bold text-xs sm:text-sm transition-all ${isSelected ? 'bg-[#bdb2ff] text-black shadow-none' : 'bg-white hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]'}`}
                          >
                            {isSelected && <CheckCircle className="h-3 w-3 mr-1" />}
                            {examen}
                          </Button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Descripción Hallazgos Pruebas Diagnósticas</Label>
                    <textarea
                      className="w-full p-3 rounded-xl border-2 border-foreground bg-white min-h-[80px] text-sm focus:outline-none focus:border-[#bdb2ff]"
                      placeholder="Resultados de laboratorio, rayos X, etc..."
                      value={form.hallazgosPruebas}
                      onChange={(e) => setForm({ ...form, hallazgosPruebas: e.target.value })}
                    />
                  </div>

                  {/* Boton de subir examen — aparece si hay exámenes seleccionados O siempre disponible */}
                  {onAddExam && (
                    <div className="pt-2">
                      {!showUploadExamen ? (
                        <button
                          type="button"
                          onClick={() => setShowUploadExamen(true)}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-[2px] border-dashed border-[#bdb2ff] bg-[#bdb2ff]/10 hover:bg-[#bdb2ff]/20 text-foreground font-bold text-sm transition-all w-full justify-center"
                        >
                          <UploadCloud className="h-4 w-4 text-[#bdb2ff]" />
                          Subir resultado del examen (PDF / Imagen)
                          {form.examenesComplementarios.length > 0 && (
                            <span className="ml-1 text-[10px] bg-[#bdb2ff] text-black px-2 py-0.5 rounded-full font-black">
                              {form.examenesComplementarios.length} seleccionado{form.examenesComplementarios.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </button>
                      ) : (
                        <div className="bg-white border-[2px] border-[#bdb2ff] rounded-2xl p-4 space-y-3 shadow-[4px_4px_0px_0px_#bdb2ff] relative">
                          <div className="flex items-center justify-between">
                            <p className="font-black text-sm flex items-center gap-2">
                              <FileText className="h-4 w-4 text-[#bdb2ff]" />
                              Adjuntar resultados del examen
                            </p>
                            <button type="button" onClick={() => { setShowUploadExamen(false); setUploadFiles([]); setUploadTitulo(""); setUploadDescripcion(""); }} className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-red-100 transition-colors">
                              <X className="h-4 w-4 text-foreground/50" />
                            </button>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-foreground/50">Título del examen</label>
                            <input
                              type="text"
                              value={uploadTitulo}
                              onChange={(e) => setUploadTitulo(e.target.value)}
                              placeholder={form.examenesComplementarios.length > 0 ? form.examenesComplementarios.join(" + ") : "Ej. Radiografía torácica..."}
                              className="w-full h-10 px-3 rounded-xl border-2 border-foreground/30 bg-white text-sm font-bold focus:outline-none focus:border-[#bdb2ff]"
                            />
                          </div>

                          <label className="flex flex-col items-center justify-center border-2 border-dashed border-foreground/30 bg-foreground/5 rounded-xl h-20 cursor-pointer hover:bg-[#bdb2ff]/10 transition-colors">
                            <div className="flex flex-col items-center gap-1 text-foreground/60">
                              <UploadCloud className="h-5 w-5" />
                              <span className="font-bold text-xs">Seleccionar archivos (PDF o Imagen)</span>
                            </div>
                            <input type="file" ref={uploadFileRef} onChange={handleUploadFileChange} accept="application/pdf,image/*" multiple className="hidden" />
                          </label>

                          {uploadFiles.length > 0 && (
                            <div className="space-y-1.5 max-h-32 overflow-y-auto border-2 border-foreground/10 rounded-xl p-2 bg-foreground/5">
                              {uploadFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-2 p-1.5 rounded-lg border border-foreground/15 bg-white text-xs">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {file.type === 'application/pdf' ? (
                                      <File className="h-4 w-4 text-red-400 shrink-0" />
                                    ) : (
                                      <ImageIcon className="h-4 w-4 text-blue-400 shrink-0" />
                                    )}
                                    <span className="font-bold truncate text-foreground/80">{file.name}</span>
                                    <span className="text-[10px] text-foreground/40 shrink-0">({(file.size / 1024).toFixed(1)} KB)</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeUploadFile(idx)}
                                    className="h-5 w-5 flex items-center justify-center rounded-full hover:bg-red-100 text-red-500 transition-colors"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={handleUploadExamen}
                            disabled={isUploading || uploadFiles.length === 0}
                            className="w-full h-10 bg-[#bdb2ff] hover:bg-[#a69cf0] border-[2px] border-foreground text-foreground font-black text-sm rounded-xl shadow-[3px_3px_0px_0px_#000000] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {isUploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo...</> : <><UploadCloud className="h-4 w-4" /> Guardar en Exámenes Médicos ({uploadFiles.length})</>}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* TABS DIAGNOSTICO FINAL */}
                <TabsContent value="diagnostico" className="space-y-4 animate-fade-in">
                  <div className="bg-[#bdb2ff]/20 border-[3px] border-[#bdb2ff] p-6 rounded-2xl space-y-4 shadow-[4px_4px_0px_0px_#bdb2ff]">
                    <div className="space-y-2">
                      <Label className="font-black text-xl">Diagnóstico Definitivo</Label>
                      <Input
                        placeholder="Ej: Fractura transversa de fémur derecho"
                        className="border-[3px] border-foreground bg-white p-4 h-auto text-lg rounded-xl font-bold focus-visible:ring-0 focus:border-[#bdb2ff]"
                        value={form.diagnostico}
                        onChange={(e) => setForm({ ...form, diagnostico: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Notas Adicionales / Plan Terapéutico</Label>
                      <textarea
                        className="w-full p-4 rounded-xl border-[3px] border-foreground bg-white min-h-[120px] text-base font-medium focus:outline-none focus:border-[#bdb2ff]"
                        placeholder="Recomendaciones, cirugía programada, recetas..."
                        value={form.notas}
                        onChange={(e) => setForm({ ...form, notas: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-6 pb-2">
                    <Button
                      type="submit"
                      disabled={formSubmitting}
                      className="rounded-xl border-[3px] border-foreground bg-primary font-black text-lg h-14 px-8 hover:bg-primary/85 disabled:opacity-60 shadow-[4px_4px_0px_0px_#000000] active:translate-y-1 active:shadow-none transition-all"
                    >
                      {formSubmitting ? (
                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Guardando…</>
                      ) : "Guardar Diagnóstico"}
                    </Button>
                    <Button type="button" variant="outline" disabled={formSubmitting} onClick={() => setShowForm(false)} className="bg-white font-bold h-14 border-[3px] border-foreground rounded-xl px-6 text-lg">Cancelar</Button>
                  </div>
                </TabsContent>
              </Tabs>
            </form>
          </CardContent>
        </Card>
      )}

      {/* HISTORIAL DIAGNOSTICOS LIST */}
      <Card className="bg-[#fdfaf5] border-[3px] border-foreground shadow-[6px_6px_0px_0px_#000000] rounded-3xl overflow-hidden p-0">
        <CardContent className="p-0">
          <div className="overflow-x-auto [-webkit-overflow-scrolling:touch] overscroll-x-contain">
          <Table className="min-w-[560px] md:min-w-full">
            <TableHeader className="bg-muted/50">
              <TableRow className="border-b-[3px] border-foreground hover:bg-transparent">
                <TableHead className="font-black text-foreground">Mascota</TableHead>
                <TableHead className="font-black text-foreground">Fecha</TableHead>
                <TableHead className="font-black text-foreground">Motivo/Diagnóstico</TableHead>
                <TableHead className="font-black text-foreground text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {diagnosticos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 font-bold text-foreground/50">No hay diagnósticos registrados</TableCell>
                </TableRow>
              ) : (
                diagnosticos.map((d) => (
                  <TableRow key={d.id} className="border-b-[2px] border-foreground/20 hover:bg-white/50 transition-colors">
                    <TableCell className="font-black flex items-center gap-2">
                      <div className="p-1.5 bg-[#bdb2ff]/30 rounded-lg border border-[#bdb2ff]">
                        <PawPrint className="h-4 w-4" />
                      </div>
                      {d.mascota}
                    </TableCell>
                    <TableCell className="font-medium">{formatDate(d.fecha)}</TableCell>
                    <TableCell className="font-medium">
                      {d.motivoConsulta ? <span className="text-xs font-bold bg-gray-200 px-2 py-0.5 rounded-full mr-2">{d.motivoConsulta.substring(0,20)}...</span> : null}
                      {d.diagnostico}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0 rounded-lg border-[2px] border-transparent hover:border-foreground hover:bg-[#bdb2ff] transition-all"
                        onClick={() => setSelectedDiagnostico(d)}
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
      <Dialog open={!!selectedDiagnostico} onOpenChange={(open) => !open && setSelectedDiagnostico(null)}>
        <DialogContent className="flex flex-col gap-0 overflow-hidden rounded-[32px] border-[4px] border-foreground bg-[#fdfaf5] p-0 sm:p-0 shadow-[8px_8px_0px_0px_#000000] max-w-[95vw] w-[95vw] sm:max-w-2xl sm:w-full max-h-[90dvh] focus:outline-none">
          <DialogHeader className="shrink-0 border-b-4 border-foreground bg-[#bdb2ff] p-5 sm:p-6 space-y-0 text-left">
            <DialogTitle className="text-xl sm:text-2xl font-black flex items-center gap-3">
              <ClipboardList className="h-6 w-6" /> Ficha Médica de {selectedDiagnostico?.mascota}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 sm:p-8 space-y-6 overflow-y-auto min-h-0 bg-[#fdfaf5]">
            
            {/* Header Detalle */}
            <div className="flex items-center justify-between border-b-2 border-foreground/10 pb-4">
              <div>
                <p className="text-[10px] font-black uppercase text-foreground/40 mb-1 flex items-center gap-1"><Activity className="h-3 w-3" /> Diagnóstico Final</p>
                <p className="font-black text-2xl text-[#bdb2ff] drop-shadow-sm">{selectedDiagnostico?.diagnostico}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase text-foreground/40 mb-1"><Calendar className="h-3 w-3 inline" /> Fecha</p>
                <p className="font-bold bg-white border-2 border-foreground px-3 py-1 rounded-xl shadow-sm">{selectedDiagnostico ? formatDate(selectedDiagnostico.fecha) : "-"}</p>
              </div>
            </div>

            {selectedDiagnostico?.motivoConsulta && (
              <div className="p-4 bg-white border-[2px] border-foreground rounded-2xl shadow-sm">
                <p className="text-[10px] font-black uppercase text-foreground/40 mb-1">Motivo de Consulta</p>
                <p className="font-bold">{selectedDiagnostico.motivoConsulta}</p>
              </div>
            )}

            {/* Constantes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {selectedDiagnostico?.temperatura && <div className="p-3 bg-white border-2 border-foreground rounded-xl"><p className="text-[9px] font-black uppercase text-foreground/40">Temp</p><p className="font-bold text-sm">{selectedDiagnostico.temperatura} °C</p></div>}
              {selectedDiagnostico?.fCardiaca && <div className="p-3 bg-white border-2 border-foreground rounded-xl"><p className="text-[9px] font-black uppercase text-foreground/40">FC</p><p className="font-bold text-sm">{selectedDiagnostico.fCardiaca} lpm</p></div>}
              {selectedDiagnostico?.fRespiratoria && <div className="p-3 bg-white border-2 border-foreground rounded-xl"><p className="text-[9px] font-black uppercase text-foreground/40">FR</p><p className="font-bold text-sm">{selectedDiagnostico.fRespiratoria} rpm</p></div>}
              {selectedDiagnostico?.actitud && <div className="p-3 bg-white border-2 border-foreground rounded-xl"><p className="text-[9px] font-black uppercase text-foreground/40">Actitud</p><p className="font-bold text-sm">{selectedDiagnostico.actitud}</p></div>}
            </div>

            {/* Sistemas y Hallazgos Clinicos */}
            {(selectedDiagnostico?.sistemas || selectedDiagnostico?.hallazgosClinicos) && (
              <div className="p-4 bg-white border-[2px] border-foreground rounded-2xl shadow-sm">
                <p className="text-[10px] font-black uppercase text-foreground/40 mb-3 flex items-center gap-1"><Stethoscope className="h-3 w-3" /> Examen Físico Especial</p>
                
                {selectedDiagnostico.sistemas && Object.keys(selectedDiagnostico.sistemas).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {Object.entries(selectedDiagnostico.sistemas).map(([organo, estado]) => {
                       if (estado === "NE") return null;
                       const isAnormal = estado === "AN";
                       return (
                         <span key={organo} className={`text-[10px] font-bold px-2 py-1 rounded-md border border-foreground/10 ${isAnormal ? 'bg-[#ffadad] text-black' : 'bg-[#a8d5ba] text-black'}`}>
                           {organo}: {isAnormal ? 'Anormal' : 'Normal'}
                         </span>
                       )
                    })}
                  </div>
                )}

                {selectedDiagnostico.hallazgosClinicos && (
                  <div className="mt-2 text-sm font-medium text-foreground/80 whitespace-pre-wrap">
                    {selectedDiagnostico.hallazgosClinicos}
                  </div>
                )}
              </div>
            )}

            {/* Listas y Problemas */}
            <div className="grid sm:grid-cols-2 gap-4">
               {selectedDiagnostico?.listaProblemas && (
                  <div className="p-4 bg-[#fdffb6]/30 border-[2px] border-[#fdffb6] rounded-2xl">
                    <p className="text-[10px] font-black uppercase text-foreground/60 mb-2">Lista de Problemas</p>
                    <p className="font-medium text-sm whitespace-pre-wrap">{selectedDiagnostico.listaProblemas}</p>
                  </div>
               )}
               {selectedDiagnostico?.diagnosticosDiferenciales && (
                  <div className="p-4 bg-[#ffc6ff]/20 border-[2px] border-[#ffc6ff] rounded-2xl">
                    <p className="text-[10px] font-black uppercase text-foreground/60 mb-2">Diag. Diferenciales</p>
                    <p className="font-medium text-sm whitespace-pre-wrap">{selectedDiagnostico.diagnosticosDiferenciales}</p>
                  </div>
               )}
            </div>

            {selectedDiagnostico?.examenesComplementarios && selectedDiagnostico.examenesComplementarios.length > 0 && (
              <div className="p-4 bg-white border-[2px] border-foreground rounded-2xl shadow-sm">
                <p className="text-[10px] font-black uppercase text-foreground/40 mb-2">Exámenes Solicitados</p>
                <div className="flex flex-wrap gap-2">
                  {selectedDiagnostico.examenesComplementarios.map((ex: string) => (
                    <span key={ex} className="bg-gray-100 border border-foreground/20 px-2 py-1 rounded-md text-xs font-bold">{ex}</span>
                  ))}
                </div>
                {selectedDiagnostico.hallazgosPruebas && (
                  <p className="mt-3 text-sm font-medium border-t-2 border-dashed border-foreground/10 pt-2">{selectedDiagnostico.hallazgosPruebas}</p>
                )}
              </div>
            )}

            {(() => {
              const matchingExams = (exams || []).filter(exam => 
                exam.diagnosisId === selectedDiagnostico?.id
              );
              if (matchingExams.length === 0) return null;
              return (
                <div className="p-4 bg-white border-[2px] border-foreground rounded-2xl shadow-sm space-y-3">
                  <p className="text-[10px] font-black uppercase text-foreground/40 mb-2 flex items-center gap-1.5 font-heading">
                    <FileText className="h-4 w-4 text-[#bdb2ff]" />
                    Resultados de Exámenes Subidos
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {matchingExams.map((exam) => (
                      <div key={exam.id} className="flex flex-col justify-between p-3 rounded-lg border-2 border-foreground bg-white shadow-[2px_2px_0px_0px_#000000] hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className={cn(
                            "p-1.5 rounded-md border border-foreground shrink-0",
                            (exam.fileType === "pdf" || exam.fileUrl.toLowerCase().split('?')[0].endsWith(".pdf") || exam.fileName?.toLowerCase().endsWith(".pdf") || exam.fileUrl.includes("/raw/upload/")) ? "bg-red-100" : "bg-blue-100"
                          )}>
                            {(exam.fileType === "pdf" || exam.fileUrl.toLowerCase().split('?')[0].endsWith(".pdf") || exam.fileName?.toLowerCase().endsWith(".pdf") || exam.fileUrl.includes("/raw/upload/")) ? (
                              <FileText className="h-4 w-4 text-red-600" />
                            ) : (
                              <ImageIcon className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black truncate text-foreground/90" title={exam.titulo}>
                              {exam.titulo}
                            </p>
                            {exam.descripcion && (
                              <p className="text-[10px] text-foreground/60 line-clamp-1">
                                {exam.descripcion}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-dashed border-foreground/15 flex items-center gap-2">
                          {!(exam.fileType === "pdf" || exam.fileUrl.toLowerCase().split('?')[0].endsWith(".pdf") || exam.fileName?.toLowerCase().endsWith(".pdf") || exam.fileUrl.includes("/raw/upload/")) ? (
                            <>
                              <a
                                href={`/api/download?url=${encodeURIComponent(exam.fileUrl)}&filename=${encodeURIComponent(exam.fileName || 'examen')}&inline=true`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-1.5 h-8 bg-[#E7BEF8] hover:bg-[#E7BEF8]/80 border border-foreground rounded-md text-[10px] font-black uppercase tracking-wider transition-colors shadow-[1px_1px_0px_0px_#000]"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Ver examen
                              </a>
                              <a
                                href={`/api/download?url=${encodeURIComponent(exam.fileUrl)}&filename=${encodeURIComponent(exam.fileName || 'examen')}`}
                                className="h-8 w-8 flex items-center justify-center bg-[#a8d5ba] hover:bg-[#a8d5ba]/80 border border-foreground rounded-md text-foreground transition-colors shadow-[1px_1px_0px_0px_#000]"
                                title="Descargar"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            </>
                          ) : (
                            <a
                              href={`/api/download?url=${encodeURIComponent(exam.fileUrl)}&filename=${encodeURIComponent(exam.fileName || 'examen')}`}
                              className="flex-1 flex items-center justify-center gap-1.5 h-8 bg-[#a8d5ba] hover:bg-[#a8d5ba]/80 border border-foreground rounded-md text-[10px] font-black uppercase tracking-wider transition-colors shadow-[1px_1px_0px_0px_#000] text-foreground"
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
              );
            })()}

            {selectedDiagnostico?.notas && (
              <div className="p-4 bg-white border-[3px] border-foreground rounded-2xl shadow-[4px_4px_0px_0px_#9bf6ff]">
                <p className="text-[10px] font-black uppercase text-foreground/40 mb-2 flex items-center gap-1"><FileText className="h-3 w-3" /> Notas Clínicas / Plan</p>
                <div className="font-medium text-foreground/80 whitespace-pre-wrap">
                  {selectedDiagnostico.notas}
                </div>
              </div>
            )}

            <Button 
              onClick={() => setSelectedDiagnostico(null)}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/85 border-[3px] border-foreground shadow-[4px_4px_0px_0px_#000000] font-black py-6 rounded-2xl active:translate-y-1 active:shadow-none transition-all"
            >
              Cerrar Ficha
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
