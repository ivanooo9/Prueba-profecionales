"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Stethoscope, LogOut, Calendar, PawPrint, ClipboardList,
  History, Pill, Shield, Syringe, ArrowLeft, User
} from "lucide-react"
import { formatDate } from "@/lib/utils"
import { NotificationMetadata } from "@/lib/notification"
import { 
  AdminService,
  Cita, 
  Diagnostico, 
  Tratamiento, 
  Preventivo, 
  Vacuna,
  Mascota
} from "@/lib/admin-service"

// Sub-components
import { CitasTab } from "./components/CitasTab"
import { PatientsTab } from "./components/PatientsTab"
import { DiagnosticosSection } from "./components/DiagnosticosSection"
import { TratamientosSection } from "./components/TratamientosSection"
import { PreventivosSection } from "./components/PreventivosSection"
import { VacunasSection } from "./components/VacunasSection"
import { HistorialTimeline } from "./components/HistorialTimeline"
import { RestrictedAccessOverlay, type MedicalAccessUi } from "./components/RestrictedAccessOverlay"
import { requestMedicalAccess } from "@/app/actions/medical-permission"
import { RegisterPatientModal } from "./components/RegisterPatientModal"
import { RescheduleModal } from "./components/RescheduleModal"
import { MiCuentaTab } from "./components/MiCuentaTab"
import { VetActivityTab } from "./components/VetActivityTab"
import { CitaRapidaModal } from "./components/CitaRapidaModal"
import { CitaInvitadoModal } from "./components/CitaInvitadoModal"
import { AdminNotificationBell } from "@/components/AdminNotificationBell"
import { MiauLoading } from "@/components/MiauLoading"
import { useScrollToTopOnChange } from "@/hooks/useScrollToTopOnChange"

const DASHBOARD_NOTIFICATIONS_503_TOAST_ID = "dashboard-notifications-503"

type TabType = "citas" | "mascotas" | "diagnosticos" | "tratamientos" | "historial" | "preventivos" | "vacunas" | "mi-perfil" | "actividad"

interface TabItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string | null;
  metadata?: NotificationMetadata;
}


function DashboardContent() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab") as TabType | null
  const [activeTab, setActiveTab] = useState<TabType>(tabParam || "citas")

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [tabParam])
  useScrollToTopOnChange(activeTab)
  const [preventivos, setPreventivos] = useState<Preventivo[]>([])
  const [vacunaciones, setVacunaciones] = useState<Vacuna[]>([])
  const [showDiagnosticoForm, setShowDiagnosticoForm] = useState(false)
  const [showTratamientoForm, setShowTratamientoForm] = useState(false)
  const [showPreventivoForm, setShowPreventivoForm] = useState(false)
  const [showVacunaForm, setShowVacunaForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null)

  const [citas, setCitas] = useState<Cita[]>([])
  const [mascotas, setMascotas] = useState<Mascota[]>([])
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([])
  const [tratamientos, setTratamientos] = useState<Tratamiento[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [hasLocalData, setHasLocalData] = useState(false)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false)
  const [selectedCitaForReschedule, setSelectedCitaForReschedule] = useState<Cita | null>(null)
  const [isCitaRapidaOpen, setIsCitaRapidaOpen] = useState(false)
  const [isInvitadoOpen, setIsInvitadoOpen] = useState(false)
  
  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([])
  const hasFetchedDashboardDataRef = useRef(false)
  const dashboardFetchInFlightRef = useRef(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications")
      if (res.ok) {
        toast.dismiss(DASHBOARD_NOTIFICATIONS_503_TOAST_ID)
        const data = await res.json()
        setNotifications(data)
        return
      }
      if (res.status === 503) {
        let message =
          "Las notificaciones no están disponibles temporalmente (el servidor tardó en responder)."
        try {
          const err = (await res.json()) as { message?: string }
          if (typeof err?.message === "string" && err.message.trim()) {
            message = err.message.trim()
          }
        } catch {
          /* body may be empty */
        }
        toast.error(message, {
          id: DASHBOARD_NOTIFICATIONS_503_TOAST_ID,
          duration: 20000,
          action: {
            label: "Reintentar",
            onClick: () => {
              void fetchNotifications()
            },
          },
        })
        return
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }, [])

  const processReminders = useCallback(() => {
    try {
      fetch("/api/admin/reminders/process")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && (data.processed.today > 0 || data.processed.twoDays > 0)) {
            fetchNotifications()
          }
        })
    } catch (error) {
      console.error("Error processing reminders:", error)
    }
  }, [fetchNotifications])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const localMascotas = AdminService.get("mascotas", [])
      const localCitas = AdminService.get("citas", [])
      setHasLocalData(localMascotas.length > 0 || localCitas.length > 0)
    }
  }, [])

  const fetchDashboardData = useCallback(async (force = false) => {
    if (dashboardFetchInFlightRef.current) return
    if (hasFetchedDashboardDataRef.current && !force) return

    dashboardFetchInFlightRef.current = true
    try {
      const [citasData, diagnosticosData, tratamientosData, petsData, preventivesData, vaccinationsData] = await Promise.all([
        AdminService.getCitas(),
        AdminService.getDiagnosticos(),
        AdminService.getTratamientos(),
        AdminService.getPatients(),
        AdminService.getPreventivos(),
        AdminService.getVacunaciones()
      ])

      setCitas(citasData)
      setDiagnosticos(diagnosticosData)
      setTratamientos(tratamientosData)
      setMascotas(petsData)
      setPreventivos(preventivesData)
      setVacunaciones(vaccinationsData)
      hasFetchedDashboardDataRef.current = true
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      toast.error("Error al cargar datos de la base de datos")
    } finally {
      dashboardFetchInFlightRef.current = false
    }
  }, [])

  useEffect(() => {
    if (status === "authenticated") {
      void fetchDashboardData()
      void fetchNotifications()
      processReminders()

      const interval = setInterval(() => {
        void fetchNotifications()
      }, 10000)
      return () => clearInterval(interval)
    }
  }, [status, fetchDashboardData, fetchNotifications, processReminders])

  const handleMarkAsRead = useCallback(async (id: string) => {
    try {
      const res = await fetch("/api/notifications", { 
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      })
      if (res.ok) {
        setNotifications((prev) => prev.map(n => n.id === id ? { ...n, read: true } : n))
      }
    } catch (error) {
      console.error("Error marking as read:", error)
    }
  }, [])

  const handleDeleteAllNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { method: "DELETE" })
      if (res.ok) {
        setNotifications([])
      }
    } catch (error) {
      console.error("Error deleting notifications:", error)
    }
  }, [])

  const handleNotificationDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      })
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id))
      }
    } catch (error) {
      console.error("Error deleting notification:", error)
    }
  }, [])

  const handleNotificationClick = useCallback((n: Notification) => {
    handleMarkAsRead(n.id)

    if (n.actionUrl) {
      if (n.actionUrl.startsWith("/")) {
        router.push(n.actionUrl)
      } else {
        window.location.assign(n.actionUrl)
      }
      return
    }
    
    // Redirect logic: Reminders or appointment-related notifications take the vet to "Citas"
    if (n.type === "vet_support" || n.type === "appointment_reminder" || n.type === "appointment_confirmation") {
      setActiveTab("citas")
      setSelectedPetId(null)
    } else if (n.type === "medical_vaccine" || n.type === "medical_preventive") {
      // If it's a medical record notification, we could potentially open that pet's file
      // but for now, "Citas" or "Mascotas" is a safe bet for a Vet dashboard
      setActiveTab("mascotas")
    }
  }, [handleMarkAsRead, router])

  const refreshPatients = useCallback(async () => {
    try {
      const petsData = await AdminService.getPatients()
      setMascotas(petsData)
    } catch (error) {
      console.error("Error refreshing patients:", error)
    }
  }, [])

  const handleRegisterSuccess = useCallback(async (result?: { user: { id: string; name: string; email: string }; pet: Mascota }) => {
    await refreshPatients()
    if (result?.pet?.id) {
      router.push(`/dashboard/veterinario/mascotas/${result.pet.id}/ficha-medica`)
    }
  }, [refreshPatients, router])

  const [diagnosticoForm, setDiagnosticoForm] = useState({ mascota: "", diagnostico: "", notas: "" })
  const [tratamientoForm, setTratamientoForm] = useState({ mascota: "", medicamento: "", dosis: "", duracion: "", notas: "" })
  const [preventivoForm, setPreventivoForm] = useState({ mascota: "", tipo: "Desparasitación Interna", fecha: "", proximaFecha: "", dosis: "", notas: "" })
  const [vacunaForm, setVacunaForm] = useState({ mascota: "", dosis: "1ra Dosis", fecha: "", vacunaId: "", proximaFecha: "", periodicidad: "", notas: "" })

  const [medicalPermLoading, setMedicalPermLoading] = useState(false)
  const [medicalPerm, setMedicalPerm] = useState<{ status: string; bypass?: boolean } | null>(null)
  const [requestAccessLoading, setRequestAccessLoading] = useState(false)

  const handleRequestMedicalAccessDashboard = React.useCallback(async () => {
    if (!selectedPetId) return
    setRequestAccessLoading(true)
    try {
      const res = await requestMedicalAccess(selectedPetId)
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
  }, [selectedPetId])

  const medicalAccessForHistorial: MedicalAccessUi | null = React.useMemo(() => {
    if (!selectedPetId || !session?.user) return null
    if (session.user.role === "admin") {
      return { canView: true, status: "ADMIN" }
    }
    if (session.user.role !== "veterinario" || !medicalPerm) return null

    if (medicalPerm.bypass || medicalPerm.status === "ACCEPTED") {
      return { canView: true, status: medicalPerm.bypass ? "ADMIN" : "ACCEPTED" }
    }

    if (medicalPerm.status === "PENDING") {
      return {
        canView: false,
        status: "PENDING",
        onRequestAccess: handleRequestMedicalAccessDashboard,
        requestLoading: requestAccessLoading
      }
    }

    return {
      canView: false,
      status: medicalPerm.status === "REJECTED" ? "REJECTED" : "NONE",
      onRequestAccess: handleRequestMedicalAccessDashboard,
      requestLoading: requestAccessLoading
    }
  }, [selectedPetId, session, medicalPerm, requestAccessLoading, handleRequestMedicalAccessDashboard])

  const isVeterinarioDashboard = session?.user?.role === "veterinario"
  const selectedPet = selectedPetId ? mascotas.find((m) => m.id === selectedPetId) : undefined
  const medicalAccessDeniedDashboard =
    isVeterinarioDashboard &&
    Boolean(selectedPetId) &&
    !medicalPermLoading &&
    medicalAccessForHistorial != null &&
    !medicalAccessForHistorial.canView &&
    (medicalAccessForHistorial.status === "NONE" ||
      medicalAccessForHistorial.status === "PENDING" ||
      medicalAccessForHistorial.status === "REJECTED")

  React.useEffect(() => {
    if (status !== "authenticated" || !session?.user || !selectedPetId) {
      setMedicalPerm(null)
      setMedicalPermLoading(false)
      return
    }
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
        const r = await fetch(`/api/medical-permission?petId=${encodeURIComponent(selectedPetId)}`)
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
  }, [selectedPetId, status, session?.user, session?.user?.role, session?.user?.id])

  const patientsWithVisits = React.useMemo(() => {
    return mascotas.map((m: Mascota) => {
      const clinicalRecords = [
        ...diagnosticos.filter((d: Diagnostico) => d.mascota === m.nombre || d.petId === m.id),
        ...vacunaciones.filter((v: Vacuna) => v.mascota === m.nombre || v.petId === m.id),
        ...preventivos.filter((p: Preventivo) => p.mascota === m.nombre || p.petId === m.id),
        ...tratamientos.filter((t: Tratamiento) => t.mascota === m.nombre || t.petId === m.id)
      ]
      const completedAppointments = citas.filter(
        (c: Cita) => c.estado === "completada" && (c.mascota === m.nombre || c.petId === m.id)
      )
      const petRecords = [...clinicalRecords, ...completedAppointments].sort((a, b) => {
        const dateA = new Date(
          (a as { updatedAt?: string; createdAt?: string; fecha?: string }).updatedAt ||
          (a as { updatedAt?: string; createdAt?: string; fecha?: string }).createdAt ||
          (a as { updatedAt?: string; createdAt?: string; fecha?: string }).fecha ||
          0
        ).getTime();
        const dateB = new Date(
          (b as { updatedAt?: string; createdAt?: string; fecha?: string }).updatedAt ||
          (b as { updatedAt?: string; createdAt?: string; fecha?: string }).createdAt ||
          (b as { updatedAt?: string; createdAt?: string; fecha?: string }).fecha ||
          0
        ).getTime();
        return dateB - dateA;
      });

      const latestRecord = petRecords[0] as
        | { updatedAt?: string; createdAt?: string; fecha?: string; hora?: string }
        | undefined
      const latestDateRaw =
        latestRecord?.updatedAt || latestRecord?.createdAt || latestRecord?.fecha || ""
      const latestHourRaw =
        latestRecord?.hora ||
        (latestRecord?.updatedAt || latestRecord?.createdAt
          ? new Date(latestRecord.updatedAt || latestRecord.createdAt || "").toLocaleTimeString("es-EC", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
              timeZone: "America/Guayaquil",
            })
          : "")
      
      return {
        ...m,
        ultimaVisita:
          petRecords.length > 0
            ? `${formatDate(latestDateRaw)}${latestHourRaw ? ` • ${latestHourRaw}` : ""}`
            : "No registrado"
      }
    });
  }, [mascotas, diagnosticos, vacunaciones, preventivos, tratamientos, citas]);

  const historial = React.useMemo(() => {
    return [
      ...diagnosticos.map((d: Diagnostico) => ({ ...d, tipo: "Diagnóstico", descripcion: d.diagnostico })),
      ...tratamientos.map((t: Tratamiento) => ({ ...t, tipo: "Tratamiento", descripcion: t.medicamento })),
      ...vacunaciones.map((v: Vacuna) => ({ ...v, tipo: "Vacunación", descripcion: v.vacunaId })),
      ...preventivos.map((p: Preventivo) => ({ ...p, tipo: "Preventivo", descripcion: p.tipo })),
      ...citas.filter((c: Cita) => c.estado === "completada" || c.estado === "rechazada").map((c: Cita) => ({ ...c, tipo: "Cita", descripcion: `${c.tipo} ${c.estado === "completada" ? "completada" : "rechazada"}` }))
    ].sort((a, b) => {
      const dateA = new Date((a as { createdAt?: string; fecha?: string }).createdAt || (a as { createdAt?: string; fecha?: string }).fecha || 0).getTime();
      const dateB = new Date((b as { createdAt?: string; fecha?: string }).createdAt || (b as { createdAt?: string; fecha?: string }).fecha || 0).getTime();
      return dateB - dateA;
    });
  }, [diagnosticos, tratamientos, vacunaciones, preventivos, citas]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      if (session?.user?.isActive === false) {
        toast.error("Tu cuenta ha sido desactivada.")
        void signOut({ callbackUrl: "/login?error=AccountDeactivated" })
        return
      }
      const userPayload = session?.user
      if (userPayload?.role !== "admin" && userPayload?.role !== "veterinario") {
        router.push("/mi-mascota")
      }
    }
  }, [status, session, router])

  const handleLogout = async () => {
    await signOut({ redirect: false })
    window.location.href = "/"
  }

  // --- Handlers ---
  const handleCompletarCita = async (id: string | number) => {
    const toastId = toast.loading("Actualizando cita...")
    try {
      const res = await fetch(`/api/appointments/${id}`, { 
        method: "PUT", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "completada" }) 
      })
      if (res.ok) {
        setCitas((prev) =>
          prev.map((c: Cita) => (String(c.id) === String(id) ? { ...c, estado: "completada" } : c))
        )
        toast.success("Cita completada con éxito", { id: toastId })
      } else {
        toast.error("Error al completar la cita", { id: toastId })
      }
    } catch (error) {
      console.error("Error al completar cita:", error)
      toast.error("Error de red", { id: toastId })
    }
  }

  const handleConfirmarCita = async (id: string | number) => {
    const toastId = toast.loading("Confirmando cita...")
    try {
      const res = await fetch(`/api/appointments/${id}`, { 
        method: "PUT", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "confirmada" }) 
      })
      if (res.ok) {
        setCitas((prev) =>
          prev.map((c: Cita) => (String(c.id) === String(id) ? { ...c, estado: "confirmada" } : c))
        )
        toast.success("Cita confirmada exitosamente", { id: toastId })
      } else {
        toast.error("Error al confirmar la cita", { id: toastId })
      }
    } catch {
      toast.error("Error de red", { id: toastId })
    }
  }

  const handleRechazarCita = async (id: string | number) => {
    const toastId = toast.loading("Rechazando cita...")
    try {
      const res = await fetch(`/api/appointments/${id}`, { 
        method: "PUT", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "rechazada" }) 
      })
      if (res.ok) {
        setCitas((prev) =>
          prev.map((c: Cita) => (String(c.id) === String(id) ? { ...c, estado: "rechazada" } : c))
        )
        toast.success("Cita rechazada", { id: toastId })
      } else {
        toast.error("Error al rechazar la cita", { id: toastId })
      }
    } catch (error) {
      console.error("Error al rechazar cita:", error)
      toast.error("Error de red", { id: toastId })
    }
  }

  const handleOpenRescheduleModal = (cita: Cita) => {
    setSelectedCitaForReschedule(cita)
    setIsRescheduleModalOpen(true)
  }

  const handleConfirmReschedule = async (id: string, fecha: string, hora: string) => {
    const toastId = toast.loading("Reagendando cita...")
    try {
      const res = await fetch(`/api/appointments/${id}`, { 
        method: "PUT", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha, hora, estado: "confirmada" }) 
      })
      if (res.ok) {
        setCitas((prev) =>
          prev.map((c: Cita) => (String(c.id) === id ? { ...c, fecha, hora, estado: "confirmada" } : c))
        )
        toast.success("Cita reagendada y confirmada", { id: toastId })
      } else {
        toast.error("Error al reagendar la cita", { id: toastId })
      }
    } catch (error) {
      console.error("Error al reagendar cita:", error)
      toast.error("Error de red", { id: toastId })
    }
  }

  const handleAtenderCita = (citaId: string, petId: string) => {
    if (!petId) {
      toast.error("Esta mascota no tiene un ID registrado. No se puede abrir la ficha.")
      return
    }
    router.push(`/dashboard/veterinario/mascotas/${petId}/ficha-medica?citaId=${citaId}`)
  }

  const handleCitaRapidaCreada = (newCita: Cita) => {
    setCitas((prev) => [newCita, ...prev])
    setActiveTab("citas")
  }

  const handleBackToPatients = () => {
    setSelectedPetId(null)
    setActiveTab("mascotas")
  }

  const handleCrearDiagnostico = async (payloadFromChild: { mascota: string; diagnostico: string; notas: string }) => {
    try {
      const petId = (selectedPetId || mascotas.find(m => m.nombre === payloadFromChild.mascota)?.id) as string | undefined;
      const payload = {
        ...payloadFromChild,
        mascota: mascotas.find(m => m.id === petId)?.nombre || payloadFromChild.mascota,
        petId: petId
      }
      const res = await AdminService.saveDiagnostico(payload)
      
      if (res) {
        setDiagnosticos(prev => [res, ...prev])
        setShowDiagnosticoForm(false)
        toast.success("Diagnóstico guardado exitosamente")
      } else {
        toast.error("Error al guardar el diagnóstico. Revise los campos.")
        setShowDiagnosticoForm(false)
      }
    } catch (error) {
      console.error("Error al crear diagnóstico:", error)
      toast.error("Error de red al conectar con el servidor")
    }
  }

  const handleCrearTratamiento = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const petId = (selectedPetId || mascotas.find(m => m.nombre === tratamientoForm.mascota)?.id) as string | undefined;
      const payload = {
        mascota: mascotas.find(m => m.id === petId)?.nombre || tratamientoForm.mascota,
        petId: petId,
        medicamento: tratamientoForm.medicamento,
        dosis: tratamientoForm.dosis,
        duracion: tratamientoForm.duracion,
        notas: tratamientoForm.notas
      }
      const res = await AdminService.saveTratamiento(payload)
      
      if (res) {
        setTratamientos(prev => [res, ...prev])
        setTratamientoForm({ mascota: "", medicamento: "", dosis: "", duracion: "", notas: "" })
        setShowTratamientoForm(false)
        toast.success("Tratamiento guardado exitosamente")
      } else {
        toast.error("Error al guardar el tratamiento. Revise los campos.")
        setShowTratamientoForm(false)
      }
    } catch (error) {
      console.error("Error al crear tratamiento:", error)
      toast.error("Error de red al conectar con el servidor")
    }
  }

  const handleCrearPreventivo = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const petId = (selectedPetId || mascotas.find(m => m.nombre === preventivoForm.mascota)?.id) as string | undefined;
      const payload = {
        mascota: mascotas.find(m => m.id === petId)?.nombre || preventivoForm.mascota,
        petId: petId,
        tipo: preventivoForm.tipo,
        proximaFecha: preventivoForm.proximaFecha,
        notas: preventivoForm.notas || undefined,
        dosis: preventivos.filter(p => (p.petId === petId || p.mascota === (mascotas.find(m => m.id === petId)?.nombre))).length + 1
      }
      const res = await AdminService.savePreventivo(payload)
      if (res) {
        setPreventivos(prev => [res, ...prev])
        setPreventivoForm({ ...preventivoForm, proximaFecha: "", notas: "" })
        setShowPreventivoForm(false)
        toast.success("Control preventivo guardado")
      } else {
        toast.error("Error al guardar el preventivo. Revise los campos.")
      }
    } catch (error) {
      console.error("Error al crear preventivo:", error)
      toast.error("Error de red al conectar con el servidor")
    }
  }

  const handleCrearVacunacion = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Calcular próxima fecha basada en la periodicidad (meses)
      const periodicidadMeses = parseInt(vacunaForm.periodicidad) || 12
      const proxima = new Date()
      proxima.setMonth(proxima.getMonth() + periodicidadMeses)
      const proximaFechaStr = proxima.toISOString().split('T')[0]

      const petId = (selectedPetId || mascotas.find(m => m.nombre === vacunaForm.mascota)?.id) as string | undefined;
      const payload = {
        mascota: mascotas.find(m => m.id === petId)?.nombre || vacunaForm.mascota,
        petId: petId,
        dosis: vacunaForm.dosis,
        vacunaId: vacunaForm.vacunaId,
        proximaFecha: proximaFechaStr, // Calculada automáticamente
        periodicidad: vacunaForm.periodicidad,
        notas: vacunaForm.notas || undefined,
      }
      const res = await AdminService.saveVacunacion(payload)
      if (res) {
        setVacunaciones(prev => [res, ...prev])
        setVacunaForm({ ...vacunaForm, vacunaId: "", periodicidad: "", notas: "" })
        setShowVacunaForm(false)
        toast.success("Vacuna registrada exitosamente")
      } else {
        toast.error("Error al guardar la vacuna. Revise los campos.")
      }
    } catch (error) {
      console.error("Error al crear vacunación:", error)
      toast.error("Error de red al conectar con el servidor")
    }
  }

  const handleSyncData = async () => {
    setIsSyncing(true)
    const toastId = toast.loading("Sincronizando datos con la base de datos...")
    
    try {
      const localMascotas = AdminService.get<Mascota[]>("mascotas", [])
      const localCitas = AdminService.get<Cita[]>("citas", [])
      const localDiagnosticos = AdminService.get<Diagnostico[]>("diagnosticos", [])
      const localTratamientos = AdminService.get<Tratamiento[]>("tratamientos", [])
      const localPreventivos = AdminService.get<Preventivo[]>("preventivos", [])
      const localVacunas = AdminService.get<Vacuna[]>("vacunaciones", [])

      // Sync Pets first
      for (const pet of localMascotas) {
        // Simple check: don't duplicate if name exists in current fetched list
        if (!mascotas.find(m => m.nombre === pet.nombre)) {
          await AdminService.createPatient(pet)
        }
      }

      // Sync Appointments
      for (const cita of localCitas) {
        if (!citas.find(c => c.fecha === cita.fecha && c.hora === cita.hora && c.mascota === cita.mascota)) {
          await AdminService.createAppointment(cita)
        }
      }

      // Sync Medical Records
      for (const d of localDiagnosticos) await AdminService.saveDiagnostico(d)
      for (const t of localTratamientos) await AdminService.saveTratamiento(t)
      for (const p of localPreventivos) await AdminService.savePreventivo(p)
      for (const v of localVacunas) await AdminService.saveVacunacion(v)

      toast.success("¡Sincronización completada! Todos tus datos están ahora en la nube.", { id: toastId })
      setHasLocalData(false)
      // Refresh data
      window.location.reload()
    } catch (error) {
      console.error("Sync error:", error)
      toast.error("Hubo un problema al sincronizar algunos datos.", { id: toastId })
    } finally {
      setIsSyncing(false)
    }
  }

  const citasPendientesCount = useMemo(() => citas.filter(c => c.estado === "pendiente" || c.estado === "confirmada").length, [citas])
  const selectedPetName = useMemo(
    () => (selectedPetId ? mascotas.find(m => m.id === selectedPetId)?.nombre || "" : ""),
    [selectedPetId, mascotas]
  )
  const diagnosticosForView = useMemo(
    () => (selectedPetId ? diagnosticos.filter(d => d.petId === selectedPetId) : diagnosticos),
    [selectedPetId, diagnosticos]
  )
  const tratamientosForView = useMemo(
    () => (selectedPetId ? tratamientos.filter(t => t.petId === selectedPetId) : tratamientos),
    [selectedPetId, tratamientos]
  )
  const preventivosForView = useMemo(
    () => (selectedPetId ? preventivos.filter(p => p.petId === selectedPetId) : preventivos),
    [selectedPetId, preventivos]
  )
  const vacunacionesForView = useMemo(
    () => (selectedPetId ? vacunaciones.filter(v => v.petId === selectedPetId) : vacunaciones),
    [selectedPetId, vacunaciones]
  )
  const historialForView = useMemo(
    () => (selectedPetId ? historial.filter((h) => h.petId === selectedPetId) : historial),
    [selectedPetId, historial]
  )

  const baseTabs: TabItem[] = useMemo(() => [
    { id: "citas" as TabType, label: "Mis Citas", icon: Calendar, count: citasPendientesCount },
    { id: "mascotas" as TabType, label: "Pacientes", icon: PawPrint, count: patientsWithVisits.length },
    { id: "actividad" as TabType, label: "Mi Historial", icon: History },
    { id: "mi-perfil" as TabType, label: "Mi Perfil", icon: User },
  ], [citasPendientesCount, patientsWithVisits.length])

  const serviceTabs: TabItem[] = useMemo(() => [
    { id: "vacunas" as TabType, label: "Vacunación", icon: Syringe },
    { id: "preventivos" as TabType, label: "Preventivos", icon: Shield },
    { id: "diagnosticos" as TabType, label: "Revisión y Diagnóstico", icon: ClipboardList },
    { id: "tratamientos" as TabType, label: "Tratamientos", icon: Pill },
    { id: "historial" as TabType, label: "Historial Clínico", icon: History },
  ], [])

  const tabs: TabItem[] = useMemo(
    () => (selectedPetId ? [...baseTabs, ...serviceTabs] : baseTabs),
    [selectedPetId, baseTabs, serviceTabs]
  )

  const handlePatientAction = useCallback((petId: string, action: string) => {
    setSelectedPetId(petId)
    setActiveTab(action as TabType)
    if (action === "diagnosticos") {
      setShowDiagnosticoForm(true)
      setDiagnosticoForm(prev => ({ ...prev, mascota: mascotas.find(m => m.id === petId)?.nombre || "" }))
    }
    if (action === "tratamientos") {
      setShowTratamientoForm(true)
      setTratamientoForm(prev => ({ ...prev, mascota: mascotas.find(m => m.id === petId)?.nombre || "" }))
    }
    if (action === "preventivos") {
      setShowPreventivoForm(true)
      setPreventivoForm(prev => ({ ...prev, mascota: mascotas.find(m => m.id === petId)?.nombre || "" }))
    }
    if (action === "vacunas") {
      setShowVacunaForm(true)
      setVacunaForm(prev => ({ ...prev, mascota: mascotas.find(m => m.id === petId)?.nombre || "" }))
    }
  }, [mascotas])

  return (
    <div className="min-h-screen bg-white text-foreground font-medium selection:bg-[#E7BEF8] selection:text-foreground">
      {/* Background Gradient */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#a8d5ba] via-[#7f9dca] via-[#a3c9c7] to-[#a8d5ba]" />

      {/* Header */}
      <header className="sticky top-0 z-[100] border-b-[3px] border-foreground bg-white">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#a8d5ba] border-[3px] border-foreground shadow-[3px_3px_0px_0px_#000000] rounded-full p-2 h-10 w-10 flex items-center justify-center transform -rotate-3">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold font-heading">Portal Veterinario</h1>
              <p className="text-xs md:text-sm font-medium text-[#000000]/80">{session?.user?.name || session?.user?.email}</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {/* Notification Bell for Vet */}
            <AdminNotificationBell 
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onNotificationClick={handleNotificationClick}
              onDeleteAll={handleDeleteAllNotifications}
              onDeleteSingle={handleNotificationDelete}
            />

            <Button variant="outline" onClick={handleLogout} className="bg-[#ffadad] border-[2px] border-foreground font-bold shadow-[2px_2px_0px_0px_#000000]">
              <LogOut className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b-[3px] border-foreground bg-white/70 backdrop-blur-md sticky top-[64px] z-[100]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-stretch gap-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-4">
            <div className="inline-flex max-w-full items-center gap-1 overflow-x-auto p-1.5 no-scrollbar sm:mx-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    if (tab.id === "citas" || tab.id === "mascotas") {
                      setSelectedPetId(null)
                    }
                  }}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 font-heading text-sm font-black whitespace-nowrap transition-all duration-200 sm:px-6
                    ${activeTab === tab.id
                      ? "bg-[#a8d5ba] text-[#000000] border-2 border-foreground shadow-[3px_3px_0px_0px_#000000]"
                      : "text-foreground/50 hover:text-foreground hover:bg-white/50"
                    }`}
                >
                  <tab.icon className="h-4 w-4 shrink-0" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                     <Badge className="ml-1 h-5 shrink-0 border-2 border-foreground bg-white px-1.5 font-black text-[10px] text-foreground">{tab.count}</Badge>
                  )}
                </button>
              ))}
            </div>
            {selectedPetId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToPatients}
                className="h-10 w-full shrink-0 gap-2 font-bold text-[#000000] hover:bg-[#ffadad]/20 sm:ml-0 sm:w-auto rounded-full border-2 border-transparent transition-all hover:border-foreground"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span>Volver a pacientes</span>
              </Button>
            )}
          </div>
        </div>
      </nav>

      {hasLocalData && mascotas.length === 0 && (
        <div className="max-w-7xl mx-auto px-4 mt-6">
          <div className="bg-[#fdffb6] border-[3px] border-foreground p-6 rounded-3xl shadow-[6px_6px_0px_0px_#000000] flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white p-3 rounded-2xl border-2 border-foreground shadow-[3px_3px_0px_0px_#000000]">
                <History className="h-8 w-8 text-foreground" />
              </div>
              <div>
                <h3 className="font-black text-xl">¿Tienes datos guardados localmente?</h3>
                <p className="font-bold text-foreground/60">Detectamos que tienes mascotas o citas en este navegador que no están en la base de datos.</p>
              </div>
            </div>
            <Button 
              onClick={handleSyncData} 
              disabled={isSyncing}
              className="bg-[#9bf6ff] text-foreground border-[3px] border-foreground shadow-[4px_4px_0px_0px_#000] font-black h-14 px-8 rounded-2xl hover:translate-y-1 hover:shadow-none transition-all"
            >
              {isSyncing ? "Sincronizando..." : "Sincronizar con la Nube "}
            </Button>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8">
        {activeTab === "citas" && (
          <CitasTab 
            citas={citas} 
            mascotas={mascotas}
            onCompletarCita={handleCompletarCita} 
            onConfirmarCita={handleConfirmarCita}
            onAtenderCita={handleAtenderCita} 
            onReagendarCita={handleOpenRescheduleModal}
            onRechazarCita={handleRechazarCita}
            onViewFullHistory={() => setActiveTab("actividad")}
            onAgendarInvitado={() => setIsInvitadoOpen(true)}
          />
        )}

        {activeTab === "mascotas" && (
          <PatientsTab 
            patients={patientsWithVisits} 
            searchTerm={searchTerm} 
            onSearchChange={setSearchTerm} 
            onRegisterClick={() => setIsRegisterModalOpen(true)}
            onAction={handlePatientAction}
            onCitaRapidaClick={() => setIsCitaRapidaOpen(true)}
          />
        )}

        {activeTab === "diagnosticos" && (
          <DiagnosticosSection 
            diagnosticos={diagnosticosForView} 
            mascotas={mascotas}
            selectedPetId={selectedPetId}
            selectedPatient={selectedPetName || null}
            showForm={showDiagnosticoForm}
            setShowForm={setShowDiagnosticoForm}
            onBack={handleBackToPatients}
            onSubmit={handleCrearDiagnostico}
          />
        )}

        {activeTab === "tratamientos" && (
          <TratamientosSection 
            tratamientos={tratamientosForView} 
            mascotas={mascotas}
            selectedPetId={selectedPetId}
            selectedPatient={selectedPetName || null}
            showForm={showTratamientoForm}
            setShowForm={(show) => {
              if (show && selectedPetId) {
                setTratamientoForm(prev => ({ ...prev, mascota: mascotas.find(m => m.id === selectedPetId)?.nombre || "" }));
              }
              setShowTratamientoForm(show);
            }}
            onBack={handleBackToPatients}
            onSubmit={handleCrearTratamiento}
            form={tratamientoForm}
            setForm={setTratamientoForm}
          />
        )}

        {activeTab === "preventivos" && (
          <PreventivosSection 
            preventivos={preventivosForView} 
            mascotas={mascotas}
            selectedPetId={selectedPetId}
            selectedPatient={selectedPetName || null}
            showForm={showPreventivoForm}
            setShowForm={(show) => {
              if (show && selectedPetId) {
                setPreventivoForm(prev => ({ ...prev, mascota: mascotas.find(m => m.id === selectedPetId)?.nombre || "" }));
              }
              setShowPreventivoForm(show);
            }}
            onBack={handleBackToPatients}
            onSubmit={handleCrearPreventivo}
            form={preventivoForm}
            setForm={setPreventivoForm}
          />
        )}

        {activeTab === "vacunas" && (
          <VacunasSection 
            vacunaciones={vacunacionesForView} 
            mascotas={mascotas}
            selectedPetId={selectedPetId}
            selectedPatient={selectedPetName || null}
            showForm={showVacunaForm}
            setShowForm={(show) => {
              if (show && selectedPetId) {
                setVacunaForm(prev => ({ ...prev, mascota: mascotas.find(m => m.id === selectedPetId)?.nombre || "" }));
              }
              setShowVacunaForm(show);
            }}
            onBack={handleBackToPatients}
            onSubmit={handleCrearVacunacion}
            form={vacunaForm}
            setForm={setVacunaForm}
          />
        )}

        {activeTab === "historial" && (
          <HistorialTimeline
            selectedPetId={selectedPetId}
            mascotas={mascotas}
            historial={historialForView}
            onBack={handleBackToPatients}
          />
        )}

        {activeTab === "mi-perfil" && (
          <MiCuentaTab />
        )}

        {activeTab === "actividad" && (
          <VetActivityTab
            historial={historial}
            mascotas={mascotas}
          />
        )}

        {/* Modals */}
        <RegisterPatientModal 
          isOpen={isRegisterModalOpen}
          onClose={() => setIsRegisterModalOpen(false)}
          onSuccess={handleRegisterSuccess}
          onRegister={AdminService.registerPatient}
        />

        <RescheduleModal
          isOpen={isRescheduleModalOpen}
          onClose={() => setIsRescheduleModalOpen(false)}
          cita={selectedCitaForReschedule}
          onReschedule={handleConfirmReschedule}
        />

        <CitaRapidaModal
          isOpen={isCitaRapidaOpen}
          onClose={() => setIsCitaRapidaOpen(false)}
          mascotas={mascotas}
          onCitaCreada={handleCitaRapidaCreada}
        />

        <CitaInvitadoModal
          isOpen={isInvitadoOpen}
          onClose={() => setIsInvitadoOpen(false)}
          onCitaCreada={(cita) => {
            setCitas(prev => [cita as unknown as Cita, ...prev])
          }}
        />
      </main>

      {isVeterinarioDashboard && selectedPetId && medicalPermLoading && (
        <MiauLoading fullScreen={false} text="Cargando permisos..." />
      )}

      {medicalAccessDeniedDashboard && selectedPet && (
        <RestrictedAccessOverlay
          patientName={selectedPet.nombre}
          ownerName={selectedPet.user?.name || selectedPet.dueno || "Propietario no registrado"}
          status={
            medicalAccessForHistorial!.status === "PENDING"
              ? "PENDING"
              : medicalAccessForHistorial!.status === "REJECTED"
                ? "REJECTED"
                : "NONE"
          }
          onRequestAccess={medicalAccessForHistorial?.onRequestAccess}
          requestLoading={requestAccessLoading}
        />
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <React.Suspense fallback={<MiauLoading text="Cargando panel..." fullScreen />}>
      <DashboardContent />
    </React.Suspense>
  )
}
