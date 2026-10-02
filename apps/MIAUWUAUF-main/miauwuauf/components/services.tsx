import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Heart, Shield, Smartphone } from "lucide-react"

const services = [
  {
    icon: Shield,
    title: "Vacunación y Control",
    description: "Programa completo de vacunación con seguimiento personalizado y recordatorios automáticos",
    href: "#vaccination",
  },
  {
    icon: Calendar,
    title: "Eventos de Salud",
    description: "Jornadas de vacunación gratuitas y eventos comunitarios para el cuidado animal",
    href: "#events",
  },
  {
    icon: Heart,
    title: "Centro de Acogida",
    description: "Refugio seguro y amoroso para animales en situación de abandono",
    href: "#adoption",
  },
  {
    icon: Smartphone,
    title: "Tecnología GPS",
    description: "Collares inteligentes con GPS y código QR para localización de mascotas",
    href: "#products",
  },
]

export default function Services() {
  return (
    <section id="servicios" className="relative py-12 md:py-16">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-8 animate-fade-in-up space-y-3 text-center md:mb-10 md:space-y-4">
          <div className="inline-block">
            <span className="section-title-pill">
              LO QUE OFRECEMOS
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl md:text-7xl font-black text-balance tracking-tight text-[#000000]">Vacunacion y Control</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty leading-relaxed">
            Mantén a tu mascota protegida con nuestro sistema de vacunacion y control veterinario
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <Link key={index} href={service.href} className="block h-full">
              <Card
                className="group h-full cursor-pointer border-[3px] border-[#000000] bg-[#e7bef8] shadow-[6px_6px_0px_0px_#000000] transition-all duration-300 animate-scale-in hover:-translate-y-2 hover:shadow-[8px_8px_0px_0px_#000000]"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardHeader className="space-y-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-[#000000] bg-white shadow-[4px_4px_0px_0px_#000000] transition-colors duration-200 group-hover:bg-[#EDE986]">
                    <service.icon className="h-8 w-8 text-[#4A4A4A] transition-colors duration-200 group-hover:text-[#000000]" strokeWidth={2.5} />
                  </div>
                  <CardTitle className="text-2xl font-bold text-[#000000] transition-colors group-hover:text-[#000000]">
                    {service.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base font-medium leading-relaxed text-[#000000]/85">
                    {service.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
