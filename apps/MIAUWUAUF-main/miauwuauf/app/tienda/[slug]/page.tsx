"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { useCart } from "../context/CartContext"
import { OrderProgressBar } from "../components/OrderProgressBar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, ArrowLeft, Plus, Minus, Check, Truck, X, PawPrint, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { LogoHorizontal } from "@/components/LogoHorizontal"
import { MiauLoading } from "@/components/MiauLoading"
import { AdminService, type TiendaProducto } from "@/lib/admin-service"
import Image from "next/image"
import { DEFAULT_STORE_TAX_SETTINGS, type StoreTaxSettings, normalizeStoreTaxSettings, formatIvaPercent } from "@/lib/store-settings"
import Contact from "@/components/contacts"

export default function ProductoDetallePage() {
    const params = useParams()
    const router = useRouter()
    const [product, setProduct] = useState<TiendaProducto | null>(null)
    const { cartCount, addToCart, setIsCartOpen } = useCart()
    const [isMounted, setIsMounted] = useState(false)
    const [quantity, setQuantity] = useState(1)
    const [activeImage, setActiveImage] = useState("")

    const [relatedProducts, setRelatedProducts] = useState<TiendaProducto[]>([])
    const { data: session, status } = useSession()
    const [orderStatus, setOrderStatus] = useState<{purchased: boolean, orderId: string | null, displayId?: number | null, orderCode?: string | null, estado: string | null} | null>(null)
    const [addCartBusy, setAddCartBusy] = useState(false)
    const [taxSettings, setTaxSettings] = useState<StoreTaxSettings>(DEFAULT_STORE_TAX_SETTINGS)

    const calcPriceWithTax = (basePrice: number) => {
        const iva = taxSettings.taxEnabled ? basePrice * (taxSettings.ivaRate / 100) : 0
        const surcharge = taxSettings.surchargeEnabled ? basePrice * (taxSettings.surchargeRate / 100) : 0
        return basePrice + iva + surcharge
    }

    const buildTaxLabel = () => {
        const parts: string[] = []
        if (taxSettings.taxEnabled) {
            parts.push(`${taxSettings.taxName} (${formatIvaPercent(taxSettings.ivaRate)}%)`)
        }
        if (taxSettings.surchargeEnabled) {
            parts.push(`Recargo (${formatIvaPercent(taxSettings.surchargeRate)}%)`)
        }
        return parts.length > 0 ? `Con ${parts.join(" + ")}` : null
    }

    const isOrderActive = useMemo(
        () =>
            !!(orderStatus?.purchased &&
                orderStatus?.estado &&
                !["COMPLETADA", "ENTREGADO"].includes(orderStatus.estado.toUpperCase())),
        [orderStatus]
    )

    useEffect(() => {
        const timer = setTimeout(() => setIsMounted(true), 0)
        return () => clearTimeout(timer)
    }, [])


    useEffect(() => {
        const loadProductData = async () => {
            if (params.slug) {
                const p = await AdminService.getProductById(params.slug as string)
                if (p) {
                    setProduct(p)
                    setActiveImage(p.foto)
                    setQuantity(p.stock > 0 ? 1 : 0)
 
                    // Fetch related products
                    const allProducts = await AdminService.getProducts()
                    const related = allProducts
                        .filter(rp => rp.categoria === p.categoria && rp.id !== p.id)
                        .slice(0, 4)
                    setRelatedProducts(related)
                } else {
                    router.push("/tienda")
                }
            }
        }
        
        loadProductData()
 
        fetch("/api/store/settings")
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setTaxSettings(normalizeStoreTaxSettings(data?.taxSettings ?? data)) })
            .catch(() => {})
    }, [params.slug, router])

    useEffect(() => {
        const checkOrderStatus = async () => {
             // Solo consultamos si hay un usuario logueado y tenemos el ID del producto
            if (session?.user?.id && params.slug) {
                try {
                    const res = await fetch(`/api/orders/status?productId=${params.slug}`);
                    const data = await res.json();
                    
                    // Seteamos el estado independientemente de si 'purchased' es true o false
                    // para saber que la consulta ya terminó.
                    setOrderStatus(data);
                } catch (e) {
                    console.error("Error Checking order status", e);
                }
            } else {
                // Si el usuario no está logueado o no hay ID, nos aseguramos de que no vea nada
                setOrderStatus(null);
            }
        }
        
        if (isMounted) {
            checkOrderStatus();
        }
    }, [session, params.slug, isMounted])


    const allImages = Array.from(new Set(product ? [product.foto, ...(product.imagenes || [])].filter(Boolean) : []))
    
    const nextImage = () => {
        if (allImages.length <= 1) return;
        const currentIndex = allImages.indexOf(activeImage);
        const nextIndex = (currentIndex + 1) % allImages.length;
        setActiveImage(allImages[nextIndex]);
    }

    const prevImage = () => {
        if (allImages.length <= 1) return;
        const currentIndex = allImages.indexOf(activeImage);
        const prevIndex = (currentIndex - 1 + allImages.length) % allImages.length;
        setActiveImage(allImages[prevIndex]);
    }

    if (!product || !isMounted) return <MiauLoading text="Preparando tu producto..." />

    return (
        <div className="min-h-screen relative font-body selection:bg-primary selection:text-primary-foreground bg-background">

            {/* Header / Nav (Floating/Fixed) */}
            <header className="fixed left-0 right-0 top-0 z-[100] flex items-center justify-between border-b border-[#000000]/5 bg-background/80 px-4 py-2 backdrop-blur-md pointer-events-none max-md:gap-1 max-md:px-2 max-md:py-1 max-md:pt-[calc(0.25rem+env(safe-area-inset-top))] max-md:pb-1 md:px-8 md:py-3">
                <div className="flex shrink-0 justify-start pointer-events-auto md:flex-1 md:justify-start">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.push('/tienda')}
                        className="group h-10 w-10 rounded-full border-[2px] border-[#000000] bg-[#000000] text-[#EDE986] shadow-[3px_3px_0px_0px_#000000] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000000] md:h-12 md:w-12 md:border-[3px]"
                        title="Regresar a la tienda"
                    >
                        <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1 md:h-6 md:w-6" />
                    </Button>
                </div>

                <div className="relative flex min-w-0 flex-1 justify-center py-2 pointer-events-auto max-md:px-0 max-md:py-0 md:py-2">
                    <Link href="/">
                        <div className="flex items-center gap-2 transition-transform max-md:gap-1 max-md:hover:scale-100 md:gap-4 hover:scale-105">
                            {/* Badge TIENDA */}
                            <div className="relative z-10 -mr-1.5 flex shrink-0 -rotate-6 items-center md:-mr-6">
                                <span className="relative z-10 -mr-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full border-[2px] border-[#000000] bg-[#E7BEF8] shadow-[2px_2px_0px_0px_#000000] md:h-8 md:w-8 md:-mr-2">
                                    <PawPrint className="h-3 w-3 text-white md:h-4 md:w-4" strokeWidth={2.8} />
                                </span>
                                <div className="rounded-xl border-[3px] border-[#000000] bg-[#E7BEF8] px-1.5 py-0.5 shadow-[3px_3px_0px_0px_#000000] md:px-4 md:py-1">
                                    <span className="select-none text-[9px] font-black tracking-wide text-white md:text-xl md:tracking-wider">TIENDA</span>
                                </div>
                            </div>
                            {/* Brand Logo */}
                            <div className="relative -ml-1 translate-y-1 max-md:max-w-[11.25rem] md:-ml-5 md:translate-y-2">
                                <LogoHorizontal size="md" className="origin-left max-md:scale-[0.88] md:scale-125 scale-110" />
                            </div>
                        </div>
                    </Link>
                </div>

                <div className="flex shrink-0 items-center justify-end gap-2 pointer-events-auto md:flex-1 md:gap-4">
                    {status === "unauthenticated" ? (
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="bg-[#f2c1bd] hidden md:flex border-[3px] border-[#000000] px-4 py-1.5 rounded-full font-black text-[10px] md:text-xs uppercase shadow-[2px_2px_0px_0px_#000000]">
                                Estado: Invitado
                            </div>
                            <Link href={`/login?callbackUrl=/tienda/${params.slug}`}>
                                <Button className="bg-[#93ABD9] border-[3px] md:border-[4px] border-[#000000] px-2.5 md:px-5 py-1.5 md:py-2 rounded-full font-black text-[10px] md:text-xs uppercase shadow-[4px_4px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000000] transition-all">
                                    <span className="md:hidden">ENTRAR</span>
                                    <span className="hidden md:inline">INICIAR SESIÓN</span>
                                </Button>
                            </Link>
                        </div>
                    ) : session?.user ? (
                        <div className="hidden md:flex items-center gap-2 bg-[#93ABD9] border-[3px] border-[#000000] px-3 py-1.5 rounded-full shadow-[2px_2px_0px_0px_#000000] transition-transform">
                            <span className="font-black text-[10px] md:text-xs text-[#000000] uppercase truncate max-w-[120px]">Logueado: {session.user.name?.split(' ')[0]}</span>
                            <button onClick={() => signOut()} className="bg-white hover:bg-red-400 border-[2px] border-[#000000] rounded-full p-0.5 ml-1 transition-colors" title="Cerrar sesión">
                                <X className="w-3 h-3 md:w-3.5 md:h-3.5 text-[#000000] font-black" strokeWidth={4} />
                            </button>
                        </div>
                    ) : null}

                    <Button 
                        onClick={() => setIsCartOpen(true)}
                        className="relative pointer-events-auto rounded-2xl border-[3px] border-[#000000] bg-primary px-3 py-2 text-sm font-black text-foreground shadow-[4px_4px_0px_0px_#000000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000000] md:border-[4px] md:px-5 md:py-6 md:text-lg"
                    >
                        <ShoppingCart className="mr-0 h-5 w-5 md:mr-2" />
                        {cartCount > 0 && (
                            <span className="absolute -right-1.5 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-[2px] border-[#000000] bg-[#ffadad] text-[10px] font-black shadow-[2px_2px_0px_0px_#000000] animate-bounce md:-right-2 md:-top-2">
                                {cartCount}
                            </span>
                        )}
                    </Button>
                </div>
            </header>

            <main className="mx-auto max-w-[1200px] px-4 pb-16 pt-28 sm:px-6 max-md:pt-[calc(4.75rem+env(safe-area-inset-top))] md:pt-32">
                {/* Breadcrumb */}
                <div className="mb-8 hidden md:block">
                    <Link href="/tienda" className="inline-flex items-center gap-2 text-sm font-bold text-[#000000]/50 hover:text-[#000000] transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Volver a Productos
                    </Link>
                </div>

                <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 md:gap-10 lg:gap-16">
                    {/* Left: Product Images */}
                    <div className="mx-auto w-full max-w-md space-y-3 md:mx-0 md:space-y-4">
                        {/* Main Image Carousel */}
                        <div className="group relative aspect-square w-full overflow-hidden rounded-2xl border-[3px] border-[#000000] bg-muted shadow-[6px_6px_0px_0px_#000000] md:rounded-3xl md:shadow-[10px_10px_0px_0px_#000000]">
                            {/* Navigation Arrows */}
                            {allImages.length > 1 && (
                                <>
                                    <button
                                        onClick={(e) => { e.preventDefault(); prevImage(); }}
                                        className="absolute left-2.5 top-1/2 z-20 -translate-y-1/2 rounded-lg border-[2px] border-[#000000] bg-white/80 p-1.5 shadow-[2px_2px_0px_0px_#000000] backdrop-blur-sm transition-colors hover:bg-white active:scale-95 md:left-4 md:rounded-xl md:p-2 md:shadow-[3px_3px_0px_0px_#000000]"
                                    >
                                        <ChevronLeft className="h-5 w-5 text-[#000000] md:h-6 md:w-6" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.preventDefault(); nextImage(); }}
                                        className="absolute right-2.5 top-1/2 z-20 -translate-y-1/2 rounded-lg border-[2px] border-[#000000] bg-white/80 p-1.5 shadow-[2px_2px_0px_0px_#000000] backdrop-blur-sm transition-colors hover:bg-white active:scale-95 md:right-4 md:rounded-xl md:p-2 md:shadow-[3px_3px_0px_0px_#000000]"
                                    >
                                        <ChevronRight className="h-5 w-5 text-[#000000] md:h-6 md:w-6" />
                                    </button>
                                </>
                            )}

                            <Image
                                src={activeImage || product.foto}
                                alt={product.nombre}
                                key={activeImage}
                                fill
                                className="object-cover object-center animate-in fade-in zoom-in duration-500 max-md:object-top"
                                sizes="(max-width: 768px) 100vw, 50vw"
                                unoptimized={activeImage.startsWith('data:')}
                            />

                            {product.etiqueta && (
                                <div className="absolute top-4 left-4 z-10">
                                    <Badge className="bg-[#ffadad] border-[2px] border-[#000000] text-[#000000] font-black text-sm px-4 py-1 shadow-[2px_2px_0px_0px_#000000]">
                                        {product.etiqueta.toUpperCase()}
                                    </Badge>
                                </div>
                            )}

                            {/* Image Counter Indicator */}
                            {allImages.length > 1 && (
                                <div className="absolute bottom-4 right-4 bg-[#000000] text-white text-[10px] font-black px-3 py-1 rounded-full opacity-80 group-hover:opacity-100 transition-opacity">
                                    {allImages.indexOf(activeImage) + 1} / {allImages.length}
                                </div>
                            )}
                        </div>

                        {/* Thumbnails Gallery */}
                        {allImages.length > 1 && (
                            <div className="flex gap-3 overflow-x-auto py-2 px-1 scrollbar-hide">
                                {allImages.map((img: string, i: number) => (
                                    <button
                                        key={i}
                                        onClick={() => setActiveImage(img)}
                                        className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-[3px] bg-muted transition-all md:h-20 md:w-20 ${activeImage === img ? 'border-primary outline outline-[3px] outline-primary/30 scale-105 z-10' : 'border-[#000000]/10 hover:border-[#000000]/30 hover:shadow-md'}`}
                                    >
                                        <Image src={img} alt={`Gallery item ${i + 1}`} fill className="object-cover object-center" sizes="80px" unoptimized={img.startsWith('data:')} />
                                    </button>
                                ))}
                            </div>
                        )}

                    </div>

                    {/* Right: Product Details */}
                    <div className="flex w-full flex-col justify-start">
                        <div className="flex items-center gap-2 mb-3">
                            <Badge className="bg-[#E7BEF8]/30 text-[#000000]/80 font-black border-none hover:bg-[#E7BEF8]/40 uppercase tracking-widest text-[10px]">
                                {product.categoria}
                            </Badge>
                            {product.subcategoria && (
                                <Badge className="bg-primary/20 text-[#000000]/80 font-black border-none hover:bg-primary/30 uppercase tracking-widest text-[10px]">
                                    {product.subcategoria}
                                </Badge>
                            )}
                        </div>

                        <h1 className="mb-2 font-heading text-3xl font-black leading-tight text-[#000000] max-md:text-[2rem] lg:text-5xl">
                            {product.nombre}
                        </h1>
                        {product.marca && (
                            <p className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-4">Marca: {product.marca}</p>
                        )}
                        {(() => {
                          const basePrice = (product.precio || 0) * (1 - (product.descuento || 0) / 100)
                          const priceWithTax = calcPriceWithTax(basePrice)
                          const taxEnabled = taxSettings.taxEnabled || taxSettings.surchargeEnabled
                          const taxLabel = taxEnabled ? buildTaxLabel() : null
                          return (
                            <div className="mb-6 flex flex-wrap items-end gap-2.5 max-md:items-center md:gap-3">
                              {product.descuento ? (
                                <>
                                  <span className="text-4xl md:text-5xl font-black text-[#000000] tracking-tighter">${basePrice.toFixed(2)}</span>
                                  <span className="text-lg font-bold text-[#000000]/40 line-through mb-1">${(product.precio || 0).toFixed(2)}</span>
                                  <Badge className="mb-0 bg-[#ffadad] text-[#000000] font-black border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000]">Ahorra {product.descuento}%</Badge>
                                </>
                              ) : (
                                <span className="text-4xl md:text-5xl font-black text-[#000000] tracking-tighter">${(product.precio || 0).toFixed(2)}</span>
                              )}
                              {taxLabel && (
                                <Badge className="mb-0 max-w-full whitespace-normal bg-[#EDE986] text-[#000000] border-[2px] border-[#000000] text-[10px] font-bold leading-tight shadow-[2px_2px_0px_0px_#000000] md:text-xs">
                                  {taxLabel} ${priceWithTax.toFixed(2)}
                                </Badge>
                              )}
                            </div>
                          )
                        })()}

                        <p className="text-base text-[#000000]/70 font-medium leading-relaxed mb-6">
                            {product.descripcion || "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam."}
                        </p>

                        <div className="flex items-center gap-2 mb-6">
                            {product.stock > 0 ? (
                                <div className="flex items-center gap-2 text-emerald-600 font-black text-sm">
                                    <Check className="w-5 h-5" /> En Stock {product.stock <= 5 && <span className="text-orange-500">(¡Solo quedan {product.stock}!)</span>}
                                </div>
                                ) : (
                                <div className="flex items-center gap-2 text-red-500 font-black text-sm">
                                    <X className="w-5 h-5" /> Agotado Temporalmente
                                </div>
                            )}
                        </div>

                        {/* Order Progress Tracking (GLOBAL) */}
                        {orderStatus && orderStatus.purchased && orderStatus.estado && orderStatus.orderId && !["COMPLETADA", "ENTREGADO"].includes(orderStatus.estado.toUpperCase()) && (
                            <div className="mb-2">
                                <OrderProgressBar 
                                    currentStatus={orderStatus.estado} 
                                    orderId={orderStatus.orderId} 
                                    displayId={orderStatus.displayId}
                                    orderCode={orderStatus.orderCode}
                                />
                            </div>
                        )}

                                    {/* Quantity */}
                                    <div className={`mb-8 ${isOrderActive ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <p className="text-[10px] font-black text-[#000000] mb-2 uppercase tracking-[0.2em] opacity-40">Cantidad a Comprar</p>
                                        <div className="flex h-14 w-40 items-center overflow-hidden rounded-2xl border-[3.5px] border-[#000000] bg-white shadow-[4px_4px_0px_0px_#000000] md:shadow-[6px_6px_0px_0px_#000000]">
                                            <button 
                                                onClick={() => setQuantity(prev => Math.max(1, prev - 1))} 
                                                disabled={product.stock === 0 || quantity <= 1 || isOrderActive}
                                                className={`flex-1 h-full flex items-center justify-center hover:bg-[#EDE986] transition-all ${product.stock === 0 || quantity <= 1 || isOrderActive ? 'opacity-30 cursor-not-allowed' : 'opacity-100 hover:text-primary'}`}
                                            >
                                                <Minus className="w-5 h-5 text-[#000000]" strokeWidth={4} />
                                            </button>
                                            <span className="font-black text-2xl text-center w-12 border-x-[3px] border-[#000000]/10">{quantity}</span>
                                            <button 
                                                onClick={() => setQuantity(prev => prev + 1)} 
                                                disabled={product.stock === 0 || quantity >= product.stock || isOrderActive}
                                                className={`flex-1 h-full flex items-center justify-center hover:bg-[#EDE986] transition-all ${product.stock === 0 || quantity >= product.stock || isOrderActive ? 'opacity-30 cursor-not-allowed' : 'opacity-100 hover:text-primary'}`}
                                            >
                                                <Plus className="w-5 h-5 text-[#000000]" strokeWidth={4} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:gap-5">
                                        <Button
                                            onClick={() => {
                                                if (addCartBusy || product.stock === 0 || isOrderActive) return
                                                setAddCartBusy(true)
                                                addToCart(product, quantity)
                                                window.setTimeout(() => setAddCartBusy(false), 700)
                                            }}
                                            disabled={product.stock === 0 || isOrderActive || addCartBusy}
                                            className={`flex h-16 items-center justify-center gap-3 rounded-3xl border-[4px] border-[#000000] text-base font-black text-[#000000] shadow-[5px_5px_0px_0px_#000000] transition-all disabled:opacity-70 md:h-20 md:gap-4 md:rounded-[2.5rem] md:text-xl md:shadow-[8px_8px_0px_0px_#000000] ${product.stock === 0 ? 'bg-gray-300' : isOrderActive ? 'bg-[#e5e7eb] grayscale' : 'bg-primary hover:bg-primary/95'} ${isOrderActive ? '' : 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_#000000] active:scale-95'} flex-1`}
                                        >
                                            {addCartBusy ? (
                                                <>
                                                    <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-[#000000] border-t-transparent" />
                                                    AGREGANDO…
                                                </>
                                            ) : isOrderActive ? (
                                                <>
                                                    <Clock className="w-7 h-7" strokeWidth={4} />
                                                    PEDIDO EN CURSO
                                                </>
                                            ) : product.stock === 0 ? (
                                                'PRODUCTO AGOTADO'
                                            ) : (
                                                <>
                                                    <ShoppingCart className="w-7 h-7" strokeWidth={4} />
                                                    AGREGAR AL CARRITO
                                                </>
                                            )}
                                        </Button>
                                    </div>

                        {/* Specifications */}
                        {product.especificaciones && Object.keys(product.especificaciones).length > 0 && (
                            <div className="mb-8 space-y-4">
                                <h3 className="font-black text-lg uppercase tracking-wider mb-2 border-b-2 border-[#000000]/10 pb-2">Especificaciones</h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {Object.entries(product.especificaciones).map(([key, val]) => (
                                        <div key={key} className="flex justify-between items-center py-2 border-b border-dashed border-[#000000]/10">
                                            <span className="font-bold text-[#000000]/50 text-sm uppercase">{key}</span>
                                            <span className="font-black text-[#000000] text-sm">{String(val)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Benefits Box */}
                        <div className="bg-[#ffffff] border-[2px] border-[#000000] rounded-xl p-5 flex gap-4 shadow-[2px_2px_0px_0px_#000000]">
                            <Truck className="w-6 h-6 text-[#ea580c] flex-shrink-0 mt-1" />
                            <div>
                                <p className="font-black text-[#000000] text-sm mb-1">Envío Gratis</p>
                                <p className="text-sm font-medium text-[#000000]/60 leading-tight">Envío gratis en compras mayores a $200. Tiempo de entrega estimado: 3-5 días hábiles.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <section className="py-16 px-4 sm:px-6 bg-white border-t-[4px] border-[#000000]/10">
                <div className="max-w-[1200px] mx-auto">
                    <h3 className="text-2xl md:text-3xl font-black text-[#000000] mb-8">Productos Relacionados</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        {relatedProducts.map((relatedProd) => (
                                <Card
                                    key={relatedProd.id}
                                    className="group bg-white border-[2px] border-[#000000] rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] hover:-translate-y-1 transition-all duration-300 relative"
                                >
                                    <CardContent className="p-4 flex flex-col items-center h-full text-center">
                                        {relatedProd.etiqueta && (
                                            <Badge className="absolute top-3 left-3 bg-[#ffadad] border-[2px] border-[#000000] text-[#000000] font-black text-[9px] px-2 py-0.5 shadow-[2px_2px_0px_0px_#000000] z-10">
                                                {relatedProd.etiqueta}
                                            </Badge>
                                        )}
                                        {/* Cuadro Pequeño */}
                                        <div className="relative mb-4 mt-2 h-24 w-24 shrink-0 overflow-hidden rounded-xl border-[2px] border-[#000000] bg-muted shadow-[2px_2px_0px_0px_#000000] transition-colors group-hover:border-primary sm:h-32 sm:w-32">
                                            <Image src={relatedProd.foto} alt={relatedProd.nombre} fill className="object-cover object-center transition-transform duration-500 group-hover:scale-110" sizes="(max-width: 640px) 96px, 128px" unoptimized={relatedProd.foto.startsWith('data:')} />
                                        </div>
                                        <div className="flex-1 flex flex-col justify-end w-full">
                                            <h4 className="font-bold text-xs text-[#000000] leading-tight mb-1 line-clamp-2 px-1">{relatedProd.nombre}</h4>
                                            {(() => {
                                              const relatedBasePrice = (relatedProd.precio || 0) * (1 - (relatedProd.descuento || 0) / 100)
                                              const relatedPriceWithTax = calcPriceWithTax(relatedBasePrice)
                                              const taxLabel = buildTaxLabel()
                                              return (
                                                <>
                                                  <div className="flex items-center justify-center gap-1.5">
                                                    <p className="font-black text-base text-primary">${relatedBasePrice.toFixed(2)}</p>
                                                    {(relatedProd.descuento ?? 0) > 0 && (
                                                      <p className="text-[10px] font-bold text-[#000000]/35 line-through">
                                                        ${(relatedProd.precio || 0).toFixed(2)}
                                                      </p>
                                                    )}
                                                  </div>
                                                  {taxLabel && (
                                                    <p className="text-[9px] font-bold text-[#000000]/50">
                                                      {taxLabel}: ${relatedPriceWithTax.toFixed(2)}
                                                    </p>
                                                  )}
                                                </>
                                              )
                                            })()}
                                        </div>
                                        <Link href={`/tienda/${relatedProd.slug || relatedProd.id}`} className="absolute inset-0" />
                                    </CardContent>
                                </Card>
                            ))}
                    </div>

                    {/* Empty State */}
                    {relatedProducts.length === 0 && (
                        <div className="py-12 bg-[#ffffff] rounded-2xl border-[2px] border-dashed border-[#000000]/20 flex flex-col items-center justify-center text-center">
                            <PawPrint className="w-12 h-12 text-[#000000]/20 mb-4" />
                            <p className="font-bold text-[#000000]/60">No hay otros productos en esta categoría.</p>
                        </div>
                    )}
                </div>
            </section>

            <Contact compact />
            <footer className="pb-6 text-center">
              <p className="text-[#000000]/40 font-bold uppercase tracking-widest text-xs">MIAUWUAUF PREMIUM PET STORE  2026</p>
            </footer>

        </div>
    )
}

