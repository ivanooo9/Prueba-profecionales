"use client"

import Link from "next/link"
import Image from "next/image"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { BookOpenText, HelpCircle, LogIn, Menu, Sparkles, X } from "lucide-react"
import { normalizeHexColor } from "@/lib/store-settings"

const HERO_MOBILE_NAV_ID = "miauwuauf-hero-mobile-nav"

function hideHeroMobileNav(el: HTMLElement | null) {
  const anyEl = el as HTMLElement & { hidePopover?: () => void }
  anyEl?.hidePopover?.()
}

type HeroExplainerContent = {
  heading: string
  whatIsTitle: string
  whatIsDescription: string
  howToUseTitle: string
  howToUseDescription: string
  shortDescriptionTitle: string
  shortDescription: string
  whatIsCardBg: string
  howToUseCardBg: string
  shortDescriptionCardBg: string
}

const defaultExplainerContent: HeroExplainerContent = {
  heading: "¿Qué es y cómo se usa MIAUWUAUF?",
  whatIsTitle: "¿Qué es?",
  whatIsDescription: "Una plataforma para cuidar mascotas con citas, recordatorios y adopción responsable.",
  howToUseTitle: "¿Cómo se usa?",
  howToUseDescription: "Registra tu mascota, agenda servicios y sigue todo desde un solo lugar.",
  shortDescriptionTitle: "Descripción breve",
  shortDescription: "Conectamos familias, veterinarios y tecnología para un cuidado más simple y humano.",
  whatIsCardBg: "#e7bef8",
  howToUseCardBg: "#ede986",
  shortDescriptionCardBg: "#9bf6ff",
}

export default function Hero() {
  const [explainerContent, setExplainerContent] = useState<HeroExplainerContent>(defaultExplainerContent)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const mobileNavPopoverRef = useRef<HTMLDivElement>(null)

  const closeMobileNav = useCallback(() => {
    hideHeroMobileNav(mobileNavPopoverRef.current)
  }, [])

  // Cerrado al montar (evita estado raro) y asegura que utilities CSS no dejen el panel "siempre flex".
  useLayoutEffect(() => {
    hideHeroMobileNav(mobileNavPopoverRef.current)
  }, [])

  useEffect(() => {
    const el = mobileNavPopoverRef.current
    if (!el) return
    const onToggle = (e: Event) => {
      const te = e as ToggleEvent
      if (te.newState === "open" || te.newState === "closed") {
        setMobileNavOpen(te.newState === "open")
      }
    }
    el.addEventListener("toggle", onToggle)
    return () => el.removeEventListener("toggle", onToggle)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    const closeIfDesktop = () => {
      if (mq.matches) {
        hideHeroMobileNav(mobileNavPopoverRef.current)
        setMobileNavOpen(false)
      }
    }
    closeIfDesktop()
    mq.addEventListener("change", closeIfDesktop)
    return () => mq.removeEventListener("change", closeIfDesktop)
  }, [])

  useEffect(() => {
    const loadExplainerContent = async () => {
      try {
        const res = await fetch("/api/section-content?sectionId=home-hero-explainer", {
          cache: "no-store",
        })
        if (!res.ok) return
        const data = await res.json()
        const rawSubtitle = typeof data?.subtitle === "string" ? data.subtitle : ""

        let parsedSubtitle: Partial<HeroExplainerContent> = {}
        if (rawSubtitle.trim().startsWith("{")) {
          try {
            parsedSubtitle = JSON.parse(rawSubtitle) as Partial<HeroExplainerContent>
          } catch {
            parsedSubtitle = {}
          }
        }

        setExplainerContent({
          heading: data?.title || parsedSubtitle.heading || defaultExplainerContent.heading,
          whatIsTitle: parsedSubtitle.whatIsTitle || defaultExplainerContent.whatIsTitle,
          whatIsDescription:
            parsedSubtitle.whatIsDescription || defaultExplainerContent.whatIsDescription,
          howToUseTitle: parsedSubtitle.howToUseTitle || defaultExplainerContent.howToUseTitle,
          howToUseDescription:
            parsedSubtitle.howToUseDescription || defaultExplainerContent.howToUseDescription,
          shortDescriptionTitle:
            parsedSubtitle.shortDescriptionTitle || defaultExplainerContent.shortDescriptionTitle,
          shortDescription:
            parsedSubtitle.shortDescription || defaultExplainerContent.shortDescription,
          whatIsCardBg: normalizeHexColor(
            parsedSubtitle.whatIsCardBg,
            defaultExplainerContent.whatIsCardBg,
          ),
          howToUseCardBg: normalizeHexColor(
            parsedSubtitle.howToUseCardBg,
            defaultExplainerContent.howToUseCardBg,
          ),
          shortDescriptionCardBg: normalizeHexColor(
            parsedSubtitle.shortDescriptionCardBg,
            defaultExplainerContent.shortDescriptionCardBg,
          ),
        })
      } catch {
        // Si falla la carga, dejamos el contenido por defecto.
      }
    }

    void loadExplainerContent()
  }, [])

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const targetPosition = element.getBoundingClientRect().top + window.scrollY;
      const isMobile = window.innerWidth < 768;
      
      if (isMobile) {
        // Scroll instantáneo en celular para los usuarios desesperados
        window.scrollTo(0, targetPosition);
      } else {
        // Scroll suave controlado (ni lento como spring, ni teleportado como nativo a veces)
        const start = window.scrollY;
        const distance = targetPosition - start;
        const duration = 800; // 0.8 segundos (rápido y fluido)
        let startTime: number | null = null;

        const animation = (currentTime: number) => {
          if (startTime === null) startTime = currentTime;
          const timeElapsed = currentTime - startTime;
          const run = easeInOutQuad(timeElapsed, start, distance, duration);
          window.scrollTo(0, run);
          if (timeElapsed < duration) requestAnimationFrame(animation);
        };

        // Función de easing para suavidad profesional
        function easeInOutQuad(t: number, b: number, c: number, d: number) {
          t /= d / 2;
          if (t < 1) return (c / 2) * t * t + b;
          t--;
          return (-c / 2) * (t * (t - 2) - 1) + b;
        }

        requestAnimationFrame(animation);
      }

      // Update hash in URL without jumping
      window.history.pushState(null, "", `#${id}`);
    }
  };

  return (
    <section className="relative z-[1] flex min-h-0 items-start justify-center overflow-visible bg-transparent pb-4 pt-6 md:pb-5">

      {/* Top Navigation: hamburger + sheet (móvil) | tres botones (md+) */}
      <nav className="pointer-events-none absolute left-0 right-0 top-0 z-50 flex justify-end px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] md:px-12 md:py-10 md:pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-center gap-3 md:gap-5">
          {/* Solo móvil: en md+ este bloque no existe en el layout (evita menú lateral en escritorio) */}
          <div className="max-md:contents md:hidden max-md:has-[#miauwuauf-hero-mobile-nav:popover-open]:[&>button]:invisible max-md:has-[#miauwuauf-hero-mobile-nav:popover-open]:[&>button]:pointer-events-none">
            <button
              type="button"
              id={`${HERO_MOBILE_NAV_ID}-trigger`}
              popoverTarget={HERO_MOBILE_NAV_ID}
              aria-label="Abrir menú"
              aria-expanded={mobileNavOpen}
              aria-controls={HERO_MOBILE_NAV_ID}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[3px] border-[#000000] bg-[#E7BEF8] text-[#000000] shadow-[4px_4px_0px_0px_#000000] transition-opacity duration-150 hover:bg-[#EDE986] active:translate-x-px active:translate-y-px active:shadow-[2px_2px_0px_0px_#000000]"
            >
              <Menu className="h-7 w-7" strokeWidth={3} />
            </button>
            <div
              ref={mobileNavPopoverRef}
              id={HERO_MOBILE_NAV_ID}
              popover="auto"
              role="dialog"
              aria-labelledby={`${HERO_MOBILE_NAV_ID}-title`}
              className="fixed top-0 bottom-0 left-auto right-0 z-[200] m-0 box-border hidden min-h-[100dvh] w-[min(20rem,100dvw)] max-w-none flex-col border-0 border-l-[3px] border-[#000000] bg-[#f2619c] p-5 pt-[max(0.75rem,env(safe-area-inset-top))] text-left shadow-none [&:popover-open]:flex [&:popover-open]:animate-in [&:popover-open]:slide-in-from-right [&:popover-open]:duration-300 md:!hidden [&::backdrop]:bg-black/65"
            >
            <button
              type="button"
              popoverTarget={HERO_MOBILE_NAV_ID}
              popoverTargetAction="hide"
              aria-label="Cerrar menú"
              className="absolute right-4 top-[max(0.75rem,env(safe-area-inset-top))] z-20 flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-[#000000] bg-white text-[#000000] shadow-[4px_4px_0px_0px_#000000] transition-transform active:translate-x-px active:translate-y-px active:shadow-[2px_2px_0px_0px_#000000]"
            >
              <X className="h-6 w-6" strokeWidth={3} />
            </button>
            <div className="mt-12 pr-14">
              <h2 id={`${HERO_MOBILE_NAV_ID}-title`} className="font-heading text-xl font-black text-[#000000]">
                Menú
              </h2>
            </div>
            <div className="mt-8 flex flex-col gap-3 pr-2">
              <Button
                className="h-auto w-full justify-start rounded-full border-[3px] border-[#000000] bg-[#E7BEF8] py-4 pl-5 text-left font-heading text-lg font-bold text-[#000000] shadow-[4px_4px_0px_0px_#000000]"
                asChild
              >
                <Link href="/blog" onClick={closeMobileNav}>
                  Blog
                </Link>
              </Button>
              <Button
                className="h-auto w-full justify-start rounded-full border-[3px] border-[#000000] bg-[#E7BEF8] py-4 pl-5 text-left font-heading text-lg font-bold text-[#000000] shadow-[4px_4px_0px_0px_#000000]"
                asChild
              >
                <Link href="/tienda" onClick={closeMobileNav}>
                  Tienda
                </Link>
              </Button>
              <Button
                className="h-auto w-full justify-start rounded-full border-[3px] border-[#000000] bg-[#E7BEF8] py-4 pl-5 text-left font-heading text-xl font-black text-[#000000] shadow-[5px_5px_0px_0px_#000000]"
                asChild
              >
                <Link href="/login" className="flex items-center gap-2" onClick={closeMobileNav}>
                  <LogIn className="h-5 w-5 shrink-0" strokeWidth={3} />
                  Iniciar Sesión
                </Link>
              </Button>
            </div>
            </div>
          </div>

          <Button
            className="hidden border-[3px] border-[#000000] bg-[#E7BEF8] text-[#000000] transition-all duration-200 hover:bg-[#EDE986] md:inline-flex font-heading font-bold text-lg md:text-xl px-4 md:px-6 py-5 md:py-6 rounded-full shadow-[4px_4px_0px_0px_#000000] hover:shadow-[4px_4px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px]"
            asChild
          >
            <Link href="/blog">Blog</Link>
          </Button>
          <Button
            className="hidden border-[3px] border-[#000000] bg-[#E7BEF8] text-[#000000] transition-all duration-200 hover:bg-[#EDE986] md:inline-flex font-heading font-bold text-lg md:text-xl px-4 md:px-6 py-5 md:py-6 rounded-full shadow-[4px_4px_0px_0px_#000000] hover:shadow-[4px_4px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px]"
            asChild
          >
            <Link href="/tienda">Tienda</Link>
          </Button>
          <Button
            className="hidden border-[3px] border-[#000000] bg-[#E7BEF8] text-[#000000] transition-all duration-200 hover:bg-[#EDE986] md:flex font-heading font-black text-xl md:text-2xl px-6 md:px-8 py-5 md:py-7 rounded-full shadow-[5px_5px_0px_0px_#000000] hover:shadow-[5px_5px_0px_0px_#000000] hover:translate-x-[3px] hover:translate-y-[3px]"
            asChild
          >
            <Link href="/login" className="flex items-center">
              <LogIn className="mr-2 h-5 w-5 md:h-6 md:w-6" strokeWidth={3} />
              Iniciar Sesión
            </Link>
          </Button>
        </div>
      </nav>

      <div className="container relative z-10 mx-auto max-w-7xl px-4 pb-3 pt-[calc(1.5rem+env(safe-area-inset-top))] text-center md:pb-4 md:pt-24 lg:pt-28">
        <div className="mx-auto max-w-5xl animate-fade-in-up space-y-2 md:space-y-3 lg:space-y-4">


          <div className="mb-0 flex w-full justify-center px-4">
            <div className="relative mx-auto aspect-[2.35/1] w-full max-w-[min(96vw,26rem)] overflow-hidden md:aspect-[3/1] md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mt-[-0.75rem] md:mt-[-2rem]">
              <div 
                className="absolute inset-0 flex items-center justify-center scale-[2.05] md:scale-[2.2]"
                style={{ mixBlendMode: 'multiply' }}
              >
                <Image
                  src="/logoAmarillo.PNG"
                  alt="MIAUWUAUF Logo"
                  width={1600}
                  height={1600}
                  className="object-contain w-full h-full"
                  priority
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 md:space-y-4">
            <p className="text-xl md:text-3xl lg:text-4xl font-black text-[#000000] text-balance font-heading tracking-tight leading-tight">
              Cuidado, amor y tecnología <br className="hidden md:block" /> para tus mejores amigos
            </p>

            <p className="text-base md:text-lg lg:text-xl text-[#000000]/70 max-w-2xl mx-auto text-pretty leading-relaxed font-bold font-body">
              Vacunación, adopción responsable <br className="hidden sm:block" /> y SaaS para veterinarios
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center items-center pt-2">
            <Button
              size="lg"
              className="text-lg md:text-xl px-8 md:px-12 py-6 md:py-8 font-black rounded-[2rem] border-[3px] border-[#000000] bg-[#E7BEF8] text-[#000000] shadow-[6px_6px_0px_0px_#000000] md:shadow-[8px_8px_0px_0px_#000000] transition-all duration-200 hover:bg-[#EDE986] hover:shadow-[4px_4px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px]"
              asChild
            >
              <Link href="#servicios" onClick={(e) => handleScroll(e, "servicios")}>Explorar Servicios</Link>
            </Button>
            <Button
              size="lg"
              className="text-lg md:text-xl px-8 md:px-12 py-6 md:py-8 font-black rounded-[2rem] border-[3px] border-[#000000] bg-[#E7BEF8] text-[#000000] shadow-[6px_6px_0px_0px_#000000] md:shadow-[8px_8px_0px_0px_#000000] transition-all duration-200 hover:bg-[#EDE986] hover:shadow-[4px_4px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px]"
              asChild
            >
              <Link href="#adopcion" onClick={(e) => handleScroll(e, "adopcion")}>Adoptar Ahora</Link>
            </Button>
          </div>

          <div className="mx-auto mt-4 w-[min(92vw,980px)] px-2 md:mt-4">
            <h3 className="mb-2 text-center font-heading text-lg font-black text-[#000000] md:mb-3 md:text-2xl">
              {explainerContent.heading}
            </h3>

            <div className="grid gap-3 md:grid-cols-3 md:gap-4 md:items-start">
              <article
                className="flex flex-col rounded-2xl border-[2px] border-[#000000] p-4 shadow-[3px_3px_0px_0px_#000000] text-left"
                style={{ backgroundColor: explainerContent.whatIsCardBg }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 shrink-0" />
                  <h4 className="font-black text-[#000000]">{explainerContent.whatIsTitle}</h4>
                </div>
                <p className="text-sm font-bold text-[#000000]/80 leading-relaxed whitespace-pre-wrap">{explainerContent.whatIsDescription}</p>
              </article>

              <article
                className="flex flex-col rounded-2xl border-[2px] border-[#000000] p-4 shadow-[3px_3px_0px_0px_#000000] text-left"
                style={{ backgroundColor: explainerContent.howToUseCardBg }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <BookOpenText className="h-4 w-4 shrink-0" />
                  <h4 className="font-black text-[#000000]">{explainerContent.howToUseTitle}</h4>
                </div>
                <p className="text-sm font-bold text-[#000000]/80 leading-relaxed whitespace-pre-wrap">
                  {explainerContent.howToUseDescription}
                </p>
              </article>

              <article
                className="flex flex-col rounded-2xl border-[2px] border-[#000000] p-4 shadow-[3px_3px_0px_0px_#000000] text-left"
                style={{ backgroundColor: explainerContent.shortDescriptionCardBg }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <h4 className="font-black text-[#000000]">
                    {explainerContent.shortDescriptionTitle}
                  </h4>
                </div>
                <p className="text-sm font-bold text-[#000000]/80 leading-relaxed whitespace-pre-wrap">
                  {explainerContent.shortDescription}
                </p>
              </article>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

