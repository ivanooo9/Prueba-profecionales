import { bubbleFont } from "@/lib/fonts"
import { Sparkles, PawPrint } from "lucide-react"
import { cn } from "@/lib/utils"

interface BrandLogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
  showSparkles?: boolean | "left" | "right"
  showTienda?: boolean
  showBadge?: boolean
  badgeText?: string
  logoColor?: "yellow" | "black"
}

export function BrandLogo({
  className = "",
  size = "md",
  showSparkles = true,
  showTienda = true,
  showBadge = true,
  badgeText = "TIENDA",
  logoColor = "yellow",
}: BrandLogoProps) {
  const pawSizeClasses = {
    sm: "h-3 w-3 text-[#4A4A4A]",
    md: "h-4 w-4 text-[#4A4A4A] md:h-6 md:w-6",
    lg: "h-4 w-4 text-[#4A4A4A] md:h-6 md:w-6",
  }

  const wordSizes = {
    sm: "text-2xl md:text-3xl tracking-tight",
    md: "text-4xl md:text-5xl lg:text-6xl tracking-tight",
    lg: "text-5xl md:text-7xl lg:text-8xl tracking-tight",
  }

  const tiendaSizeClasses = {
    sm: "text-lg md:text-2xl",
    md: "text-3xl md:text-5xl",
    lg: "text-4xl md:text-6xl",
  }

  const safeSize = wordSizes[size] ? size : "md"

  return (
    <div className={cn("relative flex items-center gap-2 md:gap-4 font-heading font-black tracking-[-0.05em] text-[#000000]", className)}>
      {showTienda && (
        <div className="relative shrink-0 mr-1 md:mr-2">
          {/* Shadow Box */}
          <div
            className={`-rotate-3 translate-x-[4px] translate-y-[4px] bg-[#000000] rounded-sm sm:rounded-md px-1.5 py-0.5 sm:px-3 sm:py-1`}
          >
            <span className={cn(tiendaSizeClasses[safeSize], "select-none opacity-0 font-black")}>
              {badgeText}
            </span>
          </div>
          {/* Main Box */}
          <div
            className={`absolute top-0 left-0 -rotate-3 bg-[#e7bef8] rounded-sm sm:rounded-md px-1.5 py-0.5 sm:px-3 sm:py-1 border-[2px] border-[#000000]`}
          >
            <span className={cn(tiendaSizeClasses[safeSize], "select-none text-white font-black leading-none")}>
              {badgeText}
            </span>
          </div>
          
          {showBadge && (
            <div
              className={cn("absolute z-20 -rotate-12 transition-transform duration-500 hover:rotate-12", safeSize === 'sm' ? '-top-3 -left-4' : '-top-5 -left-6')}
            >
              <div
                className={`group/badge flex items-center justify-center transition-colors bg-white hover:bg-[#EDE986] border-[2.5px] border-[#000000] shadow-[3px_3px_0px_0px_#000000] p-1 sm:p-2 rounded-xl`}
              >
                <PawPrint
                  className={cn(pawSizeClasses[safeSize], "transition-colors group-hover/badge:text-[#000000]")}
                  strokeWidth={3}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className={`relative ml-3 flex flex-col items-center rotate-3 md:ml-6 shrink-0`}>
        {showSparkles && (
          <Sparkles
            className={cn("absolute z-30 animate-bounce text-[#e7bef8]", safeSize === "sm" ? "-right-2 -top-2 h-3 w-3" : "-right-4 -top-4 h-5 w-5")}
          />
        )}
        {/* Shadow Layer */}
        <span
          className={cn(bubbleFont?.className || "font-sans", wordSizes[safeSize], logoColor === "yellow" ? "text-[#000000]" : "text-[#EDE986]", "select-none translate-x-[4px] translate-y-[4px]")}
          aria-hidden="true"
        >
          MIAUWUAUF
        </span>
        {/* Main Layer */}
        <span
          className={cn(bubbleFont?.className || "font-sans", wordSizes[safeSize], "absolute top-0 left-0 select-none font-black", logoColor === "yellow" ? "text-[#EDE986]" : "text-[#000000]")}
          style={{ 
            WebkitTextStroke: logoColor === "yellow" ? "2px #000000" : "2px #000000",
            paintOrder: "stroke fill"
          }}
        >
          MIAUWUAUF
        </span>
      </div>
    </div>
  )
}
