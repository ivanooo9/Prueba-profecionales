import { Metadata } from "next";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import PetFoundClient from "./PetFoundClient";

export async function generateMetadata(
  { params }: { params: Promise<{ petId: string }> }
): Promise<Metadata> {
  const { petId } = await params;
  const pet = await prisma.pet.findUnique({ where: { id: petId }, select: { nombre: true, tipo: true } });
  if (!pet) return { title: "Mascota no encontrada — MIAUWUAUF" };
  return {
    title: `¡${pet.nombre} fue encontrado! — MIAUWUAUF`,
    description: `Ayuda a devolver a ${pet.nombre} con su dueño. Escanea el QR para contactar de forma segura.`,
  };
}

export default async function PetFoundPage(
  { params }: { params: Promise<{ petId: string }> }
) {
  const { petId } = await params;

  const pet = await prisma.pet.findUnique({
    where: { id: petId },
    select: { id: true, nombre: true },
  });

  if (!pet) notFound();

  return <PetFoundClient petId={petId} />;
}
