"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

interface LogoHorizontalProps {
  className?: string
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  priority?: boolean
  variant?: "black" | "yellow"
}

/**
 * LogoHorizontal Component
 * Uses logoLargoAmarillo.PNG with a zoom-and-crop effect.
 */
export function LogoHorizontal({ 
  className, 
  size = "md", 
  priority = false,
  variant = "black"
}: LogoHorizontalProps) {
  
  const sizeClasses = {
    xs: "w-[80px] aspect-[4/1]",
    sm: "w-[140px] aspect-[4/1]",
    md: "w-[220px] aspect-[4/1]",
    lg: "w-[300px] aspect-[4/1]",
    xl: "w-[450px] aspect-[4/1]",
  }

  const zoomClasses = {
    xs: "scale-[1.6]",
    sm: "scale-[1.7]",
    md: "scale-[1.8]",
    lg: "scale-[1.9]",
    xl: "scale-[2.0]",
  }

  // Fallback lookups to prevent 'undefined' access errors
  const safeSizeClass = sizeClasses[size] || sizeClasses["md"]
  const safeZoomClass = zoomClasses[size] || zoomClasses["md"]

  return (
    <div className={cn("relative w-full overflow-hidden", safeSizeClass, className)}>
      <div 
        className={cn("absolute inset-0 flex items-center justify-center", safeZoomClass)}
        style={{ 
          mixBlendMode: variant === "black" ? 'multiply' : 'normal',
        }}
      >
        <Image
          src="/logoLargoAmarillo.PNG"
          alt="MIAUWUAUF Logo"
          width={800}
          height={200}
          className={cn(
            "object-contain w-full h-full",
            variant === "black" && "brightness-0"
          )}
          style={variant === "yellow" ? {
            filter: 'brightness(0) saturate(100%) invert(92%) sepia(34%) saturate(601%) hue-rotate(348deg) brightness(103%) contrast(101%)'
          } : {}}
          priority={priority}
        />
      </div>
    </div>
  )
}
