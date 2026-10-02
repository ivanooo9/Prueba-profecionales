"use client"

import { useState, FormEvent } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Mail, Phone, MapPin, Loader2 } from "lucide-react"
import { CONTACT_INFO } from "@/lib/constants"
import { toast } from "sonner"

interface ContactProps {
  compact?: boolean
}

export default function Contact({ compact = false }: ContactProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (sending) return

    setSending(true)
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "No se pudo enviar el mensaje.")
        return
      }

      toast.success("¡Mensaje enviado correctamente! Te responderemos pronto.")
      setName("")
      setEmail("")
      setMessage("")
    } catch {
      toast.error("Error de conexión. Intenta de nuevo más tarde.")
    } finally {
      setSending(false)
    }
  }

  if (compact) {
    const inputClass =
      "h-11 rounded-2xl border-2 border-[#e7bef8] bg-white/60 px-4 text-sm focus-visible:ring-[#e7bef8]"
    return (
      <section id="contacto" className="w-full bg-background">
        <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
          <h2 className="font-heading text-center text-2xl font-bold text-foreground md:text-3xl">
            Contáctanos
          </h2>

          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
            {/* Formulario — mismo estilo que la página principal, más compacto */}
            <Card className="border-2 border-foreground bg-[#ede986] p-5 shadow-[4px_4px_0px_0px_#000000] md:p-6">
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label htmlFor="contact-compact-name" className="ml-1 text-xs font-bold text-[#000000]">
                    Nombre
                  </label>
                  <Input
                    id="contact-compact-name"
                    name="name"
                    placeholder="Tu nombre"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="contact-compact-email" className="ml-1 text-xs font-bold text-[#000000]">
                    Email
                  </label>
                  <Input
                    id="contact-compact-email"
                    name="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="contact-compact-message" className="ml-1 text-xs font-bold text-[#000000]">
                    Mensaje
                  </label>
                  <Textarea
                    id="contact-compact-message"
                    name="message"
                    placeholder="¿En qué podemos ayudarte?"
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    className="resize-none rounded-2xl border-2 border-[#e7bef8] bg-white/60 p-4 text-sm focus-visible:ring-[#e7bef8]"
                  />
                </div>
                <Button type="submit" size="lg" disabled={sending} className="w-full font-bold shadow-[3px_3px_0px_0px_#000000]">
                  {sending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : "Enviar Mensaje"}
                </Button>
              </form>
            </Card>

            {/* Tarjetas de información — igual que la derecha de la página principal */}
            <div className="flex flex-col gap-3 sm:gap-4">
              <Card className="soft-box border-2 border-foreground/15 bg-[#ede986] p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.12)]">
                <CardContent className="flex items-start gap-4 p-0">
                  <div className="flex shrink-0 items-center justify-center pt-0.5">
                    <MapPin className="h-6 w-6 text-[#e7bef8]" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="mb-1 font-heading text-base font-bold text-foreground md:text-lg">Ubicación</h3>
                    <p className="text-sm font-normal leading-snug text-[#4A4A4A]">
                      {CONTACT_INFO.address}
                      <br />
                      {CONTACT_INFO.city}
                    </p>
                    <a
                      href={CONTACT_INFO.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-block text-xs font-semibold text-[#000000] underline underline-offset-2 hover:text-[#e7bef8]"
                    >
                      Ver en Google Maps
                    </a>
                  </div>
                </CardContent>
              </Card>

              <Card className="soft-box border-2 border-foreground/15 bg-[#ede986] p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.12)]">
                <CardContent className="flex items-start gap-4 p-0">
                  <div className="flex shrink-0 items-center justify-center pt-0.5">
                    <Phone className="h-6 w-6 text-[#e7bef8]" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="mb-1 font-heading text-base font-bold text-foreground md:text-lg">Teléfono</h3>
                    <p className="text-sm font-normal leading-snug text-[#4A4A4A]">
                      <a href={`tel:${CONTACT_INFO.phone.replace(/\s/g, "")}`} className="font-semibold hover:underline">
                        {CONTACT_INFO.phone}
                      </a>
                      <br />
                      <span className="text-xs">{CONTACT_INFO.workingHours}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="soft-box border-2 border-foreground/15 bg-[#ede986] p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.12)]">
                <CardContent className="flex items-start gap-4 p-0">
                  <div className="flex shrink-0 items-center justify-center pt-0.5">
                    <Mail className="h-6 w-6 text-[#e7bef8]" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="mb-1 font-heading text-base font-bold text-foreground md:text-lg">Email</h3>
                    <p className="text-sm font-normal leading-snug text-[#4A4A4A]">
                      <a 
                        href={`https://mail.google.com/mail/?view=cm&fs=1&to=${CONTACT_INFO.email}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="block break-all hover:underline"
                      >
                        {CONTACT_INFO.email}
                      </a>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <footer
      id="contacto"
      className="w-full min-w-0 bg-transparent"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-12 md:py-16">
        <div className="mb-8 space-y-3 text-center md:mb-10">
          <div className="inline-block">
            <span className="section-title-pill">Contacto</span>
          </div>
          <h2 className="font-heading text-balance text-4xl font-bold md:text-5xl">Contáctanos</h2>
          <p className="mx-auto max-w-2xl text-pretty font-sans text-lg font-normal text-[#4A4A4A]">
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Card className="p-8 bg-[#ede986]">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <label htmlFor="name" className="font-sans text-sm font-bold text-[#000000] ml-2">
                  Nombre
                </label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="h-14 rounded-full border-2 border-[#e7bef8] bg-white/50 px-6 focus-visible:ring-[#e7bef8]"
                />
              </div>
              <div className="space-y-4">
                <label htmlFor="email" className="font-sans text-sm font-bold text-[#000000] ml-2">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-14 rounded-full border-2 border-[#e7bef8] bg-white/50 px-6 focus-visible:ring-[#e7bef8]"
                />
              </div>
              <div className="space-y-4">
                <label htmlFor="message" className="font-sans text-sm font-bold text-[#000000] ml-2">
                  Mensaje
                </label>
                <Textarea
                  id="message"
                  name="message"
                  placeholder="¿En qué podemos ayudarte?"
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  className="rounded-[2rem] border-2 border-[#e7bef8] bg-white/50 p-6 focus-visible:ring-[#e7bef8]"
                />
              </div>
              <Button type="submit" size="lg" disabled={sending} className="w-full font-bold">
                {sending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : "Enviar Mensaje"}
              </Button>
            </form>
          </Card>

          <div className="space-y-6">
            <Card className="soft-box bg-[#ede986] p-6 shadow-none">
              <CardContent className="flex items-center gap-6 p-0">
                <div className="flex shrink-0 items-center justify-center">
                  <MapPin className="h-8 w-8 text-[#e7bef8]" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="mb-1 font-heading text-2xl font-bold text-foreground">Ubicación</h3>
                  <p className="font-sans text-lg font-normal text-[#4A4A4A]">
                    {CONTACT_INFO.address}
                    <br />
                    {CONTACT_INFO.city}
                  </p>
                  <a
                    href={CONTACT_INFO.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block font-sans text-sm font-normal text-[#000000] underline underline-offset-2 hover:text-[#e7bef8]"
                  >
                    Ver en Google Maps
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card className="soft-box bg-[#ede986] p-6 shadow-none">
              <CardContent className="flex items-center gap-6 p-0">
                <div className="flex shrink-0 items-center justify-center">
                  <Phone className="h-8 w-8 text-[#e7bef8]" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="mb-1 font-heading text-2xl font-bold text-foreground">Teléfono</h3>
                  <p className="font-sans text-lg font-normal text-[#4A4A4A]">
                    <a href={`tel:${CONTACT_INFO.phone.replace(/\s/g, "")}`} className="hover:underline">
                      {CONTACT_INFO.phone}
                    </a>
                    <br />
                    {CONTACT_INFO.workingHours}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="soft-box bg-[#ede986] p-6 shadow-none">
              <CardContent className="flex items-center gap-6 p-0">
                <div className="flex shrink-0 items-center justify-center">
                  <Mail className="h-8 w-8 text-[#e7bef8]" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="mb-1 font-heading text-2xl font-bold text-foreground">Email</h3>
                  <p className="font-sans text-lg font-normal text-[#4A4A4A]">
                    <a 
                      href={`https://mail.google.com/mail/?view=cm&fs=1&to=${CONTACT_INFO.email}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="hover:underline"
                    >
                      {CONTACT_INFO.email}
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </footer>
  )
}
