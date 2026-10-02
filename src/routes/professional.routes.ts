import express, { Request, Response, NextFunction } from "express";
import path from "path";
// @ts-ignore
import { PDFParse } from "pdf-parse";
import { db } from "../lib/db";
import { comparePassword, hashPassword, revokeSessionFromToken } from "../lib/auth";
import { generateInvoiceXml } from "../lib/sri/xml-generator";
import { signDocument } from "../lib/sri/sri-signer";
import { SriClient } from "../lib/sri/sri-client";
import { generateRidePdf } from "../lib/sri/ride-generator";
import { emailService } from "../lib/email";
import { uploadBase64ToCloudinary } from "../lib/cloudinary";
import { toTitleCase } from "../lib/utils";
import { requireAdmin, requireProfessional, requireClient } from "../lib/middlewares";
import { getUniqueSlug, generateSlug } from "../lib/slug";
import { cachedFetch, cacheKeyFactory as cacheKey } from "../lib/cache";
import { StudentService } from "../services/student.service";
import { InvoiceLimitService } from "../services/invoice-limit.service";
import { ProfileCompletionService } from "../services/profile-completion.service";
import { encryptText } from "../lib/security/encryption";

// Status label mapping for appointment status emails
const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente de Confirmacion",
  CONFIRMADA: "Confirmada",
  REPROGRAMADA: "Reprogramada",
  ATENDIDA: "Completada/Atendida",
  CANCELADA: "Cancelada",
};

const router = express.Router();
const sriClient = new SriClient();

const getProfileTemplates = () =>
  cachedFetch(cacheKey.profileTemplate.all(), () =>
    db.profileTemplate.findMany({ where: { activo: true }, orderBy: { name: "asc" } })
  );

const getPromotionPlans = () =>
  cachedFetch(cacheKey.promotionPlan.all(), () =>
    db.promotionPlan.findMany({ orderBy: { precio: "asc" } })
  );

const getPromotionPlanById = (id: number) =>
  cachedFetch(cacheKey.promotionPlan.byId(id), () =>
    db.promotionPlan.findUnique({ where: { id } })
  );

function nowInEcuador(): { date: string; time: string; hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type: string): string => parts.find(p => p.type === type)?.value || '00';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
    hour: parseInt(get('hour'), 10),
    minute: parseInt(get('minute'), 10)
  };
}

// PROFESSIONAL DASHBOARD ROUTES
// -------------------------------------------------------------

// GET Professional Dashboard
router.get("/dashboard/profesional", requireProfessional, async (req: Request, res: Response) => {
  const user = (req as any).user;
  try {
    // Sincronizar automáticamente datos de perfil de estudiante si existían
    await StudentService.syncStudentToProfessionalProfile(user.id);

    const profile = await db.professionalProfile.findUnique({
      where: { userId: user.id },
      include: {
        services: true,
        schedules: true,
        articles: true,
        appointments: {
          orderBy: { createdAt: "desc" }
        },
        issuer: true,
        products: true,
        education: {
          orderBy: { anioEmision: "desc" }
        }
      }
    });

    if (!profile) {
      return res.redirect("/registro-profesional?planId=1");
    }

    if (user.requireProfileSetup) {
      return res.redirect(user.setupRedirectUrl || "/registro-profesional?planId=1");
    }

    const hasSpecialties = await db.professionalProfileSpecialty.count({
      where: { profileId: profile.id }
    });

    if (!hasSpecialties) {
      return res.redirect("/registro-profesional?planId=1");
    }

    let invoices: any[] = [];
    if (profile.issuer) {
      invoices = await db.invoice.findMany({
        where: { issuerId: profile.issuer.id },
        include: { client: true },
        orderBy: { createdAt: "desc" }
      });
    }

    const templates = await getProfileTemplates();

    const certificates = await db.certificate.findMany({
      where: { userId: user.id },
      include: {
        conversatorio: true,
        curso: true
      },
      orderBy: { fechaEmision: "desc" }
    });

    const enrollments = await db.eventEnrollment.findMany({
      where: { userId: user.id },
      include: {
        conversatorio: true,
        curso: {
          include: {
            certificateDesign: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const promotionPlans = await getPromotionPlans();

    const promotions = await db.professionalPromotion.findMany({
      where: { profileId: profile.id },
      include: { plan: true },
      orderBy: { createdAt: "desc" }
    });

    const invoiceQuota = await InvoiceLimitService.getInvoiceQuota(profile.id);
    const billingPlans = await db.billingPlan.findMany({
      where: { isActive: true },
      orderBy: { precio: "asc" }
    });

    const profileCompletion = await ProfileCompletionService.calculateProfessionalCompletion(profile.id);
    const convenios = await db.agreement.findMany({
      where: { activo: true },
      orderBy: { orden: "asc" }
    });

    res.render("dashboard-profesional", {
      title: "Mi Panel Profesional",
      activePage: "profesional",
      user,
      profile,
      invoices,
      success: req.query.success || null,
      error: req.query.error || null,
      templates,
      certificates,
      enrollments,
      promotionPlans,
      promotions,
      invoiceQuota,
      billingPlans,
      profileCompletion,
      convenios
    });
  } catch (error) {
    console.error("Error loading professional dashboard:", error);
    res.redirect("/?error=db_error");
  }
});

router.get("/dashboard/profesional/preview", requireProfessional, async (req: Request, res: Response): Promise<void> => {
  const user = req as Request & { user: { id: number } };

  try {
    const profile = await db.professionalProfile.findUnique({
      where: { userId: user.user.id },
      include: {
        user: {
          include: {
            acquiredCertificates: {
              where: { estado: "APROBADO" },
              include: {
                conversatorio: true,
                curso: true
              },
              orderBy: { fechaEmision: "desc" }
            }
          }
        },
        services: true,
        schedules: true,
        articles: true,
        template: true,
        education: {
          orderBy: { anioEmision: "desc" }
        },
        specialties: {
          include: { specialty: { include: { profession: true } } }
        }
      }
    });

    if (!profile) {
      res.status(404).render("preview-error", {
        title: "Vista previa no disponible",
        message: "Aún no has creado tu perfil profesional. Configúralo desde la pestaña Editar Perfil Público.",
        backHref: "/dashboard/profesional?tab=perfil"
      });
      return;
    }

    const requestedTemplate = typeof req.query.template === "string" ? req.query.template : undefined;
    const effectiveBaseLayout =
      requestedTemplate === "default" || requestedTemplate === "ejecutiva" || requestedTemplate === "medica"
        ? requestedTemplate
        : profile.template?.baseLayout ?? "default";

    const viewName = effectiveBaseLayout === "ejecutiva"
      ? "perfil-ejecutiva"
      : effectiveBaseLayout === "medica"
        ? "perfil-medica"
        : "perfil";

    res.render(viewName, {
      title: `Vista previa – ${profile.user.name}`,
      activePage: "profesional",
      profile,
      previewMode: true,
      successMsg: null,
      errorMsg: null,
      user: null
    });
  } catch (error) {
    console.error("Error loading professional profile preview:", error);
    res.status(500).send("Error al cargar la vista previa.");
  }
});

// POST Subscription Payment Request (Membership for verified badge)
router.post("/dashboard/profesional/pago-suscripcion", requireProfessional, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { bank, reference, paymentMethod, comprobante } = req.body;
  const isPayphone = paymentMethod === "payphone";
  try {
    const profile = await db.professionalProfile.findUnique({
      where: { userId: user.id },
      include: { issuer: true }
    });

    if (!profile) return res.redirect("/dashboard/profesional?tab=resumen&error=profile_not_found");

    // 1. Resolve or Create placeholder Issuer for relations
    let issuer = profile.issuer;
    if (!issuer) {
      issuer = await db.issuer.create({
        data: {
          ruc: "9999999999001", // Default placeholder
          nombres: user.name,
          apellidos: "",
          nombreEmpresa: "Profesional Independiente",
          razonSocial: user.name.toUpperCase(),
          direccion: profile.direccion || "Ecuador",
          email: user.email,
          celular: "0999999999",
          professionalProfileId: profile.id
        }
      });
    }

    if (isPayphone) {
      // Mockup deshabilitado: PayPhone real va por /api/payphone/prepare.
      const hasAjax = req.xhr || req.headers.accept?.includes("application/json") || req.body.ajax === true;
      if (hasAjax) {
        return res.status(400).json({
          success: false,
          error: "El pago con PayPhone debe realizarse a través de la pasarela de pago. Por favor, use el botón de PayPhone."
        });
      }
      return res.redirect("/dashboard/profesional?tab=resumen&error=payphone_gateway_required");
    } else {
      // Upload comprobante to Cloudinary if provided
      let comprobanteUrl = null;
      if (comprobante && comprobante.startsWith("data:")) {
        try {
          comprobanteUrl = await uploadBase64ToCloudinary(comprobante, "comprobantes");
        } catch (e) {
          console.warn("Cloudinary upload failed for membership receipt, falling back to base64", e);
          comprobanteUrl = comprobante;
        }
      }

      // Bank Transfer Payment Request (needs Admin approval)
      await db.paymentRequest.create({
        data: {
          ruc: issuer.ruc,
          razonSocial: issuer.razonSocial,
          monto: 15.00,
          tipo: "MEMBERSHIP",
          referencia: reference || "S/R",
          bancoDestino: bank || "Transferencia",
          comprobante: comprobanteUrl,
          estado: "PENDIENTE",
          issuerId: issuer.id
        }
      });

      // Mark planType request in profile as VERIFICADO (keeps badge pending approval)
      await db.professionalProfile.update({
        where: { id: profile.id },
        data: { planType: "VERIFICADO" }
      });

      res.redirect("/dashboard/profesional?tab=resumen&success=payment_submitted");
    }
  } catch (error) {
    console.error("Error submitting subscription payment:", error);
    res.redirect("/dashboard/profesional?tab=resumen&error=payment_failed");
  }
});

// POST Buy Promotion Plan
router.post("/dashboard/profesional/promociones/comprar", requireProfessional, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { planId, bank, reference, paymentMethod, comprobante } = req.body;
  const isPayphone = paymentMethod === "payphone";
  try {
    const profile = await db.professionalProfile.findUnique({
      where: { userId: user.id },
      include: { issuer: true }
    });

    if (!profile) return res.redirect("/dashboard/profesional?tab=promociones&error=profile_not_found");

    const plan = await getPromotionPlanById(parseInt(planId));

    if (!plan) return res.redirect("/dashboard/profesional?tab=promociones&error=plan_not_found");

    // 1. Resolve or Create placeholder Issuer for relations
    let issuer = profile.issuer;
    if (!issuer) {
      issuer = await db.issuer.create({
        data: {
          ruc: "9999999999001", // Default placeholder
          nombres: user.name,
          apellidos: "",
          nombreEmpresa: "Profesional Independiente",
          razonSocial: user.name.toUpperCase(),
          direccion: profile.direccion || "Ecuador",
          email: user.email,
          celular: "0999999999",
          professionalProfileId: profile.id
        }
      });
    }

    if (isPayphone) {
      // Mockup deshabilitado: PayPhone real va por /api/payphone/prepare.
      const hasAjax = req.xhr || req.headers.accept?.includes("application/json") || req.body.ajax === true;
      if (hasAjax) {
        return res.status(400).json({
          success: false,
          error: "El pago con PayPhone debe realizarse a través de la pasarela de pago. Por favor, use el botón de PayPhone."
        });
      }
      return res.redirect("/dashboard/profesional?tab=promociones&error=payphone_gateway_required");
    } else {
      // Upload comprobante to Cloudinary if provided
      let comprobanteUrl = null;
      if (comprobante && comprobante.startsWith("data:")) {
        try {
          comprobanteUrl = await uploadBase64ToCloudinary(comprobante, "comprobantes");
        } catch (e) {
          console.warn("Cloudinary upload failed for promotion receipt, falling back to base64", e);
          comprobanteUrl = comprobante;
        }
      }

      // Bank Transfer (Pending)
      const promotion = await db.professionalPromotion.create({
        data: {
          profileId: profile.id,
          planId: plan.id,
          status: "PENDIENTE"
        }
      });

      await db.paymentRequest.create({
        data: {
          ruc: issuer.ruc,
          razonSocial: issuer.razonSocial,
          monto: plan.precio,
          tipo: "PROMOTION",
          referencia: reference || "S/R",
          bancoDestino: bank || "Transferencia",
          comprobante: comprobanteUrl,
          estado: "PENDIENTE",
          issuerId: issuer.id,
          promotionId: promotion.id
        }
      });

      res.redirect("/dashboard/profesional?tab=promociones&success=payment_submitted");
    }
  } catch (error) {
    console.error("Error purchasing promotion plan:", error);
    res.redirect("/dashboard/profesional?tab=promociones&error=payment_failed");
  }
});

// POST Save Promotion Media (Banners & Popups)
router.post("/dashboard/profesional/promociones/guardar-medios", requireProfessional, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { promotionId, bannerCategory, bannerHome, popupImage, popupLink } = req.body;
  try {
    const profile = await db.professionalProfile.findUnique({
      where: { userId: user.id }
    });

    if (!profile) return res.redirect("/dashboard/profesional?tab=promociones&error=profile_not_found");

    const promotion = await db.professionalPromotion.findFirst({
      where: {
        id: parseInt(promotionId),
        profileId: profile.id
      },
      include: { plan: true }
    });

    if (!promotion) return res.redirect("/dashboard/profesional?tab=promociones&error=promotion_not_found");

    const updateData: any = {};

    // Check plan constraints before storing
    if (promotion.plan.allowCategoryBanner && bannerCategory !== undefined) {
      updateData.bannerCategory = bannerCategory && bannerCategory.startsWith("data:")
        ? (await uploadBase64ToCloudinary(bannerCategory, "promotions") || bannerCategory)
        : bannerCategory;
    }

    if (promotion.plan.allowHomeBanner && bannerHome !== undefined) {
      updateData.bannerHome = bannerHome && bannerHome.startsWith("data:")
        ? (await uploadBase64ToCloudinary(bannerHome, "promotions") || bannerHome)
        : bannerHome;
    }

    const allowPopup = promotion.plan.allowPopupHome || promotion.plan.allowPopupCategory || promotion.plan.allowPopupSpecialty;
    if (allowPopup) {
      if (popupImage !== undefined) {
        updateData.popupImage = popupImage && popupImage.startsWith("data:")
          ? (await uploadBase64ToCloudinary(popupImage, "promotions") || popupImage)
          : popupImage;
      }
      if (popupLink !== undefined) {
        updateData.popupLink = popupLink;
      }
    }

    await db.professionalPromotion.update({
      where: { id: promotion.id },
      data: updateData
    });

    res.redirect("/dashboard/profesional?tab=promociones&success=media_saved");
  } catch (error) {
    console.error("Error saving promotion media:", error);
    res.redirect("/dashboard/profesional?tab=promociones&error=media_save_failed");
  }
});

// POST Update Profile details
router.post("/dashboard/profesional/perfil", requireProfessional, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { name, slogan, bio, provincia, ciudad, direccion, latitud, longitud, photo, banner, tarifa, templateId, whatsapp } = req.body;
  try {
    const updateData: any = {};
    if (name) {
      await db.user.update({
        where: { id: user.id },
        data: { name }
      });
      const profile = await db.professionalProfile.findUnique({ where: { userId: user.id } });
      if (profile) {
        updateData.slug = await getUniqueSlug("professionalProfile", name, profile.id);
      }
    }
    if (slogan !== undefined) updateData.slogan = slogan;
    if (bio !== undefined) updateData.bio = bio;
    if (provincia !== undefined) updateData.provincia = provincia;
    if (ciudad !== undefined) updateData.ciudad = ciudad;
    if (direccion !== undefined) updateData.direccion = direccion;
    if (latitud !== undefined) updateData.latitud = latitud ? parseFloat(latitud) : null;
    if (longitud !== undefined) updateData.longitud = longitud ? parseFloat(longitud) : null;

    if (photo !== undefined) {
      if (photo && (photo.startsWith("data:") || photo.length > 200)) {
        updateData.photo = await uploadBase64ToCloudinary(photo, "fotos");
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
    if (templateId !== undefined) updateData.templateId = templateId ? parseInt(templateId) : null;
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp || null;

    await db.professionalProfile.update({
      where: { userId: user.id },
      data: updateData
    });
    res.redirect("/dashboard/profesional?tab=perfil");
  } catch (error) {
    console.error("Error updating profile:", error);
    res.redirect("/dashboard/profesional?tab=perfil&error=profile_update_failed");
  }
});

// POST Add/Edit Service
router.post("/dashboard/profesional/servicios", requireProfessional, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { serviceId, nombre, precio, descripcion } = req.body;
  try {
    const profile = await db.professionalProfile.findUnique({ where: { userId: user.id } });
    if (!profile) return res.redirect("/dashboard/profesional?tab=servicios&error=profile_not_found");

    const priceValue = (precio !== undefined && precio !== null && precio !== "") ? parseFloat(precio) : null;

    if (serviceId) {
      // Edit mode
      await db.professionalService.update({
        where: { id: parseInt(serviceId) },
        data: {
          nombre,
          precio: priceValue,
          descripcion: descripcion || null
        }
      });
      res.redirect("/dashboard/profesional?tab=servicios&success=service_updated");
    } else {
      // Create mode
      await db.professionalService.create({
        data: {
          profileId: profile.id,
          nombre,
          precio: priceValue,
          descripcion: descripcion || null,
          estado: "ACTIVO"
        }
      });
      res.redirect("/dashboard/profesional?tab=servicios&success=service_created");
    }
  } catch (error) {
    console.error("Error saving service:", error);
    res.redirect("/dashboard/profesional?tab=servicios&error=service_failed");
  }
});

// POST Delete Service
router.post("/dashboard/profesional/servicios/eliminar/:id", requireProfessional, async (req: Request, res: Response) => {
  const serviceId = parseInt(req.params.id as string);
  try {
    await db.professionalService.delete({ where: { id: serviceId } });
    res.redirect("/dashboard/profesional?tab=servicios&success=service_deleted");
  } catch (error) {
    console.error("Error deleting service:", error);
    res.redirect("/dashboard/profesional?tab=servicios&error=delete_service_failed");
  }
});

// POST Add/Edit Product (SRI)
router.post("/dashboard/profesional/productos", requireProfessional, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const {
    productId,
    nombre,
    codigoPrincipal,
    codigoAuxiliar,
    precio,
    descripcion,
    iva,
    defaultCantidad,
    defaultDescuento,
    defaultNota1,
    defaultNota2,
    imagen
  } = req.body;
  try {
    const profile = await db.professionalProfile.findUnique({ where: { userId: user.id } });
    if (!profile) return res.redirect("/dashboard/profesional?tab=productos&error=profile_not_found");

    const priceValue = parseFloat(precio) || 0;
    const ivaValue = parseFloat(iva) || 0;
    const principalCode = String(codigoPrincipal).trim().toUpperCase();
    const auxCode = codigoAuxiliar ? String(codigoAuxiliar).trim().toUpperCase() : null;

    const qtyValue = defaultCantidad ? parseFloat(defaultCantidad) : 1.0;
    const discountValue = defaultDescuento ? parseFloat(defaultDescuento) : 0.0;

    if (!nombre || !principalCode) {
      return res.redirect("/dashboard/profesional?tab=productos&error=missing_fields");
    }

    // Check code uniqueness for this professional
    const existing = await db.product.findFirst({
      where: {
        profileId: profile.id,
        codigoPrincipal: principalCode,
        NOT: productId ? { id: parseInt(productId) } : undefined
      }
    });

    if (existing) {
      return res.redirect("/dashboard/profesional?tab=productos&error=duplicate_product_code");
    }

    if (productId) {
      // Edit mode
      await db.product.update({
        where: { id: parseInt(productId) },
        data: {
          nombre,
          codigoPrincipal: principalCode,
          codigoAuxiliar: auxCode,
          precio: priceValue,
          iva: ivaValue,
          descripcion: descripcion || null,
          defaultCantidad: qtyValue,
          defaultDescuento: discountValue,
          defaultNota1: defaultNota1 || null,
          defaultNota2: defaultNota2 || null,
          imagen: imagen || undefined
        }
      });
      res.redirect("/dashboard/profesional?tab=productos&success=product_updated");
    } else {
      // Create mode
      await db.product.create({
        data: {
          profileId: profile.id,
          nombre,
          codigoPrincipal: principalCode,
          codigoAuxiliar: auxCode,
          precio: priceValue,
          iva: ivaValue,
          descripcion: descripcion || null,
          defaultCantidad: qtyValue,
          defaultDescuento: discountValue,
          defaultNota1: defaultNota1 || null,
          defaultNota2: defaultNota2 || null,
          imagen: imagen || null
        }
      });
      res.redirect("/dashboard/profesional?tab=productos&success=product_created");
    }
  } catch (error) {
    console.error("Error saving product:", error);
    res.redirect("/dashboard/profesional?tab=productos&error=product_failed");
  }
});

// POST Delete Product
router.post("/dashboard/profesional/productos/eliminar/:id", requireProfessional, async (req: Request, res: Response) => {
  const pId = parseInt(req.params.id as string);
  try {
    await db.product.delete({ where: { id: pId } });
    res.redirect("/dashboard/profesional?tab=productos&success=product_deleted");
  } catch (error) {
    console.error("Error deleting product:", error);
    res.redirect("/dashboard/profesional?tab=productos&error=delete_product_failed");
  }
});

// POST Add Schedule Range
router.post("/dashboard/profesional/horarios", requireProfessional, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { dia, horaInicio, horaFin } = req.body;
  try {
    const profile = await db.professionalProfile.findUnique({ where: { userId: user.id } });
    if (!profile) return res.redirect("/dashboard/profesional?tab=horario&error=profile_not_found");

    await db.professionalSchedule.create({
      data: {
        profileId: profile.id,
        dia,
        horaInicio,
        horaFin
      }
    });
    res.redirect("/dashboard/profesional?tab=horario");
  } catch (error) {
    console.error("Error adding schedule:", error);
    res.redirect("/dashboard/profesional?tab=horario&error=schedule_failed");
  }
});

// POST Delete Schedule Range
router.post("/dashboard/profesional/horarios/eliminar/:id", requireProfessional, async (req: Request, res: Response) => {
  const scheduleId = parseInt(req.params.id as string);
  try {
    await db.professionalSchedule.delete({ where: { id: scheduleId } });
    res.redirect("/dashboard/profesional?tab=horario");
  } catch (error) {
    console.error("Error deleting schedule:", error);
    res.redirect("/dashboard/profesional?tab=horario&error=delete_schedule_failed");
  }
});

// POST Upload Article
router.post("/dashboard/profesional/articulos", requireProfessional, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { titulo, resumen, imagen, pdfUrl } = req.body;
  try {
    const profile = await db.professionalProfile.findUnique({ where: { userId: user.id } });
    if (!profile) return res.redirect("/dashboard/profesional?tab=articulos&error=profile_not_found");

    const articleSlug = await getUniqueSlug("article", titulo);

    const newArticle = await db.article.create({
      data: {
        profileId: profile.id,
        titulo,
        slug: articleSlug,
        resumen,
        imagen: imagen || null,
        pdfUrl, // Base64 string of PDF
        estado: "PENDIENTE",
        displayMode: "PDF",
        conversionStatus: "PENDING"
      }
    });

    // Iniciar conversión en segundo plano
    processPdfArticle(newArticle.id).catch(err => {
      console.error(`Error triggering conversion for article ${newArticle.id}:`, err);
    });

    res.redirect("/dashboard/profesional?tab=articulos");
  } catch (error) {
    console.error("Error uploading article:", error);
    res.redirect("/dashboard/profesional?tab=articulos&error=article_failed");
  }
});

// POST Delete Article
router.post("/dashboard/profesional/articulos/eliminar/:id", requireProfessional, async (req: Request, res: Response) => {
  const articleId = parseInt(req.params.id as string);
  try {
    await db.article.delete({ where: { id: articleId } });
    res.redirect("/dashboard/profesional?tab=articulos");
  } catch (error) {
    console.error("Error deleting article:", error);
    res.redirect("/dashboard/profesional?tab=articulos&error=delete_article_failed");
  }
});

// POST Add Education / External Certification
router.post("/dashboard/profesional/educacion", requireProfessional, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const { tipo, titulo, institucion, nivelEstudio, tipoCertificado, horas, anioEmision, imagen } = req.body;

  try {
    const profile = await db.professionalProfile.findUnique({
      where: { userId: user.id }
    });

    if (!profile) {
      res.redirect("/dashboard/profesional?tab=educacion&error=profile_not_found");
      return;
    }

    if (!tipo || !titulo || !institucion || !anioEmision || !imagen) {
      res.redirect("/dashboard/profesional?tab=educacion&error=missing_fields");
      return;
    }

    await db.professionalEducation.create({
      data: {
        profileId: profile.id,
        tipo: tipo.trim(),
        titulo: titulo.trim(),
        institucion: institucion.trim(),
        nivelEstudio: nivelEstudio ? nivelEstudio.trim() : null,
        tipoCertificado: tipoCertificado ? tipoCertificado.trim() : null,
        horas: horas ? parseInt(horas, 10) || null : null,
        anioEmision: parseInt(anioEmision, 10) || new Date().getFullYear(),
        imagen: imagen.trim()
      }
    });

    res.redirect("/dashboard/profesional?tab=educacion&success=education_created");
  } catch (error) {
    console.error("Error creating education entry:", error);
    res.redirect("/dashboard/profesional?tab=educacion&error=education_failed");
  }
});

// POST Edit Education / External Certification
router.post("/dashboard/profesional/educacion/editar/:id", requireProfessional, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const educationId = parseInt(req.params.id as string, 10);
  const { tipo, titulo, institucion, nivelEstudio, tipoCertificado, horas, anioEmision, imagen } = req.body;

  try {
    const profile = await db.professionalProfile.findUnique({
      where: { userId: user.id }
    });

    if (!profile) {
      res.redirect("/dashboard/profesional?tab=educacion&error=profile_not_found");
      return;
    }

    const existing = await db.professionalEducation.findFirst({
      where: { id: educationId, profileId: profile.id }
    });

    if (!existing) {
      res.redirect("/dashboard/profesional?tab=educacion&error=not_found");
      return;
    }

    await db.professionalEducation.update({
      where: { id: educationId },
      data: {
        tipo: tipo ? tipo.trim() : existing.tipo,
        titulo: titulo ? titulo.trim() : existing.titulo,
        institucion: institucion ? institucion.trim() : existing.institucion,
        nivelEstudio: nivelEstudio !== undefined ? (nivelEstudio ? nivelEstudio.trim() : null) : existing.nivelEstudio,
        tipoCertificado: tipoCertificado !== undefined ? (tipoCertificado ? tipoCertificado.trim() : null) : existing.tipoCertificado,
        horas: horas !== undefined ? (horas ? parseInt(horas, 10) || null : null) : existing.horas,
        anioEmision: anioEmision ? parseInt(anioEmision, 10) || existing.anioEmision : existing.anioEmision,
        imagen: imagen && imagen.trim() ? imagen.trim() : existing.imagen
      }
    });

    res.redirect("/dashboard/profesional?tab=educacion&success=education_updated");
  } catch (error) {
    console.error("Error updating education entry:", error);
    res.redirect("/dashboard/profesional?tab=educacion&error=update_failed");
  }
});

// POST Delete Education / External Certification
router.post("/dashboard/profesional/educacion/eliminar/:id", requireProfessional, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const educationId = parseInt(req.params.id as string, 10);

  try {
    const profile = await db.professionalProfile.findUnique({
      where: { userId: user.id }
    });

    if (!profile) {
      res.redirect("/dashboard/profesional?tab=educacion&error=profile_not_found");
      return;
    }

    await db.professionalEducation.deleteMany({
      where: { id: educationId, profileId: profile.id }
    });

    res.redirect("/dashboard/profesional?tab=educacion&success=education_deleted");
  } catch (error) {
    console.error("Error deleting education entry:", error);
    res.redirect("/dashboard/profesional?tab=educacion&error=delete_failed");
  }
});

// Función asíncrona de extracción de texto y maquetación responsiva
export async function processPdfArticle(articleId: number) {
  try {
    const article = await db.article.findUnique({ where: { id: articleId } });
    if (!article || !article.pdfUrl) {
      console.error(`Article ${articleId} not found or has no PDF.`);
      return;
    }

    await db.article.update({
      where: { id: articleId },
      data: {
        conversionStatus: "PROCESSING",
        conversionProgress: 10,
        conversionError: null
      }
    });

    let pdfBuffer: Buffer;
    if (article.pdfUrl.startsWith("data:application/pdf;base64,")) {
      const base64Data = article.pdfUrl.split(",")[1];
      pdfBuffer = Buffer.from(base64Data, "base64");
    } else {
      try {
        pdfBuffer = Buffer.from(article.pdfUrl, "base64");
      } catch (err) {
        throw new Error("Formato de PDF inválido (se esperaba Base64).");
      }
    }

    // Read PDF (progress 35%)
    await db.article.update({
      where: { id: articleId },
      data: { conversionProgress: 35 }
    });

    const parser = new PDFParse({ data: pdfBuffer });
    const result = await parser.getText();
    await parser.destroy();
    const rawText = result.text || "";

    if (!rawText.trim()) {
      throw new Error("El archivo PDF parece estar escaneado o vacío de texto seleccionable.");
    }

    // Parsing start (progress 50%)
    await db.article.update({
      where: { id: articleId },
      data: { conversionProgress: 50 }
    });

    const lines = rawText.split("\n").map((l: string) => l.trim());
    let htmlContent = "";
    let currentParagraph: string[] = [];
    let insideList = false;

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const text = currentParagraph.join(" ");
        if (text.length > 0) {
          if (insideList) {
            htmlContent += `<li class="mb-2.5">${text}</li>\n`;
          } else {
            htmlContent += `<p class="mb-4 leading-relaxed">${text}</p>\n`;
          }
          currentParagraph = [];
        }
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (/^page\s+\d+$/i.test(line) || /^\d+\s*$/i.test(line) || line.toLowerCase() === "profesionales.ec" || line.startsWith("---") || line.includes("of")) {
        continue;
      }

      if (line === "") {
        flushParagraph();
        continue;
      }

      // Check if it's a heading
      const isUppercaseHeading = line.length < 90 && line === line.toUpperCase() && line.match(/[A-ZÁÉÍÓÚ]/);
      const isChapterHeading = line.length < 110 && (
        line.toLowerCase().startsWith("capítulo") ||
        line.toLowerCase().startsWith("capitulo") ||
        /^\d+(\.\d+)*\s+[A-Z]/i.test(line)
      );

      if (isUppercaseHeading || isChapterHeading) {
        flushParagraph();
        if (insideList) {
          htmlContent += `</ul>\n`;
          insideList = false;
        }
        const level = isChapterHeading ? 2 : 3;
        htmlContent += `<h${level} class="font-heading font-black text-slate-900 mt-6 mb-3 text-lg leading-tight">${line}</h${level}>\n`;
        continue;
      }

      // Check if it's a quote
      const isQuote = line.length > 30 && line.startsWith("“") && line.endsWith("”");
      if (isQuote) {
        flushParagraph();
        if (insideList) {
          htmlContent += `</ul>\n`;
          insideList = false;
        }
        htmlContent += `<blockquote class="border-l-4 border-sky-500 pl-4 py-1.5 my-4 italic text-slate-600 bg-slate-50/50 rounded-r-xl">${line}</blockquote>\n`;
        continue;
      }

      // Check if it's a list item
      const listMatch = line.match(/^[\-\*•]\s+(.*)$/) || line.match(/^\d+[\.\)]\s+(.*)$/);
      if (listMatch) {
        flushParagraph();
        if (!insideList) {
          htmlContent += `<ul class="list-disc pl-5 mb-4 space-y-1.5">\n`;
          insideList = true;
        }
        currentParagraph.push(listMatch[1]);
        continue;
      } else if (insideList) {
        flushParagraph();
        htmlContent += `</ul>\n`;
        insideList = false;
      }

      currentParagraph.push(line);

      // Paragraph flush heuristics
      const nextLine = lines[i + 1] ? lines[i + 1].trim() : "";
      const lineEndsWithPunctuation = /[.!?’”"]$/.test(line);
      const nextLineStartsCapital = /^[A-ZÁÉÍÓÚ“"\[]/.test(nextLine);
      const lineIsShort = line.length < 80;

      if (
        nextLine === "" ||
        (lineEndsWithPunctuation && (nextLineStartsCapital || lineIsShort)) ||
        /^(capítulo|capitulo)/i.test(nextLine) ||
        /^\d+(\.\d+)*\s+[A-Z]/i.test(nextLine) ||
        (nextLine.length < 60 && nextLine === nextLine.toUpperCase() && nextLine.match(/[A-Z]/)) ||
        (nextLine.length > 30 && nextLine.startsWith("“") && nextLine.endsWith("”")) ||
        nextLine.match(/^[\-\*•]\s+/) ||
        nextLine.match(/^\d+[\.\)]\s+/)
      ) {
        flushParagraph();
      }

      // Periodically update progress percentage (from 50% to 95%)
      if (i % 25 === 0 || i === lines.length - 1) {
        const currentProgress = 50 + Math.round((i / lines.length) * 45);
        await db.article.update({
          where: { id: articleId },
          data: { conversionProgress: currentProgress }
        });
      }
    }

    flushParagraph();
    if (insideList) {
      htmlContent += `</ul>\n`;
    }

    const finalHtml = `<div class="epub-content max-w-none text-[15px] font-normal leading-relaxed text-slate-800 space-y-4">\n${htmlContent}</div>`;

    await db.article.update({
      where: { id: articleId },
      data: {
        contentHtml: finalHtml,
        conversionStatus: "COMPLETED",
        conversionProgress: 100,
        conversionError: null
      }
    });

  } catch (err: any) {
    console.error(`[PDF Converter] Error processing Article ${articleId}:`, err);
    await db.article.update({
      where: { id: articleId },
      data: {
        conversionStatus: "FAILED",
        conversionProgress: 0,
        conversionError: err.message || "Error desconocido durante la extracción del PDF."
      }
    });
  }
}

// GET Public Article Reader View
router.get("/articulos/leer/:identifier", async (req: Request, res: Response) => {
  const identifier = req.params.identifier as string;
  const isNumericId = /^\d+$/.test(identifier);
  const articleId = isNumericId ? parseInt(identifier, 10) : NaN;

  try {
    let article = await db.article.findFirst({
      where: isNumericId ? { OR: [{ id: articleId }, { slug: identifier }] } : { slug: identifier },
      include: {
        profile: {
          include: { user: true }
        }
      }
    });

    // Auto-generate slug if missing on existing legacy article
    if (article && !article.slug) {
      const newSlug = await getUniqueSlug("article", article.titulo);
      article = await db.article.update({
        where: { id: article.id },
        data: { slug: newSlug },
        include: {
          profile: {
            include: { user: true }
          }
        }
      });
    }

    if (!article) {
      return res.status(404).render("pagina-cms", {
        title: "Artículo no encontrado",
        page: {
          titulo: "Artículo no encontrado",
          contenido: `<div class="p-6 bg-slate-50 border border-slate-100 text-slate-800 rounded-2xl text-center flex flex-col items-center gap-4">
                        <i class="fa-solid fa-circle-question text-3xl text-slate-400"></i>
                        <p class="font-extrabold text-sm">El artículo solicitado no existe o ha sido eliminado.</p>
                        <a href="/" class="mt-2 text-xs bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-6 rounded-full transition">Volver al Inicio</a>
                      </div>`,
          updatedAt: new Date()
        }
      });
    }

    // Security: Only allow public access if the article is APROBADO, or if user is owner/admin
    const sessionUser = (req as any).user;
    const isOwner = sessionUser && sessionUser.id === article.profile.userId;
    const isAdmin = sessionUser && sessionUser.role && sessionUser.role.name === "ADMIN";

    if (article.estado !== "APROBADO" && !isOwner && !isAdmin) {
      return res.status(403).render("pagina-cms", {
        title: "Acceso denegado",
        page: {
          titulo: "Acceso Denegado",
          contenido: `<div class="p-6 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl text-center flex flex-col items-center gap-4">
                        <i class="fa-solid fa-triangle-exclamation text-3xl text-rose-500"></i>
                        <p class="font-extrabold text-sm">Este artículo se encuentra en revisión y aún no ha sido aprobado para lectura pública.</p>
                        <a href="/" class="mt-2 text-xs bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-6 rounded-full transition">Volver al Inicio</a>
                      </div>`,
          updatedAt: new Date()
        }
      });
    }

    res.render("articulo-lector", {
      title: article.titulo,
      article,
      activePage: "articulos"
    });
  } catch (error) {
    console.error("Error loading article reader:", error);
    res.status(500).render("pagina-cms", {
      title: "Error interno",
      page: {
        titulo: "Error de Servidor",
        contenido: `<p class="text-xs font-semibold text-rose-600">Ocurrió un error al cargar el lector de artículos.</p>`,
        updatedAt: new Date()
      }
    });
  }
});

// GET Article Conversion Status API
router.get("/api/articulos/estado/:id", async (req: Request, res: Response) => {
  const articleId = parseInt(req.params.id as string);
  try {
    const article = await db.article.findUnique({
      where: { id: articleId },
      select: {
        conversionStatus: true,
        conversionProgress: true,
        conversionError: true,
        contentHtml: true
      }
    });
    if (!article) {
      return res.status(404).json({ error: "Artículo no encontrado" });
    }
    res.json({
      status: article.conversionStatus,
      progress: article.conversionProgress,
      error: article.conversionError,
      html: article.contentHtml
    });
  } catch (error) {
    console.error("Error fetching article conversion status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST Reprocess Article (Admin only)
router.post("/dashboard/admin/articles/reprocess/:id", requireAdmin, async (req: Request, res: Response) => {
  const articleId = parseInt(req.params.id as string);
  try {
    await db.article.update({
      where: { id: articleId },
      data: { conversionStatus: "PENDING", conversionError: null }
    });
    processPdfArticle(articleId).catch(err => console.error(err));
    res.redirect("/dashboard/admin?tab=articles&success=article_reprocessed");
  } catch (error) {
    console.error("Error triggering article reprocessing:", error);
    res.redirect("/dashboard/admin?tab=articles&error=reprocess_failed");
  }
});

// POST Update Appointment status & Trigger email
router.post("/dashboard/profesional/citas/estado/:id", requireProfessional, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const appointmentId = parseInt(req.params.id as string);
  const { estado } = req.body;
  try {
    const appointment = await db.appointment.update({
      where: { id: appointmentId },
      data: { estado }
    });

    // Notify by email
    emailService.sendAppointmentStatusChanged(
      appointment.correo,
      {
        recipientName: appointment.nombre,
        customerName: appointment.nombre,
        professionalName: user.name,
        motivo: appointment.motivo || "Consulta General",
        date: appointment.fecha,
        time: appointment.hora,
        status: estado,
        statusLabel: APPOINTMENT_STATUS_LABELS[estado] || estado,
        appointmentId: appointment.id,
      }
    ).catch(err => console.warn("Could not send appointment notification email:", err));

    res.redirect("/dashboard/profesional?tab=citas");
  } catch (error) {
    console.error("Error changing appointment status:", error);
    res.redirect("/dashboard/profesional?tab=citas&error=appointment_update_failed");
  }
});

// POST Reprogram appointment date/time & Trigger email notification
router.post("/dashboard/profesional/citas/reprogramar", requireProfessional, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { appointmentId, fecha, hora } = req.body;
  try {
    const parsedId = parseInt(appointmentId as string);

    const nowEc = nowInEcuador();
    const targetDateTime = `${fecha}T${hora}:00`;
    const nowDateTime = `${nowEc.date}T${nowEc.time}:00`;
    if (targetDateTime <= nowDateTime) {
      return res.redirect("/dashboard/profesional?tab=citas&error=past_date");
    }

    // Fetch original appointment to capture old date/time for the email
    const originalAppointment = await db.appointment.findUnique({
      where: { id: parsedId }
    });
    if (!originalAppointment) {
      return res.redirect("/dashboard/profesional?tab=citas&error=appointment_not_found");
    }

    const appointment = await db.appointment.update({
      where: { id: parsedId },
      data: {
        fecha,
        hora,
        estado: "REPROGRAMADA"
      },
      include: {
        profile: {
          include: { user: true }
        }
      }
    });

    // Notify Client by email
    emailService.sendAppointmentRescheduled(
      appointment.correo,
      {
        recipientName: appointment.nombre,
        customerName: appointment.nombre,
        professionalName: appointment.profile.user.name,
        oldDate: originalAppointment.fecha,
        oldTime: originalAppointment.hora,
        newDate: fecha,
        newTime: hora,
        motivo: appointment.motivo || "Consulta General",
        appointmentId: appointment.id,
      }
    ).catch(err => console.warn("Could not send reschedule notification email:", err));

    res.redirect("/dashboard/profesional?tab=citas&success=appointment_rescheduled");
  } catch (error) {
    console.error("Error rescheduling appointment:", error);
    res.redirect("/dashboard/profesional?tab=citas&error=reschedule_failed");
  }
});

// POST Update Professional Social Links
router.post("/dashboard/profesional/redes", requireProfessional, async (req: Request, res: Response) => {
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
});

// POST Change Password
router.post("/dashboard/profesional/password/cambiar", requireProfessional, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { currentPassword, newPassword } = req.body;
  try {
    if (!newPassword || newPassword.length < 6) {
      return res.redirect("/dashboard/profesional?tab=configuracion&error=password_length");
    }

    const dbUser = await db.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      return res.redirect("/dashboard/profesional?tab=configuracion&error=user_not_found");
    }

    const isValid = await comparePassword(currentPassword, dbUser.password);
    if (!isValid) {
      return res.redirect("/dashboard/profesional?tab=configuracion&error=password_incorrect");
    }

    const hashedPassword = await hashPassword(newPassword);
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    res.redirect("/dashboard/profesional?tab=configuracion&success=password_changed");
  } catch (error) {
    console.error("Error changing password:", error);
    res.redirect("/dashboard/profesional?tab=configuracion&error=password_change_failed");
  }
});

// POST Delete Account (Cascade deleting user data)
router.post("/dashboard/profesional/cuenta/eliminar", requireProfessional, async (req: Request, res: Response) => {
  const user = (req as any).user;
  try {
    const profile = await db.professionalProfile.findUnique({
      where: { userId: user.id },
      include: { issuer: true }
    });

    const uId = user.id;
    const pId = profile?.id;

    await revokeSessionFromToken(req.cookies?.token);

    await db.$transaction(async (tx) => {
      if (pId) {
        await tx.professionalProfileSpecialty.deleteMany({ where: { profileId: pId } });
        await tx.professionalService.deleteMany({ where: { profileId: pId } });
        await tx.professionalSchedule.deleteMany({ where: { profileId: pId } });
        await tx.professionalEducation.deleteMany({ where: { profileId: pId } });
        await tx.professionalPromotion.deleteMany({ where: { profileId: pId } });
        await tx.product.deleteMany({ where: { profileId: pId } });
        await tx.article.deleteMany({ where: { profileId: pId } });
        await tx.conversatorio.deleteMany({ where: { profileId: pId } });
        await tx.curso.deleteMany({ where: { profileId: pId } });

        if (profile?.issuer) {
          await tx.paymentRequest.deleteMany({ where: { issuerId: profile.issuer.id } });
          await tx.issuer.delete({ where: { id: profile.issuer.id } });
        }

        await tx.professionalProfile.delete({ where: { id: pId } });
      }

      await tx.roleTransitionRequest.deleteMany({ where: { userId: uId } });
      await tx.userSession.deleteMany({ where: { userId: uId } });
      await tx.payPhoneTransaction.deleteMany({ where: { userId: uId } });
      await tx.auditLog.deleteMany({ where: { userId: uId } });
      await tx.eventAccessLog.deleteMany({ where: { userId: uId } });
      await tx.eventEnrollment.deleteMany({ where: { userId: uId } });
      await tx.cursoSubmission.deleteMany({ where: { userId: uId } });
      await tx.certificate.deleteMany({ where: { userId: uId } });
      await tx.cursoCertificate.deleteMany({ where: { userId: uId } });
      await tx.appointment.deleteMany({
        where: { OR: [{ userId: uId }, ...(pId ? [{ profileId: pId }] : [])] }
      });
      await tx.referralProfile.deleteMany({ where: { userId: uId } });

      await tx.user.delete({ where: { id: uId } });
    });

    res.clearCookie("token");
    res.redirect("/?success=account_deleted");
  } catch (error) {
    console.error("Error deleting account:", error);
    res.redirect("/dashboard/profesional?tab=configuracion&error=delete_account_failed");
  }
});

// POST Save Professional SRI Issuer settings
router.post("/dashboard/profesional/facturacion/config", requireProfessional, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const {
    ruc,
    nombres,
    apellidos,
    nombreEmpresa,
    razonSocial,
    direccion,
    email,
    celular,
    establecimiento,
    puntoEmision,
    startSecuencial,
    regimen,
    obligadoContabilidad,
    ambiente,
    firmaElectronica,
    codigoSri
  } = req.body;

  try {
    const profile = await db.professionalProfile.findUnique({
      where: { userId: user.id },
      include: { issuer: true }
    });

    if (!profile) return res.redirect("/dashboard/profesional?tab=facturacion&error=profile_not_found");

    const finalFirma = firmaElectronica ? encryptText(firmaElectronica) : (profile.issuer?.firmaElectronica || null);
    const finalCodigo = codigoSri ? encryptText(codigoSri) : (profile.issuer?.codigoSri || null);

    const payload = {
      ruc,
      nombres,
      apellidos,
      nombreEmpresa,
      razonSocial,
      direccion,
      email,
      celular,
      establecimiento,
      puntoEmision,
      startSecuencial: startSecuencial || "000000001",
      regimen: regimen || "REGIMEN GENERAL",
      obligadoContabilidad: obligadoContabilidad === "true",
      ambiente: parseInt(ambiente || "1"),
      firmaElectronica: finalFirma,
      codigoSri: finalCodigo,
      professionalProfileId: profile.id
    };

    if (profile.issuer) {
      await db.issuer.update({
        where: { id: profile.issuer.id },
        data: payload
      });
    } else {
      await db.issuer.create({
        data: payload
      });
    }

    res.redirect("/dashboard/profesional?tab=facturacion&success=config_success");
  } catch (error) {
    console.error("Error configuring invoicing settings:", error);
    res.redirect("/dashboard/profesional?tab=facturacion&error=config_failed");
  }
});

// POST Buy / Request Billing Plan
router.post("/dashboard/profesional/facturacion/comprar-plan", requireProfessional, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { planId, bank, reference, paymentMethod, comprobante } = req.body;
  try {
    const profile = await db.professionalProfile.findUnique({
      where: { userId: user.id },
      include: { issuer: true }
    });

    if (!profile) return res.redirect("/dashboard/profesional?tab=facturacion&error=profile_not_found");

    const plan = await db.billingPlan.findUnique({ where: { id: parseInt(planId) } });
    if (!plan || !plan.isActive) return res.redirect("/dashboard/profesional?tab=facturacion&error=plan_not_found");

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (plan.duracionDias || 30));

    // Si el plan es gratuito (precio == 0), se activa inmediatamente
    if (plan.precio === 0) {
      await db.billingSubscription.create({
        data: {
          profileId: profile.id,
          planId: plan.id,
          startDate,
          endDate,
          status: "ACTIVO"
        }
      });
      return res.redirect("/dashboard/profesional?tab=facturacion&success=billing_plan_activated");
    }

    let comprobanteUrl = null;
    if (comprobante && comprobante.startsWith("data:")) {
      try {
        comprobanteUrl = await uploadBase64ToCloudinary(comprobante, "comprobantes");
      } catch (e) {
        comprobanteUrl = comprobante;
      }
    }

    let issuer = profile.issuer;
    if (!issuer) {
      issuer = await db.issuer.create({
        data: {
          ruc: "9999999999001",
          nombres: user.name,
          apellidos: "",
          nombreEmpresa: "Profesional Independiente",
          razonSocial: user.name.toUpperCase(),
          direccion: profile.direccion || "Ecuador",
          email: user.email,
          celular: "0999999999",
          professionalProfileId: profile.id
        }
      });
    }

    // Crear suscripción en estado PENDIENTE de aprobación por el admin
    const subscription = await db.billingSubscription.create({
      data: {
        profileId: profile.id,
        planId: plan.id,
        startDate,
        endDate,
        status: "PENDIENTE"
      }
    });

    await db.paymentRequest.create({
      data: {
        ruc: issuer.ruc,
        razonSocial: issuer.razonSocial,
        monto: plan.precio,
        tipo: "BILLING_PLAN",
        referencia: reference || "S/R",
        bancoDestino: bank || "Transferencia",
        comprobante: comprobanteUrl,
        estado: "PENDIENTE",
        issuerId: issuer.id,
        bankAccountLabel: `Plan de Facturación: ${plan.nombre}`
      }
    });

    res.redirect("/dashboard/profesional?tab=facturacion&success=billing_plan_submitted");
  } catch (error) {
    console.error("Error purchasing billing plan:", error);
    res.redirect("/dashboard/profesional?tab=facturacion&error=billing_plan_failed");
  }
});

// POST Emit SRI Electronic Invoice (Full Workflow)
router.post("/dashboard/profesional/facturacion/emitir", requireProfessional, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const {
    client_tipoIdentificacion,
    client_identificacion,
    client_nombres,
    client_direccion,
    client_mail,
    client_celular,
    formaPago,
    observaciones,
    items
  } = req.body;

  try {
    const profile = await db.professionalProfile.findUnique({
      where: { userId: user.id },
      include: { issuer: true }
    });

    if (!profile || !profile.issuer || !profile.issuer.firmaElectronica || !profile.issuer.codigoSri) {
      return res.redirect("/dashboard/profesional?tab=facturacion&error=missing_issuer_config");
    }

    // Validar límite de consumo de facturación electrónica
    const canEmit = await InvoiceLimitService.canEmitInvoice(profile.id);
    if (!canEmit.allowed) {
      return res.redirect(`/dashboard/profesional?tab=facturacion&error=${encodeURIComponent(canEmit.reason || "Límite de facturas alcanzado")}`);
    }

    const issuer = profile.issuer;

    // 1. Resolve or Create Client
    let clientObj = await db.client.findUnique({ where: { identificacion: client_identificacion } });
    if (clientObj) {
      clientObj = await db.client.update({
        where: { id: clientObj.id },
        data: {
          nombres: client_nombres.toUpperCase(),
          tipoIdentificacion: client_tipoIdentificacion,
          direccion: client_direccion,
          mail: client_mail,
          celular: client_celular
        }
      });
    } else {
      clientObj = await db.client.create({
        data: {
          identificacion: client_identificacion,
          nombres: client_nombres.toUpperCase(),
          tipoIdentificacion: client_tipoIdentificacion,
          direccion: client_direccion,
          mail: client_mail,
          celular: client_celular
        }
      });
    }

    // 2. Parse Items
    const parsedItems = JSON.parse(items || "[]");
    if (parsedItems.length === 0) {
      return res.redirect("/dashboard/profesional?tab=facturacion&error=no_items");
    }

    let subtotal0 = 0;
    let subtotalIva = 0;
    let valorIva = 0;

    const xmlItems: any[] = [];
    const dbItemsData: any[] = [];

    const productIds = parsedItems.map((i: any) => parseInt(i.productId)).filter((id: number) => !isNaN(id));
    const dbProducts = await db.product.findMany({ where: { id: { in: productIds }, profileId: profile.id } });
    const productsMap = new Map(dbProducts.map(p => [p.id, p]));

    for (const item of parsedItems) {
      let serviceName = "";
      let serviceCode = "";
      let precioUnitario = 0;
      let serviceDesc = "";
      let itemIvaPercentage = item.iva !== undefined && item.iva !== null ? parseFloat(item.iva) : 12;
      let dbProduct: any = null;

      const isManual = item.productId && String(item.productId).startsWith("MANUAL");

      if (isManual) {
        serviceName = item.nombre;
        serviceCode = `MANUAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        precioUnitario = parseFloat(item.precio) || 0;
        serviceDesc = "Servicio Facturado Manualmente";
      } else {
        dbProduct = productsMap.get(parseInt(item.productId));
        if (!dbProduct) continue;

        serviceName = dbProduct.nombre;
        serviceCode = dbProduct.codigoPrincipal;
        precioUnitario = dbProduct.precio || 0;
        serviceDesc = dbProduct.descripcion || "Producto Facturado";
        itemIvaPercentage = dbProduct.iva;
      }

      const cantidad = parseFloat(item.cantidad || 1);
      const subtotalItem = precioUnitario * cantidad;
      const desc = parseFloat(item.descuento || 0) || 0;
      const baseImponible = subtotalItem - desc;
      const itemIvaVal = baseImponible * (itemIvaPercentage > 0 ? itemIvaPercentage / 100 : 0);

      if (itemIvaPercentage <= 0) {
        subtotal0 += baseImponible;
      } else {
        subtotalIva += baseImponible;
        valorIva += itemIvaVal;
      }

      xmlItems.push({
        nombre: serviceName,
        codigoPrincipal: serviceCode,
        precioUnitario,
        cantidad,
        descuento: desc,
        ivaPercentage: itemIvaPercentage
      });

      // Maintain Product compatibility for COMERCIO schema
      let product = null;
      if (isManual) {
        product = await db.product.findFirst({ where: { codigoPrincipal: serviceCode, profileId: profile.id } });
        if (!product) {
          product = await db.product.create({
            data: {
              profileId: profile.id,
              nombre: serviceName,
              codigoPrincipal: serviceCode,
              precio: precioUnitario,
              descripcion: serviceDesc,
              iva: itemIvaPercentage
            }
          });
        }
      } else {
        product = dbProduct;
      }

      dbItemsData.push({
        productId: product.id,
        cantidad,
        precioUnitario,
        descuento: desc,
        total: baseImponible + itemIvaVal,
        notaExtra1: item.notaExtra1 || null,
        notaExtra2: item.notaExtra2 || null
      });
    }

    const total = subtotal0 + subtotalIva + valorIva;

    // 3. Generate Sequential
    const lastInvoice = await db.invoice.findFirst({
      where: {
        issuerId: issuer.id,
        estado: { in: ["AUTORIZADA", "RECIBIDA"] }
      },
      orderBy: { secuencial: "desc" }
    });

    const nextSecNum = lastInvoice ? parseInt(lastInvoice.secuencial) + 1 : parseInt(issuer.startSecuencial);
    const secuencial = String(nextSecNum).padStart(9, "0");

    // 4. Create invoice record in database
    let invoice = await db.invoice.create({
      data: {
        secuencial,
        fechaEmision: new Date(),
        tipoAmbiente: issuer.ambiente,
        subtotal0,
        subtotalIva,
        valorIva,
        total,
        formaPago,
        observaciones,
        clientId: clientObj.id,
        issuerId: issuer.id,
        estado: "CREADA",
        items: {
          create: dbItemsData
        }
      }
    });

    // 5. Generate Unsigned XML
    const xmlGen = generateInvoiceXml({
      secuencial,
      ambiente: issuer.ambiente,
      establecimiento: issuer.establecimiento,
      puntoEmision: issuer.puntoEmision,
      fechaEmision: invoice.fechaEmision,
      formaPago,
      emisor: {
        ruc: issuer.ruc,
        razonSocial: issuer.razonSocial,
        nombreComercial: issuer.nombreEmpresa,
        direccionMatriz: issuer.direccion,
        direccionEstablecimiento: issuer.direccion,
        obligadoContabilidad: issuer.obligadoContabilidad,
        regimen: issuer.regimen
      },
      comprador: {
        nombres: clientObj.nombres,
        tipoIdentificacion: clientObj.tipoIdentificacion,
        identificacion: clientObj.identificacion,
        direccion: clientObj.direccion,
        email: clientObj.mail
      },
      items: xmlItems
    });

    const { xml: xmlUnsigned, claveAcceso } = xmlGen;

    invoice = await db.invoice.update({
      where: { id: invoice.id },
      data: { claveAcceso, xmlNoFirmado: xmlUnsigned }
    });

    // 6. Sign Document
    const signResult = signDocument(xmlUnsigned, issuer.firmaElectronica || "", issuer.codigoSri || "");
    if (!signResult.success || !signResult.xmlSigned || !signResult.xmlSignedBase64) {
      await db.invoice.update({
        where: { id: invoice.id },
        data: { estado: "RECHAZADA" }
      });
      return res.redirect(`/dashboard/profesional?tab=facturacion&error=signature_failed`);
    }

    // 7. Validate Receipt
    const recepcionResponse = await sriClient.validarComprobante(signResult.xmlSignedBase64, issuer.ambiente);
    if (recepcionResponse.estado === "DEVUELTA" || recepcionResponse.estado === "ERROR") {
      await db.invoice.update({
        where: { id: invoice.id },
        data: { estado: "DEVUELTA" }
      });
      return res.redirect(`/dashboard/profesional?tab=facturacion&error=sri_rejection`);
    }

    invoice = await db.invoice.update({
      where: { id: invoice.id },
      data: { estado: "RECIBIDA" }
    });

    // 8. Consult Authorization
    let autorizacionResponse = null;
    for (let intento = 1; intento <= 3; intento++) {
      await new Promise((res) => setTimeout(res, 2000));
      autorizacionResponse = await sriClient.autorizacionComprobante(claveAcceso, issuer.ambiente);
      if (autorizacionResponse.estado === "AUTORIZADO" || autorizacionResponse.estado === "NO AUTORIZADO") {
        break;
      }
    }

    const nextStartSecuencial = String(nextSecNum + 1).padStart(9, "0");
    await db.issuer.update({
      where: { id: issuer.id },
      data: { startSecuencial: nextStartSecuencial }
    });

    if (!autorizacionResponse || autorizacionResponse.estado !== "AUTORIZADO") {
      return res.redirect(`/dashboard/profesional?tab=facturacion&warning=sri_pending`);
    }

    // 9. Fully Authorized! Build RIDE PDF and save
    const xmlAutorizadoStr = autorizacionResponse.comprobanteXml || signResult.xmlSigned;

    const formaPagoMap: { [key: string]: string } = {
      "01": "SIN UTILIZACION DEL SISTEMA FINANCIERO",
      "20": "OTROS CON UTILIZACION DEL SISTEMA FINANCIERO",
      "19": "TARJETA DE CREDITO",
      "16": "TARJETA DE DEBITO"
    };

    const formattedItems = xmlItems.map(item => ({
      codigoPrincipal: item.codigoPrincipal,
      nombre: item.nombre,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      descuento: item.descuento,
      total: item.precioUnitario * item.cantidad * 1.12
    }));

    const d = invoice.fechaEmision;
    const fechaEmisionFormatted = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

    const pdfBuffer = await generateRidePdf({
      secuencial,
      establecimiento: issuer.establecimiento,
      puntoEmision: issuer.puntoEmision,
      claveAcceso,
      numeroAutorizacion: autorizacionResponse.numeroAutorizacion,
      fechaAutorizacion: autorizacionResponse.fechaAutorizacion,
      ambiente: issuer.ambiente,
      tipoEmision: "1",
      fechaEmision: fechaEmisionFormatted,
      formaPagoText: formaPagoMap[formaPago] || "SIN UTILIZACION DEL SISTEMA FINANCIERO",
      subtotal0,
      subtotalIva,
      valorIva,
      ivaPercentage: 12,
      total,
      emisor: {
        ruc: issuer.ruc,
        razonSocial: issuer.razonSocial,
        nombreComercial: issuer.nombreEmpresa,
        direccionMatriz: issuer.direccion,
        direccionEstablecimiento: issuer.direccion,
        obligadoContabilidad: issuer.obligadoContabilidad,
        regimen: issuer.regimen,
        logo: issuer.logo
      },
      comprador: {
        nombres: clientObj.nombres,
        identificacion: clientObj.identificacion,
        tipoIdentificacion: clientObj.tipoIdentificacion,
        direccion: clientObj.direccion,
        email: clientObj.mail
      },
      items: formattedItems
    });

    const pdfBase64 = pdfBuffer.toString("base64");

    await db.invoice.update({
      where: { id: invoice.id },
      data: {
        estado: "AUTORIZADA",
        xmlAutorizado: xmlAutorizadoStr,
        pdfRIDE: pdfBase64
      }
    });

    // Incrementar contador de consumo únicamente al estar AUTORIZADA
    await InvoiceLimitService.incrementInvoiceCounter(profile.id);

    // Send email to client
    const invoiceNumber = `${issuer.establecimiento}-${issuer.puntoEmision}-${secuencial}`;
    emailService.sendInvoice(
      clientObj.mail,
      {
        invoiceNumber,
        xmlContent: xmlAutorizadoStr,
        pdfBuffer: pdfBuffer,
        businessName: issuer.nombreEmpresa || issuer.razonSocial,
        customerName: clientObj.nombres,
      },
      {
        attachments: [
          {
            filename: `Factura_${invoiceNumber}.pdf`,
            content: pdfBuffer.toString("base64"),
          },
          {
            filename: `Factura_${invoiceNumber}.xml`,
            content: Buffer.from(xmlAutorizadoStr).toString("base64"),
          },
        ],
      }
    ).catch(e => console.warn("Email billing warning:", e));

    res.redirect("/dashboard/profesional?tab=facturacion&success=invoice_authorized");
  } catch (error) {
    console.error("Error in emit invoice:", error);
    res.redirect("/dashboard/profesional?tab=facturacion&error=internal_invoice_error");
  }
});

// GET Download XML Invoice
router.get("/dashboard/profesional/facturacion/descargar-xml/:id", requireProfessional, async (req: Request, res: Response) => {
  const invoiceId = parseInt(req.params.id as string);
  try {
    const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice || !invoice.xmlAutorizado) {
      return res.status(404).send("XML no encontrado");
    }

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Content-Disposition", `attachment; filename=Factura_${invoice.secuencial}.xml`);
    res.send(invoice.xmlAutorizado);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error del servidor");
  }
});

// GET Download PDF RIDE Invoice
router.get("/dashboard/profesional/facturacion/descargar-pdf/:id", requireProfessional, async (req: Request, res: Response) => {
  const invoiceId = parseInt(req.params.id as string);
  try {
    const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice || !invoice.pdfRIDE) {
      return res.status(404).send("PDF no encontrado");
    }

    const pdfBuffer = Buffer.from(invoice.pdfRIDE, "base64");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Factura_${invoice.secuencial}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error del servidor");
  }
});

// POST Manual Re-query SRI Invoice status
router.post("/dashboard/profesional/facturacion/consultar/:id", requireProfessional, async (req: Request, res: Response) => {
  const invoiceId = parseInt(req.params.id as string);
  try {
    let invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: true, issuer: true }
    });

    if (!invoice || !invoice.claveAcceso || !invoice.issuer) {
      return res.redirect("/dashboard/profesional?tab=facturacion&error=invoice_invalid");
    }

    const autorizacionResponse = await sriClient.autorizacionComprobante(invoice.claveAcceso, invoice.issuer.ambiente);
    if (autorizacionResponse.estado !== "AUTORIZADO") {
      return res.redirect(`/dashboard/profesional?tab=facturacion&warning=still_pending&msg=${encodeURIComponent(autorizacionResponse.estado)}`);
    }

    const xmlAutorizadoStr = autorizacionResponse.comprobanteXml || invoice.xmlNoFirmado || "";

    // Recalculate PDF RIDE
    const formaPagoMap: { [key: string]: string } = {
      "01": "SIN UTILIZACION DEL SISTEMA FINANCIERO",
      "20": "OTROS CON UTILIZACION DEL SISTEMA FINANCIERO",
      "19": "TARJETA DE CREDITO",
      "16": "TARJETA DE DEBITO"
    };

    // Mapeo items
    const invoiceWithItems = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: { include: { product: true } } }
    });

    const formattedItems = (invoiceWithItems?.items || []).map(item => ({
      codigoPrincipal: item.product.codigoPrincipal,
      nombre: item.product.nombre,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      descuento: item.descuento,
      total: item.total
    }));

    const d = invoice.fechaEmision;
    const fechaEmisionFormatted = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

    const pdfBuffer = await generateRidePdf({
      secuencial: invoice.secuencial,
      establecimiento: invoice.issuer.establecimiento,
      puntoEmision: invoice.issuer.puntoEmision,
      claveAcceso: invoice.claveAcceso,
      numeroAutorizacion: autorizacionResponse.numeroAutorizacion,
      fechaAutorizacion: autorizacionResponse.fechaAutorizacion,
      ambiente: invoice.issuer.ambiente,
      tipoEmision: "1",
      fechaEmision: fechaEmisionFormatted,
      formaPagoText: formaPagoMap[invoice.formaPago] || "SIN UTILIZACION DEL SISTEMA FINANCIERO",
      subtotal0: invoice.subtotal0,
      subtotalIva: invoice.subtotalIva,
      valorIva: invoice.valorIva,
      ivaPercentage: 12,
      total: invoice.total,
      emisor: {
        ruc: invoice.issuer.ruc,
        razonSocial: invoice.issuer.razonSocial,
        nombreComercial: invoice.issuer.nombreEmpresa,
        direccionMatriz: invoice.issuer.direccion,
        direccionEstablecimiento: invoice.issuer.direccion,
        obligadoContabilidad: invoice.issuer.obligadoContabilidad,
        regimen: invoice.issuer.regimen,
        logo: invoice.issuer.logo
      },
      comprador: {
        nombres: invoice.client.nombres,
        identificacion: invoice.client.identificacion,
        tipoIdentificacion: invoice.client.tipoIdentificacion,
        direccion: invoice.client.direccion,
        email: invoice.client.mail
      },
      items: formattedItems
    });

    const pdfBase64 = pdfBuffer.toString("base64");

    await db.invoice.update({
      where: { id: invoice.id },
      data: {
        estado: "AUTORIZADA",
        xmlAutorizado: xmlAutorizadoStr,
        pdfRIDE: pdfBase64
      }
    });

    res.redirect("/dashboard/profesional?tab=facturacion&success=invoice_queried");
  } catch (error) {
    console.error(error);
    res.redirect("/dashboard/profesional?tab=facturacion&error=query_failed");
  }
});

// POST Route: Update certificate default name configuration for Professional
router.post("/dashboard/profesional/configurar-nombre", requireProfessional, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { nombreCertificado } = req.body;

  if (!nombreCertificado || nombreCertificado.trim() === "") {
    return res.status(400).json({ success: false, error: "El nombre no puede estar vacío." });
  }

  try {
    const dbUser = await db.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      return res.status(404).json({ success: false, error: "Usuario no encontrado." });
    }

    const now = new Date();
    if (dbUser.lastCertNameUpdate) {
      const lastUpdate = new Date(dbUser.lastCertNameUpdate);
      const msPerDay = 24 * 60 * 60 * 1000;
      const diffDays = (now.getTime() - lastUpdate.getTime()) / msPerDay;
      if (diffDays < 60) {
        const daysRemaining = Math.ceil(60 - diffDays);
        return res.status(400).json({
          success: false,
          error: `Solo puedes cambiar el nombre de tus certificados una vez cada 60 días. Faltan ${daysRemaining} días.`
        });
      }
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        nombreCertificado: toTitleCase(nombreCertificado),
        lastCertNameUpdate: now
      }
    });

    await db.certificate.updateMany({
      where: { userId: user.id },
      data: { nombreUsuario: toTitleCase(nombreCertificado) }
    });

    return res.json({ success: true, message: "Nombre de certificado actualizado correctamente." });
  } catch (error) {
    console.error("Error updating certificate name for professional:", error);
    return res.status(500).json({ success: false, error: "Error interno al actualizar el nombre del certificado." });
  }
});

// -------------------------------------------------------------
export default router;
