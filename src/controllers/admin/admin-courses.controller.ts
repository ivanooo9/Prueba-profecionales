import { Request, Response } from "express";
import { db } from "../../lib/db";
import { getUniqueSlug } from "../../lib/slug";
import { uploadBase64ToCloudinary } from "../../lib/cloudinary";

/**
 * Controller for Admin Course Management operations.
 */
export class AdminCoursesController {
  /**
   * List all courses with metrics.
   */
  static async listCourses(req: Request, res: Response) {
    try {
      const courses = await db.curso.findMany({
        include: {
          profile: { include: { user: true } },
          enrollments: true,
          modules: { include: { lessons: true } },
          certificateDesign: true
        },
        orderBy: { createdAt: "desc" }
      });
      res.json({ success: true, courses });
    } catch (error: any) {
      console.error("Error in listCourses controller:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Create or update a course.
   */
  static async saveCourse(req: Request, res: Response) {
    const {
      courseId,
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
        bannerUrl = await uploadBase64ToCloudinary(banner, "courses");
      }

      const courseData: any = {
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

      if (courseId) {
        const updated = await db.curso.update({
          where: { id: parseInt(courseId, 10) },
          data: courseData
        });
        return res.redirect("/dashboard/admin?tab=cursos&success=course_updated");
      } else {
        const slug = await getUniqueSlug("curso", titulo);
        courseData.slug = slug;
        await db.curso.create({ data: courseData });
        return res.redirect("/dashboard/admin?tab=cursos&success=course_created");
      }
    } catch (error: any) {
      console.error("Error saving course:", error);
      return res.redirect("/dashboard/admin?tab=cursos&error=course_save_failed");
    }
  }

  /**
   * Delete a course by ID.
   */
  static async deleteCourse(req: Request, res: Response) {
    const id = parseInt(req.params.id as string, 10);
    try {
      await db.curso.delete({ where: { id } });
      res.redirect("/dashboard/admin?tab=cursos&success=course_deleted");
    } catch (error: any) {
      console.error("Error deleting course:", error);
      res.redirect("/dashboard/admin?tab=cursos&error=course_delete_failed");
    }
  }
}
