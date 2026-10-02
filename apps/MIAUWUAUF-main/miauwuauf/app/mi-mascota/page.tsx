"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import {
  LogOut, PawPrint, MessageSquare, Home, Phone, User,
  Plus, Syringe, Satellite, ArrowLeft, CalendarDays, Camera,
  History as LucideHistory, Pencil, ShoppingBag, HelpCircle, Dog,
  Building2, MapPin,
} from "lucide-react"
import { cn, calcularEdad } from "@/lib/utils"

import { toast } from "sonner"
import { validateUpload } from "@/lib/upload-validation"
import { MiauLoading } from "@/components/MiauLoading"
import { LogoHorizontal } from "@/components/LogoHorizontal"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import { 
  MascotaUsuario, PerroAdopcion, SolicitudAdopcion,
  Evento, ConfirmModalState, TabType,
  Diagnostico, Tratamiento, Preventivo, Vacuna, Cita, Veterinario, ExamData
} from "./types"

// Modular Components
type HealthRecord = Vacuna | Diagnostico | Tratamiento | Preventivo

import { MascotasTab } from "./components/MascotasTab"
import { HealthTab } from "./components/HealthTab"
import { EventsTab } from "./components/EventsTab"
import { GPSTab } from "./components/GPSTab"
import { AcogidaTab } from "./components/AcogidaTab"
import { CitasTab } from "./components/CitasTab"
import { ComprasTab, Order } from "./components/ComprasTab"
import { ProfileSection } from "./components/ProfileSection"
import { MiCuentaTab } from "./components/MiCuentaTab"
import { ConfirmModal } from "@/components/ui/confirm-modal"
import { NotificationBell } from "./components/NotificationBell"
import { formatEcuadorPhoneDisplay, normalizeEcuadorPhone } from "@/lib/phone"
import { useScrollToTopOnChange } from "@/hooks/useScrollToTopOnChange"


// --- Components ---

function RequiereMascota({ onIrARegistrar }: { onIrARegistrar: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Card className="border-0 shadow-lg max-w-md w-full text-center">
        <div className="p-10 space-y-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <PawPrint className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Registra tu mascota primero</h2>
          <p className="text-muted-foreground">
            Para usar este servicio necesitas tener al menos una mascota registrada. Registra la tuya para acceder a vacunacion, GPS y eventos.
          </p>
          <Button onClick={onIrARegistrar} className="w-full py-6 font-bold gap-2">
            <Plus className="h-5 w-5" />
            Registrar mi Mascota
          </Button>
        </div>
      </Card>
    </div>
  )
}

// --- Main Page ---

function MiMascotaPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [notifSheetOpen, setNotifSheetOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>("mis-mascotas")
  const [loading, setLoading] = useState(true)

  // Data State
  const [misMascotas, setMisMascotas] = useState<MascotaUsuario[]>([])
  const [mascotaActiva, setMascotaActiva] = useState<MascotaUsuario | null>(null)
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([])
  const [tratamientos, setTratamientos] = useState<Tratamiento[]>([])
  const [preventivos, setPreventivos] = useState<Preventivo[]>([])
  const [vacunaciones, setVacunaciones] = useState<Vacuna[]>([])
  const [citas, setCitas] = useState<Cita[]>([])
  const [eventos, setEventos] = useState<Evento[]>([])
  const [perros, setPerros] = useState<PerroAdopcion[]>([])
  const [misSolicitudes, setMisSolicitudes] = useState<SolicitudAdopcion[]>([])
  const [vets, setVets] = useState<Veterinario[]>([])
  const [exams, setExams] = useState<ExamData[]>([])
  const [notifications, setNotifications] = useState<
    { id: string; title: string; message: string; type: string; read: boolean; createdAt: string; metadata?: Record<string, unknown> | null }[]
  >([])
  const [compras, setCompras] = useState<Order[]>([])
  const [petToEdit, setPetToEdit] = useState<MascotaUsuario | null>(null)

  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {}
  })
  const [confirmPurgeNotifications, setConfirmPurgeNotifications] = useState(false)

  const tieneMascotas = misMascotas.length > 0
  const hasFetched = useRef(false)

  // --- Assigned Vet Logic (Sincronizada con Citas) ---
  const lastAppointment = [...citas]
    .filter(c => c && c.petId && String(c.petId) === String(mascotaActiva?.id))
    .sort((a, b) => {
      const dateA = new Date((a.fecha || "") + " " + (a.hora || "00:00")).getTime()
      const dateB = new Date((b.fecha || "") + " " + (b.hora || "00:00")).getTime()
      if (isNaN(dateA)) return 1
      if (isNaN(dateB)) return -1
      return dateB - dateA
    })[0]

  const lastVetIdFromHistory = [...diagnosticos, ...tratamientos, ...vacunaciones, ...preventivos]
    .filter(item => item && item.petId && String(item.petId) === String(mascotaActiva?.id))
    .sort((a, b) => {
      const dateA = new Date((a as HealthRecord).createdAt || 0).getTime()
      const dateB = new Date((b as HealthRecord).createdAt || 0).getTime()
      if (isNaN(dateA)) return 1
      if (isNaN(dateB)) return -1
      return dateB - dateA
    })[0]?.vetId

  const activeVetId = lastAppointment?.vetId || lastVetIdFromHistory || (mascotaActiva ? (mascotaActiva as MascotaUsuario).assignedVetId : null)
  
  const assignedVet = vets.find(v => v && v.id && String(v.id) === String(activeVetId)) || null
  const assignedVetStatus = lastAppointment?.estado || null // 'pendiente', 'confirmada', etc.

  const fetchData = useCallback(async () => {
    try {
      const [resPets, resEvents, resShelter, resAdoptions, resDiagnoses, resTreatments, resPreventives, resVaccinations, resVets, resExams] = await Promise.all([
        fetch("/api/pets"),
        fetch("/api/events"),
        fetch("/api/shelter-pets"),
        fetch("/api/adoption"),
        fetch("/api/diagnoses"),
        fetch("/api/treatments"),
        fetch("/api/preventives"),
        fetch("/api/vaccinations"),
        fetch("/api/vets"),
        fetch("/api/exams"),
      ])
      
      if (resPets.ok) {
        const data = await resPets.json()
        if (Array.isArray(data)) {
          setMisMascotas(data)
          if (data.length > 0) {
            setMascotaActiva((prev) => prev || data[0])
          }
        }
      }

      if (resEvents.ok) {
        const data = await resEvents.json()
        if (Array.isArray(data)) setEventos(data)
      }
      if (resAdoptions.ok) {
        const data = await resAdoptions.json()
        if (Array.isArray(data)) setMisSolicitudes(data)
      }
      if (resShelter.ok) {
        const data = await resShelter.json()
        if (Array.isArray(data)) setPerros(data)
      }
      if (resDiagnoses.ok) {
        const data = await resDiagnoses.json()
        if (Array.isArray(data)) setDiagnosticos(data)
      }
      if (resTreatments.ok) {
        const data = await resTreatments.json()
        if (Array.isArray(data)) setTratamientos(data)
      }
      if (resPreventives.ok) {
        const data = await resPreventives.json()
        if (Array.isArray(data)) setPreventivos(data)
      }
      if (resVaccinations.ok) {
        const data = await resVaccinations.json()
        if (Array.isArray(data)) setVacunaciones(data)
      }
      
      if (resVets.ok) {
        const data = await resVets.json()
        if (Array.isArray(data)) setVets(data)
      }

      if (resExams.ok) {
        const data = await resExams.json()
        if (Array.isArray(data)) setExams(data)
      }

      const resAppointments = await fetch("/api/appointments")
      if (resAppointments.ok) {
        const data = await resAppointments.json()
        if (Array.isArray(data)) setCitas(data)
      }

      const resNodes = await fetch("/api/notifications")
      if (resNodes.ok) {
        const data = await resNodes.json()
        if (Array.isArray(data)) setNotifications(data)
      }

      const resOrders = await fetch("/api/user/orders")
      if (resOrders.ok) {
        const data = await resOrders.json()
        if (Array.isArray(data)) setCompras(data)
      }
    } catch (error) {
      console.error("Error al cargar datos:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === "unauthenticated") {
      const currentPath = window.location.pathname + window.location.search;
      router.push(`/login?callbackUrl=${encodeURIComponent(currentPath)}`)
      return
    }

    if (status === "authenticated" && session?.user?.isActive === false) {
      toast.error("Tu cuenta ha sido desactivada.")
      void signOut({ callbackUrl: "/login?error=AccountDeactivated" })
      return
    }

    if (status === "authenticated") {
      const role = session?.user?.role
      if (role === "veterinario") {
        router.replace("/dashboard")
        return
      }
      if (role === "admin") {
        router.replace("/admin")
        return
      }
      if (role === "bloguer") {
        router.replace("/blog-admin")
        return
      }
      
      if (!hasFetched.current) {
        hasFetched.current = true
        fetchData()
      }
    }
  }, [status, fetchData, router, session])

  // Sync tab from URL continuously
  useEffect(() => {
    const tabParam = searchParams.get("tab")
    if (tabParam && [
      "mis-mascotas", "perfil", "vacunacion", "compras",
      "historial", "eventos", "gps", "citas", "acogida", "mi-cuenta"
    ].includes(tabParam)) {
      setActiveTab(tabParam as TabType)
    }
  }, [searchParams])
  useScrollToTopOnChange(activeTab)

  const refreshNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications")
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setNotifications(data)
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => {
    if (status === "authenticated") {
      const interval = setInterval(() => {
        refreshNotifications()
      }, 10000)
      return () => clearInterval(interval)
    }
  }, [status, refreshNotifications])

  // Pedidos: refrescar al abrir Compras o al volver del checkout (evita ver estado viejo "pago rechazado")
  useEffect(() => {
    if (status !== "authenticated" || activeTab !== "compras") return
    const loadOrders = () => {
      void fetch("/api/user/orders", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (Array.isArray(data)) setCompras(data)
        })
        .catch(() => {})
    }
    loadOrders()
    const onShow = () => loadOrders()
    const onVis = () => {
      if (document.visibilityState === "visible") loadOrders()
    }
    window.addEventListener("pageshow", onShow)
    document.addEventListener("visibilitychange", onVis)
    return () => {
      window.removeEventListener("pageshow", onShow)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [activeTab, status])

  useEffect(() => {
    const o = searchParams.get("openNotifications")
    const t = searchParams.get("toast")
    if (t === "mp_ok_a") {
      toast.success("Permiso aceptado. El veterinario podrá ver el historial.")
    } else if (t === "mp_ok_r") {
      toast.success("Solicitud rechazada.")
    } else if (t === "mp_done") {
      toast.info("Esta solicitud ya había sido respondida.")
    } else if (t === "mp_invalid") {
      toast.error("Enlace no válido o expirado.")
    }
    if (o === "1") setNotifSheetOpen(true)
    if (o || t) {
      const params = new URLSearchParams(searchParams.toString())
      params.delete("openNotifications")
      params.delete("toast")
      const q = params.toString()
      void Promise.resolve(router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })).catch(
        () => {}
      )
    }
  }, [searchParams, pathname, router])


  const handleLogout = async () => {
    await signOut({ redirect: false })
    window.location.href = "/"
  }

  const verSitioHref = process.env.NEXT_PUBLIC_APP_URL?.trim() || "/"
  const verSitioExternal = /^https?:\/\//i.test(verSitioHref)

  const handleAddPet = async (data: Partial<MascotaUsuario> & { id?: string | number }) => {
    try {
      const isEditing = !!data.id
      const method = isEditing ? "PUT" : "POST"
      
      const response = await fetch("/api/pets", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        const result = await response.json()
        if (isEditing) {
          setMisMascotas(prev => prev.map(m => m.id === data.id ? result : m))
          if (mascotaActiva?.id === data.id) setMascotaActiva(result)
          toast.success("Mascota actualizada exitosamente")
        } else {
          setMisMascotas(prev => [...prev, result])
          setMascotaActiva(result)
          toast.success("Mascota registrada exitosamente")
        }
        fetchData()
        return true
      } else {
        const err = (await response.json()) as { message?: string }
        toast.error(err.message?.trim() || "Error")
        return false
      }
    } catch {
      toast.error("Error al guardar mascota")
      return false
    }
  }

  const handleDeletePet = async (id: number | string) => {
    setConfirmModal({
      isOpen: true,
      title: "Eliminar Mascota",
      description: "¿Estás seguro de eliminar esta mascota? Esta acción borrará permanentemente sus historiales médicos y registros.",
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/pets?id=${id}`, { method: "DELETE" })
          if (response.ok) {
            setMisMascotas(prev => {
              const actualizado = prev.filter(m => String(m.id) !== String(id))
              if (String(mascotaActiva?.id) === String(id)) setMascotaActiva(actualizado[0] || null)
              return actualizado
            })
            toast.success("Mascota eliminada con éxito")
          } else {
            toast.error("Error al eliminar mascota")
          }
        } catch {
          toast.error("Error de conexión")
        }
      }
    })
  }

  const handleInscribirseEvento = async (eventoId: string | number, mascotaId: string | number) => {
    const res = await fetch("/api/events/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: eventoId, mascotaId: mascotaId }),
    })

    if (res.ok) {
      toast.success("Mascota inscrita al evento exitosamente!")
      fetchData()
    } else {
      const err = (await res.json()) as { message?: string }
      toast.error(err.message?.trim() || "Error")
    }
  }

  const handleEnviarSolicitud = async (solicitudData: Partial<SolicitudAdopcion>) => {
    try {
      const res = await fetch("/api/adoption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(solicitudData)
      })

      if (res.ok) {
        toast.success("¡Solicitud enviada con éxito!")
        fetchData()
        return true
      } else {
        toast.error("Error al enviar solicitud")
        return false
      }
    } catch {
      toast.error("Error de conexión al enviar solicitud")
      return false
    }
  }

  const handleMarkAsRead = async (id: string) => {
    // Actualización optimista: desaparecerá inmediatamente por el filtro en el componente
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      })
      if (!res.ok) {
        // Si falla, re-fetcheamos para restaurar estado
        const resNodes = await fetch("/api/notifications")
        if (resNodes.ok) setNotifications(await resNodes.json())
      }
    } catch (error) {
      console.error("Error marking as read:", error)
    }
  }

  const handleDeleteReadNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?onlyRead=true", { method: "DELETE" })
      if (res.ok) {
        await refreshNotifications()
        toast.success("Notificaciones leídas eliminadas. Las no leídas se conservan.")
      } else {
        toast.error("No se pudo limpiar notificaciones leídas")
      }
    } catch (error) {
      console.error("Error deleting read notifications:", error)
      toast.error("Error de conexión")
    }
  }, [refreshNotifications])

  const handlePurgeAllNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { method: "DELETE" })
      if (res.ok) {
        await refreshNotifications()
        toast.success("Se eliminaron todas las notificaciones")
        // Cierre del modal: ConfirmModal llama a onClose en finally; no hace falta setState aquí
      } else {
        toast.error("No se pudo borrar el historial")
      }
    } catch (error) {
      console.error("Error purging notifications:", error)
      toast.error("Error de conexión")
    }
  }, [refreshNotifications])


  if (loading) return <MiauLoading text="Preparando tu perfil..." />

  const showSidebar = tieneMascotas && mascotaActiva && !["acogida", "mis-mascotas", "mi-cuenta", "compras"].includes(activeTab)
  const headerDisplayName = session?.user?.name || session?.user?.email || "Usuario"
  const isMainTopTabs = ["mis-mascotas", "acogida", "compras", "mi-cuenta"].includes(activeTab)
  const mobileTabs = isMainTopTabs
    ? [
        { id: "mi-cuenta" as TabType, label: "Perfil", icon: User },
        { id: "mis-mascotas" as TabType, label: "Mis Mascotas", icon: PawPrint },
        { id: "compras" as TabType, label: "Compras", icon: ShoppingBag },
        { id: "acogida" as TabType, label: "Centro de Ayuda", icon: Home },
      ]
    : [
        { id: "perfil" as TabType, label: "Perfil", icon: User },
        { id: "citas" as TabType, label: "Mis Citas", icon: CalendarDays },
        { id: "historial" as TabType, label: "Historial", icon: LucideHistory },
        { id: "vacunacion" as TabType, label: "Vacunacion", icon: Syringe },
        { id: "eventos" as TabType, label: "Eventos", icon: CalendarDays },
        { id: "gps" as TabType, label: "GPS", icon: Satellite },
      ]

  return (
    <div className="min-h-screen bg-background font-heading overflow-x-hidden">
      {/* Header & Nav Unified Container */}
      <div className="sticky top-0 z-50 flex flex-col bg-background border-b shadow-sm gap-y-1">
        {/* Header Section */}
        <header className="bg-background">
          <div className="container mx-auto flex min-w-0 items-center justify-between gap-2 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
              {!["mis-mascotas", "acogida", "compras", "mi-cuenta"].includes(activeTab) && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setActiveTab("mis-mascotas")
                    router.replace(`?tab=mis-mascotas`, { scroll: false })
                  }}
                  className="h-8 w-8 rounded-full border-2 border-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all shrink-0"
                >
                  <ArrowLeft className="h-4 w-4 text-primary" />
                </Button>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                  <div className="shrink-0 brightness-0">
                    <LogoHorizontal size="sm" className="max-w-[min(100%,9.5rem)] origin-left scale-110 sm:max-w-none sm:scale-[1.35] md:scale-[1.9]" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:ml-[100px] sm:flex-row sm:items-center sm:gap-2">
                    <div className="hidden h-6 w-[2px] shrink-0 bg-[#000000]/20 sm:mx-1 sm:block" />
                    <p className="min-w-0 truncate pl-0.5 text-[11px] font-black leading-tight text-[#000000] sm:hidden">
                      {headerDisplayName}
                    </p>
                    <p className="hidden min-w-0 flex-1 truncate text-xl font-black text-[#000000] sm:block sm:text-3xl">
                      {headerDisplayName}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <Link
                href={verSitioHref}
                aria-label="Ver sitio"
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border-[3px] border-[#000000] bg-white px-3 text-xs font-bold text-[#000000] shadow-[4px_4px_0px_0px_#000000] transition-[transform,box-shadow] hover:bg-white hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none sm:gap-2 sm:px-4 sm:text-sm md:h-10"
              >
                <Dog className="h-4 w-4 shrink-0 sm:h-[1.125rem] sm:w-[1.125rem]" strokeWidth={2.25} aria-hidden />
                <span className="max-[380px]:sr-only">Ver Sitio</span>
              </Link>
              <NotificationBell
                open={notifSheetOpen}
                onOpenChange={setNotifSheetOpen}
                notifications={notifications}
                onMarkAsRead={handleMarkAsRead}
                onDeleteRead={handleDeleteReadNotifications}
                onRequestPurgeAll={() => setConfirmPurgeNotifications(true)}
                onRefresh={refreshNotifications}
              />
              <Button variant="outline" onClick={handleLogout} className="h-9 w-9 p-0 bg-transparent rounded-lg border-2 border-foreground shadow-[3px_3px_0px_0px_#000000] active:translate-y-1 active:shadow-none transition-all md:h-10 md:w-auto md:px-4">
                <LogOut className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Cerrar Sesion</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Navigation Tabs Section */}
        <nav className="bg-background">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="flex min-w-0 items-center justify-between gap-2 py-1.5 sm:py-2">
              <div
                className={cn(
                  "no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto scroll-smooth pb-1 [-webkit-overflow-scrolling:touch] overscroll-x-contain sm:gap-2",
                  isMainTopTabs && "max-md:justify-center",
                )}
              >
                {mobileTabs.map((tab) => {
                  const Icon = tab.icon || HelpCircle
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id)
                        router.replace(`?tab=${tab.id}`, { scroll: false })
                      }}
                      className={`flex min-h-[2.75rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border-2 px-2 py-1.5 text-[9px] font-semibold leading-tight transition-all duration-300 max-md:min-w-[4.75rem] max-md:max-w-[5.5rem] sm:flex-1 sm:flex-row sm:min-w-0 sm:gap-2 sm:px-3 sm:py-2.5 sm:text-xs sm:leading-normal md:text-sm ${activeTab === tab.id
                        ? "bg-primary text-primary-foreground border-foreground shadow-[3px_3px_0px_0px_#000000]"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground bg-muted/30 border-transparent"
                        }`}
                    >
                      <Icon className="h-4 w-4 shrink-0 sm:h-4 md:h-5 md:w-5" />
                      <span className="max-w-full text-center wrap-break-word sm:inline">{tab.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </nav>
      </div>

      <main className="container mx-auto max-w-full px-3 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-8">
        <div className={cn("grid gap-6", showSidebar && "lg:grid-cols-3")}>

          {showSidebar && mascotaActiva && (
            <Card className="lg:col-span-1 h-fit p-0 border-[3px] border-[#000000] shadow-[8px_8px_0px_0px_#000000] bg-[#e7bef8] lg:sticky lg:top-[150px]">
              <div className="flex flex-col gap-2 p-3 sm:p-4 lg:items-stretch lg:gap-0 lg:space-y-4 lg:p-6">
                <div className="flex w-full shrink-0 flex-col gap-1.5 lg:flex-row lg:items-center lg:justify-between lg:gap-2">
                  <h3 className="text-center text-xs font-bold leading-tight text-foreground/80 lg:text-left lg:text-lg">Mascota Activa</h3>
                  {misMascotas.length > 1 && (
                    <select
                      className="w-full rounded-lg border bg-background px-2 py-1 text-sm lg:max-w-[220px] lg:w-auto lg:text-base"
                      value={mascotaActiva.id}
                      onChange={(e) => {
                        const found = misMascotas.find(m => String(m.id) === e.target.value)
                        if (found) setMascotaActiva(found)
                      }}
                    >
                      {misMascotas.map(m => (
                        <option key={m.id} value={m.id}>{m.nombre}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex w-full flex-row items-center gap-3 lg:flex-col lg:items-center lg:gap-4">
                  <div
                    className="relative group mx-auto shrink-0"
                    style={{ width: 96, height: 96, minWidth: 96, minHeight: 96, maxWidth: 96, maxHeight: 96 }}
                  >
                    <div
                      className="relative flex h-full w-full items-center justify-center overflow-hidden border-[3px] border-[#000000] bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
                      style={{ borderRadius: "9999px" }}
                    >
                      {mascotaActiva.foto ? (
                        <Image
                          src={mascotaActiva.foto}
                          alt={mascotaActiva.nombre}
                          width={96}
                          height={96}
                          className="object-cover object-center focus-visible:outline-none"
                          sizes="96px"
                          style={{ width: "96px", height: "96px", minWidth: "96px", minHeight: "96px" }}
                        />
                      ) : (
                        <PawPrint className="h-7 w-7 text-[#000000]/20 lg:h-12 lg:w-12" />
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 z-10 cursor-pointer rounded-full bg-primary p-1.5 text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
                      <Camera className="h-3 w-3 lg:h-4 lg:w-4" />
                      <input type="file" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (file && validateUpload(file)) {
                          const formData = new FormData()
                          formData.append('file', file)
                          const res = await fetch('/api/upload', { method: 'POST', body: formData })
                          if (res.ok) {
                            const data = await res.json()
                            const updated = { ...mascotaActiva, foto: data.secure_url }
                            await fetch("/api/pets", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) })
                            setMascotaActiva(updated)
                            setMisMascotas(prev => prev.map(m => m.id === updated.id ? updated : m))
                            toast.success("Foto actualizada")
                          }
                        }
                      }} />
                    </label>
                  </div>

                  <div className="relative group min-w-0 flex-1 text-left lg:w-full lg:max-w-none lg:text-center">
                    <h3 className="flex flex-wrap items-center gap-1.5 text-base font-bold leading-tight sm:text-lg lg:justify-center lg:text-2xl">
                      <span className="wrap-break-word">{mascotaActiva.nombre}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 rounded-full opacity-0 transition-opacity hover:bg-primary/10 group-hover:opacity-100 lg:h-8 lg:w-8"
                        onClick={() => {
                          setPetToEdit(mascotaActiva)
                          setActiveTab("mis-mascotas")
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5 text-primary lg:h-4 lg:w-4" />
                      </Button>
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground lg:text-base">{mascotaActiva.raza}</p>
                  </div>
                </div>

                <div className="flex flex-wrap w-full gap-2 pt-2 text-[10px] leading-tight sm:text-xs lg:flex lg:flex-col lg:gap-0 lg:space-y-2 lg:pt-4 lg:text-sm">
                  <div className="flex flex-col flex-1 min-w-[calc(50%-8px)] items-center justify-center text-center gap-1 rounded-xl border-2 border-foreground/20 bg-white/90 px-3 py-2.5 lg:flex-row lg:items-center lg:justify-between lg:px-4 lg:py-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
                    <span className="text-muted-foreground font-bold uppercase tracking-widest text-[9px] text-center lg:text-left">Especie</span>
                    <span className="font-black capitalize text-[#000000] break-words text-center lg:text-right lg:pl-2">{mascotaActiva.tipo}</span>
                  </div>
                  <div className="flex flex-col flex-1 min-w-[calc(50%-8px)] items-center justify-center text-center gap-1 rounded-xl border-2 border-foreground/20 bg-white/90 px-3 py-2.5 lg:flex-row lg:items-center lg:justify-between lg:px-4 lg:py-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
                    <span className="text-muted-foreground font-bold uppercase tracking-widest text-[9px] text-center lg:text-left">Sexo</span>
                    <span className="font-black capitalize text-[#000000] break-words text-center lg:text-right lg:pl-2">{mascotaActiva.sexo || "No definido"}</span>
                  </div>
                  <div className="flex flex-col flex-1 min-w-[calc(50%-8px)] items-center justify-center text-center gap-1 rounded-xl border-2 border-foreground/20 bg-white/90 px-3 py-2.5 lg:flex-row lg:items-center lg:justify-between lg:px-4 lg:py-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
                    <span className="text-muted-foreground font-bold uppercase tracking-widest text-[9px] text-center lg:text-left">Edad</span>
                    <span className="font-black text-[#000000] break-words text-center lg:text-right lg:pl-2">{calcularEdad(mascotaActiva.fechaNacimiento, mascotaActiva.edad, mascotaActiva.tipo, mascotaActiva.raza)}</span>
                  </div>
                  <div className="flex flex-col flex-1 min-w-[calc(50%-8px)] items-center justify-center text-center gap-1 rounded-xl border-2 border-foreground/20 bg-white/90 px-3 py-2.5 lg:flex-row lg:items-center lg:justify-between lg:px-4 lg:py-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
                    <span className="text-muted-foreground font-bold uppercase tracking-widest text-[9px] text-center lg:text-left">Peso</span>
                    <span className="font-black text-[#000000] break-words text-center lg:text-right lg:pl-2">{mascotaActiva.peso} kg</span>
                  </div>
                </div>

                <div className="w-full min-w-0 space-y-2 pt-2 font-sans lg:space-y-3 lg:pt-4">
                  <h4 className="flex items-center justify-center gap-1.5 text-center text-xs font-bold text-[#000000] lg:justify-start lg:text-left lg:text-sm">
                    <User className="h-3.5 w-3.5 shrink-0 text-primary lg:h-4 lg:w-4" />
                    Veterinario Asignado
                  </h4>
                  <div className="space-y-1.5 lg:space-y-2">
                    {assignedVet ? (
                      <div className="flex flex-col gap-1.5 lg:gap-2">
                        <div className="flex items-center gap-2 rounded-lg border-2 border-foreground/10 bg-white p-2 transition-all group hover:border-primary/30 lg:gap-3 lg:rounded-xl lg:p-3">
                          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border-2 border-foreground/5 bg-[#f0f0f0] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)] lg:h-10 lg:w-10 lg:rounded-lg">
                            {assignedVet.image ? (
                              <Image
                                src={assignedVet.image}
                                alt={assignedVet.name || "Veterinario"}
                                fill
                                loading="lazy"
                                decoding="async"
                                sizes="40px"
                                className="object-cover"
                              />
                            ) : (
                              <User className="h-4 w-4 text-foreground/30 lg:h-5 lg:w-5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 leading-tight">
                            <p className={`text-xs font-bold leading-snug lg:text-sm ${assignedVetStatus === 'pendiente' ? 'text-foreground/50' : 'font-black text-[#000000]'}`}>
                              {assignedVet.name}
                              {assignedVetStatus === 'pendiente' && <span className="ml-1.5 text-[9px] font-black uppercase bg-[#ede986] text-[#000000] border border-[#000000]/30 rounded-full px-1.5 py-0.5 lg:text-[10px]">(Sol.)</span>}
                            </p>
                            <p className="truncate text-[9px] font-bold uppercase text-foreground/40 lg:text-[10px]">{assignedVet.specialty || 'Veterinario General'}</p>
                          </div>
                        </div>
                        {assignedVet.phone && (
                          <div className="flex items-center gap-1.5 rounded-md border border-foreground/15 bg-white/50 px-2 py-1 text-[10px] font-bold text-foreground/60 lg:px-3 lg:text-[11px]">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span className="min-w-0 truncate">{formatEcuadorPhoneDisplay(assignedVet.phone) || assignedVet.phone}</span>
                          </div>
                        )}
                        {assignedVet.clinicName && (
                          <div className="flex flex-col gap-0.5 rounded-md border border-foreground/15 bg-[#eef4ff] px-2 py-1.5 text-[10px] text-foreground/80 lg:px-3 lg:text-[11px]">
                            <div className="flex items-center gap-1.5 font-black text-[#000000] text-[11px] lg:text-xs">
                              <Building2 className="h-3.5 w-3.5 shrink-0" />
                              <span className="min-w-0 truncate">{assignedVet.clinicName}</span>
                            </div>
                            {assignedVet.address && (
                              <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(assignedVet.clinicName ? `${assignedVet.clinicName}, ${assignedVet.address}` : assignedVet.address)}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-start gap-1.5 font-bold ml-4 text-[#000000]/80 hover:text-[#000000] transition-colors group"
                              >
                                <MapPin className="h-3 w-3 shrink-0 mt-0.5 text-[#000000]/50 group-hover:text-[#000000] transition-colors" />
                                <span className="min-w-0 line-clamp-2 hover:underline">{assignedVet.address}</span>
                              </a>
                            )}
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-full rounded-lg border-2 border-foreground bg-white px-3 py-0 text-xs font-bold shadow-[3px_3px_0px_0px_#000000] transition-all active:translate-y-px active:shadow-none lg:mt-1 lg:h-9 lg:rounded-xl lg:text-sm lg:shadow-[4px_4px_0px_0px_#000000] md:w-auto"
                          onClick={() => {
                            const rawPhone = assignedVet.phone || ""
                            const cleanPhone = normalizeEcuadorPhone(rawPhone)
                            if (cleanPhone) {
                              window.open(`https://wa.me/${cleanPhone}`, "_blank")
                            } else {
                              toast.info(`No hay número de contacto registrado para ${assignedVet.name}`)
                            }
                          }}
                        >
                          <MessageSquare className="mr-1.5 h-3 w-3 shrink-0 text-primary lg:mr-2 lg:h-3.5 lg:w-3.5" />
                          Contactar
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2 rounded-xl border-[3px] border-[#000000] bg-white p-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] lg:p-4">
                        <p className="text-[11px] font-black leading-snug text-[#000000] lg:text-xs text-center">Aún no tienes un veterinario de confianza.</p>
                        <Button
                          onClick={() => setActiveTab('citas')}
                          className="h-8 w-full border-2 border-[#000000] bg-[#ede986] text-[10px] font-black uppercase shadow-[3px_3px_0px_0px_#000] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none lg:h-9"
                        >
                          Agendar Cita Ahora →
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          <div className={`min-w-0 space-y-6 ${showSidebar ? "lg:col-span-2" : "col-span-full"}`}>
            
             {/* ============= TAB: MIS MASCOTAS ============= */}
             {activeTab === "mis-mascotas" && (
                <MascotasTab 
                  misMascotas={misMascotas} 
                  mascotaActiva={mascotaActiva} 
                  setMascotaActiva={setMascotaActiva}
                  onDeletePet={handleDeletePet}
                  onSavePet={handleAddPet}
                  onUpdatePet={(id, data) => handleAddPet({ ...data, id })}
                  setActiveTab={setActiveTab}
                  petToEdit={petToEdit}
                  setPetToEdit={setPetToEdit}
                />
             )}

             {/* ============= TAB: PERFIL ============= */}
             {activeTab === "perfil" && (
                tieneMascotas && mascotaActiva ? (
                  <ProfileSection 
                    mascota={mascotaActiva} 
                    misMascotas={misMascotas}
                    onSelectMascota={setMascotaActiva}
                    vacunaciones={vacunaciones}
                    setActiveTab={setActiveTab}
                  />
                ) : (
                  <RequiereMascota onIrARegistrar={() => { setActiveTab("mis-mascotas") }} />
                )
             )}

             {/* ============= TABS DE SERVICIOS (HealthTab, EventsTab, etc) ============= */}
             {(activeTab === "vacunacion" || activeTab === "historial") && (
                <HealthTab 
                  mascotaActiva={mascotaActiva!}
                  vacunaciones={vacunaciones}
                  diagnosticos={diagnosticos}
                  tratamientos={tratamientos}
                  preventivos={preventivos}
                  exams={exams}
                  view={activeTab as "vacunacion" | "historial"}
                />
             )}

             {/* ============= TAB: ACOGIDA ============= */}
             {activeTab === "acogida" && (
                <AcogidaTab 
                  adopcionPets={perros} 
                  misSolicitudes={misSolicitudes} 
                  onEnviarSolicitud={handleEnviarSolicitud} 
                />
             )}

             {/* ============= TAB: GPS ============= */}
             {activeTab === "gps" && mascotaActiva && <GPSTab mascotaActiva={mascotaActiva} />}

             {/* ============= TAB: EVENTOS ============= */}
             {activeTab === "eventos" && (
                  <EventsTab 
                    key={String(mascotaActiva?.id || "none")}
                    eventos={eventos} 
                    misMascotas={misMascotas} 
                    mascotaActiva={mascotaActiva}
                    currentUserId={session?.user?.id}
                    onInscribirse={handleInscribirseEvento} 
                  />
             )}

             {/* ============= TAB: CITAS ============= */}
             {activeTab === "citas" && (
                <CitasTab 
                  citas={citas} 
                  mascotaActiva={mascotaActiva!} 
                  assignedVet={assignedVet}
                  vets={vets}
                  userName={session?.user?.name || "Usuario"}
                  refreshData={fetchData}
                />
             )}

             {/* ============= TAB: COMPRAS ============= */}
             {activeTab === "compras" && (
                <ComprasTab orders={compras} loading={loading} />
             )}

             {/* ============= TAB: MI CUENTA ============= */}
             {activeTab === "mi-cuenta" && (
                <MiCuentaTab />
             )}

          </div>
        </div>
      </main>

      {confirmModal.isOpen && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          description={confirmModal.description}
          onConfirm={() => Promise.resolve(confirmModal.onConfirm())}
          onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        />
      )}

      <ConfirmModal
        isOpen={confirmPurgeNotifications}
        onClose={() => setConfirmPurgeNotifications(false)}
        onConfirm={handlePurgeAllNotifications}
        title="¿Borrar TODAS las notificaciones?"
        description="Se eliminarán también las no leídas, por ejemplo una solicitud de acceso al historial clínico que aún no hayas aceptado o rechazado. Si solo quieres limpiar lo antiguo, usa la papelera (solo leídas)."
        confirmText="Sí, borrar todo"
        cancelText="Cancelar"
        variant="destructive"
      />
    </div>
  )
}

export default function MiMascotaPage() {
  return (
    <React.Suspense fallback={<MiauLoading text="Cargando tu espacio..." fullScreen />}>
      <MiMascotaPageContent />
    </React.Suspense>
  )
}
