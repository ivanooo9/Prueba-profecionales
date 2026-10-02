import { Request, Response } from "express";
import { db } from "../../lib/db";
import { getUniqueSlug } from "../../lib/slug";
import { uploadBase64ToCloudinary } from "../../lib/cloudinary";

/**
 * Controller for Admin Webinar (Conversatorio) Management operations.
 */
export class AdminWebinarsController {
  /**
   * List all webinars with speakers and certificate designs.
   */
  static async listWebinars(req: Request, res: Response) {
    try {
      const webinars = await db.conversatorio.findMany({
        include: {
          profile: { include: { user: true } },
          speakers: true,
          itinerary: true,
          certificateDesign: true,
          enrollments: true
        },
        orderBy: { fechaInicio: "desc" }
      });
      res.json({ success: true, webinars });
    } catch (error: any) {
      console.error("Error in listWebinars controller:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Create or update a webinar.
   */
  static async saveWebinar(req: Request, res: Response) {
    const {
      conversatorioId,
      titulo,
      slogan,
      areaProfesional,
      descripcion,
      fechaInicio,
      fechaFin,
      horaInicio,
      horaFin,
      precio,
      gratuito,
      banner,
      youtube
    } = req.body;

    try {
      let bannerUrl = banner;
      if (banner && (banner.startsWith("data:") || banner.length > 200)) {
        bannerUrl = await uploadBase64ToCloudinary(banner, "conversatorios");
      }

      const webinarData: any = {
        titulo,
        slogan: slogan || null,
        areaProfesional: areaProfesional || null,
        descripcion: descripcion || null,
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        horaInicio: horaInicio || "08:00",
        horaFin: horaFin || "18:00",
        precio: gratuito === "true" ? 0 : parseFloat(precio || "0"),
        gratuito: gratuito === "true",
        banner: bannerUrl || null,
        youtube: youtube || null
      };

      if (conversatorioId) {
        await db.conversatorio.update({
          where: { id: parseInt(conversatorioId, 10) },
          data: webinarData
        });
        return res.redirect("/dashboard/admin?tab=conversatorios&success=conversatorio_updated");
      } else {
        const slug = await getUniqueSlug("conversatorio", titulo);
        webinarData.slug = slug;
        await db.conversatorio.create({ data: webinarData });
        return res.redirect("/dashboard/admin?tab=conversatorios&success=conversatorio_created");
      }
    } catch (error: any) {
      console.error("Error saving webinar:", error);
      return res.redirect("/dashboard/admin?tab=conversatorios&error=conversatorio_save_failed");
    }
  }

  /**
   * Delete a webinar by ID.
   */
  static async deleteWebinar(req: Request, res: Response) {
    const id = parseInt(req.params.id as string, 10);
    try {
      await db.conversatorio.delete({ where: { id } });
      res.redirect("/dashboard/admin?tab=conversatorios&success=conversatorio_deleted");
    } catch (error: any) {
      console.error("Error deleting webinar:", error);
      res.redirect("/dashboard/admin?tab=conversatorios&error=conversatorio_delete_failed");
    }
  }
}
