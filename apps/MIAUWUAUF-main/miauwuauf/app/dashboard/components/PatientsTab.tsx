"use client"

import React from "react"
import Image from "next/image"
import { Search, User, Dog, ClipboardList, Zap } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { calcularEdad } from "@/lib/utils"

interface Patient {
  id: string | number
  nombre: string
  raza?: string
  edad?: string
  dueno?: string
  ultimaVisita?: string
  especie?: string
  tipo?: string
  fechaNacimiento?: string
  foto?: string
  imageUrl?: string
  image?: string
  user?: {
    name: string
    cedula?: string | null
  }
}

interface PatientsTabProps {
  patients: Patient[]
  searchTerm: string
  onSearchChange: (term: string) => void
  onAction: (petId: string, tab: string) => void
  onRegisterClick: () => void
  onCitaRapidaClick?: () => void
}

const OWNERS_PER_PAGE_OPTIONS = [4, 8, 12] as const

export const PatientsTab: React.FC<PatientsTabProps> = React.memo(({ 
  patients, 
  searchTerm, 
  onSearchChange, 
  onAction: _onAction,
  onRegisterClick,
  onCitaRapidaClick
}) => {
  const [page, setPage] = React.useState(1)
  const [ownersPerPage, setOwnersPerPage] = React.useState<(typeof OWNERS_PER_PAGE_OPTIONS)[number]>(4)
  const trimmed = searchTerm.trim()
  const q = trimmed.toLowerCase()
  const qDigits = trimmed.replace(/\D/g, "")

  const filteredPatients = React.useMemo(() => {
    return patients.filter((p) => {
      if (!trimmed) return true
      const ownerName = (p.user?.name || p.dueno || "").toLowerCase()
      const cedulaDigits = String(p.user?.cedula ?? "").replace(/\D/g, "")
      const matchPet = p.nombre.toLowerCase().includes(q)
      const matchOwner = ownerName.includes(q)
      const matchCedula = qDigits.length > 0 && cedulaDigits.includes(qDigits)
      return matchPet || matchOwner || matchCedula
    })
  }, [patients, trimmed, q, qDigits])

  const owners = React.useMemo(() => {
    const grouped = filteredPatients.reduce((acc, mascota) => {
      const dueno = mascota.user?.name || mascota.dueno || "Sin Dueño"
      if (!acc[dueno]) acc[dueno] = []
      acc[dueno].push(mascota)
      return acc
    }, {} as Record<string, Patient[]>)
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredPatients])
  const totalPages = Math.max(1, Math.ceil(owners.length / ownersPerPage))
  const currentPage = Math.min(page, totalPages)
  const pagedOwners = React.useMemo(
    () => owners.slice((currentPage - 1) * ownersPerPage, currentPage * ownersPerPage),
    [owners, currentPage, ownersPerPage]
  )

  const petPhotoSrc = (m: Patient) => m.foto || m.imageUrl || m.image || ""

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black font-heading">Pacientes Asignados</h2>
          <p className="font-bold text-foreground/80">Pacientes bajo tu cuidado agrupados por dueño</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
            <Input
              placeholder="Dueño, mascota o cédula..."
              value={searchTerm}
              onChange={(e) => {
                setPage(1)
                onSearchChange(e.target.value)
              }}
              className="pl-10 rounded-xl border-[3px] border-foreground h-12 bg-white font-bold shadow-[3px_3px_0px_0px_#000000] focus-visible:ring-[#000000]"
            />
          </div>
          <Button 
            onClick={onRegisterClick}
            className="flex h-12 items-center gap-2 rounded-xl border-[3px] border-foreground bg-[#E7BEF8] px-6 font-black text-[#000000] shadow-[4px_4px_0px_0px_#000000] transition-all hover:-translate-y-1 hover:bg-[#a89fc4]"
          >
            <Dog className="h-5 w-5" />
            <span>Nuevo Paciente</span>
          </Button>
          {onCitaRapidaClick && (
            <Button
              onClick={onCitaRapidaClick}
              className="flex h-12 items-center gap-2 rounded-xl border-[3px] border-foreground bg-[#a8d5ba] px-6 font-black text-[#000000] shadow-[4px_4px_0px_0px_#000000] transition-all hover:-translate-y-1 hover:bg-[#90c9a7]"
            >
              <Zap className="h-5 w-5" />
              <span>Cita Rápida</span>
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-10">
        {owners.length === 0 ? (
           <div className="text-center py-20 bg-white/50 border-[3px] border-dashed border-foreground/20 rounded-3xl">
             <p className="font-bold text-foreground/50 text-xl">No se encontraron mascotas</p>
           </div>
        ) : (
          pagedOwners.map(([owner, pets]) => (
            <div key={owner} className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-[2px] bg-foreground/10 flex-grow" />
                <h3 className="font-black text-xl text-foreground/40 uppercase tracking-[0.2em] flex items-center gap-2">
                   <User className="h-5 w-5" /> Dueño: {owner}
                </h3>
                <div className="h-[2px] bg-foreground/10 flex-grow" />
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pets.map((mascota) => {
                  const src = petPhotoSrc(mascota)
                  return (
                  <Card 
                    key={mascota.id} 
                    className="cursor-pointer overflow-hidden rounded-3xl border-[3px] border-foreground bg-[#fdfaf5] p-0 shadow-[6px_6px_0px_0px_#000000] transition-all hover:-translate-y-2 group"
                    onClick={() => window.location.href = `/dashboard/veterinario/mascotas/${mascota.id}/ficha-medica`}
                  >
                    <div className="relative h-28 border-b-[3px] border-foreground bg-[#a8d5ba] transition-colors group-hover:bg-[#7f9dca]">
                      <div className="absolute -bottom-8 left-6 z-10 flex h-16 w-16 rotate-[-3deg] items-center justify-center overflow-hidden rounded-2xl border-[3px] border-foreground bg-white shadow-[3px_3px_0px_0px_#000000] transition-transform group-hover:rotate-0">
                        {src ? (
                          <Image
                            src={src}
                            alt={mascota.nombre}
                            fill
                            sizes="64px"
                            className="object-cover object-center"
                          />
                        ) : (
                          <Dog className="h-8 w-8 text-foreground" />
                        )}
                      </div>
                    </div>
                    <CardContent className="p-6 pt-10">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="mb-1 font-black text-2xl group-hover:text-[#000000]/80">{mascota.nombre}</h3>
                          <p className="mb-4 font-bold text-foreground/70">
                            {mascota.raza} • <span className="text-[#93ABD9] bg-[#93ABD9]/20 px-2 py-0.5 rounded-md border border-[#93ABD9]">{calcularEdad(mascota.fechaNacimiento, mascota.edad, mascota.tipo || mascota.especie, mascota.raza)}</span>
                          </p>
                        </div>
                        <div className="rounded-xl border-2 border-foreground bg-[#bdb2ff] p-2 opacity-0 shadow-[2px_2px_0px_0px_#000000] transition-opacity group-hover:opacity-100">
                          <ClipboardList className="h-5 w-5 text-foreground" />
                        </div>
                      </div>

                      <div className="space-y-3 text-sm font-medium">
                        <div className="flex justify-between items-center rounded-xl border-[2px] border-foreground/20 bg-white p-3 transition-colors group-hover:border-foreground/50">
                          <span className="text-foreground/60 flex items-center gap-2">Ult. Visita</span>
                          <span className="font-bold">{mascota.ultimaVisita}</span>
                        </div>
                      </div>
                      
                      <p className="mt-4 text-center text-xs font-black uppercase tracking-widest text-[#a8d5ba] opacity-0 transition-all transform translate-y-2 group-hover:translate-y-0 group-hover:opacity-100">
                        Hacer clic para gestionar
                      </p>
                    </CardContent>
                  </Card>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {owners.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl border-2 border-foreground/20 bg-white/60 px-4 py-3">
          <div className="flex items-center gap-3">
            <p className="text-xs font-bold text-foreground/60">
              Mostrando {pagedOwners.length} de {owners.length} dueños
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground/60">Por página</span>
              <select
                value={ownersPerPage}
                onChange={(e) => {
                  setOwnersPerPage(Number(e.target.value) as (typeof OWNERS_PER_PAGE_OPTIONS)[number])
                  setPage(1)
                }}
                className="h-8 rounded-lg border-2 border-foreground/30 bg-white px-2 text-xs font-black"
              >
                {OWNERS_PER_PAGE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 border-2 border-foreground font-black"
            >
              Anterior
            </Button>
            <span className="px-2 text-xs font-black">
              {currentPage}/{totalPages}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 border-2 border-foreground font-black"
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
})

PatientsTab.displayName = "PatientsTab"
