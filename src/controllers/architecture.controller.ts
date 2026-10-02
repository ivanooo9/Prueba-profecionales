import { Request, Response } from "express";
import multer from "multer";
import { ArchitectureService } from "../services/architecture.service";

// Middleware Multer para subida de planos y documentos técnicos (hasta 50 MB)
export const architectureUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

export class ArchitectureController {
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

  private static getUserId(req: Request, res: Response): number {
    const user = (req as any).user || res.locals.user;
    return user?.id || 1;
  }

  private static extractFilePayload(req: Request): {
    originalName: string;
    mimeType: string;
    buffer: Buffer;
    notes?: string | null;
  } | null {
    // 1. Soporte para multipart/form-data vía req.file de multer
    if (req.file) {
      return {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        buffer: req.file.buffer,
        notes: req.body?.notes || null,
      };
    }

    // 2. Soporte para payload Base64 (API JSON / tests)
    const base64Data =
      req.body?.fileBase64 || req.body?.base64 || req.body?.fileContent;
    if (base64Data && typeof base64Data === "string") {
      const cleanBase64 = base64Data.includes(";base64,")
        ? base64Data.split(";base64,")[1]
        : base64Data;
      const buffer = Buffer.from(cleanBase64, "base64");
      const originalName =
        req.body?.fileName || req.body?.originalName || "documento.pdf";
      const mimeType = req.body?.mimeType || "application/pdf";
      return {
        originalName,
        mimeType,
        buffer,
        notes: req.body?.notes || null,
      };
    }

    // 3. Soporte para Buffer directo
    if (req.body?.buffer && Buffer.isBuffer(req.body.buffer)) {
      return {
        originalName:
          req.body?.fileName || req.body?.originalName || "documento.pdf",
        mimeType: req.body?.mimeType || "application/pdf",
        buffer: req.body.buffer,
        notes: req.body?.notes || null,
      };
    }

    return null;
  }

  // -------------------------------------------------------------
  // CLIENTES (ArchitectureClient)
  // -------------------------------------------------------------
  public static async getClients(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const { search, status, clientType, limit, offset } = req.query;

      const clients = await ArchitectureService.listClients(orgId, {
        search: search ? String(search) : undefined,
        status: status ? String(status) : undefined,
        clientType: clientType ? String(clientType) : undefined,
        limit: limit ? parseInt(String(limit), 10) : undefined,
        offset: offset ? parseInt(String(offset), 10) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: clients,
      });
    } catch (error: any) {
      console.error("[ArchitectureController.getClients] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener clientes.",
      });
    }
  }

  public static async getClientById(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const clientId = parseInt(String(req.params.clientId), 10);
      if (isNaN(clientId) || clientId <= 0) {
        return res.status(400).json({ success: false, error: "ID de cliente inválido." });
      }

      const client = await ArchitectureService.getClientById(orgId, clientId);
      return res.status(200).json({ success: true, data: client });
    } catch (error: any) {
      const isNotFound = error.message?.includes("no encontrado");
      const status = isNotFound ? 404 : 500;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al obtener el cliente.",
      });
    }
  }

  public static async createClient(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const userId = ArchitectureController.getUserId(req, res);
      const client = await ArchitectureService.createClient(orgId, userId, req.body);

      return res.status(201).json({
        success: true,
        data: client,
        message: "Cliente creado exitosamente.",
      });
    } catch (error: any) {
      const isValidation =
        error.message?.includes("obligatorio") ||
        error.message?.includes("Ya existe");
      const status = isValidation ? 400 : 500;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al crear el cliente.",
      });
    }
  }

  public static async updateClient(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const clientId = parseInt(String(req.params.clientId), 10);
      if (isNaN(clientId) || clientId <= 0) {
        return res.status(400).json({ success: false, error: "ID de cliente inválido." });
      }

      const updated = await ArchitectureService.updateClient(orgId, clientId, req.body);
      return res.status(200).json({
        success: true,
        data: updated,
        message: "Cliente actualizado exitosamente.",
      });
    } catch (error: any) {
      const isValidation =
        error.message?.includes("vacío") ||
        error.message?.includes("Ya existe") ||
        error.message?.includes("inválido");
      const isNotFound = error.message?.includes("no encontrado");
      const status = isNotFound ? 404 : isValidation ? 400 : 500;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al actualizar el cliente.",
      });
    }
  }

  public static async inactivateClient(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const clientId = parseInt(String(req.params.clientId), 10);
      if (isNaN(clientId) || clientId <= 0) {
        return res.status(400).json({ success: false, error: "ID de cliente inválido." });
      }

      const inactivated = await ArchitectureService.inactivateClient(orgId, clientId);
      return res.status(200).json({
        success: true,
        data: inactivated,
        message: "Cliente inactivado exitosamente.",
      });
    } catch (error: any) {
      const isNotFound = error.message?.includes("no encontrado");
      const status = isNotFound ? 404 : 500;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al inactivar el cliente.",
      });
    }
  }

  // -------------------------------------------------------------
  // PROYECTOS (ArchitectureProject)
  // -------------------------------------------------------------
  public static async getProjects(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const { search, status, clientId, type, leadArchitectUserId, includeArchived, limit, offset } = req.query;

      const projects = await ArchitectureService.listProjects(orgId, {
        search: search ? String(search) : undefined,
        status: status ? String(status) : undefined,
        clientId: clientId ? parseInt(String(clientId), 10) : undefined,
        type: type ? String(type) : undefined,
        leadArchitectUserId: leadArchitectUserId ? parseInt(String(leadArchitectUserId), 10) : undefined,
        includeArchived: includeArchived === "true" || includeArchived === "1",
        limit: limit ? parseInt(String(limit), 10) : undefined,
        offset: offset ? parseInt(String(offset), 10) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: projects,
      });
    } catch (error: any) {
      console.error("[ArchitectureController.getProjects] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener proyectos.",
      });
    }
  }

  public static async getProjectById(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const projectId = parseInt(String(req.params.projectId), 10);
      if (isNaN(projectId) || projectId <= 0) {
        return res.status(400).json({ success: false, error: "ID de proyecto inválido." });
      }

      const project = await ArchitectureService.getProjectById(orgId, projectId);
      return res.status(200).json({ success: true, data: project });
    } catch (error: any) {
      const isNotFound = error.message?.includes("no encontrado");
      const status = isNotFound ? 404 : 500;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al obtener el proyecto.",
      });
    }
  }

  public static async createProject(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const userId = ArchitectureController.getUserId(req, res);
      const project = await ArchitectureService.createProject(orgId, userId, req.body);

      return res.status(201).json({
        success: true,
        data: project,
        message: "Proyecto creado exitosamente con sus 6 etapas base.",
      });
    } catch (error: any) {
      const isValidation =
        error.message?.includes("obligatorio") ||
        error.message?.includes("no existe") ||
        error.message?.includes("no autorizado") ||
        error.message?.includes("no es un miembro activo");
      const status = isValidation ? 400 : 500;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al crear el proyecto.",
      });
    }
  }

  public static async updateProject(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const projectId = parseInt(String(req.params.projectId), 10);
      if (isNaN(projectId) || projectId <= 0) {
        return res.status(400).json({ success: false, error: "ID de proyecto inválido." });
      }

      const updated = await ArchitectureService.updateProject(orgId, projectId, req.body);
      return res.status(200).json({
        success: true,
        data: updated,
        message: "Proyecto actualizado exitosamente.",
      });
    } catch (error: any) {
      const isNotFound = error.message?.includes("no encontrado");
      const isValidation =
        error.message?.includes("archivado") ||
        error.message?.includes("no autorizado") ||
        error.message?.includes("obligatorio");
      const status = isNotFound ? 404 : isValidation ? 400 : 500;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al actualizar el proyecto.",
      });
    }
  }

  public static async archiveProject(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const projectId = parseInt(String(req.params.projectId), 10);
      if (isNaN(projectId) || projectId <= 0) {
        return res.status(400).json({ success: false, error: "ID de proyecto inválido." });
      }

      const userId = ArchitectureController.getUserId(req, res);
      const archived = await ArchitectureService.archiveProject(
        orgId,
        projectId,
        userId,
        req.body?.reason
      );

      return res.status(200).json({
        success: true,
        data: archived,
        message: "Proyecto archivado exitosamente.",
      });
    } catch (error: any) {
      const isNotFound = error.message?.includes("no encontrado");
      const status = isNotFound ? 404 : 500;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al archivar el proyecto.",
      });
    }
  }

  public static async unarchiveProject(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const projectId = parseInt(String(req.params.projectId), 10);
      if (isNaN(projectId) || projectId <= 0) {
        return res.status(400).json({ success: false, error: "ID de proyecto inválido." });
      }

      const restored = await ArchitectureService.unarchiveProject(orgId, projectId);
      return res.status(200).json({
        success: true,
        data: restored,
        message: "Proyecto restaurado exitosamente.",
      });
    } catch (error: any) {
      const isNotFound = error.message?.includes("no encontrado");
      const status = isNotFound ? 404 : 500;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al restaurar el proyecto.",
      });
    }
  }

  // -------------------------------------------------------------
  // ETAPAS (ArchitectureProjectStage)
  // -------------------------------------------------------------
  public static async updateStage(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const projectId = parseInt(String(req.params.projectId), 10);
      const stageId = parseInt(String(req.params.stageId), 10);
      if (isNaN(projectId) || isNaN(stageId) || projectId <= 0 || stageId <= 0) {
        return res.status(400).json({ success: false, error: "IDs de proyecto o etapa inválidos." });
      }

      const updatedProject = await ArchitectureService.updateStage(
        orgId,
        projectId,
        stageId,
        req.body
      );

      return res.status(200).json({
        success: true,
        data: updatedProject,
        message: "Etapa actualizada exitosamente.",
      });
    } catch (error: any) {
      const isNotFound = error.message?.includes("no encontrada") || error.message?.includes("no encontrado");
      const isValidation = error.message?.includes("número entero entre 0 y 100");
      const status = isNotFound ? 404 : isValidation ? 400 : 500;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al actualizar la etapa.",
      });
    }
  }

  // -------------------------------------------------------------
  // TAREAS (ArchitectureTask)
  // -------------------------------------------------------------
  public static async getTasks(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const projectIdParam = req.params.projectId || req.query.projectId;
      const stageIdParam = req.params.stageId || req.query.stageId;
      const assignedToUserIdParam = req.query.assignedToUserId;

      const tasks = await ArchitectureService.listTasks(orgId, {
        projectId: projectIdParam ? parseInt(String(projectIdParam), 10) : undefined,
        stageId: stageIdParam ? parseInt(String(stageIdParam), 10) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
        assignedToUserId: assignedToUserIdParam ? parseInt(String(assignedToUserIdParam), 10) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
      });

      return res.status(200).json({ success: true, data: tasks });
    } catch (error: any) {
      console.error("[ArchitectureController.getTasks] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener tareas.",
      });
    }
  }

  public static async getTaskById(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const taskId = parseInt(String(req.params.taskId), 10);
      if (isNaN(taskId) || taskId <= 0) {
        return res.status(400).json({ success: false, error: "ID de tarea inválido." });
      }

      const task = await ArchitectureService.getTaskById(orgId, taskId);
      return res.status(200).json({ success: true, data: task });
    } catch (error: any) {
      const isNotFound = error.message?.includes("no encontrada");
      const status = isNotFound ? 404 : 500;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al obtener la tarea.",
      });
    }
  }

  public static async createTask(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const userId = ArchitectureController.getUserId(req, res);
      const projectId = req.params.projectId ? parseInt(String(req.params.projectId), 10) : req.body.projectId;

      const task = await ArchitectureService.createTask(orgId, userId, {
        ...req.body,
        projectId: projectId ? parseInt(String(projectId), 10) : undefined,
      });

      return res.status(201).json({
        success: true,
        data: task,
        message: "Tarea creada exitosamente.",
      });
    } catch (error: any) {
      const isValidation =
        error.message?.includes("obligatorio") ||
        error.message?.includes("archivado") ||
        error.message?.includes("inválido") ||
        error.message?.includes("no pertenece") ||
        error.message?.includes("no existe") ||
        error.message?.includes("no es un miembro activo");
      const isNotFound = error.message?.includes("no encontrado");
      const status = isNotFound ? 404 : isValidation ? 400 : 500;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al crear la tarea.",
      });
    }
  }

  public static async updateTask(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const taskId = parseInt(String(req.params.taskId), 10);
      if (isNaN(taskId) || taskId <= 0) {
        return res.status(400).json({ success: false, error: "ID de tarea inválido." });
      }

      const updated = await ArchitectureService.updateTask(orgId, taskId, req.body);
      return res.status(200).json({
        success: true,
        data: updated,
        message: "Tarea actualizada exitosamente.",
      });
    } catch (error: any) {
      const isValidation =
        error.message?.includes("vacío") ||
        error.message?.includes("archivado") ||
        error.message?.includes("inválido") ||
        error.message?.includes("no pertenece") ||
        error.message?.includes("no existe") ||
        error.message?.includes("no es un miembro activo");
      const isNotFound = error.message?.includes("no encontrada");
      const status = isNotFound ? 404 : isValidation ? 400 : 500;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al actualizar la tarea.",
      });
    }
  }

  public static async toggleTaskStatus(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const taskId = parseInt(String(req.params.taskId), 10);
      if (isNaN(taskId) || taskId <= 0) {
        return res.status(400).json({ success: false, error: "ID de tarea inválido." });
      }

      const toggled = await ArchitectureService.toggleTaskStatus(orgId, taskId);
      return res.status(200).json({
        success: true,
        data: toggled,
        message: "Estado de tarea actualizado exitosamente.",
      });
    } catch (error: any) {
      const isValidation = error.message?.includes("archivado");
      const isNotFound = error.message?.includes("no encontrada");
      const status = isNotFound ? 404 : isValidation ? 400 : 500;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al cambiar estado de la tarea.",
      });
    }
  }

  // -------------------------------------------------------------
  // ENTREGABLES (ArchitectureDeliverable)
  // -------------------------------------------------------------
  public static async getDeliverables(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const projectIdParam = req.params.projectId || req.query.projectId;
      const stageIdParam = req.params.stageId || req.query.stageId;
      const assignedToUserIdParam = req.query.assignedToUserId;

      const deliverables = await ArchitectureService.listDeliverables(orgId, {
        projectId: projectIdParam ? parseInt(String(projectIdParam), 10) : undefined,
        stageId: stageIdParam ? parseInt(String(stageIdParam), 10) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
        assignedToUserId: assignedToUserIdParam ? parseInt(String(assignedToUserIdParam), 10) : undefined,
        type: req.query.type ? String(req.query.type) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
      });

      return res.status(200).json({ success: true, data: deliverables });
    } catch (error: any) {
      console.error("[ArchitectureController.getDeliverables] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener entregables.",
      });
    }
  }

  public static async getDeliverableById(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const deliverableId = parseInt(String(req.params.deliverableId), 10);
      if (isNaN(deliverableId) || deliverableId <= 0) {
        return res.status(400).json({ success: false, error: "ID de entregable inválido." });
      }

      const deliverable = await ArchitectureService.getDeliverableById(orgId, deliverableId);
      return res.status(200).json({ success: true, data: deliverable });
    } catch (error: any) {
      const isNotFound = error.message?.includes("no encontrado");
      const status = isNotFound ? 404 : 500;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al obtener el entregable.",
      });
    }
  }

  public static async createDeliverable(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const userId = ArchitectureController.getUserId(req, res);
      const projectId = req.params.projectId ? parseInt(String(req.params.projectId), 10) : req.body.projectId;

      const deliverable = await ArchitectureService.createDeliverable(orgId, userId, {
        ...req.body,
        projectId: projectId ? parseInt(String(projectId), 10) : undefined,
      });

      return res.status(201).json({
        success: true,
        data: deliverable,
        message: "Entregable registrado exitosamente.",
      });
    } catch (error: any) {
      const isValidation =
        error.message?.includes("obligatorio") ||
        error.message?.includes("archivado") ||
        error.message?.includes("inválido") ||
        error.message?.includes("no pertenece") ||
        error.message?.includes("no existe") ||
        error.message?.includes("no es un miembro activo");
      const isNotFound = error.message?.includes("no encontrado");
      const status = isNotFound ? 404 : isValidation ? 400 : 500;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al registrar el entregable.",
      });
    }
  }

  public static async updateDeliverable(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const deliverableId = parseInt(String(req.params.deliverableId), 10);
      if (isNaN(deliverableId) || deliverableId <= 0) {
        return res.status(400).json({ success: false, error: "ID de entregable inválido." });
      }

      const updated = await ArchitectureService.updateDeliverable(orgId, deliverableId, req.body);
      return res.status(200).json({
        success: true,
        data: updated,
        message: "Entregable actualizado exitosamente.",
      });
    } catch (error: any) {
      const isValidation =
        error.message?.includes("vacío") ||
        error.message?.includes("archivado") ||
        error.message?.includes("inválido") ||
        error.message?.includes("no pertenece") ||
        error.message?.includes("no existe") ||
        error.message?.includes("no es un miembro activo");
      const isNotFound = error.message?.includes("no encontrado");
      const status = isNotFound ? 404 : isValidation ? 400 : 500;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al actualizar el entregable.",
      });
    }
  }

  // -------------------------------------------------------------
  // REUNIONES E INSPECCIONES (ArchitectureMeeting)
  // -------------------------------------------------------------
  public static async getMeetings(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const projectIdParam = req.params.projectId || req.query.projectId;
      const leadArchitectUserIdParam = req.query.leadArchitectUserId;

      const meetings = await ArchitectureService.listMeetings(orgId, {
        projectId: projectIdParam ? parseInt(String(projectIdParam), 10) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
        leadArchitectUserId: leadArchitectUserIdParam ? parseInt(String(leadArchitectUserIdParam), 10) : undefined,
        modality: req.query.modality ? String(req.query.modality) : undefined,
        meetingType: req.query.meetingType ? String(req.query.meetingType) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
      });

      return res.status(200).json({ success: true, data: meetings });
    } catch (error: any) {
      console.error("[ArchitectureController.getMeetings] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener reuniones.",
      });
    }
  }

  public static async getMeetingById(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const meetingId = parseInt(String(req.params.meetingId), 10);
      if (isNaN(meetingId) || meetingId <= 0) {
        return res.status(400).json({ success: false, error: "ID de reunión inválido." });
      }

      const meeting = await ArchitectureService.getMeetingById(orgId, meetingId);
      return res.status(200).json({ success: true, data: meeting });
    } catch (error: any) {
      const isNotFound = error.message?.includes("no encontrada");
      const status = isNotFound ? 404 : 500;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al obtener la reunión.",
      });
    }
  }

  public static async createMeeting(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const userId = ArchitectureController.getUserId(req, res);
      const projectId = req.params.projectId ? parseInt(String(req.params.projectId), 10) : req.body.projectId;

      const meeting = await ArchitectureService.createMeeting(orgId, userId, {
        ...req.body,
        projectId: projectId ? parseInt(String(projectId), 10) : undefined,
      });

      return res.status(201).json({
        success: true,
        data: meeting,
        message: "Reunión agendada exitosamente.",
      });
    } catch (error: any) {
      const isValidation =
        error.message?.includes("obligatorio") ||
        error.message?.includes("obligatoria") ||
        error.message?.includes("archivado") ||
        error.message?.includes("inválido") ||
        error.message?.includes("no está autorizado") ||
        error.message?.includes("no es un miembro activo");
      const isNotFound = error.message?.includes("no encontrado");
      const status = isNotFound ? 404 : isValidation ? 400 : 500;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al agendar la reunión.",
      });
    }
  }

  public static async updateMeeting(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const meetingId = parseInt(String(req.params.meetingId), 10);
      if (isNaN(meetingId) || meetingId <= 0) {
        return res.status(400).json({ success: false, error: "ID de reunión inválido." });
      }

      const updated = await ArchitectureService.updateMeeting(orgId, meetingId, req.body);
      return res.status(200).json({
        success: true,
        data: updated,
        message: "Reunión actualizada exitosamente.",
      });
    } catch (error: any) {
      const isValidation =
        error.message?.includes("vacío") ||
        error.message?.includes("archivado") ||
        error.message?.includes("inválido") ||
        error.message?.includes("no está autorizado") ||
        error.message?.includes("no es un miembro activo");
      const isNotFound = error.message?.includes("no encontrada");
      const status = isNotFound ? 404 : isValidation ? 400 : 500;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al actualizar la reunión.",
      });
    }
  }

  // -------------------------------------------------------------
  // DOCUMENTOS TÉCNICOS (ArchitectureDocument & ArchitectureDocumentVersion)
  // -------------------------------------------------------------
  public static async getDocuments(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const projectId = req.params.projectId
        ? parseInt(String(req.params.projectId), 10)
        : req.query.projectId
        ? parseInt(String(req.query.projectId), 10)
        : undefined;

      const stageId = req.query.stageId ? parseInt(String(req.query.stageId), 10) : undefined;
      const { status, documentType, search, limit, offset } = req.query;

      const documents = await ArchitectureService.listDocuments(orgId, {
        projectId,
        stageId,
        status: status ? String(status) : undefined,
        documentType: documentType ? String(documentType) : undefined,
        search: search ? String(search) : undefined,
        limit: limit ? parseInt(String(limit), 10) : undefined,
        offset: offset ? parseInt(String(offset), 10) : undefined,
      });

      return res.status(200).json({ success: true, data: documents });
    } catch (error: any) {
      console.error("[ArchitectureController.getDocuments] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener documentos.",
      });
    }
  }

  public static async getDocumentById(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const documentId = parseInt(String(req.params.documentId || req.params.id), 10);
      if (isNaN(documentId) || documentId <= 0) {
        return res.status(400).json({ success: false, error: "ID de documento inválido." });
      }

      const doc = await ArchitectureService.getDocumentById(orgId, documentId);
      return res.status(200).json({ success: true, data: doc });
    } catch (error: any) {
      console.error("[ArchitectureController.getDocumentById] Error:", error);
      const isNotFound = error.message?.includes("no encontrado");
      return res.status(isNotFound ? 404 : 500).json({
        success: false,
        error: error.message || "Error al obtener el documento.",
      });
    }
  }

  public static async createDocument(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const userId = ArchitectureController.getUserId(req, res);

      const projectId = req.params.projectId
        ? parseInt(String(req.params.projectId), 10)
        : parseInt(String(req.body.projectId), 10);

      if (isNaN(projectId) || projectId <= 0) {
        return res.status(400).json({ success: false, error: "ID de proyecto inválido o requerido." });
      }

      const stageId = req.body.stageId ? parseInt(String(req.body.stageId), 10) : null;
      const { name, documentType, description, status, notes } = req.body;

      if (!name || !String(name).trim()) {
        return res.status(400).json({ success: false, error: "El nombre del documento es obligatorio." });
      }

      const filePayload = ArchitectureController.extractFilePayload(req);

      const doc = await ArchitectureService.createDocument(
        orgId,
        userId,
        {
          projectId,
          stageId,
          name: String(name).trim(),
          documentType: documentType ? String(documentType).trim() : undefined,
          description: description ? String(description).trim() : undefined,
          status: status ? String(status).trim() : undefined,
        },
        filePayload
          ? {
              originalName: filePayload.originalName,
              mimeType: filePayload.mimeType,
              buffer: filePayload.buffer,
            }
          : undefined,
        notes || filePayload?.notes || null
      );

      return res.status(201).json({
        success: true,
        data: doc,
        message: "Documento creado exitosamente.",
      });
    } catch (error: any) {
      console.error("[ArchitectureController.createDocument] Error:", error);
      const isValidation =
        error.message?.includes("obligatorio") ||
        error.message?.includes("archivado") ||
        error.message?.includes("no pertenece") ||
        error.message?.includes("permitido") ||
        error.message?.includes("excede el tamaño") ||
        error.message?.includes("vacío");
      const isNotFound = error.message?.includes("no encontrado");
      const status = isNotFound ? 404 : isValidation ? 400 : 500;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al crear el documento.",
      });
    }
  }

  public static async updateDocument(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const documentId = parseInt(String(req.params.documentId || req.params.id), 10);
      if (isNaN(documentId) || documentId <= 0) {
        return res.status(400).json({ success: false, error: "ID de documento inválido." });
      }

      const stageId =
        req.body.stageId !== undefined
          ? req.body.stageId === null || req.body.stageId === ""
            ? null
            : parseInt(String(req.body.stageId), 10)
          : undefined;

      const updated = await ArchitectureService.updateDocument(orgId, documentId, {
        stageId,
        name: req.body.name,
        documentType: req.body.documentType,
        description: req.body.description,
        status: req.body.status,
      });

      return res.status(200).json({
        success: true,
        data: updated,
        message: "Documento actualizado exitosamente.",
      });
    } catch (error: any) {
      console.error("[ArchitectureController.updateDocument] Error:", error);
      const isValidation =
        error.message?.includes("vacío") ||
        error.message?.includes("archivado") ||
        error.message?.includes("no pertenece");
      const isNotFound = error.message?.includes("no encontrado");
      const status = isNotFound ? 404 : isValidation ? 400 : 500;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al actualizar el documento.",
      });
    }
  }

  public static async addDocumentVersion(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const userId = ArchitectureController.getUserId(req, res);

      const documentId = parseInt(String(req.params.documentId || req.params.id), 10);
      if (isNaN(documentId) || documentId <= 0) {
        return res.status(400).json({ success: false, error: "ID de documento inválido." });
      }

      const filePayload = ArchitectureController.extractFilePayload(req);
      if (!filePayload || !filePayload.buffer || filePayload.buffer.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Debe proporcionar un archivo para la nueva versión.",
        });
      }

      let projectId: number;
      if (req.params.projectId && !isNaN(parseInt(String(req.params.projectId), 10))) {
        projectId = parseInt(String(req.params.projectId), 10);
      } else {
        const doc = await ArchitectureService.getDocumentById(orgId, documentId);
        projectId = doc.projectId;
      }

      const notes = req.body?.notes || filePayload.notes || null;

      const version = await ArchitectureService.addDocumentVersion(
        orgId,
        userId,
        projectId,
        documentId,
        {
          originalName: filePayload.originalName,
          mimeType: filePayload.mimeType,
          buffer: filePayload.buffer,
        },
        notes
      );

      return res.status(201).json({
        success: true,
        data: version,
        message: `Versión v${version.versionNumber} subida exitosamente.`,
      });
    } catch (error: any) {
      console.error("[ArchitectureController.addDocumentVersion] Error:", error);
      const isValidation =
        error.message?.includes("archivado") ||
        error.message?.includes("permitido") ||
        error.message?.includes("excede el tamaño") ||
        error.message?.includes("vacío") ||
        error.message?.includes("violación");
      const isNotFound = error.message?.includes("no encontrado");
      const status = isNotFound ? 404 : isValidation ? 400 : 500;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al subir nueva versión documental.",
      });
    }
  }

  public static async getDocumentVersions(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const documentId = parseInt(String(req.params.documentId || req.params.id), 10);
      if (isNaN(documentId) || documentId <= 0) {
        return res.status(400).json({ success: false, error: "ID de documento inválido." });
      }

      const versions = await ArchitectureService.listDocumentVersions(orgId, documentId);
      return res.status(200).json({ success: true, data: versions });
    } catch (error: any) {
      console.error("[ArchitectureController.getDocumentVersions] Error:", error);
      const isNotFound = error.message?.includes("no encontrado");
      return res.status(isNotFound ? 404 : 500).json({
        success: false,
        error: error.message || "Error al obtener versiones del documento.",
      });
    }
  }

  public static async getDocumentVersion(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const documentId = parseInt(String(req.params.documentId || req.params.id), 10);
      const versionId = parseInt(String(req.params.versionId), 10);

      if (isNaN(documentId) || isNaN(versionId)) {
        return res.status(400).json({ success: false, error: "IDs inválidos." });
      }

      const version = await ArchitectureService.getDocumentVersion(orgId, documentId, versionId);
      return res.status(200).json({ success: true, data: version });
    } catch (error: any) {
      console.error("[ArchitectureController.getDocumentVersion] Error:", error);
      const isNotFound = error.message?.includes("no encontrada");
      return res.status(isNotFound ? 404 : 500).json({
        success: false,
        error: error.message || "Error al obtener la versión del documento.",
      });
    }
  }

  public static async downloadDocumentVersion(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const documentId = parseInt(String(req.params.documentId || req.params.id), 10);
      if (isNaN(documentId) || documentId <= 0) {
        return res.status(400).json({ success: false, error: "ID de documento inválido." });
      }

      const versionId = req.params.versionId
        ? parseInt(String(req.params.versionId), 10)
        : undefined;

      const fileInfo = await ArchitectureService.getDocumentVersionFile(
        orgId,
        documentId,
        versionId
      );

      res.setHeader("Content-Type", fileInfo.mimeType || "application/octet-stream");
      res.setHeader("Content-Length", fileInfo.fileSize);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(fileInfo.originalFilename)}"`
      );
      if (fileInfo.checksumSha256) {
        res.setHeader("ETag", `"${fileInfo.checksumSha256}"`);
      }

      return res.status(200).send(fileInfo.buffer);
    } catch (error: any) {
      console.error("[ArchitectureController.downloadDocumentVersion] Error:", error);
      const isNotFound =
        error.message?.includes("no encontrado") || error.message?.includes("no encontrada");
      return res.status(isNotFound ? 404 : 403).json({
        success: false,
        error: error.message || "Error al descargar el archivo técnico.",
      });
    }
  }

  // -------------------------------------------------------------
  // PRESUPUESTOS (ArchitectureBudget & ArchitectureBudgetItem)
  // -------------------------------------------------------------
  public static async listBudgets(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const projectId = req.query.projectId || req.params.projectId
        ? parseInt(String(req.query.projectId || req.params.projectId), 10)
        : undefined;
      const status = req.query.status ? String(req.query.status) : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;

      const budgets = await ArchitectureService.listBudgets(orgId, {
        projectId,
        status,
        search,
      });

      return res.status(200).json({ success: true, data: budgets });
    } catch (error: any) {
      console.error("[ArchitectureController.listBudgets] Error:", error);
      const status = error.statusCode || 500;
      return res.status(status).json({ success: false, error: error.message || "Error al listar presupuestos." });
    }
  }

  public static async getBudgetById(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const budgetId = parseInt(String(req.params.budgetId || req.params.id), 10);
      if (isNaN(budgetId) || budgetId <= 0) {
        return res.status(400).json({ success: false, error: "ID de presupuesto inválido." });
      }

      const budget = await ArchitectureService.getBudgetById(orgId, budgetId);
      return res.status(200).json({ success: true, data: budget });
    } catch (error: any) {
      console.error("[ArchitectureController.getBudgetById] Error:", error);
      const status = error.statusCode || (error.message?.includes("no encontrad") ? 404 : 500);
      return res.status(status).json({ success: false, error: error.message || "Error al obtener el presupuesto." });
    }
  }

  public static async createBudget(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const userId = ArchitectureController.getUserId(req, res);
      const projectId = req.body.projectId || req.params.projectId
        ? parseInt(String(req.body.projectId || req.params.projectId), 10)
        : undefined;

      const budget = await ArchitectureService.createBudget(orgId, userId, {
        ...req.body,
        projectId,
      });

      return res.status(201).json({ success: true, data: budget });
    } catch (error: any) {
      console.error("[ArchitectureController.createBudget] Error:", error);
      const status = error.statusCode || (
        error.message?.includes("archivado") || error.message?.includes("obligatorio") ? 400 :
        error.message?.includes("Ya existe") ? 409 : 500
      );
      return res.status(status).json({ success: false, error: error.message || "Error al crear presupuesto." });
    }
  }

  public static async updateBudget(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const userId = ArchitectureController.getUserId(req, res);
      const budgetId = parseInt(String(req.params.budgetId || req.params.id), 10);
      if (isNaN(budgetId) || budgetId <= 0) {
        return res.status(400).json({ success: false, error: "ID de presupuesto inválido." });
      }

      const budget = await ArchitectureService.updateBudget(orgId, userId, budgetId, req.body);
      return res.status(200).json({ success: true, data: budget });
    } catch (error: any) {
      console.error("[ArchitectureController.updateBudget] Error:", error);
      const status = error.statusCode || (
        error.message?.includes("no encontrad") ? 404 :
        error.message?.includes("archivado") || error.message?.includes("vacío") ? 400 :
        error.message?.includes("Ya existe") ? 409 : 500
      );
      return res.status(status).json({ success: false, error: error.message || "Error al actualizar presupuesto." });
    }
  }

  public static async approveBudget(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const userId = ArchitectureController.getUserId(req, res);
      const budgetId = parseInt(String(req.params.budgetId || req.params.id), 10);
      if (isNaN(budgetId) || budgetId <= 0) {
        return res.status(400).json({ success: false, error: "ID de presupuesto inválido." });
      }

      const budget = await ArchitectureService.approveBudget(orgId, userId, budgetId);
      return res.status(200).json({ success: true, data: budget });
    } catch (error: any) {
      console.error("[ArchitectureController.approveBudget] Error:", error);
      const status = error.statusCode || (
        error.message?.includes("no encontrad") ? 404 :
        error.message?.includes("archivado") ? 400 :
        error.message?.includes("Ya existe") ? 409 : 500
      );
      return res.status(status).json({ success: false, error: error.message || "Error al aprobar presupuesto." });
    }
  }

  public static async addBudgetItem(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const userId = ArchitectureController.getUserId(req, res);
      const budgetId = parseInt(String(req.params.budgetId || req.params.id), 10);
      if (isNaN(budgetId) || budgetId <= 0) {
        return res.status(400).json({ success: false, error: "ID de presupuesto inválido." });
      }

      const item = await ArchitectureService.addBudgetItem(orgId, userId, budgetId, req.body);
      return res.status(201).json({ success: true, data: item });
    } catch (error: any) {
      console.error("[ArchitectureController.addBudgetItem] Error:", error);
      const status = error.statusCode || (
        error.message?.includes("no encontrad") ? 404 :
        error.message?.includes("archivado") || error.message?.includes("obligatori") || error.message?.includes("negativ") ? 400 : 500
      );
      return res.status(status).json({ success: false, error: error.message || "Error al agregar rubro al presupuesto." });
    }
  }

  public static async updateBudgetItem(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const userId = ArchitectureController.getUserId(req, res);
      const budgetId = parseInt(String(req.params.budgetId || req.params.id), 10);
      const itemId = parseInt(String(req.params.itemId), 10);
      if (isNaN(budgetId) || budgetId <= 0 || isNaN(itemId) || itemId <= 0) {
        return res.status(400).json({ success: false, error: "IDs de presupuesto o rubro inválidos." });
      }

      const item = await ArchitectureService.updateBudgetItem(orgId, userId, budgetId, itemId, req.body);
      return res.status(200).json({ success: true, data: item });
    } catch (error: any) {
      console.error("[ArchitectureController.updateBudgetItem] Error:", error);
      const status = error.statusCode || (
        error.message?.includes("no encontrad") ? 404 :
        error.message?.includes("archivado") || error.message?.includes("vací") || error.message?.includes("negativ") ? 400 : 500
      );
      return res.status(status).json({ success: false, error: error.message || "Error al actualizar rubro." });
    }
  }

  // -------------------------------------------------------------
  // READ MODELS DERIVADOS (Calendario, Dashboard, Reportes)
  // -------------------------------------------------------------
  public static async getCalendarEvents(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const projectId = req.query.projectId
        ? parseInt(String(req.query.projectId), 10)
        : undefined;
      const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
      const endDate = req.query.endDate ? String(req.query.endDate) : undefined;

      const events = await ArchitectureService.getCalendarEvents(orgId, {
        startDate,
        endDate,
        projectId,
      });

      return res.status(200).json({ success: true, data: events });
    } catch (error: any) {
      console.error("[ArchitectureController.getCalendarEvents] Error:", error);
      return res.status(500).json({ success: false, error: error.message || "Error al obtener eventos de calendario." });
    }
  }

  public static async getDashboardData(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const dashboard = await ArchitectureService.getDashboardData(orgId);
      return res.status(200).json({ success: true, data: dashboard });
    } catch (error: any) {
      console.error("[ArchitectureController.getDashboardData] Error:", error);
      return res.status(500).json({ success: false, error: error.message || "Error al obtener métricas del dashboard." });
    }
  }

  public static async getReportsSummary(req: Request, res: Response) {
    try {
      const orgId = ArchitectureController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const reports = await ArchitectureService.getReportsSummary(orgId);
      return res.status(200).json({ success: true, data: reports });
    } catch (error: any) {
      console.error("[ArchitectureController.getReportsSummary] Error:", error);
      return res.status(500).json({ success: false, error: error.message || "Error al obtener resumen de reportes." });
    }
  }
}

