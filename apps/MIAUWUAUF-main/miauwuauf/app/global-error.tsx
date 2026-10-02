"use client"

import { useEffect } from "react"

function messageFrom(maybe: unknown): string {
  if (maybe == null) {
    return "Error crítico. Prueba a recargar la página."
  }
  if (maybe instanceof Error && maybe.message?.trim()) {
    return maybe.message
  }
  if (typeof maybe === "string" && maybe.trim()) {
    return maybe
  }
  return "Error crítico. Prueba a recargar la página."
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const text = messageFrom(error)

  useEffect(() => {
    console.error("[global-error]", error)
  }, [error])

  return (
    <html lang="es">
      <body className="m-0 flex min-h-dvh items-center justify-center bg-[#fdfaf5] p-4 font-sans text-[#000]">
        <div className="max-w-md rounded-3xl border-[3px] border-[#000] bg-[#EDE986] p-8 text-center shadow-[6px_6px_0_0_#000]">
          <h1 className="text-2xl font-black">Algo falló en la app</h1>
          <p className="mt-4 text-sm text-[#4a4a4a]">{text}</p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-8 inline-flex rounded-2xl border-[3px] border-[#000] bg-white px-6 py-3 text-sm font-bold shadow-[3px_3px_0_0_#000]"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}
