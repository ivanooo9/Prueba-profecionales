"use client"

import React from "react"
import { Lock, Send } from "lucide-react"

export type MedicalAccessUi = {
  canView: boolean
  status: "NONE" | "PENDING" | "REJECTED" | "ACCEPTED" | "ADMIN"
  onRequestAccess?: () => void
  requestLoading?: boolean
}

const brandLila = "#9E97B1"
const brandCrema = "#FDF9F0"

const neoBtnClass =
  "mt-5 inline-flex h-12 w-full max-w-sm items-center justify-center gap-2 rounded-xl border-[3px] border-[#000] bg-[#FDE047] px-6 text-sm font-black uppercase text-[#000] shadow-[4px_4px_0px_0px_#000] transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#000] disabled:opacity-60 sm:w-auto"

export type RestrictedAccessOverlayProps = {
  patientName: string
  ownerName: string
  status: "NONE" | "PENDING" | "REJECTED"
  onRequestAccess?: () => void
  requestLoading?: boolean
}

export const RestrictedAccessOverlay: React.FC<RestrictedAccessOverlayProps> = ({
  patientName,
  ownerName,
  status,
  onRequestAccess,
  requestLoading,
}) => {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="restricted-access-title"
    >
      <div
        className="w-full max-w-lg rounded-3xl border-[3px] border-foreground p-6 shadow-[6px_6px_0px_0px_#000000] md:p-8"
        style={{ backgroundColor: brandCrema }}
      >
        <div className="mx-auto max-w-lg text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border-[3px] border-foreground shadow-[3px_3px_0px_0px_#000000]"
            style={{ backgroundColor: brandLila }}
          >
            <Lock className="h-7 w-7 text-foreground" />
          </div>
          <h3 id="restricted-access-title" className="font-heading text-lg font-black text-foreground sm:text-xl">
            Acceso restringido
          </h3>
          <p className="mt-2 text-sm font-bold text-foreground/80 sm:text-base">
            El historial clínico de <span className="break-words font-black text-foreground">{patientName}</span> está
            protegido. <span className="break-words font-black text-foreground">{ownerName}</span> debe autorizarte
            para ver y registrar información médica.
          </p>
          {status === "PENDING" && (
            <div className="flex flex-col items-center">
              <p className="mt-5 text-sm font-black sm:text-base" style={{ color: brandLila }}>
                Solicitud pendiente de aprobación
              </p>
              {onRequestAccess && (
                <button
                  type="button"
                  disabled={requestLoading}
                  onClick={onRequestAccess}
                  className={neoBtnClass}
                >
                  {requestLoading ? (
                    "Enviando…"
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Send className="h-4 w-4" />
                      VOLVER A SOLICITAR ACCESO
                    </span>
                  )}
                </button>
              )}
            </div>
          )}
          {(status === "NONE" || status === "REJECTED") && onRequestAccess && (
            <button
              type="button"
              disabled={requestLoading}
              onClick={onRequestAccess}
              className={neoBtnClass}
            >
              {requestLoading ? (
                "Enviando…"
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Send className="h-4 w-4" />
                  SOLICITAR ACCESO
                </span>
              )}
            </button>
          )}
          {status === "REJECTED" && (
            <p className="mt-3 text-xs font-bold text-foreground/60">Puedes volver a enviar una solicitud.</p>
          )}
        </div>
      </div>
    </div>
  )
}
