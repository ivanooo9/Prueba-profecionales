"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { Heart, MapPin, ShieldCheck, Activity, Home, Info, Bone } from "lucide-react"
import Image from "next/image"
import { HomeMobileCarousel, HomeMobileCarouselSlide } from "@/components/home-mobile-carousel"


interface AdoptionPet {
  id: string
  name: string
  age: string
  breed: string
  size: string
  gender: string
  description: string
  image: string
  vaccinated: boolean
  sterilized: boolean
  recommendedHome: string
}

interface ShelterPetRaw {
  id: string
  nombre: string
  edad: string
  raza: string
  peso: string
  sexo: string
  descripcion: string
  foto?: string
  estado: string
  vacunado?: boolean
  esterilizado?: boolean
  hogarRecomendado?: string
}

function AdoptionPetCard({ dog, index }: { dog: AdoptionPet; index: number }) {
  return (
    <Card
      className="group relative flex w-full max-w-[18.5rem] flex-col overflow-hidden rounded-[3rem] border-[3px] border-[#000000] bg-[#e7bef8] text-[#000000] shadow-[12px_12px_0px_0px_#000000] transition-all duration-500 hover:-translate-y-2 hover:shadow-[16px_16px_0px_0px_#000000]"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex-shrink-0 p-2.5">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[2.2rem] bg-[#e7bef8] shadow-inner transition-transform duration-700 group-hover:scale-[1.02]">
          <Image
            src={dog.image || "/placeholder.svg?height=400&width=400"}
            alt={dog.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
          <div className="absolute right-2.5 top-2.5 flex flex-col gap-1">
            {dog.vaccinated && (
              <Badge className="flex items-center gap-1 rounded-full border-[3px] border-[#000000] bg-[#EDE986] px-2 py-0.5 text-[8px] font-black uppercase text-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                <ShieldCheck className="h-2 w-2" />
                Salud 100%
              </Badge>
            )}
            {dog.sterilized && (
              <Badge className="flex items-center gap-1 rounded-full border-[3px] border-[#000000] bg-[#E7BEF8] px-2 py-0.5 text-[8px] font-black uppercase text-[#000000] shadow-[2px_2px_0px_0px_#000000]">
                <Activity className="h-2 w-2" />
                Listo
              </Badge>
            )}
          </div>
        </div>
      </div>

      <CardHeader className="flex-grow-0 space-y-1 px-4 pt-2">
        <div className="flex items-center justify-between">
          <span className="wrap-break-word text-[8px] font-black uppercase leading-relaxed tracking-[0.2em] text-[#000000]">
            {dog.breed}
          </span>
        </div>
        <CardTitle className="flex items-center wrap-break-word text-xl font-black leading-tight tracking-tight text-[#000000]">
          {dog.name}
        </CardTitle>

        <div className="-mt-0.5 flex flex-wrap gap-2.5 pt-0 text-[#000000]">
          <div className="flex items-center gap-1.5 text-[9px] font-black">
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-[3px] border-[#000000] bg-white text-[#4A4A4A] shadow-[2px_2px_0px_0px_#000000]">
              <Bone className="h-3 w-3" strokeWidth={2.5} />
            </div>
            {dog.age}
          </div>
          <div className="flex min-w-0 items-center gap-1.5 text-[9px] font-black">
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-[3px] border-[#000000] bg-white text-[#4A4A4A] shadow-[2px_2px_0px_0px_#000000]">
              <Info className="h-3 w-3" strokeWidth={2.5} />
            </div>
            <span className="wrap-break-word">
              {dog.size} • {dog.gender}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-grow flex-col justify-end space-y-2 px-4 pb-4">
        <div className="flex-grow space-y-2">
          <div className="pt-1">
            <h4 className="mb-1.5 text-[9px] font-black uppercase tracking-[0.25em] text-[#000000]/40">Sobre {dog.name}</h4>
            <p className="line-clamp-3 wrap-break-word text-xs font-bold leading-relaxed text-[#000000]">
              {dog.description}
            </p>
          </div>

          <div className="space-y-1.5 rounded-[1.25rem] border-[3px] border-[#000000] bg-white/90 p-3 shadow-[4px_4px_0px_0px_#000000]">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#000000]">
              <div className="flex h-4 w-4 items-center justify-center rounded-md border-[2px] border-[#000000] bg-[#EDE986] text-[#000000] shadow-[1px_1px_0px_0px_#000000]">
                <Home className="h-2.5 w-2.5" strokeWidth={2.5} />
              </div>
              Mi Hogar Ideal
            </div>
            <p className="text-[10px] font-black leading-snug text-[#000000]">{dog.recommendedHome}</p>
          </div>
        </div>

        <div className="pt-1">
          <Button
            className="relative h-12 w-full overflow-hidden rounded-full border-[3px] border-[#000000] bg-[#e7bef8] p-0 text-[#000000] shadow-[4px_4px_0px_0px_#000000] transition-all duration-300 hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#EDE986] hover:shadow-[2px_2px_0px_0px_#000000] active:translate-y-[1px] active:shadow-none"
            asChild
          >
            <a href="/login?callbackUrl=/mi-mascota?tab=acogida" className="relative flex h-full w-full items-center justify-center gap-2 px-4">
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                className="shrink-0"
              >
                <Heart className="h-4 w-4 fill-[#000000] text-[#000000]" />
              </motion.div>
              <span className="wrap-break-word text-center text-base font-black leading-tight">
                ¡Adoptar a {dog.name}!
              </span>
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Adoption() {
  const [dogs, setDogs] = useState<AdoptionPet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPets = async () => {
      try {
        const res = await fetch("/api/shelter-pets")
        if (res.ok) {
          const data = await res.json()
          const mappedPets: AdoptionPet[] = data
            .filter((pet: ShelterPetRaw) => pet.estado === "disponible")
            .map((pet: ShelterPetRaw) => ({
              id: pet.id,
              name: pet.nombre,
              age: pet.edad,
              breed: pet.raza,
              size: pet.peso,
              gender: pet.sexo,
              description: pet.descripcion,
              image: pet.foto || "/placeholder.svg?height=400&width=400",
              vaccinated: !!pet.vacunado,
              sterilized: !!pet.esterilizado,
              recommendedHome: pet.hogarRecomendado || "Cualquier tipo de hogar amoroso",
            }))
          setDogs(mappedPets.slice(0, 4)) // Mostrar los 4 más recientes disponibles
        }
      } catch (error) {
        console.error("Error fetching shelter pets:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchPets()
  }, [])
  return (
    <section id="adopcion" className="relative py-12 md:py-16">
      <div className="container mx-auto px-4 relative z-10 max-w-7xl">
        <div className="mb-8 animate-fade-in-up space-y-3 text-center md:mb-10 md:space-y-4">
          <div className="inline-block">
            <span className="section-title-pill section-title-pill-pink">
              ENCUENTRA TU COMPAÑERO
            </span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-balance tracking-tight text-[#000000]">Centro de Acogida</h2>
          <p className="text-xl text-[#000000]/70 max-w-2xl mx-auto text-pretty leading-relaxed font-bold">
            Nuestros perritos están esperando encontrar un hogar lleno de amor
          </p>
          <div
            className="flex items-center justify-center gap-3 text-muted-foreground pt-4 animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            <MapPin className="w-5 h-5 text-primary" />
            <span className="font-medium">
              Centro de Acogida MIAUWUAUF - Abierto todos los días de 9:00 AM a 6:00 PM
            </span>
          </div>
        </div>
        <div className="mb-8 md:mb-10">
          {loading ? (
            <div className="py-10 text-center">
              <p className="animate-pulse font-bold text-muted-foreground">Cargando animales en adopción...</p>
            </div>
          ) : dogs.length > 0 ? (
            <>
              <HomeMobileCarousel itemCount={dogs.length}>
                {dogs.map((dog, index) => (
                  <HomeMobileCarouselSlide key={dog.id}>
                    <div className="mx-auto flex justify-center">
                      <AdoptionPetCard dog={dog} index={index} />
                    </div>
                  </HomeMobileCarouselSlide>
                ))}
              </HomeMobileCarousel>
              <div className="hidden flex-wrap justify-center gap-6 md:flex">
                {dogs.map((dog, index) => (
                  <AdoptionPetCard key={dog.id} dog={dog} index={index} />
                ))}
              </div>
            </>
          ) : (
            <div className="py-10 text-center">
              <p className="font-bold text-muted-foreground">No hay mascotas disponibles para adopción en este momento.</p>
            </div>
          )}
        </div>
        <div className="text-center mt-12 animate-fade-in-up" style={{ animationDelay: "0.6s" }}>
          <Button
            size="lg"
            className="rounded-full border-[3px] border-[#000000] bg-[#e7bef8] px-12 py-10 font-heading text-2xl font-black text-[#000000] shadow-[6px_6px_0px_0px_#000000] transition-all duration-300 hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#EDE986] hover:shadow-[3px_3px_0px_0px_#000000] active:translate-y-[1px] active:shadow-none"
            asChild
          >
            <a href="/login">Ver Todas las Mascotas</a>
          </Button>
        </div>
      </div>
    </section>
  )
}
