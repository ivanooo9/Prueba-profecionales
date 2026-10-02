"use client";

import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { QrCode, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QRCardProps {
  petId: string;
  petName: string;
  petPhoto?: string | null;
}

export default function QRCard({ petId, petName }: QRCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://miauwuauf.com";
  const qrUrl = `${appUrl}/mascota-encontrada/${petId}`;

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, qrUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FDFAF0",
      },
    })
      .then(() => {
        setQrDataUrl(canvasRef.current?.toDataURL("image/png") || null);
      })
      .catch(console.error);
  }, [qrUrl]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.download = `qr-${petName.toLowerCase().replace(/\s+/g, "-")}-miauwuauf.png`;
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <div className="bg-[#fdfaf5] border-[3px] border-black rounded-2xl shadow-[6px_6px_0px_0px_#000] p-5 flex flex-col items-center gap-4 font-heading">
      {/* Header */}
      <div className="flex items-center gap-2">
        <QrCode className="h-5 w-5 text-black" />
        <h3 className="font-black text-black text-sm uppercase tracking-wider">QR Anti-Pérdida</h3>
      </div>

      {/* QR Canvas */}
      <div className="relative bg-[#FDFAF0] border-[3px] border-black rounded-xl shadow-[4px_4px_0px_0px_#000] p-3">
        <canvas ref={canvasRef} className="block rounded-lg" />
      </div>

      {/* Description */}
      <div className="text-center space-y-1">
        <p className="text-xs font-black text-black/70 uppercase tracking-wide">
          QR de {petName}
        </p>
        <p className="text-[11px] font-bold text-black/40 leading-snug px-2">
          Si alguien encuentra a tu mascota y escanea este código, podrá contactarte de forma segura y automática.
        </p>
      </div>

      {/* Download Button */}
      <Button
        onClick={handleDownload}
        disabled={!qrDataUrl}
        className="w-full h-10 bg-[#FFDE59] text-black font-black text-xs uppercase tracking-wide border-[3px] border-black shadow-[4px_4px_0px_0px_#000] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#000] active:translate-y-1 active:shadow-none transition-all rounded-xl gap-2"
      >
        <Download className="h-4 w-4" />
        Descargar QR
      </Button>

      <p className="text-[10px] font-bold text-black/30 text-center">
        Imprime y coloca en el collar de {petName}
      </p>
    </div>
  );
}
