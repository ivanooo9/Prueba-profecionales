"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Calendar } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { HomeMobileCarousel, HomeMobileCarouselSlide } from "@/components/home-mobile-carousel"

interface BlogPost {
    id: string
    slug?: string
    title: string
    excerpt: string
    author: string
    date: string
    category: string
    image?: string
}

function BlogPostCard({ post, index }: { post: BlogPost; index: number }) {
    return (
        <Card
            className="group flex animate-in fade-in slide-in-from-bottom-4 flex-col overflow-hidden rounded-[2rem] border-[3px] border-[#000000] bg-[#e7bef8] shadow-[8px_8px_0px_0px_#000000] transition-all duration-300 hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_#000000]"
            style={{ animationDelay: `${index * 0.1}s` }}
        >
            <div className="flex-shrink-0 p-4">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-muted shadow-sm md:aspect-video">
                    <Image
                        src={post.image || "/placeholder.svg?height=400&width=600"}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute right-3 top-3 z-10">
                        <Badge className="rounded-full border-[3px] border-[#000000] bg-[#EDE986] px-3 py-1 font-black uppercase tracking-widest text-[9px] text-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                            {post.category}
                        </Badge>
                    </div>
                </div>
            </div>
            <div className="flex flex-grow flex-col rounded-b-[1.75rem] bg-white px-8 pb-8 pt-10">
                <h3 className="mb-4 line-clamp-2 font-heading text-xl font-black leading-tight text-[#000000] md:text-2xl">
                    {post.title}
                </h3>

                <div className="mb-6 flex items-center gap-2 text-xs font-bold text-[#000000]/60">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(post.date)}</span>
                </div>

                <p className="mb-8 line-clamp-3 flex-grow text-sm font-bold leading-relaxed text-[#000000]/80">
                    {post.excerpt}
                </p>

                <Button
                    className="flex h-14 w-full flex-shrink-0 items-center justify-center gap-2 rounded-full border-[3px] border-[#000000] bg-[#e7bef8] px-8 text-base font-black text-[#000000] shadow-[4px_4px_0px_0px_#000000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#EDE986] hover:shadow-[2px_2px_0px_0px_#000000] active:translate-y-[1px] active:shadow-none"
                    asChild
                >
                    <Link href={`/blog/${post.slug || post.id}`}>
                        Leer Artículo
                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Link>
                </Button>
            </div>
        </Card>
    )
}

export default function BlogSection() {
    const [posts, setPosts] = useState<BlogPost[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const res = await fetch("/api/blog")
                if (res.ok) {
                    const data = await res.json()
                    // Filtrar mascotas adoptadas de la página principal
                    const activePosts = data.filter((post: BlogPost) => !post.title.startsWith("¡ADOPTADO:"))
                    // Mostrar solo los últimos 3 para el Home
                    setPosts(activePosts.slice(0, 3))
                }
            } catch (error) {
                console.error("Error fetching home blog posts:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchPosts()
    }, [])
    return (
        <section id="blog" className="relative py-12 md:py-16">
            <div className="container mx-auto px-4 relative z-10 max-w-7xl">
                
                {/* Header Section */}
                <div className="mb-8 animate-fade-in-up space-y-3 text-center md:mb-10 md:space-y-4">
                    <div className="inline-block">
                        <span className="section-title-pill section-title-pill-pink">
                            ÚLTIMAS NOTICIAS
                        </span>
                    </div>
                    <h2 className="text-3xl sm:text-5xl md:text-7xl font-black text-balance tracking-tight text-[#000000]">MIAUWUAUF TIMES</h2>
                    <p className="text-xl text-[#000000]/70 max-w-2xl mx-auto text-pretty leading-relaxed font-bold">
                        Historias, consejos y novedades
                    </p>
                </div>

                <div className="mb-8 md:mb-10">
                    {loading ? (
                        <div className="py-10 text-center">
                            <p className="animate-pulse font-bold text-[#000000]/60">Cargando noticias...</p>
                        </div>
                    ) : posts.length > 0 ? (
                        <>
                            <HomeMobileCarousel itemCount={posts.length}>
                                {posts.map((post, index) => (
                                    <HomeMobileCarouselSlide key={post.id}>
                                        <div className="mx-auto flex justify-center">
                                            <BlogPostCard post={post} index={index} />
                                        </div>
                                    </HomeMobileCarouselSlide>
                                ))}
                            </HomeMobileCarousel>
                            <div className="hidden grid-cols-1 gap-8 md:grid md:grid-cols-2 lg:grid-cols-3">
                                {posts.map((post, index) => (
                                    <BlogPostCard key={post.id} post={post} index={index} />
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="py-10 text-center">
                            <p className="font-bold text-muted-foreground">No hay noticias publicadas en este momento.</p>
                        </div>
                    )}
                </div>

                <div className="text-center mt-12 animate-fade-in-up" style={{ animationDelay: "0.6s" }}>
                    <Button
                        size="lg"
                        className="rounded-full border-[3px] border-[#000000] bg-[#e7bef8] px-12 py-10 font-heading text-2xl font-black text-[#000000] shadow-[6px_6px_0px_0px_#000000] transition-all duration-300 hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#EDE986] hover:shadow-[3px_3px_0px_0px_#000000] active:translate-y-[1px] active:shadow-none"
                        asChild
                    >
                        <Link href="/blog">Ver Todos los Artículos</Link>
                    </Button>
                </div>
            </div>
        </section>
    )
}
