"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, Calendar, User, Clock, ChevronLeft, ChevronRight, PawPrint } from "lucide-react"
import { SmartBackButton } from "@/components/SmartBackButton"
import { MiauLoading } from "@/components/MiauLoading"
import { ConfirmModal } from "@/components/ui/confirm-modal"
import { formatDate } from "@/lib/utils"
import Contact from "@/components/contacts"

interface BlogPost {
    id: string
    title: string
    excerpt: string
    content: string
    author: string
    date: string
    category: string
    image?: string
    images?: string[]
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
        <div className="group relative h-[350px] w-full overflow-hidden rounded-3xl border-[4px] border-[#000000] bg-muted shadow-[8px_8px_0px_0px_#000000] md:h-[500px]">
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
                        <button type="button" onClick={(e) => { e.preventDefault(); setCurrentIndex((prev) => (prev - 1 + images.length) % images.length); }} className="rounded-full border-[2px] border-[#000000] bg-[#EDE986] p-2.5 text-[#000000] shadow-[2px_2px_0px_0px_#000000] transition-colors hover:bg-[#E7BEF8] hover:text-[#000000]">
                            <ChevronLeft className="h-6 w-6" />
                        </button>
                    </div>
                    <div className="absolute right-4 top-1/2 z-30 -translate-y-1/2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                        <button type="button" onClick={(e) => { e.preventDefault(); setCurrentIndex((prev) => (prev + 1) % images.length); }} className="rounded-full border-[2px] border-[#000000] bg-[#EDE986] p-2.5 text-[#000000] shadow-[2px_2px_0px_0px_#000000] transition-colors hover:bg-[#E7BEF8] hover:text-[#000000]">
                            <ChevronRight className="h-6 w-6" />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

interface ConfirmModalState {
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
}

export default function BlogPostDetail() {
    const params = useParams()
    const router = useRouter()
    const slug = params.slug as string
    
    const { data: session } = useSession()
    const user = session?.user as { role?: string } | undefined
    const isBlogger = user?.role === "admin" || user?.role === "bloguer"

    const [post, setPost] = useState<BlogPost | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchPost = async () => {
            try {
                const res = await fetch(`/api/blog/${slug}`)
                if (res.ok) {
                    const data = await res.json()
                    setPost(data)
                }
            } catch (err) {
                console.error("Error fetching post:", err)
            } finally {
                setLoading(false)
            }
        }
        
        if (slug) {
            fetchPost()
        }
    }, [slug])

    const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
        isOpen: false,
        title: "",
        description: "",
        onConfirm: () => { }
    })

    const handleDelete = async () => {
        setConfirmModal({
            isOpen: true,
            title: "Eliminar Artículo",
            description: "¿Estás seguro de que deseas eliminar este artículo? Esta acción no se puede deshacer.",
            onConfirm: async () => {
                try {
                    const res = await fetch(`/api/blog/${slug}`, { method: "DELETE" })
                    if (res.ok) {
                        router.push("/blog")
                    } else {
                        toast.error("Error al eliminar el artículo")
                    }
                } catch {
                    toast.error("Error de red")
                }
            }
        })
    }

    if (loading) {
        return <MiauLoading text="Cargando historia..." />
    }

    if (!post) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white p-4 text-center font-body">
                <div>
                    <h1 className="text-4xl font-black font-heading text-[#000000] mb-4">Artículo no encontrado </h1>
                    <p className="text-[#000000]/80 font-bold mb-8">Parece que la historia que buscas ya no existe o el enlace es incorrecto.</p>
                    <SmartBackButton fallbackUrl="/blog" />
                    <span className="ml-4 font-bold text-[#000000]">Volver al Blog</span>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white pb-20 font-body">
            {/* Header Navigation */}
            <header className="sticky top-0 z-50 border-b-[3px] border-[#000000] bg-white">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <SmartBackButton fallbackUrl="/blog" />
                        <div className="relative z-10 -mr-1.5 flex shrink-0 -rotate-6 items-center md:-mr-4">
                            <span className="relative z-10 -mr-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full border-[2px] border-[#000000] bg-[#E7BEF8] shadow-[2px_2px_0px_0px_#000000] md:h-8 md:w-8 md:-mr-2">
                                <PawPrint className="h-3 w-3 text-white md:h-4 md:w-4" strokeWidth={2.8} />
                            </span>
                            <div className="rounded-xl border-[3px] border-[#000000] bg-[#E7BEF8] px-2 py-1 shadow-[3px_3px_0px_0px_#000000] md:px-4">
                                <span className="select-none text-[10px] font-black tracking-wide text-white md:text-xl md:tracking-wider uppercase">BLOG</span>
                            </div>
                        </div>
                    </div>

                    {isBlogger && (
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="hidden border-[2px] border-[#000000] bg-white hover:bg-[#e0dc7a] text-[#000000] font-bold shadow-[2px_2px_0px_0px_#000000]">
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleDelete} className="border-[2px] border-[#000000] bg-white hover:bg-red-400 text-[#000000] hover:text-white font-bold shadow-[2px_2px_0px_0px_#000000]">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar
                            </Button>
                        </div>
                    )}
                </div>
            </header>

            <article className="container mx-auto px-4 mt-8 max-w-4xl">
                {/* Categoría y Título */}
                <div className="text-center mb-10 space-y-6">
                    <Badge className="bg-[#E7BEF8] text-[#000000] border-[2px] border-[#000000] shadow-[3px_3px_0px_0px_#000000] font-bold px-4 py-1 text-base">
                        {post.category}
                    </Badge>
                    
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black font-heading text-[#000000] leading-tight">
                        {post.title}
                    </h1>
                    
                    {/* Metadatos */}
                    <div className="flex flex-wrap justify-center items-center gap-6 text-[#000000]/80 font-bold border-y-[3px] border-[#000000]/10 py-4">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-[#000000] bg-white shadow-[3px_3px_0px_0px_#000000]">
                                <User className="h-4 w-4 text-[#4A4A4A]" strokeWidth={2.5} />
                            </div>
                            <span>{post.author}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-[#E7BEF8]" />
                            <span>{formatDate(post.date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-[#93ABD9]" />
                            <span>3 min de lectura</span>
                        </div>
                    </div>
                </div>

                {/* Imagen Principal o Carrusel */}
                {post.images && post.images.length > 0 ? (
                    <div className="mb-12">
                        <AutoCarousel images={post.images} title={post.title} />
                    </div>
                ) : (
                    <div className="mb-12 rounded-3xl overflow-hidden border-[4px] border-[#000000] shadow-[8px_8px_0px_0px_#000000] aspect-[21/9] bg-white relative">
                        <Image 
                            src={post.image || "/placeholder.svg"} 
                            alt={post.title} 
                            fill
                            className="object-cover"
                            sizes="(max-width: 1024px) 100vw, 1000px"
                            priority
                        />
                    </div>
                )}

                {/* Contenido */}
                <div className="bg-white p-8 md:p-12 rounded-3xl border-[3px] border-[#000000] shadow-[6px_6px_0px_0px_#000000] relative">
                    <div className="absolute top-0 right-10 -translate-y-1/2 bg-[#E7BEF8] p-3 rounded-xl border-[3px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] rotate-12">
                        <span className="text-3xl"></span>
                    </div>
                    
                    <div
                        className="blog-content-inner prose prose-lg max-w-none text-[#000000]/90 prose-headings:font-heading prose-headings:font-black prose-headings:text-[#000000] prose-p:font-medium prose-p:text-[#000000]/80 prose-a:text-[#000000] prose-a:font-bold hover:prose-a:text-[#E7BEF8] prose-strong:text-[#000000] prose-strong:font-black editorial-dropcap"
                        dangerouslySetInnerHTML={{ __html: post.content || post.excerpt }}
                    />
                </div>
            </article>

            <ConfirmModal 
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                description={confirmModal.description}
            />
            <Contact compact />
            <footer className="pb-6 text-center">
              <p className="text-[#000000]/40 font-bold uppercase tracking-widest text-xs">MIAUWUAUF  2026</p>
            </footer>
        </div>
    )
}
