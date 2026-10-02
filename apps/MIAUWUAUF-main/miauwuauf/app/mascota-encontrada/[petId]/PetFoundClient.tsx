"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Phone, PawPrint, AlertTriangle, CheckCircle, Loader2, Heart } from "lucide-react";
import { LogoHorizontal } from "@/components/LogoHorizontal";

interface PetData {
  petName: string;
  petPhoto: string | null;
  petType: string;
  petRaza: string;
  petColor: string;
  ownerName: string;
  ownerPhone: string;
  ownerId: string;
}

interface ContactData {
  ownerPhone: string | null;
  ownerName: string;
  petName: string;
}

export default function PetFoundClient({ petId }: { petId: string }) {
  const [pet, setPet] = useState<PetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState(false);
  const [contacted, setContacted] = useState(false);
  const [contactData, setContactData] = useState<ContactData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/pet-found/${petId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setPet(data);
      })
      .catch(() => setError("No se pudo cargar la información"))
      .finally(() => setLoading(false));
  }, [petId]);

  const handleContact = useCallback(async () => {
    if (contacting || contacted) return;
    setContacting(true);
    try {
      const res = await fetch(`/api/pet-found/${petId}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setContactData(data);
        setContacted(true);
      } else {
        setError(data.error || "No se pudo contactar al dueño");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setContacting(false);
    }
  }, [petId, contacting, contacted]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#93ABD9] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-white" />
          <p className="text-white font-black text-lg">Cargando información...</p>
        </div>
      </div>
    );
  }

  if (error || !pet) {
    return (
      <div className="min-h-screen bg-[#93ABD9] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border-[4px] border-black rounded-3xl shadow-[8px_8px_0px_0px_#000] p-8 text-center">
          <AlertTriangle className="h-16 w-16 text-[#ff5a5a] mx-auto mb-4" />
          <h1 className="text-2xl font-black text-black mb-2">Mascota no encontrada</h1>
          <p className="text-black/60 font-bold mb-6">{error || "El QR de esta mascota no es válido o ha sido eliminado."}</p>
          <Link href="/" className="inline-block px-6 py-3 bg-[#ede986] text-black font-black border-[3px] border-black rounded-full shadow-[4px_4px_0px_0px_#000] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#000] transition-all">
            Ir a MIAUWUAUF
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#93ABD9] flex flex-col items-center justify-start px-4 py-8 gap-6 font-heading">
      {/* Header */}
      <div className="flex items-center gap-2 md:gap-4 font-heading font-black tracking-[-0.05em] text-[#000000] mb-2">
        <div className="relative shrink-0 mr-1 md:mr-2">
          {/* Shadow Box */}
          <div className="-rotate-3 translate-x-[4px] translate-y-[4px] bg-[#000000] rounded-sm sm:rounded-md px-1.5 py-0.5 sm:px-3 sm:py-1">
            <span className="text-3xl md:text-5xl select-none opacity-0 font-black">
              S.O.S.
            </span>
          </div>
          {/* Main Box */}
          <div className="absolute top-0 left-0 -rotate-3 bg-[#e7bef8] rounded-sm sm:rounded-md px-1.5 py-0.5 sm:px-3 sm:py-1 border-[2px] border-[#000000]">
            <span className="text-3xl md:text-5xl select-none text-white font-black leading-none">
              S.O.S.
            </span>
          </div>
          {/* Paw Badge */}
          <div className="absolute z-20 -rotate-12 transition-transform duration-500 hover:rotate-12 -top-5 -left-6">
            <div className="group/badge flex items-center justify-center transition-colors bg-white hover:bg-[#EDE986] border-[2.5px] border-[#000000] shadow-[3px_3px_0px_0px_#000000] p-1 sm:p-2 rounded-xl">
              <PawPrint className="h-4 w-4 text-[#4A4A4A] md:h-6 md:w-6 transition-colors group-hover/badge:text-[#000000]" strokeWidth={3} />
            </div>
          </div>
        </div>

        <LogoHorizontal size="md" variant="yellow" />
      </div>

      {/* Alert Banner */}
      <div className="w-full max-w-md bg-[#ffadad] border-[4px] border-black rounded-2xl shadow-[6px_6px_0px_0px_#000] p-4 flex items-center gap-3">
        <AlertTriangle className="h-8 w-8 text-black shrink-0" />
        <div>
          <p className="font-black text-black text-base leading-tight">¡MASCOTA PERDIDA ENCONTRADA!</p>
          <p className="text-black/70 font-bold text-sm">Su dueño está esperando ser contactado.</p>
        </div>
      </div>

      {/* Pet Card */}
      <div className="w-full max-w-md bg-white border-[4px] border-black rounded-3xl shadow-[8px_8px_0px_0px_#000] overflow-hidden">
        {/* Photo */}
        <div className="relative bg-[#fdfaf5] border-b-[4px] border-black flex items-center justify-center" style={{ height: 220 }}>
          {pet.petPhoto ? (
            <Image
              src={pet.petPhoto}
              alt={pet.petName}
              fill
              className="object-cover"
              sizes="448px"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 opacity-30">
              <PawPrint className="h-20 w-20" />
              <span className="font-black text-sm">Sin foto</span>
            </div>
          )}
          {/* Badge */}
          <div className="absolute top-3 right-3 bg-[#FFDE59] border-[3px] border-black rounded-xl px-3 py-1 shadow-[3px_3px_0px_0px_#000]">
            <span className="font-black text-xs uppercase tracking-wider">{pet.petType}</span>
          </div>
        </div>

        {/* Info */}
        <div className="p-6 space-y-4">
          <div className="text-center">
            <h1 className="text-4xl font-black text-black leading-tight">{pet.petName}</h1>
            <p className="text-black/60 font-bold text-base">{pet.petRaza} · {pet.petColor}</p>
          </div>

          {/* Owner info (masked) */}
          <div className="bg-[#fdfaf5] border-[3px] border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_#000]">
            <p className="text-xs font-black uppercase tracking-widest text-black/50 mb-1">Dueño/a</p>
            <p className="text-xl font-black text-black">{pet.ownerName}</p>
            {!contacted && (
              <p className="text-sm font-bold text-black/40 mt-1">
                Teléfono: {pet.ownerPhone} <span className="text-[10px]">(parcial)</span>
              </p>
            )}
          </div>

          {/* Contact button / result */}
          {!contacted ? (
            <button
              onClick={handleContact}
              disabled={contacting}
              className="w-full flex items-center justify-center gap-3 py-5 bg-[#93ABD9] text-black font-black text-lg border-[4px] border-black rounded-2xl shadow-[6px_6px_0px_0px_#000] hover:translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#000] active:translate-y-1 active:shadow-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {contacting ? (
                <><Loader2 className="h-6 w-6 animate-spin" /> Contactando...</>
              ) : (
                <><Phone className="h-6 w-6" /> Contactar al Dueño</>
              )}
            </button>
          ) : contactData ? (
            <div className="space-y-3">
              <div className="bg-[#b7f5b0] border-[4px] border-black rounded-2xl p-5 shadow-[4px_4px_0px_0px_#000] text-center">
                <CheckCircle className="h-8 w-8 text-black mx-auto mb-2" />
                <p className="font-black text-black text-sm uppercase tracking-wide">¡Notificación enviada al dueño!</p>
                <p className="text-black/60 font-bold text-xs mt-1">Ya saben que encontraste a {contactData.petName}.</p>
              </div>

              {contactData.ownerPhone && (
                <a
                  href={`tel:+${contactData.ownerPhone.replace(/\s/g, "").replace(/^\+/, "")}`}
                  className="w-full flex items-center justify-center gap-3 py-5 bg-[#FFDE59] text-black font-black text-xl border-[4px] border-black rounded-2xl shadow-[6px_6px_0px_0px_#000] hover:translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#000] transition-all"
                >
                  <Phone className="h-6 w-6" />
                  {contactData.ownerPhone}
                </a>
              )}
            </div>
          ) : null}

          <div className="text-center pt-2">
            <p className="text-xs font-bold text-black/30">
              Al contactar, notificamos al dueño de forma segura y anónima.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center space-y-1 pb-4">
        <div className="flex items-center justify-center gap-1.5 text-white font-black">
          <Heart className="h-4 w-4 fill-white" />
          <span>Gracias por ayudar a una mascota perdida</span>
        </div>
        <Link href="/" className="text-white/70 font-bold text-sm hover:text-white transition-colors underline">
          Conoce más sobre MIAUWUAUF
        </Link>
      </div>
    </div>
  );
}
