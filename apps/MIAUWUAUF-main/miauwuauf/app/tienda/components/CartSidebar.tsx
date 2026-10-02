"use client"

import { useState, useRef, useEffect } from "react"
import { useCart } from "../context/CartContext"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ShoppingCart, ShoppingBag, X, PawPrint, Trash2, Minus, Plus, ArrowLeft, CheckCircle } from "lucide-react"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { CartItem } from "@/lib/admin-service"
import { validateUpload } from "@/lib/upload-validation"
import { DEFAULT_STORE_TAX_SETTINGS, StoreTaxSettings, normalizeStoreTaxSettings } from "@/lib/store-settings"
import {
  ensureEcuadorPhoneInputPrefix,
  formatEcuadorPhoneDisplay,
  normalizeEcuadorPhoneInput,
} from "@/lib/phone"
import { formatPrefixedSequence } from "@/lib/utils"

function normalizeCartStock(raw: unknown): number {
  const n = Math.floor(Number(raw))
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function CartSidebar() {
  type CheckoutPricing = {
    subtotal: number
    iva: number
    surcharge: number
    total: number
  }

  type CheckoutResponse = {
    success?: boolean
    error?: string
    orderId?: string
    displayId?: number | null
    orderCode?: string | null
    requireProof?: boolean
    pricing?: Partial<CheckoutPricing>
  }

  const { cart, isCartOpen, setIsCartOpen, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart()
  const { data: session, status } = useSession()
  const router = useRouter()

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false)
  const [checkoutData, setCheckoutData] = useState({
    nombre: "",
    email: "",
    cedula: "",
    telefono: "",
    city: "",
    address: "",
    metodoPago: "Transferencia"
  })
  
  const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3 | 4>(1) // 1:Facturación, 2:Método, 3:Acción, 4:Confirmación
  const [isUploading, setIsUploading] = useState(false)
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)
  
  const [orderSummary, setOrderSummary] = useState<{
    id: string; total: number; subtotal: number; iva: number; surcharge: number; items: CartItem[]; metodo: string; comprobanteUrl?: string;
  } | null>(null)
  const [pendingOrderPricing, setPendingOrderPricing] = useState<CheckoutPricing | null>(null)
  const [storeTaxSettings, setStoreTaxSettings] = useState<StoreTaxSettings>(DEFAULT_STORE_TAX_SETTINGS)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const checkoutModalScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = checkoutModalScrollRef.current
    if (!el || !isCheckoutModalOpen) return
    requestAnimationFrame(() => {
      el.scrollTo({ top: 0, behavior: "auto" })
    })
  }, [checkoutStep, isCheckoutModalOpen])

  // Subtotal and IVA calculation
  const activeTaxRate = storeTaxSettings.taxEnabled ? storeTaxSettings.ivaRate : 0
  const activeSurchargeRate = storeTaxSettings.surchargeEnabled ? storeTaxSettings.surchargeRate : 0
  const subtotalFactura = cartTotal
  const ivaFactura = subtotalFactura * (activeTaxRate / 100)
  const surchargeFactura = subtotalFactura * (activeSurchargeRate / 100)
  const finalTotalFactura = subtotalFactura + ivaFactura + surchargeFactura

  useEffect(() => {
    const fetchStoreSettings = async () => {
      try {
        const res = await fetch("/api/store/settings", { cache: "no-store" })
        if (!res.ok) return
        const data = (await res.json()) as Partial<StoreTaxSettings>
        setStoreTaxSettings(normalizeStoreTaxSettings(data))
      } catch {
        // Keep fallback IVA when settings endpoint is unavailable.
      }
    }

    fetchStoreSettings()
  }, [])

  useEffect(() => {
    if (isCheckoutModalOpen && session?.user) {
       fetch("/api/user/me")
         .then(res => res.json())
         .then(data => {
            if (data) {
              setCheckoutData(prev => ({
                ...prev,
                nombre: prev.nombre || data.name || session.user?.name || "",
                cedula: prev.cedula || data.cedula || "",
                telefono: prev.telefono || data.phone || "",
                city: prev.city || data.city || "",
                address: prev.address || data.address || "",
                email: prev.email || data.email || ""
              }))
            }
         })
         .catch(err => console.error("Error fetching user profile:", err))
    }
  }, [isCheckoutModalOpen, session])

  const handleCheckout = async () => {
    if (cart.length === 0) return
    if (status === "unauthenticated" || !session?.user) {
      toast.info("Para finalizar la compra, por favor inicia sesión o regístrate.", { icon: "", duration: 4000 })
      return router.push("/login?callbackUrl=/tienda")
    }
    setPendingOrderPricing(null)
    setCheckoutStep(1)
    setIsCartOpen(false)
    setIsCheckoutModalOpen(true)
  }

  const handleGenerateOrder = async () => {
    if (!checkoutData.nombre || !checkoutData.cedula || !checkoutData.telefono) {
      return toast.error("Por favor completa todos los datos de facturación.")
    }
    if (checkoutData.cedula.length !== 10) {
      return toast.error("La cédula debe tener exactamente 10 dígitos.")
    }
    try {
      setIsUploading(true)
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          cart, 
          nombre: checkoutData.nombre, 
          email: checkoutData.email,
          cedula: checkoutData.cedula, 
          telefono: checkoutData.telefono, 
          ciudad: checkoutData.city,
          direccion: checkoutData.address,
          metodoPago: checkoutData.metodoPago 
        })
      })
      const data = (await response.json()) as CheckoutResponse
      const fallbackPricing: CheckoutPricing = {
        subtotal: subtotalFactura,
        iva: ivaFactura,
        surcharge: surchargeFactura,
        total: finalTotalFactura,
      }
      const resolvedPricing: CheckoutPricing = {
        subtotal: Number((data.pricing?.subtotal ?? fallbackPricing.subtotal).toFixed(2)),
        iva: Number((data.pricing?.iva ?? fallbackPricing.iva).toFixed(2)),
        surcharge: Number((data.pricing?.surcharge ?? fallbackPricing.surcharge).toFixed(2)),
        total: Number((data.pricing?.total ?? fallbackPricing.total).toFixed(2)),
      }
      const orderId = data.orderId || ""
      if (data.success && data.requireProof) {
        if (!orderId) {
          toast.error("No se pudo obtener el identificador de la orden.")
          return
        }
        setActiveOrderId(orderId)
        setPendingOrderPricing(resolvedPricing)
        setCheckoutStep(3)
        toast.success(`¡Pedido ${data.orderCode ?? formatPrefixedSequence("ORD", data.displayId, orderId)} reservado!`, { duration: 5000 })
      } else if (data.success) {
        if (!orderId) {
          toast.error("No se pudo obtener el identificador de la orden.")
          return
        }
        setOrderSummary({
          id: orderId,
          total: resolvedPricing.total,
          subtotal: resolvedPricing.subtotal,
          iva: resolvedPricing.iva,
          surcharge: resolvedPricing.surcharge,
          items: [...cart],
          metodo: checkoutData.metodoPago,
        })
        setCheckoutStep(4)
        clearCart()
        toast.success("¡Compra realizada con éxito!", { icon: "", duration: 5000 })
      } else {
        toast.error(data.error || "Hubo un problema al procesar tu compra.")
      }
    } catch {
      toast.error("Error al procesar la compra.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeOrderId || !validateUpload(file, { allowedTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"], errorMsgType: "Formato no soportado. Usa JPG, PNG, WEBP o PDF." })) return
    try {
      setIsUploading(true)
      toast.info("Subiendo comprobante...", { duration: 3000 })
      const formData = new FormData()
      formData.append("file", file)
      formData.append("orderId", activeOrderId)

      const response = await fetch("/api/orders/upload-proof", { method: "POST", body: formData })
      const data = await response.json()
      if (data.success) {
        const resolvedPricing = pendingOrderPricing || {
          subtotal: subtotalFactura,
          iva: ivaFactura,
          surcharge: surchargeFactura,
          total: finalTotalFactura,
        }
        setOrderSummary({
          id: activeOrderId,
          total: resolvedPricing.total,
          subtotal: resolvedPricing.subtotal,
          iva: resolvedPricing.iva,
          surcharge: resolvedPricing.surcharge,
          items: [...cart],
          metodo: checkoutData.metodoPago,
          comprobanteUrl: data.comprobanteUrl,
        })
        toast.success("¡Comprobante enviado!", { duration: 5000 })
        setCheckoutStep(4)
        clearCart()
      } else {
        toast.error("Error al subir comprobante")
      }
    } catch {
      toast.error("Ocurrió un error inesperado al subir el archivo.")
    } finally {
      setIsUploading(false)
    }
  }

  const checkoutOrderSummary =
    cart.length > 0 ? (
      <div className="mx-1 mb-2 rounded-2xl border-[4px] border-[#000000] bg-white p-3 shadow-[4px_4px_0px_0px_#000000] sm:mx-2 sm:mb-4 sm:rounded-[2rem] sm:p-5 sm:shadow-[6px_6px_0px_0px_#000000] md:p-6">
        <h3 className="mb-3 flex items-center gap-2 border-b-[3px] border-[#000000]/10 pb-2 font-black uppercase text-[#000000] text-[11px] sm:mb-4 sm:pb-3 sm:text-xs md:text-sm">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#000000] bg-[#93ABD9]">
            <ShoppingBag className="h-4 w-4 text-[#000000]" />
          </span>
          Tu pedido
        </h3>
        <div className="mb-3 space-y-2 sm:mb-4">
          {cart.map((item) => {
            const unitPrice = item.precio * (1 - (item.descuento || 0) / 100)
            const lineTotal = unitPrice * item.quantity
            return (
              <div
                key={item.id}
                className="flex gap-2 rounded-lg border-2 border-[#000000]/10 bg-[#fdfaf5] p-2.5 sm:gap-3 sm:rounded-xl sm:p-3"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border-2 border-[#000000] bg-muted sm:h-14 sm:w-14 sm:rounded-lg">
                  <Image
                    src={item.foto}
                    alt={item.nombre}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 48px, 56px"
                    unoptimized={item.foto?.startsWith("data:")}
                  />
                </div>
                <div className="min-w-0 flex-1 self-center">
                  <p className="font-black text-[11px] uppercase leading-tight text-[#000000] max-sm:line-clamp-2 sm:text-xs">
                    {item.nombre}
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold leading-snug text-[#000000]/55 sm:text-[11px]">
                    {item.quantity} × ${unitPrice.toFixed(2)}
                    {(item.descuento ?? 0) > 0 && (
                      <span className="ml-1 font-black text-[#000000]/40">(-{item.descuento}%)</span>
                    )}
                  </p>
                </div>
                <span className="shrink-0 self-center font-black tabular-nums text-sm text-[#000000] sm:text-base">
                  ${lineTotal.toFixed(2)}
                </span>
              </div>
            )
          })}
        </div>
        <div className="space-y-1.5 border-t-2 border-dashed border-[#000000]/15 pt-2 text-xs sm:pt-3 sm:text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 font-bold text-[#000000]/60">
            <span className="min-w-0 flex-1">Subtotal productos</span>
            <span className="shrink-0 tabular-nums">${subtotalFactura.toFixed(2)}</span>
          </div>
          {storeTaxSettings.taxEnabled && (
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 font-bold text-[#000000]/60">
              <span className="min-w-0 max-w-[72%] text-left leading-tight sm:max-w-none">
                {storeTaxSettings.taxName} ({storeTaxSettings.ivaRate}%)
              </span>
              <span className="shrink-0 tabular-nums">+${ivaFactura.toFixed(2)}</span>
            </div>
          )}
          {storeTaxSettings.surchargeEnabled && (
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 font-bold text-[#000000]/60">
              <span>Recargo ({storeTaxSettings.surchargeRate}%)</span>
              <span className="shrink-0 tabular-nums">+${surchargeFactura.toFixed(2)}</span>
            </div>
          )}
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 border-t-2 border-[#000000] pt-2 font-black text-[#000000]">
            <span className="min-w-0 text-[11px] uppercase tracking-tight sm:text-sm">Total a pagar</span>
            <span className="shrink-0 tabular-nums text-base sm:text-lg">${finalTotalFactura.toFixed(2)}</span>
          </div>
        </div>
      </div>
    ) : null

  return (
    <>
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent hideClose className="bg-[#EDE986] border-l-[4px] border-[#000000] font-body w-full sm:max-w-md flex flex-col p-0 z-[9999]">
          <SheetHeader className="p-6 border-b-[3px] border-[#000000] bg-white/50 sticky top-0 z-10 shadow-sm">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-4xl font-black font-heading text-[#000000] flex items-center gap-3">
                <div className="bg-primary p-2 rounded-xl border-2 border-[#000000] shadow-[3px_3px_0px_0px_#000000]">
                  <ShoppingBag className="h-6 w-6 text-foreground" />
                </div>
                TU CESTA
              </SheetTitle>
              <SheetClose asChild>
                <button type="button" className="p-2 bg-white rounded-full border-[3px] border-[#000000] hover:bg-[#ffadad] transition-all shadow-[4px_4px_0px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none h-12 w-12 flex items-center justify-center group">
                  <X className="h-6 w-6 text-[#000000] group-hover:scale-110 transition-transform" />
                </button>
              </SheetClose>
            </div>
          </SheetHeader>
          
          <div className="hide-scrollbar-touch flex-1 space-y-4 overflow-y-auto px-6 py-6">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-[#000000] space-y-6">
                <div className="relative">
                  <ShoppingCart className="h-24 w-24 opacity-10" />
                  <PawPrint className="h-10 w-10 absolute -bottom-2 -right-2 text-primary rotate-12 opacity-40" />
                </div>
                <div className="text-center space-y-2">
                  <p className="font-black text-2xl tracking-tight">TU CARRITO ESTÁ VACÍO</p>
                  <p className="font-semibold opacity-60 text-sm">¡Tus mascotas están esperando algo especial!</p>
                </div>
                <SheetClose asChild>
                  <Button variant="outline" className="rounded-full px-8 py-6 border-[3px] border-[#000000] bg-[#E7BEF8] text-[#000000] font-black text-lg shadow-[5px_5px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000000] transition-all">
                    EXPLORAR CATÁLOGO
                  </Button>
                </SheetClose>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex gap-4 bg-white border-[3px] border-[#000000] p-4 rounded-3xl shadow-[5px_5px_0px_0px_#000000] animate-in slide-in-from-right duration-300">
                  <div className="w-24 h-24 bg-[#93ABD9]/10 border-2 border-[#000000] rounded-2xl overflow-hidden flex-shrink-0 relative group">
                    <Image src={item.foto} alt={item.nombre} fill className="object-cover transition-transform group-hover:scale-110" />
                    {(item.descuento ?? 0) > 0 && (
                      <div className="absolute top-1 left-1 bg-[#ffadad] text-[10px] font-black px-1.5 py-0.5 rounded-lg border border-[#000000] m-0">
                        -{item.descuento}%
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-1 overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5 max-w-[80%]">
                        <h4 className="font-black text-base leading-tight uppercase text-[#000000] truncate">{item.nombre}</h4>
                        <p className="text-xs font-bold text-[#000000]/60 uppercase tracking-widest">{item.marca}</p>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-[#ffadad] hover:text-[#ff7070] hover:scale-110 transition-all p-1">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                       <div className="flex flex-col">
                         {(item.descuento ?? 0) > 0 ? (
                           <div className="flex flex-col items-start">
                             <span className="font-black text-xl text-primary transform -rotate-1">${(item.precio * (1 - (item.descuento ?? 0) / 100)).toFixed(2)}</span>
                             <span className="text-[10px] font-bold text-[#000000]/30 line-through">${item.precio.toFixed(2)}</span>
                           </div>
                         ) : (
                           <span className="font-black text-xl text-primary transform -rotate-1">${item.precio.toFixed(2)}</span>
                         )}
                       </div>
                       <div className="flex items-center gap-4 bg-[#EDE986] rounded-2xl px-3 py-1.5 border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                         <button onClick={() => updateQuantity(item.id, -1)} className="hover:text-primary transition-colors disabled:opacity-30" disabled={item.quantity <= 1}>
                           <Minus className="h-4 w-4" />
                         </button>
                         <span className="font-black text-base min-w-[1.2rem] text-center">{item.quantity}</span>
                         <button
                           type="button"
                           onClick={() => updateQuantity(item.id, 1, item.stock)}
                           disabled={item.quantity >= normalizeCartStock(item.stock)}
                           className="hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                         >
                           <Plus className="h-4 w-4" />
                         </button>
                       </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <div className="p-6 border-t-[4px] border-[#000000] bg-white space-y-6 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] mt-auto w-full">
              <div className="space-y-3 w-full">
                {(storeTaxSettings.taxEnabled || storeTaxSettings.surchargeEnabled) && (
                  <div className="space-y-1.5 px-1 text-sm">
                    <div className="flex justify-between font-bold text-[#000000]/60">
                      <span>Subtotal</span>
                      <span>${subtotalFactura.toFixed(2)}</span>
                    </div>
                    {storeTaxSettings.taxEnabled && (
                      <div className="flex justify-between font-bold text-[#000000]/60">
                        <span>{storeTaxSettings.taxName} ({storeTaxSettings.ivaRate}%)</span>
                        <span>+${ivaFactura.toFixed(2)}</span>
                      </div>
                    )}
                    {storeTaxSettings.surchargeEnabled && (
                      <div className="flex justify-between font-bold text-[#000000]/60">
                        <span>Recargo ({storeTaxSettings.surchargeRate}%)</span>
                        <span>+${surchargeFactura.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex justify-between items-center w-full bg-[#EDE986] p-5 rounded-[1.5rem] border-[3px] border-[#000000] shadow-[6px_6px_0px_0px_#000000]">
                  <span className="font-black text-lg uppercase text-[#000000] tracking-tight">Total a pagar</span>
                  <span className="font-black text-3xl text-[#000000] transform rotate-2">${finalTotalFactura.toFixed(2)}</span>
                </div>
              </div>
              
              <Button onClick={handleCheckout} disabled={cart.length === 0} className="w-full bg-[#E7BEF8] hover:bg-[#e0dc7a] text-[#000000] font-black h-16 text-2xl border-[4px] border-[#000000] shadow-[8px_8px_0px_0px_#000000] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[4px_4px_0px_0px_#000000] active:shadow-none active:translate-x-[6px] active:translate-y-[6px] transition-all rounded-[1.5rem] group">
                <div className="flex items-center gap-3">
                  PAGAR AHORA
                  <div className="bg-[#000000] p-1.5 rounded-full text-[#EDE986] group-hover:translate-x-2 transition-transform">
                    <ArrowLeft className="h-5 w-5 rotate-180" strokeWidth={3} />
                  </div>
                </div>
              </Button>
              <p className="text-[11px] text-center font-black text-[#000000] uppercase tracking-widest leading-none flex items-center justify-center gap-2">
                 Gracias por apoyar a nuestra fundación 
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,.pdf" className="hidden" />

      <Dialog open={isCheckoutModalOpen} onOpenChange={setIsCheckoutModalOpen}>
        <DialogContent
          onInteractOutside={(e) => e.preventDefault()}
          className="z-[9999] flex w-full flex-col gap-0 overflow-hidden border-[#000000] bg-[#EDE986] max-sm:max-h-[min(88dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.25rem))] max-sm:w-[min(100%,calc(100vw-0.75rem))] max-sm:max-w-[calc(100vw-0.75rem)] max-sm:rounded-2xl max-sm:border-[3px] max-sm:p-3 max-sm:pt-4 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-sm:shadow-[6px_6px_0px_0px_#000000] sm:max-h-[90vh] sm:max-w-[min(920px,calc(100vw-2rem))] sm:rounded-[2.5rem] sm:border-[5px] sm:p-8 sm:pb-8 sm:shadow-[12px_12px_0px_0px_#000000] md:p-10 md:pb-10"
        >
          <DialogHeader className="mb-3 shrink-0 pr-10 text-left sm:mb-5 sm:pr-8 md:pr-0">
             <div className="flex flex-col gap-1.5 sm:gap-2">
                <DialogTitle className="font-heading font-black text-2xl leading-tight text-[#000000] sm:text-3xl md:text-4xl md:leading-none">
                  {checkoutStep === 4 ? "¡Compra Exitosa!" : "Finalizar Pedido"}
                </DialogTitle>
                <DialogDescription className="font-bold text-[#000000]/80 text-xs leading-snug sm:text-sm md:text-base">
                  {checkoutStep === 4 ? "Tus productos pronto estarán con tu mejor amigo." : "Completa tus datos para procesar la orden."}
                </DialogDescription>
             </div>
          </DialogHeader>

          <div
            ref={checkoutModalScrollRef}
            className="hide-scrollbar-touch flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-y-contain p-2 px-3 sm:gap-6 sm:p-4 sm:px-6 max-sm:pb-[max(1.25rem,env(safe-area-inset-bottom))] max-sm:[-webkit-overflow-scrolling:touch]"
          >
            {checkoutStep === 1 && (
              <div className="min-w-0 max-w-full space-y-6 animate-in fade-in slide-in-from-right duration-300">
                {checkoutOrderSummary}
                <div className="mx-1 flex flex-col gap-3 rounded-2xl border-[3px] border-[#000000] bg-white p-4 shadow-[6px_6px_0px_0px_#000000] sm:mx-2 sm:gap-4 sm:rounded-[2rem] sm:border-[4px] sm:p-6 sm:shadow-[8px_8px_0px_0px_#000000] md:p-8">
                  <h3 className="flex items-center gap-2 border-b-[3px] border-[#000000]/10 pb-2 font-black text-[#000000] text-xs uppercase sm:pb-3 sm:text-sm md:text-base">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#000000] text-[10px] font-black text-[#EDE986] sm:text-xs">1</span>
                    Datos de Facturación
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="ml-0.5 text-[10px] font-black uppercase tracking-widest text-[#000000] sm:ml-1">Nombre Completo</label>
                      <Input placeholder="Juana de Arco" value={checkoutData.nombre} onChange={(e) => setCheckoutData({...checkoutData, nombre: e.target.value})} className="h-12 min-h-12 border-[3px] border-[#000000] rounded-xl bg-[#EDE986] px-3 text-base font-black shadow-[3px_3px_0px_0px_#000000] transition-all placeholder:text-[#000000]/30 focus-visible:shadow-none sm:h-14 sm:min-h-14 sm:rounded-2xl sm:px-4 sm:shadow-[4px_4px_0px_0px_#000000]"/>
                    </div>
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="ml-0.5 text-[10px] font-black uppercase tracking-widest text-[#000000] sm:ml-1">Correo Electrónico</label>
                      <Input placeholder="tu@email.com" type="email" inputMode="email" autoComplete="email" value={checkoutData.email} onChange={(e) => setCheckoutData({...checkoutData, email: e.target.value})} className="h-12 min-h-12 border-[3px] border-[#000000] rounded-xl bg-[#EDE986] px-3 text-base font-black shadow-[3px_3px_0px_0px_#000000] transition-all placeholder:text-[#000000]/30 focus-visible:shadow-none sm:h-14 sm:min-h-14 sm:rounded-2xl sm:px-4 sm:shadow-[4px_4px_0px_0px_#000000]"/>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="ml-0.5 text-[10px] font-black uppercase tracking-widest text-[#000000] sm:ml-1">Teléfono</label>
                      <Input placeholder="5939XXXXXXXX" inputMode="tel" autoComplete="tel" value={formatEcuadorPhoneDisplay(checkoutData.telefono)} onChange={(e) => setCheckoutData({...checkoutData, telefono: normalizeEcuadorPhoneInput(e.target.value)})} onFocus={() => setCheckoutData((prev) => ({ ...prev, telefono: ensureEcuadorPhoneInputPrefix(prev.telefono) }))} className="h-12 min-h-12 border-[3px] border-[#000000] rounded-xl bg-[#EDE986] px-3 text-base font-black shadow-[3px_3px_0px_0px_#000000] transition-all placeholder:text-[#000000]/40 focus-visible:shadow-none sm:h-14 sm:min-h-14 sm:rounded-2xl sm:px-4 sm:shadow-[4px_4px_0px_0px_#000000]"/>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="ml-0.5 text-[10px] font-black uppercase tracking-widest text-[#000000] sm:ml-1">Cédula / RUC</label>
                      <Input placeholder="17XXXXXXXX" inputMode="numeric" autoComplete="off" value={checkoutData.cedula} onChange={(e) => setCheckoutData({...checkoutData, cedula: e.target.value.replace(/\D/g, '').substring(0, 10)})} className="h-12 min-h-12 border-[3px] border-[#000000] rounded-xl bg-[#EDE986] px-3 text-base font-black shadow-[3px_3px_0px_0px_#000000] transition-all placeholder:text-[#000000]/40 focus-visible:shadow-none sm:h-14 sm:min-h-14 sm:rounded-2xl sm:px-4 sm:shadow-[4px_4px_0px_0px_#000000]"/>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="ml-0.5 text-[10px] font-black uppercase tracking-widest text-[#000000] sm:ml-1">Ciudad</label>
                      <Input placeholder="Quito" autoComplete="address-level2" value={checkoutData.city} onChange={(e) => setCheckoutData({...checkoutData, city: e.target.value})} className="h-12 min-h-12 border-[3px] border-[#000000] rounded-xl bg-[#EDE986] px-3 text-base font-black shadow-[3px_3px_0px_0px_#000000] transition-all placeholder:text-[#000000]/30 focus-visible:shadow-none sm:h-14 sm:min-h-14 sm:rounded-2xl sm:px-4 sm:shadow-[4px_4px_0px_0px_#000000]"/>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="ml-0.5 text-[10px] font-black uppercase tracking-widest text-[#000000] sm:ml-1">Dirección Exacta</label>
                      <Input placeholder="Calle Principal..." autoComplete="street-address" value={checkoutData.address} onChange={(e) => setCheckoutData({...checkoutData, address: e.target.value})} className="h-12 min-h-12 border-[3px] border-[#000000] rounded-xl bg-[#EDE986] px-3 text-base font-black shadow-[3px_3px_0px_0px_#000000] transition-all placeholder:text-[#000000]/30 focus-visible:shadow-none sm:h-14 sm:min-h-14 sm:rounded-2xl sm:px-4 sm:shadow-[4px_4px_0px_0px_#000000]"/>
                    </div>
                  </div>
                </div>
                <Button onClick={() => setCheckoutStep(2)} disabled={!checkoutData.nombre || !checkoutData.email || checkoutData.cedula.length !== 10 || !checkoutData.telefono || !checkoutData.city || !checkoutData.address} className="min-h-14 w-full min-w-0 touch-manipulation whitespace-normal border-[3px] border-[#000000] bg-[#E7BEF8] px-2 py-3 text-center text-sm font-black leading-tight text-[#000000] shadow-[6px_6px_0px_0px_#000000] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#000000] active:translate-x-px active:translate-y-px sm:min-h-16 sm:border-[4px] sm:px-4 sm:text-base sm:shadow-[8px_8px_0px_0px_#000000] md:text-lg">
                  SIGUIENTE: MÉTODO DE PAGO
                </Button>
              </div>
            )}

            {checkoutStep === 2 && (
              <div className="min-w-0 max-w-full space-y-6 animate-in fade-in slide-in-from-left duration-300">
                {checkoutOrderSummary}
                <div className="flex flex-col gap-3 rounded-2xl border-[3px] border-[#000000] bg-white p-4 shadow-[6px_6px_0px_0px_#000000] sm:gap-4 sm:rounded-[2.5rem] sm:border-[4px] sm:p-6 sm:shadow-[8px_8px_0px_0px_#000000] md:p-8">
                  <h3 className="flex items-center gap-2 border-b-[3px] border-[#000000]/10 pb-2 font-black text-[#000000] text-xs uppercase sm:pb-3 sm:text-sm md:text-base">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#000000] text-[10px] font-black text-[#EDE986] sm:text-xs">2</span>
                    Método de Pago
                  </h3>
                  <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                    {['Transferencia', 'PayPhone'].map((metodo) => (
                      <button key={metodo} type="button" onClick={() => setCheckoutData({...checkoutData, metodoPago: metodo})} className={`flex min-h-14 min-w-0 touch-manipulation items-center justify-center rounded-xl border-[3px] border-[#000000] px-2 py-3.5 text-center text-sm font-black leading-tight transition-all shadow-[3px_3px_0px_0px_#000000] sm:h-14 sm:rounded-2xl sm:py-0 sm:text-sm sm:shadow-[4px_4px_0px_0px_#000000] ${checkoutData.metodoPago === metodo ? 'bg-[#E7BEF8] text-[#000000] translate-x-0.5 translate-y-0.5 shadow-none' : 'bg-[#93ABD9] text-[#000000] active:translate-x-px active:translate-y-px'}`}>
                        {metodo}
                      </button>
                    ))}
                  </div>

                  {checkoutData.metodoPago === 'Transferencia' && (
                    <div className="mt-2 space-y-3 sm:mt-4 sm:space-y-4">
                       <div className="rounded-xl border-[3px] border-[#000000] bg-white p-4 shadow-[4px_4px_0px_0px_#000000] sm:rounded-[1.5rem] sm:border-[4px] sm:p-5 sm:shadow-[6px_6px_0px_0px_#000000]">
                          <p className="mb-3 flex items-center gap-2 font-black text-[10px] uppercase text-[#000000] sm:mb-4 sm:text-xs">
                             <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[#000000] bg-[#93ABD9] text-[10px]">$</span>
                             <span className="min-w-0 leading-tight">Datos para Transferencia / Depósito</span>
                          </p>
                          <div className="grid grid-cols-1 gap-x-4 gap-y-2 text-xs font-bold sm:grid-cols-2 sm:gap-x-6 md:text-sm">
                             <span className="text-[#000000]/50 uppercase tracking-tighter">Banco:</span>
                             <span className="font-black text-[#000000]">Banco Pichincha</span>
                             <span className="text-[#000000]/50 uppercase tracking-tighter">Tipo:</span>
                             <span className="font-black text-[#000000]">Cuenta Ahorros</span>
                             <span className="text-[#000000]/50 uppercase tracking-tighter">N° Cuenta:</span>
                             <span className="font-black text-[#000000] select-all">2200XXXXXXX</span>
                             <span className="text-[#000000]/50 uppercase tracking-tighter">Nombre:</span>
                             <span className="font-black text-[#000000]">MIAUWUAUF</span>
                              <span className="text-[#000000]/50 uppercase tracking-tighter">RUC/Cédula:</span>
                              <span className="font-black text-[#000000] select-all">17XXXXXXXX001</span>
                           </div>
                       </div>
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-col-reverse gap-3 sm:flex-row sm:items-stretch">
                  <Button onClick={() => setCheckoutStep(1)} variant="outline" className="min-h-14 w-full min-w-0 shrink-0 touch-manipulation whitespace-normal border-[3px] border-[#000000] bg-white font-black shadow-[3px_3px_0px_0px_#000000] transition-all hover:shadow-[2px_2px_0px_0px_#000000] sm:h-16 sm:min-h-16 sm:w-[120px] sm:rounded-2xl sm:border-[4px] sm:shadow-[4px_4px_0px_0px_#000000]">
                    Atrás
                  </Button>
                  <Button onClick={handleGenerateOrder} disabled={isUploading} className="min-h-14 w-full min-w-0 touch-manipulation whitespace-normal border-[3px] border-[#000000] bg-[#e7bef8] px-2 py-3 text-center text-sm font-black leading-tight text-[#000000] shadow-[3px_3px_0px_0px_#000000] transition-all hover:bg-[#d94884] disabled:opacity-50 sm:h-16 sm:min-h-0 sm:flex-1 sm:rounded-2xl sm:border-[4px] sm:px-4 sm:text-base sm:shadow-[4px_4px_0px_0px_#000000]">
                    {isUploading ? "PROCESANDO..." : checkoutData.metodoPago === 'Transferencia' ? "SUBIR COMPROBANTE" : "PAGAR AHORA"}
                  </Button>
                </div>
              </div>
            )}

            {checkoutStep === 3 && (
              <div className="min-w-0 max-w-full space-y-6 animate-in fade-in slide-in-from-right duration-300">
                {checkoutOrderSummary}
                <div className="flex flex-col items-center rounded-2xl border-[3px] border-[#000000] bg-white p-4 text-center shadow-[6px_6px_0px_0px_#000000] sm:rounded-[2rem] sm:border-[4px] sm:p-6 sm:shadow-[8px_8px_0px_0px_#000000] lg:p-10">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-[#000000] bg-[#93ABD9] shadow-[3px_3px_0px_0px_#000000] sm:mb-4 sm:h-16 sm:w-16 sm:shadow-[4px_4px_0px_0px_#000000]">
                     <CheckCircle className="h-7 w-7 text-[#000000] sm:h-8 sm:w-8" />
                  </div>
                  <h3 className="mb-2 font-black text-xl uppercase tracking-wider text-[#000000] sm:text-2xl sm:tracking-widest">Pedido Comprado</h3>
                  <p className="mb-5 max-w-sm px-1 text-xs font-bold leading-relaxed text-[#000000]/60 sm:mb-6 sm:text-sm">Tu pedido ha sido guardado exitosamente. Ahora debes subir tu comprobante de depósito o transferencia para que el equipo lo valide.</p>
                  
                  <div role="button" tabIndex={0} onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !isUploading) { e.preventDefault(); fileInputRef.current?.click() } }} className={`group flex min-h-[9.5rem] w-full cursor-pointer touch-manipulation flex-col items-center justify-center gap-2 rounded-xl border-[3px] border-dashed p-3 transition-colors sm:min-h-36 sm:gap-3 sm:rounded-[2rem] sm:p-4 ${isUploading ? 'border-[#000000]/20 bg-white' : 'border-[#000000]/30 bg-[#EDE986] hover:bg-[#E7BEF8] active:scale-[0.99]'}`} onClick={() => !isUploading && fileInputRef.current?.click()}>
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-[4px] border-[#000000]"></div>
                        <span className="text-[10px] font-black uppercase text-[#000000] tracking-widest">Validando...</span>
                      </>
                    ) : (
                      <>
                        <div className="bg-white p-3 rounded-full border-[3px] border-[#000000]/30 shadow-sm group-hover:scale-110 hover:border-[#000000] hover:shadow-[4px_4px_0px_0px_#000000] transition-all">
                          <CheckCircle className="w-6 h-6 text-[#000000]/50 group-hover:text-[#000000] transition-colors" />
                        </div>
                        <div className="text-center">
                          <p className="font-black text-[#000000] uppercase">Subir Comprobante Aquí</p>
                          <p className="font-bold text-[#000000]/50 text-xs mt-1">Formato JPG, PNG, WEBP o PDF max 10MB</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {checkoutStep === 4 && orderSummary && (
              <div className="min-w-0 max-w-full space-y-4 animate-in zoom-in duration-500 sm:space-y-6">
                <div className="relative flex flex-col items-center overflow-hidden rounded-2xl border-[3px] border-[#000000] bg-white p-4 text-center shadow-[6px_6px_0px_0px_#000000] sm:rounded-[2.5rem] sm:border-[4px] sm:p-6 sm:shadow-[8px_8px_0px_0px_#000000] lg:p-10">
                   <div className="absolute right-0 top-0 z-10 rounded-bl-xl border-b-[3px] border-l-[3px] border-[#000000] bg-[#ffd6a5] px-3 py-1.5 text-[9px] font-black uppercase tracking-widest sm:rounded-bl-[2rem] sm:border-b-4 sm:border-l-4 sm:px-6 sm:py-2 sm:text-xs">
                     Recibo Oficial
                   </div>

                   <h3 className="mt-10 font-heading text-center text-xl font-black text-[#000000] sm:mt-12 sm:mb-6 sm:text-3xl">Resumen de Compra</h3>

                   {/* Items */}
                   <div className="mb-3 w-full rounded-xl border-[2px] border-[#000000] bg-[#fdfaf5] p-3 text-left sm:mb-4 sm:rounded-2xl sm:border-[3px] sm:p-4">
                      {orderSummary.items.map(item => {
                        const unitPrice = item.precio * (1 - (item.descuento || 0) / 100)
                        const lineTotal = unitPrice * item.quantity
                        return (
                          <div key={item.id} className="flex items-start justify-between gap-2 border-b-2 border-dashed border-[#000000]/15 py-2.5 last:border-0">
                            <div className="flex min-w-0 flex-1 flex-col">
                              <span className="line-clamp-2 font-black text-[11px] uppercase leading-tight text-[#000000] sm:text-sm">{item.nombre}</span>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="font-bold text-[#000000]/50 text-xs">{item.quantity} × ${unitPrice.toFixed(2)}</span>
                                {(item.descuento ?? 0) > 0 && (
                                  <span className="text-[9px] font-black bg-[#ffadad] border border-[#000000]/20 px-1.5 py-0.5 rounded-full text-[#000000]">-{item.descuento}%</span>
                                )}
                              </div>
                            </div>
                            <span className="font-black text-[#000000] text-sm shrink-0">${lineTotal.toFixed(2)}</span>
                          </div>
                        )
                      })}
                   </div>

                   {/* Pricing breakdown */}
                   <div className="mb-4 w-full space-y-1.5 rounded-xl border-2 border-[#000000]/10 bg-[#fdfaf5] px-3 py-2.5 text-left sm:mb-5 sm:rounded-2xl sm:px-4 sm:py-3">
                     <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 text-xs font-bold text-[#000000]/60 sm:text-sm">
                       <span>Subtotal</span>
                       <span className="tabular-nums">${orderSummary.subtotal.toFixed(2)}</span>
                     </div>
                     {orderSummary.iva > 0 && (
                       <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 text-xs font-bold text-[#000000]/60 sm:text-sm">
                         <span className="max-w-[70%] leading-tight sm:max-w-none">{storeTaxSettings.taxName} ({storeTaxSettings.ivaRate}%)</span>
                         <span className="tabular-nums">+${orderSummary.iva.toFixed(2)}</span>
                       </div>
                     )}
                     {orderSummary.surcharge > 0 && (
                       <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 text-xs font-bold text-[#000000]/60 sm:text-sm">
                         <span>Recargo ({storeTaxSettings.surchargeRate}%)</span>
                         <span className="tabular-nums">+${orderSummary.surcharge.toFixed(2)}</span>
                       </div>
                     )}
                   </div>
                   
                   <div className="mb-6 flex w-full flex-wrap items-end justify-between gap-3 px-0.5 sm:mb-8 sm:px-1">
                     <div className="flex min-w-0 flex-col items-start">
                       <span className="text-[10px] font-bold uppercase tracking-widest text-[#000000]/50 sm:text-xs">Total Cancelado</span>
                       <span className="mt-1 w-fit max-w-full truncate rounded-full border-2 border-[#000000] bg-[#93ABD9] px-2 py-1 text-center text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000000] sm:px-3 sm:text-sm">{orderSummary.metodo}</span>
                     </div>
                     <span className="font-black tabular-nums text-2xl text-[#000000] sm:text-4xl">${orderSummary.total.toFixed(2)}</span>
                   </div>

                   <Button onClick={() => { setIsCheckoutModalOpen(false); router.push("/mi-mascota?tab=compras"); }} className="min-h-14 w-full min-w-0 touch-manipulation whitespace-normal rounded-full border-2 border-[#000000] bg-[#000000] px-3 py-3 text-base font-black text-[#EDE986] shadow-[3px_3px_0px_0px_#000000] transition-all hover:bg-[#EDE986] hover:text-[#000000] sm:h-16 sm:text-lg sm:shadow-[4px_4px_0px_0px_#000000]">
                     Ver Seguimiento de Orden
                   </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
