"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface SmartBackButtonProps {
  fallbackUrl?: string
  className?: string
}

/**
 * SmartBackButton
 * Utiliza router.back() si existe historial interno, de lo contrario redirige al fallbackUrl.
 * Diseño: Círculo negro con flecha blanca (Neobrutalismo).
 */
export const SmartBackButton = ({ fallbackUrl = "/", className }: SmartBackButtonProps) => {
  const router = useRouter()

  const handleBack = () => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      const from = urlParams.get("from")

      // Si venimos del perfil, forzamos el regreso al perfil (pestaña compras)
      if (from === "profile") {
        router.push("/mi-mascota?tab=compras")
        return
      }

      // Si existe referrer interno o hay historial suficiente, usamos back para preservar scroll.
      const hasInternalReferrer =
        !!document.referrer && document.referrer.startsWith(window.location.origin)

      if (hasInternalReferrer || window.history.length > 1) {
        router.back()
      } else {
        router.push(fallbackUrl)
      }
    }
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleBack}
      className={cn(
        "rounded-full w-10 h-10 md:w-12 md:h-12 border-[2px] md:border-[3px] border-[#000000] bg-[#000000] text-[#EDE986] shadow-[3px_3px_0px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000000] transition-all group",
        className
      )}
      title="Regresar"
    >
      <ArrowLeft className="h-5 w-5 md:h-6 md:w-6 group-hover:-translate-x-1 transition-transform" />
    </Button>
  )
}
