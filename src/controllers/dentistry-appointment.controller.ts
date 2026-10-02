import { Request, Response } from "express";
import { DentistryAppointmentService } from "../services/dentistry-appointment.service";
import { extractOrganizationId } from "../lib/organization.middleware";

export class DentistryAppointmentController {
  private static getOrgId(req: Request, res: Response): number | null {
    const org = (req as any).organization || res.locals.organization;
    if (org?.id) return Number(org.id);
    return extractOrganizationId(req);
  }

  /**
   * GET /api/organizations/:id/dentistry/appointments
   * Lista citas odontológicas de la organización con filtros.
   */
  public static async listAppointments(req: Request, res: Response) {
    try {
      const orgId = DentistryAppointmentController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const filters = {
        date: typeof req.query.date === "string" ? req.query.date : undefined,
        startDate: typeof req.query.startDate === "string" ? req.query.startDate : undefined,
        endDate: typeof req.query.endDate === "string" ? req.query.endDate : undefined,
        patientId: req.query.patientId ? Number(req.query.patientId) : undefined,
        professionalUserId: req.query.professionalUserId ? Number(req.query.professionalUserId) : undefined,
        status: typeof req.query.status === "string" ? req.query.status : undefined,
      };

      const appointments = await DentistryAppointmentService.listAppointments(orgId, filters);
      return res.status(200).json({ success: true, data: appointments });
    } catch (error: any) {
      console.error("[DentistryAppointmentController.listAppointments] Error:", error);
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        error: error.message || "Error al listar citas odontológicas.",
      });
    }
  }

  /**
   * GET /api/organizations/:id/dentistry/professionals
   * Lista los profesionales odontológicos autorizados para agendamiento.
   */
  public static async listDentists(req: Request, res: Response) {
    try {
      const orgId = DentistryAppointmentController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const dentists = await DentistryAppointmentService.listOrganizationDentists(orgId);
      return res.status(200).json({ success: true, data: dentists });
    } catch (error: any) {
      console.error("[DentistryAppointmentController.listDentists] Error:", error);
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        error: error.message || "Error al obtener profesionales odontológicos.",
      });
    }
  }

  /**
   * GET /api/organizations/:id/dentistry/appointments/:appointmentId
   * Obtiene el detalle de una cita por ID.
   */
  public static async getAppointmentById(req: Request, res: Response) {
    try {
      const orgId = DentistryAppointmentController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const appointmentId = parseInt(String(req.params.appointmentId), 10);
      if (isNaN(appointmentId)) {
        return res.status(400).json({ success: false, error: "ID de cita inválido." });
      }

      const appointment = await DentistryAppointmentService.getAppointmentById(orgId, appointmentId);
      return res.status(200).json({ success: true, data: appointment });
    } catch (error: any) {
      console.error("[DentistryAppointmentController.getAppointmentById] Error:", error);
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        error: error.message || "Error al obtener detalle de la cita.",
      });
    }
  }

  /**
   * GET /api/organizations/:id/dentistry/patients/:patientId/appointments
   * Lista citas de un paciente específico.
   */
  public static async listPatientAppointments(req: Request, res: Response) {
    try {
      const orgId = DentistryAppointmentController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patientId = parseInt(String(req.params.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const appointments = await DentistryAppointmentService.listAppointments(orgId, { patientId });
      return res.status(200).json({ success: true, data: appointments });
    } catch (error: any) {
      console.error("[DentistryAppointmentController.listPatientAppointments] Error:", error);
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        error: error.message || "Error al listar citas del paciente.",
      });
    }
  }

  /**
   * POST /api/organizations/:id/dentistry/appointments
   * Agenda una nueva cita odontológica con whitelist estricta y protección de agenda.
   */
  public static async createAppointment(req: Request, res: Response) {
    try {
      const orgId = DentistryAppointmentController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const {
        patientId,
        dentalRecordId,
        professionalUserId,
        treatmentPlanId,
        treatmentItemId,
        title,
        reason,
        type,
        notes,
        scheduledAt,
        durationMinutes,
        status,
      } = req.body;

      if (!patientId || isNaN(Number(patientId))) {
        return res.status(400).json({ success: false, error: "El paciente (patientId) es obligatorio." });
      }

      if (!professionalUserId || isNaN(Number(professionalUserId))) {
        return res.status(400).json({
          success: false,
          error: "El profesional tratante (professionalUserId) es obligatorio para agendar una cita clínica.",
        });
      }

      if (!scheduledAt) {
        return res.status(400).json({ success: false, error: "La fecha y hora (scheduledAt) son obligatorias." });
      }

      const newAppointment = await DentistryAppointmentService.createAppointment(orgId, {
        patientId: Number(patientId),
        dentalRecordId: dentalRecordId ? Number(dentalRecordId) : undefined,
        professionalUserId: Number(professionalUserId),
        treatmentPlanId: treatmentPlanId ? Number(treatmentPlanId) : null,
        treatmentItemId: treatmentItemId ? Number(treatmentItemId) : null,
        title,
        reason,
        type,
        notes,
        scheduledAt,
        durationMinutes: durationMinutes !== undefined ? Number(durationMinutes) : undefined,
        status,
      });

      return res.status(201).json({
        success: true,
        message: "Cita odontológica programada exitosamente.",
        data: newAppointment,
      });
    } catch (error: any) {
      console.error("[DentistryAppointmentController.createAppointment] Error:", error);
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({
        success: false,
        error: error.message || "Error al agendar la cita odontológica.",
      });
    }
  }

  /**
   * PUT /api/organizations/:id/dentistry/appointments/:appointmentId
   * Reprograma o actualiza campos permitidos de la cita.
   */
  public static async updateAppointment(req: Request, res: Response) {
    try {
      const orgId = DentistryAppointmentController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const appointmentId = parseInt(String(req.params.appointmentId), 10);
      if (isNaN(appointmentId)) {
        return res.status(400).json({ success: false, error: "ID de cita inválido." });
      }

      const {
        scheduledAt,
        durationMinutes,
        professionalUserId,
        treatmentPlanId,
        treatmentItemId,
        title,
        reason,
        type,
        notes,
        // Prohibidos explícitos
        patientId,
        organizationId,
        dentalRecordId,
      } = req.body;

      const updated = await DentistryAppointmentService.updateAppointment(orgId, appointmentId, {
        scheduledAt,
        durationMinutes: durationMinutes !== undefined ? Number(durationMinutes) : undefined,
        professionalUserId: professionalUserId !== undefined ? Number(professionalUserId) : undefined,
        treatmentPlanId: treatmentPlanId !== undefined ? (treatmentPlanId ? Number(treatmentPlanId) : null) : undefined,
        treatmentItemId: treatmentItemId !== undefined ? (treatmentItemId ? Number(treatmentItemId) : null) : undefined,
        title,
        reason,
        type,
        notes,
        patientId,
        organizationId,
        dentalRecordId,
      });

      return res.status(200).json({
        success: true,
        message: "Cita odontológica actualizada exitosamente.",
        data: updated,
      });
    } catch (error: any) {
      console.error("[DentistryAppointmentController.updateAppointment] Error:", error);
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({
        success: false,
        error: error.message || "Error al actualizar la cita odontológica.",
      });
    }
  }

  /**
   * PATCH /api/organizations/:id/dentistry/appointments/:appointmentId/status
   * Transiciona el estado de atención de la cita.
   */
  public static async updateAppointmentStatus(req: Request, res: Response) {
    try {
      const orgId = DentistryAppointmentController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const appointmentId = parseInt(String(req.params.appointmentId), 10);
      if (isNaN(appointmentId)) {
        return res.status(400).json({ success: false, error: "ID de cita inválido." });
      }

      const { status, cancellationReason } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, error: "El nuevo estado (status) es requerido." });
      }

      const updated = await DentistryAppointmentService.updateAppointmentStatus(
        orgId,
        appointmentId,
        status,
        cancellationReason
      );

      return res.status(200).json({
        success: true,
        message: `Estado de la cita actualizado a '${status}'.`,
        data: updated,
      });
    } catch (error: any) {
      console.error("[DentistryAppointmentController.updateAppointmentStatus] Error:", error);
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({
        success: false,
        error: error.message || "Error al actualizar el estado de la cita.",
      });
    }
  }

  /**
   * POST /api/organizations/:id/dentistry/appointments/:appointmentId/cancel
   * Cancela formalmente una cita con motivo obligatorio.
   */
  public static async cancelAppointment(req: Request, res: Response) {
    try {
      const orgId = DentistryAppointmentController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const appointmentId = parseInt(String(req.params.appointmentId), 10);
      if (isNaN(appointmentId)) {
        return res.status(400).json({ success: false, error: "ID de cita inválido." });
      }

      const { reason } = req.body;
      if (!reason || !String(reason).trim()) {
        return res.status(400).json({
          success: false,
          error: "El motivo de cancelación (reason) es obligatorio.",
        });
      }

      const updated = await DentistryAppointmentService.cancelAppointment(orgId, appointmentId, String(reason));
      return res.status(200).json({
        success: true,
        message: "Cita odontológica cancelada exitosamente.",
        data: updated,
      });
    } catch (error: any) {
      console.error("[DentistryAppointmentController.cancelAppointment] Error:", error);
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({
        success: false,
        error: error.message || "Error al cancelar la cita odontológica.",
      });
    }
  }
}
