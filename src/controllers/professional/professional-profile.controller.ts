import { Request, Response } from "express";
import { db } from "../../lib/db";
import { uploadBase64ToCloudinary } from "../../lib/cloudinary";

/**
 * Controller for Professional Profile management, social networks, and appointments.
 */
export class ProfessionalProfileController {
  /**
   * Update professional main profile details (bio, slogan, fees, location).
   */
  static async updateProfile(req: Request, res: Response) {
    const user = (req as any).user;
    const { bio, slogan, provincia, ciudad, direccion, tarifa, templateId, whatsapp, photo, banner } = req.body;

    try {
      const updateData: any = {};
      if (bio !== undefined) updateData.bio = bio || null;
      if (slogan !== undefined) updateData.slogan = slogan || null;
      if (provincia !== undefined) updateData.provincia = provincia || null;
      if (ciudad !== undefined) updateData.ciudad = ciudad || null;
      if (direccion !== undefined) updateData.direccion = direccion || null;

      if (photo !== undefined) {
        if (photo && (photo.startsWith("data:") || photo.length > 200)) {
          updateData.photo = await uploadBase64ToCloudinary(photo, "profiles");
        } else {
          updateData.photo = photo || null;
        }
      }

      if (banner !== undefined) {
        if (banner && (banner.startsWith("data:") || banner.length > 200)) {
          updateData.banner = await uploadBase64ToCloudinary(banner, "banners");
        } else {
          updateData.banner = banner || null;
        }
      }

      if (tarifa !== undefined) updateData.tarifa = tarifa ? parseFloat(tarifa) : 0.0;
      if (templateId !== undefined) updateData.templateId = templateId ? parseInt(templateId, 10) : null;
      if (whatsapp !== undefined) updateData.whatsapp = whatsapp || null;

      await db.professionalProfile.update({
        where: { userId: user.id },
        data: updateData
      });

      res.redirect("/dashboard/profesional?tab=perfil&success=profile_updated");
    } catch (error) {
      console.error("Error updating professional profile:", error);
      res.redirect("/dashboard/profesional?tab=perfil&error=profile_update_failed");
    }
  }

  /**
   * Update social media links.
   */
  static async updateSocialLinks(req: Request, res: Response) {
    const user = (req as any).user;
    const { facebook, instagram, xTwitter, linkedin, tiktok, youtube, whatsapp } = req.body;

    try {
      const updateData: any = {};
      if (facebook !== undefined) updateData.facebook = facebook || null;
      if (instagram !== undefined) updateData.instagram = instagram || null;
      if (xTwitter !== undefined) updateData.xTwitter = xTwitter || null;
      if (linkedin !== undefined) updateData.linkedin = linkedin || null;
      if (tiktok !== undefined) updateData.tiktok = tiktok || null;
      if (youtube !== undefined) updateData.youtube = youtube || null;
      if (whatsapp !== undefined) updateData.whatsapp = whatsapp || null;

      await db.professionalProfile.update({
        where: { userId: user.id },
        data: updateData
      });

      res.redirect("/dashboard/profesional?tab=configuracion&success=social_updated");
    } catch (error) {
      console.error("Error updating social links:", error);
      res.redirect("/dashboard/profesional?tab=configuracion&error=social_update_failed");
    }
  }
}
