"use client"

import React from "react"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { 
  MapPin, Syringe, CheckCircle, Info 
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MascotaUsuario, Vacuna, TabType } from "../types"
import { formatDate } from "@/lib/utils"

interface ProfileSectionProps {
  mascota: MascotaUsuario
  misMascotas: MascotaUsuario[]
  onSelectMascota: (mascota: MascotaUsuario) => void
  vacunaciones?: Vacuna[]
  setActiveTab: (tab: TabType) => void
}

export const ProfileSection = ({ 
  mascota, 
  misMascotas, 
  onSelectMascota,
  vacunaciones = [],
  setActiveTab
}: ProfileSectionProps) => {
  const { data: session } = useSession()
  if (!mascota) return null

  const greetingName = session?.user?.name || mascota.nombre
  const canSwitchPets = misMascotas.length > 1

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Banner de Cumpleaños */}
      {mascota.fechaNacimiento && (() => {
        const hoy = new Date()
        const cumple = new Date(mascota.fechaNacimiento)
        const esCumple = hoy.getDate() === cumple.getUTCDate() && hoy.getMonth() === cumple.getUTCMonth()

        if (esCumple) {
          return (
            <div className="relative overflow-hidden rounded-lg bg-linear-to-r from-amber-100 to-orange-100 border border-amber-200 shadow-sm p-6 mb-6">
              <div className="relative z-10 flex flex-col items-center justify-center text-center gap-2">
                <h3 className="text-2xl font-bold text-amber-600 flex items-center gap-2">
                  ¡Feliz Cumpleaños, {mascota.nombre}!
                </h3>
                <p className="text-amber-700/80 font-medium">
                  ¡Esperamos que pases un día increíble lleno de premios y caricias!
                </p>
              </div>
              <div className="absolute top-0 right-0 -mt-2 -mr-2 text-6xl opacity-10 rotate-12"></div>
              <div className="absolute bottom-0 left-0 -mb-2 -ml-2 text-6xl opacity-10 -rotate-12"></div>
            </div>
          )
        }
        return null
      })()}

      <div className="min-w-0">
        <h2 className="text-3xl font-bold leading-tight wrap-break-word">Hola, {greetingName} </h2>
        <p className="text-muted-foreground">Aquí tienes un resumen del estado de tu mascota.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Widget Vacunas */}
        <Card 
          className="border shadow-lg hover:shadow-xl transition-shadow cursor-pointer bg-card overflow-hidden"
          onClick={() => setActiveTab("vacunacion")}
        >
          <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-6">
            {(() => {
              const activeId = mascota?.id ? String(mascota.id) : ""
              const activeName = (mascota?.nombre || "").toLowerCase().trim()
              const petVacunas = (vacunaciones || []).filter(v => {
                if (!v) return false
                const vPetId = v.petId ? String(v.petId) : null
                const vMascota = v.mascota ? v.mascota.toLowerCase().trim() : null
                return (activeId && vPetId === activeId) || (activeName && vMascota === activeName)
              })
              const hasRecent = petVacunas.length > 0
              return (
                <>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold">
                      <Syringe className="h-5 w-5 text-[#000000]" />
                      <span className="text-xs font-black uppercase tracking-wide bg-[#ede986] text-[#000000] border border-[#000000]/20 rounded-full px-2 py-0.5">Vacunacion</span>
                    </div>
                    <p className="text-2xl font-bold">{hasRecent ? "Al dia" : "No registrada"}</p>
                    <p className="text-xs text-muted-foreground">
                      {hasRecent ? `Última: ${formatDate(petVacunas[0].fecha)}` : "Registra su primera vacuna"}
                    </p>
                  </div>
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${hasRecent ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                    {hasRecent ? <CheckCircle className="h-6 w-6" /> : <Info className="h-6 w-6" />}
                  </div>
                </>
              )
            })()}
          </div>
        </Card>
      </div>

      {/* Selector solo cuando hay más de una mascota */}
      {canSwitchPets && (
        <div className="mt-8">
          <h3 className="font-bold mb-4">Cambiar de Mascota</h3>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {misMascotas.map(pet => (
              <button 
                key={pet.id}
                onClick={() => onSelectMascota(pet)}
                className={`shrink-0 flex items-center gap-3 p-2 pr-6 rounded-lg transition-all border ${
                  mascota.id === pet.id 
                    ? "bg-primary/10 border-primary shadow-sm" 
                    : "bg-card border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <div className="h-10 w-10 rounded-lg overflow-hidden relative">
                  <Image src={pet.foto || "/placeholder.svg"} fill className="object-cover" alt={pet.nombre} />
                </div>
                <p className="font-bold text-sm">{pet.nombre}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
