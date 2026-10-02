"use client"

import { useState, useEffect } from "react"
import { ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { animate } from "framer-motion"

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false)

  const scrollToTop = () => {
    // Usamos una duración fija para garantizar que siempre sea rápido (0.8 segundos máx)
    animate(window.scrollY, 0, {
      type: "tween",
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1], // Ease Out Expo: comienza rápido y frena suavemente
      onUpdate: (latest) => window.scrollTo(0, latest),
    })
  }

  useEffect(() => {
    // Definimos la función de toggle dentro para que sea estable o usamos la de fuera
    const handleScroll = () => {
      if (window.scrollY > 200) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    // El primer chequeo se hace tras el montaje en el cliente para evitar errores de hidratación
    handleScroll()

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div 
      className={`fixed bottom-6 right-6 md:bottom-10 md:right-10 z-[9999] transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform ${
        isVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-24 opacity-0 scale-50 pointer-events-none"
      }`}
    >
      <Button
        onClick={scrollToTop}
        size="icon"
        className="h-12 w-12 md:h-16 md:w-16 rounded-2xl bg-[#ffadad] border-[3px] border-[#000000] shadow-[4px_4px_0px_0px_#000000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:scale-95 transition-all group"
        aria-label="Volver arriba"
      >
        <ArrowUp className="h-6 w-6 md:h-9 md:w-9 text-[#000000] group-hover:-translate-y-1 transition-transform" />
      </Button>
    </div>
  )
}
