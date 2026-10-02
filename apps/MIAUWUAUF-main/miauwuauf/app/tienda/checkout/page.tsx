"use client"

import { useState, useEffect, Suspense } from "react"
import { useCart } from "../context/CartContext"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { validateUpload } from "@/lib/upload-validation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ShoppingBag, CheckCircle, PawPrint, CreditCard, Landmark, AlertCircle } from "lucide-react"
import Link from "next/link"
import { LogoHorizontal } from "@/components/LogoHorizontal"
import { SmartBackButton } from "@/components/SmartBackButton"
import { MiauLoading } from "@/components/MiauLoading"
import { DEFAULT_STORE_TAX_SETTINGS, StoreTaxSettings, buildIvaLabel, formatIvaPercent, normalizeStoreTaxSettings } from "@/lib/store-settings"
import {
  ensureEcuadorPhoneInputPrefix,
  formatEcuadorPhoneDisplay,
  normalizeEcuadorPhoneInput,
} from "@/lib/phone"
import Image from "next/image"

type CheckoutPricing = {
  subtotal: number
  iva: number
  surcharge: number
  total: number
}

type CheckoutResponse = {
  success?: boolean
  error?: string
  pricing?: Partial<CheckoutPricing>
}

function CheckoutContent() {
  const { cart, cartTotal, clearCart } = useCart()
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get("from")
  const replaceOrderId = searchParams.get("replaceOrder")

  const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3 | 4>(1)
  const [isUploading, setIsUploading] = useState(false)
  const [isUploadingProof, setIsUploadingProof] = useState(false)
  const [tempComprobanteUrl, setTempComprobanteUrl] = useState("")
  const [finalPricing, setFinalPricing] = useState<CheckoutPricing | null>(null)
  const [storeTaxSettings, setStoreTaxSettings] = useState<StoreTaxSettings>(DEFAULT_STORE_TAX_SETTINGS)
  const [checkoutData, setCheckoutData] = useState({
    nombre: "",
    email: "",
    cedula: "",
    telefono: "",
    city: "",
    address: "",
    metodoPago: "Transferencia"
  })

  useEffect(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" })
    })
  }, [checkoutStep])

  // Autofill from session
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setCheckoutData(prev => ({
        ...prev,
        nombre: prev.nombre || session.user?.name || "",
        email: prev.email || session.user?.email || "",
      }))
      
      // Fetch extra data if needed
      fetch("/api/user/me")
        .then(res => res.json())
        .then(data => {
          if (data) {
            setCheckoutData(prev => ({
              ...prev,
              cedula: prev.cedula || data.cedula || "",
              telefono: prev.telefono || data.phone || "",
              city: prev.city || data.city || "",
              address: prev.address || data.address || "",
              email: prev.email || data.email || ""
            }))
          }
        })
        .catch(err => console.error("Error fetching profile:", err))
    }
  }, [session, status])

  useEffect(() => {
    const fetchStoreSettings = async () => {
      try {
        const res = await fetch("/api/store/settings", { cache: "no-store" })
        if (!res.ok) return
        const data = (await res.json()) as Partial<StoreTaxSettings>
        setStoreTaxSettings(normalizeStoreTaxSettings(data))
      } catch {
        // Keep default IVA if settings endpoint is unavailable.
      }
    }

    fetchStoreSettings()
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !validateUpload(file)) return

    try {
      setIsUploadingProof(true)
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const data = (await response.json()) as { secure_url?: string; url?: string }
      const proofUrl = data.secure_url || data.url
      if (proofUrl) {
        setTempComprobanteUrl(proofUrl)
        toast.success("Comprobante subido correctamente ")
      } else {
        toast.error("Error al subir el comprobante")
      }
    } catch {
      toast.error("Error de conexión al subir archivo")
    } finally {
      setIsUploadingProof(false)
    }
  }

  const handleGenerateOrder = async () => {
    if (!checkoutData.nombre || !checkoutData.cedula || !checkoutData.telefono) {
      return toast.error("Por favor completa todos los datos.")
    }
    if (checkoutData.cedula.length !== 10) {
      return toast.error("La cédula debe tener 10 dígitos.")
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
          metodoPago: checkoutData.metodoPago,
          comprobanteUrl: tempComprobanteUrl,
          from: from,
          replaceOrderId: replaceOrderId || undefined
        })
      })
      const data = (await response.json()) as CheckoutResponse
      if (data.success) {
        const subtotal = cartTotal
        const iva = subtotal * (activeTaxRate / 100)
        const surcharge = subtotal * (activeSurchargeRate / 100)
        const fallbackPricing: CheckoutPricing = {
          subtotal,
          iva,
          surcharge,
          total: subtotal + iva + surcharge,
        }
        const nextPricing: CheckoutPricing = {
          subtotal: Number((data.pricing?.subtotal ?? fallbackPricing.subtotal).toFixed(2)),
          iva: Number((data.pricing?.iva ?? fallbackPricing.iva).toFixed(2)),
          surcharge: Number((data.pricing?.surcharge ?? fallbackPricing.surcharge).toFixed(2)),
          total: Number((data.pricing?.total ?? fallbackPricing.total).toFixed(2)),
        }
        setFinalPricing(nextPricing)
        setCheckoutStep(4)
        clearCart()
        toast.success("¡Pedido procesado con éxito!", { icon: "" })
      } else {
        toast.error(data.error || "Error al procesar la compra.")
      }
    } catch {
      toast.error("Error de conexión.")
    } finally {
      setIsUploading(false)
    }
  }

  // Si el carrito está vacío y no estamos en el paso final de confirmación
  if (cart.length === 0 && checkoutStep !== 4) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-center sm:p-6">
        <div className="bg-[#ffadad] p-8 rounded-full border-[4px] border-[#000000] shadow-[8px_8px_0px_0px_#000000] mb-8">
          <ShoppingBag className="w-16 h-16 text-[#000000]" />
        </div>
        <h2 className="text-4xl font-black text-[#000000] uppercase tracking-tighter mb-4">Tu carrito está vacío</h2>
        <p className="text-[#000000]/60 font-bold mb-10 max-w-md">Parece que no hay productos para procesar. Puedes volver a la tienda para seguir explorando.</p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          <Button 
            onClick={() => router.replace("/tienda")}
            className="flex-1 bg-[#E7BEF8] border-[4px] border-[#000000] h-16 rounded-2xl font-black shadow-[6px_6px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_#000000] transition-all"
          >
            VOLVER A LA TIENDA
          </Button>
          {from === "profile" && (
            <Button 
              onClick={() => router.replace("/mi-mascota?tab=compras")}
              className="flex-1 bg-white border-[4px] border-[#000000] h-16 rounded-2xl font-black shadow-[6px_6px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_#000000] transition-all"
            >
              MI PERFIL
            </Button>
          )}
        </div>
      </div>
    )
  }

  const activeTaxRate = storeTaxSettings.taxEnabled ? storeTaxSettings.ivaRate : 0
  const activeSurchargeRate = storeTaxSettings.surchargeEnabled ? storeTaxSettings.surchargeRate : 0
  const cartSubtotal = cartTotal
  const cartIva = cartSubtotal * (activeTaxRate / 100)
  const cartSurcharge = cartSubtotal * (activeSurchargeRate / 100)
  const cartTotalWithTax = cartSubtotal + cartIva + cartSurcharge
  const pricing = checkoutStep === 4 && finalPricing
    ? finalPricing
    : { subtotal: cartSubtotal, iva: cartIva, surcharge: cartSurcharge, total: cartTotalWithTax }

  return (
    <div className="min-h-screen bg-[#fdfaf5] font-body pb-20 max-md:overflow-x-hidden">
      {/* Header Minimalista */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-2 border-b-[4px] border-[#000000] bg-white/80 px-3 py-3 backdrop-blur-md pt-[max(0.75rem,env(safe-area-inset-top))] md:px-8 md:py-4">
        <div className="shrink-0">
          <SmartBackButton fallbackUrl="/tienda" />
        </div>
        <div className="flex min-w-0 flex-1 justify-center px-1">
          <Link href="/tienda" className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2 md:gap-4 hover:scale-105 transition-transform">
              {/* Badge TIENDA */}
              <div className="relative z-10 -mr-2 flex shrink-0 -rotate-6 items-center max-md:-mr-1 md:-mr-6">
                <span className="relative z-10 -mr-1.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[2px] border-[#000000] bg-[#E7BEF8] shadow-[2px_2px_0px_0px_#000000] md:h-7 md:w-7 md:-mr-2">
                  <PawPrint className="h-2.5 w-2.5 text-white md:h-3.5 md:w-3.5" strokeWidth={2.8} />
                </span>
                <div className="rounded-lg border-[3px] border-[#000000] bg-[#E7BEF8] px-1.5 py-0.5 shadow-[2px_2px_0px_0px_#000000] md:px-3">
                  <span className="select-none text-[9px] font-black uppercase tracking-widest text-white md:text-sm">TIENDA</span>
                </div>
              </div>
              {/* Brand Logo */}
              <div className="relative min-w-0 max-w-[118px] -translate-y-0.5 -ml-1.5 sm:max-w-none md:-ml-5 md:translate-y-2">
                <LogoHorizontal size="sm" className="origin-left scale-125 md:scale-150" />
              </div>
            </div>
          </Link>
        </div>
        <div className="flex w-[4.25rem] shrink-0 flex-col items-end justify-center text-right sm:w-auto sm:min-w-0 md:flex-1">
          <span className="max-w-[4.25rem] text-right font-black uppercase leading-[1.1] tracking-tight text-[#000000]/40 text-[7px] sm:max-w-none sm:text-xs md:tracking-widest">
            Checkout Seguro
          </span>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-3 pt-[calc(6.75rem+env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-4 md:px-4 md:pt-32">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5 lg:gap-10">
          
          {/* Columna Izquierda: Formulario (debajo del resumen en móvil) */}
          <div className="order-2 space-y-4 lg:order-none lg:col-span-3 lg:space-y-8">
            <div className="rounded-2xl border-[4px] border-[#000000] bg-white p-4 shadow-[8px_8px_0px_0px_#000000] sm:p-6 md:rounded-[2.5rem] md:border-[5px] md:p-10 md:shadow-[12px_12px_0px_0px_#000000]">
              
              {checkoutStep !== 4 ? (
                <>
                  <div className="mb-6 flex items-center gap-3 sm:gap-4 md:mb-8">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-[3px] border-[#000000] bg-primary shadow-[4px_4px_0px_0px_#000000] sm:h-12 sm:w-12 sm:rounded-2xl">
                      <span className="text-lg font-black sm:text-xl">{checkoutStep}</span>
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl font-black uppercase tracking-tighter text-[#000000] sm:text-2xl md:text-3xl">
                        {checkoutStep === 1 ? "Datos de Envío" : "Método de Pago"}
                      </h2>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#000000]/40 sm:text-xs md:text-sm">Paso {checkoutStep} de 2</p>
                    </div>
                  </div>

                  {checkoutStep === 1 && (
                    <div className="min-w-0 space-y-4 animate-in fade-in slide-in-from-right duration-300 sm:space-y-6">
                      <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] ml-2">Nombre Completo</label>
                          <Input 
                            value={checkoutData.nombre}
                            onChange={(e) => setCheckoutData({...checkoutData, nombre: e.target.value})}
                            placeholder="Ej. Juan Pérez"
                            className="h-14 border-[3px] border-[#000000] rounded-2xl font-black bg-[#EDE986] shadow-[5px_5px_0px_0px_#000000] focus:shadow-none transition-all"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] ml-2">Correo Electrónico</label>
                          <Input 
                            value={checkoutData.email}
                            onChange={(e) => setCheckoutData({...checkoutData, email: e.target.value})}
                            placeholder="tu@email.com"
                            className="h-14 border-[3px] border-[#000000] rounded-2xl font-black bg-[#EDE986] shadow-[5px_5px_0px_0px_#000000] focus:shadow-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] ml-2">Cédula / RUC</label>
                          <Input 
                            value={checkoutData.cedula}
                            onChange={(e) => setCheckoutData({...checkoutData, cedula: e.target.value.replace(/\D/g, '').substring(0, 10)})}
                            placeholder="17XXXXXXXX"
                            className="h-14 border-[3px] border-[#000000] rounded-2xl font-black bg-[#EDE986] shadow-[5px_5px_0px_0px_#000000] focus:shadow-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] ml-2">Teléfono</label>
                          <Input 
                            value={formatEcuadorPhoneDisplay(checkoutData.telefono)}
                            onChange={(e) => setCheckoutData({...checkoutData, telefono: normalizeEcuadorPhoneInput(e.target.value)})}
                            onFocus={() => setCheckoutData((prev) => ({ ...prev, telefono: ensureEcuadorPhoneInputPrefix(prev.telefono) }))}
                            placeholder="5939XXXXXXXX"
                            className="h-14 border-[3px] border-[#000000] rounded-2xl font-black bg-[#EDE986] shadow-[5px_5px_0px_0px_#000000] focus:shadow-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] ml-2">Ciudad</label>
                          <Input 
                            value={checkoutData.city}
                            onChange={(e) => setCheckoutData({...checkoutData, city: e.target.value})}
                            placeholder="Quito"
                            className="h-14 border-[3px] border-[#000000] rounded-2xl font-black bg-[#EDE986] shadow-[5px_5px_0px_0px_#000000] focus:shadow-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] ml-2">Dirección Exacta</label>
                          <Input 
                            value={checkoutData.address}
                            onChange={(e) => setCheckoutData({...checkoutData, address: e.target.value})}
                            placeholder="Calle Principal, Secundaria, Ref"
                            className="h-14 border-[3px] border-[#000000] rounded-2xl font-black bg-[#EDE986] shadow-[5px_5px_0px_0px_#000000] focus:shadow-none transition-all"
                          />
                        </div>
                      </div>
                      <Button 
                        onClick={() => setCheckoutStep(2)}
                        disabled={!checkoutData.nombre || !checkoutData.email || checkoutData.cedula.length !== 10 || !checkoutData.telefono || !checkoutData.city || !checkoutData.address}
                        className="w-full bg-[#E7BEF8] border-[4px] border-[#000000] h-16 rounded-2xl font-black text-lg shadow-[8px_8px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                      >
                        CONTINUAR AL PAGO
                      </Button>
                    </div>
                  )}

                  {checkoutStep === 2 && (
                    <div className="min-w-0 space-y-6 animate-in fade-in slide-in-from-right duration-300 sm:space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { id: 'Transferencia', icon: Landmark, color: 'bg-[#93ABD9]' },
                          { id: 'PayPhone', icon: CreditCard, color: 'bg-[#93ABD9]' }
                        ].map((m) => (
                          <button
                            key={m.id}
                            onClick={() => setCheckoutData({...checkoutData, metodoPago: m.id})}
                            className={`p-4 border-[3px] border-[#000000] rounded-2xl flex flex-col items-center gap-2 transition-all shadow-[4px_4px_0px_0px_#000000] ${checkoutData.metodoPago === m.id ? 'bg-[#000000] text-[#EDE986] scale-95 shadow-none' : 'bg-white hover:-translate-y-1'}`}
                          >
                            <m.icon className="w-6 h-6" />
                            <span className="font-black text-xs uppercase tracking-tighter">{m.id}</span>
                          </button>
                        ))}
                      </div>

                       {checkoutData.metodoPago === 'Transferencia' && (
                        <div className="space-y-4">
                          <div className="bg-[#E7BEF8]/10 border-[3px] border-dashed border-[#000000] rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                              <Landmark className="text-primary w-5 h-5" />
                              <h4 className="font-black text-sm uppercase">Datos Bancarios</h4>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs font-bold">
                              <span className="opacity-40 uppercase">Banco:</span> <span className="font-black">Pichincha</span>
                              <span className="opacity-40 uppercase">Tipo de cuenta:</span> <span className="font-black">Ahorros</span>
                              <span className="opacity-40 uppercase">Cuenta:</span> <span className="font-black">2200XXXXX</span>
                              <span className="opacity-40 uppercase">Titular:</span> <span className="font-black">MIAUWUAUF</span>
                              <span className="opacity-40 uppercase">RUC/Cédula:</span> <span className="font-black">17XXXXXXXX001</span>
                            </div>
                          </div>

                          <div className="bg-white border-[3px] border-[#000000] rounded-2xl p-6 shadow-[5px_5px_0px_0px_#000000]">
                            <p className="font-black text-xs uppercase mb-3 flex items-center gap-2">
                              {tempComprobanteUrl ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-primary" />}
                              Subir Foto del Comprobante
                            </p>
                            
                            <div className="relative group">
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                disabled={isUploadingProof}
                              />
                              <div className={`h-32 border-[3px] border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-colors ${isUploadingProof ? 'bg-[#ffffff] border-[#000000]/20' : tempComprobanteUrl ? 'bg-[#93ABD9]/20 border-[#e7bef8] group-hover:bg-[#93ABD9]/40' : 'bg-[#EDE986] border-[#000000]/30 group-hover:bg-[#E7BEF8]'}`}>
                                {isUploadingProof ? (
                                  <>
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-[4px] border-[#000000]"></div>
                                    <span className="text-[10px] font-black uppercase text-[#000000] tracking-widest">Validando...</span>
                                  </>
                                ) : tempComprobanteUrl ? (
                                  <>
                                    <div className="w-12 h-12 rounded-xl overflow-hidden border-[3px] border-[#e7bef8] shadow-[4px_4px_0px_0px_#e7bef8] relative">
                                      <Image
                                        src={tempComprobanteUrl}
                                        alt="Comprobante"
                                        fill
                                        loading="lazy"
                                        decoding="async"
                                        sizes="48px"
                                        className="object-cover"
                                      />
                                    </div>
                                    <span className="text-[10px] font-black uppercase text-[#000000] tracking-widest flex items-center justify-center gap-1"><CheckCircle className="w-3 h-3 text-[#e7bef8]"/> <span className="text-black">Comprobante Válido. Clic para cambiar</span></span>
                                  </>
                                ) : (
                                  <>
                                    <div className="bg-white p-3 rounded-full border-[3px] border-[#000000]/30 shadow-sm group-hover:scale-110 group-hover:border-[#000000] group-hover:shadow-[4px_4px_0px_0px_#000000] transition-all">
                                      <CheckCircle className="w-6 h-6 text-[#000000]/50 group-hover:text-[#000000] transition-colors" />
                                    </div>
                                    <span className="text-[11px] font-black uppercase text-[#000000]/60 tracking-widest group-hover:text-[#000000] transition-colors">Seleccionar Imagen</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                        <Button 
                          onClick={() => setCheckoutStep(1)}
                          variant="outline"
                          className="h-14 w-full shrink-0 rounded-2xl border-[3px] border-[#000000] font-black shadow-[4px_4px_0px_0px_#000000] sm:h-16 sm:w-24"
                        >
                          ATRÁS
                        </Button>
                        <Button 
                          onClick={handleGenerateOrder}
                          disabled={isUploading || isUploadingProof || (checkoutData.metodoPago === 'Transferencia' && !tempComprobanteUrl)}
                          className="h-14 min-h-[3.5rem] flex-1 rounded-2xl border-[4px] border-[#000000] bg-[#e7bef8] text-base font-black text-[#000000] shadow-[8px_8px_0px_0px_#000000] transition-all hover:bg-[#d94884] hover:translate-x-[2px] hover:translate-y-[2px] sm:h-16 sm:text-lg"
                        >
                          {isUploading ? "PROCESANDO..." : "FINALIZAR COMPRA"}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="animate-in zoom-in py-8 text-center duration-500 sm:py-10">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-[4px] border-[#000000] bg-[#93ABD9] shadow-[8px_8px_0px_0px_#000000] sm:mb-8 sm:h-24 sm:w-24">
                    <CheckCircle className="h-10 w-10 text-[#000000] sm:h-12 sm:w-12" />
                  </div>
                  <h2 className="mb-3 px-1 text-2xl font-black uppercase tracking-tighter text-[#000000] sm:mb-4 sm:text-3xl md:text-4xl">¡Compra Exitosa!</h2>
                  <p className="mb-8 px-1 text-base font-bold text-[#000000]/60 sm:mb-10 sm:text-lg">
                    {from === "profile" 
                      ? "Tu comprobante ha sido enviado. El administrador lo revisará pronto." 
                      : "Tus peluditos te lo agradecerán. Recibirás un correo con el detalle de tu orden."}
                  </p>
                  
                  <div className="space-y-3">
                    <Button 
                      onClick={() => router.push("/mi-mascota?tab=compras")}
                      className="w-full bg-[#000000] text-[#EDE986] border-[4px] border-[#000000] h-16 rounded-2xl font-black hover:bg-[#EDE986] hover:text-[#000000] shadow-[6px_6px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    >
                      VER MIS PEDIDOS
                    </Button>
                    <Button 
                      onClick={() => router.push("/tienda")}
                      variant="ghost"
                      className="w-full font-black text-sm uppercase tracking-widest text-[#000000]/40 hover:text-primary transition-colors"
                    >
                      Seguir Comprando
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-3 rounded-2xl border-[3px] border-[#000000] bg-[#93ABD9]/20 p-4 sm:flex-row sm:items-center sm:gap-4">
              <AlertCircle className="h-6 w-6 shrink-0 text-primary sm:mt-0.5" />
              <p className="text-left text-xs font-bold text-[#000000]/70 sm:text-sm">
                Al finalizar el pedido, procederemos a validar tu pago. Si seleccionaste transferencia, recuerda subir tu comprobante desde el panel de usuario.
              </p>
            </div>
          </div>

          {/* Columna Derecha: Resumen (arriba en móvil / tablet < lg) */}
          <div className="order-1 space-y-4 lg:order-none lg:col-span-2 lg:space-y-6">
            <div className="overflow-hidden rounded-2xl border-[4px] border-[#000000] bg-white shadow-[8px_8px_0px_0px_#000000] md:rounded-[2.5rem] md:border-[5px] md:shadow-[10px_10px_0px_0px_#000000]">
              <div className="bg-[#000000] p-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-[#EDE986] sm:p-5 sm:text-xs">
                Resumen del Carrito
              </div>
              <div className="divide-y-2 divide-dashed divide-[#000000]/10 p-4 text-[#000000] sm:p-6">
                {checkoutData.email && (
                  <div className="pb-4 pt-1 flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Correo Electrónico</span>
                    <span className="font-bold text-sm truncate">{checkoutData.email}</span>
                  </div>
                )}
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-3 sm:gap-4 sm:py-4">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-[#000000] bg-[#EDE986] sm:h-16 sm:w-16">
                       <Image src={item.foto} alt={item.nombre} fill className="object-cover" sizes="64px" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="mb-1 truncate text-xs font-black uppercase leading-tight text-[#000000] sm:text-sm">{item.nombre}</h4>
                      <p className="text-[10px] font-bold text-[#000000]/40">CANTIDAD: {item.quantity}</p>
                    </div>
                    <div className="shrink-0 text-right text-xs font-black italic sm:text-sm">
                      ${((item.precio * (1 - (item.descuento || 0) / 100)) * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="space-y-3 bg-[#E7BEF8]/20 p-4 sm:p-6">
                <div className="flex justify-between gap-2 text-[11px] font-bold text-[#000000]/60 sm:text-xs">
                   <span className="min-w-0 shrink">SUBTOTAL</span>
                   <span className="shrink-0 tabular-nums">${pricing.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-2 text-[11px] font-bold text-[#000000]/60 sm:text-xs">
                   <span className="min-w-0 shrink leading-tight">{buildIvaLabel(activeTaxRate, storeTaxSettings.taxName)}</span>
                   <span className="shrink-0 tabular-nums">${pricing.iva.toFixed(2)}</span>
                </div>
                {activeSurchargeRate > 0 && (
                  <div className="flex justify-between gap-2 text-[11px] font-bold text-[#000000]/60 sm:text-xs">
                     <span className="min-w-0 shrink">Recargo ({formatIvaPercent(activeSurchargeRate)}%)</span>
                     <span className="shrink-0 tabular-nums">${pricing.surcharge.toFixed(2)}</span>
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl border-[3px] border-[#000000] bg-white p-3 shadow-[4px_4px_0px_0px_#000000] sm:mt-4 sm:p-4">
                   <span className="text-xs font-black uppercase tracking-tighter sm:text-sm">TOTAL</span>
                   <span className="rotate-2 text-2xl font-black tabular-nums sm:text-3xl">
                     ${pricing.total.toFixed(2)}
                   </span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-3 px-1 sm:gap-4">
              <PawPrint className="h-7 w-7 animate-pulse text-[#000000]/10 sm:h-8 sm:w-8" />
              <p className="text-center text-[9px] font-black uppercase leading-relaxed tracking-[0.2em] text-[#000000]/30 sm:text-[10px] sm:tracking-[0.3em]">
                Cada compra nos ayuda a seguir rescatando peluditos en necesidad. <br /> ¡Gracias por ser parte!
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<MiauLoading text="Preparando checkout..." />}>
      <CheckoutContent />
    </Suspense>
  )
}
