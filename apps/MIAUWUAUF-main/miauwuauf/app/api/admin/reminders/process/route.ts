import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notification";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";

// Definimos el tipo exacto para las citas con sus inclusiones de mascota y usuario
type AppointmentWithDetails = Prisma.AppointmentGetPayload<{
  include: {
    pet: { include: { user: true } }
    vet: { select: { id: true; email: true; name: true } }
  }
}>;

const REMINDER_TZ = "America/Guayaquil";

function getDateInTimezone(offsetDays = 0): string {
  const base = new Date();
  if (offsetDays !== 0) base.setDate(base.getDate() + offsetDays);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REMINDER_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(base);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    const url = new URL(req.url);
    const cronKey = url?.searchParams.get("key") || "";
    const userAgent = req.headers.get("user-agent") || "";
    const isVercelCron = req.headers.get("x-vercel-cron") === "1" || userAgent.includes("vercel-cron");
    const hasCronKey = Boolean(process.env.CRON_SECRET) && cronKey === process.env.CRON_SECRET;
    const isAutomatedRun = isVercelCron || hasCronKey;

    const sessionUserId = session?.user?.id || "";
    const userRole = session?.user?.role || "";
    const normalizedRole = String(userRole).toLowerCase();

    // 1) Modo automático (cron) o modo manual autenticado (admin/vet)
    if (!isAutomatedRun) {
      if (!session || !session.user) {
        console.log("[REMINDERS_API] No session found");
        return NextResponse.json({ success: false, error: "No autenticado" }, { status: 401 });
      }
      if (normalizedRole !== "veterinario" && normalizedRole !== "admin") {
        console.log(`[REMINDERS_API] Unauthorized role: ${normalizedRole}`);
        return NextResponse.json({ success: false, error: "Solo Veterinarios o Admins pueden procesar recordatorios" }, { status: 403 });
      }
      if (!sessionUserId) {
        console.log("[REMINDERS_API] Missing user ID in session");
        return NextResponse.json({ success: false, error: "ID de usuario no encontrado" }, { status: 400 });
      }
    }

    const todayStr = getDateInTimezone(0);
    const twoDaysLaterStr = getDateInTimezone(2);
    const vetScopeId = isAutomatedRun || normalizedRole === "admin" ? undefined : sessionUserId;

    console.log(
      `[REMINDERS_API] Processing mode=${isAutomatedRun ? "cron" : "manual"} scope=${vetScopeId || "all"} today=${todayStr} 2days=${twoDaysLaterStr}`
    );

    // 2) Buscar citas pendientes para hoy y en 2 días
    const [appointmentsToday, appointments2Days] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          ...(vetScopeId ? { vetId: vetScopeId } : {}),
          fecha: todayStr,
          estado: "pendiente",
          reminderSentSameDay: false,
        },
        include: {
          pet: { include: { user: true } },
          vet: { select: { id: true, email: true, name: true } }
        }
      }) as Promise<AppointmentWithDetails[]>,
      prisma.appointment.findMany({
        where: {
          ...(vetScopeId ? { vetId: vetScopeId } : {}),
          fecha: twoDaysLaterStr,
          estado: "pendiente",
          reminderSent2Days: false,
        },
        include: {
          pet: { include: { user: true } },
          vet: { select: { id: true, email: true, name: true } }
        }
      }) as Promise<AppointmentWithDetails[]>
    ]);

    const results = { today: 0, twoDays: 0, errors: 0 };

    // 3) Procesar Recordatorios para HOY
    for (const appt of appointmentsToday) {
      try {
        const petData = appt.pet;
        const petOwner = petData?.user;
        const mascotName = petData?.nombre || appt.mascota || "Mascota";
        const reason = appt.motivo || "su cita";

        if (petData && petOwner?.email && petOwner.id) {
          await createNotification({
            userId: petOwner.id,
            userEmail: petOwner.email,
            title: "¡Llegó el día! Miauwuauf",
            message: `¡Hola! Te esperamos hoy para la dosis de ${reason} de ${mascotName} a las ${appt.hora}.`,
            type: "appointment_reminder",
            sendEmailFlag: true,
            emailSubject: `¡Llegó el día! Hoy toca ${reason} para ${mascotName}`,
            actionUrl: `/mi-mascota`
          });

          await createNotification({
            userId: appt.vetId || sessionUserId,
            title: "Recordatorio de hoy enviado",
            message: `Hoy tienes cita: ${reason} para ${mascotName} a las ${appt.hora}.`,
            type: "vet_support",
            userEmail: appt.vet?.email ?? undefined,
            sendEmailFlag: !!(appt.vet?.email),
            emailSubject: `Cita hoy: ${mascotName} – ${reason}`,
            actionUrl: `/dashboard?tab=citas`
          });
        } else {
          await createNotification({
            userId: appt.vetId || sessionUserId,
            title: "Cita hoy (sin contacto de dueño)",
            message: `Hoy tienes cita pendiente: ${reason} para ${mascotName} a las ${appt.hora}. Revisa datos de la mascota o contacta al cliente.`,
            type: "vet_support",
            userEmail: appt.vet?.email ?? undefined,
            sendEmailFlag: !!(appt.vet?.email),
            emailSubject: `Cita hoy: ${mascotName} – ${reason}`,
            actionUrl: `/dashboard?tab=citas`
          });
        }

        await prisma.appointment.update({
          where: { id: appt.id },
          data: { reminderSentSameDay: true }
        });
        results.today++;
      } catch (err) {
        console.error("[REMINDERS_API] Error processing today appt:", appt.id, err);
        results.errors++;
      }
    }

    // 4) Procesar Recordatorios para 2 DÍAS DESPUÉS
    for (const appt of appointments2Days) {
      try {
        const petData = appt.pet;
        const petOwner = petData?.user;
        const mascotName = petData?.nombre || appt.mascota || "Mascota";
        const reason = appt.motivo || "su cita";

        if (petData && petOwner?.email && petOwner.id) {
          await createNotification({
            userId: petOwner.id,
            userEmail: petOwner.email,
            title: "Recordatorio: Cita en 2 días",
            message: `¡Hola! Recuerda que en 2 días toca la dosis de ${reason} para ${mascotName} a las ${appt.hora}.`,
            type: "appointment_reminder",
            sendEmailFlag: true,
            emailSubject: `Recordatorio: Cita de ${mascotName} próximamente`,
            actionUrl: `/mi-mascota`
          });

          await createNotification({
            userId: appt.vetId || sessionUserId,
            title: "Cita en 2 días",
            message: `En 2 días tienes cita: ${reason} para ${mascotName} a las ${appt.hora}.`,
            type: "vet_support",
            userEmail: appt.vet?.email ?? undefined,
            sendEmailFlag: !!(appt.vet?.email),
            emailSubject: `Cita próxima: ${mascotName} en 2 días`,
            actionUrl: `/dashboard?tab=citas`
          });
        } else {
          await createNotification({
            userId: appt.vetId || sessionUserId,
            title: "Cita en 2 días (sin contacto de dueño)",
            message: `En 2 días tienes cita pendiente: ${reason} para ${mascotName} a las ${appt.hora}.`,
            type: "vet_support",
            userEmail: appt.vet?.email ?? undefined,
            sendEmailFlag: !!(appt.vet?.email),
            emailSubject: `Cita próxima: ${mascotName} en 2 días`,
            actionUrl: `/dashboard?tab=citas`
          });
        }

        await prisma.appointment.update({
          where: { id: appt.id },
          data: { reminderSent2Days: true }
        });
        results.twoDays++;
      } catch (err) {
        console.error("[REMINDERS_API] Error processing 2-day appt:", appt.id, err);
        results.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      mode: isAutomatedRun ? "cron" : "manual",
      scope: vetScopeId || "all",
      processed: results,
    });

  } catch (error) {
    console.error("[REMINDERS_API] Critical Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
