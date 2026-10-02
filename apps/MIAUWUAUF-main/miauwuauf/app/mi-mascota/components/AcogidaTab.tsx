"use client"

import React, { useMemo, useState, useEffect } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { 
  ArrowLeft, CheckCircle, Heart, 
  FileText, PawPrint, Eye, 
  Syringe, Home, User, ClipboardCheck, Send, Loader2 
} from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { 
  Card, CardContent, CardHeader, 
  CardTitle, CardDescription 
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatDate } from "@/lib/utils"
import {
  ensureEcuadorPhoneInputPrefix,
  formatEcuadorPhoneDisplay,
  normalizeEcuadorPhoneInput,
} from "@/lib/phone"
import { PerroAdopcion, SolicitudAdopcion } from "../types"

interface AcogidaTabProps {
  adopcionPets: PerroAdopcion[]
  misSolicitudes: SolicitudAdopcion[]
  onEnviarSolicitud: (formData: Partial<SolicitudAdopcion>) => Promise<boolean>
}

export const AcogidaTab = ({
  adopcionPets,
  misSolicitudes,
  onEnviarSolicitud
}: AcogidaTabProps) => {
  const { data: session } = useSession()
  /** Solo listar mascotas que aún pueden adoptarse (ocultar las ya adoptadas). */
  const petsEnAcogida = useMemo(
    () => adopcionPets.filter((p) => p.estado !== "adoptado"),
    [adopcionPets]
  )

  const [whatsappPhone, setWhatsappPhone] = useState("")

  useEffect(() => {
    const fetchPhone = async () => {
      try {
        const res = await fetch("/api/plan-contact")
        if (res.ok) {
          const data = await res.json()
          if (data.phone) {
            setWhatsappPhone(data.phone.replace(/\D/g, ""))
          }
        }
      } catch (error) {
        console.error("Error fetching whatsapp phone:", error)
      }
    }
    fetchPhone()
  }, [])

  const handleDarEnAdopcionClick = () => {
    const phone = whatsappPhone || "593984251410"
    const userPart = session?.user?.name ? ` Mi nombre es ${session.user.name}.` : ""
    const message = `¡Hola MIAUWUAUF!${userPart} Quisiera dar a una mascota en adopción/acogida y me gustaría que me asesoren con el registro.`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank")
  }
  const [view, setView] = useState<"lista" | "detalle" | "formulario" | "confirmacion" | "mis-solicitudes">("lista")
  const [solicitudEnviando, setSolicitudEnviando] = useState(false)
  const [perroSeleccionado, setPerroSeleccionado] = useState<PerroAdopcion | null>(null)
  const [solicitudForm, setSolicitudForm] = useState({
    nombreCompleto: "", cedula: "", email: "", telefono: "", direccion: "",
    tipoVivienda: "", tienePatio: "", viviendaPropia: "", personasHogar: "",
    hayNinos: "", otrasMascotas: "", experienciaMascotas: "", motivoAdopcion: "",
    cubrirGastos: "", aceptaResponsabilidad: false, aceptaSeguimiento: false,
  })

  // Verificar si ya existe una solicitud para el perro seleccionado
  const yaSolicitado = perroSeleccionado && misSolicitudes.some(
    sol => String(sol.perroId) === String(perroSeleccionado.id)
  )

  // Handlers from original code
  const handleVerDetalle = (perro: PerroAdopcion) => {
    setPerroSeleccionado(perro)
    setView("detalle")
  }

  const handleSolicitarAdopcion = () => {
    // Autofill form if session is available
    if (session?.user) {
      setSolicitudForm(prev => ({
        ...prev,
        nombreCompleto: session.user.name || "",
        email: session.user.email || "",
        telefono: session.user.phone || "",
        cedula: session.user.cedula || ""
      }))
    }
    setView("formulario")
  }

  const handleEnviarSolicitud = async (e: React.FormEvent) => {
    e.preventDefault()
    if (solicitudEnviando) return
    if (!solicitudForm.aceptaResponsabilidad || !solicitudForm.aceptaSeguimiento) {
      toast.error("Debes aceptar los compromisos para continuar", {
        description: "Asegúrate de marcar las casillas de responsabilidad y seguimiento.",
      })
      return
    }
    if (!perroSeleccionado) return

    setSolicitudEnviando(true)
    try {
      const success = await onEnviarSolicitud({
        ...solicitudForm,
        perroId: perroSeleccionado.id,
        perroNombre: perroSeleccionado.nombre,
        otrasMascotas: solicitudForm.otrasMascotas,
        experienciaMascotas: solicitudForm.experienciaMascotas,
        aceptaResponsabilidad: !!solicitudForm.aceptaResponsabilidad,
        aceptaSeguimiento: !!solicitudForm.aceptaSeguimiento
      })

      if (success) {
        setView("confirmacion")
      }
    } finally {
      setSolicitudEnviando(false)
    }
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target
    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      setSolicitudForm(prev => ({ ...prev, [target.name]: target.checked }))
    } else if (target.name === "telefono") {
      setSolicitudForm(prev => ({ ...prev, telefono: normalizeEcuadorPhoneInput(target.value) }))
    } else {
      setSolicitudForm(prev => ({ ...prev, [target.name]: target.value }))
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* VISTA: Lista */}
      {view === "lista" && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-3xl font-bold mb-2">Centro de Ayuda</h2>
              <p className="text-muted-foreground">Contáctanos si necesitas reportar un caso de ayuda, dar un perrito en adopción o resolver tus dudas.</p>
            </div>
            {misSolicitudes.length > 0 && (
              <Button variant="outline" onClick={() => setView("mis-solicitudes")} className="gap-2 bg-transparent">
                <FileText className="h-4 w-4" />
                Mis Solicitudes ({misSolicitudes.length})
              </Button>
            )}
          </div>

          {/* Banner de Contacto para dar en Acogida / Adopción */}
          <div className="bg-[#ffd6a5]/30 border-2 border-dashed border-[#ffd6a5] rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              <div className="h-12 w-12 rounded-2xl bg-[#ffd6a5] border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_#000] shrink-0 p-2.5">
                <Heart className="h-6 w-6 text-black fill-black" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-black">¿Quieres ayudar a una mascota a encontrar un hogar?</h3>
                <p className="text-sm text-black/70">
                  Si necesitas ayuda, reportar un caso o tienes dudas, ponte en contacto con nuestro equipo.
                </p>
              </div>
            </div>
            <Button
              onClick={handleDarEnAdopcionClick}
              className="bg-[#EDE986] text-black font-black border-[2px] border-black rounded-xl shadow-[4px_4px_0px_0px_#000] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#000] transition-all shrink-0 py-6 px-8 text-base gap-2 w-full md:w-auto"
            >
              <Send className="h-5 w-5" />
              Contactar
            </Button>
          </div>

          {/* Sección duplicada: Centro de Acogida */}
          <div className="pt-4">
            <h2 className="text-3xl font-bold mb-2">Centro de Acogida</h2>
            <p className="text-muted-foreground">Adopta una mascota o ayuda a los animales en espera de hogar</p>
          </div>

          {petsEnAcogida.length === 0 ? (
            <Card className="border-2 border-foreground/15 shadow-sm">
              <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
                <PawPrint className="h-14 w-14 text-muted-foreground/40" />
                <p className="text-lg font-bold text-foreground">Por ahora no hay mascotas en acogida</p>
                <p className="max-w-md text-muted-foreground">
                  Todas las que estaban disponibles ya encontraron hogar, o el refugio está actualizando el listado. Vuelve pronto.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {petsEnAcogida.map((animal) => (
                <Card key={animal.id} className="overflow-hidden rounded-2xl border-2 border-foreground/15 p-0 shadow-sm ring-1 ring-foreground/10">
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                    <Image
                      src={animal.foto || "/placeholder.svg"}
                      alt={animal.nombre}
                      fill
                      sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw"
                      className="object-cover object-center"
                    />
                    {animal.estado === "en_proceso" && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-amber-500 text-white">En proceso</Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold">{animal.nombre}</h3>
                        <p className="text-muted-foreground">
                          {animal.raza} - {animal.edad}
                        </p>
                      </div>
                      <PawPrint className="h-6 w-6 text-primary" />
                    </div>
                    {animal.estado === "disponible" ? (
                      <Button className="w-full gap-2 rounded-lg" onClick={() => handleVerDetalle(animal)}>
                        <Eye className="h-4 w-4" />
                        Ver Perfil
                      </Button>
                    ) : (
                      <Button className="w-full gap-2 rounded-lg" variant="secondary" disabled>
                        Solicitud en proceso
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* VISTA: Detalle */}
      {view === "detalle" && perroSeleccionado && (
        <>
          <Button variant="ghost" onClick={() => { setView("lista"); setPerroSeleccionado(null) }} className="gap-2 mb-2">
            <ArrowLeft className="h-4 w-4" />
            Volver al listado
          </Button>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="relative aspect-square overflow-hidden p-0 shadow-sm ring-1 ring-foreground/10 rounded-2xl border-2 border-foreground/15">
              <Image
                src={perroSeleccionado.foto || "/placeholder.svg"}
                alt={perroSeleccionado.nombre}
                fill
                sizes="(max-width:1024px) 100vw, 50vw"
                className="object-cover object-center"
              />
            </Card>
            <div className="space-y-6">
              <div>
                <h2 className="text-4xl font-bold">{perroSeleccionado.nombre}</h2>
                <p className="text-xl text-muted-foreground mt-1">{perroSeleccionado.raza}</p>
              </div>
              <Card className="shadow-sm">
                <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">Edad</p><p className="font-semibold">{perroSeleccionado.edad}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">Peso</p><p className="font-semibold">{perroSeleccionado.peso}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">Sexo</p><p className="font-semibold">{perroSeleccionado.sexo}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">Color</p><p className="font-semibold">{perroSeleccionado.color}</p></div>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Syringe className="h-5 w-5 text-primary" />
                    <span className="font-medium">Vacunas:</span>
                    <Badge className={perroSeleccionado.vacunado ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                      {perroSeleccionado.vacunado ? "Al dia" : "Pendiente"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span className="font-medium">Esterilizado:</span>
                    <Badge className={perroSeleccionado.esterilizado ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
                      {perroSeleccionado.esterilizado ? "Si" : "No"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Home className="h-5 w-5 text-primary" />
                    <span className="font-medium">Hogar recomendado:</span>
                  </div>
                  <p className="text-muted-foreground pl-8">{perroSeleccionado.hogarRecomendado}</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader><CardTitle className="text-lg">Sobre {perroSeleccionado.nombre}</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground leading-relaxed">{perroSeleccionado.descripcion}</p></CardContent>
              </Card>
              {yaSolicitado ? (
                <Button 
                  className="w-full py-6 rounded-lg text-lg font-bold gap-2 bg-gray-400 hover:bg-gray-400 cursor-not-allowed border-none shadow-none" 
                  disabled
                >
                  <ClipboardCheck className="h-5 w-5" />
                  Solicitud en proceso
                </Button>
              ) : (
                <Button className="w-full py-6 rounded-lg text-lg font-bold gap-2" onClick={handleSolicitarAdopcion}>
                  <Heart className="h-5 w-5" />
                  Solicitar Adopcion
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      {/* VISTA: Formulario */}
      {view === "formulario" && perroSeleccionado && (
        <>
          <Button variant="ghost" onClick={() => setView("detalle")} className="gap-2 mb-2">
            <ArrowLeft className="h-4 w-4" />
            Volver al perfil de {perroSeleccionado.nombre}
          </Button>
          <Card className="border-[3px] border-[#000000] p-0 shadow-[8px_8px_0px_0px_#000000] bg-[#e7bef8]">
            <CardHeader className="gap-0">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden relative">
                  <Image src={perroSeleccionado.foto || "/placeholder.svg"} alt={perroSeleccionado.nombre} fill className="object-cover" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Solicitud de Adopcion - {perroSeleccionado.nombre}</CardTitle>
                  <CardDescription>Completa todos los campos para enviar tu solicitud</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEnviarSolicitud} className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-bold flex items-center gap-2 border-b pb-2"><User className="h-5 w-5 text-primary" /> Datos Personales</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Nombre Completo</Label><Input name="nombreCompleto" value={solicitudForm.nombreCompleto} onChange={handleFormChange} required placeholder="Juan Perez" /></div>
                    <div className="space-y-2"><Label>Cedula / DNI</Label><Input name="cedula" value={solicitudForm.cedula} onChange={handleFormChange} required placeholder="1234567890" /></div>
                    <div className="space-y-2"><Label>Correo Electronico</Label><Input name="email" type="email" value={solicitudForm.email} onChange={handleFormChange} required placeholder="tu@email.com" /></div>
                    <div className="space-y-2"><Label>Telefono</Label><Input name="telefono" value={formatEcuadorPhoneDisplay(solicitudForm.telefono)} onChange={handleFormChange} onFocus={() => setSolicitudForm((prev) => ({ ...prev, telefono: ensureEcuadorPhoneInputPrefix(prev.telefono) }))} required placeholder="+593 99 123 4567" /></div>
                    <div className="space-y-2 md:col-span-2"><Label>Direccion</Label><Input name="direccion" value={solicitudForm.direccion} onChange={handleFormChange} required placeholder="Calle, numero, ciudad" /></div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-bold flex items-center gap-2 border-b pb-2"><Home className="h-5 w-5 text-primary" /> Informacion del Hogar</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Tipo de Vivienda</Label><select name="tipoVivienda" value={solicitudForm.tipoVivienda} onChange={handleFormChange} className="w-full p-3 rounded-lg border bg-background text-base" required><option value="">Seleccionar...</option><option value="casa">Casa</option><option value="departamento">Departamento</option><option value="finca">Finca</option></select></div>
                    <div className="space-y-2"><Label>Tiene Patio?</Label><select name="tienePatio" value={solicitudForm.tienePatio} onChange={handleFormChange} className="w-full p-3 rounded-lg border bg-background text-base" required><option value="">Seleccionar...</option><option value="si">Si</option><option value="no">No</option></select></div>
                    <div className="space-y-2"><Label>Vivienda Propia o Arrendada?</Label><select name="viviendaPropia" value={solicitudForm.viviendaPropia} onChange={handleFormChange} className="w-full p-3 rounded-lg border bg-background text-base" required><option value="">Seleccionar...</option><option value="propia">Propia</option><option value="arrendada">Arrendada</option></select></div>
                    <div className="space-y-2"><Label>Personas en el Hogar</Label><Input name="personasHogar" value={solicitudForm.personasHogar} onChange={handleFormChange} required placeholder="Ej: 3" /></div>
                    <div className="space-y-2"><Label>Hay Ninos?</Label><select name="hayNinos" value={solicitudForm.hayNinos} onChange={handleFormChange} className="w-full p-3 rounded-lg border bg-background text-base" required><option value="">Seleccionar...</option><option value="si">Si</option><option value="no">No</option></select></div>
                    <div className="space-y-2"><Label>Tiene Otras Mascotas?</Label><select name="otrasMascotas" value={solicitudForm.otrasMascotas} onChange={handleFormChange} className="w-full p-3 rounded-lg border bg-background text-base" required><option value="">Seleccionar...</option><option value="si">Si</option><option value="no">No</option></select></div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-bold flex items-center gap-2 border-b pb-2"><PawPrint className="h-5 w-5 text-primary" /> Experiencia y Motivacion</h3>
                  <div className="space-y-4">
                    <div className="space-y-2"><Label>Ha tenido mascotas antes?</Label><select name="experienciaMascotas" value={solicitudForm.experienciaMascotas} onChange={handleFormChange} className="w-full p-3 rounded-lg border bg-background text-base" required><option value="">Seleccionar...</option><option value="si">Si</option><option value="no">No, es mi primera vez</option></select></div>
                    <div className="space-y-2"><Label>Por que quiere adoptar?</Label><textarea name="motivoAdopcion" value={solicitudForm.motivoAdopcion} onChange={handleFormChange} className="w-full p-3 rounded-lg border bg-background text-base min-h-[100px] resize-none" required placeholder="Cuentanos por que deseas adoptar a este animalito..." /></div>
                    <div className="space-y-2">
                      <Label>Esta dispuesto a cubrir gastos veterinarios?</Label>
                      <select 
                        name="cubrirGastos" 
                        value={solicitudForm.cubrirGastos} 
                        onChange={handleFormChange} 
                        className="w-full p-3 rounded-lg border bg-background text-base border-black" 
                        required
                      >
                        <option value="">Seleccionar...</option>
                        <option value="si">Si, completamente</option>
                        <option value="parcial">Si, parcialmente</option>
                        <option value="no">No estoy seguro</option>
                      </select>
                      
                      {/* Mensajes dinámicos según selección */}
                      {solicitudForm.cubrirGastos === "si" && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }} 
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 bg-green-100 border-2 border-green-500 rounded-xl text-xs font-bold text-green-800 flex items-center gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          ¡Excelente! Aceptas completamente el compromiso y cuidado integral de tu futuro compañero.
                        </motion.div>
                      )}
                      {solicitudForm.cubrirGastos === "parcial" && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }} 
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 bg-blue-100 border-2 border-blue-500 rounded-xl text-xs font-bold text-blue-800 flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Entendido. Podemos conversar sobre el apoyo mutuo y programas de asistencia veterinaria.
                        </motion.div>
                      )}
                      {solicitudForm.cubrirGastos === "no" && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }} 
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 bg-amber-100 border-2 border-amber-500 rounded-xl text-xs font-bold text-amber-800 flex items-center gap-2"
                        >
                          <PawPrint className="h-4 w-4" />
                          Gracias por tu sinceridad. Te orientaremos sobre los costos básicos para que tomes la mejor decisión.
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-bold flex items-center gap-2 border-b pb-2"><ClipboardCheck className="h-5 w-5 text-primary" /> Compromiso</h3>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                      <input type="checkbox" name="aceptaResponsabilidad" checked={solicitudForm.aceptaResponsabilidad} onChange={handleFormChange} className="mt-1 h-5 w-5 rounded accent-primary" />
                      <div><p className="font-medium">Acepto la responsabilidad legal</p><p className="text-sm text-muted-foreground">Me comprometo a cuidar, alimentar y brindar atencion veterinaria al animal adoptado.</p></div>
                    </label>
                    <label className="flex items-start gap-3 p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                      <input type="checkbox" name="aceptaSeguimiento" checked={solicitudForm.aceptaSeguimiento} onChange={handleFormChange} className="mt-1 h-5 w-5 rounded accent-primary" />
                      <div><p className="font-medium">Acepto seguimiento post-adopcion</p><p className="text-sm text-muted-foreground">Autorizo visitas de seguimiento para verificar el bienestar de la mascota.</p></div>
                    </label>
                  </div>
                </div>

                <div className="pt-8 pb-6">
                  <Button
                    type="submit"
                    disabled={solicitudEnviando}
                    className="w-full gap-2 rounded-lg py-6 text-lg font-bold disabled:opacity-60"
                  >
                    {solicitudEnviando ? (
                      <>
                        <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
                        Enviando solicitud…
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        Enviar Solicitud
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </>
      )}

      {/* VISTA: Confirmacion */}
      {view === "confirmacion" && perroSeleccionado && (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-lg w-full text-center shadow-sm">
            <CardContent className="p-10 space-y-6">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold">Solicitud Enviada</h2>
              <p className="text-muted-foreground text-lg">
                Tu solicitud de adopcion para <strong>{perroSeleccionado.nombre}</strong> ha sido enviada exitosamente.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
                <p className="text-sm"><strong>Estado:</strong> Pendiente de revision</p>
                <p className="text-sm"><strong>Perro:</strong> {perroSeleccionado.nombre} ({perroSeleccionado.raza})</p>
                <p className="text-sm"><strong>Proximo paso:</strong> Revision por administrador</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 bg-transparent" onClick={() => { setView("lista"); setPerroSeleccionado(null) }}>Volver al Listado</Button>
                <Button className="flex-1" onClick={() => setView("mis-solicitudes")}>Ver Mis Solicitudes</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* VISTA: Mis solicitudes */}
      {view === "mis-solicitudes" && (
        <>
          <Button variant="ghost" onClick={() => setView("lista")} className="gap-2 mb-2">
            <ArrowLeft className="h-4 w-4" />
            Volver al listado
          </Button>
          <div>
            <h2 className="text-3xl font-bold mb-2">Mis Solicitudes de Adopcion</h2>
            <p className="text-muted-foreground">Sigue el estado de tus solicitudes</p>
          </div>
          {misSolicitudes.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-10 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No tienes solicitudes aun</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {misSolicitudes.map((sol) => {
                const estadoConfig: Record<string, {label: string; color: string; step: number}> = {
                  pendiente: { label: "Pendiente de revisión", color: "bg-[#ffd6a5] text-[#000000] border-[2px] border-[#000000]", step: 1 },
                  entrevista: { label: "Entrevista programada", color: "bg-[#93ABD9] text-[#000000] border-[2px] border-[#000000]", step: 2 },
                  aprobada: { label: "Aprobada - Entrega pendiente", color: "bg-[#93ABD9] text-[#000000] border-[2px] border-[#000000]", step: 3 },
                  rechazada: { label: "Rechazada", color: "bg-[#ffadad] text-[#000000] border-[2px] border-[#000000]", step: -1 },
                  entregada: { label: "Mascota Entregada", color: "bg-[#9bf6ff] text-[#000000] border-[2px] border-[#000000]", step: 4 },
                }
                const config = estadoConfig[sol.estado] || estadoConfig.pendiente
                return (                  <div key={sol.id} className="border-2 border-[#000000]/5 shadow-sm rounded-[28px] overflow-hidden mb-6 bg-[#fdfaf5] transition-all hover:shadow-md">
                    {/* Header: Naranja Unificado MIAUWUAUF (#ffd6a5) */}
                    <div className="px-6 py-5 relative bg-[#ffd6a5]">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="font-black text-2xl text-[#000000] tracking-tight italic uppercase">{sol.perroNombre}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#000000]/40">Solicitud • {formatDate(sol.createdAt || (sol.fecha + (sol.fecha.includes("T") ? "" : "T12:00:00")))}</span>
                          </div>
                        </div>
                        <div className={`px-4 py-2 rounded-2xl border-2 shadow-sm shrink-0 flex items-center gap-2 transition-all ${
                          sol.estado === "rechazada" ? "bg-red-50 border-red-200" 
                          : sol.estado === "aprobada" || sol.estado === "entregada" ? "bg-green-50 border-green-200"
                          : "bg-white/60 border-white/40 shadow-none"
                        }`}>
                          <div className={`h-1.5 w-1.5 rounded-full ${
                            sol.estado === "rechazada" ? "bg-red-500" 
                            : sol.estado === "aprobada" || sol.estado === "entregada" ? "bg-green-500"
                            : "bg-[#000000]/30"
                          }`} />
                          <span className={`text-[10px] font-black uppercase tracking-tight ${
                            sol.estado === "rechazada" ? "text-red-700" 
                            : sol.estado === "aprobada" || sol.estado === "entregada" ? "text-green-700"
                            : "text-[#000000]/70"
                          }`}>
                            {config.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Cuerpo: Fondo crema de la captura */}
                    <div className="p-6 bg-[#fdfaf5]">
                      {sol.estado === "entregada" ? (
                        <div className="flex items-center gap-4 p-5 bg-white rounded-2xl border-2 border-[#000000]/5 shadow-sm">
                          <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center shadow-md">
                            <CheckCircle className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="font-black text-[#000000] text-base leading-none mb-1">¡Proceso completado!</p>
                            <p className="text-sm font-bold text-[#000000]/50 italic">{sol.perroNombre} ya es parte de tu hogar.</p>
                          </div>
                        </div>
                      ) : sol.estado === "rechazada" ? (
                        <div className="p-5 bg-white rounded-2xl border-2 border-[#000000]/5 flex items-center gap-4 shadow-sm">
                          <p className="font-black text-[#000000]/80 text-sm leading-relaxed">Lo sentimos, tu solicitud no fue aprobada en esta ocasión.</p>
                        </div>
                      ) : (
                        <div className="relative mt-2 px-1">
                          {/* Línea de fondo */}
                          <div className="absolute top-[20px] left-8 right-8 h-1.5 bg-[#000000]/5 rounded-full z-0" />
                          <div
                            className={`absolute top-[20px] left-8 h-1.5 rounded-full z-0 transition-all duration-1000 ${
                              sol.estado === "aprobada" ? "bg-green-500" : "bg-[#000000]/20"
                            }`}
                            style={{ width: `${Math.max(0, (config.step / 4) * 100 - 10)}%` }}
                          />
                          <div className="relative z-10 flex items-start justify-between">
                            {["Enviada", "Revisión", "Entrevista", "Aprobada", "Entregada"].map((paso, i) => {
                              const done = i < config.step
                              const active = i === config.step
                              return (
                                <div key={paso} className="flex flex-col items-center gap-3 w-[20%]">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all duration-500 ${
                                    active ? "bg-white text-[#000000] border-[#000000] shadow-md scale-110 z-20"
                                    : done ? "bg-[#ffd6a5] text-[#000000] border-transparent"
                                    : "bg-white text-[#000000]/10 border-[#000000]/5"
                                  }`}>
                                    {done ? "" : i + 1}
                                  </div>
                                  <span className={`text-[9px] text-center leading-tight font-black uppercase tracking-tight ${active ? "text-[#000000]" : "text-[#000000]/30"}`}>{paso}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
