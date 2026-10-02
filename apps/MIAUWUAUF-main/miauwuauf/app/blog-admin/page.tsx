"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import NextImage from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { BrandLogo } from "@/components/brand-logo"
import { LogoHorizontal } from "@/components/LogoHorizontal"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Plus, Edit, Trash2, Calendar, Search, Settings, X, Tag, CheckCircle2, ChevronLeft, ChevronRight, Loader2, PawPrint } from "lucide-react"
import { toast } from "sonner"
import { validateUpload } from "@/lib/upload-validation"
import { formatDate } from "@/lib/utils"
import RichTextEditor from "./components/RichTextEditor"



interface BlogPost {
    id: string | number
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

// Datos de prueba iniciales
// initialPosts ya no es necesario ya que usamos la base de datos

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
            <NextImage
                key={currentIndex}
                src={images[currentIndex]}
                alt={`${title} - imagen ${currentIndex + 1}`}
                fill
                className="object-cover object-center sepia-[30%] contrast-125 transition-all duration-500 animate-in fade-in group-hover:sepia-0"
                sizes="(max-width: 1024px) 100vw, 80vw"
                unoptimized
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
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)} className="bg-[#EDE986] text-[#000000] p-2 rounded-full border-[2px] border-[#000000] hover:bg-[#e7bef8] hover:text-[#000000] transition-colors shadow-[2px_2px_0px_0px_#000000]">
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setCurrentIndex((prev) => (prev + 1) % images.length)} className="bg-[#EDE986] text-[#000000] p-2 rounded-full border-[2px] border-[#000000] hover:bg-[#e7bef8] hover:text-[#000000] transition-colors shadow-[2px_2px_0px_0px_#000000]">
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default function BlogAdminPage() {
    const router = useRouter()
    const { data: session, status: sessionStatus } = useSession()
    const [mounted, setMounted] = useState(false)
    const [isBlogger, setIsBlogger] = useState(false)
    const [posts, setPosts] = useState<BlogPost[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("Todos")
    const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null)
    const [editingPostId, setEditingPostId] = useState<string | number | null>(null)
    const [dbCategories, setDbCategories] = useState<DBBlogCategory[]>([])
    const categories = ["Todos", ...dbCategories.map(c => c.nombre)]
    
    const [isManagingCategories, setIsManagingCategories] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState("")

    // Estados para el nuevo artículo
    const [isAddingPost, setIsAddingPost] = useState(false)
    const [postSaving, setPostSaving] = useState(false)
    const [newPost, setNewPost] = useState({
        title: "",
        excerpt: "",
        content: "",
        category: "",
        author: "",
        image: "",
        images: [] as string[]
    })

    useEffect(() => {
        setMounted(true)
        
        if (sessionStatus === "authenticated") {
            const user = session?.user as { role?: string }
            if (user?.role === "admin" || user?.role === "bloguer") {
                setIsBlogger(true)
            } else {
                router.push("/")
            }
        } else if (sessionStatus === "unauthenticated") {
            router.push("/login")
        }

        const fetchInitialData = async () => {
            try {
                // Fetch Posts
                const postsRes = await fetch("/api/blog")
                if (postsRes.ok) {
                    const postsData = await postsRes.json()
                    setPosts(postsData)
                }

                // Fetch Categories
                const catRes = await fetch("/api/blog/categories")
                if (catRes.ok) {
                    const catData = await catRes.json()
                    setDbCategories(catData)
                    if (catData.length > 0) {
                        setNewPost(prev => ({ ...prev, category: catData[0].nombre }))
                    }
                }
            } catch (error) {
                console.error("Error fetching initial admin data:", error)
                toast.error("Error al cargar datos")
            } finally {
                setLoading(false)
            }
        }
        
        if (sessionStatus === "authenticated") {
            fetchInitialData()
        }
    }, [router, sessionStatus, session])

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return
        
        if (categories.includes(newCategoryName.trim())) {
            toast.error(`La categoría "${newCategoryName.trim()}" ya existe`)
            return
        }

        try {
            const res = await fetch("/api/blog/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre: newCategoryName.trim() })
            })

            if (res.ok) {
                const newCat = await res.json()
                setDbCategories([...dbCategories, newCat])
                setNewCategoryName("")
                toast.success(`Categoría "${newCat.nombre}" agregada`, {
                    icon: <CheckCircle2 className="w-5 h-5 text-green-500" />
                })
            } else {
                toast.error("Error al crear la categoría")
            }
        } catch (error) {
            console.error("Add category error:", error)
            toast.error("Error de conexión")
        }
    }

    const handleDeleteCategory = (catId: string, catNombre: string) => {
        toast('Confirmar eliminación', {
            description: `¿Estás seguro de que deseas eliminar la categoría "${catNombre}"?`,
            action: {
                label: 'Eliminar',
                onClick: async () => {
                    try {
                        const res = await fetch(`/api/blog/categories/${catId}`, { method: "DELETE" })
                        if (res.ok) {
                            setDbCategories(dbCategories.filter(c => c.id !== catId))
                            if (selectedCategory === catNombre) {
                                setSelectedCategory("Todos")
                            }
                            toast.success(`Categoría "${catNombre}" eliminada`, {
                                icon: <Trash2 className="w-5 h-5 text-red-500" />,
                                style: { borderColor: '#ef4444' }
                            })
                        } else {
                            toast.error("Error al eliminar")
                        }
                    } catch (error) {
                        console.error("Delete category error:", error)
                        toast.error("Error de conexión")
                    }
                }
            },
            cancel: {
                label: 'Cancelar',
                onClick: () => { }
            },
            style: {
                background: '#EDE986',
                borderColor: '#000000'
            }
        });
    }

    const handleLogout = async () => {
        await signOut({ redirect: false })
        window.location.href = "/"
    }

    if (!mounted) {
        return <div className="min-h-screen bg-white flex items-center justify-center font-heading text-xl">Verificando acceso...</div>
    }

    if (!isBlogger) {
        return <div className="min-h-screen bg-white flex items-center justify-center font-heading text-xl">Acceso denegado</div>
    }

    const filteredPosts = posts.filter(post => {
        const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) || post.category.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = selectedCategory === "Todos" || post.category === selectedCategory

        return matchesSearch && matchesCategory;
    })

    const handleDelete = (id: string | number) => {
        toast('Confirmar eliminación', {
            description: "¿Estás seguro de que deseas eliminar este artículo?",
            action: {
                label: 'Eliminar',
                onClick: async () => {
                    try {
                        const res = await fetch(`/api/blog/${id}`, { method: "DELETE" })
                        if (res.ok) {
                            setPosts(posts.filter(post => post.id !== id))
                            toast.success("Artículo eliminado con éxito")
                        } else {
                            toast.error("Error al eliminar el artículo")
                        }
                    } catch (error) {
                        console.error("Delete error:", error)
                        toast.error("Error de conexión")
                    }
                }
            },
            cancel: {
                label: 'Cancelar',
                onClick: () => { }
            },
            style: {
                background: '#EDE986',
                borderColor: '#000000'
            }
        });
    }

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault()
        if (postSaving) return
        setPostSaving(true)
        try {
            const method = editingPostId !== null ? "PUT" : "POST"
            const url = editingPostId !== null ? `/api/blog/${editingPostId}` : "/api/blog"

            const postData = {
                title: newPost.title,
                excerpt: newPost.excerpt,
                content: newPost.content,
                category: newPost.category,
                image: newPost.image || "/placeholder.svg",
                images: newPost.images
            }

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(postData)
            })

            if (res.ok) {
                const savedPost = await res.json()
                if (editingPostId !== null) {
                    setPosts(posts.map(p => p.id === editingPostId ? savedPost : p))
                    toast.success("Artículo actualizado exitosamente")
                } else {
                    setPosts([savedPost, ...posts])
                    toast.success("Artículo creado exitosamente")
                }

                setNewPost({
                    title: "",
                    excerpt: "",
                    content: "",
                    category: categories.length > 1 ? categories[1] : categories[0],
                    author: "",
                    image: "",
                    images: []
                })
                setIsAddingPost(false)
                setEditingPostId(null)
            } else {
                toast.error("Error al guardar el artículo")
            }
        } catch (error) {
            console.error("Save error:", error)
            toast.error("Error de conexión")
        } finally {
            setPostSaving(false)
        }
    }

    const handleEditClick = (post: BlogPost) => {
        setNewPost({
            title: post.title,
            excerpt: post.excerpt,
            content: post.content || "",
            category: post.category,
            author: post.author,
            image: post.image || "",
            images: post.images || []
        })
        setEditingPostId(post.id)
        setIsAddingPost(true)
    }



    const removePostImage = (urlToRemove: string) => {
        setNewPost(prev => {
            const updatedImages = prev.images.filter(url => url !== urlToRemove);
            return {
                ...prev,
                images: updatedImages,
                // Si borramos la portada, ponemos la siguiente o vacío
                image: prev.image === urlToRemove ? (updatedImages[0] || "") : prev.image
            }
        });
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length > 0) {
            // Filtrar archivos inválidos usando la utilidad
            const validFiles = files.filter(file => validateUpload(file))
            if (validFiles.length === 0) return

            // Límite total de imágenes (sumando las ya subidas)
            const totalPlanned = newPost.images.length + validFiles.length;
            if (totalPlanned > 6) {
                toast.error("Máximo 6 imágenes permitidas por artículo.", {
                    style: { borderColor: '#ef4444' }
                })
                return;
            }

            const uploadFiles = async () => {
                const uploadedUrls: string[] = [...newPost.images];
                
                for (const file of validFiles) {

                    try {
                        const formData = new FormData();
                        formData.append('file', file);

                        const response = await fetch('/api/upload', {
                            method: 'POST',
                            body: formData,
                        });

                        if (!response.ok) throw new Error('Error al subir');

                        const data = await response.json();
                        if (data.secure_url) {
                            uploadedUrls.push(data.secure_url);
                        }
                    } catch (error) {
                        console.error("Error al subir imagen:", error)
                        toast.error(`Error al subir ${file.name}`)
                    }
                }

                if (uploadedUrls.length > 0) {
                    setNewPost(prev => ({
                        ...prev,
                        image: uploadedUrls[0], // La primera siempre es la principal por defecto
                        images: uploadedUrls
                    }))
                }
            }

            toast.promise(uploadFiles(), {
                loading: 'Subiendo imágenes a la nube...',
                success: 'Galería actualizada con éxito',
                error: 'Hubo un error al subir las imágenes',
            })
        }
    }

    return (
        <div className="min-h-screen bg-white font-body">
            {/* Header Navigation */}
            <header className="sticky top-0 z-50 border-b-[3px] border-[#000000] bg-white">
                <div className="container mx-auto flex min-h-[4.25rem] flex-col gap-3 px-3 py-3 sm:h-20 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-0">
                    <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 shrink-0 rounded-full border-[2px] border-[#000000] bg-[#EDE986] text-[#000000] transition-colors hover:bg-[#000000] hover:text-[#EDE986]"
                            asChild
                        >
                            <Link href="/">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <div className="flex items-center gap-2 transition-transform max-md:gap-1 max-md:hover:scale-100 md:gap-4 hover:scale-105">
                            <div className="relative z-10 -mr-1.5 flex shrink-0 -rotate-6 items-center md:-mr-6">
                                <span className="relative z-10 -mr-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full border-[2px] border-[#000000] bg-[#E7BEF8] shadow-[2px_2px_0px_0px_#000000] md:h-8 md:w-8 md:-mr-2">
                                    <PawPrint className="h-3 w-3 text-white md:h-4 md:w-4" strokeWidth={2.8} />
                                </span>
                                <div className="rounded-xl border-[3px] border-[#000000] bg-[#EDE986] px-2 py-1 shadow-[3px_3px_0px_0px_#000000] md:px-4">
                                    <span className="select-none text-[10px] font-black tracking-wide text-[#000000] md:text-xl md:tracking-wider uppercase">BLOG ADMIN</span>
                                </div>
                            </div>
                            <div className="relative -ml-1 translate-y-1 max-md:max-w-[11.25rem] md:-ml-5 md:translate-y-2 brightness-0">
                                <LogoHorizontal size="md" className="origin-left max-md:scale-[0.88] md:scale-125 scale-110" />
                            </div>
                        </div>
                    </div>

                    <div className="flex w-full shrink-0 flex-wrap items-stretch justify-end gap-2 sm:w-auto sm:items-center">
                        <Button
                            onClick={() => {
                                setNewPost({
                                    title: "",
                                    excerpt: "",
                                    content: "",
                                    category: categories.length > 1 ? categories[1] : categories[0],
                                    author: "",
                                    image: "",
                                    images: []
                                })
                                setEditingPostId(null)
                                setIsAddingPost(true)
                            }}
                            variant="outline"
                            className="box-border min-h-10 flex-1 border-[2px] border-[#000000] bg-[#e7bef8] px-3 py-2 text-sm font-bold text-[#000000] shadow-[2px_2px_0px_0px_#000000] transition-all hover:bg-[#d94884] hover:shadow-[2px_2px_0px_0px_#000000] sm:flex-initial sm:px-4"
                        >
                            <Plus className="mr-2 h-4 w-4 shrink-0" />
                            Nuevo Artículo
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleLogout}
                            className="box-border min-h-10 flex-1 border-[2px] border-[#000000] bg-[#EDE986] px-3 py-2 text-sm font-bold text-[#000000] shadow-[2px_2px_0px_0px_#000000] transition-all hover:bg-[#e0dc7a] sm:flex-initial sm:px-4"
                        >
                            Cerrar Sesión
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

                {/* Categorías */}
                <div className="flex flex-nowrap overflow-x-auto gap-3 mb-10 pb-4 scrollbar-hide items-center">
                    {categories.map((category) => (
                        <Button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            variant={selectedCategory === category ? "default" : "outline"}
                            className={`whitespace-nowrap px-6 rounded-full border-[2px] border-[#000000] font-bold transition-all shadow-sm ${selectedCategory === category
                                ? "bg-[#e7bef8] hover:bg-[#d94884] text-[#000000] shadow-[3px_3px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px]"
                                : "bg-white text-[#000000] hover:bg-[#E7BEF8] shadow-[2px_2px_0px_0px_#000000]/50 hover:shadow-[3px_3px_0px_0px_#000000]"
                                }`}
                        >
                            {category}
                        </Button>
                    ))}
                    <Button
                        onClick={() => setIsManagingCategories(true)}
                        variant="outline"
                        className="whitespace-nowrap px-4 py-2 rounded-full border-[2px] border-[#000000] font-bold transition-all shadow-[2px_2px_0px_0px_#000000]/50 hover:shadow-[3px_3px_0px_0px_#000000] bg-[#93ABD9] hover:bg-[#7f9dca] text-[#000000] flex items-center h-full"
                    >
                        <Tag className="w-4 h-4 mr-2" />
                        Gestionar
                    </Button>
                </div>

                <div className="mb-8 p-4 bg-[#E7BEF8] border-[3px] border-[#000000] rounded-2xl shadow-[4px_4px_0px_0px_#000000] flex items-center gap-4">
                    <div className="p-3 bg-white border-[2px] border-[#000000] rounded-full">
                        <Settings className="w-6 h-6 text-[#000000]" />
                    </div>
                    <div>
                        <h3 className="font-black text-[#000000] font-heading text-xl">Panel de Administrador de Blog</h3>
                        <p className="text-[#000000]/80 font-bold text-sm">Has iniciado sesión con permisos para gestionar los artículos.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {loading ? (
                        <div className="col-span-full py-20 text-center uppercase tracking-widest font-heading">
                            <h3 className="text-2xl font-black text-[#000000] animate-pulse">Cargando los Blogs...</h3>
                        </div>
                    ) : filteredPosts.length > 0 ? filteredPosts.map((post) => (
                        <Card key={post.id} className="flex flex-col overflow-hidden rounded-3xl border-[3px] border-[#000000] bg-white p-0 shadow-[6px_6px_0px_0px_#000000] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[2px_2px_0px_0px_#000000]">
                            <div className="relative aspect-video w-full overflow-hidden bg-muted border-b-[3px] border-[#000000]">
                                <NextImage
                                    src={post.image || "/placeholder.svg"}
                                    alt={post.title}
                                    fill
                                    className="object-cover object-center"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    unoptimized
                                />
                                <Badge className="absolute top-4 right-4 bg-[#E7BEF8] text-[#000000] border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000] font-bold">
                                    {post.category}
                                </Badge>
                            </div>
                            <CardHeader className="flex-1 pt-5 pb-4">
                                <CardTitle className="text-xl font-black font-heading text-[#000000] line-clamp-2 mb-1">
                                    {post.title}
                                </CardTitle>
                                {post.excerpt && (
                                    <p className="text-sm font-bold text-[#000000]/60 line-clamp-2 mb-3 italic">
                                        &quot;{post.excerpt}&quot;
                                    </p>
                                )}
                                <div className="flex flex-wrap gap-4 text-xs font-bold text-[#000000]/70">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>{formatDate(post.date)}</span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardFooter className="mt-auto flex gap-2 pt-5 pb-6">
                                <Button onClick={() => setSelectedPost(post)} className="flex-1 border-[3px] border-[#000000] bg-[#e7bef8] font-black text-[#000000] shadow-[4px_4px_0px_0px_#000000] hover:bg-[#EDE986] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000000] transition-all">
                                    Leer Más
                                </Button>

                                <>
                                    <Button onClick={() => handleEditClick(post)} variant="outline" size="icon" className="border-[3px] border-[#000000] bg-[#e7bef8] hover:bg-[#EDE986] text-[#000000] shadow-[4px_4px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000000] transition-all">
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" onClick={() => handleDelete(post.id)} className="border-[3px] border-[#000000] bg-[#e7bef8] hover:bg-red-400 hover:text-white text-[#000000] shadow-[4px_4px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000000] transition-all">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </>
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

            {/* Modal para Crear Nuevo Artículo */}
            {isAddingPost && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
                    <div
                        className="absolute inset-0 bg-[#000000]/60 backdrop-blur-sm"
                        onClick={() => setIsAddingPost(false)}
                    />
                    <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#EDE986] border-[4px] border-[#000000] shadow-[12px_12px_0px_0px_#000000] rounded-3xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="border-b-[4px] border-[#000000] p-4 md:p-6 bg-[#93ABD9] flex justify-between items-center shrink-0">
                            <h2 className="text-2xl md:text-3xl font-black font-heading text-[#000000]">
                                {editingPostId !== null ? "Editar Artículo" : "Crear Nuevo Artículo"}
                            </h2>
                            <Button
                                variant="outline"
                                size="icon"
                                className="w-10 h-10 border-[2px] border-[#000000] bg-[#EDE986] hover:bg-[#e0dc7a] text-[#000000] rounded-full shadow-[2px_2px_0px_0px_#000000] flex-shrink-0"
                                onClick={() => { setIsAddingPost(false); setEditingPostId(null); }}
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        <div className="overflow-y-auto p-6 md:p-8 flex-1 bg-white">
                            <form id="create-post-form" onSubmit={handleCreatePost} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-[#000000] ml-1">Título del Artículo *</label>
                                    <Input
                                        required
                                        placeholder="Ej: Nuevas medidas de cuidado capilar..."
                                        value={newPost.title}
                                        onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                                        className="rounded-xl border-[2px] border-[#000000] h-12 shadow-[2px_2px_0px_0px_#000000]/20 focus-visible:ring-0 focus-visible:border-[#000000] focus-visible:shadow-[3px_3px_0px_0px_#000000] transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-[#000000] ml-1">Resumen del Artículo (Opcional)</label>
                                    <Input
                                        placeholder="Ej: Noticias importantes para tu mascota..."
                                        value={newPost.excerpt}
                                        onChange={(e) => setNewPost({ ...newPost, excerpt: e.target.value })}
                                        className="rounded-xl border-[2px] border-[#000000] h-12 shadow-[2px_2px_0px_0px_#000000]/20 focus-visible:ring-0 focus-visible:border-[#000000] focus-visible:shadow-[3px_3px_0px_0px_#000000] transition-all"
                                    />
                                    <p className="text-[10px] font-bold text-[#000000]/40 ml-1 uppercase tracking-tight italic">Este texto aparecerá resaltado entre comillas al inicio de la noticia.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-[#000000] ml-1">Contenido de la Noticia *</label>
                                    <RichTextEditor 
                                        content={newPost.content}
                                        onChange={(html) => setNewPost({ ...newPost, content: html })}
                                        placeholder="Escribe el artículo completo aquí..."
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[#000000] ml-1">Categoría *</label>
                                        <select
                                            className="w-full rounded-xl border-[2px] border-[#000000] h-12 px-4 text-sm bg-white shadow-[2px_2px_0px_0px_#000000]/20 focus:outline-none focus:ring-0 focus:border-[#000000] focus:shadow-[3px_3px_0px_0px_#000000] transition-all cursor-pointer font-medium"
                                            value={newPost.category}
                                            onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                                        >
                                            {categories.filter(c => c !== "Todos").map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-bold text-[#000000] ml-1">Galería de Imágenes</label>
                                        <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">{newPost.images.length}/6 FOTOS</span>
                                    </div>
                                    <div className="relative">
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleImageUpload}
                                            disabled={newPost.images.length >= 6}
                                            className="rounded-xl border-[2px] border-[#000000] h-12 shadow-[2px_2px_0px_0px_#000000]/20 focus-visible:ring-0 focus-visible:border-[#000000] focus-visible:shadow-[3px_3px_0px_0px_#000000] transition-all file:bg-[#e7bef8] file:text-[#000000] file:border-0 file:rounded-full file:px-4 file:py-1 file:mr-4 file:font-bold hover:file:bg-[#d94884] file:transition-colors file:cursor-pointer pb-2 pt-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                    <p className="text-xs font-bold text-[#000000]/60 ml-2 italic">Solo la primera imagen se usará como portada principal.</p>

                                    {newPost.images.length > 0 && (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                                            {newPost.images.map((img, idx) => (
                                                <div 
                                                    key={idx} 
                                                    className={`relative aspect-square rounded-2xl border-[3px] overflow-hidden group transition-all animate-in zoom-in-50 ${idx === 0 ? "border-[#e7bef8] shadow-[4px_4px_0px_0px_#e7bef8]/20" : "border-[#000000] shadow-[3px_3px_0px_0px_#000000]/10"}`}
                                                >
                                                    <NextImage 
                                                        src={img} 
                                                        alt={`Preview ${idx}`} 
                                                        fill 
                                                        className="object-cover" 
                                                        unoptimized 
                                                    />
                                                    {idx === 0 && (
                                                        <div className="absolute top-2 left-2 bg-[#e7bef8] text-[#000000] text-[8px] font-black px-2 py-0.5 rounded-full border border-[#000000] shadow-sm uppercase">
                                                            Portada
                                                        </div>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => removePostImage(img)}
                                                        className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white"
                                                    >
                                                        <Trash2 className="w-6 h-6 drop-shadow-lg" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>

                        <div className="border-t-[4px] border-[#000000] p-4 md:p-6 bg-[#EDE986] flex justify-end gap-4 shrink-0">
                            <Button
                                variant="outline"
                                disabled={postSaving}
                                onClick={() => { setIsAddingPost(false); setEditingPostId(null); }}
                                className="border-[2px] border-[#000000] bg-white hover:bg-gray-100 text-[#000000] font-bold shadow-[2px_2px_0px_0px_#000000] disabled:opacity-60"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                form="create-post-form"
                                disabled={postSaving}
                                className="border-[2px] border-[#000000] bg-[#e7bef8] hover:bg-[#d94884] text-[#000000] font-bold shadow-[4px_4px_0px_0px_#000000] hover:shadow-[2px_2px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-60"
                            >
                                {postSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Guardando…
                                    </>
                                ) : editingPostId !== null ? (
                                    "Actualizar Artículo"
                                ) : (
                                    "Guardar Artículo"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal / Panel estilo periódico para Leer Más */}
            {selectedPost && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
                    <div
                        className="absolute inset-0 bg-[#000000]/60 backdrop-blur-sm"
                        onClick={() => setSelectedPost(null)}
                    />
                    <div className="relative w-full max-w-5xl max-h-[90vh] bg-white border-[4px] border-[#000000] shadow-[12px_12px_0px_0px_#000000] rounded-3xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        {/* Cabecera del periódico */}
                        <div className="border-b-[4px] border-[#000000] p-4 md:p-6 bg-white flex justify-between items-center shrink-0">
                            <div className="w-10 md:w-12"></div>
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
                        <div className="overflow-y-auto p-6 md:p-10 hide-scrollbar bg-white flex-1">
                            <div className="max-w-4xl mx-auto space-y-8 md:space-y-10">
                                {/* Título de la noticia */}
                                <div className="space-y-6 text-center border-b-[4px] border-[#000000] pb-8 md:pb-10">
                                    <Badge className="bg-[#E7BEF8] text-[#000000] border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000] font-bold text-sm md:text-base px-6 py-1.5 mb-2">
                                        {selectedPost.category}
                                    </Badge>
                                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black font-heading text-[#000000] leading-[1.1]">
                                        {selectedPost.title}
                                    </h1>
                                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 pt-4 font-bold text-[#000000]/80 text-sm md:text-base uppercase tracking-wider">
                                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                                            <Calendar className="w-4 h-4" />
                                            {formatDate(selectedPost.date)}
                                        </div>
                                        <div className="flex items-center gap-2 bg-[#E7BEF8] px-4 py-2 rounded-full border-[2px] border-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                                            <span className="text-xs">POR:</span> {selectedPost.author.toUpperCase()}
                                        </div>
                                    </div>
                                </div>

                                {/* Imagen principal / Carrusel */}
                                {selectedPost.images && selectedPost.images.length > 0 ? (
                                    <AutoCarousel images={selectedPost.images} title={selectedPost.title} />
                                ) : (
                                    <div className="group relative h-[350px] w-full overflow-hidden rounded-2xl border-[4px] border-[#000000] bg-muted shadow-[8px_8px_0px_0px_#000000] md:h-[500px]">
                                        <div className="pointer-events-none absolute inset-0 z-10 bg-[#000000]/10 transition-all group-hover:bg-transparent" />
                                        <NextImage
                                            src={selectedPost.image || "/placeholder.svg"}
                                            alt={selectedPost.title}
                                            fill
                                            className="object-cover object-center sepia-[30%] contrast-125 transition-all duration-500 group-hover:sepia-0"
                                            sizes="(max-width: 1024px) 100vw, 80vw"
                                            unoptimized
                                        />
                                        <div className="absolute bottom-0 right-0 bg-white border-t-[4px] border-l-[4px] border-[#000000] px-4 py-2 font-bold font-heading text-xs tracking-wider uppercase z-20">
                                            FOTO EXCLUSIVA
                                        </div>
                                    </div>
                                )}

                                {/* Destacado corto */}
                                {selectedPost.excerpt && selectedPost.excerpt.trim() !== "" && (
                                    <div className="bg-white p-6 border-[3px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] rounded-xl transform -rotate-1">
                                        <p className="text-xl md:text-2xl font-black font-heading mb-0 text-center text-[#000000]">
                                            &quot;{selectedPost.excerpt}&quot;
                                        </p>
                                    </div>
                                )}

                                {/* Contenido: mismas clases que /blog/[id] (vista previa = artículo publicado) */}
                                <div className="max-w-none text-justify">
                                    {selectedPost.content ? (
                                        <div
                                            dangerouslySetInnerHTML={{ __html: selectedPost.content }}
                                            className="blog-content-inner prose prose-lg max-w-none text-[#000000]/90 prose-headings:font-heading prose-headings:font-black prose-headings:text-[#000000] prose-p:font-medium prose-p:text-[#000000]/80 prose-a:text-[#000000] prose-a:font-bold hover:prose-a:text-[#e7bef8] prose-strong:text-[#000000] prose-strong:font-black editorial-dropcap"
                                        />
                                    ) : (
                                        <>
                                            <p>
                                                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                                            </p>
                                            <p>
                                                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                                            </p>
                                        </>
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

            {/* Modal para Gestionar Categorías */}
            {isManagingCategories && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
                    <div
                        className="absolute inset-0 bg-[#000000]/60 backdrop-blur-sm"
                        onClick={() => setIsManagingCategories(false)}
                    />
                    <div className="relative w-full max-w-md bg-[#EDE986] border-[4px] border-[#000000] shadow-[12px_12px_0px_0px_#000000] rounded-3xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="border-b-[4px] border-[#000000] p-4 bg-[#93ABD9] flex justify-between items-center shrink-0">
                            <h2 className="text-xl font-black font-heading text-[#000000]">
                                Gestionar Categorías
                            </h2>
                            <Button
                                variant="outline"
                                size="icon"
                                className="w-8 h-8 border-[2px] border-[#000000] bg-[#EDE986] hover:bg-[#e0dc7a] text-[#000000] rounded-full shadow-[2px_2px_0px_0px_#000000] flex-shrink-0"
                                onClick={() => setIsManagingCategories(false)}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="p-6 bg-white flex-1">
                            <div className="flex gap-2 mb-6">
                                <Input
                                    placeholder="Nueva categoría..."
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    className="flex-1 rounded-xl border-[2px] border-[#000000] h-10 shadow-[2px_2px_0px_0px_#000000]/20 focus-visible:ring-0 focus-visible:border-[#000000]"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                                />
                                <Button
                                    onClick={handleAddCategory}
                                    className="border-[2px] border-[#000000] bg-[#e7bef8] hover:bg-[#d94884] text-[#000000] font-bold shadow-[2px_2px_0px_0px_#000000] transition-all"
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                                {dbCategories.map(cat => (
                                    <div key={cat.id} className="flex justify-between items-center p-3 border-[2px] border-[#000000] rounded-xl shadow-[2px_2px_0px_0px_#000000]/20 bg-[#EDE986]">
                                        <span className="font-bold text-[#000000]">{cat.nombre}</span>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleDeleteCategory(cat.id, cat.nombre)}
                                            className="w-8 h-8 border-[2px] border-[#000000] bg-white hover:bg-red-400 text-[#000000] hover:text-white transition-all shadow-sm"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                                {dbCategories.length === 0 && (
                                    <p className="text-center text-sm font-bold text-[#000000]/60 py-4 italic">No hay categorías personalizadas</p>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    )
}
