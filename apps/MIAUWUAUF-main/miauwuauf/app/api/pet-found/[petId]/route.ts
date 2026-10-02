import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notification";
import { getNeobrutalistTemplate, getFichaTecnica } from "@/lib/email-templates";
import { sendEmail } from "@/lib/mail";

function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "No disponible";
  const clean = phone.replace(/\D/g, "");
  if (clean.length < 7) return phone;
  const first = clean.slice(0, 3);
  const last = clean.slice(-3);
  const middle = "*".repeat(clean.length - 6);
  return `${first}${middle}${last}`;
}

function maskName(name: string | null | undefined): string {
  if (!name) return "Dueño";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  return `${parts[0]} ${last.charAt(0)}.`;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ petId: string }> }
) {
  const { petId } = await params;

  try {
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!pet) {
      return NextResponse.json({ error: "Mascota no encontrada" }, { status: 404 });
    }

    return NextResponse.json({
      petName: pet.nombre,
      petPhoto: pet.foto || null,
      petType: pet.tipo,
      petRaza: pet.raza,
      petColor: pet.color,
      ownerName: maskName(pet.user?.name),
      ownerPhone: maskPhone(pet.user?.phone),
      // Enviamos el id del dueño para el POST (sin datos completos hasta confirmar)
      ownerId: pet.user?.id,
    });
  } catch (error) {
    console.error("Error fetching pet found data:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ petId: string }> }
) {
  const { petId } = await params;

  // Obtener IP real del visitante
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "IP desconocida";
  const userAgent = req.headers.get("user-agent") || "Desconocido";
  const now = new Date();
  const fecha = now.toLocaleDateString("es-EC", { timeZone: "America/Guayaquil", day: "2-digit", month: "long", year: "numeric" });
  const hora = now.toLocaleTimeString("es-EC", { timeZone: "America/Guayaquil", hour: "2-digit", minute: "2-digit" });

  try {
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!pet || !pet.user) {
      return NextResponse.json({ error: "Mascota no encontrada" }, { status: 404 });
    }

    const appUrl = process.env.NEXTAUTH_URL || "https://miauwuauf.com";

    // 1. Notificación in-app al dueño
    await createNotification({
      userId: pet.user.id,
      title: `¡Alguien encontró a ${pet.nombre}!`,
      message: `Tu mascota ${pet.nombre} fue escaneada el ${fecha} a las ${hora}. IP: ${ip}. Revisa tu correo para más detalles.`,
      type: "pet_found",
      actionUrl: `${appUrl}/mi-mascota?tab=mis-mascotas`,
      metadata: {
        petName: pet.nombre,
        fecha,
        hora,
        ip,
      },
    });

    // 2. Email al dueño con la plantilla neobrutalist existente
    if (pet.user.email) {
      const fichaHtml = getFichaTecnica("ALERTA: MASCOTA ESCANEADA", {
        "Mascota": pet.nombre,
        "Especie": pet.tipo,
        "Raza": pet.raza,
        "Fecha": fecha,
        "Hora": hora,
        "IP del Visitante": ip,
        "Dispositivo": userAgent.length > 60 ? userAgent.slice(0, 60) + "…" : userAgent,
      });

      const html = getNeobrutalistTemplate({
        title: `¡${pet.nombre} fue encontrado!`,
        message: `<strong>${maskName(pet.user.name)}</strong>, alguien escaneó el QR de <strong>${pet.nombre}</strong>. Esta persona está intentando contactarte para devolverte a tu mascota. Revisa los detalles a continuación:`,
        actionUrl: `${appUrl}/mi-mascota?tab=mis-mascotas`,
        actionText: "Ver el Perfil de mi Mascota",
        fichaHtml,
      });

      await sendEmail(
        pet.user.email,
        `¡Alguien encontró a ${pet.nombre}! — MIAUWUAUF`,
        html
      );
    }

    // 3. Devolver el teléfono del dueño (semi-enmascarado) al que encontró la mascota
    return NextResponse.json({
      ownerPhone: pet.user.phone || null,
      ownerName: maskName(pet.user.name),
      petName: pet.nombre,
    });
  } catch (error) {
    console.error("Error in pet-found POST:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
