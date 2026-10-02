"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: "destructive" | "primary"
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "destructive"
}: ConfirmModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!isOpen) setIsSubmitting(false)
  }, [isOpen])

  const handleConfirm = React.useCallback(() => {
    if (isSubmitting) return

    setIsSubmitting(true)
    void (async () => {
      try {
        await Promise.resolve(onConfirm())
      } catch (e) {
        console.error("ConfirmModal onConfirm", e)
      } finally {
        onClose()
        setIsSubmitting(false)
      }
    })()
  }, [isSubmitting, onConfirm, onClose])

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose()
      }}
    >
      <DialogContent className="bg-[#fdfaf5] border-[3px] border-[#000000] shadow-[12px_12px_0px_0px_#000000] rounded-3xl w-[95vw] max-w-[95vw] sm:max-w-[420px] sm:w-full p-0 sm:p-0 gap-0 overflow-hidden animate-scale-in" hideClose>
        <DialogHeader className="p-6 pb-8 bg-[#e7bef8] border-b-[3px] border-[#000000]">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-white rounded-2xl border-[3px] border-[#000000] shadow-[4px_4px_0px_0px_#000000]">
              <AlertTriangle className="h-10 w-10 text-[#000000]" strokeWidth={2.5} />
            </div>
          </div>
          <DialogTitle className="text-2xl font-black font-heading text-[#000000] text-center uppercase tracking-tighter leading-none">
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-4 pb-4 sm:p-8 sm:pb-4">
          <DialogDescription className="text-center font-bold text-[#000000] text-base leading-relaxed">
            {description}
          </DialogDescription>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 p-4 pt-4 sm:p-8 sm:pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 h-14 rounded-2xl border-[3px] border-[#000000] font-black text-lg hover:bg-black/5 transition-all bg-white shadow-[4px_4px_0px_0px_#000000] active:translate-y-1 active:shadow-none"
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={`flex-1 h-14 rounded-2xl border-[3px] border-[#000000] font-black text-lg shadow-[4px_4px_0px_0px_#000000] active:translate-y-1 active:shadow-none transition-all ${
                variant === "destructive" 
                ? "bg-[#ff4d4d] hover:bg-[#ff3333] text-white" 
                : "bg-[#e7bef8] hover:bg-[#d8a8e8] text-[#000000]"
            }`}
          >
            {isSubmitting ? "Procesando..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
