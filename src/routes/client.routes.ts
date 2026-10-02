import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { db } from "../lib/db";
import { generateInvoiceXml } from "../lib/sri/xml-generator";
import { signDocument } from "../lib/sri/sri-signer";
import { SriClient } from "../lib/sri/sri-client";
import { generateRidePdf } from "../lib/sri/ride-generator";
import { sendInvoiceEmail, sendAppointmentEmail, sendCredentialsEmail, sendEnrollmentNotificationEmail } from "../lib/email";
import { uploadBase64ToCloudinary } from "../lib/cloudinary";
import { toTitleCase } from "../lib/utils";
import { requireAdmin, requireProfessional, requireClient } from "../lib/middlewares";

const router = express.Router();
const sriClient = new SriClient();

// CLIENT DASHBOARD ROUTES
// -------------------------------------------------------------

// GET Client Dashboard
router.get("/dashboard/cliente", requireClient, async (req: Request, res: Response) => {
  const user = (req as any).user;
  try {
    const appointments = await db.appointment.findMany({
      where: {
        OR: [
          { userId: user.id },
          { correo: user.email }
        ]
      },
      include: {
        profile: {
          include: {
            user: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const certificates = await db.certificate.findMany({
      where: { userId: user.id },
      include: {
        conversatorio: true,
        curso: true
      },
      orderBy: { fechaEmision: "desc" }
    });

    const enrollments = await db.eventEnrollment.findMany({
      where: { userId: user.id },
      include: {
        conversatorio: {
          include: {
            speakers: true,
            certificateDesign: true
          }
        },
        curso: {
          include: {
            certificateDesign: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const userAccessLogs = await db.eventAccessLog.findMany({
      where: { userId: user.id },
      select: { conversatorioId: true, speakerId: true }
    });

    const pendingTransition = await db.roleTransitionRequest.findFirst({
      where: { userId: user.id, estado: "PENDIENTE" },
      orderBy: { fechaSolicitud: "desc" }
    });

    res.render("dashboard-cliente", {
      title: "Mi Panel",
      activePage: "cliente",
      user,
      appointments,
      certificates,
      enrollments,
      userAccessLogs,
      pendingTransition
    });
  } catch (error) {
    console.error("Error loading client dashboard:", error);
    res.redirect("/?error=db_error");
  }
});

// POST Cancel Appointment (Client side)
router.post("/dashboard/cliente/citas/cancelar/:id", requireClient, async (req: Request, res: Response) => {
  const appointmentId = parseInt(req.params.id as string);
  try {
    await db.appointment.update({
      where: { id: appointmentId },
      data: { estado: "CANCELADA" }
    });
    res.redirect("/dashboard/cliente");
  } catch (error) {
    console.error("Error canceling appointment:", error);
    res.redirect("/dashboard/cliente?error=cancel_failed");
  }
});

// POST Route: Update certificate default name configuration for Client
router.post("/dashboard/cliente/configurar-nombre", requireClient, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { nombreCertificado } = req.body;

  if (!nombreCertificado || nombreCertificado.trim() === "") {
    return res.status(400).json({ success: false, error: "El nombre no puede estar vacío." });
  }

  try {
    const dbUser = await db.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      return res.status(404).json({ success: false, error: "Usuario no encontrado." });
    }

    const now = new Date();
    if (dbUser.lastCertNameUpdate) {
      const lastUpdate = new Date(dbUser.lastCertNameUpdate);
      const msPerDay = 24 * 60 * 60 * 1000;
      const diffDays = (now.getTime() - lastUpdate.getTime()) / msPerDay;
      if (diffDays < 60) {
        const daysRemaining = Math.ceil(60 - diffDays);
        return res.status(400).json({ 
          success: false, 
          error: `Solo puedes cambiar el nombre de tus certificados una vez cada 60 días. Faltan ${daysRemaining} días.` 
        });
      }
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        nombreCertificado: toTitleCase(nombreCertificado),
        lastCertNameUpdate: now
      }
    });

    return res.json({ success: true, message: "Nombre de certificado actualizado correctamente." });
  } catch (error) {
    console.error("Error updating certificate name:", error);
    return res.status(500).json({ success: false, error: "Error interno al actualizar el nombre del certificado." });
  }
});

// POST Client Request Role Transition (CLIENT -> STUDENT or PROFESSIONAL)
router.post("/dashboard/cliente/request-transition", requireClient, async (req: Request, res: Response) => {
  const user = (req as any).user || res.locals.user;
  const { targetRole, motivoSolicitud, tituloCertificadoBase64 } = req.body;
  try {
    let docUrl: string | undefined = undefined;
    if (tituloCertificadoBase64 && typeof tituloCertificadoBase64 === "string" && tituloCertificadoBase64.startsWith("data:")) {
      docUrl = await uploadBase64ToCloudinary(tituloCertificadoBase64, "role_transition_docs");
    }

    const requestedRole = targetRole === "STUDENT" ? "STUDENT" : "PROFESSIONAL";

    if (!docUrl) {
      const msg = requestedRole === "STUDENT"
        ? "Es obligatorio adjuntar la foto o PDF de tu carnet estudiantil o certificado de matrícula para solicitar el perfil de estudiante."
        : "Es obligatorio adjuntar la foto o PDF de tu título profesional o acta de grado para solicitar el perfil profesional.";
      return res.redirect("/dashboard/cliente?error=" + encodeURIComponent(msg));
    }

    const { StudentService } = require("../services/student.service");
    await StudentService.requestRoleTransition({
      userId: user.id,
      currentRole: user.role?.name || "CLIENT",
      targetRole: requestedRole,
      motivoSolicitud: motivoSolicitud?.trim(),
      tituloCertificadoUrl: docUrl,
    });

    res.redirect("/dashboard/cliente?success=solicitud_enviada");
  } catch (error: any) {
    console.error("Error requesting client role transition:", error);
    res.redirect(`/dashboard/cliente?error=${encodeURIComponent(error.message || "Error al solicitar cambio de rol")}`);
  }
});

// -------------------------------------------------------------
export default router;
