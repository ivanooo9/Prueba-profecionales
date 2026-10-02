import { Request, Response } from "express";
import { DentistryOdontogramService } from "../services/dentistry-odontogram.service";

export class DentistryOdontogramController {
  /**
   * GET /api/organizations/:id/dentistry/patients/:patientId/odontogram
   * Obtiene la lista de condiciones persistidas en el odontograma del paciente.
   * Regla de solo lectura: Cero efectos secundarios en base de datos.
   */
  public static async getOdontogram(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patientId = parseInt(String(req.params.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const snapshots = await DentistryOdontogramService.getOdontogram(org.id, patientId);
      return res.status(200).json({ success: true, data: snapshots });
    } catch (error: any) {
      console.error("[DentistryOdontogramController.getOdontogram] Error:", error);
      if (error.message?.includes("Paciente no encontrado")) {
        return res.status(404).json({ success: false, error: error.message });
      }
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener odontograma.",
      });
    }
  }

  /**
   * PUT /api/organizations/:id/dentistry/patients/:patientId/odontogram/teeth/:toothNumber
   * Guarda o actualiza el estado clínico de una pieza dental específica en el odontograma.
   */
  public static async saveTooth(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patientId = parseInt(String(req.params.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const toothNumber = parseInt(String(req.params.toothNumber), 10);
      if (isNaN(toothNumber)) {
        return res.status(400).json({ success: false, error: "Número de pieza dental inválido." });
      }

      const savedTooth = await DentistryOdontogramService.saveToothSnapshot(
        org.id,
        patientId,
        toothNumber,
        req.body
      );

      return res.status(200).json({
        success: true,
        message: "Pieza dental guardada en odontograma exitosamente.",
        data: savedTooth,
      });
    } catch (error: any) {
      console.error("[DentistryOdontogramController.saveTooth] Error:", error);
      if (error.message?.includes("Paciente no encontrado")) {
        return res.status(404).json({ success: false, error: error.message });
      }
      if (error.message?.includes("Pieza dental") || error.message?.includes("Estado clínico")) {
        return res.status(400).json({ success: false, error: error.message });
      }
      return res.status(400).json({
        success: false,
        error: error.message || "Error al guardar pieza en el odontograma.",
      });
    }
  }

  /**
   * GET /api/organizations/:id/dentistry/patients/:patientId/odontogram/teeth/:toothNumber/history
   * Obtiene el historial inmutable de cambios clínicos de una pieza específica.
   */
  public static async getToothHistory(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patientId = parseInt(String(req.params.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const toothNumber = parseInt(String(req.params.toothNumber), 10);
      if (isNaN(toothNumber)) {
        return res.status(400).json({ success: false, error: "Número de pieza dental inválido." });
      }

      const history = await DentistryOdontogramService.getToothHistory(
        org.id,
        patientId,
        toothNumber
      );
      return res.status(200).json({ success: true, data: history });
    } catch (error: any) {
      console.error("[DentistryOdontogramController.getToothHistory] Error:", error);
      if (error.message?.includes("Paciente no encontrado")) {
        return res.status(404).json({ success: false, error: error.message });
      }
      if (error.message?.includes("Pieza dental")) {
        return res.status(400).json({ success: false, error: error.message });
      }
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener historial de la pieza dental.",
      });
    }
  }

  /**
   * GET /api/organizations/:id/dentistry/patients/:patientId/odontogram/history
   * Obtiene el historial inmutable completo de todas las piezas del paciente.
   */
  public static async getOdontogramHistory(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patientId = parseInt(String(req.params.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const history = await DentistryOdontogramService.getOdontogramHistory(org.id, patientId);
      return res.status(200).json({ success: true, data: history });
    } catch (error: any) {
      console.error("[DentistryOdontogramController.getOdontogramHistory] Error:", error);
      if (error.message?.includes("Paciente no encontrado")) {
        return res.status(404).json({ success: false, error: error.message });
      }
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener historial del odontograma.",
      });
    }
  }
}

