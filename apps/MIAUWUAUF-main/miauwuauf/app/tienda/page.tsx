"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ShoppingCart, ShoppingBag, ArrowLeft, Search, PawPrint, Heart, Plus, X, User } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

import { useRouter } from "next/navigation"
import { AdminService, type TiendaProducto, type CategoryStore, type SubcategoryStore } from "@/lib/admin-service"
import { LogoHorizontal } from "@/components/LogoHorizontal"
import { Bone, Shirt, Package } from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import { useCart } from "./context/CartContext"
import { MiauLoading } from "@/components/MiauLoading"
import { DEFAULT_STORE_TAX_SETTINGS, type StoreTaxSettings, normalizeStoreTaxSettings, formatIvaPercent } from "@/lib/store-settings"
import Contact from "@/components/contacts"
import ScrollToTop from "@/components/scroll-to-top"

export default function TiendaPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [activeCategory, setActiveCategory] = useState("todos")
  const [activeSubcategory, setActiveSubcategory] = useState("todas")
  const [searchQuery, setSearchQuery] = useState("")
  const { cartCount, addToCart, setIsCartOpen } = useCart()
  const [productos, setProductos] = useState<TiendaProducto[]>([])
  const [categories, setCategories] = useState<CategoryStore[]>([])
  const [officialSubcategories, setOfficialSubcategories] = useState<SubcategoryStore[]>([])
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedProducts, fetchedCategories, fetchedSubcategories] = await Promise.all([
          AdminService.getProducts(),
          AdminService.getCategories(),
          AdminService.getSubcategories()
        ])
        setProductos(fetchedProducts)
        setCategories(fetchedCategories)
        setOfficialSubcategories(fetchedSubcategories)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast.error("Error al cargar la tienda.")
      } finally {
        setLoading(false)
      }
    }
    fetchData()

    fetch("/api/store/settings")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setTaxSettings(normalizeStoreTaxSettings(data?.taxSettings ?? data)) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    // Wrap in timeout to avoid cascading render lint error
    const timer = setTimeout(() => {
      setActiveSubcategory("todas")
    }, 0)
    return () => clearTimeout(timer)
  }, [activeCategory])



  const subcategorias = Array.from(new Set(
    productos
      .filter(p => 
        activeCategory === "todos" || 
        p.categoria?.toLowerCase() === activeCategory || 
        p.subcategoria?.toLowerCase() === activeCategory
      )
      .map(p => p.subcategoria)
      .filter((s): s is string => {
        if (!s || s.toLowerCase() === activeCategory) return false;
        // Solo mostrar si existe en la lista oficial
        return officialSubcategories.some(os => os.nombre.toLowerCase() === s.toLowerCase());
      })
  ))

  const filteredProducts = productos.filter(p => {
    const matchesCategory = activeCategory === "todos" || 
                            p.categoria?.toLowerCase() === activeCategory || 
                            p.subcategoria?.toLowerCase() === activeCategory
    const matchesSubcategory = activeSubcategory === "todas" || 
                               p.subcategoria?.toLowerCase() === activeSubcategory?.toLowerCase()
    const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSubcategory && matchesSearch
  })




  if (loading) return <MiauLoading text="Preparando la tienda..." />

  return (
    <div className="min-h-screen relative font-body selection:bg-primary selection:text-primary-foreground bg-background">

      {/* Header: móvil = 2 filas (marca arriba, acciones abajo) para no aplastar el logo; md+ = 1 fila como siempre */}
      <header className="pointer-events-none fixed top-0 left-0 right-0 z-40 border-b border-[#000000]/5 bg-background/80 py-2 shadow-sm backdrop-blur-md
        flex flex-col gap-1.5 px-2
        md:flex-row md:items-center md:justify-between md:gap-0 md:px-8 md:py-3">
        <div className="flex w-full min-w-0 items-center gap-1.5 md:contents">
          <div className="flex shrink-0 justify-start pointer-events-auto md:flex-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push('/')}
              className="group h-10 w-10 rounded-full border-[2px] border-[#000000] bg-[#000000] text-[#EDE986] shadow-[3px_3px_0px_0px_#000000] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000000] md:h-12 md:w-12 md:border-[3px]"
              title="Regresar al inicio"
            >
              <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1 md:h-6 md:w-6" />
            </Button>
          </div>
          <div className="relative flex min-w-0 flex-1 justify-center py-1.5 pointer-events-auto md:flex-1 md:py-2">
            <Link href="/" className="block min-w-0 w-full max-w-full">
                <div className="mx-auto flex w-full min-w-0 max-w-full items-center justify-center gap-2 transition-transform md:max-w-none md:gap-4 md:hover:scale-105 max-md:px-0.5 max-md:gap-2 max-md:hover:scale-100">
                    <div className="relative z-10 -rotate-6 -mr-2 flex shrink-0 items-center md:-mr-6">
                        <span className="relative z-10 -mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border-[2px] border-[#000000] bg-[#E7BEF8] shadow-[2px_2px_0px_0px_#000000] md:h-7 md:w-7 md:-mr-2">
                          <PawPrint className="h-2.5 w-2.5 text-white md:h-3.5 md:w-3.5" strokeWidth={2.8} />
                        </span>
                        <div className="rounded-xl border-[3px] border-[#000000] bg-[#E7BEF8] px-1.5 py-0.5 shadow-[3px_3px_0px_0px_#000000] sm:px-2 md:px-4 md:py-1">
                          <span className="text-white font-black text-[9px] tracking-tight select-none sm:text-xs md:text-xl sm:tracking-wider">TIENDA</span>
                        </div>
                    </div>
                    <div className="relative -ml-2 translate-y-1 min-h-0 min-w-0 max-md:max-w-[min(11rem,42vw)] max-md:overflow-hidden md:-ml-5 md:translate-y-2 md:max-w-none">
                        <LogoHorizontal
                          size="md"
                          className="origin-left object-contain max-md:max-h-11 max-md:max-w-full max-md:scale-95 max-md:origin-center scale-110 md:scale-125"
                        />
                    </div>
                </div>
            </Link>
          </div>
        </div>

        <div className="flex w-full min-w-0 shrink-0 items-center justify-end gap-1.5 pointer-events-auto max-md:pt-0.5 md:w-auto md:flex-1 md:justify-end md:gap-4">
            {status === "unauthenticated" ? (
              <div className="flex items-center gap-2 md:gap-3">
                <div className="bg-[#f2c1bd] hidden md:flex border-[3px] border-[#000000] px-4 py-1.5 rounded-full font-black text-[10px] md:text-xs uppercase shadow-[2px_2px_0px_0px_#000000]">
                  Estado: Invitado
                </div>
                <Link href="/login?callbackUrl=/tienda" title="Iniciar sesión">
                  <Button className="max-md:px-2.5 max-md:py-1.5 max-md:text-[9px] max-md:leading-tight max-md:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] bg-[#93ABD9] border-[3px] md:border-[4px] border-[#000000] px-3 md:px-5 py-1.5 md:py-2 rounded-full font-black text-[10px] md:text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="md:hidden">ENTRAR</span>
                    <span className="hidden md:inline">INICIAR SESIÓN</span>
                  </Button>
                </Link>
              </div>
            ) : session?.user ? (
             <>
              <div className="hidden items-center gap-2 rounded-full border-[3px] border-[#000000] bg-[#93ABD9] px-3 py-1.5 shadow-[2px_2px_0px_0px_#000000] transition-transform md:flex">
                <span className="max-w-[120px] truncate font-black text-[10px] text-[#000000] uppercase md:text-xs">Logueado: {session.user.name?.split(" ")[0]}</span>
                <button type="button" onClick={() => signOut()} className="ml-1 rounded-full border-[2px] border-[#000000] bg-white p-0.5 transition-colors hover:bg-red-400" title="Cerrar sesión">
                  <X className="h-3 w-3 text-[#000000] font-black md:h-3.5 md:w-3.5" strokeWidth={4} />
                </button>
              </div>
              <div className="flex items-center gap-1.5 md:hidden" title="Sesión activa">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[3px] border-[#000000] bg-[#93ABD9] text-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                  <User className="h-5 w-5" strokeWidth={2.5} />
                </span>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[2px] border-[#000000] bg-white text-[#000000] transition-colors hover:bg-red-400"
                  title="Cerrar sesión"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={4} />
                </button>
              </div>
            </>
            ) : null}

            <Button 
                onClick={() => setIsCartOpen(true)}
                className="h-9 shrink-0 rounded-full border-[2px] px-2.5 text-xs md:h-14 md:px-6 md:border-[3px] border-[#000000] bg-primary text-foreground font-black md:text-lg shadow-[3px_3px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_#000000] relative"
            >
                <ShoppingCart className="h-4 w-4 md:mr-2 md:h-5 md:w-5" />
                <span className="hidden sm:inline">Carrito</span>
                {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 md:-top-2 md:-right-2 bg-[#ffadad] border-2 border-[#000000] text-[10px] md:text-xs font-black w-5 h-5 md:w-7 md:h-7 flex items-center justify-center rounded-full shadow-[2px_2px_0px_0px_#000000]">
                        {cartCount}
                    </span>
                )}
            </Button>      </div>
    </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-32 md:pt-40">
        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-6 md:gap-12 mb-8 md:mb-12 items-stretch lg:items-center bg-white/70 backdrop-blur-md p-4 md:p-6 rounded-[2rem] md:rounded-[3rem] border-[4px] border-[#000000] shadow-[8px_8px_0px_0px_#000000] mx-auto w-full max-w-[95vw] lg:w-fit">
            <div className="relative w-full md:w-[28rem] flex-shrink-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#000000]/50 w-5 h-5" />
                <Input 
                    placeholder="Buscando el mejor regalo..." 
                    className="h-12 md:h-14 pl-12 rounded-full border-[3px] border-[#000000] font-bold text-base bg-[#EDE986] shadow-[4px_4px_0px_0px_#000000] focus-visible:ring-0 focus-visible:translate-x-[2px] focus-visible:translate-y-[2px] focus-visible:shadow-[2px_2px_0px_0px_#000000] transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            
            <div className="flex flex-col gap-3 w-full lg:w-auto">
                <div className="flex flex-nowrap md:flex-wrap gap-2 md:gap-3 justify-start overflow-x-auto overflow-y-hidden scroll-smooth [-webkit-overflow-scrolling:touch] py-1 px-1 lg:justify-end">
                    {/* Botón "Todos" siempre al principio */}
                    <Button 
                        onClick={() => setActiveCategory("todos")}
                        className={`
                            rounded-full h-10 md:h-12 px-4 md:px-5 border-[3px] border-[#000000] font-black text-xs md:text-sm capitalize transition-all duration-300 flex-shrink-0 whitespace-nowrap
                            shadow-[3px_3px_0px_0px_#000000] hover:-translate-y-0.5 hover:shadow-[3px_5px_0px_0px_#000000] active:translate-y-[2px] active:translate-x-[2px] active:shadow-[1px_1px_0px_0px_#000000]
                            ${activeCategory === "todos" ? 'bg-[#E7BEF8] text-[#000000]' : 'bg-white text-[#000000] hover:bg-[#EDE986]'}
                        `}
                    >
                        <ShoppingBag className="w-4 h-4 mr-1 md:mr-2" />
                        Todos
                    </Button>

                    {/* Categorías dinámicas de la DB */}
                    {categories.map((cat) => {
                        const Icon = cat.nombre.toLowerCase().includes("comida") || cat.nombre.toLowerCase().includes("alimento") ? Bone : 
                                     cat.nombre.toLowerCase().includes("ropa") ? Shirt : 
                                     cat.nombre.toLowerCase().includes("perro") ? PawPrint : 
                                     cat.nombre.toLowerCase().includes("gato") ? Heart : Package;
                        
                        return (
                            <Button 
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.nombre.toLowerCase())}
                                className={`
                                    rounded-full h-10 md:h-12 px-4 md:px-5 border-[3px] border-[#000000] font-black text-xs md:text-sm capitalize transition-all duration-300 flex-shrink-0
                                    shadow-[3px_3px_0px_0px_#000000] hover:-translate-y-0.5 hover:shadow-[3px_5px_0px_0px_#000000] active:translate-y-[2px] active:translate-x-[2px] active:shadow-[1px_1px_0px_0px_#000000]
                                    ${activeCategory === cat.nombre.toLowerCase() ? 'bg-[#E7BEF8] text-[#000000]' : 'bg-white text-[#000000] hover:bg-[#EDE986]'}
                                `}
                            >
                                <Icon className="w-4 h-4 mr-1 md:mr-2" />
                                {cat.nombre}
                            </Button>
                        )
                    })}
            </div>

            {subcategorias.length > 0 && (
                    <div className="flex flex-nowrap md:flex-wrap gap-2 md:gap-3 justify-start overflow-x-auto overflow-y-hidden scroll-smooth [-webkit-overflow-scrolling:touch] lg:justify-end animate-in fade-in slide-in-from-top duration-500 py-1 px-1">
                        <Button
                            onClick={() => setActiveSubcategory("todas")}
                            className={`
                                rounded-full h-8 md:h-10 px-4 md:px-5 border-[3px] border-[#000000] font-black text-[10px] md:text-xs capitalize transition-all flex-shrink-0 whitespace-nowrap
                                shadow-[2px_2px_0px_0px_#000000] hover:-translate-y-0.5 hover:shadow-[2px_4px_0px_0px_#000000] active:translate-y-[1px] active:translate-x-[1px] active:shadow-[1px_1px_0px_0px_#000000]
                                ${activeSubcategory === "todas" ? 'bg-[#000000] text-[#EDE986]' : 'bg-white text-[#000000] hover:bg-gray-50'}
                            `}
                        >
                            Todas
                        </Button>
                        {subcategorias.map((sub) => (
                            <Button
                                key={sub}
                                onClick={() => setActiveSubcategory(sub)}
                                className={`
                                    rounded-full h-8 md:h-10 px-4 md:px-5 border-[3px] border-[#000000] font-black text-[10px] md:text-xs capitalize transition-all whitespace-nowrap flex-shrink-0
                                    shadow-[2px_2px_0px_0px_#000000] hover:-translate-y-0.5 hover:shadow-[2px_4px_0px_0px_#000000] active:translate-y-[1px] active:translate-x-[1px] active:shadow-[1px_1px_0px_0px_#000000]
                                    ${activeSubcategory === sub ? 'bg-[#000000] text-[#EDE986]' : 'bg-white text-[#000000] hover:bg-gray-50'}
                                `}
                            >
                                <span className="capitalize">{sub.toLowerCase()}</span>
                            </Button>
                        ))}
                    </div>
                )}
            </div>
        </div>
        
        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-10">
            {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="group bg-white rounded-[2rem] overflow-hidden border-[3px] border-[#000000] shadow-[8px_8px_0px_0px_#000000] hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_#000000] transition-all duration-300 flex flex-col h-full [transform:translateZ(0)]"
                >
                    {/* Image Section */}
                    <div 
                        className="relative aspect-square overflow-hidden cursor-pointer border-b-[3px] border-[#000000]" 
                        onClick={() => router.push(`/tienda/${product.slug || product.id}`)}
                    >
                        <Image 
                            src={product.foto} 
                            alt={product.nombre} 
                            fill
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 will-change-transform" 
                        />
                        
                        {/* Overlay on hover for better effect and preventing z-index glitches */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-[#000000]/5 transition-colors duration-300 pointer-events-none" />

                        {/* Badges on Image */}
                        <div className="absolute top-4 left-4 flex flex-col gap-2">
                            {(product.descuento ?? 0) > 0 && (
                                <div className="bg-primary text-primary-foreground font-black text-[10px] md:text-xs px-3 py-1 rounded-full border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                                    -{product.descuento}%
                                </div>
                            )}
                            {product.stock === 0 && (
                                <div className="bg-[#000000] text-[#EDE986] font-black text-[10px] md:text-xs px-3 py-1 rounded-full border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                                    AGOTADO
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Content Section */}
                    <div className="p-4 md:p-5 flex flex-col flex-grow">
                        {/* Category & Subcategory */}
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-primary font-black text-[9px] md:text-[11px] uppercase tracking-widest">
                                {product.categoria} {product.subcategoria && product.subcategoria.toLowerCase() !== product.categoria.toLowerCase() && `| ${product.subcategoria}`}
                            </span>
                        </div>
                        {/* Title */}
                        <h3 
                            className="text-lg md:text-xl font-bold text-[#000000] leading-tight mb-1 transition-colors line-clamp-2 cursor-pointer group-hover:text-primary"
                            onClick={() => router.push(`/tienda/${product.slug || product.id}`)}
                        >
                            {product.nombre}
                        </h3>
                        
                        {/* Price Section */}
                        <div className="mt-auto pt-1">
                          {(() => {
                            const basePrice = (product.precio || 0) * (1 - (product.descuento || 0) / 100)
                            const priceWithTax = calcPriceWithTax(basePrice)
                            const taxLabel = buildTaxLabel()
                            return (
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-3">
                                  {product.descuento ? (
                                    <>
                                      <span className="text-2xl md:text-3xl font-black text-[#000000]">
                                        ${basePrice.toFixed(2)}
                                      </span>
                                      <span className="text-sm md:text-base line-through text-gray-400 font-medium">
                                        ${(product.precio || 0).toFixed(2)}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-2xl md:text-3xl font-black text-[#000000]">
                                      ${(product.precio || 0).toFixed(2)}
                                    </span>
                                  )}
                                </div>
                                {taxLabel && (
                                  <p className="text-[10px] font-bold text-[#000000]/50">
                                    {taxLabel} ${priceWithTax.toFixed(2)}
                                  </p>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                        
                        {/* Add Button */}
                        <Button 
                            onClick={() => product.stock > 0 && addToCart(product)}
                            disabled={product.stock === 0}
                            className={`
                                w-full mt-3 rounded-full py-3 md:py-4 font-black text-[9px] md:text-sm transition-all duration-300
                                flex items-center justify-center gap-1 md:gap-2 border-[3px] border-[#000000]
                                ${product.stock === 0 
                                    ? 'bg-gray-200 text-gray-500 shadow-none grayscale opacity-60' 
                                    : 'bg-primary text-foreground shadow-[3px_3px_0px_0px_#000000] hover:-translate-y-0.5 hover:shadow-[3px_5px_0px_0px_#000000] active:translate-y-[2px] active:translate-x-[2px] active:shadow-[1px_1px_0px_0px_#000000]'}
                            `}
                        >
                            {product.stock === 0 ? 'AGOTADO' : (
                                <>
                                    <Plus className="w-4 h-4 md:w-5 md:h-5" />
                                    AGREGAR AL CARRITO
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            ))}
        </div>

        {filteredProducts.length === 0 && (
            <div className="text-center py-40 animate-in fade-in zoom-in duration-500">
                <div className="bg-[#EDE986] inline-block p-12 rounded-[4rem] border-[4px] border-dashed border-[#000000]/20">
                    <Search className="w-32 h-32 mx-auto text-[#000000]/10 mb-6" />
                    <h3 className="text-4xl font-black text-[#000000]/30 font-heading">¿ESTÁS BUSCANDO ALGO MÁGICO?</h3>
                    <p className="text-xl font-bold text-[#000000]/20 mt-4 uppercase tracking-widest">No encontramos lo que buscas hoy</p>
                    <Button 
                        variant="link" 
                        onClick={() => {setSearchQuery(""); setActiveCategory("todos")}}
                        className="mt-8 text-primary font-black text-2xl hover:underline"
                    >
                        Ver todos los productos
                    </Button>
                </div>
            </div>
        )}
      </main>

      <Contact compact />
      <footer className="pb-6 text-center">
        <p className="text-[#000000]/40 font-bold uppercase tracking-widest text-xs">MIAUWUAUF PREMIUM PET STORE  2026</p>
      </footer>

      <ScrollToTop />
    </div>
  )
}

