"use client"

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import Image from "next/image"
import { 
  ArrowLeft, Dog, ClipboardList, Syringe, History, Pill, Shield, 
  Stethoscope, User, Info, CheckCircle2, Phone, FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

import { 
  AdminService,
  Cita, 
  Diagnostico, 
  Tratamiento, 
  Preventivo, 
  Vacuna,
  Mascota,
  ExamData
} from "@/lib/admin-service"

// Sub-components (Reusing existing components)
import { DiagnosticosSection } from "@/app/dashboard/components/DiagnosticosSection"
import { TratamientosSection } from "@/app/dashboard/components/TratamientosSection"
import { PreventivosSection } from "@/app/dashboard/components/PreventivosSection"
import { VacunasSection } from "@/app/dashboard/components/VacunasSection"
import { ExamenesSection } from "@/app/dashboard/components/ExamenesSection"
import { AnamnesicosSection } from "@/app/dashboard/components/AnamnesicosSection"
import { HistorialTimeline } from "@/app/dashboard/components/HistorialTimeline"
import { RestrictedAccessOverlay, type MedicalAccessUi } from "@/app/dashboard/components/RestrictedAccessOverlay"
import { MiauLoading } from "@/components/MiauLoading"
import { requestMedicalAccess } from "@/app/actions/medical-permission"
import { formatEcuadorPhoneDisplay } from "@/lib/phone"
import { useScrollToTopOnChange } from "@/hooks/useScrollToTopOnChange"
import { calcularEdad } from "@/lib/utils"

type TabType = "resumen" | "diagnosticos" | "tratamientos" | "preventivos" | "vacunas" | "examenes" | "historial"

function FichaMedicaPageContent({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { id } = React.use(params)
  const citaId = searchParams.get("citaId")
  const { data: session, status } = useSession()
  
  const [activeTab, setActiveTab] = useState<TabType>("resumen")
  useScrollToTopOnChange(activeTab)
  const [pet, setPet] = useState<Mascota | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Data for sections
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([])
  const [tratamientos, setTratamientos] = useState<Tratamiento[]>([])
  const [preventivos, setPreventivos] = useState<Preventivo[]>([])
  const [vacunaciones, setVacunaciones] = useState<Vacuna[]>([])
  const [examenes, setExamenes] = useState<ExamData[]>([])
  const [citas, setCitas] = useState<Cita[]>([])

  // Forms Visibility
  const [showDiagnosticoForm, setShowDiagnosticoForm] = useState(false)
  const [showTratamientoForm, setShowTratamientoForm] = useState(false)
  const [showPreventivoForm, setShowPreventivoForm] = useState(false)
  const [showVacunaForm, setShowVacunaForm] = useState(false)

  // Form states
  const [diagnosticoForm, setDiagnosticoForm] = useState({ mascota: "", diagnostico: "", notas: "" })
  const [tratamientoForm, setTratamientoForm] = useState({ mascota: "", medicamento: "", dosis: "", duracion: "", notas: "" })
  const [preventivoForm, setPreventivoForm] = useState({ mascota: "", tipo: "Desparasitación Interna", fecha: "", proximaFecha: "", dosis: "", notas: "" })
  const [vacunaForm, setVacunaForm] = useState({ mascota: "", dosis: "1ra Dosis", fecha: "", vacunaId: "", proximaFecha: "", periodicidad: "", notas: "" })

  const [medicalPermLoading, setMedicalPermLoading] = useState(true)
  const [medicalPerm, setMedicalPerm] = useState<{ status: string; bypass?: boolean } | null>(null)
  const [requestAccessLoading, setRequestAccessLoading] = useState(false)

  const handleRequestMedicalAccess = useCallback(async () => {
    setRequestAccessLoading(true)
    try {
      const res = await requestMedicalAccess(id)
      if (res.ok && "status" in res && res.status === "PENDING") {
        toast.success("Solicitud enviada al dueño.")
        setMedicalPerm({ status: "PENDING" })
      } else if (res.ok && "status" in res && res.status === "ACCEPTED") {
        toast.info("Ya tenías acceso aceptado al historial.")
        setMedicalPerm({ status: "ACCEPTED" })
      } else {
        toast.error("error" in res && res.error ? res.error : "No se pudo enviar la solicitud.")
      }
    } catch {
      toast.error("Error al solicitar acceso")
    } finally {
      setRequestAccessLoading(false)
    }
  }, [id])

  const medicalAccessProp: MedicalAccessUi | null = useMemo(() => {
    if (!session?.user) return null
    if (session.user.role === "admin") {
      return { canView: true, status: "ADMIN" }
    }
    if (session.user.role !== "veterinario" || !medicalPerm) return null

    // Desbloqueado: admin duplicado | vet de confianza (bypass API) | permiso ACCEPTED
    if (medicalPerm.bypass || medicalPerm.status === "ACCEPTED") {
      return { canView: true, status: medicalPerm.bypass ? "ADMIN" : "ACCEPTED" }
    }

    if (medicalPerm.status === "PENDING") {
      return {
        canView: false,
        status: "PENDING",
        onRequestAccess: handleRequestMedicalAccess,
        requestLoading: requestAccessLoading
      }
    }

    return {
      canView: false,
      status: medicalPerm.status === "REJECTED" ? "REJECTED" : "NONE",
      onRequestAccess: handleRequestMedicalAccess,
      requestLoading: requestAccessLoading
    }
  }, [session, medicalPerm, requestAccessLoading, handleRequestMedicalAccess])

  const isVeterinario = session?.user?.role === "veterinario"
  const medicalAccessDenied =
    isVeterinario &&
    !medicalPermLoading &&
    medicalAccessProp != null &&
    !medicalAccessProp.canView &&
    (medicalAccessProp.status === "NONE" ||
      medicalAccessProp.status === "PENDING" ||
      medicalAccessProp.status === "REJECTED")

  useEffect(() => {
    if (status === "unauthenticated") {
      setMedicalPerm(null)
      setMedicalPermLoading(false)
      return
    }
    if (status !== "authenticated" || !session?.user) return
    if (session.user.role === "admin") {
      setMedicalPerm({ status: "ACCEPTED", bypass: true })
      setMedicalPermLoading(false)
      return
    }
    if (session.user.role !== "veterinario") {
      setMedicalPerm(null)
      setMedicalPermLoading(false)
      return
    }
    let alive = true
    ;(async () => {
      setMedicalPermLoading(true)
      try {
        const r = await fetch(`/api/medical-permission?petId=${encodeURIComponent(id)}`)
        if (!alive) return
        if (!r.ok) {
          setMedicalPerm({ status: "NONE" })
          return
        }
        const d: { status?: string; bypass?: boolean } = await r.json()
        if (d.bypass) {
          setMedicalPerm({ status: "ACCEPTED", bypass: true })
        } else {
          setMedicalPerm({ status: d.status || "NONE" })
        }
      } catch {
        if (alive) setMedicalPerm({ status: "NONE" })
      } finally {
        if (alive) setMedicalPermLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [id, status, session?.user?.role, session?.user?.id])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const petData = await AdminService.getPetById(id)
        if (!petData) {
          setLoading(false)
          toast.error("Mascota no encontrada")
          router.push("/dashboard")
          return
        }
        setPet(petData)
        setDiagnosticoForm(p => ({ ...p, mascota: petData.nombre }))
        setTratamientoForm(p => ({ ...p, mascota: petData.nombre }))
        setPreventivoForm(p => ({ ...p, mascota: petData.nombre }))
        setVacunaForm(p => ({ ...p, mascota: petData.nombre }))

        // Fetch histories
        const [d, t, p, v, c, e] = await Promise.all([
          AdminService.getDiagnosticos(),
          AdminService.getTratamientos(),
          AdminService.getPreventivos(),
          AdminService.getVacunaciones(),
          AdminService.getCitas(),
          AdminService.getExams()
        ])

        setDiagnosticos(d.filter(item => item.petId === id))
        setTratamientos(t.filter(item => item.petId === id))
        setPreventivos(p.filter(item => item.petId === id))
        setVacunaciones(v.filter(item => item.petId === id))
        setCitas(c.filter(item => item.petId === id))
        setExamenes(e.filter(item => item.petId === id))
        
        setLoading(false)
      } catch (error) {
        console.error("Error fetching pet data:", error)
        setLoading(false)
        toast.error("Error al cargar la ficha médica")
      }
    }

    if (status === "authenticated") {
      fetchData()
    } else if (status === "unauthenticated") {
    }
  }, [id, status, router])

  // --- Handlers ---
  const handleBack = () => router.push("/dashboard?tab=mascotas")

  const handleCrearDiagnostico = async (payloadFromChild: any) => {
    try {
      const payload = {
        ...payloadFromChild,
        petId: id,
        appointmentId: citaId || undefined
      }
      const res = await AdminService.saveDiagnostico(payload)
      if (res) {
        setDiagnosticos(prev => [res, ...prev])
        setShowDiagnosticoForm(false)
        toast.success("Diagnóstico guardado. Cita vinculada cerrada.")
        if (citaId) router.push("/dashboard") // Opcional: volver tras completar
      }
    } catch {}
  }

  const handleCrearTratamiento = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = { ...tratamientoForm, petId: id, appointmentId: citaId || undefined }
      const res = await AdminService.saveTratamiento(payload)
      if (res) {
        setTratamientos(prev => [res, ...prev])
        setShowTratamientoForm(false)
        setTratamientoForm((f) => ({ ...f, medicamento: "", dosis: "", duracion: "", notas: "" }))
        toast.success("Tratamiento guardado.")
      }
    } catch {}
  }

  const handleCrearPreventivo = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = { ...preventivoForm, petId: id, appointmentId: citaId || undefined, dosis: preventivos.length + 1 }
      const res = await AdminService.savePreventivo(payload)
      if (res) {
        setPreventivos(prev => [res, ...prev])
        setShowPreventivoForm(false)
        toast.success("Preventivo registrado.")
      }
    } catch {}
  }

  const handleCrearVacunacion = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const periodicidadMeses = parseInt(vacunaForm.periodicidad) || 12
      const proxima = new Date()
      proxima.setMonth(proxima.getMonth() + periodicidadMeses)
      const payload = { 
        ...vacunaForm, 
        petId: id, 
        appointmentId: citaId || undefined,
        proximaFecha: proxima.toISOString().split('T')[0]
      }
      const res = await AdminService.saveVacunacion(payload)
      if (res) {
        setVacunaciones(prev => [res, ...prev])
        setShowVacunaForm(false)
        toast.success("Vacuna registrada.")
      }
    } catch {}
  }

  const handleCrearExamen = async (examData: Omit<ExamData, "id">) => {
    try {
      const res = await AdminService.saveExam(examData)
      if (res) {
        setExamenes(prev => [res, ...prev])
        toast.success("Examen guardado exitosamente.")
        return res
      }
    } catch (error) {
      console.error(error)
      toast.error("Ocurrió un error al guardar el examen.")
    }
    return null
  }

  const handleEliminarExamen = async (examId: string) => {
    try {
      const success = await AdminService.deleteExam(examId)
      if (success) {
        setExamenes(prev => prev.filter(e => e.id !== examId))
        toast.success("Examen eliminado.")
      } else {
        toast.error("No se pudo eliminar el examen.")
      }
    } catch (error) {
      console.error(error)
      toast.error("Error al eliminar el examen.")
    }
  }

  type HistorialItem = (Diagnostico | Tratamiento | Vacuna | Preventivo | Cita) & { tipo: string; descripcion: string }

  const historial: HistorialItem[] = [
    ...diagnosticos.map(d => ({ ...d, tipo: "Diagnóstico", descripcion: d.diagnostico })),
    ...tratamientos.map(t => ({ ...t, tipo: "Tratamiento", descripcion: t.medicamento })),
    ...vacunaciones.map(v => ({ ...v, tipo: "Vacunación", descripcion: v.vacunaId })),
    ...preventivos.map(p => ({ ...p, tipo: "Preventivo", descripcion: p.tipo })),
    ...citas.filter(c => c.estado === "completada").map(c => ({ ...c, tipo: "Cita", descripcion: `${c.tipo} completada` }))
  ].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())

  const citaActivaFinalizar = useMemo(
    () =>
      citas.find(
        (c) =>
          (c.id === citaId || c.petId === id) &&
          c.estado === "confirmada" &&
          c.vetId === session?.user?.id
      ),
    [citas, citaId, id, session?.user?.id]
  )

  if (loading) {
    return <MiauLoading fullScreen />
  }

  return (
    <div className="min-h-screen bg-[#fdfaf5] pb-20">
      {/* Header Neobrutalista */}
      <header className="sticky top-0 z-[100] border-b-[4px] border-foreground bg-white">
        <div className="container mx-auto flex min-h-20 flex-col gap-3 px-4 py-3 lg:h-20 lg:flex-row lg:items-center lg:justify-between lg:py-0">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Button
              variant="outline"
              onClick={handleBack}
              className="h-11 shrink-0 self-start border-[3px] border-foreground font-bold shadow-[3px_3px_0px_0px_#000000] transition-all hover:-translate-y-0.5 sm:self-center rounded-xl px-4"
            >
              <ArrowLeft className="mr-2 h-5 w-5 shrink-0" /> Volver
            </Button>
            <div className="mx-2 hidden h-10 w-[3px] shrink-0 bg-foreground/10 md:block" />
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-[3px] border-foreground bg-[#a8d5ba] shadow-[3px_3px_0px_0px_#000000] transform -rotate-3 sm:h-12 sm:w-12">
                <Dog className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <h1 className="min-w-0 font-heading text-base font-black uppercase leading-tight tracking-tight sm:text-xl lg:text-2xl">
                Ficha Médica:{" "}
                <span className="text-primary break-words">{pet?.nombre}</span>
              </h1>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
            {citaId && (
              <Badge className="animate-pulse border-2 border-foreground bg-[#ffd6a5] px-3 py-2 text-center font-black text-foreground shadow-[2px_2px_0px_0px_#000000] sm:px-4 rounded-lg">
                ATENDIENDO CITA ACTIVA
              </Badge>
            )}
            {citaActivaFinalizar && (
              <Button
                onClick={async () => {
                  const tid = toast.loading("Finalizando atención...")
                  try {
                    const res = await fetch(`/api/appointments/${citaActivaFinalizar.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ estado: "completada" }),
                    })
                    if (res.ok) {
                      toast.success("Atención finalizada y cita completada", { id: tid })
                      setCitas((prev) =>
                        prev.map((c) =>
                          c.id === citaActivaFinalizar.id ? { ...c, estado: "completada" } : c
                        )
                      )
                      router.push("/dashboard?tab=citas")
                    } else {
                      toast.error("Error al finalizar", { id: tid })
                    }
                  } catch {
                    toast.error("Error de red", { id: tid })
                  }
                }}
                className="flex h-11 w-full items-center justify-center gap-2 border-[3px] border-foreground bg-[#93ABD9] font-black text-foreground shadow-[4px_4px_0px_0px_#000000] transition-all hover:bg-[#7f9dca] active:translate-y-1 active:shadow-none sm:h-12 sm:w-auto rounded-xl px-5 sm:px-6"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                Finalizar atención
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-6 md:pt-10 min-w-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
          
          {/* Columna Izquierda: Perfil Mascota */}
          <div className="lg:col-span-4 space-y-8">
            <Card className="border-[4px] border-foreground shadow-[10px_10px_0px_0px_#000000] rounded-[40px] overflow-hidden bg-white p-0 group">
              <div className="h-60 w-full border-b-[4px] border-foreground relative overflow-hidden bg-[#fdfaf5]">
                {pet?.foto ? (
                  <Image
                    src={pet.foto}
                    alt={pet.nombre || "Mascota"}
                    fill
                    loading="lazy"
                    decoding="async"
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Dog className="h-20 w-20 text-foreground/10" />
                  </div>
                )}
              </div>
              <CardContent className="p-4 md:p-7 pt-4 md:pt-7">
                <div className="mb-6">
                  <h3 className="text-4xl font-black capitalize mb-5 italic tracking-tight">{pet?.nombre}</h3>
                  <div className="flex flex-wrap gap-3">
                    <div className="bg-[#bdb2ff] px-4 py-2 rounded-2xl border-[3px] border-foreground flex items-center gap-3 shadow-[3px_3px_0px_0px_#000000]">
                      <span className="text-[10px] font-black uppercase tracking-widest text-foreground/60">RAZA</span>
                      <span className="font-bold text-base">{pet?.raza || "Mestiza"}</span>
                    </div>
                    <div className="bg-[#9bf6ff] px-4 py-2 rounded-2xl border-[3px] border-foreground flex items-center gap-3 shadow-[3px_3px_0px_0px_#000000]">
                      <span className="text-[10px] font-black uppercase tracking-widest text-foreground/60">EDAD</span>
                      <span className="font-bold text-base">{calcularEdad(pet?.fechaNacimiento, pet?.edad, pet?.tipo || pet?.especie, pet?.raza)}</span>
                    </div>
                    {pet?.peso && (
                      <div className="bg-[#ffadad] px-4 py-2 rounded-2xl border-[3px] border-foreground flex items-center gap-3 shadow-[3px_3px_0px_0px_#000000]">
                        <span className="text-[10px] font-black uppercase tracking-widest text-foreground/60">PESO</span>
                        <span className="font-bold text-base">{pet.peso} kg</span>
                      </div>
                    )}
                    {pet?.sexo && (
                      <div className="bg-[#93ABD9] px-4 py-2 rounded-2xl border-[3px] border-foreground flex items-center gap-3 shadow-[3px_3px_0px_0px_#000000]">
                        <span className="text-[10px] font-black uppercase tracking-widest text-foreground/60">SEXO</span>
                        <span className="font-bold text-base">{pet.sexo === "M" ? "Macho" : pet.sexo === "H" ? "Hembra" : pet.sexo}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                    <div className="p-4 bg-foreground/5 rounded-2xl border-2 border-dashed border-foreground/20">
                      <p className="text-xs font-black uppercase text-foreground/40 mb-1 flex items-center gap-2">
                         <User className="h-3 w-3" /> Propietario
                      </p>
                      <p className="font-bold text-lg">{pet?.user?.name || "No registrado"}</p>
                      <p className="text-sm font-medium text-foreground/60">{pet?.user?.email}</p>
                      {pet?.user?.phone && (
                        <p className="text-sm font-black text-primary mt-1 flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {formatEcuadorPhoneDisplay(pet.user.phone) || pet.user.phone}
                        </p>
                      )}
                    </div>
                    {pet?.alergias && (
                      <div className="p-4 bg-red-50 rounded-2xl border-2 border-red-200">
                        <p className="text-xs font-black uppercase text-red-400 mb-1 flex items-center gap-2">
                           <Info className="h-3 w-3" /> Alergias
                        </p>
                        <p className="font-bold text-red-700">{pet.alergias}</p>
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>

            {/* Navegación Rápida */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: "resumen", label: "Anamnésicos", icon: Stethoscope, color: "bg-[#ffd6a5]" },
                { id: "diagnosticos", label: "Revisión y Diagnóstico", icon: ClipboardList, color: "bg-[#93ABD9]" },
                { id: "tratamientos", label: "Tratamientos", icon: Pill, color: "bg-[#9bf6ff]" },
                { id: "vacunas", label: "Vacunación", icon: Syringe, color: "bg-[#bdb2ff]" },
                { id: "preventivos", label: "Preventivos", icon: Shield, color: "bg-[#fdffb6]" },
                { id: "examenes", label: "Exámenes", icon: FileText, color: "bg-[#ffc6ff]" },
                { id: "historial", label: "Historial", icon: History, color: "bg-[#a8d5ba]" },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as TabType)}
                  className={`p-4 rounded-2xl border-[3px] border-foreground font-black text-sm flex flex-col items-center gap-2 transition-all shadow-[4px_4px_0px_0px_#000000] active:shadow-none active:translate-x-1 active:translate-y-1 ${item.color} ${activeTab === item.id ? 'ring-4 ring-primary/20 scale-105' : 'opacity-80'}`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Columna Derecha: Contenido de Secciones */}
          <div className="lg:col-span-8">
            {activeTab === "resumen" && (
              <div className="space-y-8">
                <AnamnesicosSection selectedPetId={id} selectedPatient={pet?.nombre || ""} />

                  <div className="grid md:grid-cols-3 gap-6">
                     <Card className="border-[3px] border-foreground shadow-[6px_6px_0px_0px_#000000] rounded-3xl p-6 bg-white hover:bg-[#93ABD9]/10 transition-colors cursor-pointer" onClick={() => setActiveTab("diagnosticos")}>
                        <h4 className="font-black text-xl mb-2 flex items-center gap-2"> Revision y Diagnósticos <ArrowLeft className="h-4 w-4 rotate-180" /></h4>
                        <p className="text-sm font-medium text-foreground/60">Registrar hallazgos clínicos y notas del paciente.</p>
                     </Card>
                     <Card className="border-[3px] border-foreground shadow-[6px_6px_0px_0px_#000000] rounded-3xl p-6 bg-white hover:bg-[#bdb2ff]/10 transition-colors cursor-pointer" onClick={() => setActiveTab("vacunas")}>
                        <h4 className="font-black text-xl mb-2 flex items-center gap-2"> Vacunación <ArrowLeft className="h-4 w-4 rotate-180" /></h4>
                        <p className="text-sm font-medium text-foreground/60">Administrar y programar nuevas dosis de vacunas.</p>
                     </Card>
                     <Card className="border-[3px] border-foreground shadow-[6px_6px_0px_0px_#000000] rounded-3xl p-6 bg-white hover:bg-[#a8d5ba]/10 transition-colors cursor-pointer" onClick={() => setActiveTab("historial")}>
                        <h4 className="font-black text-xl mb-2 flex items-center gap-2"> Historial <ArrowLeft className="h-4 w-4 rotate-180" /></h4>
                        <p className="text-sm font-medium text-foreground/60">Ver cronología completa de salud y atenciones.</p>
                     </Card>
                  </div>
              </div>
            )}

            {activeTab === "diagnosticos" && (
              <DiagnosticosSection 
                diagnosticos={diagnosticos} 
                mascotas={[pet!]} 
                selectedPetId={id}
                selectedPatient={pet?.nombre || null}
                showForm={showDiagnosticoForm}
                setShowForm={setShowDiagnosticoForm}
                onBack={() => setActiveTab("resumen")}
                onSubmit={handleCrearDiagnostico}
                onAddExam={handleCrearExamen}
                exams={examenes}
              />
            )}

            {activeTab === "tratamientos" && (
              <TratamientosSection 
                tratamientos={tratamientos} 
                mascotas={[pet!]} 
                selectedPetId={id}
                selectedPatient={pet?.nombre || null}
                showForm={showTratamientoForm}
                setShowForm={setShowTratamientoForm}
                onBack={() => setActiveTab("resumen")}
                onSubmit={handleCrearTratamiento}
                form={tratamientoForm}
                setForm={setTratamientoForm}
              />
            )}

            {activeTab === "preventivos" && (
              <PreventivosSection 
                preventivos={preventivos} 
                mascotas={[pet!]} 
                selectedPetId={id}
                selectedPatient={pet?.nombre || null}
                showForm={showPreventivoForm}
                setShowForm={setShowPreventivoForm}
                onBack={() => setActiveTab("resumen")}
                onSubmit={handleCrearPreventivo}
                form={preventivoForm}
                setForm={setPreventivoForm}
              />
            )}

            {activeTab === "vacunas" && (
              <VacunasSection 
                vacunaciones={vacunaciones} 
                mascotas={[pet!]} 
                selectedPetId={id}
                selectedPatient={pet?.nombre || null}
                showForm={showVacunaForm}
                setShowForm={setShowVacunaForm}
                onBack={() => setActiveTab("resumen")}
                onSubmit={handleCrearVacunacion}
                form={vacunaForm}
                setForm={setVacunaForm}
              />
            )}

            {activeTab === "examenes" && (
              <ExamenesSection
                exams={examenes}
                selectedPatient={pet?.nombre || ""}
                selectedPetId={id}
                onAddExam={handleCrearExamen}
                onDeleteExam={handleEliminarExamen}
              />
            )}

            {activeTab === "historial" && (
              <HistorialTimeline
                selectedPetId={id}
                mascotas={[pet!]}
                historial={historial}
                onBack={() => setActiveTab("resumen")}
              />
            )}
          </div>
        </div>
      </main>

      {isVeterinario && medicalPermLoading && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 p-4 backdrop-blur-md"
          aria-busy="true"
          aria-label="Cargando permisos"
        >
          <div className="rounded-3xl border-[3px] border-foreground bg-[#FDF9F0] px-8 py-6 font-black shadow-[6px_6px_0px_0px_#000000]">
            Cargando permisos…
          </div>
        </div>
      )}

      {medicalAccessDenied && pet && (
        <RestrictedAccessOverlay
          patientName={pet.nombre}
          ownerName={pet.user?.name || pet.dueno || "Propietario no registrado"}
          status={
            medicalAccessProp!.status === "PENDING"
              ? "PENDING"
              : medicalAccessProp!.status === "REJECTED"
                ? "REJECTED"
                : "NONE"
          }
          onRequestAccess={medicalAccessProp?.onRequestAccess}
          requestLoading={requestAccessLoading}
        />
      )}
    </div>
  )
}

export default function FichaMedicaPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<MiauLoading text="Cargando ficha médica..." />}>
      <FichaMedicaPageContent params={params} />
    </Suspense>
  )
}
