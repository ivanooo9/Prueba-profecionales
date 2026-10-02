import { Request, Response } from "express";
import { DentistryTreatmentService } from "../services/dentistry-treatment.service";

export class DentistryTreatmentController {
  // -------------------------------------------------------------
  // CATÁLOGO DE PROCEDIMIENTOS (DentalProcedure)
  // -------------------------------------------------------------

  public static async getProcedures(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const activeOnly = req.query.all !== "true";
      const procedures = await DentistryTreatmentService.getProcedures(org.id, activeOnly);
      return res.status(200).json({ success: true, data: procedures });
    } catch (error: any) {
      console.error("[DentistryTreatmentController.getProcedures] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener catálogo de procedimientos.",
      });
    }
  }

  public static async createProcedure(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const { code, name, description, category, defaultPrice } = req.body;
      const created = await DentistryTreatmentService.createProcedure(org.id, {
        code,
        name,
        description,
        category,
        defaultPrice: typeof defaultPrice === "number" ? defaultPrice : undefined,
      });

      return res.status(201).json({
        success: true,
        message: "Procedimiento creado exitosamente.",
        data: created,
      });
    } catch (error: any) {
      console.error("[DentistryTreatmentController.createProcedure] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al crear procedimiento.",
      });
    }
  }

  public static async updateProcedure(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const procedureId = parseInt(String(req.params.procedureId), 10);
      if (isNaN(procedureId)) {
        return res.status(400).json({ success: false, error: "ID de procedimiento inválido." });
      }

      const { code, name, description, category, defaultPrice, isActive } = req.body;
      const updated = await DentistryTreatmentService.updateProcedure(org.id, procedureId, {
        code,
        name,
        description,
        category,
        defaultPrice: typeof defaultPrice === "number" ? defaultPrice : undefined,
        isActive: typeof isActive === "boolean" ? isActive : undefined,
      });

      return res.status(200).json({
        success: true,
        message: "Procedimiento actualizado exitosamente.",
        data: updated,
      });
    } catch (error: any) {
      console.error("[DentistryTreatmentController.updateProcedure] Error:", error);
      if (error.message?.includes("no encontrado")) {
        return res.status(404).json({ success: false, error: error.message });
      }
      return res.status(400).json({
        success: false,
        error: error.message || "Error al actualizar procedimiento.",
      });
    }
  }

  // -------------------------------------------------------------
  // PLANES DE TRATAMIENTO (DentalTreatmentPlan)
  // -------------------------------------------------------------

  public static async getTreatmentPlans(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patientId = parseInt(String(req.params.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const plans = await DentistryTreatmentService.getTreatmentPlans(org.id, patientId);
      return res.status(200).json({ success: true, data: plans });
    } catch (error: any) {
      console.error("[DentistryTreatmentController.getTreatmentPlans] Error:", error);
      if (error.message?.includes("Paciente no encontrado")) {
        return res.status(404).json({ success: false, error: error.message });
      }
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener planes de tratamiento.",
      });
    }
  }

  public static async getTreatmentPlanById(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patientId = parseInt(String(req.params.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const planId = parseInt(String(req.params.planId), 10);
      if (isNaN(planId)) {
        return res.status(400).json({ success: false, error: "ID de plan inválido." });
      }

      const plan = await DentistryTreatmentService.getTreatmentPlanById(org.id, patientId, planId);
      return res.status(200).json({ success: true, data: plan });
    } catch (error: any) {
      console.error("[DentistryTreatmentController.getTreatmentPlanById] Error:", error);
      if (error.message?.includes("no encontrado")) {
        return res.status(404).json({ success: false, error: error.message });
      }
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener detalle del plan de tratamiento.",
      });
    }
  }

  public static async createTreatmentPlan(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patientId = parseInt(String(req.params.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const { title, status, notes } = req.body;
      const created = await DentistryTreatmentService.createTreatmentPlan(org.id, patientId, {
        title,
        status,
        notes,
      });

      return res.status(201).json({
        success: true,
        message: "Plan de tratamiento creado exitosamente.",
        data: created,
      });
    } catch (error: any) {
      console.error("[DentistryTreatmentController.createTreatmentPlan] Error:", error);
      if (error.message?.includes("Paciente no encontrado")) {
        return res.status(404).json({ success: false, error: error.message });
      }
      return res.status(400).json({
        success: false,
        error: error.message || "Error al crear plan de tratamiento.",
      });
    }
  }

  public static async updateTreatmentPlan(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patientId = parseInt(String(req.params.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const planId = parseInt(String(req.params.planId), 10);
      if (isNaN(planId)) {
        return res.status(400).json({ success: false, error: "ID de plan inválido." });
      }

      const { title, status, notes } = req.body;
      const updated = await DentistryTreatmentService.updateTreatmentPlan(
        org.id,
        patientId,
        planId,
        { title, status, notes }
      );

      return res.status(200).json({
        success: true,
        message: "Plan de tratamiento actualizado exitosamente.",
        data: updated,
      });
    } catch (error: any) {
      console.error("[DentistryTreatmentController.updateTreatmentPlan] Error:", error);
      if (error.message?.includes("no encontrado")) {
        return res.status(404).json({ success: false, error: error.message });
      }
      return res.status(400).json({
        success: false,
        error: error.message || "Error al actualizar plan de tratamiento.",
      });
    }
  }

  // -------------------------------------------------------------
  // ITEMS DEL PLAN DE TRATAMIENTO (DentalTreatmentItem)
  // -------------------------------------------------------------

  public static async addTreatmentItem(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patientId = parseInt(String(req.params.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const planId = parseInt(String(req.params.planId), 10);
      if (isNaN(planId)) {
        return res.status(400).json({ success: false, error: "ID de plan inválido." });
      }

      const { procedureId, toothNumber, procedureName, unitPrice, status, notes } = req.body;
      const added = await DentistryTreatmentService.addTreatmentItem(org.id, patientId, planId, {
        procedureId,
        toothNumber,
        procedureName,
        unitPrice,
        status,
        notes,
      });

      return res.status(201).json({
        success: true,
        message: "Procedimiento agregado al plan exitosamente.",
        data: added,
      });
    } catch (error: any) {
      console.error("[DentistryTreatmentController.addTreatmentItem] Error:", error);
      if (error.message?.includes("no encontrado")) {
        return res.status(404).json({ success: false, error: error.message });
      }
      return res.status(400).json({
        success: false,
        error: error.message || "Error al agregar procedimiento al plan de tratamiento.",
      });
    }
  }

  public static async updateTreatmentItem(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patientId = parseInt(String(req.params.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const planId = parseInt(String(req.params.planId), 10);
      if (isNaN(planId)) {
        return res.status(400).json({ success: false, error: "ID de plan inválido." });
      }

      const itemId = parseInt(String(req.params.itemId), 10);
      if (isNaN(itemId)) {
        return res.status(400).json({ success: false, error: "ID de item inválido." });
      }

      const { toothNumber, procedureName, unitPrice, status, notes } = req.body;
      const updated = await DentistryTreatmentService.updateTreatmentItem(
        org.id,
        patientId,
        planId,
        itemId,
        {
          toothNumber,
          procedureName,
          unitPrice,
          status,
          notes,
        }
      );

      return res.status(200).json({
        success: true,
        message: "Item de tratamiento actualizado exitosamente.",
        data: updated,
      });
    } catch (error: any) {
      console.error("[DentistryTreatmentController.updateTreatmentItem] Error:", error);
      if (error.message?.includes("no encontrado")) {
        return res.status(404).json({ success: false, error: error.message });
      }
      return res.status(400).json({
        success: false,
        error: error.message || "Error al actualizar item de tratamiento.",
      });
    }
  }

  public static async deleteTreatmentItem(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patientId = parseInt(String(req.params.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const planId = parseInt(String(req.params.planId), 10);
      if (isNaN(planId)) {
        return res.status(400).json({ success: false, error: "ID de plan inválido." });
      }

      const itemId = parseInt(String(req.params.itemId), 10);
      if (isNaN(itemId)) {
        return res.status(400).json({ success: false, error: "ID de item inválido." });
      }

      const result = await DentistryTreatmentService.deleteTreatmentItem(
        org.id,
        patientId,
        planId,
        itemId
      );

      return res.status(200).json(result);
    } catch (error: any) {
      console.error("[DentistryTreatmentController.deleteTreatmentItem] Error:", error);
      if (error.message?.includes("no encontrado")) {
        return res.status(404).json({ success: false, error: error.message });
      }
      return res.status(400).json({
        success: false,
        error: error.message || "Error al eliminar item del plan de tratamiento.",
      });
    }
  }
}
