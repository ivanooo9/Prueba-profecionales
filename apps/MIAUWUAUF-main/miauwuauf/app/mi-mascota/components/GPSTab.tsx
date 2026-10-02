"use client"

import React from "react"
import Image from "next/image"
import { Satellite, MapPin, Wifi, Info, Clock, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MascotaUsuario } from "../types"

interface GPSTabProps {
  mascotaActiva: MascotaUsuario | null
}

export const GPSTab = ({ mascotaActiva }: GPSTabProps) => {
  if (!mascotaActiva) return null

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-8 text-center animate-fade-in">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="relative bg-white border-4 border-[#000000] p-8 rounded-[40px] shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)]">
          <Satellite className="h-20 w-20 text-primary animate-bounce-soft" />
        </div>
      </div>
      
      <div className="max-w-md space-y-4">
        <h2 className="text-4xl font-black text-[#000000] tracking-tight">Seguimiento GPS</h2>
        <div className="inline-flex items-center gap-2 px-8 py-3 bg-[#ffd6a5] border-[3px] border-[#000000] rounded-full shadow-[6px_6px_0px_0px_#000000] transform hover:-rotate-1 transition-transform cursor-default">
          <span className="text-sm font-black uppercase tracking-[0.2em] text-[#000000]">Próximamente</span>
        </div>
        
        <p className="text-lg font-medium text-[#000000]/60 leading-relaxed italic">

        </p>
      </div>
    </div>
  )
}
