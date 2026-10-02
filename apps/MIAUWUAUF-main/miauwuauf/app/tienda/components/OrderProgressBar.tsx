"use client"

import React from "react"
import { motion } from "framer-motion"
import { formatPrefixedSequence } from "@/lib/utils"

interface OrderProgressBarProps {
  currentStatus: string
  orderId: string
  displayId?: number | null
  orderCode?: string | null
  variant?: "default" | "transparent"
}

const steps = [
  { id: 1, label: "Recibido", statuses: ["PENDIENTE", "ESPERANDO_COMPROBANTE", "ESPERANDO_VALIDACION", "PENDIENTE_VALIDACION"] },
  { id: 2, label: "Verificado", statuses: ["PAGO_ACEPTADO", "VERIFICADO"] },
  { id: 3, label: "Preparando", statuses: ["PREPARANDO"] },
  { id: 4, label: "En camino", statuses: ["EN_CAMINO"] },
  { id: 5, label: "Entregado", statuses: ["COMPLETADA"] },
]

export const OrderProgressBar: React.FC<OrderProgressBarProps> = ({ currentStatus, orderId, displayId, orderCode, variant = "default" }) => {
    // Encontrar el índice del paso actual basado en el status
  const currentStepIndex = steps.findIndex(step => 
    step.statuses.includes(currentStatus?.trim().replace(/\s+/g, '_').toUpperCase())
  ) + 1

  // Fallback robusto: Si no se encuentra el status o es nulo, posicionamos en el paso 1 si hay un orderId
  const effectiveStepIndex = currentStepIndex === 0 ? 1 : currentStepIndex

  // Solo ocultamos si no nos pasan un orderId válido
  if (!orderId) return null

  const currentStepName = steps[effectiveStepIndex - 1]?.label || "RECIBIDO"

  const containerClasses = variant === "transparent" 
    ? "w-full pt-8 pb-4" 
    : "w-full my-10 p-8 bg-white border-[4px] border-black rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"

  return (
    <div className={containerClasses}>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center px-2">
          <p className="text-[11px] font-black uppercase tracking-widest text-[#000000]">
            Seguimiento de tu paquete <span className="opacity-40">(Pedido {orderCode ?? formatPrefixedSequence("ORD", displayId, orderId)})</span>
          </p>
          <div className="bg-[#E7BEF8] px-3 py-1 rounded-full border-[3px] border-black text-[9px] font-black shadow-[3px_3px_0px_0px_black]">
            {currentStepName.toUpperCase()}
          </div>
        </div>

        <div className="relative flex justify-between items-center w-full px-4">
          {/* Línea de progreso de fondo */}
          <div className="absolute top-1/2 left-0 w-full h-[6px] bg-black border-[2px] border-black -translate-y-1/2 z-0 rounded-full" />
          
          {/* Línea de progreso activa */}
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${((effectiveStepIndex - 1) / (steps.length - 1)) * 100}%` }}
            transition={{ duration: 1, ease: "circOut" }}
            className="absolute top-1/2 left-0 h-[6px] bg-[#F2D194] -translate-y-1/2 z-0 rounded-full border-[2px] border-black"
          />

          {steps.map((step) => {
            const isCompleted = step.id < effectiveStepIndex
            const isCurrent = step.id === effectiveStepIndex

            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center gap-3">
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor: isCompleted || isCurrent ? "#F2D194" : "#FFFFFF",
                    scale: isCurrent ? 1.1 : 1,
                  }}
                  className="w-14 h-14 rounded-full border-[4px] border-black flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                >
                  <span className={`font-black text-2xl ${isCompleted || isCurrent ? 'text-black' : 'text-black/30'}`}>
                    {isCompleted ? "" : step.id}
                  </span>
                </motion.div>
                
                <span className={`text-[9px] font-black uppercase tracking-wider ${isCurrent ? 'text-black' : 'text-black/40'}`}>
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
