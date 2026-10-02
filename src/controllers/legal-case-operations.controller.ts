import { Request, Response } from "express";
import { LegalCaseOperationsService } from "../services/legal-case-operations.service";

export class LegalCaseOperationsController {
  private static getOrgId(req: Request, res: Response): number | null {
    const org = (req as any).organization || res.locals.organization;
    if (org?.id) return org.id;

    const paramId = req.params.id || req.params.organizationId;
    if (paramId) {
      const parsed = parseInt(String(paramId), 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return null;
  }

  private static getCaseId(req: Request): number | null {
    const caseId = req.params.caseId;
    if (caseId) {
      const parsed = parseInt(String(caseId), 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return null;
  }

  private static getAuthUserId(req: Request, res: Response): number | undefined {
    const user = (req as any).user || res.locals.user;
    return user?.id ? Number(user.id) : undefined;
  }

  // -------------------------------------------------------------
  // ACTUACIONES / BITÁCORA DEL CASO
  // -------------------------------------------------------------

  public static async getActivities(req: Request, res: Response) {
    try {
      const orgId = LegalCaseOperationsController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const caseId = LegalCaseOperationsController.getCaseId(req);
      if (!caseId) {
        return res.status(400).json({ success: false, error: "ID de caso inválido." });
      }

      const activities = await LegalCaseOperationsService.listCaseActivities(orgId, caseId);
      return res.status(200).json({ success: true, data: activities });
    } catch (error: any) {
      console.error("[LegalCaseOperationsController.getActivities] Error:", error);
      return res.status(error.message?.includes("no encontrado") ? 404 : 500).json({
        success: false,
        error: error.message || "Error al obtener actuaciones del caso.",
      });
    }
  }

  public static async createActivity(req: Request, res: Response) {
    try {
      const orgId = LegalCaseOperationsController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const caseId = LegalCaseOperationsController.getCaseId(req);
      if (!caseId) {
        return res.status(400).json({ success: false, error: "ID de caso inválido." });
      }

      const authUserId = LegalCaseOperationsController.getAuthUserId(req, res);

      const { type, title, description, occurredAt, performedBy, organizationId, legalCaseId } = req.body;

      const activity = await LegalCaseOperationsService.addCaseActivity(
        orgId,
        caseId,
        {
          type,
          title,
          description,
          occurredAt,
          performedBy,
          organizationId: organizationId ? Number(organizationId) : undefined,
          legalCaseId: legalCaseId ? Number(legalCaseId) : undefined,
        },
        authUserId
      );

      return res.status(201).json({ success: true, data: activity });
    } catch (error: any) {
      console.error("[LegalCaseOperationsController.createActivity] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al registrar la actuación.",
      });
    }
  }

  // -------------------------------------------------------------
  // TAREAS OPERATIVAS (LegalTask)
  // -------------------------------------------------------------

  public static async getCaseTasks(req: Request, res: Response) {
    try {
      const orgId = LegalCaseOperationsController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const caseId = LegalCaseOperationsController.getCaseId(req);
      if (!caseId) {
        return res.status(400).json({ success: false, error: "ID de caso inválido." });
      }

      const tasks = await LegalCaseOperationsService.listTasks(orgId, { caseId });
      return res.status(200).json({ success: true, data: tasks });
    } catch (error: any) {
      console.error("[LegalCaseOperationsController.getCaseTasks] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener tareas del caso.",
      });
    }
  }

  public static async getGlobalTasks(req: Request, res: Response) {
    try {
      const orgId = LegalCaseOperationsController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const { caseId, status, assignedToUserId, priority } = req.query;

      const tasks = await LegalCaseOperationsService.listTasks(orgId, {
        caseId: caseId ? parseInt(String(caseId), 10) : undefined,
        status: status ? String(status) : undefined,
        assignedToUserId: assignedToUserId ? parseInt(String(assignedToUserId), 10) : undefined,
        priority: priority ? String(priority) : undefined,
      });

      return res.status(200).json({ success: true, data: tasks });
    } catch (error: any) {
      console.error("[LegalCaseOperationsController.getGlobalTasks] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener listado global de tareas.",
      });
    }
  }

  public static async createCaseTask(req: Request, res: Response) {
    try {
      const orgId = LegalCaseOperationsController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const caseId = LegalCaseOperationsController.getCaseId(req);
      if (!caseId) {
        return res.status(400).json({ success: false, error: "ID de caso inválido." });
      }

      const {
        title,
        description,
        dueDate,
        priority,
        status,
        assignedToUserId,
        assignedTo,
        organizationId,
        legalCaseId,
      } = req.body;

      const task = await LegalCaseOperationsService.createTask(orgId, caseId, {
        title,
        description,
        dueDate,
        priority,
        status,
        assignedToUserId: assignedToUserId ? Number(assignedToUserId) : undefined,
        assignedTo,
        organizationId: organizationId ? Number(organizationId) : undefined,
        legalCaseId: legalCaseId ? Number(legalCaseId) : undefined,
      });

      return res.status(201).json({ success: true, data: task });
    } catch (error: any) {
      console.error("[LegalCaseOperationsController.createCaseTask] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al crear la tarea operativa.",
      });
    }
  }

  public static async updateCaseTask(req: Request, res: Response) {
    try {
      const orgId = LegalCaseOperationsController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const caseId = LegalCaseOperationsController.getCaseId(req);
      if (!caseId) {
        return res.status(400).json({ success: false, error: "ID de caso inválido." });
      }

      const taskId = parseInt(String(req.params.taskId), 10);
      if (isNaN(taskId) || taskId <= 0) {
        return res.status(400).json({ success: false, error: "ID de tarea inválido." });
      }

      const task = await LegalCaseOperationsService.updateTask(orgId, caseId, taskId, req.body);
      return res.status(200).json({ success: true, data: task });
    } catch (error: any) {
      console.error("[LegalCaseOperationsController.updateCaseTask] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al actualizar la tarea operativa.",
      });
    }
  }

  // -------------------------------------------------------------
  // PLAZOS PROCESALES (LegalDeadline)
  // -------------------------------------------------------------

  public static async getCaseDeadlines(req: Request, res: Response) {
    try {
      const orgId = LegalCaseOperationsController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const caseId = LegalCaseOperationsController.getCaseId(req);
      if (!caseId) {
        return res.status(400).json({ success: false, error: "ID de caso inválido." });
      }

      const deadlines = await LegalCaseOperationsService.listDeadlines(orgId, { caseId });
      return res.status(200).json({ success: true, data: deadlines });
    } catch (error: any) {
      console.error("[LegalCaseOperationsController.getCaseDeadlines] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener plazos del caso.",
      });
    }
  }

  public static async getGlobalDeadlines(req: Request, res: Response) {
    try {
      const orgId = LegalCaseOperationsController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const { caseId, status, urgent } = req.query;

      const deadlines = await LegalCaseOperationsService.listDeadlines(orgId, {
        caseId: caseId ? parseInt(String(caseId), 10) : undefined,
        status: status ? String(status) : undefined,
        urgent: urgent !== undefined ? String(urgent) === "true" : undefined,
      });

      return res.status(200).json({ success: true, data: deadlines });
    } catch (error: any) {
      console.error("[LegalCaseOperationsController.getGlobalDeadlines] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener listado global de plazos procesales.",
      });
    }
  }

  public static async createCaseDeadline(req: Request, res: Response) {
    try {
      const orgId = LegalCaseOperationsController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const caseId = LegalCaseOperationsController.getCaseId(req);
      if (!caseId) {
        return res.status(400).json({ success: false, error: "ID de caso inválido." });
      }

      const deadline = await LegalCaseOperationsService.createDeadline(orgId, caseId, req.body);
      return res.status(201).json({ success: true, data: deadline });
    } catch (error: any) {
      console.error("[LegalCaseOperationsController.createCaseDeadline] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al registrar el plazo procesal.",
      });
    }
  }

  public static async updateCaseDeadline(req: Request, res: Response) {
    try {
      const orgId = LegalCaseOperationsController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const caseId = LegalCaseOperationsController.getCaseId(req);
      if (!caseId) {
        return res.status(400).json({ success: false, error: "ID de caso inválido." });
      }

      const deadlineId = parseInt(String(req.params.deadlineId), 10);
      if (isNaN(deadlineId) || deadlineId <= 0) {
        return res.status(400).json({ success: false, error: "ID de plazo procesal inválido." });
      }

      const deadline = await LegalCaseOperationsService.updateDeadline(
        orgId,
        caseId,
        deadlineId,
        req.body
      );
      return res.status(200).json({ success: true, data: deadline });
    } catch (error: any) {
      console.error("[LegalCaseOperationsController.updateCaseDeadline] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al actualizar el plazo procesal.",
      });
    }
  }

  // -------------------------------------------------------------
  // AUDIENCIAS Y DILIGENCIAS (LegalHearing)
  // -------------------------------------------------------------

  public static async getCaseHearings(req: Request, res: Response) {
    try {
      const orgId = LegalCaseOperationsController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const caseId = LegalCaseOperationsController.getCaseId(req);
      if (!caseId) {
        return res.status(400).json({ success: false, error: "ID de caso inválido." });
      }

      const hearings = await LegalCaseOperationsService.listHearings(orgId, { caseId });
      return res.status(200).json({ success: true, data: hearings });
    } catch (error: any) {
      console.error("[LegalCaseOperationsController.getCaseHearings] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener audiencias del caso.",
      });
    }
  }

  public static async getGlobalHearings(req: Request, res: Response) {
    try {
      const orgId = LegalCaseOperationsController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const { caseId, status, from, to } = req.query;

      const hearings = await LegalCaseOperationsService.listHearings(orgId, {
        caseId: caseId ? parseInt(String(caseId), 10) : undefined,
        status: status ? String(status) : undefined,
        from: from ? new Date(String(from)) : undefined,
        to: to ? new Date(String(to)) : undefined,
      });

      return res.status(200).json({ success: true, data: hearings });
    } catch (error: any) {
      console.error("[LegalCaseOperationsController.getGlobalHearings] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener listado global de audiencias.",
      });
    }
  }

  public static async createCaseHearing(req: Request, res: Response) {
    try {
      const orgId = LegalCaseOperationsController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const caseId = LegalCaseOperationsController.getCaseId(req);
      if (!caseId) {
        return res.status(400).json({ success: false, error: "ID de caso inválido." });
      }

      const hearing = await LegalCaseOperationsService.createHearing(orgId, caseId, req.body);
      return res.status(201).json({ success: true, data: hearing });
    } catch (error: any) {
      console.error("[LegalCaseOperationsController.createCaseHearing] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al programar la audiencia.",
      });
    }
  }

  public static async updateCaseHearing(req: Request, res: Response) {
    try {
      const orgId = LegalCaseOperationsController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const caseId = LegalCaseOperationsController.getCaseId(req);
      if (!caseId) {
        return res.status(400).json({ success: false, error: "ID de caso inválido." });
      }

      const hearingId = parseInt(String(req.params.hearingId), 10);
      if (isNaN(hearingId) || hearingId <= 0) {
        return res.status(400).json({ success: false, error: "ID de audiencia inválido." });
      }

      const hearing = await LegalCaseOperationsService.updateHearing(
        orgId,
        caseId,
        hearingId,
        req.body
      );
      return res.status(200).json({ success: true, data: hearing });
    } catch (error: any) {
      console.error("[LegalCaseOperationsController.updateCaseHearing] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al actualizar la audiencia.",
      });
    }
  }
}
