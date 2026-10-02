"use client"

import React, { useState, useEffect } from "react"
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { AdminService } from "@/lib/admin-service"
import { Textarea } from "@/components/ui/textarea"

interface AnamnesicosSectionProps {
  selectedPetId: string
  selectedPatient: string
}

export const AnamnesicosSection: React.FC<AnamnesicosSectionProps> = ({
  selectedPetId,
  selectedPatient,
}) => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    ultimaDesparasitacion: "",
    vacunas: "",
    enfermedadesAnteriores: "",
    tratamientos: "",
    evolucion: "",
    alimentacion: "",
    historiaReproductiva: "",
    ultimoCelo: "",
    fechaUltimoParto: "",
  })

  useEffect(() => {
    const fetchAnamnesico = async () => {
      try {
        const data = await AdminService.getAnamnesico(selectedPetId)
        if (data) {
          setFormData({
            ultimaDesparasitacion: data.ultimaDesparasitacion || "",
            vacunas: data.vacunas || "",
            enfermedadesAnteriores: data.enfermedadesAnteriores || "",
            tratamientos: data.tratamientos || "",
            evolucion: data.evolucion || "",
            alimentacion: data.alimentacion || "",
            historiaReproductiva: data.historiaReproductiva || "",
            ultimoCelo: data.ultimoCelo || "",
            fechaUltimoParto: data.fechaUltimoParto || "",
          })
        }
      } catch (error) {
        console.error("Error fetching anamnesico:", error)
      } finally {
        setLoading(false)
      }
    }
    
    if (selectedPetId) {
      fetchAnamnesico()
    }
  }, [selectedPetId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await AdminService.saveAnamnesico({
        petId: selectedPetId,
        ...formData
      })
      if (res) {
        toast.success("Anamnésicos guardados exitosamente")
      } else {
        toast.error("Error al guardar anamnésicos")
      }
    } catch (error) {
      console.error(error)
      toast.error("Error de red")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-[#a8d5ba] border-[4px] border-foreground p-4 md:p-8 rounded-[40px] shadow-[10px_10px_0px_0px_#000000] flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="bg-[#a8d5ba] border-[4px] border-foreground p-4 md:p-8 rounded-[40px] shadow-[10px_10px_0px_0px_#000000]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-3xl font-black uppercase tracking-tight">Anamnésicos</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-black text-sm uppercase tracking-wide">Última Desparasitación (Fecha, Producto)</Label>
              <Input
                value={formData.ultimaDesparasitacion}
                onChange={(e) => setFormData({ ...formData, ultimaDesparasitacion: e.target.value })}
                placeholder="Ej. NA o 12/05/2023 - Nexgard"
                className="h-12 bg-white/80 border-2 border-foreground rounded-xl font-bold shadow-[2px_2px_0px_0px_#000000]"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="font-black text-sm uppercase tracking-wide">Vacunas (Fecha/Marca/Lote)</Label>
              <Input
                value={formData.vacunas}
                onChange={(e) => setFormData({ ...formData, vacunas: e.target.value })}
                placeholder="Ej. NA o Sextuple 10/10/2023"
                className="h-12 bg-white/80 border-2 border-foreground rounded-xl font-bold shadow-[2px_2px_0px_0px_#000000]"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="font-black text-sm uppercase tracking-wide">Enfermedades Anteriores</Label>
              <Input
                value={formData.enfermedadesAnteriores}
                onChange={(e) => setFormData({ ...formData, enfermedadesAnteriores: e.target.value })}
                className="h-12 bg-white/80 border-2 border-foreground rounded-xl font-bold shadow-[2px_2px_0px_0px_#000000]"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="font-black text-sm uppercase tracking-wide">Tratamientos</Label>
              <Input
                value={formData.tratamientos}
                onChange={(e) => setFormData({ ...formData, tratamientos: e.target.value })}
                className="h-12 bg-white/80 border-2 border-foreground rounded-xl font-bold shadow-[2px_2px_0px_0px_#000000]"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="font-black text-sm uppercase tracking-wide">Evolución</Label>
              <Input
                value={formData.evolucion}
                onChange={(e) => setFormData({ ...formData, evolucion: e.target.value })}
                className="h-12 bg-white/80 border-2 border-foreground rounded-xl font-bold shadow-[2px_2px_0px_0px_#000000]"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="font-black text-sm uppercase tracking-wide">Alimentación</Label>
              <Input
                value={formData.alimentacion}
                onChange={(e) => setFormData({ ...formData, alimentacion: e.target.value })}
                className="h-12 bg-white/80 border-2 border-foreground rounded-xl font-bold shadow-[2px_2px_0px_0px_#000000]"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-black text-sm uppercase tracking-wide">Historia Reproductiva</Label>
              <select
                value={formData.historiaReproductiva}
                onChange={(e) => setFormData({ ...formData, historiaReproductiva: e.target.value })}
                className="h-12 w-full bg-white/80 border-2 border-foreground rounded-xl font-bold shadow-[2px_2px_0px_0px_#000000] px-3 appearance-none cursor-pointer"
              >
                <option value="">Selecciona...</option>
                <option value="Entero">Entero</option>
                <option value="Esterilizado / Castrado">Esterilizado / Castrado</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-black text-sm uppercase tracking-wide">Último Celo</Label>
                <Input
                  value={formData.ultimoCelo}
                  onChange={(e) => setFormData({ ...formData, ultimoCelo: e.target.value })}
                  className="h-12 bg-white/80 border-2 border-foreground rounded-xl font-bold shadow-[2px_2px_0px_0px_#000000]"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-sm uppercase tracking-wide">Fecha Último Parto</Label>
                <Input
                  value={formData.fechaUltimoParto}
                  onChange={(e) => setFormData({ ...formData, fechaUltimoParto: e.target.value })}
                  className="h-12 bg-white/80 border-2 border-foreground rounded-xl font-bold shadow-[2px_2px_0px_0px_#000000]"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button 
              type="submit" 
              disabled={saving}
              className="bg-white hover:bg-white/80 text-foreground border-[3px] border-foreground font-black shadow-[4px_4px_0px_0px_#000000] rounded-xl h-12 px-6 transition-all active:translate-y-1 active:shadow-[0px_0px_0px_0px_#000000]"
            >
              {saving ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Guardando...</>
              ) : (
                <><Save className="mr-2 h-5 w-5" /> Guardar Anamnésicos</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
