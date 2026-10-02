import { Request, Response } from "express";
import { db } from "../../lib/db";

/**
 * Controller for Admin User Management, Role Control, and Paginated Searches.
 */
export class AdminUsersController {
  /**
   * Get paginated user list with role filtering, status filtering, and search.
   * Route: GET /api/admin/users
   */
  static async getPaginatedUsers(req: Request, res: Response) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
      const skip = (page - 1) * limit;

      const roleFilter = (req.query.role as string || "").trim().toUpperCase();
      const statusFilter = (req.query.status as string || "").trim().toUpperCase();
      const search = (req.query.search as string || "").trim();

      const where: any = {};

      if (roleFilter && roleFilter !== "ALL") {
        where.role = { name: roleFilter };
      }

      if (statusFilter && statusFilter !== "ALL") {
        where.status = statusFilter;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { ciudad: { contains: search, mode: "insensitive" } },
          { telefono: { contains: search, mode: "insensitive" } },
          { nombreCertificado: { contains: search, mode: "insensitive" } },
          { professionalProfile: { cedula: { contains: search, mode: "insensitive" } } }
        ];
      }

      const [totalCount, users] = await Promise.all([
        db.user.count({ where }),
        db.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            nombreCertificado: true,
            telefono: true,
            ciudad: true,
            createdAt: true,
            role: { select: { id: true, name: true, description: true } },
            professionalProfile: {
              select: {
                id: true,
                status: true,
                verified: true,
                planType: true,
                cedula: true,
                slug: true
              }
            },
            studentProfile: {
              select: {
                id: true,
                institucionEducativa: true,
                carrera: true
              }
            }
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit
        })
      ]);

      const totalPages = Math.ceil(totalCount / limit) || 1;

      res.json({
        success: true,
        data: users,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages,
          hasPrev: page > 1,
          hasNext: page < totalPages
        }
      });
    } catch (error: any) {
      console.error("Error in getPaginatedUsers controller:", error);
      res.status(500).json({ success: false, error: error.message || "Error al obtener usuarios paginados" });
    }
  }

  /**
   * Update user status (ACTIVE / SUSPENDED / INACTIVE).
   * Route: POST /api/admin/users/status
   */
  static async updateUserStatus(req: Request, res: Response) {
    const { userId, status } = req.body;
    try {
      const parsedId = parseInt(userId, 10);
      if (isNaN(parsedId)) {
        return res.status(400).json({ success: false, error: "ID de usuario inválido" });
      }

      const validStatuses = ["ACTIVE", "SUSPENDED", "INACTIVE"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, error: "Estado no válido" });
      }

      const updated = await db.user.update({
        where: { id: parsedId },
        data: { status }
      });

      res.json({
        success: true,
        message: `Estado de usuario actualizado a ${status}`,
        user: { id: updated.id, status: updated.status }
      });
    } catch (error: any) {
      console.error("Error updating user status:", error);
      res.status(500).json({ success: false, error: error.message || "Error actualizando estado" });
    }
  }

  /**
   * Approve or Reject a Professional Profile.
   * Route: POST /api/admin/users/approve-professional
   */
  static async approveProfessionalProfile(req: Request, res: Response) {
    const { profileId, status, verified } = req.body;
    try {
      const parsedId = parseInt(profileId, 10);
      if (isNaN(parsedId)) {
        return res.status(400).json({ success: false, error: "ID de perfil inválido" });
      }

      const updateData: any = {};
      if (status) updateData.status = status;
      if (verified !== undefined) updateData.verified = Boolean(verified);

      const updated = await db.professionalProfile.update({
        where: { id: parsedId },
        data: updateData,
        include: { user: true }
      });

      res.json({
        success: true,
        message: `Perfil profesional actualizado exitosamente`,
        profile: {
          id: updated.id,
          status: updated.status,
          verified: updated.verified
        }
      });
    } catch (error: any) {
      console.error("Error approving professional profile:", error);
      res.status(500).json({ success: false, error: error.message || "Error al actualizar perfil profesional" });
    }
  }
}
