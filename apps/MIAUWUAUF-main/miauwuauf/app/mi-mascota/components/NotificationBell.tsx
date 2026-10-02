"use client"

import React, { useState } from "react"
import { Bell, Info, AlertTriangle, CheckCircle2, BookmarkCheck, Trash2, XCircle, X, Stethoscope, PawPrint } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription, SheetClose } from "@/components/ui/sheet"
import { formatDate } from "@/lib/utils"
import { respondToAccessRequest } from "@/app/actions/medical-permission"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

const LILA = "#9E97B1"
const CREMA = "#FDF9F0"

interface Notification {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  createdAt: string
  actionUrl?: string | null
  metadata?: Record<string, unknown> | null
}

interface NotificationBellProps {
  notifications: Notification[]
  onMarkAsRead: (id: string) => void
  /** Borra solo notificaciones leídas en servidor (deja no leídas, p. ej. acceso médico pendiente). */
  onDeleteRead: () => void | Promise<void>
  /** Abre confirmación en el padre para borrar absolutamente todas. */
  onRequestPurgeAll: () => void
  /** Sheet control from parent (p. ej. abrir con ?openNotifications=1) */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onRefresh?: () => void | Promise<void>
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  notifications,
  onMarkAsRead,
  onDeleteRead,
  onRequestPurgeAll,
  open: controlledOpen,
  onOpenChange,
  onRefresh
}) => {
  const [internalOpen, setInternalOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const isControlled = controlledOpen !== undefined
  const sheetOpen = isControlled ? controlledOpen : internalOpen
  const setSheetOpen = isControlled && onOpenChange ? onOpenChange : setInternalOpen

  const [responding, setResponding] = useState<string | null>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />
      case "medical_access_request":
        return <Stethoscope className="h-4 w-4 text-[#000000]" />
      case "pet_found":
        return <PawPrint className="h-4 w-4 text-[#000000]" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getBg = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-50"
      case "warning":
        return "bg-amber-50"
      case "error":
        return "bg-red-50"
      case "medical_access_request":
        return "bg-[#9E97B1]/40"
      case "pet_found":
        return "bg-red-100"
      default:
        return "bg-blue-50"
    }
  }

  const handleMedicalResponse = async (notificationId: string, permissionId: string, accept: boolean) => {
    setResponding(`${notificationId}-${accept ? "a" : "r"}`)
    try {
      const r = await respondToAccessRequest(permissionId, accept)
      if (r.ok) {
        toast.success(accept ? "Permiso concedido al veterinario." : "Solicitud rechazada.")
        try {
          await Promise.resolve(onMarkAsRead(notificationId))
        } catch (e) {
          console.error("onMarkAsRead", e)
        }
        try {
          await onRefresh?.()
        } catch (e) {
          console.error("onRefresh", e)
        }
      } else {
        toast.error("error" in r && r.error ? r.error : "No se pudo actualizar.")
      }
    } catch (e) {
      console.error("respondToAccessRequest", e)
      toast.error(e instanceof Error ? e.message : "Error al responder")
    } finally {
      setResponding(null)
    }
  }

  const handleOpenWebmail = () => {
    if (!selectedNotification) return;
    
    // Construimos una búsqueda específica para Gmail
    // Buscamos correos que vengan de "miauwuauf" y tengan el título de la notificación
    const query = encodeURIComponent(`from:miauwuauf ${selectedNotification.title}`);
    const gmailSearchUrl = `https://mail.google.com/mail/u/0/#search/${query}`;
    
    window.open(gmailSearchUrl, "_blank", "noopener,noreferrer")
  }

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative h-10 w-10 rounded-full border-stone-200 transition-colors shadow-sm hover:bg-stone-50"
        >
          <Bell className="h-5 w-5 text-stone-600" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 flex h-5 w-5 animate-pulse items-center justify-center rounded-full border-2 border-white bg-red-500 p-0 text-[10px] text-white">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent
        hideClose={true}
        className="w-full border-none bg-white p-0 font-sans shadow-2xl sm:max-w-md font-heading"
      >
        <SheetHeader className="relative border-b bg-stone-50/50 p-6">
          <div className="absolute right-4 top-4 z-10 flex gap-3">
            {notifications.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-[2px] border-[#000000] bg-white p-0 shadow-[3px_3px_0px_0px_#000000] transition-all hover:bg-[#ffadad]"
                onClick={() => {
                  void Promise.resolve(onDeleteRead()).catch((e) => {
                    console.error("onDeleteRead", e)
                    toast.error("No se pudo completar la acción")
                  })
                }}
                title="Borrar solo leídas (conserva no leídas y pendientes)"
              >
                <Trash2 className="h-4 w-4 text-[#000000]" />
              </Button>
            )}
            <SheetClose asChild>
              <Button
                variant="outline"
                size="icon"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-[2px] border-[#000000] bg-white p-0 shadow-[3px_3px_0px_0px_#000000] transition-all hover:bg-[#ffadad]"
              >
                <X className="h-4 w-4 text-[#000000]" />
              </Button>
            </SheetClose>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <SheetTitle className="flex items-center gap-2 text-xl font-bold text-stone-800">
                Notificaciones
                {unreadCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-5 rounded-full border-none bg-stone-200 text-[10px] text-stone-700 hover:bg-stone-200"
                  >
                    {unreadCount} nuevas
                  </Badge>
                )}
              </SheetTitle>
              <SheetDescription className="text-xs text-stone-500">
                Entérate de los cambios en tus citas y mascotas. El ícono de papelera quita las{" "}
                <span className="font-bold">ya leídas</span> sin tocar las nuevas.{" "}
                <button
                  type="button"
                  className="mt-1 block w-full text-left font-bold text-red-600 underline decoration-2 underline-offset-2 sm:mt-0 sm:inline"
                  onClick={onRequestPurgeAll}
                >
                  Borrar todo (incl. no leídas)…
                </button>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-4 max-h-[calc(100vh-100px)] space-y-2 overflow-y-auto px-4 py-2 pb-10">
          {notifications.filter((n) => !n.read).length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-50">
                <Bell className="h-8 w-8 text-stone-200" />
              </div>
              <p className="text-lg font-bold text-stone-400">No tienes notificaciones</p>
              <p className="text-sm text-stone-300">Te avisaremos cuando haya novedades</p>
            </div>
          ) : (
            notifications
              .filter((n) => !n.read)
              .map((n) => {
                const meta = n.metadata
                const permissionId =
                  typeof meta?.permissionId === "string" ? meta.permissionId : undefined
                const isMedical = Boolean(permissionId && n.type === "medical_access_request")

                return (
                  <div
                    key={n.id}
                    className={`group relative cursor-pointer rounded-2xl border p-4 transition-all ${
                      n.read
                        ? "border-stone-100 bg-white opacity-60"
                        : "border-stone-200 bg-white shadow-sm ring-1 ring-stone-50 hover:shadow-md"
                    } `}
                    onClick={() => {
                      setSheetOpen(false)
                      setSelectedNotification(n)
                    }}
                  >
                    {!n.read && <div className="absolute right-4 top-4 h-2 w-2 rounded-full bg-blue-500" />}

                    <div className="flex gap-4">
                      <div
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${getBg(
                          n.type
                        )}`}
                      >
                        {getIcon(n.type)}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <p
                          className={`text-sm font-bold leading-none ${n.read ? "text-stone-500" : "text-stone-800"}`}
                        >
                          {n.title}
                        </p>
                        <p className="pr-2 text-xs leading-relaxed text-stone-500">{n.message}</p>
                        {isMedical && (
                          <div
                            className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              type="button"
                              size="sm"
                              disabled={!!responding}
                              className="border-[2px] border-foreground font-black shadow-[2px_2px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5"
                              style={{ backgroundColor: LILA, color: "#000" }}
                              onClick={() => handleMedicalResponse(n.id, permissionId!, true)}
                            >
                              {responding === `${n.id}-a` ? "…" : "Aceptar"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={!!responding}
                              className="border-[2px] border-foreground font-black bg-white shadow-[2px_2px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5"
                              style={{ backgroundColor: CREMA, color: "#000" }}
                              onClick={() => handleMedicalResponse(n.id, permissionId!, false)}
                            >
                              {responding === `${n.id}-r` ? "…" : "Rechazar"}
                            </Button>
                          </div>
                        )}
                        <p className="pt-1 text-[10px] font-bold uppercase tracking-wide text-stone-300">
                          {formatDate(n.createdAt)} — {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>

                    {!n.read && !isMedical && (
                      <div className="mt-3 flex justify-end border-t border-stone-50 pt-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1.5 rounded-full px-3 text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                          onClick={(e) => {
                            e.stopPropagation()
                            onMarkAsRead(n.id)
                          }}
                        >
                          <BookmarkCheck className="h-3 w-3" />
                          Marcar como leída
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })
          )}
        </div>
      </SheetContent>

      {/* Modal de Detalle de Notificación */}
      <Dialog open={!!selectedNotification} onOpenChange={(open) => !open && setSelectedNotification(null)}>
        <DialogContent className="hide-scrollbar-touch max-h-[90dvh] max-w-lg overflow-y-auto overflow-x-hidden border-[4px] border-black bg-white p-8 shadow-[10px_10px_0px_0px_#000000] sm:rounded-[2rem]">
          <DialogHeader className="space-y-4">
            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border-[3px] border-black shadow-[4px_4px_0px_0px_#000000] ${selectedNotification?.type === 'medical_access_request' ? 'bg-[#9E97B1]/40' : 'bg-[#E7BEF8]'}`}>
              {selectedNotification && getIcon(selectedNotification.type)}
            </div>
            <DialogTitle className="font-heading text-3xl font-black leading-none tracking-tighter text-black uppercase">
              {selectedNotification?.title}
            </DialogTitle>
            <DialogDescription className="text-lg font-bold leading-relaxed text-stone-600">
              {selectedNotification?.message}
            </DialogDescription>
          </DialogHeader>

          {selectedNotification && (() => {
            const meta = selectedNotification.metadata
            const permissionId = typeof meta?.permissionId === "string" ? meta.permissionId : undefined
            const isMedicalModal = selectedNotification.type === "medical_access_request" && permissionId
            if (!isMedicalModal) return null
            return (
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  type="button"
                  size="lg"
                  disabled={!!responding}
                  className="flex-1 h-14 rounded-xl border-[3px] border-black bg-[#9E97B1] text-lg font-black text-black shadow-[5px_5px_0px_0px_#000000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000000] active:translate-y-[1px] active:shadow-none"
                  onClick={() => handleMedicalResponse(selectedNotification.id, permissionId!, true)}
                >
                  {responding === `${selectedNotification.id}-a` ? "…" : "Aceptar"}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  disabled={!!responding}
                  className="flex-1 h-14 rounded-xl border-[3px] border-black bg-white text-lg font-black text-black shadow-[5px_5px_0px_0px_#000000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000000] active:translate-y-[1px] active:shadow-none"
                  onClick={() => handleMedicalResponse(selectedNotification.id, permissionId!, false)}
                >
                  {responding === `${selectedNotification.id}-r` ? "…" : "Rechazar"}
                </Button>
              </div>
            )
          })()}

          <div className="mt-6 flex flex-col gap-4 sm:flex-row">
            <Button
              className="flex-1 h-14 rounded-xl border-[3px] border-black bg-[#EDE986] text-lg font-black text-black shadow-[5px_5px_0px_0px_#000000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000000] active:translate-y-[1px] active:shadow-none"
              onClick={() => {
                if (selectedNotification && !selectedNotification.read) {
                  void Promise.resolve(onMarkAsRead(selectedNotification.id)).catch(() => {})
                }
                setSelectedNotification(null)
              }}
            >
              Entendido
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-14 rounded-xl border-[3px] border-black bg-white text-lg font-black text-black shadow-[5px_5px_0px_0px_#000000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000000] active:translate-y-[1px] active:shadow-none"
              onClick={handleOpenWebmail}
            >
              Ver en mi correo
            </Button>
          </div>
          
          <p className="mt-6 text-center text-xs font-bold uppercase tracking-widest text-stone-400">
            {selectedNotification && formatDate(selectedNotification.createdAt)}
          </p>
        </DialogContent>
      </Dialog>
    </Sheet>
  )
}
