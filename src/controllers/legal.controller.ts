import { Request, Response } from "express";
import { LegalService } from "../services/legal.service";

export class LegalController {
  // Helper para obtener organizationId de forma robusta
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

  // -------------------------------------------------------------
  // CLIENTES (LegalClient)
  // -------------------------------------------------------------

  public static async getClients(req: Request, res: Response) {
    try {
      const orgId = LegalController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const { search, status, clientType, limit, offset } = req.query;

      const result = await LegalService.listClients(orgId, {
        search: search ? String(search) : undefined,
        status: status ? String(status) : undefined,
        clientType: clientType ? String(clientType) : undefined,
        limit: limit ? parseInt(String(limit), 10) : undefined,
        offset: offset ? parseInt(String(offset), 10) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: result.items,
        total: result.total,
      });
    } catch (error: any) {
      console.error("[LegalController.getClients] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener clientes jurídicos.",
      });
    }
  }

  public static async getClientById(req: Request, res: Response) {
    try {
      const orgId = LegalController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const clientId = parseInt(String(req.params.clientId), 10);
      if (isNaN(clientId) || clientId <= 0) {
        return res.status(400).json({ success: false, error: "ID de cliente inválido." });
      }

      const client = await LegalService.getClientById(orgId, clientId);
      if (!client) {
        return res.status(404).json({ success: false, error: "Cliente jurídico no encontrado." });
      }

      return res.status(200).json({ success: true, data: client });
    } catch (error: any) {
      console.error("[LegalController.getClientById] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener el cliente jurídico.",
      });
    }
  }

  public static async createClient(req: Request, res: Response) {
    try {
      const orgId = LegalController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const {
        name,
        identificationType,
        identification,
        email,
        phone,
        address,
        clientType,
        companyName,
        companyRuc,
        legalRepresentative,
        status,
        notes,
      } = req.body;

      const created = await LegalService.createClient(orgId, {
        name,
        identificationType,
        identification,
        email,
        phone,
        address,
        clientType,
        companyName,
        companyRuc,
        legalRepresentative,
        status,
        notes,
      });

      return res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      console.error("[LegalController.createClient] Error:", error);
      const isConflict = error.message?.includes("Ya existe un cliente con la identificación");
      return res.status(isConflict ? 409 : 400).json({
        success: false,
        error: error.message || "Error al registrar cliente jurídico.",
      });
    }
  }

  public static async updateClient(req: Request, res: Response) {
    try {
      const orgId = LegalController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const clientId = parseInt(String(req.params.clientId), 10);
      if (isNaN(clientId) || clientId <= 0) {
        return res.status(400).json({ success: false, error: "ID de cliente inválido." });
      }

      const updated = await LegalService.updateClient(orgId, clientId, req.body);
      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      console.error("[LegalController.updateClient] Error:", error);
      const isNotFound = error.message?.includes("no encontrado");
      const isConflict = error.message?.includes("Ya existe");
      const status = isNotFound ? 404 : isConflict ? 409 : 400;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al actualizar cliente jurídico.",
      });
    }
  }

  // -------------------------------------------------------------
  // CASOS / EXPEDIENTES (LegalCase)
  // -------------------------------------------------------------

  public static async getCases(req: Request, res: Response) {
    try {
      const orgId = LegalController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const { clientId, status, legalArea, priority, search, limit, offset } = req.query;

      const result = await LegalService.listCases(orgId, {
        clientId: clientId ? parseInt(String(clientId), 10) : undefined,
        status: status ? String(status) : undefined,
        legalArea: legalArea ? String(legalArea) : undefined,
        priority: priority ? String(priority) : undefined,
        search: search ? String(search) : undefined,
        limit: limit ? parseInt(String(limit), 10) : undefined,
        offset: offset ? parseInt(String(offset), 10) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: result.items,
        total: result.total,
      });
    } catch (error: any) {
      console.error("[LegalController.getCases] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al listar casos jurídicos.",
      });
    }
  }

  public static async getCasesByClient(req: Request, res: Response) {
    try {
      const orgId = LegalController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const clientId = parseInt(String(req.params.clientId), 10);
      if (isNaN(clientId) || clientId <= 0) {
        return res.status(400).json({ success: false, error: "ID de cliente inválido." });
      }

      // Validar primero si el cliente existe en el tenant
      const client = await LegalService.getClientById(orgId, clientId);
      if (!client) {
        return res.status(404).json({ success: false, error: "Cliente jurídico no encontrado." });
      }

      const result = await LegalService.listCases(orgId, { clientId });
      return res.status(200).json({
        success: true,
        data: result.items,
        total: result.total,
      });
    } catch (error: any) {
      console.error("[LegalController.getCasesByClient] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al consultar los casos del cliente.",
      });
    }
  }

  public static async getCaseById(req: Request, res: Response) {
    try {
      const orgId = LegalController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const caseId = parseInt(String(req.params.caseId), 10);
      if (isNaN(caseId) || caseId <= 0) {
        return res.status(400).json({ success: false, error: "ID de caso inválido." });
      }

      const caseItem = await LegalService.getCaseById(orgId, caseId);
      if (!caseItem) {
        return res.status(404).json({ success: false, error: "Caso jurídico no encontrado." });
      }

      return res.status(200).json({ success: true, data: caseItem });
    } catch (error: any) {
      console.error("[LegalController.getCaseById] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener el caso jurídico.",
      });
    }
  }

  /**
   * RUTA CANÓNICA ÚNICA PARA CREAR CASO:
   * POST /api/organizations/:id/legal/clients/:clientId/cases
   * Garantiza: PRIMERO CLIENTE -> DESPUÉS CASO
   */
  public static async createCase(req: Request, res: Response) {
    try {
      const orgId = LegalController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const clientId = parseInt(String(req.params.clientId), 10);
      if (isNaN(clientId) || clientId <= 0) {
        return res.status(400).json({ success: false, error: "ID de cliente inválido en la ruta." });
      }

      // Whitelist de campos para prevenir mass-assignment
      const {
        clientId: bodyClientId,
        internalCaseNumber,
        judicialProcessNumber,
        title,
        description,
        processType,
        legalArea,
        status,
        priority,
        responsibleUserId,
        assignedLawyer,
        courtName,
        judgeName,
        claimAmount,
        startDate,
        expectedEndDate,
      } = req.body;

      const created = await LegalService.createCase(orgId, clientId, {
        clientId: bodyClientId !== undefined ? parseInt(String(bodyClientId), 10) : undefined,
        internalCaseNumber,
        judicialProcessNumber,
        title,
        description,
        processType,
        legalArea,
        status,
        priority,
        responsibleUserId,
        assignedLawyer,
        courtName,
        judgeName,
        claimAmount,
        startDate,
        expectedEndDate,
      });

      return res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      console.error("[LegalController.createCase] Error:", error);
      const isNotFound = error.message?.includes("no encontrado");
      const isConflict = error.message?.includes("Ya existe");
      const isClientMismatch = error.message?.includes("no coincide con el cliente de la ruta");
      const isRoleForbidden =
        error.message?.includes("no está autorizado") ||
        error.message?.includes("no puede figurar como abogado responsable") ||
        error.message?.includes("no es un miembro activo");

      let statusCode = 400;
      if (isNotFound) statusCode = 404;
      else if (isConflict) statusCode = 409;
      else if (isClientMismatch) statusCode = 400;
      else if (isRoleForbidden) statusCode = 400;

      return res.status(statusCode).json({
        success: false,
        error: error.message || "Error al crear caso jurídico.",
      });
    }
  }

  public static async updateCase(req: Request, res: Response) {
    try {
      const orgId = LegalController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const caseId = parseInt(String(req.params.caseId), 10);
      if (isNaN(caseId) || caseId <= 0) {
        return res.status(400).json({ success: false, error: "ID de caso inválido." });
      }

      const updated = await LegalService.updateCase(orgId, caseId, req.body);
      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      console.error("[LegalController.updateCase] Error:", error);
      const isNotFound = error.message?.includes("no encontrado");
      const isConflict = error.message?.includes("Ya existe");
      const isImmutableViolation =
        error.message?.includes("No se permite modificar la organización") ||
        error.message?.includes("No se permite transferir un caso");

      let statusCode = 400;
      if (isNotFound) statusCode = 404;
      else if (isConflict) statusCode = 409;
      else if (isImmutableViolation) statusCode = 400;

      return res.status(statusCode).json({
        success: false,
        error: error.message || "Error al actualizar caso jurídico.",
      });
    }
  }
}
