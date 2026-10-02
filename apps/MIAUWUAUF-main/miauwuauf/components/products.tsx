"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LucideIcon, Activity, Loader2, Smartphone, QrCode, MapPin, Heart, Shield, ShieldCheck, Dog, Cat, Star, CheckCircle, SmartphoneNfc, Zap, Bell, Camera, Stethoscope, Award, Clock, Globe, Lock } from "lucide-react"

const IconMap: Record<string, LucideIcon> = {
  Activity, Smartphone, QrCode, MapPin, Heart, Shield, ShieldCheck, Dog, Cat, Star, CheckCircle, SmartphoneNfc, Zap, Bell, Camera, Stethoscope, Award, Clock, Globe, Lock
}
import { useEffect, useState } from "react"
import Image from "next/image"
import { Plan, TechFeature, SectionContent } from "@/lib/admin-service"
import React from "react"

const planBadgeClass = "border-[3px] border-[#000000] bg-[#EDE986] font-black text-[#000000] shadow-[3px_3px_0px_0px_#000000]"
const TECH_BENEFITS_SECTION_ID = "products-tech-benefits"
function normalizeWhatsappPhone(rawPhone: string): string {
  const trimmed = rawPhone.trim()
  if (!trimmed) return ""
  return trimmed.replace(/[^\d+]/g, "")
}

function buildPlanWhatsappUrl(plan: Plan, rawPhone: string, whatsappDetails?: string): string {
  const phone = normalizeWhatsappPhone(rawPhone)
  if (!phone) return "/login"

  const featureLines = plan.features.map((feature) => `- ${feature}`).join("\n")
  const message = [
    "Hola, quiero elegir este plan:",
    "",
    `Plan: ${plan.name}`,
    `Precio: ${plan.price} ${plan.billingCycle || ""}`.trim(),
    `Descripcion: ${plan.description}`,
    "",
    "Caracteristicas:",
    featureLines || "- Sin caracteristicas registradas",
    whatsappDetails?.trim() ? "" : null,
    whatsappDetails?.trim() ? "Informacion adicional:" : null,
    whatsappDetails?.trim() ? whatsappDetails.trim() : null,
  ].filter((line): line is string => Boolean(line)).join("\n")

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

/** En escritorio WhatsApp puede abrirse en nueva pestaña; en móvil misma vista → wa.me delega directo a la app sin pestaña extra. */
function useWhatsAppOpensInNewTabForDesktop(): boolean {
  const [openInNewTab, setOpenInNewTab] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    const sync = () => setOpenInNewTab(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])
  return openInNewTab
}

export default function Products() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [techFeatures, setTechFeatures] = useState<TechFeature[]>([])
  const [sections, setSections] = useState<SectionContent[]>([])
  const [planWhatsappPhone, setPlanWhatsappPhone] = useState("")
  const [planWhatsappDetails, setPlanWhatsappDetails] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const whatsappNewTabDesktop = useWhatsAppOpensInNewTabForDesktop()
  const techBenefitsSection = sections.find((section) => section.sectionId === TECH_BENEFITS_SECTION_ID)

  useEffect(() => {
    const fetchAllContent = async () => {
      try {
        const [resPlans, resTech, resSections, resPlanContact, resPlanWhatsappDetails] = await Promise.all([
          fetch("/api/plans"),
          fetch("/api/tech-features"),
          fetch("/api/section-content"), // Updated to fetch all
          fetch("/api/plan-contact"),
          fetch("/api/plan-whatsapp-details"),
        ])

        if (resPlans.ok) {
          const data = await resPlans.json()
          setPlans(data)
        }
        
        if (resTech.ok) {
          const data = await resTech.json()
          setTechFeatures(data)
        }

        if (resSections.ok) {
          const data = await resSections.json()
          // Ensure it's an array and has at least the default if empty
          if (Array.isArray(data) && data.length > 0) {
            setSections(data)
          } else {
            setSections([{
              sectionId: "products-plans",
              badge: "TECNOLOGÍA INNOVADORA",
              title: "Planes de Protección",
              subtitle: "Elige el plan perfecto para la seguridad y bienestar de tu mejor amigo"
            }])
          }
        }

        if (resPlanContact.ok) {
          const data = await resPlanContact.json() as { phone?: string }
          setPlanWhatsappPhone(data.phone?.trim() || "")
        } else {
          setPlanWhatsappPhone("")
        }

        if (resPlanWhatsappDetails.ok) {
          const data = (await resPlanWhatsappDetails.json()) as Array<{ planId: string; details: string }>
          const detailsByPlan = data.reduce<Record<string, string>>((acc, row) => {
            if (row.planId) acc[row.planId] = row.details || ""
            return acc
          }, {})
          setPlanWhatsappDetails(detailsByPlan)
        } else {
          setPlanWhatsappDetails({})
        }
      } catch (error) {
        console.error("Error fetching landing products content:", error)
        setPlanWhatsappPhone("")
        setPlanWhatsappDetails({})
      } finally {
        setLoading(false)
      }
    }

    fetchAllContent()
  }, [])

  return (
    <section id="productos" className="relative pb-10 pt-5 md:pb-14 md:pt-6">
      <div className="container mx-auto px-4 relative z-10 max-w-7xl">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {sections.map((section, sIdx) => {
              const sectionPlans = plans.filter(p => p.sectionId === section.sectionId || (!p.sectionId && section.sectionId === "products-plans"))
              
              if (sectionPlans.length === 0 && sections.length > 1) return null;

              return (
                <div key={section.sectionId || sIdx} className="mb-14 animate-fade-in-up last:mb-0 md:mb-16">
                  <div className="mb-8 space-y-3 text-center md:mb-10 md:space-y-4">
                    <div className="inline-block">
                      <span className="section-title-pill">
                        {section.badge || "MIAUWUAUF"}
                      </span>
                    </div>
                    <h2 className="text-3xl sm:text-5xl md:text-7xl font-black text-balance tracking-tight text-[#000000]">
                      {section.title || "Nuestros Planes"}
                    </h2>
                    <p className="text-xl text-[#000000]/70 max-w-2xl mx-auto text-pretty leading-relaxed font-bold">
                      {section.subtitle}
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-center gap-8 items-start">
                    {sectionPlans.map((plan, index) => {
                      const planWhatsappUrl = buildPlanWhatsappUrl(
                        plan,
                        planWhatsappPhone,
                        planWhatsappDetails[plan.id],
                      )
                      const isWhatsappUrl = planWhatsappUrl.startsWith("https://wa.me/")
                      const whatsappOpenNewTab =
                        isWhatsappUrl && whatsappNewTabDesktop
                      return (
                        <Card
                          key={plan.id}
                          className="group relative flex w-full max-w-[19rem] flex-col overflow-hidden rounded-[3rem] border-[3px] border-[#000000] bg-[#e7bef8] text-[#000000] shadow-[8px_8px_0px_0px_#000000] transition-all duration-300 hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_#000000]"
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <CardHeader className="flex-grow-0 space-y-4 px-8 pb-6 pt-10">
                            {plan.badge && plan.badge.trim() ? (
                              <div className="flex items-start justify-between">
                                <Badge className={`rounded-full px-6 py-2 text-xs uppercase tracking-[0.2em] ${planBadgeClass}`}>
                                  {plan.badge}
                                </Badge>
                              </div>
                            ) : null}
                            <div className="space-y-2">
                              <CardTitle className="text-3xl font-black break-words leading-tight">{plan.name}</CardTitle>
                              <div className="flex items-baseline gap-1.5 flex-wrap">
                                <span className="text-4xl md:text-5xl font-black text-[#000000] tracking-tighter break-all">{plan.price}</span>
                                <span className="text-[#000000]/40 font-bold text-sm tracking-tight">{plan.billingCycle || "/mes"}</span>
                              </div>
                            </div>
                            <CardDescription className="text-base text-[#000000]/60 font-medium leading-relaxed break-words">{plan.description}</CardDescription>
                          </CardHeader>
                          <CardContent className="flex flex-col p-8 pt-0 gap-6">
                            <div className="space-y-3">
                              {plan.features.map((feature, idx) => (
                                <div key={idx} className="flex items-start gap-3 text-sm font-bold text-[#000000]/80">
                                  <div className="mt-1 h-3 w-3 flex-shrink-0 rounded-full border-[2px] border-[#000000] bg-[#EDE986]" />
                                  <span className="opacity-90 leading-snug">{feature}</span>
                                </div>
                              ))}
                            </div>
                            <Button
                              size="lg"
                              className="w-full rounded-[2rem] border-[3px] border-[#000000] bg-[#e7bef8] py-8 text-xl font-black text-[#000000] shadow-[6px_6px_0px_0px_#000000] transition-all duration-300 hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#EDE986] hover:shadow-[3px_3px_0px_0px_#000000] active:translate-y-[1px] active:shadow-none"
                              asChild
                            >
                              <a
                                href={planWhatsappUrl}
                                target={whatsappOpenNewTab ? "_blank" : undefined}
                                rel={
                                  whatsappOpenNewTab ? "noopener noreferrer" : undefined
                                }
                              >
                                Elegir Plan
                              </a>
                            </Button>
                          </CardContent>
                        </Card>
                      )
                    })}
                    {sectionPlans.length === 0 && (
                      <div className="col-span-full text-center py-10 opacity-30 font-bold italic">
                        Próximamente más planes en esta sección...
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            <div className="mb-8 space-y-2 text-center md:mb-10 md:space-y-3">
              <h3
                className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-[0.12em] text-[#EDE986]"
              >
                {techBenefitsSection?.title || "Beneficios Tecnologicos"}
              </h3>
              <p className="text-base sm:text-lg text-[#000000]/70 font-bold max-w-2xl mx-auto">
                {techBenefitsSection?.subtitle || "Funciones inteligentes para el cuidado y seguimiento de tu mascota."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {techFeatures.map((feature, index) => {
                const IconComponent = IconMap[feature.iconName || "Activity"] || Activity

                return (
                  <Card
                    key={feature.id}
                    className="group flex animate-fade-in-up flex-col items-stretch gap-0 overflow-hidden rounded-2xl border-[3px] border-[#000000] bg-[#e7bef8] p-0 text-center shadow-[6px_6px_0px_0px_#000000] transition-all duration-300 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#000000]"
                    style={{ animationDelay: `${0.4 + index * 0.1}s` }}
                  >
                    <div className="flex items-center justify-center border-b-[3px] border-[#000000] bg-[#e7bef8] px-6 py-5">
                      <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-[3px] border-[#000000] bg-white shadow-[4px_4px_0px_0px_#000000] transition-colors duration-200 group-hover:bg-[#EDE986]">
                        {feature.customIcon ? (
                          <Image src={feature.customIcon} alt={feature.title} fill className="object-contain p-2" />
                        ) : (
                          <IconComponent
                            className="h-10 w-10 text-[#4A4A4A] transition-colors duration-200 group-hover:text-[#000000]"
                            strokeWidth={2}
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col bg-white p-8 pt-6 text-center">
                    <CardTitle className="text-2xl font-black mb-4 text-[#000000]">{feature.title}</CardTitle>
                    <CardDescription className="text-base text-[#000000]/70 font-bold leading-relaxed">{feature.description}</CardDescription>
                    </div>
                  </Card>
                )
              })}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
