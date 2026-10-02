"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

function errorMessage(error: unknown): string {
  if (error == null) {
    return "Error desconocido. Si persiste, recarga la página o vuelve al inicio."
  }
  if (error instanceof Error && error.message?.trim()) {
    return error.message
  }
  if (typeof error === "string" && error.trim()) {
    return error
  }
  if (typeof error === "object" && error !== null && "digest" in error) {
    const d = (error as { digest?: string }).digest
    if (typeof d === "string" && d) return `Error de aplicación (ref: ${d})`
  }
  try {
    const s = String(error)
    if (s && s !== "[object Object]") return s
  } catch {
    /* ignore */
  }
  return "Algo salió mal. Puedes reintentar o volver al inicio."
}

export default function AppError({
  error,
  reset,
}: {
  error: unknown
  reset: () => void
}) {
  const message = errorMessage(error)

  useEffect(() => {
    console.error("[app/error]", error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 px-4 py-16 font-sans">
      <div className="max-w-md rounded-3xl border-[3px] border-[#000000] bg-[#EDE986] p-8 text-center shadow-[6px_6px_0px_0px_#000000]">
        <h1 className="font-heading text-2xl font-black text-[#000000]">Error</h1>
        <p className="mt-4 text-base font-normal text-[#4A4A4A]">{message}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={() => reset()} className="font-bold">
            Reintentar
          </Button>
          <Button type="button" variant="outline" className="font-bold" asChild>
            <Link href="/">Ir al inicio</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
