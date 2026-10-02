"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react"

/**
 * Página pública tras Aceptar/Rechazar en el mail del **dueño**.
 * Así el enlace no manda a /mi-mascota a otra sesión (p. ej. veterinario) por error.
 */
export default function RespuestaPermisoHistorialPage() {
  const sp = useSearchParams()
  const r = sp.get("r") || "invalid"

  const copy: Record<string, { title: string; body: string; icon: ReactNode }> = {
    ok_a: {
      title: "Listo: acceso aceptado",
      body: "Quedó registrado que aceptaste el acceso al historial clínico. El veterinario ya puede verlo según la configuración de la plataforma.",
      icon: <CheckCircle2 className="h-12 w-12 text-[#000]" />,
    },
    ok_r: {
      title: "Listo: solicitud rechazada",
      body: "Se registró tu decisión. El veterinario verá en su panel que el acceso al historial no fue autorizado.",
      icon: <XCircle className="h-12 w-12 text-[#000]" />,
    },
    done: {
      title: "Esta solicitud ya estaba resuelta",
      body: "No se volvió a cambiar nada. Si hace falta, el veterinario puede enviar otra solicitud.",
      icon: <Info className="h-12 w-12 text-[#000]" />,
    },
    invalid: {
      title: "Enlace no válido o vencido",
      body: "Pide otra notificación con el enlace o responde desde el centro de notificaciones (campanita) en tu cuenta MIAUWUAUF.",
      icon: <AlertCircle className="h-12 w-12 text-[#000]" />,
    },
  }

  const c = copy[r] ?? copy.invalid

  return (
    <div className="min-h-[70vh] bg-[#fdfaf5] flex items-center justify-center p-6">
      <div className="max-w-lg w-full border-[4px] border-[#000] bg-[#EDE986] rounded-3xl p-8 shadow-[8px_8px_0_0_#000] text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border-[3px] border-[#000] bg-white shadow-[4px_4px_0_0_#000]">
          {c.icon}
        </div>
        <h1 className="font-heading text-2xl font-black text-[#000] mb-3">{c.title}</h1>
        <p className="text-[#000]/80 font-bold text-sm leading-relaxed mb-8">{c.body}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/mi-mascota?openNotifications=1"
            className="inline-flex items-center justify-center rounded-xl border-[3px] border-[#000] bg-[#93ABD9] px-5 py-3 text-sm font-black text-[#000] shadow-[4px_4px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5"
          >
            Ir a Mi Mascota (dueño)
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border-[3px] border-[#000] bg-white px-5 py-3 text-sm font-black text-[#000] shadow-[4px_4px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5"
          >
            Volver al inicio
          </Link>
        </div>
        <p className="mt-6 text-[10px] font-bold text-[#000]/50 uppercase tracking-widest">
          Si eres veterinario, este enlace lo usa el <strong>dueño</strong>. Tu panel es el dashboard, no &quot;Mi Mascota&quot;.
        </p>
      </div>
    </div>
  )
}
