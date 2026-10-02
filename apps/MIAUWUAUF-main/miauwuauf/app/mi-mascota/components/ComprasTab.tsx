import React, { useState } from "react"
import { OrderProgressBar } from "@/app/tienda/components/OrderProgressBar"
import { MiauLoading } from "@/components/MiauLoading"
import { Package, Download, ShoppingBag, Eye, Calendar, Clock, AlertCircle, Truck, ArrowLeft, ExternalLink, RefreshCw, AlertTriangle } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useCart } from "@/app/tienda/context/CartContext"
import { CartItem } from "@/lib/admin-service"
import { formatDate, formatPrefixedSequence } from "@/lib/utils"
import { buildIvaLabel, formatIvaPercent } from "@/lib/store-settings"
import { formatEcuadorPhoneDisplay } from "@/lib/phone"

export interface OrderItem {
  id: string
  quantity: number
  precio: number
  precioFinal: number | null
  product: {
    id: string
    slug?: string
    nombre: string
    foto: string
    precio: number
  }
}

export interface Order {
  id: string
  displayId?: number | null
  orderCode?: string | null
  pricingSubtotal?: number | null
  pricingIva?: number | null
  pricingSurcharge?: number | null
  ivaRate?: number | null
  taxName?: string | null
  taxEnabled?: boolean | null
  surchargeRate?: number | null
  surchargeEnabled?: boolean | null
  total: number
  estado: string
  metodo: string
  nombre?: string
  cedula?: string
  telefono?: string
  email?: string
  ciudad?: string
  direccion?: string
  observacion?: string
  comprobanteUrl?: string
  createdAt: string
  items: OrderItem[]
}

interface ComprasTabProps {
  orders: Order[]
  loading: boolean
}

export function ComprasTab({ orders, loading }: ComprasTabProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const { setCart, setIsCartOpen } = useCart()
  const router = useRouter()

  const handleRetryPayment = (order: Order) => {
    try {
      // 1. Mapear items de la orden al formato del carrito respetando el tipo CartItem
      const cartItems: CartItem[] = order.items.map(item => ({
        id: item.product.id,
        nombre: item.product.nombre,
        foto: item.product.foto,
        precio: item.precioFinal || item.precio,
        quantity: item.quantity,
        categoria: "General", 
        stock: 99,
        descuento: 0,
        imagenes: []
      }))

      // 2. Establecer el carrito pero asegurar que la vista rápida esté cerrada
      setCart(cartItems)
      setIsCartOpen(false)

      // 3. Redirigir al checkout con parámetro de origen
      router.push(`/tienda/checkout?from=profile&replaceOrder=${encodeURIComponent(order.id)}`)
    } catch (error) {
      console.error("Error al reintentar pago:", error)
    }
  }

  if (loading) {
    return <MiauLoading text="Cargando historial de compras..." fullScreen={false} />
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-[#fdfaf5] border-[4px] border-[#000] rounded-[2.5rem] shadow-[10px_10px_0px_0px_#000] max-w-2xl mx-auto my-10">
        <div className="bg-[#ffde91] p-6 rounded-full border-[3px] border-[#000] shadow-[6px_6px_0px_0px_#000] mb-8">
          <ShoppingBag className="w-16 h-16 text-[#000]" />
        </div>
        <h3 className="text-3xl font-black text-[#000] mb-4 uppercase tracking-tighter">AÚN NO TIENES COMPRAS</h3>
        <p className="text-[#000]/60 font-bold mb-8 text-lg">Tus pedidos aparecerán aquí para que les des seguimiento.</p>
        <Link href="/tienda" className="bg-[#E7BEF8] text-[#000] px-10 py-4 rounded-xl font-black border-[4px] border-[#000] shadow-[8px_8px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_#000] transition-all text-lg uppercase">
          IR A LA TIENDA 
        </Link>
      </div>
    )
  }

  // Vista de Detalle de Pedido
  if (selectedOrder) {
    const orderTaxName = selectedOrder.taxName || "IVA"
    const taxEnabled = selectedOrder.taxEnabled ?? true
    const activeTaxRate = selectedOrder.ivaRate ?? 15
    const surchargeEnabled = selectedOrder.surchargeEnabled ?? false
    const activeSurchargeRate = selectedOrder.surchargeRate ?? 0
    const subtotal =
      selectedOrder.pricingSubtotal ??
      selectedOrder.items.reduce((acc, item) => acc + ((item.precioFinal ?? item.precio) * item.quantity), 0)
    const iva = selectedOrder.pricingIva ?? (taxEnabled ? subtotal * (activeTaxRate / 100) : 0)
    const surcharge =
      selectedOrder.pricingSurcharge ??
      (surchargeEnabled ? subtotal * (activeSurchargeRate / 100) : 0)

    return (
      <div className="space-y-8 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <button 
          onClick={() => setSelectedOrder(null)}
          className="group flex items-center gap-2 bg-white border-[3px] border-[#000] px-5 py-2.5 rounded-xl font-black text-[#000] shadow-[6px_6px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0px_0px_#000] transition-all uppercase text-sm"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Regresar a mis compras
        </button>

        <div className="bg-white border-[4px] border-[#000] rounded-[2.5rem] shadow-[12px_12px_0px_0px_#000] overflow-hidden">
          <div className="bg-[#FFDE59] p-8 border-b-[4px] border-[#000] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-white border-[2.5px] border-[#000] px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-[3px_3px_0px_0px_#000]">
                  DETALLE DE PEDIDO
                </span>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border-[2.5px] border-[#000] shadow-[3px_3px_0px_0px_#000] ${selectedOrder.estado === 'RECHAZADO' ? 'bg-[#ffadad]' : 'bg-[#93ABD9]'}`}>
                  {selectedOrder.estado}
                </span>
              </div>
              <h2 className="text-3xl font-black text-[#000] uppercase tracking-tighter">ORDEN {selectedOrder.orderCode ?? formatPrefixedSequence("ORD", selectedOrder.displayId, selectedOrder.id)}</h2>
              <p className="font-bold text-[#000]/60 text-sm mt-1">{formatDate(selectedOrder.createdAt)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-[#000]/40 uppercase mb-1">Total Pagado</p>
              <p className="text-5xl font-black text-[#000] tracking-tight transform -rotate-1">${(selectedOrder.total ?? 0).toFixed(2)}</p>
            </div>
          </div>

          <div className="p-8 space-y-8">
            {/* Banner de Pago Rechazado */}
            {(selectedOrder.estado === 'PAGO_RECHAZADO' || selectedOrder.estado === 'RECHAZADO') && (
              <div className="bg-[#ffadad] border-[4px] border-[#000] p-6 rounded-2xl shadow-[8px_8px_0px_0px_#000] flex flex-col md:flex-row items-center justify-between gap-6 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="bg-white p-3 rounded-full border-[3px] border-[#000] shadow-[3px_3px_0px_0px_#000]">
                    <AlertTriangle className="w-8 h-8 text-[#000]" />
                  </div>
                  <div>
                    <h3 className="font-black text-xl uppercase text-[#000]">PAGO RECHAZADO</h3>
                    <p className="font-bold text-[#000]/70 text-sm">Por favor, verifica tu comprobante o intenta con otro método de pago para completar tu compra.</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleRetryPayment(selectedOrder)}
                  className="w-full md:w-auto bg-[#FFDE59] border-[4px] border-[#000] px-8 py-3 rounded-xl font-black text-[#000] shadow-[6px_6px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_#000] transition-all flex items-center justify-center gap-2 uppercase text-sm"
                >
                  <RefreshCw className="w-5 h-5" /> Reintentar Pago
                </button>
              </div>
            )}

            {/* Facturación y Pago */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-[3px] border-[#000] rounded-2xl p-5 shadow-[6px_6px_0px_0px_#000] bg-[#ffffff]">
                <h4 className="font-black text-xs uppercase mb-4 text-[#000]/50 tracking-widest border-b-2 border-[#000]/10 pb-2">Información de Envío</h4>
                <div className="space-y-2 font-bold text-sm">
                  <p><span className="text-[#000]/40 uppercase text-[10px] mr-2">Cliente:</span> {selectedOrder.nombre || 'N/A'}</p>
                  <p><span className="text-[#000]/40 uppercase text-[10px] mr-2">Cédula:</span> {selectedOrder.cedula || 'N/A'}</p>
                  <p><span className="text-[#000]/40 uppercase text-[10px] mr-2">Correo:</span> {selectedOrder.email || 'N/A'}</p>
                  <p><span className="text-[#000]/40 uppercase text-[10px] mr-2">Teléfono:</span> {formatEcuadorPhoneDisplay(selectedOrder.telefono) || selectedOrder.telefono || 'N/A'}</p>
                  <p><span className="text-[#000]/40 uppercase text-[10px] mr-2">Ciudad:</span> {selectedOrder.ciudad || 'N/A'}</p>
                  <p><span className="text-[#000]/40 uppercase text-[10px] mr-2">Dirección:</span> {selectedOrder.direccion || 'N/A'}</p>
                </div>
              </div>
              <div className="border-[3px] border-[#000] rounded-2xl p-5 shadow-[6px_6px_0px_0px_#000] bg-[#ffffff] h-max">
                <h4 className="font-black text-xs uppercase mb-4 text-[#000]/50 tracking-widest border-b-2 border-[#000]/10 pb-2">Método de Pago</h4>
                <div className="space-y-2 font-bold text-sm flex flex-col">
                  <p><span className="text-[#000]/40 uppercase text-[10px] mr-2">Método:</span> {selectedOrder.metodo}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[#000]/40 uppercase text-[10px] mr-1">Transacción:</span>
                    <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-widest border-[2px] border-black inline-block
                      ${selectedOrder.estado === 'PAGO_RECHAZADO' || selectedOrder.estado === 'RECHAZADO' ? 'bg-[#ffadad] text-[#000000]' :
                        selectedOrder.estado === 'PENDIENTE_VALIDACION' || selectedOrder.estado === 'ESPERANDO_COMPROBANTE' ? 'bg-[#FFDE59] text-[#000000]' :
                        selectedOrder.estado === 'CANCELADA' ? 'bg-gray-300 text-[#000000]' :
                        'bg-[#93ABD9] text-[#000000]'
                      }
                    `}>
                      {selectedOrder.estado === 'PAGO_RECHAZADO' || selectedOrder.estado === 'RECHAZADO' ? 'Rechazada' :
                       selectedOrder.estado === 'PENDIENTE_VALIDACION' || selectedOrder.estado === 'ESPERANDO_COMPROBANTE' ? 'Pendiente' :
                       selectedOrder.estado === 'CANCELADA' ? 'Cancelada' :
                       'Verificada'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Listado de Productos */}
            <div className="border-[3px] border-[#000] rounded-2xl overflow-hidden shadow-[8px_8px_0px_0px_#000]">
              <div className="bg-[#000] text-[#EDE986] p-4 font-black uppercase text-xs tracking-widest">
                Productos Adquiridos ({selectedOrder.items.length})
              </div>
              <div className="bg-white divide-y-[2px] divide-dashed divide-[#000]/20">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="p-4 flex flex-col sm:flex-row items-center gap-6 hover:bg-gray-50 transition-colors">
                    <div className="w-20 h-20 bg-white border-[3px] border-[#000] rounded-xl flex-shrink-0 relative overflow-hidden shadow-[4px_4px_0px_0px_#000]">
                      <Image src={item.product?.foto || '/placeholder.png'} alt={item.product?.nombre} fill className="object-cover" />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <h5 className="font-black text-lg uppercase leading-tight line-clamp-1">{item.product?.nombre}</h5>
                      <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-1">
                        <p className="text-xs font-bold text-[#000]/60"><span className="uppercase text-[10px] opacity-50 mr-1">Cantidad:</span> x{item.quantity}</p>
                        <p className="text-xs font-bold text-[#000]/60"><span className="uppercase text-[10px] opacity-50 mr-1">P. Unitario:</span> ${(item.precioFinal ?? item.precio).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                      <p className="font-black text-xl transform -rotate-1">${((item.precioFinal ?? item.precio) * item.quantity).toFixed(2)}</p>
                      <Link 
                        href={`/tienda/${item.product?.slug || item.product?.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#93ABD9] border-[2px] border-[#000] px-4 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-[3px_3px_0px_0px_#000] hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:shadow-[1.5px_1.5px_0px_0px_#000] transition-all flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3 h-3" /> Ver Producto
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumen Financiero */}
            <div className="flex justify-end">
              <div className="w-full md:w-80 space-y-3 bg-[#fdfaf5] border-[3px] border-[#000] rounded-2xl p-6 shadow-[8px_8px_0px_0px_#000]">
                <div className="flex justify-between font-bold text-sm text-[#000]/60">
                  <span>SUBTOTAL</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-[#000]/60">
                  <span>{buildIvaLabel(taxEnabled ? activeTaxRate : 0, orderTaxName)}</span>
                  <span>${iva.toFixed(2)}</span>
                </div>
                {surchargeEnabled && activeSurchargeRate > 0 && (
                  <div className="flex justify-between font-bold text-sm text-[#000]/60">
                    <span>Recargo ({formatIvaPercent(activeSurchargeRate)}%)</span>
                    <span>${surcharge.toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-3 border-t-2 border-dashed border-[#000]/20 flex justify-between items-center group">
                  <span className="font-black text-[#000] text-lg uppercase tracking-wider">TOTAL</span>
                  <span className="font-black text-[#000] text-3xl transform group-hover:scale-110 transition-transform">${(selectedOrder.total ?? 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Separar en activas e históricas
  const terminalStates = ["COMPLETADA", "ENTREGADO", "RECHAZADO", "PAGO_RECHAZADO", "CANCELADA"]
  const activeOrders = orders.filter(o => !terminalStates.includes(o.estado.toUpperCase()))
  const historicalOrders = orders.filter(o => terminalStates.includes(o.estado.toUpperCase()))

  return (
    <div className="space-y-12 pt-0 -mt-4 pb-10 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 border-b-[6px] border-[#000] pb-6">
        <div className="bg-[#FFDE59] p-4 rounded-2xl border-[4px] border-[#000] shadow-[6px_6px_0px_0px_#000]">
          <ShoppingBag className="w-10 h-10 text-[#000]" />
        </div>
        <div>
          <h2 className="text-5xl font-black font-heading text-[#000] uppercase tracking-tighter">MIS COMPRAS</h2>
          <p className="font-bold text-[#000]/40 uppercase text-xs tracking-[0.3em] mt-1">Gestión de Pedidos MIAUWUAUF</p>
        </div>
      </div>

      {activeOrders.length > 0 && (
        <section className="space-y-8">
          <h3 className="text-xs font-black uppercase text-[#000]/30 tracking-[0.4em] flex items-center gap-3 mb-6 bg-[#ffffff] border-[2px] border-[#000]/10 px-4 py-2 rounded-full w-fit">
            <Clock className="w-4 h-4" /> PEDIDOS EN CURSO
          </h3>
          <div className="space-y-12">
            {activeOrders.map(order => {
              const isRejected = order.estado.toUpperCase() === "PAGO_RECHAZADO";
              const isShipped = order.estado.toUpperCase() === "EN_CAMINO";
              const isPreparing = order.estado.toUpperCase() === "PREPARANDO";
              
              let headerText = "Procesando Pedido";
              let HeaderIcon = Clock;
              let headerColor = "text-[#000]/50";
              let bgColor = "bg-[#ffd6a5]";

              if (isRejected) {
                headerText = "Atención Requerida";
                HeaderIcon = AlertCircle;
                headerColor = "text-[#e63946]";
                bgColor = "bg-[#ffadad]";
              } else if (isShipped) {
                headerText = "En Camino";
                HeaderIcon = Truck;
                bgColor = "bg-[#93ABD9]";
              } else if (isPreparing) {
                headerText = "Preparando Envío";
                HeaderIcon = Package;
                bgColor = "bg-[#93ABD9]";
              }

              return (
              <div key={order.id} className="group">
                <h3 className={`text-[10px] font-black uppercase ${headerColor} tracking-[0.3em] flex items-center gap-2 mb-4 ml-2`}>
                  <HeaderIcon className="w-4 h-4" /> {headerText}
                </h3>
                <div className="shadow-[10px_10px_0px_0px_#000] border-[4px] border-[#000] rounded-[2rem] overflow-hidden bg-[#fdfaf5] transform group-hover:translate-x-[-2px] group-hover:translate-y-[-2px] group-hover:shadow-[12px_12px_0px_0px_#000] transition-all">
                  <div className={`px-8 py-6 ${bgColor} border-b-[4px] border-[#000]`}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                         <h3 className="font-black font-heading text-2xl text-[#000] uppercase tracking-tighter">PEDIDO {order.orderCode ?? formatPrefixedSequence("ORD", order.displayId, order.id)}</h3>
                         <p className="text-xs font-bold text-[#000]/50 mt-1 uppercase tracking-widest">{formatDate(order.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-4">
                         <div className="text-right">
                           <p className="text-[10px] font-black text-[#000]/30 uppercase">Total</p>
                           <p className="font-black text-2xl text-[#000] transform -rotate-1">${(order.total ?? 0).toFixed(2)}</p>
                         </div>
                         <span className="text-[10px] font-black uppercase text-[#000] bg-white border-[3px] border-[#000] px-4 py-2 rounded-xl shadow-[4px_4px_0px_0px_#000]">
                           {order.metodo}
                         </span>
                      </div>
                    </div>
                  </div>
                  <div className="px-2 md:px-8 py-4 bg-[#fdfaf5]">
                     {isRejected ? (
                       <div className="py-12 flex flex-col items-center justify-center text-center">
                         <div className="bg-[#ffadad] p-4 rounded-full border-[3px] border-[#000] shadow-[5px_5px_0px_0px_#000] mb-6">
                            <AlertCircle className="w-10 h-10 text-[#000]" />
                         </div>
                         <p className="font-black text-[#000] text-3xl uppercase tracking-tighter mb-3">PAGO RECHAZADO</p>
                         <p className="font-bold text-[#000]/60 text-base max-w-sm mb-10 leading-relaxed italic">
                            {order.observacion ? `"${order.observacion}"` : "Hubo un problema con tu comprobante. Por favor comunícate con soporte para resolverlo."}
                         </p>
                         {order.items && order.items.length > 0 && (
                           <Link 
                             href={`/tienda/${order.items[0].product.slug || order.items[0].product.id}`}
                             className="bg-[#E7BEF8] border-[4px] border-[#000] px-10 py-4 rounded-2xl text-[#000] font-black uppercase text-sm shadow-[8px_8px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_#000] transition-all"
                           >
                             Corregir Compra 
                           </Link>
                         )}
                       </div>
                     ) : (
                       <div className="py-6">
                        <OrderProgressBar
                          orderId={order.id}
                          displayId={order.displayId}
                          orderCode={order.orderCode}
                          currentStatus={order.estado}
                          variant="transparent"
                        />
                         <div className="mt-8 flex justify-end">
                            <button 
                              onClick={() => setSelectedOrder(order)}
                              className="bg-white border-[3px] border-[#000] px-6 py-2 rounded-xl font-black text-[#000] shadow-[5px_5px_0px_0px_#000] hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:shadow-[2.5px_2.5px_0px_0px_#000] transition-all uppercase text-xs flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" /> Detalles de Orden
                            </button>
                         </div>
                       </div>
                     )}
                  </div>
                </div>
              </div>
            )})}
          </div>
        </section>
      )}

      {historicalOrders.length > 0 && (
        <section className="space-y-8">
          <h3 className="text-xs font-black uppercase text-[#000]/30 tracking-[0.4em] flex items-center gap-3 mb-6 bg-[#ffffff] border-[2px] border-[#000]/10 px-4 py-2 rounded-full w-fit">
            <Calendar className="w-4 h-4" /> HISTORIAL DE MIS COMPRAS
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {historicalOrders.map(order => (
              <div key={order.id} className="group bg-[#ffffff] border-[4px] border-[#000] rounded-[2.5rem] p-6 shadow-[10px_10px_0px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[15px_15px_0px_0px_#000] transition-all flex flex-col justify-between overflow-hidden">
                <div>
                  <div className="flex justify-between items-start mb-5">
                    <span className={`border-[2.5px] border-[#000] text-[#000] text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-[3px_3px_0px_0px_#000] ${
                      order.estado === "CANCELADA"
                        ? "bg-[#e5e5e5]"
                        : order.estado === "RECHAZADO" || order.estado === "PAGO_RECHAZADO"
                          ? "bg-[#ffadad]"
                          : "bg-[#93ABD9]"
                    }`}>
                      {order.estado === "CANCELADA"
                        ? "REEMPLAZADA"
                        : order.estado === "RECHAZADO" || order.estado === "PAGO_RECHAZADO"
                          ? "RECHAZADO"
                          : "EXHIBIDO"}
                    </span>
                    <span className="font-bold text-xs opacity-30 uppercase tracking-widest">{formatDate(order.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-6 py-4">
                    {order.items[0] && (
                      <div className="w-24 h-24 bg-white border-[3px] border-[#000] rounded-2xl flex-shrink-0 relative overflow-hidden shadow-[5px_5px_0px_0px_#000]">
                        <Image src={order.items[0].product.foto} alt="producto" fill className="object-cover" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-[#000]/30 uppercase mb-1">Pedido</p>
                      <p className="font-black text-lg uppercase line-clamp-2 leading-none mb-3">
                        {order.items.length === 1 ? order.items[0].product.nombre : `${order.items[0]?.product.nombre} +${order.items.length - 1} ítems`}
                      </p>
                      <p className="font-black text-3xl text-[#000] transform -rotate-1 inline-block bg-[#FFDE59] px-2 border-2 border-[#000] shadow-[3px_3px_0px_0px_#000]">${(order.total ?? 0).toFixed(2)}</p>
                    </div>
                  </div>
                  
                  {/* Banner Simple de Rechazo en Card */}
                  {(order.estado === 'PAGO_RECHAZADO' || order.estado === 'RECHAZADO') && (
                    <div className="mt-4 bg-[#ffadad]/20 border-[2px] border-dashed border-[#ff4d4d] p-3 rounded-xl flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-[#e63946]" />
                      <p className="text-[10px] font-black text-[#e63946] uppercase leading-tight">Acción requerida: el pago no pudo ser procesado.</p>
                    </div>
                  )}
                </div>
                <div className="mt-8 flex gap-3 border-t-[4px] border-[#000]/10 pt-6">
                  {/* Botón Reintentar dinámico en historial */}
                  {(order.estado === 'PAGO_RECHAZADO' || order.estado === 'RECHAZADO') && !order.comprobanteUrl ? (
                    <button 
                      onClick={() => handleRetryPayment(order)}
                      className="flex-1 bg-[#FFDE59] border-[3px] border-[#000] text-center py-3 rounded-2xl text-xs font-black uppercase shadow-[6px_6px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0px_0px_#000] transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-5 h-5" /> REINTENTAR PAGO
                    </button>
                  ) : (
                    <button 
                      onClick={() => setSelectedOrder(order)}
                      className="flex-1 bg-[#93ABD9] border-[3px] border-[#000] text-center py-3 rounded-2xl text-xs font-black uppercase shadow-[6px_6px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0px_0px_#000] transition-all flex items-center justify-center gap-2"
                    >
                      <Eye className="w-5 h-5" /> DETALLES
                    </button>
                  )}
                  {order.comprobanteUrl && (
                    <a href={order.comprobanteUrl} target="_blank" rel="noreferrer" className="bg-white border-[3px] border-[#000] px-5 py-3 rounded-2xl text-[#000] flex items-center justify-center shadow-[6px_6px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0px_0px_#000] transition-all">
                      <Download className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
