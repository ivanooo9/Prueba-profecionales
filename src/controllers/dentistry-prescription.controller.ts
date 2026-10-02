import { Request, Response } from "express";
import { DentistryPrescriptionService } from "../services/dentistry-prescription.service";

export class DentistryPrescriptionController {
  /**
   * GET /api/organizations/:id/dentistry/patients/:patientId/prescriptions
   * Lista recetas del paciente en la organización (READ-ONLY).
   */
  public static async listPrescriptions(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patientId = parseInt(String(req.params.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const prescriptions = await DentistryPrescriptionService.getPrescriptions(
        org.id,
        patientId,
        { status }
      );

      return res.status(200).json({ success: true, data: prescriptions });
    } catch (error: any) {
      console.error("[DentistryPrescriptionController.listPrescriptions] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al obtener recetas odontológicas.",
      });
    }
  }

  /**
   * GET /api/organizations/:id/dentistry/patients/:patientId/prescriptions/:prescriptionId
   * Obtiene detalle de una receta específica con sus medicamentos.
   */
  public static async getPrescriptionById(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patientId = parseInt(String(req.params.patientId), 10);
      const prescriptionId = parseInt(String(req.params.prescriptionId), 10);

      if (isNaN(patientId) || isNaN(prescriptionId)) {
        return res.status(400).json({
          success: false,
          error: "Identificadores de paciente o receta inválidos.",
        });
      }

      const prescription = await DentistryPrescriptionService.getPrescriptionById(
        org.id,
        patientId,
        prescriptionId
      );

      return res.status(200).json({ success: true, data: prescription });
    } catch (error: any) {
      console.error("[DentistryPrescriptionController.getPrescriptionById] Error:", error);
      return res.status(404).json({
        success: false,
        error: error.message || "Receta odontológica no encontrada.",
      });
    }
  }

  /**
   * POST /api/organizations/:id/dentistry/patients/:patientId/prescriptions
   * Crea una nueva receta en DRAFT o ISSUED.
   */
  public static async createPrescription(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patientId = parseInt(String(req.params.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const user = (req as any).user || res.locals.user;
      const userId = user?.id ? parseInt(String(user.id), 10) : undefined;

      const {
        treatmentPlanId,
        treatmentItemId,
        executionId,
        diagnosis,
        procedure,
        generalInstructions,
        status,
        signedBy,
        items,
        medications,
      } = req.body;

      // Soporte flexible para body.items o body.medications (usado en frontend existente)
      const inputItems = Array.isArray(items) ? items : (Array.isArray(medications) ? medications : []);

      const prescription = await DentistryPrescriptionService.createPrescription(
        org.id,
        patientId,
        {
          treatmentPlanId: treatmentPlanId ? parseInt(String(treatmentPlanId), 10) : null,
          treatmentItemId: treatmentItemId ? parseInt(String(treatmentItemId), 10) : null,
          executionId: executionId ? parseInt(String(executionId), 10) : null,
          diagnosis,
          procedure,
          generalInstructions,
          status,
          signedBy: signedBy || user?.name || null,
          items: inputItems,
        },
        userId
      );

      return res.status(201).json({
        success: true,
        message: "Receta odontológica creada exitosamente.",
        data: prescription,
      });
    } catch (error: any) {
      console.error("[DentistryPrescriptionController.createPrescription] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al registrar receta odontológica.",
      });
    }
  }

  /**
   * PUT /api/organizations/:id/dentistry/patients/:patientId/prescriptions/:prescriptionId
   * Actualiza una receta en estado DRAFT (inmutable si está ISSUED o CANCELLED).
   */
  public static async updatePrescription(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patientId = parseInt(String(req.params.patientId), 10);
      const prescriptionId = parseInt(String(req.params.prescriptionId), 10);

      if (isNaN(patientId) || isNaN(prescriptionId)) {
        return res.status(400).json({
          success: false,
          error: "Identificadores de paciente o receta inválidos.",
        });
      }

      const user = (req as any).user || res.locals.user;
      const userId = user?.id ? parseInt(String(user.id), 10) : undefined;

      const {
        treatmentPlanId,
        treatmentItemId,
        diagnosis,
        procedure,
        generalInstructions,
        status,
        signedBy,
        items,
        medications,
      } = req.body;

      const inputItems = Array.isArray(items) ? items : (Array.isArray(medications) ? medications : undefined);

      const updated = await DentistryPrescriptionService.updatePrescription(
        org.id,
        patientId,
        prescriptionId,
        {
          treatmentPlanId: treatmentPlanId !== undefined ? (treatmentPlanId ? parseInt(String(treatmentPlanId), 10) : null) : undefined,
          treatmentItemId: treatmentItemId !== undefined ? (treatmentItemId ? parseInt(String(treatmentItemId), 10) : null) : undefined,
          diagnosis,
          procedure,
          generalInstructions,
          status,
          signedBy: signedBy || user?.name || null,
          items: inputItems,
        },
        userId
      );

      return res.status(200).json({
        success: true,
        message: "Receta odontológica actualizada exitosamente.",
        data: updated,
      });
    } catch (error: any) {
      console.error("[DentistryPrescriptionController.updatePrescription] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al actualizar receta odontológica.",
      });
    }
  }

  /**
   * POST /api/organizations/:id/dentistry/patients/:patientId/prescriptions/:prescriptionId/issue
   * Emite y sella formalmente una receta en DRAFT.
   */
  public static async issuePrescription(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patientId = parseInt(String(req.params.patientId), 10);
      const prescriptionId = parseInt(String(req.params.prescriptionId), 10);

      if (isNaN(patientId) || isNaN(prescriptionId)) {
        return res.status(400).json({
          success: false,
          error: "Identificadores de paciente o receta inválidos.",
        });
      }

      const user = (req as any).user || res.locals.user;
      const userId = user?.id ? parseInt(String(user.id), 10) : undefined;
      const signedBy = req.body.signedBy || user?.name || "Odontólogo Tratante";

      const issued = await DentistryPrescriptionService.issuePrescription(
        org.id,
        patientId,
        prescriptionId,
        userId,
        signedBy
      );

      return res.status(200).json({
        success: true,
        message: "Receta emitida formalmente y sellada con éxito.",
        data: issued,
      });
    } catch (error: any) {
      console.error("[DentistryPrescriptionController.issuePrescription] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al emitir receta odontológica.",
      });
    }
  }

  /**
   * POST /api/organizations/:id/dentistry/patients/:patientId/prescriptions/:prescriptionId/cancel
   * Anula una receta emitida requiriendo motivo de cancelación.
   */
  public static async cancelPrescription(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patientId = parseInt(String(req.params.patientId), 10);
      const prescriptionId = parseInt(String(req.params.prescriptionId), 10);

      if (isNaN(patientId) || isNaN(prescriptionId)) {
        return res.status(400).json({
          success: false,
          error: "Identificadores de paciente o receta inválidos.",
        });
      }

      const reason = req.body.reason || req.body.cancellationReason;
      if (!reason || !String(reason).trim()) {
        return res.status(400).json({
          success: false,
          error: "Debe proporcionar el motivo de anulación de la receta.",
        });
      }

      const cancelled = await DentistryPrescriptionService.cancelPrescription(
        org.id,
        patientId,
        prescriptionId,
        String(reason)
      );

      return res.status(200).json({
        success: true,
        message: "Receta anulada exitosamente.",
        data: cancelled,
      });
    } catch (error: any) {
      console.error("[DentistryPrescriptionController.cancelPrescription] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al anular receta odontológica.",
      });
    }
  }
}
