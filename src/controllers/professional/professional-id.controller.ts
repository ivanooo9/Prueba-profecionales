import { Request, Response } from "express";
import { ProfessionalIdService } from "../../services/professional-id.service";
import { StudentIdService } from "../../services/student-id.service";
import { StudentIdController } from "../student/student-id.controller";
import { uploadBase64ToCloudinary } from "../../lib/cloudinary";

export class ProfessionalIdController {
  /**
   * Vista pública del ID profesional (@usuario)
   */
  public static async getPublicId(req: Request, res: Response) {
    try {
      const slugParam = req.params.slug;
      const slug = Array.isArray(slugParam) ? slugParam[0] : String(slugParam);
      
      const data = (await ProfessionalIdService.getPublicIdBySlug(slug)) as any;

      if (!data || !data.professionalProfile) {
        const studentData = await StudentIdService.getPublicIdBySlug(slug);
        if (studentData) {
          return StudentIdController.getPublicId(req, res);
        }
        return res.status(404).render("pagina-cms", {
          title: "Página no encontrada",
          activePage: "error",
          page: {
            titulo: "Profesionales ID No Encontrado",
            contenido: `
              <div class="p-8 bg-slate-50 border border-slate-200 rounded-3xl text-center flex flex-col items-center gap-4 max-w-md mx-auto my-12">
                <i class="fa-solid fa-id-card-clip text-4xl text-slate-400"></i>
                <h3 class="font-extrabold text-slate-800 text-base">El enlace solicitado no existe o no está publicado.</h3>
                <p class="text-xs text-slate-500 font-medium">Verifica la dirección o busca al profesional directamente en nuestro directorio.</p>
                <a href="/directorio" class="mt-2 bg-[#0A3C84] hover:bg-[#082C62] text-white font-bold py-2.5 px-6 rounded-xl text-xs transition">Ir al Directorio</a>
              </div>
            `,
            updatedAt: new Date()
          }
        });
      }

      // Registrar visita de forma asíncrona (no bloqueante)
      const sessionIdentifier = req.cookies.session_id || req.ip;
      const rawReferrer = req.get("referer") || req.get("referrer") || "";
      const referrer = Array.isArray(rawReferrer) ? rawReferrer[0] : String(rawReferrer);
      const rawUserAgent = req.get("user-agent") || "";
      const userAgent = Array.isArray(rawUserAgent) ? rawUserAgent[0] : String(rawUserAgent);

      ProfessionalIdService.trackEvent(slug, "VISIT", undefined, {
        sessionIdentifier: String(sessionIdentifier),
        referrer,
        userAgent
      }).catch(err => console.error("Error al registrar analítica de visita:", err));

      return res.render("profesional-id", {
        profId: data,
        profile: data.professionalProfile,
        user: data.professionalProfile.user,
        links: data.links || [],
        blocks: data.blocks || [],
        title: `${data.professionalProfile.user.name} | Profesionales ID`,
        metaDescription: data.shortDescription || `Conecta y accede a las acciones principales de ${data.professionalProfile.user.name} en Profesionales Ecuador.`
      });
    } catch (error: any) {
      console.error("Error en getPublicId:", error);
      return res.status(500).render("pagina-cms", {
        title: "Error de servidor",
        activePage: "error",
        page: {
          titulo: "Error al procesar la solicitud",
          contenido: `<p class="text-xs text-rose-600">${error.message}</p>`,
          updatedAt: new Date()
        }
      });
    }
  }

  /**
   * Endpoint API para rastrear clics en botones y enlaces
   */
  public static async trackEvent(req: Request, res: Response) {
    try {
      const { slug, eventType, linkId } = req.body;
      if (!slug || !eventType) {
        return res.status(400).json({ success: false, error: "Parámetros requeridos faltantes." });
      }

      const slugStr = Array.isArray(slug) ? slug[0] : String(slug);
      const sessionIdentifier = req.cookies.session_id || req.ip;
      const rawReferrer = req.get("referer") || "";
      const referrer = Array.isArray(rawReferrer) ? rawReferrer[0] : String(rawReferrer);
      const rawUserAgent = req.get("user-agent") || "";
      const userAgent = Array.isArray(rawUserAgent) ? rawUserAgent[0] : String(rawUserAgent);

      await ProfessionalIdService.trackEvent(slugStr, String(eventType), linkId ? Number(linkId) : undefined, {
        sessionIdentifier: String(sessionIdentifier),
        referrer,
        userAgent
      });

      return res.json({ success: true });
    } catch (error: any) {
      console.error("Error registrando evento de analítica:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Obtiene la configuración del ID para el dashboard profesional
   */
  public static async getDashboardConfig(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const data = await ProfessionalIdService.getOrCreateIdForUser(userId);
      const analytics = await ProfessionalIdService.getAnalyticsSummary(userId);

      return res.json({
        success: true,
        profId: data,
        analytics
      });
    } catch (error: any) {
      console.error("Error obteniendo config de ID:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Guarda cambios de configuración principal y apariencia
   */
  public static async updateConfig(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      let bodyData = { ...req.body };

      if (bodyData.primaryActionValue && typeof bodyData.primaryActionValue === "string" && (bodyData.primaryActionValue.startsWith("data:") || bodyData.primaryActionValue.startsWith("JVBERi0"))) {
        bodyData.primaryActionValue = await uploadBase64ToCloudinary(bodyData.primaryActionValue, "professional-id-documents");
      }

      const updated = await ProfessionalIdService.updateConfig(userId, bodyData);
      return res.json({ success: true, profId: updated });
    } catch (error: any) {
      console.error("Error actualizando config de ID:", error);
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * Crear o actualizar un botón / enlace
   */
  public static async upsertLink(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      let bodyData = { ...req.body };

      if (bodyData.icon && typeof bodyData.icon === "string" && (bodyData.icon.startsWith("data:") || bodyData.icon.startsWith("iVBORw0"))) {
        bodyData.icon = await uploadBase64ToCloudinary(bodyData.icon, "professional-id-icons");
      }
      if (bodyData.url && typeof bodyData.url === "string" && (bodyData.url.startsWith("data:") || bodyData.url.startsWith("JVBERi0"))) {
        bodyData.url = await uploadBase64ToCloudinary(bodyData.url, "professional-id-documents");
      }

      const link = await ProfessionalIdService.upsertLink(userId, bodyData);
      return res.json({ success: true, link });
    } catch (error: any) {
      console.error("Error creando/editando enlace:", error);
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * Eliminar un botón
   */
  public static async deleteLink(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      await ProfessionalIdService.deleteLink(userId, Number(id));
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Error eliminando enlace:", error);
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * Reordenar botones
   */
  public static async reorderLinks(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { linkIds } = req.body;
      if (!Array.isArray(linkIds)) {
        return res.status(400).json({ success: false, error: "linkIds debe ser un arreglo." });
      }
      await ProfessionalIdService.reorderLinks(userId, linkIds);
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Error reordenando enlaces:", error);
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * Crear o actualizar un bloque destacado / promoción
   */
  public static async upsertBlock(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      let bodyData = { ...req.body };

      if (bodyData.image && typeof bodyData.image === "string" && (bodyData.image.startsWith("data:") || bodyData.image.startsWith("iVBORw0"))) {
        bodyData.image = await uploadBase64ToCloudinary(bodyData.image, "professional-id-blocks");
      }

      const block = await ProfessionalIdService.upsertBlock(userId, bodyData);
      return res.json({ success: true, block });
    } catch (error: any) {
      console.error("Error creando/editando bloque:", error);
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * Eliminar un bloque destacado
   */
  public static async deleteBlock(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      await ProfessionalIdService.deleteBlock(userId, Number(id));
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Error eliminando bloque:", error);
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * Obtener resumen de estadísticas
   */
  public static async getAnalytics(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const analytics = await ProfessionalIdService.getAnalyticsSummary(userId);
      return res.json({ success: true, analytics });
    } catch (error: any) {
      console.error("Error obteniendo analíticas:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}
