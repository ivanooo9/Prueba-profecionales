import React, { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import { Bell, CheckCircle2, BookmarkCheck, Trash2, XCircle, X, User, FileText, PawPrint, ShoppingBag, Heart, Stethoscope, Info, AlertTriangle, Ticket, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription, SheetClose } from "@/components/ui/sheet"
import { NotificationMetadata } from "@/lib/notification"
import { formatDate } from "@/lib/utils"

interface Notification {
  id: string
  title: string
  message: string
  type: string
  actionUrl?: string | null
  metadata?: NotificationMetadata
  read: boolean
  createdAt: string
}

interface AdminNotificationBellProps {
  notifications: Notification[]
  onMarkAsRead: (id: string) => void
  onNotificationClick: (n: Notification) => void
  onDeleteAll: () => void
  onDeleteSingle: (id: string) => void
}

export const AdminNotificationBell: React.FC<AdminNotificationBellProps> = ({ 
  notifications, 
  onMarkAsRead, 
  onNotificationClick,
  onDeleteAll,
  onDeleteSingle
}) => {
  const unreadCount = notifications.filter(n => !n.read).length

  const getIcon = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle2 className="h-5 w-5 text-[#000000]" />
      case "warning": return <AlertTriangle className="h-5 w-5 text-[#000000]" />
      case "error": return <XCircle className="h-5 w-5 text-[#000000]" />
      case "veterinario_registration": return <Stethoscope className="h-5 w-5 text-[#000000]" />
      case "user_registration": return <User className="h-5 w-5 text-[#000000]" />
      case "blog_post": return <FileText className="h-5 w-5 text-[#000000]" />
      case "pet_registration": return <PawPrint className="h-5 w-5 text-[#000000]" />
      case "order_pending": return <ShoppingBag className="h-5 w-5 text-[#000000]" />
      case "adoption": return <Heart className="h-5 w-5 text-[#000000]" />
      case "event_registration": return <Ticket className="h-5 w-5 text-[#000000]" />
      case "vet_support": return <Send className="h-5 w-5 text-[#000000]" />
      case "admin_audit": return <FileText className="h-5 w-5 text-[#000000]" />
      case "pet_found": return <PawPrint className="h-5 w-5 text-[#000000]" />
      default: return <Info className="h-5 w-5 text-[#000000]" />
    }
  }

  const getBg = (type: string) => {
    switch (type) {
      case "success": return "bg-[#93ABD9]"
      case "warning": return "bg-[#ffd6a5]"
      case "error": return "bg-[#ffadad]"
      case "veterinario_registration": return "bg-[#00C9A7]" // Turquesa médico
      case "user_registration": return "bg-[#93ABD9]" // Azul neobrutalista
      case "blog_post": return "bg-[#fdffb6]"
      case "pet_registration": return "bg-[#ffc6ff]" // Rosa/Morado
      case "order_pending": return "bg-[#FFDE59]" // Amarillo saturado
      case "adoption": return "bg-[#ffadad]"
      case "event_registration": return "bg-[#93ABD9]" // Naranja vibrante
      case "vet_support": return "bg-[#9bf6ff]" // Celeste informativo
      case "admin_audit": return "bg-[#fdffb6]" // Amarillo pastel
      case "pet_found": return "bg-[#ffadad]" // Rojo urgente
      default: return "bg-[#e2e2e2]"
    }
  }

  const [isOpen, setIsOpen] = useState(false)
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null)
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false)
  const [viewNotification, setViewNotification] = useState<Notification | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleNotificationClick = (n: Notification) => {
    setViewNotification(n)
    setIsOpen(false)
  }

  const confirmDeleteSingle = () => {
    if (notificationToDelete) {
      onDeleteSingle(notificationToDelete)
      toast.success("Notificación eliminada", { duration: 2000 })
      setNotificationToDelete(null)
    }
  }

  const confirmDeleteAll = () => {
    onDeleteAll()
    toast.success("Todas las notificaciones eliminadas", { duration: 2000 })
    setShowDeleteAllConfirm(false)
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="relative h-12 w-12 rounded-xl bg-white border-[3px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#000000] transition-all"
        >
          <Bell className="h-6 w-6 text-[#000000]" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-2 -right-2 h-6 min-w-[24px] flex items-center justify-center p-0 bg-[#ff5a5a] text-white border-[2px] border-[#000000] rounded-full font-black text-[10px]"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent 
        hideClose={true}
        className="w-full sm:max-w-md p-0 border-l-[4px] border-[#000000] bg-[#fdfaf5] font-body text-[#000000] shadow-2xl font-heading"
      >
        <SheetHeader className="p-8 border-b-[3px] border-[#000000] bg-[#93ABD9] relative">
          <div className="absolute right-4 top-4 flex gap-3 z-10">
            {notifications.length > 0 && (
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10 rounded-full bg-white border-[2px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] hover:bg-[#ffadad] transition-all p-0 flex items-center justify-center cursor-pointer"
                onClick={() => {
                  setShowDeleteAllConfirm(true)
                  setIsOpen(false)
                }}
                title="Borrar todas"
              >
                <Trash2 className="h-5 w-5 text-[#000000]" />
              </Button>
            )}
            <SheetClose asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10 rounded-full bg-white border-[2px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] hover:bg-[#ffadad] transition-all p-0 flex items-center justify-center cursor-pointer"
              >
                <X className="h-5 w-5 text-[#000000]" />
              </Button>
            </SheetClose>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <SheetTitle className="text-3xl font-black font-heading flex items-center gap-2 text-[#000000]">
                Notificaciones
                {unreadCount > 0 && (
                  <Badge className="bg-white text-[#000000] border-[2px] border-[#000000] rounded-lg h-7 font-black text-xs px-2 shadow-[2px_2px_0px_0px_#000000]">
                    {unreadCount} NUEVAS
                  </Badge>
                )}
              </SheetTitle>
              <SheetDescription className="text-sm font-bold text-[#000000]/70">
                Avisos críticos y gestión de plataforma
              </SheetDescription>
            </div>
            {/* Botón anterior removido y movido al lado de la X */}
          </div>
        </SheetHeader>

        <div className="overflow-y-auto max-h-[calc(100vh-160px)] px-6 py-6 space-y-4 no-scrollbar">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="h-20 w-20 bg-white border-[3px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] rounded-3xl flex items-center justify-center mb-6">
                <Bell className="h-10 w-10 text-[#000000]/30" />
              </div>
              <p className="font-black text-2xl text-[#000000]">¡Panel despejado!</p>
              <p className="font-bold text-[#000000]/50 mt-1">No hay notificaciones pendientes</p>
            </div>
          ) : (
            [...notifications]
              .sort((a, b) => Number(a.read) - Number(b.read))
              .map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`relative p-5 rounded-2xl border-[3px] border-[#000000] transition-all cursor-pointer group
                  ${n.read 
                    ? "bg-white/30 opacity-60 grayscale-[0.8] hover:opacity-100 hover:grayscale-0" 
                    : "bg-white shadow-[4px_4px_0px_0px_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#000000]"
                  }
                `}
              >
                {!n.read && (
                  <div className="absolute right-4 top-4 h-3 w-3 bg-[#93ABD9] border-[2px] border-[#000000] rounded-full" />
                )}
                
                <div className="flex gap-5">
                  <div className={`h-12 w-12 rounded-xl border-[2px] border-[#000000] flex flex-shrink-0 items-center justify-center shadow-[2px_2px_0px_0px_#000000] ${getBg(n.type)}`}>
                    {getIcon(n.type)}
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <p className={`text-lg font-black leading-tight ${n.read ? "text-[#000000]/60" : "text-[#000000]"}`}>
                      {n.title}
                    </p>
                    <p className="text-sm font-bold text-[#000000]/80 leading-relaxed pr-2">
                      {n.message}
                    </p>
                    <div className="flex items-center gap-2 pt-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-white bg-[#000000] px-2 py-0.5 rounded-md">
                        {formatDate(n.createdAt)}
                      </p>
                      <p className="text-[10px] font-bold text-[#000000]/40">
                         {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>

                {!n.read && (
                  <div className="mt-4 pt-4 border-t-[2px] border-[#000000]/5 flex justify-between items-center">
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation()
                        setNotificationToDelete(n.id)
                        setIsOpen(false)
                      }}
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-[10px] font-black uppercase tracking-wider bg-white hover:bg-[#ffadad] text-[#000000] border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000] rounded-lg transition-all active:translate-y-0.5 active:shadow-none gap-2 px-3"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Borrar
                    </Button>

                    <Button 
                      onClick={(e) => {
                        e.stopPropagation()
                        onMarkAsRead(n.id)
                      }}
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-[10px] font-black uppercase tracking-wider bg-[#93ABD9] hover:bg-[#86b1f2] text-[#000000] border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000] rounded-lg transition-all active:translate-y-0.5 active:shadow-none gap-2 px-4"
                    >
                      <BookmarkCheck className="h-4 w-4" />
                      Marcar Leída
                    </Button>
                  </div>
                )}
                {n.read && (
                   <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Button 
                        onClick={(e) => {
                          e.stopPropagation()
                          setNotificationToDelete(n.id)
                          setIsOpen(false)
                        }}
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 bg-white border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000] rounded-lg"
                      >
                        <Trash2 className="h-4 w-4 text-[#ff5a5a]" />
                      </Button>
                   </div>
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
      </Sheet>

      {/* MODALS RENDERED IN PORTAL TO ESCAPE Z-INDEX STACKING CONTEXT */}
      {mounted && createPortal(
        <>
          {/* MODAL ELIMINAR UNA */}
          {notificationToDelete && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-sm bg-[#fdfaf5] border-[3px] border-[#000000] rounded-2xl shadow-[8px_8px_0px_0px_#000000] overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-[#ffadad] border-b-[3px] border-[#000000] p-5 flex items-center gap-3">
                  <div className="bg-white p-2 rounded-xl border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                    <AlertTriangle className="h-6 w-6 text-[#000000]" />
                  </div>
                  <h3 className="font-black text-xl text-[#000000]">¿Borrar notificación?</h3>
                </div>
                <div className="p-6">
                  <p className="font-bold text-[#000000]/80 text-sm mb-6 leading-relaxed">
                    Esta acción no se puede deshacer. ¿Estás seguro de querer borrarla?
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setNotificationToDelete(null)}
                      variant="outline"
                      className="flex-1 h-12 border-[3px] border-[#000000] font-black text-[#000000] rounded-xl shadow-[3px_3px_0px_0px_#000000] hover:bg-[#e2e2e2] hover:-translate-y-0.5 transition-all"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={confirmDeleteSingle}
                      className="flex-1 h-12 bg-[#ff5a5a] text-white border-[3px] border-[#000000] font-black rounded-xl shadow-[3px_3px_0px_0px_#000000] hover:bg-[#ff3b3b] hover:-translate-y-0.5 transition-all"
                    >
                      Sí, borrar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODAL ELIMINAR TODAS */}
          {showDeleteAllConfirm && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-sm bg-[#fdfaf5] border-[3px] border-[#000000] rounded-2xl shadow-[8px_8px_0px_0px_#000000] overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-[#ffadad] border-b-[3px] border-[#000000] p-5 flex items-center gap-3">
                  <div className="bg-white p-2 rounded-xl border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                    <AlertTriangle className="h-6 w-6 text-[#000000]" />
                  </div>
                  <h3 className="font-black text-xl text-[#000000]">¿Borrar TODAS?</h3>
                </div>
                <div className="p-6">
                  <p className="font-bold text-[#000000]/80 text-sm mb-6 leading-relaxed">
                    Se eliminarán todas tus notificaciones actuales de forma permanente.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setShowDeleteAllConfirm(false)}
                      variant="outline"
                      className="flex-1 h-12 border-[3px] border-[#000000] font-black text-[#000000] rounded-xl shadow-[3px_3px_0px_0px_#000000] hover:bg-[#e2e2e2] hover:-translate-y-0.5 transition-all"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={confirmDeleteAll}
                      className="flex-1 h-12 bg-[#ff5a5a] text-white border-[3px] border-[#000000] font-black rounded-xl shadow-[3px_3px_0px_0px_#000000] hover:bg-[#ff3b3b] hover:-translate-y-0.5 transition-all"
                    >
                      Vaciar todo
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODAL VISTA PREVIA NOTIFICACION */}
          {viewNotification && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-md bg-[#fdfaf5] border-[3px] border-[#000000] rounded-2xl shadow-[10px_10px_0px_0px_#000000] overflow-hidden animate-in zoom-in-95 duration-200">
                <div className={`border-b-[3px] border-[#000000] p-5 flex items-center justify-between ${getBg(viewNotification.type)}`}>
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-xl border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                      {getIcon(viewNotification.type)}
                    </div>
                    <h3 className="font-black text-xl text-[#000000] pr-4 leading-tight">
                      {viewNotification.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => setViewNotification(null)}
                    className="w-8 h-8 shrink-0 rounded-xl bg-white border-[2px] border-[#000000] flex items-center justify-center shadow-[2px_2px_0px_0px_#000000] hover:bg-[#ffadad] transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-6 space-y-6">
                  <div className="bg-white border-[2px] border-[#000000] p-4 rounded-xl shadow-[3px_3px_0px_0px_#000000]">
                    <p className="font-bold text-[#000000] text-[15px] leading-relaxed">
                      {viewNotification.message}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs font-black text-[#000000]/50 uppercase tracking-wider">
                    <span>{formatDate(viewNotification.createdAt)}</span>
                    <span>•</span>
                    <span>{new Date(viewNotification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={() => setViewNotification(null)}
                      variant="outline"
                      className="flex-1 h-12 border-[3px] border-[#000000] font-black text-[#000000] rounded-xl shadow-[3px_3px_0px_0px_#000000] hover:bg-[#e2e2e2] hover:-translate-y-0.5 transition-all"
                    >
                      Entendido
                    </Button>
                    {viewNotification.actionUrl && (
                      <Button
                        onClick={() => {
                          setViewNotification(null)
                          onNotificationClick(viewNotification)
                        }}
                        className="flex-1 h-12 bg-[#93ABD9] text-[#000000] border-[3px] border-[#000000] font-black rounded-xl shadow-[3px_3px_0px_0px_#000000] hover:bg-[#86b1f2] hover:-translate-y-0.5 transition-all"
                      >
                        Ver Detalles
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>,
        document.body
      )}
    </>
  )
}
