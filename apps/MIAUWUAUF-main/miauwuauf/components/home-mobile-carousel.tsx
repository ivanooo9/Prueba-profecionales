"use client"

import type { ReactNode } from "react"
import { useCallback, useEffect, useState } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { cn } from "@/lib/utils"

type HomeMobileCarouselProps = {
  className?: string
  children: ReactNode
  itemCount: number
}

/**
 * Horizontal snap carousel for mobile home sections only.
 * Desktop layout should wrap children in a separate non-carousel container.
 */
export function HomeMobileCarousel({ className, children, itemCount }: HomeMobileCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: false,
  })
  const [selected, setSelected] = useState(0)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelected(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on("select", onSelect)
    emblaApi.on("reInit", onSelect)
    return () => {
      emblaApi.off("select", onSelect)
      emblaApi.off("reInit", onSelect)
    }
  }, [emblaApi, onSelect])

  if (itemCount === 0) return null

  return (
    <div className={cn("md:hidden", className)}>
      {/* px/py en el viewport para que bordes y sombras neo no se recorten con overflow-hidden */}
      <div className="overflow-hidden px-3 pb-1 pt-2" ref={emblaRef}>
        <div className="flex touch-pan-x [-webkit-overflow-scrolling:touch]">
          {children}
        </div>
      </div>
      {itemCount > 1 ? (
        <div className="mt-3 flex justify-center gap-2 pb-1">
          {Array.from({ length: itemCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir al elemento ${i + 1}`}
              aria-current={selected === i ? "true" : undefined}
              onClick={() => emblaApi?.scrollTo(i)}
              className={cn(
                "h-2.5 w-2.5 rounded-full border-2 border-[#000000] shadow-[1px_1px_0px_0px_#000000] transition-transform",
                selected === i ? "scale-125 bg-[#E7BEF8]" : "bg-white"
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** One slide: fixed width for mobile, padding between slides via pl */
export function HomeMobileCarouselSlide({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn("mr-3 min-w-0 shrink-0 grow-0 py-2 last:mr-0", className)}
      style={{ flex: "0 0 min(84vw, 19.5rem)" }}
    >
      {children}
    </div>
  )
}
