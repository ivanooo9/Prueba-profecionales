import { Request, Response } from "express";
import { db } from "../../lib/db";
import { hashPassword } from "../../lib/auth";
import { emailService } from "../../lib/email";

/**
 * Controller for Admin Manual Student Registration and Credential Distribution.
 */
export class AdminStudentsController {
  /**
   * Enroll a student manually into a Course or Webinar by email.
   */
  static async enrollStudentManually(req: Request, res: Response) {
    const { email, eventType, type, eventId } = req.body;
    const actualEventType = (eventType || type || "").toString().trim().toLowerCase();

    if (!email || !actualEventType || !eventId) {
      return res.status(400).json({
        success: false,
        error: "Faltan datos obligatorios: email, tipo de evento o ID de evento."
      });
    }

    try {
      const parsedEventId = parseInt(eventId, 10);
      if (isNaN(parsedEventId)) {
        return res.status(400).json({ success: false, error: "ID de evento inválido." });
      }

      const cleanEmail = email.trim().toLowerCase();
      let user = await db.user.findUnique({
        where: { email: cleanEmail },
        include: { role: true }
      });

      let isNewUser = false;
      let tempPassword = "";

      if (!user) {
        isNewUser = true;
        tempPassword = `TEMP-${Math.floor(100000 + Math.random() * 900000)}`;
        const hashedPassword = await hashPassword(tempPassword);

        let clientRole = await db.role.findUnique({ where: { name: "CLIENT" } });
        if (!clientRole) {
          clientRole = await db.role.create({
            data: { name: "CLIENT", description: "Cliente o Alumno" }
          });
        }

        user = await db.user.create({
          data: {
            email: cleanEmail,
            name: "Nuevo Alumno",
            password: hashedPassword,
            roleId: clientRole.id,
            status: "ACTIVE",
            requireProfileSetup: true,
            setupRedirectUrl: actualEventType === "curso" ? `/cursos/${parsedEventId}` : `/conversatorios/${parsedEventId}`
          },
          include: { role: true }
        });

        // Send Email with credentials using credentials-legacy email type
        emailService.sendEmail("credentials-legacy", cleanEmail, {
          email: cleanEmail,
          tempPassword,
          eventName: actualEventType === "curso" ? `Curso #${parsedEventId}` : `Conversatorio #${parsedEventId}`,
          eventType: actualEventType === "curso" ? "curso" : "conversatorio",
          loginUrl: `${process.env.BASE_URL || process.env.APP_URL || 'http://localhost:3000'}/login`
        }).catch((err: any) => console.warn("Error sending student credentials email:", err));
      }

      // Perform enrollment
      if (actualEventType === "curso") {
        await db.eventEnrollment.upsert({
          where: { userId_cursoId: { userId: user.id, cursoId: parsedEventId } },
          create: { userId: user.id, cursoId: parsedEventId },
          update: {}
        });
      } else {
        await db.eventEnrollment.upsert({
          where: { userId_conversatorioId: { userId: user.id, conversatorioId: parsedEventId } },
          create: { userId: user.id, conversatorioId: parsedEventId },
          update: {}
        });
      }

      res.json({
        success: true,
        isNewUser,
        tempPassword,
        email: cleanEmail,
        userId: user.id,
        message: isNewUser
          ? "Alumno nuevo registrado e inscrito exitosamente."
          : "Alumno inscrito exitosamente."
      });
    } catch (error: any) {
      console.error("Error in enrollStudentManually controller:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Error al matricular alumno manualmente."
      });
    }
  }
}
