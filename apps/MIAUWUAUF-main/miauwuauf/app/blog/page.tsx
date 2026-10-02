"use client"

import { useState, useEffect } from "react"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Calendar, Search, X, ChevronLeft, ChevronRight, PawPrint } from "lucide-react"
import { SmartBackButton } from "@/components/SmartBackButton"
import { MiauLoading } from "@/components/MiauLoading"
import { BrandLogo } from "@/components/brand-logo"
import { LogoHorizontal } from "@/components/LogoHorizontal"
import { formatDate } from "@/lib/utils"
import Contact from "@/components/contacts"



// El tipo de los posts que vienen del backend
interface BlogPost {
    id: string | number
    slug?: string
    title: string
    excerpt: string
    content?: string
    author: string
    date: string
    category: string
    image?: string
    images?: string[]
}

interface DBBlogCategory {
    id: string
    nombre: string
}

const AutoCarousel = ({ images, title }: { images: string[], title: string }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (!images || images.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % images.length);
        }, 3000); // Cambia cada 3 segundos
        return () => clearInterval(interval);
    }, [images]);

    if (!images || images.length === 0) return null;

  return (
        <div className="group relative h-[350px] w-full overflow-hidden rounded-2xl border-[4px] border-[#000000] bg-muted shadow-[8px_8px_0px_0px_#000000] md:h-[500px]">
            <div className="pointer-events-none absolute inset-0 z-10 bg-[#000000]/10 transition-all group-hover:bg-transparent" />
            <Image
                key={currentIndex}
                src={images[currentIndex]}
                alt={`${title} - imagen ${currentIndex + 1}`}
                fill
                className="object-cover object-center sepia-[30%] contrast-125 transition-all duration-500 group-hover:sepia-0"
                sizes="(max-width: 1024px) 100vw, 80vw"
            />
            {images.length > 1 && (
                <div className="absolute bottom-0 left-0 bg-[#000000] text-[#EDE986] font-bold font-heading text-xs px-4 py-2 z-20 rounded-tr-xl">
                    {currentIndex + 1} / {images.length}
                </div>
            )}
            <div className="absolute bottom-0 right-0 bg-white border-t-[4px] border-l-[4px] border-[#000000] px-4 py-2 font-bold font-heading text-xs tracking-wider uppercase z-20">
                FOTO EXCLUSIVA
            </div>

            {images.length > 1 && (
                <>
                    <div className="absolute left-4 top-1/2 z-30 -translate-y-1/2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                        <button type="button" onClick={() => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)} className="rounded-full border-[2px] border-[#000000] bg-[#EDE986] p-2.5 text-[#000000] shadow-[2px_2px_0px_0px_#000000] transition-colors hover:bg-[#e7bef8] hover:text-[#000000]">
                            <ChevronLeft className="h-6 w-6" />
                        </button>
                    </div>
                    <div className="absolute right-4 top-1/2 z-30 -translate-y-1/2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                        <button type="button" onClick={() => setCurrentIndex((prev) => (prev + 1) % images.length)} className="rounded-full border-[2px] border-[#000000] bg-[#EDE986] p-2.5 text-[#000000] shadow-[2px_2px_0px_0px_#000000] transition-colors hover:bg-[#e7bef8] hover:text-[#000000]">
                            <ChevronRight className="h-6 w-6" />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default function BlogPage() {
    // UI states from backend
    const [dbCategories, setDbCategories] = useState<DBBlogCategory[]>([])
    const categories = ["Todos", ...dbCategories.map(c => c.nombre)]
    const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null)
    
    // Data states from backend
    const [posts, setPosts] = useState<BlogPost[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("Todos")

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Fetch Posts
                const postsRes = await fetch("/api/blog")
                if (postsRes.ok) {
                    const data: BlogPost[] = await postsRes.json()
                    setPosts(data)
                }

                // Fetch Categories
                const catRes = await fetch("/api/blog/categories")
                if (catRes.ok) {
                    const catData = await catRes.json()
                    setDbCategories(catData)
                }
            } catch (err) {
                console.error("Error fetching blog data:", err)
            } finally {
                setLoading(false)
            }
        }
        
        fetchInitialData()
    }, [])

    const filteredPosts = posts.filter(post => {
        const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) || post.category.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = selectedCategory === "Todos" || post.category === selectedCategory

        return matchesSearch && matchesCategory;
    })

    if (loading) {
        return <MiauLoading text="Cargando articulos..." />
    }


    return (
        <div className="min-h-screen bg-white font-body">
            {/* Header Navigation */}
            <header className="sticky top-0 z-50 border-b-[3px] border-[#000000] bg-white">
                <div className="container mx-auto flex flex-col gap-2 px-3 py-3 sm:px-4 md:h-20 md:flex-row md:items-center md:justify-between md:gap-4 md:py-0">
                    {/* móvil: fila 1 = atrás + logo + BLOG; fila 2 = CTA. md+: una fila como siempre (md:contents) */}
                    <div className="flex w-full min-w-0 items-center gap-2 sm:gap-3 md:contents">
                        <div className="shrink-0 md:flex md:flex-1 md:justify-start">
                            <SmartBackButton />
                        </div>
                        <div className="flex min-w-0 flex-1 items-center justify-center gap-2.5 py-0.5 sm:gap-3 md:flex-1 md:justify-start md:gap-3 md:py-0">
                            <div className="relative z-10 -mr-1.5 flex shrink-0 -rotate-6 items-center md:-mr-6">
                                <span className="relative z-10 -mr-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full border-[2px] border-[#000000] bg-[#E7BEF8] shadow-[2px_2px_0px_0px_#000000] md:h-8 md:w-8 md:-mr-2">
                                    <PawPrint className="h-3 w-3 text-white md:h-4 md:w-4" strokeWidth={2.8} />
                                </span>
                                <div className="rounded-xl border-[3px] border-[#000000] bg-[#E7BEF8] px-2 py-1 shadow-[3px_3px_0px_0px_#000000] md:px-4">
                                    <span className="select-none text-[10px] font-black tracking-wide text-white md:text-xl md:tracking-wider uppercase">BLOG</span>
                                </div>
                            </div>
                            <div className="relative -ml-1 translate-y-1 min-w-0 max-md:max-w-[min(15.5rem,68vw)] brightness-0 md:-ml-4 md:translate-y-2 md:max-w-none md:overflow-visible">
                                <LogoHorizontal
                                  size="md"
                                  className="origin-center scale-110 object-contain max-md:max-h-12 max-md:max-w-full max-md:scale-[0.98] md:origin-left md:scale-125"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex w-full min-w-0 shrink-0 items-stretch justify-stretch max-md:pt-0.5 md:w-auto md:flex-1 md:justify-end md:items-center">
                        <Button className="h-9 w-full text-sm font-bold shadow-[3px_3px_0px_0px_#000000] sm:h-10 md:h-auto md:w-auto md:shadow-[4px_4px_0px_0px_#000000]" asChild>
                            <Link href="/login" className="max-md:py-2 max-md:leading-tight">Acceso Bloguer</Link>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12 max-w-7xl">
                <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
                    <div className="space-y-2">
                        <h2 className="text-4xl md:text-5xl font-black font-heading text-[#000000]">Todos los Artículos</h2>
                        <p className="text-lg text-[#000000]/70 font-bold">Descubre historias, consejos y noticias de nuestra comunidad.</p>
                    </div>

                    <div className="relative w-full md:w-96 flex items-center">
                        <Search className="absolute left-4 z-10 w-5 h-5 text-[#000000]/60 pointer-events-none" />
                        <Input
                            placeholder="Buscar artículos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 h-12 rounded-full border-[3px] border-[#000000] bg-white shadow-[4px_4px_0px_0px_#000000] focus-visible:ring-0 focus-visible:border-[#000000]"
                        />
                    </div>
                </div>
 
                 {/* Categorías y Limpiar */}
                 <div className="flex flex-wrap items-center gap-3 mb-10">
                     <div className="flex flex-nowrap overflow-x-auto gap-3 flex-1 scrollbar-hide pb-6 pt-2 -mx-4 px-4">
                         {categories.map((category) => (
                             <Button
                                 key={category}
                                 onClick={() => setSelectedCategory(category)}
                                 variant={selectedCategory === category ? "default" : "outline"}
                                 className={`whitespace-nowrap px-6 rounded-full border-[2px] border-[#000000] font-bold transition-all ${selectedCategory === category
                                     ? "border-[3px] border-[#000000] bg-[#e7bef8] font-black text-[#000000] shadow-[4px_4px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#EDE986] hover:shadow-[2px_2px_0px_0px_#000000]"
                                     : "border-[3px] border-[#000000] bg-[#E7BEF8] font-black text-[#000000] shadow-[3px_3px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#EDE986] hover:shadow-[2px_2px_0px_0px_#000000]"
                                     }`}
                             >
                                 {category}
                             </Button>
                         ))}
                     </div>
                 </div>



                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredPosts.length > 0 ? filteredPosts.map((post) => (
                        <Card key={post.id} className="flex flex-col overflow-hidden rounded-3xl border-[3px] border-[#000000] bg-white p-0 shadow-[6px_6px_0px_0px_#000000] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[2px_2px_0px_0px_#000000]">
                            <div className="relative aspect-video w-full overflow-hidden bg-muted border-b-[3px] border-[#000000]">
                                <Image
                                    src={post.image || "/placeholder.svg"}
                                    alt={post.title}
                                    fill
                                    className="object-cover object-center"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                />
                                <Badge className="absolute top-4 right-4 bg-[#E7BEF8] text-[#000000] border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000] font-bold">
                                    {post.category}
                                </Badge>
                            </div>
                            <CardHeader className="flex-1 pt-5 pb-3">
                                <CardTitle className="text-xl font-black font-heading text-[#000000] line-clamp-2 mb-2">
                                    {post.title}
                                </CardTitle>
                                <div className="flex flex-wrap gap-4 text-xs font-bold text-[#000000]/70">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>{formatDate(post.date)}</span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pb-3">
                                <p className="text-sm text-[#000000]/80 font-medium line-clamp-3">
                                    {post.excerpt}
                                </p>
                            </CardContent>
                            <CardFooter className="mt-auto flex gap-2 pt-5 pb-6">
                                <Button
                                    onClick={() => setSelectedPost(post)}
                                    className="flex-1 border-[3px] border-[#000000] bg-[#e7bef8] font-black text-[#000000] shadow-[4px_4px_0px_0px_#000000] hover:bg-[#EDE986]"
                                >
                                    Leer Más
                                </Button>


                            </CardFooter>
                        </Card>
                    )) : (
                        <div className="col-span-full py-20 text-center">
                            <h3 className="text-2xl font-bold text-[#000000] mb-2 font-heading">No se encontraron artículos</h3>
                            <p className="text-[#000000]/70 font-medium">Intenta con otros términos de búsqueda.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Modal / Panel estilo periódico */}
            {selectedPost && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
                    <div
                        className="absolute inset-0 bg-[#000000]/60 backdrop-blur-sm"
                        onClick={() => setSelectedPost(null)}
                    />
                    <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border-[4px] border-[#000000] bg-white shadow-[12px_12px_0px_0px_#000000] animate-in fade-in zoom-in-95 duration-200">
                        {/* Cabecera del periódico */}
                        <div className="border-b-[4px] border-[#000000] p-4 md:p-6 bg-white flex justify-between items-center shrink-0">
                            <div className="w-10 md:w-12">
                                <Link href={`/blog/${selectedPost.slug || selectedPost.id}`} className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full border-[2px] border-[#000000] bg-primary shadow-[2px_2px_0px_0px_#000000] hover:bg-primary/80 transition-colors" title="Ver historia completa">
                                    <PawPrint className="w-5 h-5 md:w-6 md:h-6 text-white" />
                                </Link>
                            </div>
                            <div className="flex-1 text-center border-y-[2px] border-[#000000] py-2">
                                <h2 className="text-2xl md:text-5xl font-black font-heading text-[#000000] uppercase tracking-widest text-center">
                                    MIAUWUAUF TIMES
                                </h2>
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                className="w-10 h-10 md:w-12 md:h-12 border-[2px] border-[#000000] bg-[#EDE986] hover:bg-[#e0dc7a] text-[#000000] rounded-full shadow-[2px_2px_0px_0px_#000000] flex-shrink-0"
                                onClick={() => setSelectedPost(null)}
                            >
                                <X className="w-5 h-5 md:w-6 md:h-6" />
                            </Button>
                        </div>

                        {/* Contenido scrolleable */}
                        <div className="hide-scrollbar flex-1 overflow-y-auto bg-white p-6 md:p-10">
                            <div className="max-w-4xl mx-auto space-y-8 md:space-y-10">
                                {/* Título de la noticia */}
                                <div className="space-y-6 text-center border-b-[4px] border-[#000000] pb-8 md:pb-10">
                                    <Badge className="bg-[#E7BEF8] text-[#000000] border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000] font-bold text-sm md:text-base px-6 py-1.5 mb-2">
                                        {selectedPost.category}
                                    </Badge>
                                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black font-heading text-[#000000] leading-[1.1]">
                                        {selectedPost.title}
                                    </h1>
                                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 pt-4 font-bold text-[#000000]/80 text-sm md:text-base uppercase tracking-wider">
                                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                                            <Calendar className="w-4 h-4" />
                                            {formatDate(selectedPost.date)}
                                        </div>
                                    </div>
                                </div>

                                {/* Imagen principal / Carrusel */}
                                {selectedPost.images && selectedPost.images.length > 0 ? (
                                    <AutoCarousel images={selectedPost.images} title={selectedPost.title} />
                                ) : (
                                    <div className="group relative h-[350px] w-full overflow-hidden rounded-2xl border-[4px] border-[#000000] bg-muted shadow-[8px_8px_0px_0px_#000000] md:h-[500px]">
                                        <div className="pointer-events-none absolute inset-0 z-10 bg-[#000000]/10 transition-all group-hover:bg-transparent" />
                                        <Image
                                            src={selectedPost.image || "/placeholder.svg"}
                                            alt={selectedPost.title}
                                            fill
                                            className="object-cover object-center sepia-[30%] contrast-125 transition-all duration-500 group-hover:sepia-0"
                                            sizes="(max-width: 1024px) 100vw, 80vw"
                                        />
                                        <div className="absolute bottom-0 right-0 bg-white border-t-[4px] border-l-[4px] border-[#000000] px-4 py-2 font-bold font-heading text-xs tracking-wider uppercase z-20">
                                            FOTO EXCLUSIVA
                                        </div>
                                    </div>
                                )}



                                {/* Contenido: mismas clases que /blog/[id] para WYSIWYG real */}
                                <div className="max-w-none">
                                    {selectedPost.content ? (
                                        <div
                                            dangerouslySetInnerHTML={{ __html: selectedPost.content }}
                                            className="blog-content-inner prose prose-lg max-w-none text-[#000000]/90 prose-headings:font-heading prose-headings:font-black prose-headings:text-[#000000] prose-p:font-medium prose-p:text-[#000000]/80 prose-a:text-[#000000] prose-a:font-bold hover:prose-a:text-[#e7bef8] prose-strong:text-[#000000] prose-strong:font-black editorial-dropcap"
                                        />
                                    ) : (
                                        <div className="prose prose-lg md:prose-xl prose-headings:font-black prose-headings:font-heading prose-p:font-medium prose-p:text-[#000000] sm:columns-2 gap-8 md:gap-12 text-justify">
                                            <p className="first-letter:text-7xl md:first-letter:text-8xl first-letter:font-black first-letter:font-heading first-letter:float-left first-letter:mr-4 first-letter:mt-2 first-letter:text-[#e7bef8] first-letter:h-full">
                                                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                                            </p>
                                            <p>
                                                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                                            </p>
                                            <p>
                                                Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
                                            </p>
                                            <p>
                                                Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-8 border-t-[4px] border-[#000000] border-dashed text-center">
                                    <p className="font-heading font-black text-2xl text-[#000000] opacity-50">- FIN DEL ARTÍCULO -</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <Contact compact />
            <footer className="pb-6 text-center">
              <p className="text-[#000000]/40 font-bold uppercase tracking-widest text-xs">MIAUWUAUF  2026</p>
            </footer>
        </div>
    )
}
