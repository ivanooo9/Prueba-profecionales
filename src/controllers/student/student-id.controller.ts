import { Request, Response } from "express";
import { StudentIdService } from "../../services/student-id.service";
import { uploadBase64ToCloudinary } from "../../lib/cloudinary";

export class StudentIdController {
  /**
   * Vista pública del ID estudiantil (@estudiante)
   */
  public static async getPublicId(req: Request, res: Response) {
    try {
      const slug = String(req.params.slug || "");
      const data = (await StudentIdService.getPublicIdBySlug(slug)) as any;

      if (!data) {
        return res.status(404).render("preview-error", {
          title: "Estudiantes ID No Encontrado",
          message: `El enlace @${slug} no está disponible o ha sido desactivado.`
        });
      }

      // Registrar analítica de visita en segundo plano
      const sessionIdentifier = ((req as any).sessionID || req.ip || "").toString();
      const referrer = (req.get("referrer") || "").toString();
      const userAgent = (req.get("user-agent") || "").toString();

      StudentIdService.trackEvent(slug, "VISIT", undefined, {
        sessionIdentifier, referrer, userAgent
      }).catch(err => console.error("Error registrando visita en StudentId:", err));

      const metaDescription = data.shortDescription || 
        `Perfil Académico de ${data.studentProfile?.user?.name || 'Estudiante'} • ${data.studentProfile?.carrera || ''} en ${data.studentProfile?.institucionEducativa || 'Universidad'}`;

      return res.render("estudiante-id", {
        title: `${data.studentProfile?.user?.name || 'Estudiante'} — Estudiantes ID`,
        studentId: data,
        profile: data.studentProfile || {},
        user: data.studentProfile?.user || {},
        university: data.studentProfile?.university || null,
        links: data.links || [],
        blocks: data.blocks || [],
        metaDescription
      });
    } catch (error: any) {
      console.error("Error en getPublicId de StudentId:", error);
      return res.status(500).render("preview-error", {
        title: "Error de Servidor",
        message: "No se pudo cargar la tarjeta del estudiante."
      });
    }
  }

  /**
   * Endpoint público para registrar analíticas
   */
  public static async trackAnalytics(req: Request, res: Response) {
    try {
      const { slug, eventType, linkId } = req.body;
      if (!slug || !eventType) {
        return res.status(400).json({ success: false, error: "Faltan parámetros requeridos." });
      }
      const sessionIdentifier = ((req as any).sessionID || req.ip || "").toString();
      const referrer = (req.get("referrer") || "").toString();
      const userAgent = (req.get("user-agent") || "").toString();

      await StudentIdService.trackEvent(String(slug), String(eventType), linkId ? Number(linkId) : undefined, {
        sessionIdentifier, referrer, userAgent
      });

      return res.json({ success: true });
    } catch (error: any) {
      console.error("Error en trackAnalytics de StudentId:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Obtiene la configuración del ID para el dashboard estudiantil
   */
  public static async getDashboardConfig(req: Request, res: Response) {
    try {
      const user = res.locals.user || (req as any).user;
      if (!user) return res.status(401).json({ success: false, error: "No autenticado" });
      const userId = user.id;

      const data = await StudentIdService.getOrCreateIdForStudent(userId);
      const analytics = await StudentIdService.getAnalyticsSummary(userId);

      return res.json({
        success: true,
        studentId: data,
        analytics
      });
    } catch (error: any) {
      console.error("Error obteniendo config de StudentId:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Guarda cambios de configuración principal y apariencia
   */
  public static async updateConfig(req: Request, res: Response) {
    try {
      const user = res.locals.user || (req as any).user;
      if (!user) return res.status(401).json({ success: false, error: "No autenticado" });
      const userId = user.id;

      let {
        shortDescription, primaryActionType, primaryActionTitle, primaryActionValue,
        primaryFileName, theme, buttonStyle, alignment, isActive, slug
      } = req.body;

      if (primaryActionValue && typeof primaryActionValue === "string" && (primaryActionValue.startsWith("data:") || primaryActionValue.startsWith("JVBERi0"))) {
        primaryActionValue = await uploadBase64ToCloudinary(primaryActionValue, "student-id-documents", primaryFileName || `CV_${slug || user.name || 'Estudiante'}.pdf`);
      }

      const updated = await StudentIdService.updateConfig(userId, {
        shortDescription, primaryActionType, primaryActionTitle, primaryActionValue,
        theme, buttonStyle, alignment, isActive, slug
      });

      return res.json({ success: true, studentId: updated });
    } catch (error: any) {
      console.error("Error actualizando config de StudentId:", error);
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * Crea o actualiza un botón
   */
  public static async upsertLink(req: Request, res: Response) {
    try {
      const user = res.locals.user || (req as any).user;
      if (!user) return res.status(401).json({ success: false, error: "No autenticado" });
      const userId = user.id;

      let { id, type, title, icon, url, fileName, iconFileName, targetId, isActive } = req.body;

      if (icon && typeof icon === "string" && (icon.startsWith("data:") || icon.startsWith("iVBORw0"))) {
        icon = await uploadBase64ToCloudinary(icon, "student-id-icons", iconFileName || title || "Icono");
      }
      if (url && typeof url === "string" && (url.startsWith("data:") || url.startsWith("JVBERi0"))) {
        url = await uploadBase64ToCloudinary(url, "student-id-documents", fileName || title || "Documento.pdf");
      }

      const link = await StudentIdService.upsertLink(userId, {
        id: id ? Number(id) : undefined,
        type: String(type || "EXTERNAL_URL"),
        title: String(title || "Botón"),
        icon: icon ? String(icon) : undefined,
        url: url ? String(url) : undefined,
        targetId: targetId ? Number(targetId) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : true
      });

      return res.json({ success: true, link });
    } catch (error: any) {
      console.error("Error en upsertLink de StudentId:", error);
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * Elimina un botón
   */
  public static async deleteLink(req: Request, res: Response) {
    try {
      const user = res.locals.user || (req as any).user;
      if (!user) return res.status(401).json({ success: false, error: "No autenticado" });
      const userId = user.id;

      const linkId = Number(req.params.id);

      await StudentIdService.deleteLink(userId, linkId);
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Error en deleteLink de StudentId:", error);
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * Reordena botones
   */
  public static async reorderLinks(req: Request, res: Response) {
    try {
      const user = res.locals.user || (req as any).user;
      if (!user) return res.status(401).json({ success: false, error: "No autenticado" });
      const userId = user.id;

      const { linkIds } = req.body;

      if (!Array.isArray(linkIds)) {
        return res.status(400).json({ success: false, error: "linkIds debe ser un arreglo." });
      }

      await StudentIdService.reorderLinks(userId, linkIds.map(Number));
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Error en reorderLinks de StudentId:", error);
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * Crea o actualiza un bloque destacado (Proyecto de Investigación / Logro)
   */
  public static async upsertBlock(req: Request, res: Response) {
    try {
      const user = res.locals.user || (req as any).user;
      if (!user) return res.status(401).json({ success: false, error: "No autenticado" });
      const userId = user.id;

      let { id, type, title, description, image, fileName, buttonText, url, targetId, startAt, endAt, isActive } = req.body;

      if (image && typeof image === "string" && (image.startsWith("data:") || image.startsWith("iVBORw0"))) {
        image = await uploadBase64ToCloudinary(image, "student-id-blocks", fileName || title || "Proyecto_Destacado");
      }

      const block = await StudentIdService.upsertBlock(userId, {
        id: id ? Number(id) : undefined,
        type: String(type || "FEATURED_PROJECT"),
        title: String(title || "Proyecto Destacado"),
        description: description ? String(description) : undefined,
        image: image ? String(image) : undefined,
        buttonText: buttonText ? String(buttonText) : undefined,
        url: url ? String(url) : undefined,
        targetId: targetId ? Number(targetId) : undefined,
        startAt, endAt,
        isActive: isActive !== undefined ? Boolean(isActive) : true
      });

      return res.json({ success: true, block });
    } catch (error: any) {
      console.error("Error en upsertBlock de StudentId:", error);
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * Elimina un bloque destacado
   */
  public static async deleteBlock(req: Request, res: Response) {
    try {
      const user = res.locals.user || (req as any).user;
      if (!user) return res.status(401).json({ success: false, error: "No autenticado" });
      const userId = user.id;

      const blockId = Number(req.params.id);

      await StudentIdService.deleteBlock(userId, blockId);
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Error en deleteBlock de StudentId:", error);
      return res.status(400).json({ success: false, error: error.message });
    }
  }
}
