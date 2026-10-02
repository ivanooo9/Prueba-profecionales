"use client"

import React, { useState, useEffect, useRef } from "react"
import { FileText, Plus, Trash2, Calendar, File, UploadCloud, X, Loader2, Download, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ExamData } from "@/lib/admin-service"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import Image from "next/image"
import { ConfirmModal } from "@/components/ui/confirm-modal"

interface ExamenesSectionProps {
  exams: ExamData[]
  selectedPatient: string
  selectedPetId: string
  onAddExam: (e: Omit<ExamData, "id">) => Promise<any>
  onDeleteExam: (id: string) => Promise<void>
}

export const ExamenesSection: React.FC<ExamenesSectionProps> = ({
  exams,
  selectedPatient,
  selectedPetId,
  onAddExam,
  onDeleteExam,
}) => {
  const [showAddForm, setShowAddForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [examIdToDelete, setExamIdToDelete] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    titulo: "",
    fecha: new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" }),
    descripcion: "",
  })
  
  const [files, setFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files).filter(f => f.type.includes('image') || f.type === 'application/pdf')
      if (selected.length > 0) {
        setFiles(prev => [...prev, ...selected])
      } else {
        toast.error("Formato no soportado. Solo PDF e Imágenes.")
      }
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (files.length === 0) {
      toast.error("Por favor selecciona al menos un archivo (PDF o Imagen).")
      return
    }

    if (!selectedPatient || !selectedPetId) {
      toast.error("Error: Paciente no identificado")
      return
    }

    try {
      setIsSubmitting(true)
      
      for (const file of files) {
        // 1. Subir a Cloudinary
        const uploadData = new FormData()
        uploadData.append('file', file)
        
        const uploadRes = await fetch('/api/upload/exam', {
          method: 'POST',
          body: uploadData
        })
        
        if (!uploadRes.ok) throw new Error(`Error al subir archivo ${file.name} a Cloudinary`)
        const uploadResult = await uploadRes.json()
        
        // Determinar el tipo para la DB
        const fileType = (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) ? 'pdf' : 'image'

        // 2. Guardar en BD
        const examData = {
          mascota: selectedPatient,
          petId: selectedPetId,
          fecha: formData.fecha,
          titulo: formData.titulo || file.name,
          descripcion: formData.descripcion,
          fileUrl: uploadResult.secure_url || uploadResult.url,
          fileType: fileType,
          fileName: file.name
        }

        await onAddExam(examData)
      }

      toast.success("Todos los exámenes fueron guardados exitosamente.")

      // Limpiar
      setFormData({
        titulo: "",
        fecha: new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" }),
        descripcion: "",
      })
      setFiles([])
      if (fileInputRef.current) fileInputRef.current.value = ''
      setShowAddForm(false)

    } catch (error) {
      console.error(error)
      toast.error("Ocurrió un error al guardar los exámenes.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = (id: string) => {
    setExamIdToDelete(id)
    setDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (examIdToDelete) {
      try {
        await onDeleteExam(examIdToDelete)
      } catch (error) {
        console.error(error)
      } finally {
        setDeleteModalOpen(false)
        setExamIdToDelete(null)
      }
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-black font-heading">Exámenes Médicos</h2>
          {selectedPetId && (
            <p className="font-bold text-lg mt-2 italic text-foreground/70">Viendo exámenes de <span className="font-black bg-[#ffb5a7] px-2 py-1 border-[2px] border-foreground rounded-lg ml-1 shadow-[2px_2px_0px_0px_#000000]">{selectedPatient}</span></p>
          )}
        </div>
        {!showAddForm && (
          <Button 
            onClick={() => setShowAddForm(true)}
            className="h-12 bg-[#ffb5a7] hover:bg-[#ffb5a7]/80 text-foreground border-[3px] border-foreground font-black shadow-[4px_4px_0px_0px_#000000] rounded-xl transition-all active:translate-y-1 active:shadow-[0px_0px_0px_0px_#000000]"
          >
            <Plus className="mr-2 h-5 w-5" />
            Nuevo Examen
          </Button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white border-[3px] border-foreground p-6 rounded-2xl shadow-[6px_6px_0px_0px_#000000] space-y-4 mb-8 relative">
          <div className="absolute top-4 right-4">
            <Button 
              type="button"
              variant="ghost" 
              onClick={() => {
                setShowAddForm(false)
                setFiles([])
                setFormData({
                  titulo: "",
                  fecha: new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" }),
                  descripcion: "",
                })
              }}
              className="h-8 w-8 p-0 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <h3 className="text-xl font-black mb-4 flex items-center gap-2">
            <FileText className="h-6 w-6 text-[#ffb5a7]" />
            Subir Nuevo Examen
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-black text-sm uppercase tracking-wide">Título del Examen</Label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ej. Radiografía Torácica, Examen de Sangre..."
                className="h-12 border-2 border-foreground rounded-xl font-bold shadow-[2px_2px_0px_0px_#000000]"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="font-black text-sm uppercase tracking-wide">Fecha</Label>
              <Input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="h-12 border-2 border-foreground rounded-xl font-bold shadow-[2px_2px_0px_0px_#000000]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-black text-sm uppercase tracking-wide">Notas / Descripción (Opcional)</Label>
            <Input
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Detalles adicionales sobre el examen..."
              className="h-12 border-2 border-foreground rounded-xl font-bold shadow-[2px_2px_0px_0px_#000000]"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-black text-sm uppercase tracking-wide">Archivos (PDF o Imagen)</Label>
            <div className="space-y-3">
              <label className="flex items-center justify-center border-2 border-dashed border-foreground/40 bg-foreground/5 rounded-xl h-20 cursor-pointer hover:bg-foreground/10 transition-colors">
                <div className="flex flex-col items-center gap-1 text-foreground/60">
                  <UploadCloud className="h-6 w-6" />
                  <span className="font-bold text-xs">Seleccionar archivos (PDF o Imagen)</span>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange} 
                  accept="application/pdf,image/*" 
                  multiple
                  className="hidden" 
                />
              </label>

              {files.length > 0 && (
                <div className="space-y-1.5 max-h-32 overflow-y-auto border-2 border-foreground/10 rounded-xl p-2 bg-foreground/5">
                  {files.map((f, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 p-1.5 rounded-lg border border-foreground/15 bg-white text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        {f.type === 'application/pdf' ? (
                          <File className="h-4 w-4 text-red-400 shrink-0" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-blue-400 shrink-0" />
                        )}
                        <span className="font-bold truncate text-foreground/80">{f.name}</span>
                        <span className="text-[10px] text-foreground/40 shrink-0">({(f.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="h-5 w-5 flex items-center justify-center rounded-full hover:bg-red-100 text-red-500 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Button 
            type="submit"
            disabled={isSubmitting || files.length === 0}
            className="w-full h-12 bg-[#ffb5a7] hover:bg-[#ffb5a7]/80 text-foreground border-[3px] border-foreground font-black shadow-[4px_4px_0px_0px_#000000] rounded-xl transition-all active:translate-y-1 active:shadow-none disabled:opacity-50 mt-4"
          >
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Guardando Exámenes...</>
            ) : (
              <><Plus className="mr-2 h-5 w-5" /> Guardar Exámenes ({files.length})</>
            )}
          </Button>
        </form>
      )}

      {exams.length === 0 && !showAddForm ? (
        <div className="text-center py-12 bg-white/50 border-2 border-dashed border-foreground/30 rounded-2xl">
          <FileText className="mx-auto h-12 w-12 text-foreground/20 mb-3" />
          <p className="text-lg font-bold text-foreground/60">Aún no hay exámenes registrados para esta mascota.</p>
          <Button 
            variant="outline" 
            onClick={() => setShowAddForm(true)}
            className="mt-4 border-2 border-foreground font-bold"
          >
            Subir el primer examen
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => (
            <div key={exam.id} className="bg-white border-[3px] border-foreground rounded-2xl p-5 shadow-[6px_6px_0px_0px_#000000] flex flex-col transition-all hover:-translate-y-1">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl border-2 border-foreground shadow-[2px_2px_0px_0px_#000000] ${exam.fileType === 'pdf' ? 'bg-red-200' : 'bg-blue-200'}`}>
                    {exam.fileType === 'pdf' ? (
                      <File className="h-5 w-5" />
                    ) : (
                      <ImageIcon className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-lg leading-tight line-clamp-1" title={exam.titulo}>{exam.titulo}</h3>
                    <p className="text-xs font-bold text-foreground/60 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {exam.fecha}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg shrink-0"
                  onClick={() => exam.id && handleDelete(exam.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {exam.descripcion && (
                <p className="text-sm font-medium mb-4 line-clamp-2 text-foreground/80 flex-grow">
                  {exam.descripcion}
                </p>
              )}

              {/* Preview si es imagen, o icono grande si es pdf */}
              <div className="h-32 w-full bg-slate-100 rounded-xl border-2 border-foreground/10 flex items-center justify-center overflow-hidden mb-4 relative">
                {(exam.fileType === "pdf" || exam.fileUrl.toLowerCase().split('?')[0].endsWith(".pdf") || exam.fileName?.toLowerCase().endsWith(".pdf") || exam.fileUrl.includes("/raw/upload/")) ? (
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-red-400 mx-auto opacity-50 mb-1" />
                    <span className="text-xs font-bold text-foreground/50 uppercase">Documento PDF</span>
                  </div>
                ) : (
                  <Image 
                    src={exam.fileUrl} 
                    alt={exam.titulo} 
                    fill 
                    className="object-cover"
                  />
                )}
              </div>

               <div className="mt-auto pt-4 border-t-2 border-dashed border-foreground/20 flex gap-2">
                {!(exam.fileType === "pdf" || exam.fileUrl.toLowerCase().split('?')[0].endsWith(".pdf") || exam.fileName?.toLowerCase().endsWith(".pdf") || exam.fileUrl.includes("/raw/upload/")) ? (
                  <>
                    <a 
                      href={`/api/download?url=${encodeURIComponent(exam.fileUrl)}&filename=${encodeURIComponent(exam.fileName || 'examen')}&inline=true`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 h-10 bg-[#f8f9fa] hover:bg-[#e9ecef] border-2 border-foreground rounded-xl font-black text-xs uppercase tracking-wide transition-colors"
                    >
                      Ver Archivo
                    </a>
                    <a 
                      href={`/api/download?url=${encodeURIComponent(exam.fileUrl)}&filename=${encodeURIComponent(exam.fileName || 'examen')}`}
                      className="h-10 w-10 flex items-center justify-center bg-[#a8d5ba] hover:bg-[#90c9a7] border-2 border-foreground rounded-xl text-foreground transition-colors"
                      title="Descargar"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </>
                ) : (
                  <a 
                    href={`/api/download?url=${encodeURIComponent(exam.fileUrl)}&filename=${encodeURIComponent(exam.fileName || 'examen')}`}
                    className="flex-1 flex items-center justify-center gap-2 h-10 bg-[#a8d5ba] hover:bg-[#90c9a7] border-2 border-foreground rounded-xl font-black text-xs uppercase tracking-wide transition-colors text-foreground"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar PDF
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setExamIdToDelete(null)
        }}
        onConfirm={handleConfirmDelete}
        title="¿Eliminar Examen?"
        description="Esta acción no se puede deshacer y borrará el archivo de examen de forma permanente de la ficha médica."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
      />
    </div>
  )
}
