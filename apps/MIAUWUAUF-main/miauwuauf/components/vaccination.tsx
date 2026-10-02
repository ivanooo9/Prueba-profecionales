"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Syringe, Shield, Clock, CheckCircle } from "lucide-react"

const vaccineTypes = [
  {
    id: "rabia",
    name: "Rabia",
    description: "Protección contra la rabia",
    icon: Shield,
    purpose: "Previene una enfermedad viral mortal que afecta el sistema nervioso central y es transmisible a humanos.",
    usage: "Se aplica por vía subcutánea o intramuscular. Es obligatoria anualmente a partir de los 3 meses de edad.",
  },
  {
    id: "parvovirus",
    name: "Parvovirus",
    description: "Vacuna esencial para cachorros",
    icon: Syringe,
    purpose: "Protege contra un virus altamente contagioso que ataca el tracto gastrointestinal, siendo muy peligroso en cachorros.",
    usage: "Se administra desde las 6-8 semanas de vida, con refuerzos cada 3-4 semanas hasta alcanzar las 16 semanas.",
  },
  {
    id: "moquillo",
    name: "Moquillo",
    description: "Protección contra el distemper",
    icon: Shield,
    purpose: "Prevención del Distemper canino, un virus agresivo que afecta los sistemas respiratorio, gastrointestinal y nervioso.",
    usage: "Suele incluirse en la vacuna múltiple (polivalente), iniciada a las 6-8 semanas con refuerzos anuales.",
  },
  {
    id: "leptospirosis",
    name: "Leptospirosis",
    description: "Prevención de infecciones",
    icon: Syringe,
    purpose: "Evita la infección por bacterias Leptospira que dañan hígado y riñones, previniendo también el contagio a humanos.",
    usage: "Aplicación recomendada en zonas de riesgo, con inicio a las 12 semanas y un refuerzo anual obligatorio.",
  },
  {
    id: "hepatitis",
    name: "Hepatitis",
    description: "Protección hepática",
    icon: Shield,
    purpose: "Defiende contra el Adenovirus Canino tipo 1, responsable de la Hepatitis Infecciosa que afecta severamente al hígado.",
    usage: "Se administra típicamente de forma combinada en la vacuna polivalente desde las primeras semanas de vida.",
  },
  {
    id: "polivalente",
    name: "Polivalente",
    description: "Vacuna múltiple completa",
    icon: CheckCircle,
    purpose: "Ofrece inmunidad conjunta contra Parvovirus, Moquillo, Hepatitis, Parainfluenza y Leptospirosis en una sola dosis.",
    usage: "Requiere un calendario de dosis múltiples en la etapa de cachorro y posteriormente un refuerzo cada año.",
  },
]

const benefits = [
  { title: "Recordatorios Automaticos", description: "Te avisamos cuando toca la proxima vacuna" },
  { title: "Historial Completo", description: "Registro de todas las vacunas de tu mascota" },
  { title: "Veterinarios Certificados", description: "Profesionales de confianza" },
]

export default function Vaccination() {
  const { data: session } = useSession()
  
  const getRedirectPath = () => {
    if (!session) return "/login?callbackUrl=/mi-mascota?tab=citas"
    return "/mi-mascota?tab=citas"
  }

  const redirectPath = getRedirectPath()

  return (
    <section id="vacunacion" className="relative py-12 md:py-16">
      <div className="container relative z-10 mx-auto max-w-6xl px-4">
        <div className="mb-8 animate-fade-in-up space-y-3 text-center md:mb-10 md:space-y-4">
          <div className="inline-block">
            <span className="section-title-pill">
              CUIDADO PREVENTIVO
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl md:text-7xl font-black text-balance tracking-tight text-[#000000]">Vacunacion y Control</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty leading-relaxed">
            Mantén a tu mascota protegida con nuestro sistema de vacunacion y control veterinario
          </p>
        </div>

        {/* Tipos de vacunas */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 md:mb-10 lg:grid-cols-3">
          {vaccineTypes.map((vaccine, index) => (
            <Card
              key={vaccine.id}
              className="group animate-scale-in border-[3px] border-[#000000] bg-[#e7bef8] shadow-[6px_6px_0px_0px_#000000] transition-all duration-300 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#000000]"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader className="space-y-3 pb-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-[#000000] bg-white shadow-[4px_4px_0px_0px_#000000] transition-colors duration-200 group-hover:bg-[#EDE986]">
                  <vaccine.icon className="h-7 w-7 text-[#4A4A4A] transition-colors duration-200 group-hover:text-[#000000]" strokeWidth={2.5} />
                </div>
                <CardTitle className="text-xl font-black">{vaccine.name}</CardTitle>
                <CardDescription className="text-base font-semibold text-foreground/80">{vaccine.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div>
                  <h4 className="font-bold text-xs text-foreground/80 mb-1 uppercase tracking-wider">¿Para qué sirve?</h4>
                  <p className="text-sm text-foreground/70 font-medium leading-relaxed">{vaccine.purpose}</p>
                </div>
                <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
                  <h4 className="font-bold text-xs text-foreground/90 mb-1 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Aplicación
                  </h4>
                  <p className="text-sm text-foreground/80 font-medium">{vaccine.usage}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Beneficios */}
        <Card className="mb-8 animate-fade-in-up border-[3px] border-[#000000] bg-[#e7bef8] shadow-[8px_8px_0px_0px_#000000] md:mb-10" style={{ animationDelay: "0.3s" }}>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {benefits.map((benefit, index) => (
                <div key={index} className="group flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-[3px] border-[#000000] bg-white shadow-[4px_4px_0px_0px_#000000] transition-colors duration-200 group-hover:bg-[#EDE986]">
                    <Clock className="h-6 w-6 text-[#4A4A4A] transition-colors duration-200 group-hover:text-[#000000]" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">{benefit.title}</h4>
                    <p className="text-muted-foreground">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
          <Card className="mx-auto max-w-2xl border-[3px] border-[#000000] bg-[#e7bef8] shadow-[10px_10px_0px_0px_#000000]">
            <CardContent className="space-y-6 p-10">
              <Syringe className="mx-auto h-16 w-16 text-[#000000]" strokeWidth={2.5} />
              <h3 className="text-3xl font-black text-[#000000]">Reserva tu Cita de Vacunacion</h3>
              <p className="text-lg font-medium text-[#000000]/80">
                Inicia sesion para agendar una cita y mantener el control de las vacunas de tu mascota
              </p>
              <Button
                size="lg"
                className="rounded-full border-[3px] border-[#000000] bg-[#e7bef8] px-12 py-10 font-heading text-2xl font-black text-[#000000] shadow-[6px_6px_0px_0px_#000000] transition-all duration-300 hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#EDE986] hover:shadow-[3px_3px_0px_0px_#000000] active:translate-y-[1px] active:shadow-none"
                asChild
              >
                <Link href={redirectPath}>Reservar Cita</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
