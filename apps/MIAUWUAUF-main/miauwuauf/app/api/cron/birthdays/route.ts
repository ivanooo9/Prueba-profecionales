import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { createNotification } from "@/lib/notification"

// Este endpoint puede ser llamado por un servicio de cron (como Vercel Cron) 
// para ejecutarse automáticamente cada día.
export async function GET(req: Request) {
  // Verificación de seguridad básica (opcional, para evitar que cualquiera lo dispare)
  // const { searchParams } = new URL(req.url);
  // if (searchParams.get('key') !== process.env.CRON_SECRET) {
  //   return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  // }

  try {
    const today = new Date()
    const currentDay = today.getDate()
    const currentMonth = today.getMonth() + 1 // JS months are 0-11

    // Obtenemos todas las mascotas que tienen fecha de nacimiento
    const pets = await prisma.pet.findMany({
      where: {
        NOT: { fechaNacimiento: null }
      },
      include: {
        user: {
          select: { email: true, name: true }
        }
      }
    })

    const birthdaysToday = pets.filter(pet => {
      if (!pet.fechaNacimiento) return false
      
      // Formatos posibles: "yyyy-mm-dd" o "dd/mm/aaaa"
      let day, month
      if (pet.fechaNacimiento.includes('-')) {
        const parts = pet.fechaNacimiento.split('-')
        day = parseInt(parts[2])
        month = parseInt(parts[1])
      } else if (pet.fechaNacimiento.includes('/')) {
        const parts = pet.fechaNacimiento.split('/')
        day = parseInt(parts[0])
        month = parseInt(parts[1])
      }

      return day === currentDay && month === currentMonth
    })

    console.log(`[Cron] Verificando cumpleaños. Mascotas hoy: ${birthdaysToday.length}`)

    for (const pet of birthdaysToday) {
      try {
        await createNotification({
          userId: pet.userId,
          title: `¡Feliz Cumpleaños, ${pet.nombre}!`,
          message: `Hoy es un día especial. En MIAUWUAUF celebramos la vida de ${pet.nombre}. ¡Que pase un día lleno de mimos y premios!`,
          type: "success",
          userEmail: pet.user.email!,
          sendEmailFlag: true,
          emailSubject: `¡Feliz Cumpleaños ${pet.nombre}!`
        })
      } catch (notifyError) {
        console.error(`Error al notificar cumple de ${pet.nombre}:`, notifyError)
      }
    }

    return NextResponse.json({ 
      message: "Proceso de cumpleaños completado", 
      notificados: birthdaysToday.length 
    })
  } catch (error) {
    console.error("Error en cron de cumpleaños:", error)
    return NextResponse.json({ message: "Error interno" }, { status: 500 })
  }
}
