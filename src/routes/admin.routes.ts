import express, { Request, Response, NextFunction } from "express";
import fs from "fs";
import { execFileSync } from "child_process";
import path from "path";
import { db } from "../lib/db";
import { hashPassword, createAuthSession } from "../lib/auth";
import { generateInvoiceXml } from "../lib/sri/xml-generator";
import { signDocument } from "../lib/sri/sri-signer";
import { SriClient } from "../lib/sri/sri-client";
import { generateRidePdf } from "../lib/sri/ride-generator";
import imageSize from "image-size";
import puppeteer, { type Browser } from "puppeteer";
import { emailService, sendCredentialsEmail } from "../lib/email";
import { uploadBase64ToCloudinary, uploadBase64ToCloudinaryWithPublicId } from "../lib/cloudinary";
import {
  buildBankAccountSnapshot,
  findActiveBankAccountById,
  formatBankAccountLabel,
  getActiveBankAccounts,
  parseSubmittedBankAccountId,
} from "../lib/bank-accounts";
import { toTitleCase } from "../lib/utils";
import { requireAdmin, requireProfessional, requireClient } from "../lib/middlewares";
import { getUniqueSlug, generateSlug } from "../lib/slug";
import { cachedFetch, cacheKeyFactory as cacheKey, getRedis, invalidateCache } from "../lib/cache";
import { StudentService } from "../services/student.service";
import { processPdfArticle } from "./professional.routes";
import { AdminUsersController } from "../controllers/admin/admin-users.controller";

const router = express.Router();

// Admin User Management API Routes
router.get("/api/admin/users", requireAdmin, AdminUsersController.getPaginatedUsers);
router.post("/api/admin/users/status", requireAdmin, AdminUsersController.updateUserStatus);
router.post("/api/admin/users/approve-professional", requireAdmin, AdminUsersController.approveProfessionalProfile);
const sriClient = new SriClient();
const ALLOWED_SPEAKER_RESOURCE_TYPES = new Set(["pdf", "xlsx", "csv", "docx", "pptx", "jpg", "jpeg", "png", "link"]);
const MAX_SPEAKER_RESOURCE_SIZE = 10 * 1024 * 1024;
const MAX_BANK_QR_SIZE = 3 * 1024 * 1024;
const BANK_ACCOUNT_TYPES = new Set(["normal", "qr"]);
const NORMAL_BANK_ACCOUNT_TYPES = new Set(["Ahorros", "Corriente"]);
const CERTIFICATE_PDF_SIZE = {
  width: "1100px",
  height: "770px"
} as const;

const CONVERSATORIO_ESTADO = {
  PROGRAMADO: "PROGRAMADO",
  ACTIVO: "ACTIVO",
  FINALIZADO: "FINALIZADO"
} as const;

type ConversatorioEstado = (typeof CONVERSATORIO_ESTADO)[keyof typeof CONVERSATORIO_ESTADO];

interface ScopedAgreementInput {
  titulo: string;
  categoria: string;
  descripcion: string | null;
  link: string | null;
  orden: number;
  logo: string | null;
}

interface BankAccountInput {
  type: string;
  institution: string;
  accountType: string | null;
  accountNumber: string | null;
  taxId: string | null;
  beneficiaryName: string | null;
  isActive: boolean;
}

function getConversatorioEstado(value: unknown): ConversatorioEstado {
  const estados = Object.values(CONVERSATORIO_ESTADO);
  return typeof value === "string" && estados.includes(value as ConversatorioEstado)
    ? (value as ConversatorioEstado)
    : CONVERSATORIO_ESTADO.ACTIVO;
}

const getSystemConfig = () =>
  cachedFetch(cacheKey.systemConfig.singleton(), () =>
    db.systemConfig.findUnique({ where: { id: 1 } })
  );

const getAllAgreements = () =>
  cachedFetch(cacheKey.agreement.all(), () =>
    db.agreement.findMany({ where: { conversatorioId: null }, orderBy: { orden: "asc" } })
  );

const getAllHeroCarousels = () =>
  cachedFetch(cacheKey.heroCarousel.all(), () =>
    db.heroCarousel.findMany({ orderBy: { orden: "asc" } })
  );

const getAllProfessions = () =>
  cachedFetch(cacheKey.profession.all(), () =>
    db.profession.findMany({ include: { specialties: true }, orderBy: { orden: "asc" } })
  );

const getMembershipPlans = () =>
  cachedFetch(cacheKey.membershipPlan.all(), () =>
    db.membershipPlan.findMany({ orderBy: { precio: "asc" } })
  );

const getPromotionPlans = () =>
  cachedFetch(cacheKey.promotionPlan.all(), () =>
    db.promotionPlan.findMany({ orderBy: { precio: "asc" } })
  );

const getProfileTemplates = () =>
  cachedFetch(cacheKey.profileTemplate.all(), () =>
    db.profileTemplate.findMany({ orderBy: { createdAt: "asc" } })
  );

const getEditablePages = () =>
  cachedFetch(cacheKey.editablePage.all(), () => db.editablePage.findMany());

const getEditablePageBySlug = (slug: string) =>
  cachedFetch(cacheKey.editablePage.bySlug(slug), () =>
    db.editablePage.findUnique({ where: { slug } })
  );

const getProfileTemplateById = (id: number) =>
  cachedFetch(cacheKey.profileTemplate.byId(id), () =>
    db.profileTemplate.findUnique({ where: { id } })
  );

const getProfileTemplateByKey = (key: string) =>
  cachedFetch(cacheKey.profileTemplate.byKey(key), () =>
    db.profileTemplate.findUnique({ where: { key } })
  );

const getRoleByName = (name: string) =>
  cachedFetch(cacheKey.role.byName(name), () => db.role.findUnique({ where: { name } }));

function getSafeQueryString(value: unknown, maxLength = 120): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ").slice(0, maxLength).trim();
}

function normalizeOptionalEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const email = value.trim().toLowerCase();
  return email.length > 0 ? email : null;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getPositiveParamId(value: unknown): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeSpeakerResourceType(value: unknown, fallback = "link"): string {
  const type = typeof value === "string" ? value.trim().toLowerCase().replace(/^\./, "") : fallback;
  return ALLOWED_SPEAKER_RESOURCE_TYPES.has(type) ? type : "";
}

function getBase64PayloadSize(value: string): number {
  const base64 = value.includes(",") ? value.split(",").pop() || "" : value;
  const padding = (base64.match(/=+$/)?.[0].length || 0);
  return Math.floor((base64.length * 3) / 4) - padding;
}

function getBankAccountLabel(account: {
  type: string;
  institution: string;
  accountType?: string | null;
  accountNumber?: string | null;
  taxId?: string | null;
  beneficiaryName?: string | null;
}): string {
  if (account.type === "qr") {
    return `${account.institution} - QR`;
  }

  return [account.institution, account.accountType, account.accountNumber, account.taxId ? `RUC/Cédula: ${account.taxId}` : null, account.beneficiaryName ? `Beneficiario: ${account.beneficiaryName}` : null]
    .filter(Boolean)
    .join(" - ");
}

function getPaymentBankLabel(payment: {
  bankAccountLabel?: string | null;
  bankAccountSnapshot?: unknown;
  bancoDestino?: string | null;
}, legacyBankAccounts?: string | null): string {
  if (payment.bankAccountLabel) return payment.bankAccountLabel;

  if (payment.bankAccountSnapshot && typeof payment.bankAccountSnapshot === "object") {
    const snapshot = payment.bankAccountSnapshot as Record<string, unknown>;
    const institution = typeof snapshot.institution === "string" ? snapshot.institution : "";
    if (institution) {
      return getBankAccountLabel({
        type: typeof snapshot.type === "string" ? snapshot.type : "normal",
        institution,
        accountType: typeof snapshot.accountType === "string" ? snapshot.accountType : null,
        accountNumber: typeof snapshot.accountNumber === "string" ? snapshot.accountNumber : null,
        taxId: typeof snapshot.taxId === "string" ? snapshot.taxId : null,
        beneficiaryName: typeof snapshot.beneficiaryName === "string" ? snapshot.beneficiaryName : null
      });
    }
  }

  return payment.bancoDestino || legacyBankAccounts || "Transferencia";
}

function normalizeBankAccountInput(body: Record<string, unknown>, existingQrImageUrl?: string | null): { data?: BankAccountInput; qrImage: string; error?: string } {
  const type = normalizeTextField(body.type, 20).toLowerCase();
  const institution = normalizeTextField(body.institution, 120);
  const rawAccountType = normalizeTextField(body.accountType, 20);
  const accountType = rawAccountType ? toTitleCase(rawAccountType) : "";
  const accountNumber = normalizeTextField(body.accountNumber, 40).replace(/\s+/g, "");
  const taxId = normalizeTextField(body.taxId, 13).replace(/\s+/g, "");
  const beneficiaryName = normalizeTextField(body.beneficiaryName, 120);
  const qrImage = normalizeTextField(body.qrImage, 10 * 1024 * 1024);
  const isActive = normalizeBooleanField(body.isActive, true);

  if (!BANK_ACCOUNT_TYPES.has(type)) {
    return { qrImage, error: "Tipo de cuenta inválido." };
  }
  if (!institution) {
    return { qrImage, error: "La institución financiera es obligatoria." };
  }

  if (type === "normal") {
    if (!NORMAL_BANK_ACCOUNT_TYPES.has(accountType)) {
      return { qrImage, error: "El tipo de cuenta debe ser Ahorros o Corriente." };
    }
    if (!/^\d+$/.test(accountNumber)) {
      return { qrImage, error: "El número de cuenta debe contener solo dígitos." };
    }
    if (!/^\d+$/.test(taxId)) {
      return { qrImage, error: "El RUC o cédula debe contener solo dígitos." };
    }
    if (!beneficiaryName) {
      return { qrImage, error: "El beneficiario es obligatorio para cuentas normales." };
    }

    return {
      qrImage,
      data: { type, institution, accountType, accountNumber, taxId, beneficiaryName, isActive }
    };
  }

  if (!existingQrImageUrl && !qrImage) {
    return { qrImage, error: "La imagen QR es obligatoria para cuentas QR." };
  }
  if (qrImage) {
    if (!qrImage.startsWith("data:image/png") && !qrImage.startsWith("data:image/jpeg") && !qrImage.startsWith("data:image/webp")) {
      return { qrImage, error: "El QR debe ser una imagen PNG, JPG o WEBP." };
    }
    if (getBase64PayloadSize(qrImage) > MAX_BANK_QR_SIZE) {
      return { qrImage, error: "La imagen QR no puede superar 3MB." };
    }
  }

  return {
    qrImage,
    data: { type, institution, accountType: null, accountNumber: null, taxId: null, beneficiaryName: null, isActive }
  };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getPositiveBodyId(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const id = typeof value === "number" ? value : Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeTextField(value: unknown, maxLength: number): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function normalizeBooleanField(value: unknown, defaultValue: boolean): boolean {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  return value === true || value === "true" || value === "on" || value === 1 || value === "1";
}

function isYouTubeUrlValue(value: unknown): boolean {
  if (typeof value !== "string" || value.trim().length === 0) {
    return false;
  }

  try {
    const parsedUrl = new URL(value);
    const host = parsedUrl.hostname.toLowerCase();
    return host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be" || host.endsWith(".youtu.be");
  } catch {
    return /(?:youtube\.com|youtu\.be)/i.test(value);
  }
}

function isPremiumPlanType(value: unknown): boolean {
  return typeof value === "string" && value.trim().toUpperCase() === "PREMIUM";
}

function stripEditableVideoUrlsForInitialAdmin(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => stripEditableVideoUrlsForInitialAdmin(item));
  }

  if (value === null || typeof value !== "object" || value instanceof Date) {
    return value;
  }

  const source = value as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  Object.entries(source).forEach(([key, childValue]) => {
    if (key === "youtube" || key === "videoUrl") {
      return;
    }

    if (key === "mediaUrl" && (source.mediaType === "video" || isYouTubeUrlValue(childValue))) {
      return;
    }

    if (key === "banner" && isYouTubeUrlValue(childValue)) {
      return;
    }

    sanitized[key] = stripEditableVideoUrlsForInitialAdmin(childValue);
  });

  return sanitized;
}

// ADMIN DASHBOARD ROUTES
// -------------------------------------------------------------

// GET Admin Dashboard
router.get("/dashboard/admin", requireAdmin, async (req: Request, res: Response) => {
  try {
    // 1. Fetch Stats
    const totalProfessionals = await db.professionalProfile.count();
    const pendingProfessionalsCount = await db.professionalProfile.count({ where: { status: "PENDIENTE" } });
    const totalClients = await db.user.count({ where: { role: { name: "CLIENT" } } });
    const totalAgreements = await db.agreement.count({ where: { conversatorioId: null } });
    const totalInvoices = await db.invoice.count();
    const activeConversatorios = await db.conversatorio.count({ where: { estado: "ACTIVO" } });
    const activeCursos = await db.curso.count({ where: { estado: "ACTIVO" } });
    const totalArticles = await db.article.count();
    const totalAppointments = await db.appointment.count();

    // 2. Fetch Lists
    const pendingProfessionals = await db.professionalProfile.findMany({
      where: { status: "PENDIENTE" },
      include: { user: true }
    });

    const allProfessionals = await db.professionalProfile.findMany({
      include: {
        user: true,
        services: true,
        schedules: true,
        articles: true,
        issuer: true,
        billingSubscriptions: {
          include: { plan: true }
        },
        specialties: {
          include: { specialty: true }
        }
      }
    });

    const agreements = await getAllAgreements();

    const carousels = await getAllHeroCarousels();

    const professions = await getAllProfessions();

    const allArticles = await db.article.findMany({
      include: {
        profile: {
          include: { user: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    let systemConfig = await getSystemConfig();
    if (!systemConfig) {
      systemConfig = await db.systemConfig.create({
        data: {
          id: 1,
          adminPassword: "admin1234",
          systemName: "Profesionales Ecuador",
          metaDescription: "Directorio profesional, agendamiento de citas y facturación."
        }
      });
    }

    const conversatorios = await db.conversatorio.findMany({
      include: {
        speakers: { include: { resources: { orderBy: { createdAt: "asc" } } } },
        itinerary: true,
        certificateDesign: true,
        agreements: { orderBy: { orden: "asc" } },
        qas: {
          include: {
            speaker: { select: { id: true, nombre: true, tema: true, profesion: true } },
            user: { select: { id: true, name: true, email: true } }
          },
          orderBy: [{ orden: "asc" }, { id: "asc" }]
        }
      },
      orderBy: { fechaInicio: "asc" }
    });

    const cursos = await db.curso.findMany({
      include: {
        speakers: true,
        itinerary: true,
        certificateDesign: true,
        discounts: true,
        modules: {
          orderBy: { orden: "asc" },
          include: {
            lessons: {
              orderBy: { orden: "asc" },
              include: { resources: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const plans = await getMembershipPlans();

    const promotionPlans = await getPromotionPlans();

    const templates = await getProfileTemplates();

    const paymentRequests = await db.paymentRequest.findMany({
      include: {
        issuer: {
          include: {
            professionalProfile: {
              include: {
                user: true
              }
            }
          }
        },
        certificate: {
          include: {
            user: true,
            conversatorio: true,
            curso: true
          }
        },
        promotion: {
          include: {
            plan: true,
            profile: {
              include: {
                user: true
              }
            }
          }
        }
      },
      orderBy: { fechaSolicitud: "desc" }
    });
    const bankAccounts = await db.bankAccount.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }]
    });
    const pages = await getEditablePages();
    const contactMessages = await db.contactMessage.findMany({
      orderBy: { fecha: "desc" }
    });

    // Referrals Data for Admin Dashboard Tab
    const referralProfiles = await db.referralProfile.findMany({
      include: {
        user: true,
        wallet: true,
        _count: { select: { sales: true, withdrawals: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const referralSales = await db.referralSale.findMany({
      include: {
        referral: { include: { user: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const commissionConfigs = await db.commissionConfig.findMany({
      orderBy: [{ isGeneral: "desc" }, { createdAt: "desc" }],
    });

    const referralWithdrawals = await db.referralWithdrawal.findMany({
      include: {
        referral: { include: { user: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Students Data, Universities, and Role Transition Requests
    const studentsList = await StudentService.getStudentsListForAdmin();
    const universities = await db.university.findMany({
      orderBy: [{ orden: "asc" }, { nombre: "asc" }]
    });
    const roleTransitionRequests = await db.roleTransitionRequest.findMany({
      include: {
        user: { include: { role: true } },
      },
      orderBy: { fechaSolicitud: "desc" },
    });

    const clientRole = await getRoleByName("CLIENT");
    const clientUsers = clientRole
      ? await db.user.findMany({
        // @ts-ignore
        where: { roleId: clientRole.id },
        include: { role: true },
        orderBy: { createdAt: "desc" }
      })
      : [];
    const allRoles = await db.role.findMany({ orderBy: { id: "asc" } });

    const billingPlans = await db.billingPlan.findMany({
      orderBy: { precio: "asc" }
    });

    const billingSubscriptions = await db.billingSubscription.findMany({
      include: {
        profile: { include: { user: true } },
        plan: true
      },
      orderBy: { createdAt: "desc" }
    });

    const ponentesCount = await db.professionalProfile.count({ where: { isPonente: true } });
    const benefits = await db.benefit.findMany({ orderBy: { orden: "asc" } });

    res.render("dashboard-admin", {
      title: "Panel de Administración",
      activePage: "admin",
      stats: {
        totalProfessionals,
        pendingProfessionalsCount,
        totalClients,
        totalAgreements,
        totalInvoices,
        activeConversatorios,
        activeCursos,
        totalArticles,
        totalAppointments,
        totalReferrers: referralProfiles.length,
        // @ts-ignore
        pendingReferralSales: referralSales.filter(s => s.estado === 'PENDIENTE').length,
        // @ts-ignore
        pendingWithdrawals: referralWithdrawals.filter(w => w.estado === 'PENDIENTE').length,
        totalStudents: studentsList.length,
        // @ts-ignore
        pendingRoleTransitions: roleTransitionRequests.filter(r => r.estado === 'PENDIENTE').length,
        totalBillingPlans: billingPlans.length,
        activeBillingSubscriptions: billingSubscriptions.filter(s => s.status === 'ACTIVO').length,
        ponentesCount,
        totalBenefits: benefits.length
      },
      pendingProfessionals,
      allProfessionals,
      clientUsers,
      allRoles,
      availableRoles: allRoles,
      agreements,
      benefits,
      carousels,
      professions,
      allArticles,
      systemConfig,
      conversatorios,
      cursos,
      adminInitialConversatorios: stripEditableVideoUrlsForInitialAdmin(conversatorios),
      adminInitialCursos: stripEditableVideoUrlsForInitialAdmin(cursos),
      plans,
      promotionPlans,
      paymentRequests,
      bankAccounts,
      templates,
      pages,
      contactMessages,
      referralProfiles,
      referralSales,
      commissionConfigs,
      referralWithdrawals,
      studentsList,
      universities,
      roleTransitionRequests,
      billingPlans,
      billingSubscriptions,
      ponentesCount,
      bunnyStreamLibraryId: process.env.BUNNY_STREAM_LIBRARY_ID || null
    });
  } catch (error) {
    console.error("Error loading admin dashboard:", error);
    res.redirect("/?error=db_error");
  }
});

// POST Mark Contact Message as Read
router.post("/dashboard/admin/mensajes/read/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  try {
    await db.contactMessage.update({
      where: { id },
      data: { leido: true }
    });
    res.redirect("/dashboard/admin?tab=messages&success=message_read");
  } catch (error) {
    console.error("Error marking contact message as read:", error);
    res.redirect("/dashboard/admin?tab=messages&error=action_failed");
  }
});

// POST Delete Contact Message
router.post("/dashboard/admin/mensajes/delete/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  try {
    await db.contactMessage.delete({
      where: { id }
    });
    res.redirect("/dashboard/admin?tab=messages&success=message_deleted");
  } catch (error) {
    console.error("Error deleting contact message:", error);
    res.redirect("/dashboard/admin?tab=messages&error=action_failed");
  }
});

// POST Approve Professional
router.post("/dashboard/admin/approve/:id", requireAdmin, async (req: Request, res: Response) => {
  const profileId = parseInt(req.params.id as string);
  try {
    const currentProfile = await db.professionalProfile.findUnique({
      where: { id: profileId },
      select: { planType: true }
    });

    const updateData: { status: string; subscriptionEnds: Date; verified?: boolean } = {
      status: "APROBADO",
      subscriptionEnds: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    };

    if (isPremiumPlanType(currentProfile?.planType)) {
      updateData.verified = true;
    }

    const professional = await db.professionalProfile.update({
      where: { id: profileId },
      data: updateData,
      include: { user: true }
    });

    emailService.sendProfessionalApproved(professional.user.email, {
      recipientName: professional.user.name,
      professionalName: professional.user.name,
      professionalId: professional.id,
      publicProfileUrl: professional.slug
        ? `${process.env.BASE_URL || "http://localhost:3000"}/directorio/${professional.slug}`
        : undefined,
    }).catch((err) => console.warn("Error enviando email de aprobacion:", err));

    res.redirect("/dashboard/admin?tab=professionals");
  } catch (error) {
    console.error("Error approving professional profile:", error);
    res.redirect("/dashboard/admin?tab=professionals&error=approve_failed");
  }
});

// POST Reject Professional
router.post("/dashboard/admin/reject/:id", requireAdmin, async (req: Request, res: Response) => {
  const profileId = parseInt(req.params.id as string);
  try {
    const professional = await db.professionalProfile.update({
      where: { id: profileId },
      data: { status: "RECHAZADO" },
      include: { user: true }
    });

    emailService.sendProfessionalRejected(professional.user.email, {
      recipientName: professional.user.name,
      professionalName: professional.user.name,
      supportEmail: process.env.SUPPORT_EMAIL || "soporte@profesionales.ec",
    }).catch((err) => console.warn("Error enviando email de rechazo:", err));

    res.redirect("/dashboard/admin?tab=professionals");
  } catch (error) {
    console.error("Error rejecting professional profile:", error);
    res.redirect("/dashboard/admin?tab=professionals&error=reject_failed");
  }
});

// POST Toggle Verified Badge
router.post("/dashboard/admin/verify/:id", requireAdmin, async (req: Request, res: Response) => {
  const profileId = parseInt(req.params.id as string);
  try {
    const profile = await db.professionalProfile.findUnique({
      where: { id: profileId }
    });
    if (profile) {
      await db.professionalProfile.update({
        where: { id: profileId },
        data: { verified: !profile.verified }
      });
    }
    res.redirect("/dashboard/admin?tab=professionals");
  } catch (error) {
    console.error("Error toggling verification:", error);
    res.redirect("/dashboard/admin?tab=professionals&error=verify_failed");
  }
});

// POST Add/Update Profession
router.post("/dashboard/admin/professions", requireAdmin, async (req: Request, res: Response) => {
  const { id, nombre, descripcion, imagen } = req.body;
  try {
    if (id) {
      await db.profession.update({
        where: { id: parseInt(id) },
        data: {
          nombre,
          descripcion,
          imagen: imagen || null
        }
      });
    } else {
      await db.profession.create({
        data: {
          nombre,
          descripcion,
          imagen: imagen || null,
          orden: 0
        }
      });
    }
    res.redirect("/dashboard/admin?tab=catalogs&success=profession_saved");
  } catch (error) {
    console.error("Error saving profession:", error);
    res.redirect("/dashboard/admin?tab=catalogs&error=profession_failed");
  }
});

// POST Delete Profession
router.post("/dashboard/admin/professions/delete/:id", requireAdmin, async (req: Request, res: Response) => {
  const professionId = parseInt(req.params.id as string);
  try {
    await db.profession.delete({
      where: { id: professionId }
    });
    res.redirect("/dashboard/admin?tab=catalogs&success=profession_deleted");
  } catch (error) {
    console.error("Error deleting profession:", error);
    res.redirect("/dashboard/admin?tab=catalogs&error=delete_profession_failed");
  }
});

// POST Add/Update Specialty
router.post("/dashboard/admin/specialties", requireAdmin, async (req: Request, res: Response) => {
  const { id, professionId, nombre, descripcion } = req.body;
  try {
    if (id) {
      await db.specialty.update({
        where: { id: parseInt(id) },
        data: {
          professionId: parseInt(professionId),
          nombre,
          descripcion
        }
      });
    } else {
      await db.specialty.create({
        data: {
          professionId: parseInt(professionId),
          nombre,
          descripcion,
          orden: 0
        }
      });
    }
    res.redirect("/dashboard/admin?tab=catalogs&success=specialty_saved");
  } catch (error) {
    console.error("Error saving specialty:", error);
    res.redirect("/dashboard/admin?tab=catalogs&error=specialty_failed");
  }
});

// POST Delete Specialty
router.post("/dashboard/admin/specialties/delete/:id", requireAdmin, async (req: Request, res: Response) => {
  const specialtyId = parseInt(req.params.id as string);
  try {
    await db.specialty.delete({
      where: { id: specialtyId }
    });
    res.redirect("/dashboard/admin?tab=catalogs&success=specialty_deleted");
  } catch (error) {
    console.error("Error deleting specialty:", error);
    res.redirect("/dashboard/admin?tab=catalogs&error=delete_specialty_failed");
  }
});

// POST Add or Update Agreement
router.post("/dashboard/admin/agreements", requireAdmin, async (req: Request, res: Response) => {
  const { id, titulo, categoria, descripcion, link, orden, logo } = req.body;
  try {
    let logoUrl = logo || "";
    if (logo && logo.startsWith("data:image")) {
      try {
        // Validar tamaño mínimo de ancho (diámetro del círculo en home)
        const MIN_WIDTH = 112; // w-28 = 7rem = 112px
        const base64Data = logo.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");
        const dimensions = imageSize(buffer);

        if (!dimensions.width || dimensions.width < MIN_WIDTH) {
          return res.redirect(
            `/dashboard/admin?tab=agreements&error=agreement_image_too_small&msg=${encodeURIComponent(
              `La imagen debe tener un ancho mínimo de ${MIN_WIDTH}px. Tu imagen tiene ${dimensions.width || 0}px.`
            )}`
          );
        }

        logoUrl = await uploadBase64ToCloudinary(logo, "convenios");
      } catch (uploadErr) {
        console.error("Error uploading logo to Cloudinary:", uploadErr);
      }
    }

    const payload: any = {
      titulo,
      categoria,
      descripcion,
      link: link || null,
      orden: parseInt(orden || 0),
      logo: logoUrl,
      conversatorioId: null
    };

    if (id) {
      await db.agreement.updateMany({
        where: { id: parseInt(id), conversatorioId: null },
        data: payload
      });
    } else {
      await db.agreement.create({
        data: payload
      });
    }
    res.redirect("/dashboard/admin?tab=agreements&success=agreement_saved");
  } catch (error) {
    console.error("Error saving agreement:", error);
    res.redirect("/dashboard/admin?tab=agreements&error=agreement_failed");
  }
});

// POST Delete Agreement
router.post("/dashboard/admin/agreements/delete/:id", requireAdmin, async (req: Request, res: Response) => {
  const agreementId = parseInt(req.params.id as string);
  try {
    await db.agreement.deleteMany({
      where: { id: agreementId, conversatorioId: null }
    });
    res.redirect("/dashboard/admin?tab=agreements");
  } catch (error) {
    console.error("Error deleting agreement:", error);
    res.redirect("/dashboard/admin?tab=agreements&error=agreement_delete_failed");
  }
});

// POST Create or Update Carousel Slider Item
router.post("/dashboard/admin/carousels", requireAdmin, async (req: Request, res: Response) => {
  const { id, tipo, profesionId, titulo, subtitulo, imageUrl, link, orden, activo } = req.body;
  try {
    const payload = {
      tipo: tipo || "Inicio",
      profesionId: (tipo === "Profesion" && profesionId) ? parseInt(profesionId) : null,
      titulo: titulo || null,
      subtitulo: subtitulo || null,
      imageUrl,
      link: link || null,
      orden: parseInt(orden || 0),
      activo: activo === "true" || activo === true || activo === "on"
    };

    if (id) {
      await db.heroCarousel.update({
        where: { id: parseInt(id) },
        data: payload
      });
    } else {
      await db.heroCarousel.create({
        data: payload
      });
    }
    res.redirect("/dashboard/admin?tab=carousels&success=carousel_saved");
  } catch (error) {
    console.error("Error saving hero carousel slide:", error);
    res.redirect("/dashboard/admin?tab=carousels&error=carousel_failed");
  }
});

// POST Delete Carousel Slider Item
router.post("/dashboard/admin/carousels/delete/:id", requireAdmin, async (req: Request, res: Response) => {
  const carouselId = parseInt(req.params.id as string);
  try {
    await db.heroCarousel.delete({
      where: { id: carouselId }
    });
    res.redirect("/dashboard/admin?tab=carousels&success=carousel_deleted");
  } catch (error) {
    console.error("Error deleting hero carousel slide:", error);
    res.redirect("/dashboard/admin?tab=carousels&error=carousel_delete_failed");
  }
});

// POST Save CMS Content
router.post("/dashboard/admin/cms", requireAdmin, async (req: Request, res: Response) => {
  const { slug, titulo, contenido } = req.body;
  try {
    let finalContenido = contenido;
    let finalTitulo = titulo;

    if (slug === "contacto") {
      const { email, telefono, ubicacion, razonesRaw } = req.body;
      const razones = (razonesRaw || "").split("\n").map((r: string) => r.trim()).filter((r: string) => r !== "");
      finalContenido = JSON.stringify({ email, telefono, ubicacion, razones });
      finalTitulo = "Contáctanos";
    } else if (slug === "nosotros") {
      const {
        subtitle, mision, vision, quienesSomos, historia,
        founder1_name, founder1_role, founder1_initials,
        founder2_name, founder2_role, founder2_initials,
        valor1_title, valor1_desc,
        valor2_title, valor2_desc,
        valor3_title, valor3_desc,
        valor4_title, valor4_desc,
        porQueConfiarRaw, compromisoRaw, eventosPolitica
      } = req.body;

      const fundadores = [
        { nombre: founder1_name || "Terry Mendieta", cargo: founder1_role || "CEO / Fundador", iniciales: founder1_initials || "TM" },
        { nombre: founder2_name || "Juan Estrada", cargo: founder2_role || "CEO / Fundador", iniciales: founder2_initials || "JE" }
      ];

      const valores = [
        { titulo: valor1_title || "Excelencia", descripcion: valor1_desc || "", icon: "fa-solid fa-award" },
        { titulo: valor2_title || "Innovación", descripcion: valor2_desc || "", icon: "fa-solid fa-lightbulb" },
        { titulo: valor3_title || "Ética", descripcion: valor3_desc || "", icon: "fa-solid fa-shield-halved" },
        { titulo: valor4_title || "Compromiso Social", descripcion: valor4_desc || "", icon: "fa-solid fa-heart" }
      ];

      const porQueConfiar = (porQueConfiarRaw || "").split("\n").map((r: string) => r.trim()).filter((r: string) => r !== "");
      const compromiso = (compromisoRaw || "").split("\n").map((r: string) => r.trim()).filter((r: string) => r !== "");

      finalContenido = JSON.stringify({
        subtitle,
        mision,
        vision,
        quienesSomos,
        historia,
        fundadores,
        valores,
        porQueConfiar,
        compromiso,
        eventosPolitica
      });
      finalTitulo = "Sobre Nosotros";
    } else if (slug === "faq") {
      const {
        faq_prof_q1, faq_prof_a1,
        faq_prof_q2, faq_prof_a2,
        faq_prof_q3, faq_prof_a3,
        faq_eventos_q1, faq_eventos_a1,
        faq_eventos_q2, faq_eventos_a2,
        faq_eventos_q3, faq_eventos_a3
      } = req.body;

      finalContenido = JSON.stringify({
        prof: [
          { q: faq_prof_q1 || "¿Qué es Profesionales.ec?", a: faq_prof_a1 || "" },
          { q: faq_prof_q2 || "¿Registro?", a: faq_prof_a2 || "" },
          { q: faq_prof_q3 || "¿Costo?", a: faq_prof_a3 || "" }
        ],
        eventos: [
          { q: faq_eventos_q1 || "¿Conversatorios?", a: faq_eventos_a1 || "" },
          { q: faq_eventos_q2 || "¿Inscripción?", a: faq_eventos_a2 || "" },
          { q: faq_eventos_q3 || "¿Certificado?", a: faq_eventos_a3 || "" }
        ]
      });
      finalTitulo = "Preguntas Frecuentes";
    }

    await db.editablePage.upsert({
      where: { slug },
      update: { titulo: finalTitulo, contenido: finalContenido },
      create: { slug, titulo: finalTitulo, contenido: finalContenido }
    });
    res.redirect("/dashboard/admin?tab=cms&success=cms_updated");
  } catch (error) {
    console.error("Error saving CMS page content:", error);
    res.redirect("/dashboard/admin?tab=cms&error=cms_failed");
  }
});

// GET Search Professional Profiles (AJAX)
router.get("/api/admin/professionals/search", requireAdmin, async (req: Request, res: Response) => {
  const query = getSafeQueryString(req.query.q);
  if (!query) {
    return res.json({ success: true, professionals: [] });
  }

  try {
    const professionals = await db.professionalProfile.findMany({
      where: {
        OR: [
          { user: { name: { contains: query } } },
          { user: { email: { contains: query } } }
        ]
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      take: 10
    });

    res.json({ success: true, professionals });
  } catch (error) {
    console.error("Error searching professionals:", error);
    res.status(500).json({ success: false, error: "Error al buscar perfiles profesionales." });
  }
});

// POST Crear profesional (admin)
router.post("/dashboard/admin/professionals/create", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, email, professionId, specialtyIds, planType, telefono, ciudad } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Nombre y correo son requeridos" });
    }

    // Verificar que el email no exista
    const existingUser = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existingUser) {
      return res.status(400).json({ error: "Ya existe un usuario con este correo" });
    }

    // Buscar rol PROFESSIONAL
    const professionalRole = await getRoleByName("PROFESSIONAL");
    if (!professionalRole) {
      return res.status(500).json({ error: "Rol PROFESIONAL no encontrado" });
    }

    // Generar contraseña temporal
    const tempPassword = "TEMP-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    const hashedPassword = await hashPassword(tempPassword);

    // Crear usuario
    const user = await db.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        // @ts-ignore
        roleId: professionalRole.id,
        requireProfileSetup: true,
        telefono: telefono || null,
        ciudad: ciudad || null,
      },
    });

    // Generar slug único
    const uniqueSlug = await getUniqueSlug("professionalProfile", name);

    // Crear perfil profesional
    const profile = await db.professionalProfile.create({
      data: {
        userId: user.id,
        slug: uniqueSlug,
        status: "PENDIENTE",
        planType: planType || "GRATUITO",
      },
    });

    // Si hay especialidades, conectarlas
    if (specialtyIds && Array.isArray(specialtyIds) && specialtyIds.length > 0) {
      await db.professionalProfileSpecialty.createMany({
        data: specialtyIds.map((id: number) => ({
          profileId: profile.id,
          specialtyId: Number(id),
        })),
      });
    }

    // Enviar email con credenciales
    const loginUrl = `${process.env.BASE_URL || "http://localhost:3000"}/login`;
    emailService.sendProfessionalCreated(user.email, {
      recipientName: user.name,
      professionalName: user.name,
      email: user.email,
      temporaryPassword: tempPassword,
      loginUrl,
    }).catch((err) => console.warn("Error enviando email de profesional creado:", err));

    return res.json({
      success: true,
      message: "Profesional creado exitosamente",
      user: { id: user.id, name: user.name, email: user.email },
      tempPassword, // Solo para que el admin lo vea en la respuesta
    });
  } catch (error) {
    console.error("Error creando profesional:", error);
    return res.status(500).json({ error: "Error interno al crear profesional" });
  }
});

// POST Toggle User Status (Active / Inactive)
router.post("/dashboard/admin/users/:id/toggle-status", requireAdmin, async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id as string, 10);
  const redirectTab = (req.query.subtab as string) || "clientes";
  try {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.redirect(`/dashboard/admin?tab=cuentas&subtab=${redirectTab}&error=user_not_found`);
    }

    const newStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await db.user.update({
      where: { id: userId },
      data: { status: newStatus }
    });

    return res.redirect(`/dashboard/admin?tab=cuentas&subtab=${redirectTab}&success=user_status_updated`);
  } catch (error) {
    console.error("Error toggling user status:", error);
    return res.redirect(`/dashboard/admin?tab=cuentas&subtab=${redirectTab}&error=user_status_failed`);
  }
});

// POST Change User Role
router.post("/dashboard/admin/users/:id/change-role", requireAdmin, async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id as string, 10);
  const roleId = parseInt(req.body.roleId as string, 10);
  const redirectTab = (req.query.subtab as string) || "clientes";
  try {
    const role = await db.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return res.redirect(`/dashboard/admin?tab=cuentas&subtab=${redirectTab}&error=role_not_found`);
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.redirect(`/dashboard/admin?tab=cuentas&subtab=${redirectTab}&error=user_not_found`);
    }

    const isTargetProf = role.name === "PROFESSIONAL";
    const isTargetStud = role.name === "STUDENT";
    const targetDashboard = isTargetProf
      ? "/registro-profesional?planId=1"
      : isTargetStud
        ? "/student"
        : "/dashboard/cliente";

    // Actualizar usuario forzando redirección a setup y nuevo rol
    await db.user.update({
      where: { id: userId },
      data: {
        roleId,
        requireProfileSetup: true,
        setupRedirectUrl: targetDashboard
      }
    });

    // Ejecutar migración o creación de perfil destino
    if (isTargetProf) {
      await StudentService.syncStudentToProfessionalProfile(userId);
    } else if (isTargetStud) {
      const existingStudentProfile = await db.studentProfile.findUnique({ where: { userId } });
      if (!existingStudentProfile) {
        const studentSlug = await getUniqueSlug("studentProfile", user.name);
        await db.studentProfile.create({
          data: {
            userId,
            slug: studentSlug,
            institucionEducativa: "Universidad / Instituto por definir",
            carrera: "Carrera por definir",
            estadoCarrera: "EN_CURSO"
          }
        });
      }
    }

    // Aprobar automáticamente cualquier solicitud de transición pendiente si la hubiera
    await db.roleTransitionRequest.updateMany({
      where: { userId, estado: "PENDIENTE" },
      data: {
        estado: "APROBADO",
        adminObservacion: `Rol actualizado manualmente por administración a ${role.name}`,
        fechaProcesado: new Date()
      }
    });

    return res.redirect(`/dashboard/admin?tab=cuentas&subtab=${redirectTab}&success=user_role_updated`);
  } catch (error) {
    console.error("Error changing user role:", error);
    return res.redirect(`/dashboard/admin?tab=cuentas&subtab=${redirectTab}&error=user_role_failed`);
  }
});

// POST Reset User Password (Admin)
router.post("/dashboard/admin/users/:id/reset-password", requireAdmin, async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id as string, 10);
  const { newPassword } = req.body;
  const redirectTab = (req.query.subtab as string) || "clientes";

  if (!newPassword || typeof newPassword !== "string" || newPassword.trim().length < 6) {
    return res.redirect(`/dashboard/admin?tab=cuentas&subtab=${redirectTab}&error=invalid_password`);
  }

  try {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.redirect(`/dashboard/admin?tab=cuentas&subtab=${redirectTab}&error=user_not_found`);
    }

    const hashedPassword = await hashPassword(newPassword.trim());
    await db.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    // Enviar email con credenciales actualizadas
    sendCredentialsEmail({
      to: user.email,
      tempPassword: newPassword.trim(),
      eventName: "Plataforma Profesionales Ecuador",
      eventType: "Restablecimiento de Clave por Administración"
    }).catch((err: any) => console.warn("Error enviando email de clave restablecida:", err));

    emailService.sendPasswordUpdated(user.email, {
      recipientName: user.name,
      updateDate: new Date().toLocaleString("es-EC")
    }).catch(err => console.warn("Error enviando notificación de clave actualizada:", err));

    return res.redirect(`/dashboard/admin?tab=cuentas&subtab=${redirectTab}&success=password_reset_success`);
  } catch (error) {
    console.error("Error resetting user password:", error);
    return res.redirect(`/dashboard/admin?tab=cuentas&subtab=${redirectTab}&error=password_reset_failed`);
  }
});

// POST Send / Resend Temporary Access Credentials via Email (Admin)
router.post("/dashboard/admin/users/:id/send-temporary-access", requireAdmin, async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id as string, 10);
  const isAjax = req.xhr || req.headers.accept?.includes("application/json") || req.body.ajax === true;
  const redirectTab = (req.query.subtab as string) || (req.body.subtab as string) || "cuentas";

  if (isNaN(userId)) {
    if (isAjax) return res.status(400).json({ success: false, error: "ID de usuario inválido." });
    return res.redirect(`/dashboard/admin?tab=accounts&error=invalid_user_id`);
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { role: true }
    });

    if (!user) {
      if (isAjax) return res.status(404).json({ success: false, error: "Usuario no encontrado." });
      return res.redirect(`/dashboard/admin?tab=accounts&error=user_not_found`);
    }

    const { customPassword } = req.body;
    const tempPassword = (typeof customPassword === "string" && customPassword.trim().length >= 6)
      ? customPassword.trim()
      : "TEMP-" + Math.random().toString(36).substring(2, 10).toUpperCase();

    const hashedPassword = await hashPassword(tempPassword);

    await db.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        requireProfileSetup: true
      }
    });

    const loginUrl = `${process.env.BASE_URL || "http://localhost:3000"}/login`;
    const roleLabel = user.role?.name || "Usuario";

    const emailResult = await sendCredentialsEmail({
      to: user.email,
      tempPassword,
      eventName: "Plataforma Profesionales Ecuador",
      eventType: `Accesos de Cuenta (${roleLabel})`
    });

    if (isAjax) {
      return res.json({
        success: true,
        message: `Accesos temporales enviados exitosamente a ${user.email}`,
        tempPassword,
        email: user.email,
        emailStatus: emailResult.success ? "enviado" : "error_envio"
      });
    }

    return res.redirect(`/dashboard/admin?tab=accounts&subtab=${redirectTab}&success=${encodeURIComponent(`Accesos temporales enviados a ${user.email}`)}`);
  } catch (error: any) {
    console.error("Error sending temporary access:", error);
    if (isAjax) return res.status(500).json({ success: false, error: error.message || "Error interno al enviar accesos." });
    return res.redirect(`/dashboard/admin?tab=accounts&error=${encodeURIComponent(error.message || "Error al enviar accesos")}`);
  }
});

// POST Edit Professional Profile details
router.post("/dashboard/admin/professionals/edit/:id", requireAdmin, async (req: Request, res: Response) => {
  const profileId = parseInt(req.params.id as string);
  const { name, email, slogan, bio, provincia, ciudad, direccion, latitud, longitud, verified, planType, status } = req.body;
  try {
    const profile = await db.professionalProfile.findUnique({
      where: { id: profileId },
      include: { user: true }
    });
    if (!profile) return res.redirect("/dashboard/admin?tab=professionals&error=profile_not_found");

    const previousStatus = profile.status;

    // Update User
    await db.user.update({
      where: { id: profile.userId },
      data: { name, email }
    });

    // Update Profile
    await db.professionalProfile.update({
      where: { id: profileId },
      data: {
        slogan,
        bio,
        provincia,
        ciudad,
        direccion,
        latitud: latitud ? parseFloat(latitud) : null,
        longitud: longitud ? parseFloat(longitud) : null,
        verified: verified === "true",
        planType,
        status,
        subscriptionEnds: status === "APROBADO" ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : undefined
      }
    });

    // Send emails if status changed to APROBADO or RECHAZADO
    if (previousStatus !== status) {
      if (status === "APROBADO") {
        emailService.sendProfessionalApproved(email, {
          recipientName: name,
          professionalName: name,
          professionalId: profile.id,
          publicProfileUrl: profile.slug
            ? `${process.env.BASE_URL || "http://localhost:3000"}/directorio/${profile.slug}`
            : undefined,
        }).catch((err) => console.warn("Error enviando email de aprobacion:", err));
      } else if (status === "RECHAZADO") {
        emailService.sendProfessionalRejected(email, {
          recipientName: name,
          professionalName: name,
          supportEmail: process.env.SUPPORT_EMAIL || "soporte@profesionales.ec",
        }).catch((err) => console.warn("Error enviando email de rechazo:", err));
      }
    }

    res.redirect("/dashboard/admin?tab=professionals");
  } catch (error) {
    console.error("Error editing professional profile:", error);
    res.redirect("/dashboard/admin?tab=professionals&error=edit_failed");
  }
});

router.post("/dashboard/admin/professionals/delete/:id", requireAdmin, async (req: Request, res: Response) => {
  const profileId = getPositiveParamId(req.params.id);

  if (!profileId) {
    return res.redirect("/dashboard/admin?tab=professionals&error=professional_delete_failed");
  }

  try {
    const profile = await db.professionalProfile.findUnique({
      where: { id: profileId },
      include: {
        user: {
          include: {
            role: true
          }
        },
        issuer: {
          select: {
            id: true
          }
        }
      }
    });

    if (!profile) {
      return res.redirect("/dashboard/admin?tab=professionals&error=profile_not_found");
    }

    if (profile.user.role.name !== "PROFESSIONAL") {
      return res.redirect("/dashboard/admin?tab=professionals&error=professional_delete_not_allowed");
    }

    if (profile.issuer) {
      const invoiceCount = await db.invoice.count({
        where: { issuerId: profile.issuer.id }
      });

      if (invoiceCount > 0) {
        return res.redirect("/dashboard/admin?tab=professionals&error=professional_delete_blocked_invoices");
      }
    }

    const uId = profile.userId;
    const pId = profile.id;

    // @ts-ignore
    await db.$transaction(async (tx) => {
      // 1. Relaciones de Profesional
      await tx.professionalProfileSpecialty.deleteMany({ where: { profileId: pId } });
      await tx.professionalService.deleteMany({ where: { profileId: pId } });
      await tx.professionalSchedule.deleteMany({ where: { profileId: pId } });
      await tx.professionalEducation.deleteMany({ where: { profileId: pId } });
      await tx.professionalPromotion.deleteMany({ where: { profileId: pId } });
      await tx.product.deleteMany({ where: { profileId: pId } });
      await tx.article.deleteMany({ where: { profileId: pId } });
      await tx.conversatorio.deleteMany({ where: { profileId: pId } });
      await tx.curso.deleteMany({ where: { profileId: pId } });

      // 2. Relaciones del Usuario
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
        where: { OR: [{ userId: uId }, { profileId: pId }] }
      });
      await tx.referralProfile.deleteMany({ where: { userId: uId } });

      // 3. Emisor SRI
      if (profile.issuer) {
        await tx.paymentRequest.deleteMany({ where: { issuerId: profile.issuer.id } });
        await tx.issuer.delete({ where: { id: profile.issuer.id } });
      }

      // 4. Perfil Profesional
      await tx.professionalProfile.delete({ where: { id: pId } });

      // 5. Usuario (Libera totalmente el email para reutilización)
      await tx.user.delete({ where: { id: uId } });
    });

    return res.redirect("/dashboard/admin?tab=professionals&success=professional_deleted");
  } catch (error) {
    console.error("Error deleting professional profile:", error);
    return res.redirect("/dashboard/admin?tab=professionals&error=professional_delete_failed");
  }
});

// POST Approve Article
router.post("/dashboard/admin/articles/approve/:id", requireAdmin, async (req: Request, res: Response) => {
  const articleId = parseInt(req.params.id as string, 10);
  const displayMode = req.body.displayMode || req.query.displayMode || "PDF";
  const mode = displayMode === "HTML" ? "HTML" : "PDF";

  try {
    const article = await db.article.update({
      where: { id: articleId },
      data: {
        estado: "APROBADO",
        displayMode: mode
      }
    });

    if (mode === "HTML" && article.conversionStatus !== "COMPLETED") {
      processPdfArticle(articleId).catch(err => {
        console.error(`Error processing HTML for article ${articleId}:`, err);
      });
    }

    res.redirect("/dashboard/admin?tab=articles&success=article_approved");
  } catch (error) {
    console.error("Error approving article:", error);
    res.redirect("/dashboard/admin?tab=articles&error=article_approve_failed");
  }
});

// POST Toggle Article Display Mode (PDF vs HTML)
router.post("/dashboard/admin/articles/toggle-mode/:id", requireAdmin, async (req: Request, res: Response) => {
  const articleId = parseInt(req.params.id as string, 10);
  const requestedMode = req.body.displayMode || req.query.displayMode;

  try {
    const article = await db.article.findUnique({ where: { id: articleId } });
    if (!article) {
      return res.redirect("/dashboard/admin?tab=articles&error=article_not_found");
    }

    const newMode = requestedMode ? (requestedMode === "HTML" ? "HTML" : "PDF") : (article.displayMode === "PDF" ? "HTML" : "PDF");

    await db.article.update({
      where: { id: articleId },
      data: { displayMode: newMode }
    });

    if (newMode === "HTML" && article.conversionStatus !== "COMPLETED") {
      processPdfArticle(articleId).catch(err => {
        console.error(`Error processing HTML for article ${articleId}:`, err);
      });
    }

    res.redirect("/dashboard/admin?tab=articles&success=mode_toggled");
  } catch (error) {
    console.error("Error toggling article display mode:", error);
    res.redirect("/dashboard/admin?tab=articles&error=mode_toggle_failed");
  }
});

// POST Reject Article
router.post("/dashboard/admin/articles/reject/:id", requireAdmin, async (req: Request, res: Response) => {
  const articleId = parseInt(req.params.id as string);
  try {
    await db.article.update({
      where: { id: articleId },
      data: { estado: "RECHAZADO" }
    });
    res.redirect("/dashboard/admin?tab=articles");
  } catch (error) {
    console.error("Error rejecting article:", error);
    res.redirect("/dashboard/admin?tab=articles&error=article_reject_failed");
  }
});

// POST Create or Update Events (Conversatorio / Curso)
router.post("/dashboard/admin/events", requireAdmin, async (req: Request, res: Response) => {
  const {
    id,
    eventType,
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
    capacidad,
    capacidadIlimitada,
    provincia,
    ciudad,
    direccion,
    latitud,
    longitud,
    revistaPdf,
    revistaFlipbook,
    revistaPortada,
    banner,
    youtube,
    destacado,
    usarTiempoMinimoPonencia,
    tiempoMinimoPonenciaMinutos
  } = req.body;

  const isUsarTiempoMinimo = usarTiempoMinimoPonencia === "true" || usarTiempoMinimoPonencia === true || usarTiempoMinimoPonencia === "on";

  const parsedProfId = req.body.professionId ? parseInt(req.body.professionId as string, 10) : null;
  const parsedCatId = req.body.categoryId ? parseInt(req.body.categoryId as string, 10) : null;
  const parsedBranchId = req.body.branchId ? parseInt(req.body.branchId as string, 10) : null;

  const dataPayload: any = {
    titulo,
    slogan,
    areaProfesional,
    professionId: parsedProfId && !isNaN(parsedProfId) ? parsedProfId : null,
    categoryId: parsedCatId && !isNaN(parsedCatId) ? parsedCatId : null,
    branchId: parsedBranchId && !isNaN(parsedBranchId) ? parsedBranchId : null,
    keywords: req.body.keywords || null,
    descripcion,
    fechaInicio: new Date(fechaInicio),
    fechaFin: new Date(fechaFin),
    horaInicio,
    horaFin,
    precio: parseFloat(precio || 0),
    gratuito: gratuito === "true",
    capacidad: capacidad ? parseInt(capacidad) : null,
    capacidadIlimitada: capacidadIlimitada === "true",
    usarTiempoMinimoPonencia: isUsarTiempoMinimo,
    tiempoMinimoPonenciaMinutos: isUsarTiempoMinimo
      ? (tiempoMinimoPonenciaMinutos ? Math.max(0, parseInt(tiempoMinimoPonenciaMinutos as string, 10)) || null : null)
      : null,
    provincia,
    ciudad,
    direccion,
    latitud: latitud ? parseFloat(latitud) : null,
    longitud: longitud ? parseFloat(longitud) : null,
    revistaPdf,
    revistaFlipbook,
    revistaPortada,
    banner,
    youtube,
    destacado: destacado === "true"
  };

  try {
    if (eventType === "conversatorio") {
      if (id) {
        const conversatorioId = parseInt(id);
        const slug = await getUniqueSlug("conversatorio", titulo, conversatorioId);
        await db.conversatorio.update({
          where: { id: conversatorioId },
          data: { ...dataPayload, slug }
        });
      } else {
        const slug = await getUniqueSlug("conversatorio", titulo);
        await db.conversatorio.create({
          data: { ...dataPayload, slug }
        });
      }
    } else if (eventType === "curso") {
      if (id) {
        const cursoId = parseInt(id);
        const slug = await getUniqueSlug("curso", titulo, cursoId);
        await db.curso.update({
          where: { id: cursoId },
          data: { ...dataPayload, slug }
        });
      } else {
        const slug = await getUniqueSlug("curso", titulo);
        await db.curso.create({
          data: { ...dataPayload, slug }
        });
      }
    }
    const redirectTab = eventType === "curso" ? "cursos" : "conversatorios";
    res.redirect(`/dashboard/admin?tab=${redirectTab}`);
  } catch (error) {
    console.error("Error saving event:", error);
    const redirectTab = eventType === "curso" ? "cursos" : "conversatorios";
    res.redirect(`/dashboard/admin?tab=${redirectTab}&error=event_failed`);
  }
});

// POST Save Conversatorio (Redesigned with Itineraries and Speakers transaction)
router.post("/dashboard/admin/conversatorios/save", requireAdmin, async (req: Request, res: Response) => {
  const {
    id,
    estado,
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
    permitirCertificadoGratuito,
    certificadoInmediato,
    porcentajeMinimoCertificado,
    capacidad,
    capacidadIlimitada,
    provincia,
    ciudad,
    direccion,
    revistaPdf,
    revistaFlipbook,
    revistaPortada,
    banner,
    youtube,
    destacado,
    usarTiempoMinimoPonencia,
    tiempoMinimoPonenciaMinutos,
    itineraryJson,
    usePecConvenios,
    conveniosJson
  } = req.body;

  const isUsarTiempoMinimo = usarTiempoMinimoPonencia === "true" || usarTiempoMinimoPonencia === true || usarTiempoMinimoPonencia === "on";

  try {
    let finalBanner = banner || null;
    if (finalBanner && typeof finalBanner === "string" && finalBanner.startsWith("data:")) {
      finalBanner = await uploadBase64ToCloudinary(finalBanner, "conversatorios");
    }

    let finalRevistaPortada = revistaPortada || null;
    if (finalRevistaPortada && typeof finalRevistaPortada === "string" && finalRevistaPortada.startsWith("data:")) {
      finalRevistaPortada = await uploadBase64ToCloudinary(finalRevistaPortada, "conversatorios/revistas");
    }

    let finalRevistaPdf = revistaPdf || null;
    if (finalRevistaPdf && typeof finalRevistaPdf === "string" && finalRevistaPdf.startsWith("data:")) {
      finalRevistaPdf = await uploadBase64ToCloudinary(finalRevistaPdf, "conversatorios/revistas");
    }

    const dataPayload: any = {
      estado: getConversatorioEstado(estado),
      titulo,
      slogan: slogan || null,
      areaProfesional: areaProfesional || null,
      descripcion: descripcion || null,
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
      horaInicio,
      horaFin,
      precio: parseFloat(precio || 0),
      descuentoEstudianteUsd: parseFloat(req.body.descuentoEstudianteUsd || 0),
      gratuito: gratuito === "true" || gratuito === true,
      permitirCertificadoGratuito: permitirCertificadoGratuito === "true" || permitirCertificadoGratuito === true || permitirCertificadoGratuito === "on",
      certificadoInmediato: certificadoInmediato === "true" || certificadoInmediato === true || certificadoInmediato === "on",
      porcentajeMinimoCertificado: Math.max(1, Math.min(100, parseInt(porcentajeMinimoCertificado || 100))),
      capacidad: capacidad ? parseInt(capacidad) : null,
      capacidadIlimitada: capacidadIlimitada === "true" || capacidadIlimitada === true,
      usarTiempoMinimoPonencia: isUsarTiempoMinimo,
      tiempoMinimoPonenciaMinutos: isUsarTiempoMinimo
        ? (tiempoMinimoPonenciaMinutos ? Math.max(0, parseInt(tiempoMinimoPonenciaMinutos as string, 10)) || null : null)
        : null,
      provincia: provincia || null,
      ciudad: ciudad || null,
      direccion: direccion || null,
      revistaPdf: finalRevistaPdf,
      revistaFlipbook: revistaFlipbook || null,
      revistaPortada: finalRevistaPortada,
      banner: finalBanner,
      youtube: youtube && !youtube.startsWith('bunny:') ? youtube : null,
      bunnyVideoId: youtube && youtube.startsWith('bunny:') ? youtube.split(':')[2] : null,
      destacado: destacado === "true" || destacado === true,
      usePecConvenios: usePecConvenios === "true" || usePecConvenios === true || usePecConvenios === "on"
    };
    const parsedItinerary = itineraryJson ? JSON.parse(itineraryJson) : { days: [], speakers: [] };
    const days = parsedItinerary.days || [];
    const speakers = parsedItinerary.speakers || [];
    const parsedConvenios = conveniosJson ? JSON.parse(conveniosJson) : [];
    const scopedAgreements: ScopedAgreementInput[] = [];

    for (const convenio of parsedConvenios) {
      let logoUrl = convenio.logo || null;
      if (logoUrl && typeof logoUrl === "string" && logoUrl.startsWith("data:image")) {
        logoUrl = await uploadBase64ToCloudinary(logoUrl, "convenios");
      }

      scopedAgreements.push({
        titulo: convenio.titulo || "Convenio",
        categoria: convenio.categoria || "Aliado Estratégico",
        descripcion: convenio.descripcion || null,
        link: convenio.link || null,
        orden: parseInt(convenio.orden || 0),
        logo: logoUrl
      });
    }

    // @ts-ignore
    await db.$transaction(async (tx) => {
      let conversatorioId = id ? parseInt(id as string) : null;

      if (conversatorioId) {
        // Update main Conversatorio
        const slug = await getUniqueSlug("conversatorio", titulo, conversatorioId);
        await tx.conversatorio.update({
          where: { id: conversatorioId },
          data: { ...dataPayload, slug }
        });

        // Clear existing itineraries and speakers
        await tx.conversatorioItinerary.deleteMany({
          where: { conversatorioId }
        });
        const inputSpeakerIds = speakers
          .map((sp: any) => getPositiveBodyId(sp.id))
          .filter((speakerId: number | null): speakerId is number => !!speakerId);

        await tx.conversatorioSpeaker.deleteMany({
          where: {
            conversatorioId,
            id: { notIn: inputSpeakerIds }
          }
        });
      } else {
        // Create new Conversatorio
        const slug = await getUniqueSlug("conversatorio", titulo);
        const newConv = await tx.conversatorio.create({
          data: { ...dataPayload, slug }
        });
        conversatorioId = newConv.id;
      }

      // Save new itinerary days
      for (let dIdx = 0; dIdx < days.length; dIdx++) {
        const day = days[dIdx];
        await tx.conversatorioItinerary.create({
          data: {
            conversatorioId,
            nombre: day.nombre || `Día ${dIdx + 1}`,
            fecha: day.fecha ? new Date(day.fecha) : new Date(fechaInicio),
            horaInicio: day.horaInicio || "09:00",
            horaFin: day.horaFin || "18:00",
            orden: dIdx
          }
        });
      }

      // Save new speakers
      for (const sp of speakers) {
        const speakerPayload = {
          conversatorioId,
          slug: generateSlug(sp.nombre || "ponente"),
          nombre: sp.nombre || "Ponente Invitado",
          foto: sp.foto || null,
          profesion: sp.profesion || null,
          horario: sp.horario || null,
          slogan: sp.slogan || null,
          tema: sp.tema || null,
          descripcion: sp.descripcion || null,
          redes: sp.redes ? JSON.stringify(sp.redes) : null,
          dayIndex: sp.dayIndex !== undefined && sp.dayIndex !== null ? parseInt(sp.dayIndex as string) : null,
          videoUrl: sp.videoUrl && !sp.videoUrl.startsWith('bunny:') ? sp.videoUrl : null,
          bunnyVideoId: sp.videoUrl && sp.videoUrl.startsWith('bunny:') ? sp.videoUrl.split(':')[2] : null,
          gratuita: sp.gratuita === "true" || sp.gratuita === true || sp.gratuita === "on" || sp.gratuita === 1 || sp.gratuita === "1"
        };
        const speakerId = getPositiveBodyId(sp.id);

        if (speakerId) {
          const updated = await tx.conversatorioSpeaker.updateMany({
            where: { id: speakerId, conversatorioId },
            data: speakerPayload
          });
          if (updated.count === 0) {
            await tx.conversatorioSpeaker.create({ data: speakerPayload });
          }
        } else {
          await tx.conversatorioSpeaker.create({ data: speakerPayload });
        }
      }

      await tx.agreement.deleteMany({
        where: { conversatorioId }
      });

      for (const convenio of scopedAgreements) {
        await tx.agreement.create({
          data: {
            ...convenio,
            conversatorioId
          }
        });
      }
    });

    res.redirect("/dashboard/admin?tab=conversatorios&success=conversatorio_saved");
  } catch (error) {
    console.error("Error saving conversatorio:", error);
    res.redirect("/dashboard/admin?tab=conversatorios&error=conversatorio_failed");
  }
});

// POST Save Curso (Redesigned with discounts, flat speakers, and nested module-lesson-resource structure)
router.post("/dashboard/admin/cursos/save", requireAdmin, async (req: Request, res: Response) => {
  const {
    id,
    estado,
    titulo,
    slogan,
    areaProfesional,
    professionId,
    categoryId,
    branchId,
    keywords,
    descripcion,
    precio,
    gratuito,
    certificadoInmediato,
    porcentajeMinimoCertificado,
    banner,
    youtube,
    galeria,
    destacado,
    usarTiempoMinimoPonencia,
    tiempoMinimoPonenciaMinutos,
    discountsJson,
    structureJson,
    speakersJson,
    mediaType,
    mediaUrl
  } = req.body;

  const isUsarTiempoMinimo = usarTiempoMinimoPonencia === "true" || usarTiempoMinimoPonencia === true || usarTiempoMinimoPonencia === "on";

  try {
    const parsedDiscounts = discountsJson ? JSON.parse(discountsJson) : [];
    const parsedStructure = structureJson ? JSON.parse(structureJson) : [];
    const parsedSpeakers = speakersJson ? JSON.parse(speakersJson) : [];

    // @ts-ignore
    await db.$transaction(async (tx) => {
      let cursoId = id ? parseInt(id as string) : null;
      let existingCurso = null;
      if (cursoId) {
        existingCurso = await tx.curso.findUnique({
          where: { id: cursoId }
        });
      }

      const defaultDate = existingCurso?.fechaInicio || new Date();
      const defaultDateFin = existingCurso?.fechaFin || new Date();
      const defaultHoraInicio = existingCurso?.horaInicio || "00:00";
      const defaultHoraFin = existingCurso?.horaFin || "00:00";

      const parsedProfId = professionId ? parseInt(professionId as string, 10) : null;
      const parsedCatId = categoryId ? parseInt(categoryId as string, 10) : null;
      const parsedBranchId = branchId ? parseInt(branchId as string, 10) : null;

      let extractedDocenteId: number | null = req.body.docenteId ? parseInt(req.body.docenteId as string, 10) : null;
      if (!extractedDocenteId && parsedSpeakers && parsedSpeakers.length > 0) {
        const firstWithProfile = parsedSpeakers.find((sp: any) => sp.profileId || sp.docenteId);
        if (firstWithProfile) {
          extractedDocenteId = parseInt(String(firstWithProfile.profileId || firstWithProfile.docenteId), 10);
        }
      }

      const dataPayload: any = {
        estado: estado || "ACTIVO",
        titulo,
        slogan: slogan || null,
        areaProfesional: areaProfesional || null,
        professionId: parsedProfId && !isNaN(parsedProfId) ? parsedProfId : null,
        categoryId: parsedCatId && !isNaN(parsedCatId) ? parsedCatId : null,
        branchId: parsedBranchId && !isNaN(parsedBranchId) ? parsedBranchId : null,
        docenteId: extractedDocenteId && !isNaN(extractedDocenteId) ? extractedDocenteId : null,
        profileId: extractedDocenteId && !isNaN(extractedDocenteId) ? extractedDocenteId : null,
        keywords: keywords || null,
        descripcion: descripcion || null,
        precio: parseFloat(precio || 0),
        descuentoEstudianteUsd: parseFloat(req.body.descuentoEstudianteUsd || 0),
        gratuito: gratuito === "true" || gratuito === true || gratuito === "on",
        certificadoInmediato: certificadoInmediato === "true" || certificadoInmediato === true || certificadoInmediato === "on",
        porcentajeMinimoCertificado: Math.max(1, Math.min(100, parseInt(porcentajeMinimoCertificado || 100))),
        usarTiempoMinimoPonencia: isUsarTiempoMinimo,
        tiempoMinimoPonenciaMinutos: isUsarTiempoMinimo
          ? (tiempoMinimoPonenciaMinutos ? Math.max(0, parseInt(tiempoMinimoPonenciaMinutos as string, 10)) || null : null)
          : null,
        // Map mediaType/mediaUrl to banner/youtube for backward compatibility
        banner: (mediaType === "imagen" ? mediaUrl : null) || banner || null,
        youtube: (mediaType === "video" ? (mediaUrl && !mediaUrl.startsWith('bunny:') ? mediaUrl : null) : null) || (youtube && !youtube.startsWith('bunny:') ? youtube : null) || null,
        bunnyVideoId: (mediaType === "video" && mediaUrl && mediaUrl.startsWith('bunny:') ? mediaUrl.split(':')[2] : null) || (youtube && youtube.startsWith('bunny:') ? youtube.split(':')[2] : null) || null,
        mediaType: mediaType || "imagen",
        mediaUrl: mediaUrl || null,
        galeria: galeria || null,
        destacado: destacado === "true" || destacado === true || destacado === "on",
        // Default values for database columns that are no longer in form
        fechaInicio: defaultDate,
        fechaFin: defaultDateFin,
        horaInicio: defaultHoraInicio,
        horaFin: defaultHoraFin,
        capacidad: existingCurso?.capacidad || null,
        capacidadIlimitada: existingCurso?.capacidadIlimitada ?? true,
        provincia: existingCurso?.provincia || null,
        ciudad: existingCurso?.ciudad || null,
        direccion: existingCurso?.direccion || null,
        revistaPdf: null,
        revistaFlipbook: null,
        revistaPortada: null
      };

      if (cursoId) {
        // Update main Curso
        const slug = await getUniqueSlug("curso", titulo, cursoId);
        await tx.curso.update({
          where: { id: cursoId },
          data: { ...dataPayload, slug }
        });
      } else {
        // Create new Curso
        const slug = await getUniqueSlug("curso", titulo);
        const newCurso = await tx.curso.create({
          data: { ...dataPayload, slug }
        });
        cursoId = newCurso.id;
      }

      // 1. Sync Discounts
      await tx.cursoDiscount.deleteMany({
        where: { cursoId }
      });
      for (const d of parsedDiscounts) {
        await tx.cursoDiscount.create({
          data: {
            cursoId,
            porcentaje: parseFloat(d.porcentaje || 0),
            fechaInicio: new Date(d.fechaInicio),
            fechaFin: new Date(d.fechaFin)
          }
        });
      }

      // 2. Sync Speakers (Flat list)
      await tx.cursoSpeaker.deleteMany({
        where: { cursoId }
      });
      for (const sp of parsedSpeakers) {
        const isBunny = sp.videoUrl && sp.videoUrl.startsWith('bunny:');
        await tx.cursoSpeaker.create({
          data: {
            cursoId,
            nombre: sp.nombre || "Docente Invitado",
            foto: sp.foto || null,
            profesion: sp.profesion || null,
            slogan: sp.slogan || null,
            descripcion: sp.descripcion || null,
            redes: sp.redes ? (typeof sp.redes === 'string' ? sp.redes : JSON.stringify(sp.redes)) : null,
            videoUrl: isBunny ? null : (sp.videoUrl || null),
            bunnyVideoId: isBunny ? sp.videoUrl.split(':')[2] : null,
            gratuita: false
          }
        });
      }

      // 3. Sync Modules, Lessons, Resources safely (to avoid cascade-deleting submissions)
      const dbModules = await tx.cursoModule.findMany({
        where: { cursoId },
        include: {
          lessons: {
            include: { resources: true }
          }
        }
      });

      const inputModuleIds = parsedStructure.map((m: any) => m.id).filter(Boolean);
      const inputLessonIds: number[] = [];
      const inputResourceIds: number[] = [];

      parsedStructure.forEach((m: any) => {
        if (m.lessons) {
          m.lessons.forEach((l: any) => {
            if (l.id) inputLessonIds.push(l.id);
            if (l.resources) {
              l.resources.forEach((r: any) => {
                if (r.id) inputResourceIds.push(r.id);
              });
            }
          });
        }
      });

      // Delete resources not in input
      // @ts-ignore
      const dbResourceIds = dbModules.flatMap(m => m.lessons.flatMap(l => l.resources.map(r => r.id)));
      // @ts-ignore
      const resourcesToDelete = dbResourceIds.filter(id => !inputResourceIds.includes(id));
      if (resourcesToDelete.length > 0) {
        await tx.cursoResource.deleteMany({
          where: { id: { in: resourcesToDelete } }
        });
      }

      // Delete lessons not in input
      // @ts-ignore
      const dbLessonIds = dbModules.flatMap(m => m.lessons.map(l => l.id));
      // @ts-ignore
      const lessonsToDelete = dbLessonIds.filter(id => !inputLessonIds.includes(id));
      if (lessonsToDelete.length > 0) {
        await tx.cursoLesson.deleteMany({
          where: { id: { in: lessonsToDelete } }
        });
      }

      // Delete modules not in input
      // @ts-ignore
      const dbModuleIds = dbModules.map(m => m.id);
      // @ts-ignore
      const modulesToDelete = dbModuleIds.filter(id => !inputModuleIds.includes(id));
      if (modulesToDelete.length > 0) {
        await tx.cursoModule.deleteMany({
          where: { id: { in: modulesToDelete } }
        });
      }

      // Now upsert Modules, Lessons, Resources
      for (let mIdx = 0; mIdx < parsedStructure.length; mIdx++) {
        const m = parsedStructure[mIdx];
        let moduleId = m.id ? parseInt(m.id) : null;

        if (moduleId) {
          await tx.cursoModule.update({
            where: { id: moduleId },
            data: {
              titulo: m.titulo,
              orden: mIdx
            }
          });
        } else {
          const newMod = await tx.cursoModule.create({
            data: {
              cursoId,
              titulo: m.titulo,
              orden: mIdx
            }
          });
          moduleId = newMod.id;
        }

        // Lessons
        const lessons = m.lessons || [];
        for (let lIdx = 0; lIdx < lessons.length; lIdx++) {
          const l = lessons[lIdx];
          let lessonId = l.id ? parseInt(l.id) : null;

          if (lessonId) {
            await tx.cursoLesson.update({
              where: { id: lessonId },
              data: {
                titulo: l.titulo,
                descripcion: l.descripcion || null,
                videoUrl: l.videoUrl || null,
                orden: lIdx
              }
            });
          } else {
            const newLes = await tx.cursoLesson.create({
              data: {
                moduleId,
                titulo: l.titulo,
                descripcion: l.descripcion || null,
                videoUrl: l.videoUrl || null,
                orden: lIdx
              }
            });
            lessonId = newLes.id;
          }

          // Resources
          const resources = l.resources || [];
          for (const r of resources) {
            let resourceId = r.id ? parseInt(r.id) : null;

            if (resourceId) {
              await tx.cursoResource.update({
                where: { id: resourceId },
                data: {
                  nombre: r.nombre,
                  url: r.url
                }
              });
            } else {
              await tx.cursoResource.create({
                data: {
                  lessonId,
                  nombre: r.nombre,
                  url: r.url
                }
              });
            }
          }
        }
      }
    });

    res.redirect("/dashboard/admin?tab=cursos&success=curso_saved");
  } catch (error) {
    console.error("Error saving curso:", error);
    res.redirect("/dashboard/admin?tab=cursos&error=curso_failed");
  }
});

// GET full Conversatorio detail for authenticated admin edit forms.
router.get("/api/admin/conversatorios/:id/detail", requireAdmin, async (req: Request, res: Response) => {
  const conversatorioId = getPositiveParamId(req.params.id);
  if (!conversatorioId) {
    return res.status(400).json({ success: false, error: "ID de conversatorio inválido." });
  }

  try {
    const conversatorio = await db.conversatorio.findUnique({
      where: { id: conversatorioId },
      include: {
        speakers: { include: { resources: { orderBy: { createdAt: "asc" } } } },
        itinerary: true,
        certificateDesign: true,
        agreements: { orderBy: { orden: "asc" } },
        qas: {
          include: {
            speaker: { select: { id: true, nombre: true, tema: true, profesion: true } },
            user: { select: { id: true, name: true, email: true } }
          },
          orderBy: [{ orden: "asc" }, { id: "asc" }]
        }
      }
    });

    if (!conversatorio) {
      return res.status(404).json({ success: false, error: "Conversatorio no encontrado." });
    }

    return res.json({ success: true, conversatorio });
  } catch (error) {
    console.error("Error fetching conversatorio admin detail:", error);
    return res.status(500).json({ success: false, error: "Error al cargar el conversatorio." });
  }
});

router.get("/api/admin/conversatorios/speakers/:speakerId/resources", requireAdmin, async (req: Request, res: Response) => {
  const speakerId = getPositiveParamId(req.params.speakerId);
  if (!speakerId) {
    return res.status(400).json({ success: false, error: "ID de ponente inválido." });
  }

  try {
    const resources = await db.conversatorioSpeakerResource.findMany({
      where: { speakerId },
      orderBy: { createdAt: "asc" }
    });

    return res.json({ success: true, resources });
  } catch (error) {
    console.error("Error fetching speaker resources:", error);
    return res.status(500).json({ success: false, error: "Error al cargar recursos." });
  }
});

router.post("/api/admin/conversatorios/speakers/:speakerId/resources", requireAdmin, async (req: Request, res: Response) => {
  const speakerId = getPositiveParamId(req.params.speakerId);
  if (!speakerId) {
    return res.status(400).json({ success: false, error: "ID de ponente inválido." });
  }

  const nombre = normalizeTextField(req.body.nombre, 180);
  const url = typeof req.body.url === "string" ? req.body.url.trim() : "";
  const tipo = normalizeSpeakerResourceType(req.body.tipo);
  const tamano = Number.parseInt(String(req.body.tamano || "0"), 10) || null;
  const isLink = tipo === "link";

  if (!nombre || !url || !tipo) {
    return res.status(400).json({ success: false, error: "Nombre, URL/archivo y tipo válido son obligatorios." });
  }

  if (isLink && !isHttpUrl(url)) {
    return res.status(400).json({ success: false, error: "El link debe iniciar con http:// o https://." });
  }

  if (!isLink) {
    const estimatedSize = tamano || getBase64PayloadSize(url);
    if (estimatedSize > MAX_SPEAKER_RESOURCE_SIZE) {
      return res.status(400).json({ success: false, error: "El archivo no puede superar 10 MB." });
    }
  }

  try {
    const speaker = await db.conversatorioSpeaker.findUnique({ where: { id: speakerId } });
    if (!speaker) {
      return res.status(404).json({ success: false, error: "Ponente no encontrado." });
    }

    const uploadedUrl = isLink ? url : await uploadBase64ToCloudinary(url, "conversatorios/recursos");
    const resource = await db.conversatorioSpeakerResource.create({
      data: {
        speakerId,
        nombre,
        url: uploadedUrl,
        tipo,
        tamano: isLink ? null : tamano
      }
    });

    return res.json({ success: true, resource });
  } catch (error) {
    console.error("Error saving speaker resource:", error);
    return res.status(500).json({ success: false, error: "Error al guardar recurso." });
  }
});

router.post("/api/admin/conversatorios/speakers/:speakerId/resources/:resourceId/delete", requireAdmin, async (req: Request, res: Response) => {
  const speakerId = getPositiveParamId(req.params.speakerId);
  const resourceId = getPositiveParamId(req.params.resourceId);
  if (!speakerId || !resourceId) {
    return res.status(400).json({ success: false, error: "ID inválido." });
  }

  try {
    await db.conversatorioSpeakerResource.deleteMany({
      where: { id: resourceId, speakerId }
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Error deleting speaker resource:", error);
    return res.status(500).json({ success: false, error: "Error al eliminar recurso." });
  }
});

router.get("/api/admin/conversatorios/:conversatorioId/questions", requireAdmin, async (req: Request, res: Response) => {
  const conversatorioId = getPositiveParamId(req.params.conversatorioId);
  if (!conversatorioId) {
    return res.status(400).json({ success: false, error: "ID de conversatorio inválido." });
  }

  try {
    const questions = await db.conversatorioQuestionAnswer.findMany({
      where: { conversatorioId },
      include: {
        speaker: { select: { id: true, nombre: true, tema: true } }
      },
      orderBy: [
        { estado: "asc" },
        { createdAt: "desc" }
      ]
    });

    return res.json({ success: true, questions });
  } catch (error) {
    console.error("Error fetching questions for admin:", error);
    return res.status(500).json({ success: false, error: "Error cargando preguntas." });
  }
});

router.post("/api/admin/conversatorios/questions/:id/moderate", requireAdmin, async (req: Request, res: Response) => {
  const questionId = getPositiveParamId(req.params.id);
  if (!questionId) {
    return res.status(400).json({ success: false, error: "ID de pregunta inválido." });
  }

  const { estado, respuesta, destacado, orden } = req.body;

  try {
    const updated = await db.conversatorioQuestionAnswer.update({
      where: { id: questionId },
      data: {
        estado: estado || undefined,
        respuesta: respuesta !== undefined ? String(respuesta).trim() : undefined,
        destacado: destacado !== undefined ? Boolean(destacado) : undefined,
        orden: orden !== undefined ? Number(orden) : undefined
      }
    });

    return res.json({ success: true, question: updated });
  } catch (error: any) {
    console.error("Error moderating question:", error);
    return res.status(500).json({ success: false, error: error.message || "Error al moderar la pregunta." });
  }
});

router.post("/api/admin/conversatorios/questions/:id/delete", requireAdmin, async (req: Request, res: Response) => {
  const questionId = getPositiveParamId(req.params.id);
  if (!questionId) {
    return res.status(400).json({ success: false, error: "ID inválido." });
  }

  try {
    await db.conversatorioQuestionAnswer.delete({ where: { id: questionId } });
    return res.json({ success: true });
  } catch (error) {
    console.error("Error deleting question:", error);
    return res.status(500).json({ success: false, error: "Error al eliminar la pregunta." });
  }
});

// GET full Curso detail for authenticated admin edit forms.
router.get("/api/admin/cursos/:id/detail", requireAdmin, async (req: Request, res: Response) => {
  const cursoId = getPositiveParamId(req.params.id);
  if (!cursoId) {
    return res.status(400).json({ success: false, error: "ID de curso inválido." });
  }

  try {
    const curso = await db.curso.findUnique({
      where: { id: cursoId },
      include: {
        speakers: true,
        itinerary: true,
        certificateDesign: true,
        discounts: true,
        modules: {
          orderBy: { orden: "asc" },
          include: {
            lessons: {
              orderBy: { orden: "asc" },
              include: { resources: true }
            }
          }
        }
      }
    });

    if (!curso) {
      return res.status(404).json({ success: false, error: "Curso no encontrado." });
    }

    return res.json({ success: true, curso });
  } catch (error) {
    console.error("Error fetching curso admin detail:", error);
    return res.status(500).json({ success: false, error: "Error al cargar el curso." });
  }
});

// GET deferred admin config fields that can contain full YouTube URLs.
router.get("/api/admin/system-config/deferred", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const config = await getSystemConfig();

    return res.json({
      success: true,
      // @ts-ignore
      youtubeUrl: config?.youtubeUrl || ""
    });
  } catch (error) {
    console.error("Error fetching deferred system config:", error);
    return res.status(500).json({ success: false, error: "Error al cargar la configuración diferida." });
  }
});

// GET Event Statistics (Admin only)
router.get("/api/admin/stats/event/:type/:id", requireAdmin, async (req: Request, res: Response) => {
  const { type, id } = req.params;
  const eventId = parseInt(id as string);

  try {
    if (type === "conversatorio") {
      const conversatorio = await db.conversatorio.findUnique({
        where: { id: eventId },
        include: {
          speakers: true,
          qas: {
            include: {
              speaker: { select: { id: true, nombre: true, tema: true, profesion: true } },
              user: { select: { id: true, name: true, email: true } }
            },
            orderBy: [{ orden: "asc" }, { id: "asc" }]
          },
          enrollments: {
            include: {
              user: {
                include: {
                  professionalProfile: true,
                  acquiredCertificates: {
                    where: { conversatorioId: eventId }
                  }
                }
              }
            }
          }
        }
      });

      if (!conversatorio) {
        return res.status(404).json({ success: false, error: "Conversatorio no encontrado." });
      }

      // Calculate Revenue
      const certificates = await db.certificate.findMany({
        where: { conversatorioId: eventId }
      });
      const approvedRevenue = certificates
        // @ts-ignore
        .filter(c => c.estado === "APROBADO")
        // @ts-ignore
        .reduce((sum, c) => sum + c.precioPagado, 0);
      const pendingRevenue = certificates
        // @ts-ignore
        .filter(c => c.estado === "PENDIENTE")
        // @ts-ignore
        .reduce((sum, c) => sum + c.precioPagado, 0);

      // Access logs
      const accessLogs = await db.eventAccessLog.findMany({
        where: { conversatorioId: eventId }
      });

      // Map speakers to access counts
      // @ts-ignore
      const items = conversatorio.speakers.map(sp => {
        // @ts-ignore
        const spLogs = accessLogs.filter(l => l.speakerId === sp.id);
        // @ts-ignore
        const uniqueUsers = new Set(spLogs.map(l => l.userId).filter(Boolean));
        return {
          id: sp.id,
          title: `Ponencia: ${sp.nombre} - ${sp.tema || 'Sin Tema'}`,
          totalViews: spLogs.length,
          uniqueViewers: uniqueUsers.size
        };
      });

      // Total views across all ponencias
      const totalViews = accessLogs.length;

      // Map enrollments
      // @ts-ignore
      const enrollments = conversatorio.enrollments.map(en => {
        const cert = en.user.acquiredCertificates[0] || null;
        return {
          userId: en.user.id,
          name: en.user.name,
          email: en.user.email,
          celular: en.user.professionalProfile?.telefono || "S/T",
          createdAt: en.createdAt,
          certStatus: cert ? cert.estado : "NO_SOLICITADO",
          certPrice: cert ? cert.precioPagado : 0,
          certId: cert ? cert.id : null,
          certName: cert ? cert.nombreUsuario : null
        };
      });

      const paymentRequests = await db.paymentRequest.findMany({
        where: {
          certificate: {
            conversatorioId: eventId
          }
        },
        include: {
          certificate: {
            include: {
              user: true
            }
          }
        },
        orderBy: {
          fechaSolicitud: "desc"
        }
      });

      const systemConfig = await getSystemConfig();
      // @ts-ignore
      const orders = paymentRequests.map(pr => ({
        id: pr.id,
        alumnoName: pr.certificate?.user?.name || pr.razonSocial,
        alumnoEmail: pr.certificate?.user?.email || "S/C",
        monto: pr.monto,
        referencia: pr.referencia,
        // @ts-ignore
        bancoDestino: getPaymentBankLabel(pr, systemConfig?.bankAccounts),
        comprobante: pr.comprobante,
        estado: pr.estado,
        fechaSolicitud: pr.fechaSolicitud
      }));

      return res.json({
        success: true,
        type: "conversatorio",
        title: conversatorio.titulo,
        enrolledCount: conversatorio.enrollments.length,
        approvedRevenue,
        pendingRevenue,
        totalViews,
        enrollments,
        items,
        speakers: conversatorio.speakers,
        qas: conversatorio.qas,
        orders
      });

    } else if (type === "curso") {
      const curso = await db.curso.findUnique({
        where: { id: eventId },
        include: {
          modules: {
            include: {
              lessons: {
                include: {
                  tasks: true
                }
              }
            }
          },
          enrollments: {
            include: {
              user: {
                include: {
                  professionalProfile: true,
                  acquiredCertificates: {
                    where: { cursoId: eventId }
                  }
                }
              }
            }
          }
        }
      });

      if (!curso) {
        return res.status(404).json({ success: false, error: "Curso no encontrado." });
      }

      // Calculate Revenue
      const certificates = await db.certificate.findMany({
        where: { cursoId: eventId }
      });
      const approvedRevenue = certificates
        // @ts-ignore
        .filter(c => c.estado === "APROBADO")
        // @ts-ignore
        .reduce((sum, c) => sum + c.precioPagado, 0);
      const pendingRevenue = certificates
        // @ts-ignore
        .filter(c => c.estado === "PENDIENTE")
        // @ts-ignore
        .reduce((sum, c) => sum + c.precioPagado, 0);

      // Access logs
      const accessLogs = await db.eventAccessLog.findMany({
        where: { cursoId: eventId }
      });

      // Flatten lessons & map to access counts
      const items: any[] = [];

      // @ts-ignore
      curso.modules.forEach(mod => {
        // @ts-ignore
        mod.lessons.forEach(les => {
          // @ts-ignore
          const lesLogs = accessLogs.filter(l => l.lessonId === les.id);
          // @ts-ignore
          const uniqueUsers = new Set(lesLogs.map(l => l.userId).filter(Boolean));
          items.push({
            id: les.id,
            title: `Módulo: ${mod.titulo} > ${les.titulo}`,
            totalViews: lesLogs.length,
            uniqueViewers: uniqueUsers.size
          });
        });
      });

      // Total views
      const totalViews = accessLogs.length;

      // Map enrollments
      // @ts-ignore
      const enrollments = curso.enrollments.map(en => {
        const cert = en.user.acquiredCertificates[0] || null;
        return {
          userId: en.user.id,
          name: en.user.name,
          email: en.user.email,
          celular: en.user.professionalProfile?.telefono || "S/T",
          createdAt: en.createdAt,
          certStatus: cert ? cert.estado : "NO_SOLICITADO",
          certPrice: cert ? cert.precioPagado : 0,
          certId: cert ? cert.id : null,
          certName: cert ? cert.nombreUsuario : null
        };
      });

      // Tareas y Entregas Stats
      // @ts-ignore
      const allLessons = curso.modules.flatMap(m => m.lessons);
      // @ts-ignore
      const allTasks = allLessons.flatMap(l => l.tasks);
      // @ts-ignore
      const taskIds = allTasks.map(t => t.id);

      const submissions = await db.cursoSubmission.findMany({
        where: { taskId: { in: taskIds } }
      });

      const tasksSummary = {
        totalTasks: allTasks.length,
        totalSubmissions: submissions.length,
        // @ts-ignore
        pendingGrades: submissions.filter(s => s.estado === "PENDIENTE").length,
        // @ts-ignore
        approvedSubmissions: submissions.filter(s => s.estado === "APROBADA").length,
        // @ts-ignore
        rejectedSubmissions: submissions.filter(s => s.estado === "RECHAZADA").length
      };

      const paymentRequests = await db.paymentRequest.findMany({
        where: {
          certificate: {
            cursoId: eventId
          }
        },
        include: {
          certificate: {
            include: {
              user: true
            }
          }
        },
        orderBy: {
          fechaSolicitud: "desc"
        }
      });

      const systemConfig = await getSystemConfig();
      // @ts-ignore
      const orders = paymentRequests.map(pr => ({
        id: pr.id,
        alumnoName: pr.certificate?.user?.name || pr.razonSocial,
        alumnoEmail: pr.certificate?.user?.email || "S/C",
        monto: pr.monto,
        referencia: pr.referencia,
        // @ts-ignore
        bancoDestino: getPaymentBankLabel(pr, systemConfig?.bankAccounts),
        comprobante: pr.comprobante,
        estado: pr.estado,
        fechaSolicitud: pr.fechaSolicitud
      }));

      return res.json({
        success: true,
        type: "curso",
        title: curso.titulo,
        enrolledCount: curso.enrollments.length,
        approvedRevenue,
        pendingRevenue,
        totalViews,
        enrollments,
        items,
        tasksSummary,
        orders
      });

    } else {
      return res.status(400).json({ success: false, error: "Tipo de evento inválido." });
    }
  } catch (error) {
    console.error("Error generating event stats:", error);
    res.status(500).json({ success: false, error: "Error interno del servidor." });
  }
});

// POST Create or update Conversatorio Q&A items from the stats modal.
router.post("/api/admin/conversatorios/:id/qa", requireAdmin, async (req: Request, res: Response) => {
  const conversatorioId = getPositiveParamId(req.params.id);
  if (!conversatorioId) {
    return res.status(400).json({ success: false, error: "ID de conversatorio inválido." });
  }

  const body = req.body as Record<string, unknown>;
  const qaId = getPositiveBodyId(body.id);
  const speakerId = getPositiveBodyId(body.speakerId);
  const pregunta = normalizeTextField(body.pregunta, 500);
  const respuesta = normalizeTextField(body.respuesta, 4000);
  const ordenValue = getPositiveBodyId(body.orden);
  const orden = ordenValue || 0;
  const activo = normalizeBooleanField(body.activo, true);

  if (!pregunta || !respuesta) {
    return res.status(400).json({ success: false, error: "La pregunta y la respuesta son obligatorias." });
  }

  try {
    const conversatorio = await db.conversatorio.findUnique({
      where: { id: conversatorioId },
      select: { id: true }
    });

    if (!conversatorio) {
      return res.status(404).json({ success: false, error: "Conversatorio no encontrado." });
    }

    if (qaId) {
      const existingQa = await db.conversatorioQuestionAnswer.findFirst({
        where: { id: qaId, conversatorioId },
        select: { id: true }
      });

      if (!existingQa) {
        return res.status(404).json({ success: false, error: "Pregunta no encontrada." });
      }

      await db.conversatorioQuestionAnswer.update({
        where: { id: qaId },
        data: { pregunta, respuesta, orden, activo, speakerId }
      });
    } else {
      await db.conversatorioQuestionAnswer.create({
        data: { conversatorioId, pregunta, respuesta, orden, activo, speakerId }
      });
    }

    const qas = await db.conversatorioQuestionAnswer.findMany({
      where: { conversatorioId },
      include: {
        speaker: { select: { id: true, nombre: true, tema: true, profesion: true } },
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: [{ orden: "asc" }, { id: "asc" }]
    });

    return res.json({ success: true, qas });
  } catch (error) {
    console.error("Error saving conversatorio Q&A:", error);
    return res.status(500).json({ success: false, error: "Error al guardar la pregunta y respuesta." });
  }
});

// DELETE Conversatorio Q&A item from the stats modal.
router.delete("/api/admin/conversatorios/:id/qa/:qaId", requireAdmin, async (req: Request, res: Response) => {
  const conversatorioId = getPositiveParamId(req.params.id);
  const qaId = getPositiveParamId(req.params.qaId);

  if (!conversatorioId || !qaId) {
    return res.status(400).json({ success: false, error: "ID inválido." });
  }

  try {
    const existingQa = await db.conversatorioQuestionAnswer.findFirst({
      where: { id: qaId, conversatorioId },
      select: { id: true }
    });

    if (!existingQa) {
      return res.status(404).json({ success: false, error: "Pregunta no encontrada." });
    }

    await db.conversatorioQuestionAnswer.delete({
      where: { id: qaId }
    });

    const qas = await db.conversatorioQuestionAnswer.findMany({
      where: { conversatorioId },
      include: {
        speaker: { select: { id: true, nombre: true, tema: true, profesion: true } },
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: [{ orden: "asc" }, { id: "asc" }]
    });

    return res.json({ success: true, qas });
  } catch (error) {
    console.error("Error deleting conversatorio Q&A:", error);
    return res.status(500).json({ success: false, error: "Error al eliminar la pregunta y respuesta." });
  }
});

// POST Delete Event
router.post("/dashboard/admin/events/delete/:type/:id", requireAdmin, async (req: Request, res: Response) => {
  const { type, id } = req.params;
  const eventId = parseInt(id as string);
  try {
    if (type === "conversatorio") {
      await db.conversatorio.delete({ where: { id: eventId } });
      res.redirect("/dashboard/admin?tab=conversatorios");
    } else if (type === "curso") {
      await db.curso.delete({ where: { id: eventId } });
      res.redirect("/dashboard/admin?tab=cursos");
    }
  } catch (error) {
    console.error("Error deleting event:", error);
    const redirectTab = type === "curso" ? "cursos" : "conversatorios";
    res.redirect(`/dashboard/admin?tab=${redirectTab}&error=delete_event_failed`);
  }
});

// ==========================================
// CURSO CATEGORIES & BRANCHES ENDPOINTS
// ==========================================

// GET all Curso categories and branches
router.get("/api/admin/curso-categories", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const categories = await db.cursoCategory.findMany({
      include: {
        profession: { select: { id: true, nombre: true } },
        specialty: { select: { id: true, nombre: true } },
        branches: { orderBy: { orden: "asc" } }
      },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }]
    });

    const professions = await db.profession.findMany({
      include: {
        specialties: { orderBy: { orden: "asc" } }
      },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }]
    });

    return res.json({ success: true, categories, professions });
  } catch (error) {
    console.error("Error fetching curso categories:", error);
    return res.status(500).json({ success: false, error: "Error al obtener categorías de cursos." });
  }
});

// POST Save/Edit Curso Category
router.post("/api/admin/curso-categories", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id, nombre, descripcion, professionId, specialtyId, orden, activo } = req.body;
    if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
      return res.status(400).json({ success: false, error: "El nombre de la categoría es obligatorio." });
    }

    const parsedId = getPositiveBodyId(id);
    const parsedProfId = getPositiveBodyId(professionId);
    const parsedSpecId = getPositiveBodyId(specialtyId);
    const parsedOrden = typeof orden === "number" ? orden : (parseInt(String(orden), 10) || 0);

    if (parsedId) {
      await db.cursoCategory.update({
        where: { id: parsedId },
        data: {
          nombre: nombre.trim(),
          descripcion: descripcion ? String(descripcion).trim() : null,
          professionId: parsedProfId || null,
          specialtyId: parsedSpecId || null,
          orden: parsedOrden,
          activo: typeof activo === "boolean" ? activo : true
        }
      });
    } else {
      await db.cursoCategory.create({
        data: {
          nombre: nombre.trim(),
          descripcion: descripcion ? String(descripcion).trim() : null,
          professionId: parsedProfId || null,
          specialtyId: parsedSpecId || null,
          orden: parsedOrden,
          activo: typeof activo === "boolean" ? activo : true
        }
      });
    }

    const categories = await db.cursoCategory.findMany({
      include: {
        profession: { select: { id: true, nombre: true } },
        specialty: { select: { id: true, nombre: true } },
        branches: { orderBy: { orden: "asc" } }
      },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }]
    });

    return res.json({ success: true, categories, message: "Categoría guardada con éxito." });
  } catch (error) {
    console.error("Error saving curso category:", error);
    return res.status(500).json({ success: false, error: "Error al guardar la categoría." });
  }
});

// DELETE Curso Category
router.delete("/api/admin/curso-categories/:id", requireAdmin, async (req: Request, res: Response) => {
  const categoryId = getPositiveParamId(req.params.id);
  if (!categoryId) {
    return res.status(400).json({ success: false, error: "ID de categoría inválido." });
  }

  try {
    await db.cursoCategory.delete({ where: { id: categoryId } });
    const categories = await db.cursoCategory.findMany({
      include: {
        profession: { select: { id: true, nombre: true } },
        specialty: { select: { id: true, nombre: true } },
        branches: { orderBy: { orden: "asc" } }
      },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }]
    });
    return res.json({ success: true, categories, message: "Categoría eliminada con éxito." });
  } catch (error) {
    console.error("Error deleting curso category:", error);
    return res.status(500).json({ success: false, error: "Error al eliminar la categoría." });
  }
});

// POST Save/Edit Curso Branch
router.post("/api/admin/curso-branches", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id, categoryId, nombre, descripcion, orden, activo } = req.body;
    const parsedCatId = getPositiveBodyId(categoryId);
    if (!parsedCatId) {
      return res.status(400).json({ success: false, error: "Debe seleccionar una categoría válida." });
    }
    if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
      return res.status(400).json({ success: false, error: "El nombre de la rama de enseñanza es obligatorio." });
    }

    const parsedId = getPositiveBodyId(id);
    const parsedOrden = typeof orden === "number" ? orden : (parseInt(String(orden), 10) || 0);

    if (parsedId) {
      await db.cursoBranch.update({
        where: { id: parsedId },
        data: {
          categoryId: parsedCatId,
          nombre: nombre.trim(),
          descripcion: descripcion ? String(descripcion).trim() : null,
          orden: parsedOrden,
          activo: typeof activo === "boolean" ? activo : true
        }
      });
    } else {
      await db.cursoBranch.create({
        data: {
          categoryId: parsedCatId,
          nombre: nombre.trim(),
          descripcion: descripcion ? String(descripcion).trim() : null,
          orden: parsedOrden,
          activo: typeof activo === "boolean" ? activo : true
        }
      });
    }

    const categories = await db.cursoCategory.findMany({
      include: {
        profession: { select: { id: true, nombre: true } },
        specialty: { select: { id: true, nombre: true } },
        branches: { orderBy: { orden: "asc" } }
      },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }]
    });

    return res.json({ success: true, categories, message: "Rama de enseñanza guardada con éxito." });
  } catch (error) {
    console.error("Error saving curso branch:", error);
    return res.status(500).json({ success: false, error: "Error al guardar la rama de enseñanza." });
  }
});

// DELETE Curso Branch
router.delete("/api/admin/curso-branches/:id", requireAdmin, async (req: Request, res: Response) => {
  const branchId = getPositiveParamId(req.params.id);
  if (!branchId) {
    return res.status(400).json({ success: false, error: "ID de rama inválido." });
  }

  try {
    await db.cursoBranch.delete({ where: { id: branchId } });
    const categories = await db.cursoCategory.findMany({
      include: {
        profession: { select: { id: true, nombre: true } },
        specialty: { select: { id: true, nombre: true } },
        branches: { orderBy: { orden: "asc" } }
      },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }]
    });
    return res.json({ success: true, categories, message: "Rama de enseñanza eliminada con éxito." });
  } catch (error) {
    console.error("Error deleting curso branch:", error);
    return res.status(500).json({ success: false, error: "Error al eliminar la rama de enseñanza." });
  }
});

// POST Save Payment Config Settings
router.post("/dashboard/admin/payment-config", requireAdmin, async (req: Request, res: Response) => {
  const { bankAccounts, payphoneToken, kushkiPublicKey, kushkiPrivateKey } = req.body;
  try {
    const config = await getSystemConfig();
    if (config) {
      await db.systemConfig.update({
        // @ts-ignore
        where: { id: config.id },
        data: {
          bankAccounts,
          payphoneToken,
          kushkiPublicKey,
          kushkiPrivateKey
        }
      });
    } else {
      await db.systemConfig.create({
        data: {
          id: 1,
          bankAccounts,
          payphoneToken,
          kushkiPublicKey,
          kushkiPrivateKey
        }
      });
    }
    invalidateCache(cacheKey.systemConfig.singleton()).catch(() => { });
    res.redirect("/dashboard/admin?tab=payments");
  } catch (error) {
    console.error("Error saving payment config:", error);
    res.redirect("/dashboard/admin?tab=payments&error=payment_config_failed");
  }
});

router.post("/dashboard/admin/bank-accounts", requireAdmin, async (req: Request, res: Response) => {
  const parsed = normalizeBankAccountInput(req.body as Record<string, unknown>);
  if (!parsed.data) {
    return res.redirect(`/dashboard/admin?tab=payments&error=bank_account_invalid&msg=${encodeURIComponent(parsed.error || "Datos inválidos.")}`);
  }

  try {
    let qrImageUrl: string | null = null;
    let qrImagePublicId: string | null = null;
    if (parsed.data.type === "qr" && parsed.qrImage) {
      const upload = await uploadBase64ToCloudinaryWithPublicId(parsed.qrImage, "bank-accounts/qr");
      qrImageUrl = upload.secureUrl;
      qrImagePublicId = upload.publicId || null;
    }

    await db.bankAccount.create({
      data: {
        ...parsed.data,
        qrImageUrl,
        qrImagePublicId
      }
    });

    return res.redirect("/dashboard/admin?tab=payments&success=bank_account_saved");
  } catch (error) {
    console.error("Error creating bank account:", error);
    return res.redirect("/dashboard/admin?tab=payments&error=bank_account_save_failed");
  }
});

router.post("/dashboard/admin/bank-accounts/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = getPositiveParamId(req.params.id);
  if (!id) {
    return res.redirect("/dashboard/admin?tab=payments&error=bank_account_not_found");
  }

  try {
    const existing = await db.bankAccount.findUnique({ where: { id } });
    if (!existing) {
      return res.redirect("/dashboard/admin?tab=payments&error=bank_account_not_found");
    }

    const parsed = normalizeBankAccountInput(req.body as Record<string, unknown>, existing.qrImageUrl);
    if (!parsed.data) {
      return res.redirect(`/dashboard/admin?tab=payments&error=bank_account_invalid&msg=${encodeURIComponent(parsed.error || "Datos inválidos.")}`);
    }

    let qrImageUrl = parsed.data.type === "qr" ? existing.qrImageUrl : null;
    let qrImagePublicId = parsed.data.type === "qr" ? existing.qrImagePublicId : null;
    if (parsed.data.type === "qr" && parsed.qrImage) {
      const upload = await uploadBase64ToCloudinaryWithPublicId(parsed.qrImage, "bank-accounts/qr");
      qrImageUrl = upload.secureUrl;
      qrImagePublicId = upload.publicId || null;
    }

    await db.bankAccount.update({
      where: { id },
      data: {
        ...parsed.data,
        qrImageUrl,
        qrImagePublicId,
        deletedAt: parsed.data.isActive ? null : existing.deletedAt
      }
    });

    return res.redirect("/dashboard/admin?tab=payments&success=bank_account_saved");
  } catch (error) {
    console.error("Error updating bank account:", error);
    return res.redirect("/dashboard/admin?tab=payments&error=bank_account_save_failed");
  }
});

router.post("/dashboard/admin/bank-accounts/:id/toggle", requireAdmin, async (req: Request, res: Response) => {
  const id = getPositiveParamId(req.params.id);
  if (!id) {
    return res.redirect("/dashboard/admin?tab=payments&error=bank_account_not_found");
  }

  try {
    const account = await db.bankAccount.findUnique({ where: { id } });
    if (!account) {
      return res.redirect("/dashboard/admin?tab=payments&error=bank_account_not_found");
    }

    await db.bankAccount.update({
      where: { id },
      data: {
        isActive: !account.isActive,
        deletedAt: !account.isActive ? null : account.deletedAt
      }
    });

    return res.redirect("/dashboard/admin?tab=payments&success=bank_account_saved");
  } catch (error) {
    console.error("Error toggling bank account:", error);
    return res.redirect("/dashboard/admin?tab=payments&error=bank_account_save_failed");
  }
});

router.post("/dashboard/admin/bank-accounts/:id/delete", requireAdmin, async (req: Request, res: Response) => {
  const id = getPositiveParamId(req.params.id);
  if (!id) {
    return res.redirect("/dashboard/admin?tab=payments&error=bank_account_not_found");
  }

  try {
    const paymentsCount = await db.paymentRequest.count({ where: { bankAccountId: id } });
    if (paymentsCount > 0) {
      await db.bankAccount.update({
        where: { id },
        data: { isActive: false, deletedAt: new Date() }
      });
    } else {
      await db.bankAccount.delete({ where: { id } });
    }

    return res.redirect("/dashboard/admin?tab=payments&success=bank_account_deleted");
  } catch (error) {
    console.error("Error deleting bank account:", error);
    return res.redirect("/dashboard/admin?tab=payments&error=bank_account_delete_failed");
  }
});

// POST Save PayPhone Configuration (dedicated endpoint)
router.post("/dashboard/admin/config/payphone", requireAdmin, async (req: Request, res: Response) => {
  const { payphoneToken, payphoneStoreId, taxRate } = req.body;
  try {
    // 1. Validate taxRate (must be a number between 0 and 100)
    const parsedTaxRate = parseFloat(taxRate);
    if (isNaN(parsedTaxRate) || parsedTaxRate < 0 || parsedTaxRate > 100) {
      return res.redirect("/dashboard/admin?tab=payments&error=invalid_tax_rate");
    }

    // 2. Build update data.
    //    Security: only overwrite payphoneToken when a non-empty value is submitted,
    //    so saving just the Store ID / taxRate won't wipe an existing token.
    const data: { payphoneStoreId: string | null; taxRate: number; payphoneToken?: string } = {
      payphoneStoreId: payphoneStoreId ? payphoneStoreId.trim() : null,
      taxRate: parsedTaxRate,
    };
    if (payphoneToken && payphoneToken.trim() !== "") {
      data.payphoneToken = payphoneToken.trim();
    }

    // 3. Upsert SystemConfig (singleton id=1)
    await db.systemConfig.upsert({
      where: { id: 1 },
      update: data,
      create: {
        id: 1,
        adminPassword: "admin1234",
        systemName: "Profesionales Ecuador",
        metaDescription: "Directorio profesional, agendamiento de citas y facturación.",
        ...data,
      },
    });

    res.redirect("/dashboard/admin?tab=payments&success=payphone-configured");
  } catch (error) {
    console.error("Error saving PayPhone config:", error);
    res.redirect("/dashboard/admin?tab=payments&error=payphone_config_failed");
  }
});

// POST Save Site Style / Branding Configuration
router.post("/dashboard/admin/style-config", requireAdmin, async (req: Request, res: Response) => {
  const {
    systemName,
    adminEmail,
    systemLogo,
    loginLogo,
    footerLogo,
    primaryColor,
    secondaryColor,
    fontFamily,
    headingFontFamily,
    cloudinaryCloudName,
    cloudinaryApiKey,
    cloudinaryApiSecret,
    resendApiKey,
    resendFromEmail,
    adminWhatsapp,
    facebookUrl,
    instagramUrl,
    youtubeUrl,
    tiktokUrl,
    linkedinUrl,
    geminiApiKey,
    geminiProjectName,
    geminiProjectNumber,
    tiempoMinimoPonenciaMinutos,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    smtpSecure
  } = req.body;

  const parsedMinutos = parseInt(tiempoMinimoPonenciaMinutos as string, 10);
  const finalMinutos = !isNaN(parsedMinutos) && parsedMinutos >= 0 ? parsedMinutos : 3;
  try {
    const normalizedAdminEmail = normalizeOptionalEmail(adminEmail);
    if (normalizedAdminEmail && !isValidEmail(normalizedAdminEmail)) {
      return res.redirect("/dashboard/admin?tab=style-config&error=invalid_admin_email");
    }

    let systemLogoUrl = systemLogo || null;
    let loginLogoUrl = loginLogo || null;
    let footerLogoUrl = footerLogo || null;

    if (systemLogo && (systemLogo.startsWith("data:") || systemLogo.length > 200)) {
      try {
        systemLogoUrl = await uploadBase64ToCloudinary(systemLogo, "logos");
      } catch (e) {
        console.error("Error uploading systemLogo to Cloudinary:", e);
      }
    }

    if (loginLogo && (loginLogo.startsWith("data:") || loginLogo.length > 200)) {
      try {
        loginLogoUrl = await uploadBase64ToCloudinary(loginLogo, "logos");
      } catch (e) {
        console.error("Error uploading loginLogo to Cloudinary:", e);
      }
    }

    if (footerLogo && (footerLogo.startsWith("data:") || footerLogo.length > 200)) {
      try {
        footerLogoUrl = await uploadBase64ToCloudinary(footerLogo, "logos");
      } catch (e) {
        console.error("Error uploading footerLogo to Cloudinary:", e);
      }
    }

    const config = await getSystemConfig();
    const currentConfig = await getSystemConfig();

    // Solo actualizar resendApiKey si se proporciona un valor no vacio
    let finalResendApiKey: string | null = null;
    if (resendApiKey && resendApiKey.trim() !== "") {
      finalResendApiKey = resendApiKey.trim();
      // @ts-ignore
    } else if (currentConfig && currentConfig.resendApiKey) {
      // @ts-ignore
      finalResendApiKey = currentConfig.resendApiKey;
    }

    // Igual para resendFromEmail
    let finalResendFromEmail: string | null = null;
    if (resendFromEmail && resendFromEmail.trim() !== "") {
      finalResendFromEmail = resendFromEmail.trim();
      // @ts-ignore
    } else if (currentConfig && currentConfig.resendFromEmail) {
      // @ts-ignore
      finalResendFromEmail = currentConfig.resendFromEmail;
    }

    const parsedSmtpPort = smtpPort ? parseInt(smtpPort as string, 10) : 587;

    if (config) {
      await db.systemConfig.update({
        // @ts-ignore
        where: { id: config.id },
        data: {
          systemName: systemName || "Profesionales Ecuador",
          adminEmail: normalizedAdminEmail,
          systemLogo: systemLogoUrl,
          loginLogo: loginLogoUrl,
          footerLogo: footerLogoUrl,
          primaryColor: primaryColor || "#0A3C84",
          secondaryColor: secondaryColor || "#0a66c2",
          fontFamily: fontFamily || "Outfit",
          headingFontFamily: headingFontFamily || "Outfit",
          cloudinaryCloudName: cloudinaryCloudName || null,
          cloudinaryApiKey: cloudinaryApiKey || null,
          cloudinaryApiSecret: cloudinaryApiSecret || null,
          resendApiKey: finalResendApiKey,
          resendFromEmail: finalResendFromEmail,
          smtpHost: smtpHost ? String(smtpHost).trim() : null,
          smtpPort: !isNaN(parsedSmtpPort) ? parsedSmtpPort : 587,
          smtpUser: smtpUser ? String(smtpUser).trim() : null,
          smtpPass: smtpPass ? String(smtpPass).trim() : null,
          smtpSecure: smtpSecure === "true" || smtpSecure === true || smtpSecure === "on",
          adminWhatsapp: adminWhatsapp || "593999999999",
          facebookUrl: facebookUrl || null,
          instagramUrl: instagramUrl || null,
          youtubeUrl: youtubeUrl || null,
          tiktokUrl: tiktokUrl || null,
          linkedinUrl: linkedinUrl || null,
          geminiApiKey: geminiApiKey || null,
          geminiProjectName: geminiProjectName || null,
          geminiProjectNumber: geminiProjectNumber || null,
          tiempoMinimoPonenciaMinutos: finalMinutos
        }
      });
    } else {
      await db.systemConfig.create({
        data: {
          id: 1,
          systemName: systemName || "Profesionales Ecuador",
          adminEmail: normalizedAdminEmail,
          systemLogo: systemLogoUrl,
          loginLogo: loginLogoUrl,
          footerLogo: footerLogoUrl,
          primaryColor: primaryColor || "#0A3C84",
          secondaryColor: secondaryColor || "#0a66c2",
          fontFamily: fontFamily || "Outfit",
          headingFontFamily: headingFontFamily || "Outfit",
          cloudinaryCloudName: cloudinaryCloudName || null,
          cloudinaryApiKey: cloudinaryApiKey || null,
          cloudinaryApiSecret: cloudinaryApiSecret || null,
          resendApiKey: finalResendApiKey,
          resendFromEmail: finalResendFromEmail,
          smtpHost: smtpHost ? String(smtpHost).trim() : null,
          smtpPort: !isNaN(parsedSmtpPort) ? parsedSmtpPort : 587,
          smtpUser: smtpUser ? String(smtpUser).trim() : null,
          smtpPass: smtpPass ? String(smtpPass).trim() : null,
          smtpSecure: smtpSecure === "true" || smtpSecure === true || smtpSecure === "on",
          adminWhatsapp: adminWhatsapp || "593999999999",
          facebookUrl: facebookUrl || null,
          instagramUrl: instagramUrl || null,
          youtubeUrl: youtubeUrl || null,
          tiktokUrl: tiktokUrl || null,
          linkedinUrl: linkedinUrl || null,
          geminiApiKey: geminiApiKey || null,
          geminiProjectName: geminiProjectName || null,
          geminiProjectNumber: geminiProjectNumber || null,
          tiempoMinimoPonenciaMinutos: finalMinutos
        }
      });
    }
    try {
      const redis = await getRedis();
      if (redis) {
        await redis.del(cacheKey.systemConfig.singleton());
      }
    } catch (cacheErr) {
      console.error("[Admin] Failed to invalidate systemConfig cache:", cacheErr);
    }
    await emailService.invalidateConfig();
    res.redirect("/dashboard/admin?tab=style-config&success=style_updated");
  } catch (error) {
    console.error("Error saving style config:", error);
    res.redirect("/dashboard/admin?tab=style-config&error=style_config_failed");
  }
});

// POST Send Test Email
router.post("/dashboard/admin/test-email", requireAdmin, async (req: Request, res: Response) => {
  const { recipientEmail } = req.body;
  if (!recipientEmail || typeof recipientEmail !== "string" || !recipientEmail.trim()) {
    return res.redirect("/dashboard/admin?tab=style-config&error=invalid_test_email");
  }

  const targetEmail = recipientEmail.trim();
  try {
    const result = await emailService.sendRawEmail({
      to: targetEmail,
      subject: "Correo de Prueba - Profesionales Ecuador",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
          <h2 style="color: #0A3C84; margin-top: 0;">Prueba de Configuración de Correo</h2>
          <p style="color: #374151; font-size: 15px; line-height: 1.6;">
            ¡Enhorabuena! El servicio de correos electrónicos (Google OAuth) está configurado y respondiendo correctamente en la plataforma <strong>Profesionales Ecuador</strong>.
          </p>
          <div style="background-color: #f8fafc; border-left: 4px solid #0A3C84; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px; color: #475569;"><strong>Destinatario de prueba:</strong> ${targetEmail}</p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #475569;"><strong>Fecha del envío:</strong> ${new Date().toLocaleString("es-EC")}</p>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 11px; margin: 0; text-align: center;">
            Mensaje generado automáticamente desde el Panel de Administración de Profesionales Ecuador.
          </p>
        </div>
      `,
    });

    if (result.success) {
      return res.redirect("/dashboard/admin?tab=style-config&success=test_email_sent");
    } else {
      console.error("Test email failed:", result.error);
      return res.redirect(`/dashboard/admin?tab=style-config&error=test_email_failed&msg=${encodeURIComponent(result.error || "Error al enviar correo de prueba.")}`);
    }
  } catch (error: any) {
    console.error("Exception in test email endpoint:", error);
    return res.redirect(`/dashboard/admin?tab=style-config&error=test_email_failed&msg=${encodeURIComponent(error.message || "Error interno.")}`);
  }
});

// GET Route: Generate and download database backup (Admin only)
router.get("/dashboard/admin/database/backup", requireAdmin, async (req: Request, res: Response) => {
  try {
    // 1) Parse DATABASE_URL using the WHATWG URL parser (handles URL-encoded
    //    passwords, @ in passwords, IPv6 hosts, and query strings correctly).
    const dbUrlRaw = process.env.DATABASE_URL || "";
    if (!dbUrlRaw) {
      return res.redirect("/dashboard/admin?tab=database&error=backup_missing_db_url");
    }
    const dbUrl = new URL(dbUrlRaw);
    const host = dbUrl.hostname;
    const port = dbUrl.port || "5432";
    const user = decodeURIComponent(dbUrl.username);
    const password = decodeURIComponent(dbUrl.password);
    const dbName = dbUrl.pathname.replace(/^\//, "");

    // 2) Locate pg_dump across macOS (Postgres.app + Homebrew libpq),
    //    Linux, and Windows. Order matters: most specific first.
    let pgDumpPath = "pg_dump";
    const candidatePaths = [
      // macOS — Homebrew libpq (keg-only, not symlinked into /opt/homebrew/bin)
      "/opt/homebrew/opt/libpq/bin/pg_dump",
      "/usr/local/opt/libpq/bin/pg_dump",
      // macOS — Postgres.app
      "/Applications/Postgres.app/Contents/Versions/latest/bin/pg_dump",
      "/Applications/Postgres.app/Contents/Versions/18/bin/pg_dump",
      "/Applications/Postgres.app/Contents/Versions/17/bin/pg_dump",
      "/Applications/Postgres.app/Contents/Versions/16/bin/pg_dump",
      "/Applications/Postgres.app/Contents/Versions/15/bin/pg_dump",
      "/Applications/Postgres.app/Contents/Versions/14/bin/pg_dump",
      // macOS — Homebrew postgresql (full distribution)
      "/opt/homebrew/bin/pg_dump",
      "/usr/local/bin/pg_dump",
      // Linux
      "/usr/lib/postgresql/18/bin/pg_dump",
      "/usr/lib/postgresql/17/bin/pg_dump",
      "/usr/lib/postgresql/16/bin/pg_dump",
      "/usr/lib/postgresql/15/bin/pg_dump",
      "/usr/lib/postgresql/14/bin/pg_dump",
      "/usr/bin/pg_dump",
      // Windows
      "C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe",
      "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe",
      "C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe",
      "C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe",
    ];
    for (const candidate of candidatePaths) {
      try {
        if (fs.existsSync(candidate)) {
          pgDumpPath = candidate;
          break;
        }
      } catch {
        // ignore — some candidates may not be readable
      }
    }

    // 3) If still on default "pg_dump", verify it's in PATH
    if (pgDumpPath === "pg_dump") {
      try {
        execFileSync(process.platform === "win32" ? "where" : "which", ["pg_dump"], { stdio: "pipe" });
      } catch {
        return res.redirect(
          "/dashboard/admin?tab=database&error=backup_pg_dump_not_found"
        );
      }
    }

    // 4) Ensure public dir exists and create a unique timestamped file
    const publicDir = path.join(__dirname, "../../public");
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup_profesionales_ecuador_${timestamp}.custom`;
    const outputPath = path.join(publicDir, filename);

    // 5) Run pg_dump with custom format (compressed binary, restored with pg_restore)
    //    -F c = custom format (smaller, faster, supports selective restore)
    const env = { ...process.env, PGPASSWORD: password };
    try {
      execFileSync(
        pgDumpPath,
        ["-h", host, "-p", port, "-U", user, "-d", dbName, "-F", "c", "-f", outputPath],
        { env, stdio: "pipe", timeout: 120000 }
      );
    } catch (error) {
      try { fs.unlinkSync(outputPath); } catch { /* ignore */ }

      const execError = error as Error & {
        stderr?: Buffer | string;
        stdout?: Buffer | string;
      };
      const stderr = Buffer.isBuffer(execError.stderr)
        ? execError.stderr.toString("utf8")
        : String(execError.stderr || "");
      const stdout = Buffer.isBuffer(execError.stdout)
        ? execError.stdout.toString("utf8")
        : String(execError.stdout || "");
      const diagnostic = [stderr, stdout, execError.message].filter(Boolean).join("\n");

      if (/server version mismatch/i.test(diagnostic)) {
        return res.redirect(
          "/dashboard/admin?tab=database&error=backup_pg_dump_version_mismatch&msg=" +
          encodeURIComponent(
            "El cliente pg_dump del contenedor no es compatible con la versión del servidor PostgreSQL. La imagen de producción debe incluir PostgreSQL client 18 (pg_dump 18.x)."
          )
        );
      }

      throw error;
    }

    // 6) Sanity check: file must exist and be non-empty
    if (!fs.existsSync(outputPath)) {
      return res.redirect("/dashboard/admin?tab=database&error=backup_not_generated");
    }
    const stat = fs.statSync(outputPath);
    if (stat.size === 0) {
      try { fs.unlinkSync(outputPath); } catch { /* ignore */ }
      return res.redirect("/dashboard/admin?tab=database&error=backup_empty");
    }

    // 7) Stream the file to the client, then clean it up immediately so
    //    it doesn't accumulate in /public (and become downloadable by URL guess).
    res.download(outputPath, filename, (err) => {
      try {
        fs.unlinkSync(outputPath);
      } catch (e) {
        console.warn(`[Backup] Could not delete temp file ${outputPath}:`, e);
      }
      if (err) {
        console.error("[Backup] Error streaming file:", err);
      }
    });
  } catch (error) {
    console.error("Error generating database backup:", error);
    res.redirect(
      "/dashboard/admin?tab=database&error=backup_failed&msg=" +
      encodeURIComponent(String((error as Error)?.message || error))
    );
  }
});

// POST Create or Update Membership Plan
router.post("/dashboard/admin/plans", requireAdmin, async (req: Request, res: Response) => {
  const { id, nombre, precio, descripcion, caracteristicas, popular } = req.body;
  try {
    const payload = {
      nombre,
      precio: parseFloat(precio || 0),
      descripcion,
      caracteristicas,
      popular: popular === "true" || popular === true
    };

    if (id) {
      await db.membershipPlan.update({
        where: { id: parseInt(id) },
        data: payload
      });
    } else {
      await db.membershipPlan.create({
        data: payload
      });
    }
    res.redirect("/dashboard/admin?tab=plans");
  } catch (error) {
    console.error("Error saving membership plan:", error);
    res.redirect("/dashboard/admin?tab=plans&error=plan_save_failed");
  }
});

// POST Delete Membership Plan
router.post("/dashboard/admin/plans/delete/:id", requireAdmin, async (req: Request, res: Response) => {
  const planId = parseInt(req.params.id as string);
  try {
    await db.membershipPlan.delete({
      where: { id: planId }
    });
    res.redirect("/dashboard/admin?tab=plans");
  } catch (error) {
    console.error("Error deleting membership plan:", error);
    res.redirect("/dashboard/admin?tab=plans&error=plan_delete_failed");
  }
});

// POST Create or Update Promotion Plan
router.post("/dashboard/admin/promotion-plans", requireAdmin, async (req: Request, res: Response) => {
  const {
    id,
    nombre,
    precio,
    descripcion,
    duracionDias,
    allowCategoryBanner,
    allowHomeBanner,
    allowPrioritySearch,
    allowPopupHome,
    allowPopupCategory,
    allowPopupSpecialty
  } = req.body;
  try {
    const payload = {
      nombre,
      precio: parseFloat(precio || 0),
      descripcion,
      duracionDias: parseInt(duracionDias || 30),
      allowCategoryBanner: allowCategoryBanner === "true" || allowCategoryBanner === true || allowCategoryBanner === "on",
      allowHomeBanner: allowHomeBanner === "true" || allowHomeBanner === true || allowHomeBanner === "on",
      allowPrioritySearch: allowPrioritySearch === "true" || allowPrioritySearch === true || allowPrioritySearch === "on",
      allowPopupHome: allowPopupHome === "true" || allowPopupHome === true || allowPopupHome === "on",
      allowPopupCategory: allowPopupCategory === "true" || allowPopupCategory === true || allowPopupCategory === "on",
      allowPopupSpecialty: allowPopupSpecialty === "true" || allowPopupSpecialty === true || allowPopupSpecialty === "on",
    };

    if (id) {
      await db.promotionPlan.update({
        where: { id: parseInt(id) },
        data: payload
      });
    } else {
      await db.promotionPlan.create({
        data: payload
      });
    }
    res.redirect("/dashboard/admin?tab=promotion-plans&success=promotion_plan_saved");
  } catch (error) {
    console.error("Error saving promotion plan:", error);
    res.redirect("/dashboard/admin?tab=promotion-plans&error=promotion_plan_save_failed");
  }
});

// POST Delete Promotion Plan
router.post("/dashboard/admin/promotion-plans/delete/:id", requireAdmin, async (req: Request, res: Response) => {
  const planId = parseInt(req.params.id as string);
  try {
    await db.promotionPlan.delete({
      where: { id: planId }
    });
    res.redirect("/dashboard/admin?tab=promotion-plans&success=promotion_plan_deleted");
  } catch (error) {
    console.error("Error deleting promotion plan:", error);
    res.redirect("/dashboard/admin?tab=promotion-plans&error=promotion_plan_delete_failed");
  }
});

// POST Create or Update Profile Template
router.post("/dashboard/admin/templates", requireAdmin, async (req: Request, res: Response) => {
  const { id, name, key, description, thumbnail, activo, baseLayout } = req.body;
  try {
    const payload = {
      name,
      key,
      description,
      thumbnail: thumbnail || null,
      activo: activo === "true" || activo === true || req.body.activo !== undefined,
      baseLayout: baseLayout || "default"
    };

    if (id) {
      const templateId = parseInt(id);
      const existing = await getProfileTemplateById(templateId);
      // @ts-ignore
      if (existing && existing.key === "default") {
        // Force key and baseLayout to remain default
        payload.key = "default";
        payload.baseLayout = "default";
      }
      await db.profileTemplate.update({
        where: { id: templateId },
        data: payload
      });
    } else {
      await db.profileTemplate.create({
        data: payload
      });
    }
    res.redirect("/dashboard/admin?tab=templates");
  } catch (error) {
    console.error("Error saving profile template:", error);
    res.redirect("/dashboard/admin?tab=templates&error=template_save_failed");
  }
});

// POST Delete Profile Template
router.post("/dashboard/admin/templates/delete/:id", requireAdmin, async (req: Request, res: Response) => {
  const templateId = parseInt(req.params.id as string);
  try {
    const template = await getProfileTemplateById(templateId);
    // @ts-ignore
    if (!template || template.key === "default") {
      return res.redirect("/dashboard/admin?tab=templates&error=cannot_delete_default");
    }
    await db.profileTemplate.delete({
      where: { id: templateId }
    });
    res.redirect("/dashboard/admin?tab=templates");
  } catch (error) {
    console.error("Error deleting profile template:", error);
    res.redirect("/dashboard/admin?tab=templates&error=template_delete_failed");
  }
});

// POST Approve Payment Request
router.post("/dashboard/admin/payments/approve/:id", requireAdmin, async (req: Request, res: Response) => {
  const paymentId = parseInt(req.params.id as string);
  const isAjax = req.xhr || req.headers.accept?.includes("application/json") || req.query.ajax === "true" || req.body.ajax === true;
  try {
    const payment = await db.paymentRequest.findUnique({
      where: { id: paymentId },
      include: {
        issuer: {
          include: {
            professionalProfile: true
          }
        },
        promotion: {
          include: {
            plan: true
          }
        }
      }
    });

    if (!payment) {
      if (isAjax) return res.status(404).json({ success: false, error: "Pedido no encontrado." });
      return res.redirect("/dashboard/admin?tab=payments&error=payment_not_found");
    }

    // For CERTIFICATE payments, capture user/certificate data BEFORE the transaction
    // so we can send notification emails afterwards.
    let certificateForEmail: { id: number; codigo: string; nombreEvento: string; user: { email: string; name: string } | null } | null = null;
    if (payment.tipo === "CERTIFICATE" && payment.certificateId) {
      certificateForEmail = await db.certificate.findUnique({
        where: { id: payment.certificateId },
        select: {
          id: true,
          codigo: true,
          nombreEvento: true,
          user: { select: { email: true, name: true } },
        },
      });
    }

    // @ts-ignore
    await db.$transaction(async (tx) => {
      // 1. Approve Payment Request
      await tx.paymentRequest.update({
        where: { id: paymentId },
        data: {
          estado: "APROBADO",
          fechaProcesado: new Date()
        }
      });

      // 2. If it is a membership payment, update the professional's subscription
      if (payment.tipo === "MEMBERSHIP" && payment.issuer?.professionalProfile) {
        const profile = payment.issuer.professionalProfile;
        const isPremiumMembership = isPremiumPlanType(profile.planType);

        // Calculate new subscription end date (extend 30 days)
        const currentEnds = profile.subscriptionEnds && new Date(profile.subscriptionEnds) > new Date()
          ? new Date(profile.subscriptionEnds)
          : new Date();
        const newEnds = new Date(currentEnds.getTime() + 30 * 24 * 60 * 60 * 1050); // Adding 30 days in ms (roughly 30 * 24 * 60 * 60 * 1000)

        await tx.professionalProfile.update({
          where: { id: profile.id },
          data: {
            verified: true,
            status: "APROBADO",
            planType: isPremiumMembership ? "PREMIUM" : "VERIFICADO",
            subscriptionEnds: newEnds
          }
        });
      } else if (payment.tipo === "TOPUP" && payment.issuer) {
        // Handle billing balance recharge
        await tx.issuer.update({
          where: { id: payment.issuer.id },
          data: {
            balance: payment.issuer.balance + payment.monto
          }
        });
      } else if (payment.tipo === "CERTIFICATE" && payment.certificateId) {
        // Approve associated academic certificate
        await tx.certificate.update({
          where: { id: payment.certificateId },
          data: {
            estado: "APROBADO"
          }
        });
      } else if (payment.tipo === "PROMOTION" && payment.promotionId && payment.promotion) {
        // Approve and activate professional promotion
        const plan = payment.promotion.plan;
        const now = new Date();
        const endDate = new Date(now.getTime() + plan.duracionDias * 24 * 60 * 60 * 1000);

        await tx.professionalPromotion.update({
          where: { id: payment.promotionId },
          data: {
            status: "ACTIVO",
            startDate: now,
            endDate: endDate
          }
        });
      } else if ((payment.tipo === "BILLING_PLAN" || payment.tipo === "FACTURACION") && payment.issuer?.professionalProfileId) {
        // Approve and activate BillingSubscription for professional
        const profId = payment.issuer.professionalProfileId;
        const pendingSub = await tx.billingSubscription.findFirst({
          where: { profileId: profId, status: "PENDIENTE" },
          orderBy: { createdAt: "desc" }
        });

        if (pendingSub) {
          await tx.billingSubscription.update({
            where: { id: pendingSub.id },
            data: { status: "ACTIVO" }
          });
        } else {
          const plan = await tx.billingPlan.findFirst({
            where: { precio: payment.monto, isActive: true }
          }) || await tx.billingPlan.findFirst({ where: { isActive: true } });

          if (plan) {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + (plan.duracionDias || 30));

            await tx.billingSubscription.create({
              data: {
                profileId: profId,
                planId: plan.id,
                startDate,
                endDate,
                status: "ACTIVO"
              }
            });
          }
        }
      }
    });

    // Send notification emails after the transaction completes (fire-and-forget)
    try {
      if (certificateForEmail?.user?.email) {
        const certEmail = certificateForEmail.user.email;
        const certName = certificateForEmail.user.name || certEmail;

        // 1. Payment registered (manual admin approval)
        emailService
          .sendPaymentRegistered(certEmail, {
            recipientName: certName,
            amount: payment.monto,
            currency: "USD",
            concept: `Certificado: ${certificateForEmail.nombreEvento}`,
            paymentMethod: payment.bancoDestino || "Transferencia",
            paymentDate: new Date().toLocaleDateString("es-EC"),
            reference: payment.referencia,
            transactionId: payment.id?.toString(),
          })
          .catch((err) =>
            console.warn("Error enviando email de pago registrado (admin):", err)
          );

        // 2. Certificate available (the cert just became APROBADO)
        emailService
          .sendCertificateAvailable(certEmail, {
            recipientName: certName,
            eventName: certificateForEmail.nombreEvento,
            certificateUrl: `${process.env.BASE_URL || "http://localhost:3000"}/certificados/${certificateForEmail.codigo}`,
            issuedAt: new Date().toISOString(),
          })
          .catch((err) =>
            console.warn("Error enviando email de certificado disponible (admin):", err)
          );
      }
    } catch (emailErr) {
      console.warn("No se pudo preparar email tras aprobación de pago:", emailErr);
    }

    if (isAjax) return res.json({ success: true, message: "Pago aprobado con éxito." });
    res.redirect("/dashboard/admin?tab=payments&success=payment_approved");
  } catch (error) {
    console.error("Error approving payment request:", error);
    if (isAjax) return res.status(500).json({ success: false, error: "Error al aprobar el pago." });
    res.redirect("/dashboard/admin?tab=payments&error=payment_approve_failed");
  }
});

// POST Reject Payment Request
router.post("/dashboard/admin/payments/reject/:id", requireAdmin, async (req: Request, res: Response) => {
  const paymentId = parseInt(req.params.id as string);
  const isAjax = req.xhr || req.headers.accept?.includes("application/json") || req.query.ajax === "true" || req.body.ajax === true;
  try {
    const payment = await db.paymentRequest.findUnique({
      where: { id: paymentId }
    });

    if (!payment) {
      if (isAjax) return res.status(404).json({ success: false, error: "Pedido no encontrado." });
      return res.redirect("/dashboard/admin?tab=payments&error=payment_not_found");
    }

    // @ts-ignore
    await db.$transaction(async (tx) => {
      await tx.paymentRequest.update({
        where: { id: paymentId },
        data: {
          estado: "RECHAZADO",
          fechaProcesado: new Date()
        }
      });

      if (payment.tipo === "CERTIFICATE" && payment.certificateId) {
        await tx.certificate.update({
          where: { id: payment.certificateId },
          data: {
            estado: "RECHAZADO"
          }
        });

        const cert = await db.certificate.findUnique({
          where: { id: payment.certificateId },
          include: { user: true }
        });
        if (cert?.user?.email) {
          emailService.sendRawEmail({
            to: cert.user.email,
            subject: `Actualización de Pago: Solicitud Rechazada - ${cert.nombreEvento}`,
            html: `<p>Hola ${cert.user.name || "Usuario"},</p><p>Te informamos que tu pago por transferencia de <strong>$${payment.monto.toFixed(2)}</strong> para el certificado de <strong>${cert.nombreEvento}</strong> no ha sido verificado o fue rechazado por la administración.</p><p>Si consideras que se trata de un error o deseas adjuntar un nuevo comprobante, ponte en contacto con soporte.</p>`
          }).catch(err => console.warn("Error enviando email de pago rechazado:", err));
        }
      } else if (payment.tipo === "PROMOTION" && payment.promotionId) {
        await tx.professionalPromotion.update({
          where: { id: payment.promotionId },
          data: {
            status: "RECHAZADO"
          }
        });
      }
    });
    if (isAjax) return res.json({ success: true, message: "Pago rechazado con éxito." });
    res.redirect("/dashboard/admin?tab=payments&success=payment_rejected");
  } catch (error) {
    console.error("Error rejecting payment request:", error);
    if (isAjax) return res.status(500).json({ success: false, error: "Error al rechazar el pago." });
    res.redirect("/dashboard/admin?tab=payments&error=payment_reject_failed");
  }
});

// POST Update Certificate Beneficiary Name
router.post("/dashboard/admin/certificates/:id/nombre", requireAdmin, async (req: Request, res: Response) => {
  const certificateId = parseInt(req.params.id as string);
  const nombre = typeof req.body.nombre === "string" ? req.body.nombre.trim() : "";

  if (isNaN(certificateId)) {
    return res.status(400).json({ success: false, error: "Certificado inválido." });
  }
  if (!nombre) {
    return res.status(400).json({ success: false, error: "El nombre no puede estar vacío." });
  }

  try {
    const certificate = await db.certificate.findUnique({
      where: { id: certificateId }
    });

    if (!certificate) {
      return res.status(404).json({ success: false, error: "Certificado no encontrado." });
    }

    await db.certificate.update({
      where: { id: certificateId },
      data: { nombreUsuario: toTitleCase(nombre) }
    });

    return res.json({ success: true, message: "Nombre del beneficiario actualizado con éxito." });
  } catch (error) {
    console.error("Error updating certificate beneficiary name:", error);
    return res.status(500).json({ success: false, error: "Error al actualizar el nombre del beneficiario." });
  }
});

// Seed default hero carousels if empty
export async function ensureDefaultCarousels() {
  try {
    const count = await db.heroCarousel.count();
    if (count > 0) return;


    // Default homepage slides
    const homeSlides = [
      {
        tipo: "Inicio",
        titulo: "Conectando profesionales de excelencia",
        subtitulo: "El directorio profesional más grande de Ecuador y Latinoamérica.",
        imageUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200",
        orden: 1,
        activo: true
      },
      {
        tipo: "Inicio",
        titulo: "Cursos, conversatorios y capacitación continua",
        subtitulo: "Capacítate con expertos y mantente a la vanguardia en tu área.",
        imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1200",
        orden: 2,
        activo: true
      },
      {
        tipo: "Inicio",
        titulo: "Facturación electrónica integrada al instante",
        subtitulo: "Emite facturas al SRI directamente desde tu panel de control.",
        imageUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=1200",
        orden: 3,
        activo: true
      }
    ];

    for (const slide of homeSlides) {
      await db.heroCarousel.create({ data: slide });
    }

    // Default profession slides
    const professions = await getAllProfessions();
    // @ts-ignore
    for (const prof of professions) {
      let defaultBg = "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1200";
      const nameLower = prof.nombre.toLowerCase();
      if (nameLower.includes("salud") || nameLower.includes("medicina")) {
        defaultBg = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=1200";
      } else if (nameLower.includes("derecho") || nameLower.includes("leyes")) {
        defaultBg = "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=1200";
      } else if (nameLower.includes("finanzas") || nameLower.includes("contabilidad") || nameLower.includes("economía")) {
        defaultBg = "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1200";
      }

      await db.heroCarousel.create({
        data: {
          tipo: "Profesion",
          profesionId: prof.id,
          titulo: prof.nombre,
          subtitulo: prof.descripcion || "Encuentre profesionales acreditados y verifique sus especialidades.",
          imageUrl: defaultBg,
          orden: 1,
          activo: true
        }
      });
    }
  } catch (err) {
    console.error("Error seeding default hero carousels:", err);
  }
}

// Seed default profile templates if empty
export async function ensureDefaultTemplates() {
  try {
    // Migration: rename any legacy 'linkedin' template key/layout to 'ejecutiva'
    try {
      const legacy = await cachedFetch(cacheKey.profileTemplate.byKey("linkedin-legacy"), () =>
        db.profileTemplate.findFirst({
          where: { OR: [{ key: "linkedin" }, { baseLayout: "linkedin" }] }
        })
      );
      if (legacy) {
        await db.profileTemplate.updateMany({
          where: { key: "linkedin" },
          data: {
            key: "ejecutiva",
            name: "Plantilla Ejecutiva",
            baseLayout: "ejecutiva",
            description: "Diseño elegante y formal al estilo de un currículum o perfil ejecutivo con secciones bien distribuidas."
          }
        });
        await db.profileTemplate.updateMany({
          where: { baseLayout: "linkedin" },
          data: { baseLayout: "ejecutiva" }
        });
      }
    } catch (migError) {
      console.error("Migration error (non-fatal):", migError);
    }

    const existing = await getProfileTemplateByKey("default");

    if (!existing) {
      await db.profileTemplate.create({
        data: {
          name: "Plantilla Original",
          key: "default",
          description: "El diseño original del perfil profesional con banner, biografía, servicios y agendamiento de citas.",
          thumbnail: "/default-template.png,/default-template-2.png,/default-template-3.png",
          activo: true,
          baseLayout: "default"
        }
      });
      // @ts-ignore
    } else if (!existing.thumbnail || !existing.thumbnail.includes(",")) {
      await db.profileTemplate.update({
        where: { key: "default" },
        data: {
          thumbnail: "/default-template.png,/default-template-2.png,/default-template-3.png",
          baseLayout: "default"
        }
      });
      // @ts-ignore
    } else if (existing.baseLayout !== "default") {
      await db.profileTemplate.update({
        where: { key: "default" },
        data: { baseLayout: "default" }
      });
    }

    const executivaTpl = await getProfileTemplateByKey("ejecutiva");

    if (!executivaTpl) {
      await db.profileTemplate.create({
        data: {
          name: "Plantilla Ejecutiva",
          key: "ejecutiva",
          description: "Diseño elegante y formal al estilo de un currículum o perfil ejecutivo con secciones bien distribuidas.",
          thumbnail: "/ejecutiva-template.png",
          activo: true,
          baseLayout: "ejecutiva"
        }
      });
      // @ts-ignore
    } else if (executivaTpl.baseLayout !== "ejecutiva") {
      await db.profileTemplate.update({
        where: { key: "ejecutiva" },
        data: { baseLayout: "ejecutiva" }
      });
    }

    const medicaTpl = await getProfileTemplateByKey("medica");

    if (!medicaTpl) {
      await db.profileTemplate.create({
        data: {
          name: "Plantilla Médica",
          key: "medica",
          description: "Diseño premium de estilo médico con cabecera de presentación en curva, foto de perfil destacada, sección de servicios médicos en tarjetas limpias y paleta en tonos azules sanitarios.",
          thumbnail: "/medica-template.png",
          activo: true,
          baseLayout: "medica"
        }
      });
      // @ts-ignore
    } else if (medicaTpl.baseLayout !== "medica") {
      await db.profileTemplate.update({
        where: { key: "medica" },
        data: { baseLayout: "medica" }
      });
    }

    // Seed default CMS pages if not present or invalid
    try {
      const contactPage = await getEditablePageBySlug("contacto");
      let needsContactReset = !contactPage;
      // @ts-ignore
      if (contactPage && contactPage.contenido) {
        try {
          // @ts-ignore
          const parsed = JSON.parse(contactPage.contenido);
          if (!parsed.email || !parsed.telefono) {
            needsContactReset = true;
          }
        } catch (e) {
          needsContactReset = true;
        }
      }

      if (needsContactReset) {
        await db.editablePage.upsert({
          where: { slug: "contacto" },
          update: {
            titulo: "Contáctanos",
            contenido: JSON.stringify({
              email: "info@profesionales.ec",
              telefono: "+593 998 925 381",
              ubicacion: "Quito, Ecuador",
              razones: [
                "Soporte técnico especializado",
                "Consultas sobre preinscripción",
                "Alianzas y convenios"
              ]
            })
          },
          create: {
            slug: "contacto",
            titulo: "Contáctanos",
            contenido: JSON.stringify({
              email: "info@profesionales.ec",
              telefono: "+593 998 925 381",
              ubicacion: "Quito, Ecuador",
              razones: [
                "Soporte técnico especializado",
                "Consultas sobre preinscripción",
                "Alianzas y convenios"
              ]
            })
          }
        });
      }

      const aboutPage = await getEditablePageBySlug("nosotros");
      let needsAboutReset = !aboutPage;
      // @ts-ignore
      if (aboutPage && aboutPage.contenido) {
        try {
          // @ts-ignore
          const parsed = JSON.parse(aboutPage.contenido);
          if (!parsed.mision || !parsed.vision) {
            needsAboutReset = true;
          }
        } catch (e) {
          needsAboutReset = true;
        }
      }

      if (needsAboutReset) {
        await db.editablePage.upsert({
          where: { slug: "nosotros" },
          update: {
            titulo: "Sobre Nosotros",
            contenido: JSON.stringify({
              subtitle: "Somos una plataforma creada para conectar conocimiento, experiencia y oportunidades. Impulsamos la formación continua, la colaboración profesional y el crecimiento de expertos en distintas áreas.",
              mision: "Impulsar el desarrollo profesional en Ecuador y en la región, proporcionando una plataforma de difusión, capacitación y networking basada en altos estándares de calidad, ética y excelencia académica.",
              vision: "Convertirnos en la principal red de profesionales en Ecuador, reconocida por su contribución activa al crecimiento educativo, social y empresarial del país.",
              quienesSomos: "En Profesionales Ecuador creemos en el poder de la excelencia, la educación continua y la colaboración entre expertos.\n\nSomos una plataforma diseñada para conectar a profesionales de diversas áreas con personas, empresas e instituciones que valoran el conocimiento especializado y la formación de calidad.\n\nNuestro propósito es crear un espacio confiable donde el crecimiento profesional y la capacitación sean accesibles para todos.",
              historia: "Profesionales Ecuador nace de la visión compartida del Ing. Terry Mendieta y el Ing. Juan Estrada, quienes identificaron la necesidad de un espacio serio y organizados para conectar a expertos de diferentes áreas.\n\nContamos además con el valioso apoyo del Dr. Luis Gutiérrez en nuestro primer conversatorio, marcando el inicio de esta gran comunidad.\n\nDesde entonces, hemos crecido consolidándonos como un referente en conversatorios, formación continua y eventos de alta calidad.",
              fundadores: [
                { nombre: "Terry Mendieta", cargo: "CEO / Fundador", iniciales: "TM" },
                { nombre: "Juan Estrada", cargo: "CEO / Fundador", iniciales: "JE" }
              ],
              valores: [
                { titulo: "Excelencia", descripcion: "Promovemos siempre lo mejor de cada profesional.", icon: "fa-solid fa-award" },
                { titulo: "Innovación", descripcion: "Apostamos por la mejora continua y el uso de nuevas tecnologías.", icon: "fa-solid fa-lightbulb" },
                { titulo: "Ética", descripcion: "Actuamos con transparencia, respeto y responsabilidad.", icon: "fa-solid fa-shield-halved" },
                { titulo: "Compromiso Social", descripcion: "Buscamos impactar positivamente en nuestra sociedad.", icon: "fa-solid fa-heart" }
              ],
              porQueConfiar: [
                "Somos un espacio de crecimiento y formación continua.",
                "Contamos con una red de expertos evaluados y certificados.",
                "Trabajamos bajo principios éticos y legales que protegen a todos nuestros usuarios.",
                "Nos comprometemos con tu desarrollo personal y profesional."
              ],
              compromiso: [
                "Evaluamos cuidadosamente el perfil de cada profesional antes de su incorporación a la plataforma.",
                "Organizamos conversatorios y eventos con los más altos estándares de calidad.",
                "Fomentamos la actualización constante y la difusión de conocimientos a través de contenidos confiables y pertinentes.",
                "Protegemos y promovemos la imagen de nuestros profesionales, siempre respetando acuerdos claros y transparentes."
              ],
              eventosPolitica: "En cada evento, conversatorio o actividad organizada por Profesionales Ecuador, los participantes autorizan la grabación de audio y video, así como la captura de fotografías.\n\nEstas grabaciones podrán ser utilizadas posteriormente con fines promocionales, educativos o comerciales, sin limitaciones territoriales ni temporales.\n\nImportante: El profesional autoriza de manera gratuita el uso comercial de su imagen, salvo que se llegue a un acuerdo diferente por escrito en algún caso extraordinario. Todos los contenidos generados en nuestros conversatorios son propiedad de Profesionales Ecuador, salvo pacto en contrario formalizado por escrito."
            })
          },
          create: {
            slug: "nosotros",
            titulo: "Sobre Nosotros",
            contenido: JSON.stringify({
              subtitle: "Somos una plataforma creada para conectar conocimiento, experiencia y oportunidades. Impulsamos la formación continua, la colaboración profesional y el crecimiento de expertos en distintas áreas.",
              mision: "Impulsar el desarrollo profesional en Ecuador y en la región, proporcionando una plataforma de difusión, capacitación y networking basada en altos estándares de calidad, ética y excelencia académica.",
              vision: "Convertirnos en la principal red de profesionales en Ecuador, reconocida por su contribución activa al crecimiento educativo, social y empresarial del país.",
              quienesSomos: "En Profesionales Ecuador creemos en el poder de la excelencia, la educación continua y la colaboración entre expertos.\n\nSomos una plataforma diseñada para conectar a profesionales de diversas áreas con personas, empresas e instituciones que valoran el conocimiento especializado y la formación de calidad.\n\nNuestro propósito es crear un espacio confiable donde el crecimiento profesional y la capacitación sean accesibles para todos.",
              historia: "Profesionales Ecuador nace de la visión compartida del Ing. Terry Mendieta y el Ing. Juan Estrada, quienes identificaron la necesidad de un espacio serio y organizados para conectar a expertos de diferentes áreas.\n\nContamos además con el valioso apoyo del Dr. Luis Gutiérrez en nuestro primer conversatorio, marcando el inicio de esta gran comunidad.\n\nDesde entonces, hemos crecido consolidándonos como un referente en conversatorios, formación continua y eventos de alta calidad.",
              fundadores: [
                { nombre: "Terry Mendieta", cargo: "CEO / Fundador", iniciales: "TM" },
                { nombre: "Juan Estrada", cargo: "CEO / Fundador", iniciales: "JE" }
              ],
              valores: [
                { titulo: "Excelencia", descripcion: "Promovemos siempre lo mejor de cada profesional.", icon: "fa-solid fa-award" },
                { titulo: "Innovación", descripcion: "Apostamos por la mejora continua y el uso de nuevas tecnologías.", icon: "fa-solid fa-lightbulb" },
                { titulo: "Ética", descripcion: "Actuamos con transparencia, respeto y responsabilidad.", icon: "fa-solid fa-shield-halved" },
                { titulo: "Compromiso Social", descripcion: "Buscamos impactar positivamente en nuestra sociedad.", icon: "fa-solid fa-heart" }
              ],
              porQueConfiar: [
                "Somos un espacio de crecimiento y formación continua.",
                "Contamos con una red de expertos evaluados y certificados.",
                "Trabajamos bajo principios éticos y legales que protegen a todos nuestros usuarios.",
                "Nos comprometemos con tu desarrollo personal y profesional."
              ],
              compromiso: [
                "Evaluamos cuidadosamente el perfil de cada profesional antes de su incorporación a la plataforma.",
                "Organizamos conversatorios y eventos con los más altos estándares de calidad.",
                "Fomentamos la actualización constante y la difusión de conocimientos a través de contenidos confiables y pertinentes.",
                "Protegemos y promovemos la imagen de nuestros profesionales, siempre respetando acuerdos claros y transparentes."
              ],
              eventosPolitica: "En cada evento, conversatorio o actividad organizada por Profesionales Ecuador, los participantes autorizan la grabación de audio y video, así como la captura de fotografías.\n\nEstas grabaciones podrán ser utilizadas posteriormente con fines promocionales, educativos o comerciales, sin limitaciones territoriales ni temporales.\n\nImportante: El profesional autoriza de manera gratuita el uso comercial de su imagen, salvo que se llegue a un acuerdo diferente por escrito en algún caso extraordinario. Todos los contenidos generados en nuestros conversatorios son propiedad de Profesionales Ecuador, salvo pacto en contrario formalizado por escrito."
            })
          }
        });
      }

      const faqPage = await getEditablePageBySlug("faq");
      let needsFaqReset = !faqPage;
      // @ts-ignore
      if (faqPage && faqPage.contenido) {
        try {
          // @ts-ignore
          const parsed = JSON.parse(faqPage.contenido);
          if (!parsed.prof || !parsed.eventos) {
            needsFaqReset = true;
          }
        } catch (e) {
          needsFaqReset = true;
        }
      }
      if (needsFaqReset) {
        await db.editablePage.upsert({
          where: { slug: "faq" },
          update: {
            titulo: "Preguntas Frecuentes",
            contenido: JSON.stringify({
              prof: [
                { q: "¿Qué es Profesionales.ec?", a: "Es una plataforma digital diseñada para conectar profesionales de diversas áreas con potenciales clientes y empresas en todo el Ecuador." },
                { q: "¿Registro?", a: "Puedes registrarte haciendo clic en el botón 'Registrarse' en la parte superior derecha, completando tu perfil y subiendo tus datos de contacto." },
                { q: "¿Costo?", a: "El registro básico de perfil es gratuito. También ofrecemos planes premium y servicios adicionales de visibilidad y agendamiento de citas." }
              ],
              eventos: [
                { q: "¿Conversatorios?", a: "Son conferencias y charlas científicas dictadas por profesionales expertos para capacitar y compartir conocimiento de alta calidad." },
                { q: "¿Inscripción?", a: "Busca el conversatorio en la sección de Educación, selecciona 'Inscribirse' y realiza el pago con tarjeta o transferencia bancaria." },
                { q: "¿Certificado?", a: "Sí, todos nuestros conversatorios y cursos otorgan un certificado de participación con código QR de verificación único." }
              ]
            })
          },
          create: {
            slug: "faq",
            titulo: "Preguntas Frecuentes",
            contenido: JSON.stringify({
              prof: [
                { q: "¿Qué es Profesionales.ec?", a: "Es una plataforma digital diseñada para conectar profesionales de diversas áreas con potenciales clientes y empresas en todo el Ecuador." },
                { q: "¿Registro?", a: "Puedes registrarte haciendo clic en el botón 'Registrarse' en la parte superior derecha, completando tu perfil y subiendo tus datos de contacto." },
                { q: "¿Costo?", a: "El registro básico de perfil es gratuito. También ofrecemos planes premium y servicios adicionales de visibilidad y agendamiento de citas." }
              ],
              eventos: [
                { q: "¿Conversatorios?", a: "Son conferencias y charlas científicas dictadas por profesionales expertos para capacitar y compartir conocimiento de alta calidad." },
                { q: "¿Inscripción?", a: "Busca el conversatorio en la sección de Educación, selecciona 'Inscribirse' y realiza el pago con tarjeta o transferencia bancaria." },
                { q: "¿Certificado?", a: "Sí, todos nuestros conversatorios y cursos otorgan un certificado de participación con código QR de verificación único." }
              ]
            })
          }
        });
      }
    } catch (cmsSeederError) {
      console.error("Error seeding default CMS pages:", cmsSeederError);
    }
  } catch (error) {
    console.error("Error seeding default templates:", error);
  }
}

// POST Save Certificate Design (Admin only)
router.post("/dashboard/admin/certificados/diseno", requireAdmin, async (req: Request, res: Response) => {
  const {
    conversatorioId,
    cursoId,
    nombreEvento,
    horas,
    precioActivo,
    precioFinalizado,
    firmaTexto,
    firmaImagen,
    plantillaFondo,
    firmasJson,
    avalesJson
  } = req.body;

  const convId = conversatorioId ? parseInt(conversatorioId as string) : null;
  const cursId = cursoId ? parseInt(cursoId as string) : null;
  const numHoras = Math.max(0, parseInt(horas as string) || 0);
  const pActivo = parseFloat(precioActivo as string) || 0.0;
  const pFinalizado = parseFloat(precioFinalizado as string) || 0.0;

  try {
    let firmaImagenUrl = firmaImagen || null;
    let plantillaFondoUrl = plantillaFondo || null;

    if (firmaImagen && (firmaImagen.startsWith("data:") || firmaImagen.length > 200)) {
      try {
        firmaImagenUrl = await uploadBase64ToCloudinary(firmaImagen, "certificados/firmas");
      } catch (e) {
        console.error("Error uploading signature to Cloudinary:", e);
      }
    }

    if (plantillaFondo && (plantillaFondo.startsWith("data:") || plantillaFondo.length > 200)) {
      try {
        plantillaFondoUrl = await uploadBase64ToCloudinary(plantillaFondo, "certificados/fondos");
      } catch (e) {
        console.error("Error uploading template background to Cloudinary:", e);
      }
    }

    if (convId) {
      await db.certificateDesign.upsert({
        where: { conversatorioId: convId },
        update: {
          nombreEvento,
          horas: numHoras,
          precioActivo: pActivo,
          precioFinalizado: pFinalizado,
          firmaTexto: firmaTexto || null,
          firmaImagen: firmaImagenUrl,
          plantillaFondo: plantillaFondoUrl,
          firmasJson: firmasJson || null,
          avalesJson: avalesJson || null
        },
        create: {
          conversatorioId: convId,
          nombreEvento,
          horas: numHoras,
          precioActivo: pActivo,
          precioFinalizado: pFinalizado,
          firmaTexto: firmaTexto || null,
          firmaImagen: firmaImagenUrl,
          plantillaFondo: plantillaFondoUrl,
          firmasJson: firmasJson || null,
          avalesJson: avalesJson || null
        }
      });
      res.redirect("/dashboard/admin?tab=conversatorios&success=design_saved");
    } else if (cursId) {
      await db.certificateDesign.upsert({
        where: { cursoId: cursId },
        update: {
          nombreEvento,
          horas: numHoras,
          precioActivo: pActivo,
          precioFinalizado: pFinalizado,
          firmaTexto: firmaTexto || null,
          firmaImagen: firmaImagenUrl,
          plantillaFondo: plantillaFondoUrl,
          firmasJson: firmasJson || null,
          avalesJson: avalesJson || null
        },
        create: {
          cursoId: cursId,
          nombreEvento,
          horas: numHoras,
          precioActivo: pActivo,
          precioFinalizado: pFinalizado,
          firmaTexto: firmaTexto || null,
          firmaImagen: firmaImagenUrl,
          plantillaFondo: plantillaFondoUrl,
          firmasJson: firmasJson || null,
          avalesJson: avalesJson || null
        }
      });
      res.redirect("/dashboard/admin?tab=cursos&success=design_saved");
    } else {
      res.redirect("/dashboard/admin?error=invalid_event");
    }
  } catch (error) {
    console.error("Error saving certificate design:", error);
    res.redirect("/dashboard/admin?error=design_save_failed");
  }
});

// POST Route: Enroll to a Conversatorio (PROGRAMADO, ACTIVO, or FINALIZADO)
router.post("/conversatorios/:id/inscribirse", async (req: Request, res: Response) => {
  const conversatorioId = parseInt(req.params.id as string);
  const isAjax = req.body.ajax || req.headers.accept?.includes("application/json");

  if (!res.locals.user) {
    if (isAjax) return res.status(401).json({ success: false, error: "Inicie sesión para continuar." });
    return res.redirect(`/login?redirect=/conversatorios/${conversatorioId}&error=auth_required`);
  }
  const userId = res.locals.user.id;

  try {
    const conversatorio = await db.conversatorio.findUnique({
      where: { id: conversatorioId },
      include: { speakers: true, certificateDesign: true }
    });

    if (!conversatorio) {
      if (isAjax) return res.status(404).json({ success: false, error: "Conversatorio no encontrado." });
      return res.redirect(`/eventos?error=event_not_found`);
    }

    if (!conversatorio.gratuito) {
      if (isAjax) return res.status(400).json({ success: false, error: "Este conversatorio requiere adquirir pase." });
      return res.redirect(`/conversatorios/${conversatorioId}?error=payment_required`);
    }

    // Always create EventEnrollment
    await db.eventEnrollment.upsert({
      where: {
        userId_conversatorioId: {
          userId,
          conversatorioId
        }
      },
      update: {},
      create: {
        userId,
        conversatorioId
      }
    });

    // Auto-create certificate only if immediate mode is explicitly enabled
    const isImmediateCert = conversatorio.certificadoInmediato === true;
    if (isImmediateCert) {
      const existingCert = await db.certificate.findFirst({
        where: { userId, conversatorioId }
      });
      if (!existingCert) {
        const design = conversatorio.certificateDesign;
        const horasVal = design?.horas ?? 40;
        const eventNameVal = design?.nombreEvento ?? conversatorio.titulo;
        const codigoCertificado = "CERT-" + Math.random().toString(36).substring(2, 10).toUpperCase() + "-" + conversatorioId;

        await db.certificate.create({
          data: {
            userId,
            conversatorioId,
            codigo: codigoCertificado,
            horas: horasVal,
            nombreEvento: eventNameVal,
            nombreUsuario: toTitleCase(res.locals.user.nombreCertificado || res.locals.user.name || "Participante"),
            precioPagado: 0.00,
            estado: "APROBADO"
          }
        });
      }
    }

    const firstSpeakerId = conversatorio.speakers && conversatorio.speakers.length > 0 ? conversatorio.speakers[0].id : null;
    const redirectUrl = firstSpeakerId ? `/conversatorios/${conversatorioId}/ponentes/${firstSpeakerId}` : `/conversatorios/${conversatorioId}?success=enrolled`;

    if (isAjax) {
      return res.json({ success: true, redirect: redirectUrl });
    }
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Error in enrollment:", error);
    if (isAjax) return res.status(500).json({ success: false, error: "Error procesando la inscripción." });
    res.redirect(`/conversatorios/${conversatorioId}?error=enrollment_failed`);
  }
});

// POST Route: Buy Certificate for a Conversatorio (ACTIVO/FINALIZADO)
router.post("/conversatorios/:id/comprar-certificado", async (req: Request, res: Response) => {
  const conversatorioId = parseInt(req.params.id as string);
  const isAjax = req.body.ajax || req.headers.accept?.includes("application/json");

  if (!res.locals.user) {
    if (isAjax) {
      return res.status(401).json({ success: false, error: "Inicie sesión para continuar." });
    }
    return res.redirect(`/login?redirect=/conversatorios/${conversatorioId}&error=auth_required`);
  }
  const userId = res.locals.user.id;
  const { paymentMethod, reference, banco, nombreUsuario, comprobante } = req.body;

  try {
    const conversatorio = await db.conversatorio.findUnique({
      where: { id: conversatorioId },
      include: { certificateDesign: true }
    });

    if (!conversatorio) {
      if (isAjax) return res.status(404).json({ success: false, error: "Conversatorio no encontrado." });
      return res.redirect(`/eventos?error=event_not_found`);
    }

    if (conversatorio.estado === "PROGRAMADO") {
      if (isAjax) return res.status(400).json({ success: false, error: "El evento aún no inicia." });
      return res.redirect(`/conversatorios/${conversatorioId}?error=not_active_yet`);
    }

    const design = conversatorio.certificateDesign;
    let price = conversatorio.gratuito ? 0.00 : (conversatorio.precio ?? 0.00);

    let certEstado = "APROBADO";
    const isTransfer = paymentMethod === "transferencia" || paymentMethod === "transfer";
    let uploadedComprobante = null;
    let selectedBankAccount: Awaited<ReturnType<typeof findActiveBankAccountById>> = null;

    // PayPhone se procesa exclusively a través de la pasarela real (/api/payphone/prepare).
    if (paymentMethod === "payphone") {
      if (isAjax) {
        return res.status(400).json({
          success: false,
          error: "El pago con PayPhone debe realizarse a través de la pasarela de pago. Por favor, use el botón de PayPhone."
        });
      }
      return res.redirect(`/conversatorios/${conversatorioId}?error=payphone_gateway_required`);
    }

    if (paymentMethod === "gratuito") {
      if (!conversatorio.gratuito) {
        if (isAjax) return res.status(400).json({ success: false, error: "Este certificado no es gratuito." });
        return res.redirect(`/conversatorios/${conversatorioId}?error=invalid_payment_method`);
      }
      price = 0.00;
    } else if (isTransfer) {
      certEstado = "PENDIENTE";
      const activeBankAccounts = await getActiveBankAccounts();
      if (activeBankAccounts.length > 0) {
        const bankAccountId = parseSubmittedBankAccountId(req.body);
        if (!bankAccountId) {
          if (isAjax) return res.status(400).json({ success: false, error: "Seleccione la cuenta bancaria de destino para la transferencia." });
          return res.redirect(`/conversatorios/${conversatorioId}?error=missing_bank_account`);
        }

        selectedBankAccount = await findActiveBankAccountById(db, bankAccountId);
        if (!selectedBankAccount) {
          if (isAjax) return res.status(400).json({ success: false, error: "La cuenta bancaria seleccionada no está disponible." });
          return res.redirect(`/conversatorios/${conversatorioId}?error=invalid_bank_account`);
        }
      }

      if (!comprobante) {
        if (isAjax) return res.status(400).json({ success: false, error: "Por favor, suba la captura de su comprobante de pago." });
        return res.redirect(`/conversatorios/${conversatorioId}?error=missing_receipt`);
      }
      try {
        uploadedComprobante = await uploadBase64ToCloudinary(comprobante, "comprobantes");
      } catch (uploadErr) {
        console.error("Error subiendo comprobante a Cloudinary:", uploadErr);
        if (isAjax) return res.status(500).json({ success: false, error: "Error al cargar la captura del comprobante." });
        return res.redirect(`/conversatorios/${conversatorioId}?error=receipt_upload_failed`);
      }
    }

    // Always ensure EventEnrollment exists so user has full access to videos and classroom
    await db.eventEnrollment.upsert({
      where: {
        userId_conversatorioId: {
          userId,
          conversatorioId
        }
      },
      update: {},
      create: {
        userId,
        conversatorioId
      }
    });

    const isImmediateCert = conversatorio.certificadoInmediato === true;
    let certificate: Awaited<ReturnType<typeof db.certificate.create>> | null = null;

    if (isImmediateCert || (isTransfer && certEstado === "PENDIENTE")) {
      const horasVal = design?.horas ?? 40;
      const eventNameVal = design?.nombreEvento ?? conversatorio.titulo;
      const codigoCertificado = "CERT-" + Math.random().toString(36).substring(2, 10).toUpperCase() + "-" + conversatorioId;

      const rawNombreUsuario = nombreUsuario || res.locals.user.nombreCertificado || res.locals.user.name || "Participante";
      const formattedNombre = toTitleCase(rawNombreUsuario);

      certificate = await db.certificate.create({
        data: {
          userId,
          conversatorioId,
          codigo: codigoCertificado,
          horas: horasVal,
          nombreEvento: eventNameVal,
          nombreUsuario: formattedNombre,
          precioPagado: price,
          estado: certEstado
        }
      });
    }

    // Send certificate email if certificate was created (requested if PENDIENTE, available if APROBADO)
    if (certificate) {
      try {
        const certUser = res.locals.user;
        const eventNameVal = certificate.nombreEvento;
        const codigoCertificado = certificate.codigo;
        if (certUser?.email) {
          if (certEstado === "PENDIENTE") {
            emailService
              .sendCertificateRequested(certUser.email, {
                recipientName: certUser.name || certUser.email,
                eventName: eventNameVal,
                requestId: certificate.id,
                requestDate: new Date().toLocaleDateString("es-EC"),
              })
              .catch((err) =>
                console.warn("Error enviando email de certificado solicitado (conversatorio):", err)
              );
          } else if (certEstado === "APROBADO") {
            emailService
              .sendCertificateAvailable(certUser.email, {
                recipientName: certUser.name || certUser.email,
                eventName: eventNameVal,
                certificateUrl: `${process.env.BASE_URL || "http://localhost:3000"}/certificados/${codigoCertificado}`,
                issuedAt: new Date().toISOString(),
              })
              .catch((err) =>
                console.warn("Error enviando email de certificado disponible (conversatorio):", err)
              );
          }
        }
      } catch (emailErr) {
        console.warn("No se pudo preparar email de certificado (conversatorio):", emailErr);
      }
    }

    // Create PaymentRequest for tracking if transfer
    if (isTransfer && certificate) {
      const bankAccountLabel = selectedBankAccount ? formatBankAccountLabel(selectedBankAccount) : null;

      await db.paymentRequest.create({
        data: {
          ruc: "9999999999001",
          razonSocial: nombreUsuario || res.locals.user.nombreCertificado || res.locals.user.name,
          monto: price,
          tipo: "CERTIFICATE",
          referencia: reference || "S/N",
          bancoDestino: bankAccountLabel || banco || "Transferencia",
          comprobante: uploadedComprobante,
          estado: "PENDIENTE",
          certificateId: certificate.id,
          bankAccountId: selectedBankAccount?.id ?? null,
          bankAccountSnapshot: selectedBankAccount ? buildBankAccountSnapshot(selectedBankAccount) : undefined,
          bankAccountLabel: bankAccountLabel ?? null
        }
      });
    }

    const successParam = isTransfer ? "certificate_pending" : (isImmediateCert ? "certificate_acquired" : "enrolled");
    const redirectUrl = isImmediateCert || isTransfer ? `/conversatorios/${conversatorioId}?success=${successParam}` : `/conversatorios/${conversatorioId}?success=enrolled`;
    if (isAjax) {
      return res.json({ success: true, redirect: redirectUrl });
    }
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Error buying certificate:", error);
    if (isAjax) return res.status(500).json({ success: false, error: "Error procesando la solicitud." });
    res.redirect(`/conversatorios/${conversatorioId}?error=purchase_failed`);
  }
});

// GET Route: Download Certificate PDF using the same EJS template and print CSS as the browser view.
router.get("/certificados/:codigo/descargar.pdf", async (req: Request, res: Response) => {
  const { codigo } = req.params;
  let browser: Browser | undefined;

  try {
    const certificate = await db.certificate.findUnique({
      where: { codigo: codigo as string },
      include: {
        user: true,
        conversatorio: {
          include: { certificateDesign: true }
        },
        curso: {
          include: { certificateDesign: true }
        }
      }
    });

    if (!certificate) {
      return res.status(404).send("Certificado no encontrado");
    }

    if (certificate.conversatorio && certificate.conversatorio.estado === "PROGRAMADO") {
      return res.status(403).send("El conversatorio aún está en estado PROGRAMADO. No se pueden generar o descargar certificados hasta que el evento finalice.");
    }

    const design = certificate.conversatorio?.certificateDesign || certificate.curso?.certificateDesign;
    certificate.nombreUsuario = toTitleCase(certificate.nombreUsuario || certificate.user?.name || "Participante");

    const html = await new Promise<string>((resolve, reject) => {
      res.app.render("certificado", {
        title: `Certificado Académico - ${certificate.codigo}`,
        certificate,
        design,
        layout: false
      }, (error, renderedHtml) => {
        if (error) return reject(error);
        resolve(renderedHtml);
      });
    });

    browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.emulateMediaType("print");
    await page.setContent(html, { waitUntil: "load", timeout: 60_000 });
    await page.waitForNetworkIdle({ timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready);

    const pdf = await page.pdf({
      width: CERTIFICATE_PDF_SIZE.width,
      height: CERTIFICATE_PDF_SIZE.height,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      printBackground: true,
      preferCSSPageSize: true
    });

    res.attachment(`certificado-${certificate.codigo}.pdf`);
    res.type("application/pdf");
    return res.send(Buffer.from(pdf));
  } catch (error) {
    console.error("Error downloading certificate PDF:", error);
    return res.status(500).send("Error interno al generar el PDF del certificado");
  } finally {
    await browser?.close();
  }
});

// GET Route: Alias redirect for /certificados/ver/:codigo
router.get("/certificados/ver/:codigo", (req: Request, res: Response) => {
  const codeParam = String(req.params.codigo || "");
  res.redirect(`/certificados/${encodeURIComponent(codeParam)}`);
});

// GET Route: View Certificate (Premium Design)
router.get("/certificados/:codigo", async (req: Request, res: Response) => {
  const { codigo } = req.params;
  try {
    const certificate = await db.certificate.findUnique({
      where: { codigo: codigo as string },
      include: {
        user: true,
        conversatorio: {
          include: { certificateDesign: true }
        },
        curso: {
          include: { certificateDesign: true }
        }
      }
    });

    if (!certificate) {
      return res.status(404).send("Certificado no encontrado");
    }

    const design = certificate.conversatorio?.certificateDesign || certificate.curso?.certificateDesign;

    // Apply Title Case styling dynamically to correct database inconsistencies
    const rawName = certificate.nombreUsuario || certificate.user?.name || "Participante";
    certificate.nombreUsuario = toTitleCase(rawName);

    res.render("certificado", {
      title: `Certificado Académico - ${certificate.codigo}`,
      certificate,
      design,
      layout: false
    });
  } catch (error) {
    console.error("Error viewing certificate:", error);
    res.status(500).send("Error interno al cargar el certificado");
  }
});

// GET Route: Validate Certificate AJAX
router.get("/api/certificados/validar/:codigo", async (req: Request, res: Response) => {
  const { codigo } = req.params;
  try {
    const certificate = await db.certificate.findUnique({
      where: { codigo: codigo as string },
      include: {
        user: true
      }
    });

    if (!certificate) {
      return res.status(404).json({ success: false, error: "Certificado no encontrado o código no válido." });
    }

    if (certificate.estado !== "APROBADO") {
      return res.status(400).json({ success: false, error: "El certificado existe pero aún no ha sido aprobado." });
    }

    res.json({
      success: true,
      certificate: {
        codigo: certificate.codigo,
        nombreUsuario: toTitleCase(certificate.nombreUsuario || certificate.user?.name || "Participante"),
        nombreEvento: certificate.nombreEvento,
        horas: certificate.horas,
        fechaEmision: certificate.fechaEmision,
        estado: certificate.estado
      }
    });
  } catch (error) {
    console.error("Error validating certificate:", error);
    res.status(500).json({ success: false, error: "Error interno al validar el certificado." });
  }
});

// POST Approve Role Transition Request (Student/Client -> Professional)
router.post("/dashboard/admin/role-transitions/approve/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const { adminObservacion } = req.body;
  try {
    const updatedRequest = await StudentService.approveRoleTransition(id, adminObservacion);
    const targetUser = await db.user.findUnique({ where: { id: updatedRequest.userId } });
    if (targetUser) {
      emailService.sendProfessionalApproved(targetUser.email, {
        recipientName: targetUser.name,
        professionalName: targetUser.name,
        professionalId: targetUser.id
      }).catch(err => console.warn("Error enviando email de aprobacion de cambio de rol:", err));
    }
    res.redirect("/dashboard/admin?tab=role-transitions&success=transition_approved");
  } catch (error: any) {
    console.error("Error approving role transition:", error);
    res.redirect(`/dashboard/admin?tab=role-transitions&error=${encodeURIComponent(error.message || "Error al aprobar transición")}`);
  }
});

// POST Reject Role Transition Request
router.post("/dashboard/admin/role-transitions/reject/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const { adminObservacion } = req.body;
  try {
    const updatedRequest = await StudentService.rejectRoleTransition(id, adminObservacion);
    const targetUser = await db.user.findUnique({ where: { id: updatedRequest.userId } });
    if (targetUser) {
      emailService.sendProfessionalRejected(targetUser.email, {
        recipientName: targetUser.name,
        professionalName: targetUser.name,
        supportEmail: process.env.SUPPORT_EMAIL || "soporte@profesionales.ec"
      }).catch(err => console.warn("Error enviando email de rechazo de cambio de rol:", err));
    }
    res.redirect("/dashboard/admin?tab=role-transitions&success=transition_rejected");
  } catch (error: any) {
    console.error("Error rejecting role transition:", error);
    res.redirect(`/dashboard/admin?tab=role-transitions&error=${encodeURIComponent(error.message || "Error al rechazar transición")}`);
  }
});

// POST Toggle Student Account Status (ACTIVE / SUSPENDED)
router.post("/dashboard/admin/students/status/:id", requireAdmin, async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id as string);
  const { status } = req.body;
  try {
    const targetStatus = status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
    await StudentService.toggleStudentAccountStatus(userId, targetStatus);
    res.redirect(`/dashboard/admin?tab=students&success=student_status_${targetStatus.toLowerCase()}`);
  } catch (error: any) {
    console.error("Error toggling student account status:", error);
    res.redirect(`/dashboard/admin?tab=students&error=${encodeURIComponent(error.message || "Error al cambiar estado")}`);
  }
});

// POST Delete Student Account
router.post("/dashboard/admin/students/delete/:id", requireAdmin, async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id as string, 10);
  try {
    await StudentService.deleteStudentAccount(userId);
    res.redirect("/dashboard/admin?tab=students&success=student_deleted");
  } catch (error: any) {
    console.error("Error deleting student account:", error);
    res.redirect(`/dashboard/admin?tab=students&error=${encodeURIComponent(error.message || "Error al eliminar estudiante")}`);
  }
});

// -------------------------------------------------------------
// GESTIÓN DE UNIVERSIDADES E INSTITUTOS SUPERIORES (ADMIN)
// -------------------------------------------------------------

// POST Crear Universidad / Instituto
router.post("/dashboard/admin/universities", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { nombre, siglas, tipo, provincia, ciudad, sitioWeb, orden } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.redirect("/dashboard/admin?tab=universities&error=nombre_required");
    }

    const parsedOrden = parseInt(orden as string, 10);
    const finalOrden = !isNaN(parsedOrden) ? parsedOrden : 0;

    await db.university.create({
      data: {
        nombre: nombre.trim(),
        siglas: siglas?.trim() || null,
        tipo: tipo === "INSTITUTO_SUPERIOR" ? "INSTITUTO_SUPERIOR" : "UNIVERSIDAD",
        provincia: provincia?.trim() || null,
        ciudad: ciudad?.trim() || null,
        sitioWeb: sitioWeb?.trim() || null,
        orden: finalOrden,
        activo: true
      }
    });

    res.redirect("/dashboard/admin?tab=universities&success=university_created");
  } catch (error: any) {
    console.error("Error creating university:", error);
    res.redirect(`/dashboard/admin?tab=universities&error=${encodeURIComponent(error.message || "Error al crear institución")}`);
  }
});

// POST Editar Universidad / Instituto
router.post("/dashboard/admin/universities/:id/edit", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  try {
    const { nombre, siglas, tipo, provincia, ciudad, sitioWeb, orden } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.redirect("/dashboard/admin?tab=universities&error=nombre_required");
    }

    const parsedOrden = parseInt(orden as string, 10);
    const finalOrden = !isNaN(parsedOrden) ? parsedOrden : 0;

    await db.university.update({
      where: { id },
      data: {
        nombre: nombre.trim(),
        siglas: siglas?.trim() || null,
        tipo: tipo === "INSTITUTO_SUPERIOR" ? "INSTITUTO_SUPERIOR" : "UNIVERSIDAD",
        provincia: provincia?.trim() || null,
        ciudad: ciudad?.trim() || null,
        sitioWeb: sitioWeb?.trim() || null,
        orden: finalOrden
      }
    });

    res.redirect("/dashboard/admin?tab=universities&success=university_updated");
  } catch (error: any) {
    console.error("Error updating university:", error);
    res.redirect(`/dashboard/admin?tab=universities&error=${encodeURIComponent(error.message || "Error al actualizar institución")}`);
  }
});

// POST Toggle Estado (Activo/Inactivo)
router.post("/dashboard/admin/universities/:id/toggle", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  try {
    const university = await db.university.findUnique({ where: { id } });
    if (university) {
      await db.university.update({
        where: { id },
        data: { activo: !university.activo }
      });
    }
    res.redirect("/dashboard/admin?tab=universities&success=university_toggled");
  } catch (error: any) {
    console.error("Error toggling university status:", error);
    res.redirect(`/dashboard/admin?tab=universities&error=${encodeURIComponent(error.message || "Error al cambiar estado")}`);
  }
});

// POST Eliminar Universidad / Instituto
router.post("/dashboard/admin/universities/:id/delete", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  try {
    await db.university.delete({ where: { id } });
    res.redirect("/dashboard/admin?tab=universities&success=university_deleted");
  } catch (error: any) {
    console.error("Error deleting university:", error);
    res.redirect(`/dashboard/admin?tab=universities&error=${encodeURIComponent(error.message || "Error al eliminar institución")}`);
  }
});

// =============================================================
// SUPERPODERES DE ADMINISTRACIÓN & SOPORTE TÉCNICO EN VIVO
// =============================================================

// GET: Obtener todos los datos de perfil de un usuario (para modal de edicion total)
router.get("/dashboard/admin/users/:userId/full-data", requireAdmin, async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId as string);
  if (isNaN(userId)) {
    return res.status(400).json({ success: false, error: "ID de usuario inválido" });
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        professionalProfile: {
          include: {
            services: true,
            products: true,
            schedules: true,
            specialties: {
              include: {
                specialty: {
                  include: {
                    profession: true
                  }
                }
              }
            }
          }
        },
        studentProfile: {
          include: {
            university: true,
            projects: true,
            externalCourses: true,
            experiences: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: "Usuario no encontrado" });
    }

    // Buscar también si tiene registro de cliente para facturación
    let clientBilling = null;
    if (user.email) {
      clientBilling = await db.client.findFirst({
        where: { mail: user.email }
      });
    }

    const [allRoles, allUniversities, allProfessions] = await Promise.all([
      db.role.findMany({ orderBy: { id: "asc" } }),
      db.university.findMany({ where: { activo: true }, orderBy: { orden: "asc" } }),
      db.profession.findMany({
        orderBy: { orden: "asc" },
        include: { specialties: { orderBy: { orden: "asc" } } }
      })
    ]);

    // Sanitizar contraseña antes de enviar JSON
    const safeUser = { ...user };
    delete (safeUser as any).password;

    return res.json({
      success: true,
      user: safeUser,
      clientBilling,
      allRoles,
      allUniversities,
      allProfessions
    });
  } catch (error: any) {
    console.error("Error fetching full user data for admin:", error);
    return res.status(500).json({ success: false, error: error.message || "Error al cargar datos del usuario" });
  }
});

// POST: Actualización Integral de cualquier Usuario y sus Perfiles
router.post("/dashboard/admin/users/:userId/update-full-profile", requireAdmin, async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId as string);
  if (isNaN(userId)) {
    return res.redirect("/dashboard/admin?tab=accounts&error=ID+inválido");
  }

  const {
    name,
    email,
    telefono,
    ciudad,
    nombreCertificado,
    status,
    roleId,
    newPassword,
    requireProfileSetup,
    // Datos Profesional
    prof_titulo,
    prof_slogan,
    prof_bio,
    prof_provincia,
    prof_ciudad,
    prof_direccion,
    prof_cedula,
    prof_telefono,
    prof_tarifa,
    prof_whatsapp,
    prof_status,
    prof_verified,
    prof_planType,
    prof_codigoSenescyt,
    prof_senescytVerificado,
    prof_facebook,
    prof_instagram,
    prof_linkedin,
    prof_tiktok,
    prof_youtube,
    prof_website,
    // Datos Estudiante
    stud_universityId,
    stud_carrera,
    stud_nivelSemestre,
    stud_carnetEstudiante,
    stud_verificadoInstitucional,
    stud_biografia,
    stud_habilidades,
    stud_linkedin,
    stud_github,
    stud_portfolioWebsite,
    // Datos Facturación Cliente
    client_tipoIdentificacion,
    client_identificacion,
    client_direccion
  } = req.body;

  try {
    const existingUser = await db.user.findUnique({
      where: { id: userId },
      include: { role: true, professionalProfile: true, studentProfile: true }
    });

    if (!existingUser) {
      return res.redirect("/dashboard/admin?tab=accounts&error=Usuario+no+encontrado");
    }

    // Prepare User update data
    const userUpdateData: any = {};
    if (name) userUpdateData.name = name.trim();
    if (email) userUpdateData.email = email.trim().toLowerCase();
    if (telefono !== undefined) userUpdateData.telefono = telefono ? telefono.trim() : null;
    if (ciudad !== undefined) userUpdateData.ciudad = ciudad ? ciudad.trim() : null;
    if (nombreCertificado !== undefined) userUpdateData.nombreCertificado = nombreCertificado ? nombreCertificado.trim() : null;
    if (status) userUpdateData.status = status;

    if (roleId && parseInt(roleId as string) > 0) {
      const parsedRoleId = parseInt(roleId as string);
      if (parsedRoleId !== existingUser.roleId) {
        const isCurrentAdmin = existingUser.role?.name === "ADMIN";
        const roleRecord = await db.role.findUnique({ where: { id: parsedRoleId } });
        if (roleRecord) {
          if (!isCurrentAdmin || roleRecord.name === "ADMIN") {
            userUpdateData.roleId = parsedRoleId;
          } else {
            console.warn(`[Admin Route] Protegido usuario ADMIN ID ${userId} para evitar cambio accidental de rol a ${roleRecord.name}`);
          }
        }
      }
    }
    if (requireProfileSetup !== undefined) userUpdateData.requireProfileSetup = requireProfileSetup === "true" || requireProfileSetup === true;

    if (newPassword && newPassword.trim().length >= 6) {
      userUpdateData.password = await hashPassword(newPassword.trim());
    }

    await db.user.update({
      where: { id: userId },
      data: userUpdateData
    });

    // Determine target role (preserve user's current role if not changed)
    const targetRoleId = userUpdateData.roleId || existingUser.roleId;

    const [profRole, studentRole] = await Promise.all([
      db.role.findUnique({ where: { name: "PROFESSIONAL" } }),
      db.role.findUnique({ where: { name: "STUDENT" } })
    ]);

    const isProfRole = (profRole && targetRoleId === profRole.id) || targetRoleId === 2;
    const isStudRole = (studentRole && targetRoleId === studentRole.id) || targetRoleId === 17;

    // Update or Create ProfessionalProfile ONLY if user is a Professional OR already has a professional profile
    if (isProfRole || existingUser.professionalProfile) {
      const profData: any = {
        bio: prof_bio ? prof_bio.trim() : null,
        slogan: prof_slogan ? prof_slogan.trim() : null,
        provincia: prof_provincia ? prof_provincia.trim() : null,
        ciudad: prof_ciudad ? prof_ciudad.trim() : null,
        direccion: prof_direccion ? prof_direccion.trim() : null,
        cedula: prof_cedula ? prof_cedula.trim() : null,
        telefono: prof_telefono ? prof_telefono.trim() : null,
        tarifa: prof_tarifa ? parseFloat(prof_tarifa as string) || 0.0 : 0.0,
        whatsapp: prof_whatsapp ? prof_whatsapp.trim() : null,
        status: prof_status || "APROBADO",
        verified: prof_verified === "true" || prof_verified === true,
        planType: prof_planType || "PROFESIONAL",
        facebook: prof_facebook ? prof_facebook.trim() : null,
        instagram: prof_instagram ? prof_instagram.trim() : null,
        linkedin: prof_linkedin ? prof_linkedin.trim() : null,
        tiktok: prof_tiktok ? prof_tiktok.trim() : null,
        youtube: prof_youtube ? prof_youtube.trim() : null,
        website: prof_website ? prof_website.trim() : null
      };

      if (req.body.prof_photo !== undefined) {
        if (req.body.prof_photo && (req.body.prof_photo.startsWith("data:") || req.body.prof_photo.length > 200)) {
          profData.photo = await uploadBase64ToCloudinary(req.body.prof_photo, "fotos");
        } else {
          profData.photo = req.body.prof_photo || null;
        }
      }

      if (existingUser.professionalProfile) {
        await db.professionalProfile.update({
          where: { userId },
          data: profData
        });
      } else if (isProfRole) {
        const uniqueSlug = await getUniqueSlug("professionalProfile", name || existingUser.name);
        await db.professionalProfile.create({
          data: {
            userId,
            slug: uniqueSlug,
            ...profData
          }
        });
      }
    }

    // Update or Create StudentProfile ONLY if user is a Student OR already has a student profile
    if (isStudRole || existingUser.studentProfile) {
      let instEducativa = existingUser.studentProfile?.institucionEducativa || "Universidad No Especificada";
      if (stud_universityId) {
        const univ = await db.university.findUnique({ where: { id: parseInt(stud_universityId as string) } });
        if (univ) {
          instEducativa = univ.nombre;
        }
      }

      const studData: any = {
        universityId: stud_universityId ? parseInt(stud_universityId as string) : null,
        institucionEducativa: instEducativa,
        carrera: stud_carrera ? stud_carrera.trim() : (existingUser.studentProfile?.carrera || "Carrera por definir"),
        carnetEstudiante: stud_carnetEstudiante ? stud_carnetEstudiante.trim() : null,
        bio: stud_biografia ? stud_biografia.trim() : null,
        linkedinUrl: stud_linkedin ? stud_linkedin.trim() : null,
        githubUrl: stud_github ? stud_github.trim() : null,
        websiteUrl: stud_portfolioWebsite ? stud_portfolioWebsite.trim() : null
      };

      if (existingUser.studentProfile) {
        await db.studentProfile.update({
          where: { userId },
          data: studData
        });
      } else if (isStudRole) {
        await db.studentProfile.create({
          data: {
            userId,
            ...studData
          }
        });
      }
    }

    // Update Client Billing Record if provided
    if (client_identificacion && client_identificacion.trim()) {
      const existingClient = await db.client.findFirst({
        where: { OR: [{ mail: existingUser.email }, { identificacion: client_identificacion.trim() }] }
      });

      const clientData = {
        nombres: name || existingUser.name,
        mail: email || existingUser.email,
        identificacion: client_identificacion.trim(),
        tipoIdentificacion: client_tipoIdentificacion || "05",
        direccion: client_direccion ? client_direccion.trim() : "Ecuador",
        celular: telefono || existingUser.telefono || "0999999999"
      };

      if (existingClient) {
        await db.client.update({
          where: { id: existingClient.id },
          data: clientData
        });
      } else {
        await db.client.create({
          data: clientData
        });
      }
    }

    res.redirect("/dashboard/admin?tab=accounts&success=profile_updated_full");
  } catch (error: any) {
    console.error("Error in update-full-profile:", error);
    res.redirect(`/dashboard/admin?tab=accounts&error=${encodeURIComponent(error.message || "Error al actualizar perfil")}`);
  }
});

// POST: Impersonar Sesion en Vivo ("Navegar como usuario")
router.post("/dashboard/admin/users/:userId/impersonate", requireAdmin, async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId as string);
  if (isNaN(userId)) {
    return res.redirect("/dashboard/admin?tab=accounts&error=ID+de+usuario+inválido");
  }

  try {
    const adminUser = (req as any).user;
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      include: { role: true }
    });

    if (!targetUser) {
      return res.redirect("/dashboard/admin?tab=accounts&error=Usuario+no+encontrado");
    }

    const currentToken = req.cookies.token;

    // Save admin original token and setup impersonation cookies
    res.cookie("admin_original_token", currentToken, { httpOnly: true });
    res.cookie("is_impersonating", "true", { httpOnly: false });
    res.cookie("impersonator_admin_name", adminUser.name || "Administrador", { httpOnly: false });

    // Generate session token for target user
    const impersonatedToken = await createAuthSession(
      { id: targetUser.id, email: targetUser.email },
      targetUser.role.name,
      req
    );

    res.cookie("token", impersonatedToken, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });

    // Redirect to target user's respective dashboard
    const roleName = targetUser.role.name.toUpperCase();
    if (roleName === "STUDENT" || roleName === "ESTUDIANTE") {
      return res.redirect("/student");
    } else if (roleName === "PROFESSIONAL" || roleName === "PROFESIONAL") {
      return res.redirect("/dashboard/profesional");
    } else if (roleName === "CLIENT" || roleName === "CLIENTE") {
      return res.redirect("/dashboard/cliente");
    } else if (roleName === "REFERIDO" || roleName === "AFFILIATE") {
      return res.redirect("/dashboard/referido");
    } else {
      return res.redirect("/dashboard/admin");
    }
  } catch (error: any) {
    console.error("Error starting impersonation:", error);
    res.redirect(`/dashboard/admin?tab=accounts&error=${encodeURIComponent(error.message || "Error al iniciar modo soporte")}`);
  }
});

// POST & GET: Salir del Modo Impersonacion ("Volver a Modo Administrador")
const exitImpersonationHandler = async (req: Request, res: Response) => {
  try {
    const originalToken = req.cookies.admin_original_token;

    if (originalToken) {
      res.cookie("token", originalToken, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    }

    res.clearCookie("admin_original_token");
    res.clearCookie("is_impersonating");
    res.clearCookie("impersonator_admin_name");

    return res.redirect("/dashboard/admin?tab=accounts&success=impersonation_ended");
  } catch (error: any) {
    console.error("Error exiting impersonation:", error);
    return res.redirect("/dashboard/admin?tab=accounts");
  }
};

router.post("/dashboard/admin/impersonate/exit", exitImpersonationHandler);
router.get("/dashboard/admin/impersonate/exit", exitImpersonationHandler);

// POST: Forzar Cierre de Sesiones Activas
router.post("/dashboard/admin/users/:userId/force-logout", requireAdmin, async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId as string);
  if (isNaN(userId)) {
    return res.redirect("/dashboard/admin?tab=accounts&error=ID+inválido");
  }

  try {
    await db.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: {
        revokedAt: new Date(),
        revocationReason: "ADMIN_FORCE_DISCONNECT"
      }
    });

    res.redirect("/dashboard/admin?tab=accounts&success=sessions_revoked");
  } catch (error: any) {
    console.error("Error in force logout:", error);
    res.redirect(`/dashboard/admin?tab=accounts&error=${encodeURIComponent(error.message || "Error al forzar cierre de sesión")}`);
  }
});

// POST: Crear Nuevo Usuario / Profesional (SUPER-ADMIN)
router.post("/dashboard/admin/users/create", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, email, password, roleId, status, telefono, ciudad, planType, profStatus, slogan } = req.body;

    if (!name || !email || !password || !roleId) {
      return res.redirect("/dashboard/admin?tab=accounts&error=Completa+todos+los+campos+obligatorios");
    }

    const cleanEmail = (email as string).trim().toLowerCase();
    const existing = await db.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return res.redirect("/dashboard/admin?tab=accounts&error=El+correo+electrónico+ya+está+registrado");
    }

    const hashedPassword = await hashPassword(password as string);
    const parsedRoleId = parseInt(roleId as string, 10);
    let targetRole = await db.role.findUnique({ where: { id: parsedRoleId } });
    if (!targetRole) {
      const roleMap: Record<number, string> = {
        1: "ADMIN",
        2: "PROFESSIONAL",
        3: "CLIENT",
        4: "STUDENT"
      };
      const fallbackName = roleMap[parsedRoleId];
      if (fallbackName) {
        targetRole = await db.role.findFirst({ where: { name: fallbackName } });
      }
    }

    if (!targetRole) {
      return res.redirect("/dashboard/admin?tab=accounts&error=El+rol+seleccionado+no+existe+en+el+sistema");
    }

    const newUser = await db.user.create({
      data: {
        name: (name as string).trim(),
        email: cleanEmail,
        password: hashedPassword,
        roleId: targetRole.id,
        status: (status as string) || "ACTIVE",
        telefono: telefono ? (telefono as string).trim() : null,
        ciudad: ciudad ? (ciudad as string).trim() : null,
        requireProfileSetup: false
      }
    });

    if (targetRole.name === "PROFESSIONAL" || targetRole.id === 2) {
      const existingProf = await db.professionalProfile.findUnique({ where: { userId: newUser.id } });
      if (!existingProf) {
        await db.professionalProfile.create({
          data: {
            userId: newUser.id,
            slogan: slogan ? (slogan as string).trim() : null,
            planType: (planType as string) || "PROFESIONAL",
            status: (profStatus as string) || "APROBADO",
            verified: true,
            provincia: ciudad ? (ciudad as string).trim() : "Pichincha",
            ciudad: ciudad ? (ciudad as string).trim() : "Quito",
            direccion: "Ecuador",
            cedula: "1700000000",
            telefono: telefono ? (telefono as string).trim() : "0990000000"
          }
        });
      }
    } else if (targetRole.name === "STUDENT" || targetRole.id === 4) {
      await StudentService.getOrCreateStudentProfile(newUser.id);
    }

    // Send email with login credentials
    sendCredentialsEmail({
      to: cleanEmail,
      tempPassword: password as string,
      eventName: "Plataforma Profesionales Ecuador",
      eventType: `Cuenta de ${targetRole.name}`
    }).catch((err: any) => console.warn("Error enviando credenciales a nuevo usuario:", err));

    return res.redirect("/dashboard/admin?tab=accounts&success=user_created");
  } catch (error: any) {
    console.error("Error creating user from admin:", error);
    return res.redirect(`/dashboard/admin?tab=accounts&error=${encodeURIComponent(error.message || "Error al crear usuario")}`);
  }
});

// =============================================================
// ADMINISTRACIÓN DE FACTURACIÓN ELECTRÓNICA & PLANES
// =============================================================

// POST Add/Edit Billing Plan
router.post("/dashboard/admin/billing-plans", requireAdmin, async (req: Request, res: Response) => {
  const { id, planId, nombre, descripcion, precio, invoiceLimit, isUnlimited, duracionDias, duracionTipo } = req.body;
  try {
    const rawId = id || planId;
    const parsedId = rawId ? parseInt(rawId as string, 10) : NaN;

    const limitVal = (isUnlimited === "true" || isUnlimited === true || invoiceLimit === "-1")
      ? -1
      : parseInt(invoiceLimit, 10) || 20;

    const priceVal = parseFloat(precio) || 0.0;
    const daysVal = parseInt(duracionDias, 10) || 30;
    const planName = (nombre || "").trim();

    if (!planName) {
      return res.redirect("/dashboard/admin?tab=billing-plans&error=Completa+el+nombre+del+paquete");
    }

    if (!isNaN(parsedId)) {
      await db.billingPlan.update({
        where: { id: parsedId },
        data: {
          nombre: planName,
          descripcion: descripcion ? descripcion.trim() : null,
          precio: priceVal,
          invoiceLimit: limitVal,
          duracionDias: daysVal,
          duracionTipo: duracionTipo || "MENSUAL"
        }
      });
    } else {
      const existingPlan = await db.billingPlan.findUnique({
        where: { nombre: planName }
      });

      if (existingPlan) {
        await db.billingPlan.update({
          where: { id: existingPlan.id },
          data: {
            descripcion: descripcion ? descripcion.trim() : null,
            precio: priceVal,
            invoiceLimit: limitVal,
            duracionDias: daysVal,
            duracionTipo: duracionTipo || "MENSUAL",
            isActive: true
          }
        });
      } else {
        await db.billingPlan.create({
          data: {
            nombre: planName,
            descripcion: descripcion ? descripcion.trim() : null,
            precio: priceVal,
            invoiceLimit: limitVal,
            duracionDias: daysVal,
            duracionTipo: duracionTipo || "MENSUAL",
            isActive: true
          }
        });
      }
    }

    invalidateCache(cacheKey.billingPlan.all());
    res.redirect("/dashboard/admin?tab=billing-plans&success=billing_plan_saved");
  } catch (error: any) {
    console.error("Error saving billing plan:", error);
    const msg = error.code === "P2002"
      ? "Ya existe un paquete de facturación con ese nombre"
      : (error.message || "Error al guardar el plan de facturación");
    res.redirect(`/dashboard/admin?tab=billing-plans&error=${encodeURIComponent(msg)}`);
  }
});

// POST Delete Billing Plan
router.post("/dashboard/admin/billing-plans/delete/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  try {
    await db.billingPlan.delete({ where: { id } });
    invalidateCache(cacheKey.billingPlan.all());
    res.redirect("/dashboard/admin?tab=billing-plans&success=billing_plan_deleted");
  } catch (error) {
    console.error("Error deleting billing plan:", error);
    res.redirect("/dashboard/admin?tab=billing-plans&error=delete_plan_failed");
  }
});

// POST Toggle Active Billing Plan
router.post("/dashboard/admin/billing-plans/toggle/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  try {
    const plan = await db.billingPlan.findUnique({ where: { id } });
    if (plan) {
      await db.billingPlan.update({
        where: { id },
        data: { isActive: !plan.isActive }
      });
      invalidateCache(cacheKey.billingPlan.all());
    }
    res.redirect("/dashboard/admin?tab=billing-plans&success=plan_status_toggled");
  } catch (error) {
    console.error("Error toggling billing plan status:", error);
    res.redirect("/dashboard/admin?tab=billing-plans&error=toggle_plan_failed");
  }
});

// POST Configure System Invoice Limits (Free / Premium)
const systemLimitsHandler = async (req: Request, res: Response) => {
  const { freeInvoiceLimit, premiumInvoiceLimit } = req.body;
  try {
    const freeVal = parseInt(freeInvoiceLimit, 10);
    const premVal = parseInt(premiumInvoiceLimit, 10);

    await db.systemConfig.upsert({
      where: { id: 1 },
      update: {
        freeInvoiceLimit: isNaN(freeVal) ? 5 : freeVal,
        premiumInvoiceLimit: isNaN(premVal) ? 50 : premVal
      },
      create: {
        id: 1,
        freeInvoiceLimit: isNaN(freeVal) ? 5 : freeVal,
        premiumInvoiceLimit: isNaN(premVal) ? 50 : premVal
      }
    });

    invalidateCache(cacheKey.systemConfig.singleton());
    res.redirect("/dashboard/admin?tab=billing-plans&success=config_limits_saved");
  } catch (error) {
    console.error("Error updating billing limits in system config:", error);
    res.redirect("/dashboard/admin?tab=billing-plans&error=config_limits_failed");
  }
};

router.post("/dashboard/admin/system-config/billing", requireAdmin, systemLimitsHandler);
router.post("/dashboard/admin/billing-plans/system-limits", requireAdmin, systemLimitsHandler);

// POST Toggle Ponente Condition for Professional
const togglePonenteHandler = async (req: Request, res: Response) => {
  const profileId = parseInt(req.params.id as string, 10);
  try {
    const profile = await db.professionalProfile.findUnique({ where: { id: profileId } });
    if (profile) {
      await db.professionalProfile.update({
        where: { id: profileId },
        data: { isPonente: !profile.isPonente }
      });
    }
    res.redirect("/dashboard/admin?tab=cuentas&subtab=profesionales&success=ponente_status_updated");
  } catch (error) {
    console.error("Error toggling ponente condition:", error);
    res.redirect("/dashboard/admin?tab=cuentas&subtab=profesionales&error=toggle_ponente_failed");
  }
};

router.post("/dashboard/admin/toggle-ponente/:id", requireAdmin, togglePonenteHandler);
router.post("/dashboard/admin/professionals/:id/toggle-ponente", requireAdmin, togglePonenteHandler);

// POST Assign Billing Subscription to Professional
router.post("/dashboard/admin/billing-subscriptions/assign", requireAdmin, async (req: Request, res: Response) => {
  const { profileId, planId, status, customDays } = req.body;
  try {
    const profId = parseInt(profileId, 10);
    const pId = parseInt(planId, 10);
    const plan = await db.billingPlan.findUnique({ where: { id: pId } });

    if (!plan) {
      return res.redirect("/dashboard/admin?tab=billing-plans&error=plan_not_found");
    }

    const days = customDays ? parseInt(customDays, 10) : (plan.duracionDias || 30);
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    await db.billingSubscription.create({
      data: {
        profileId: profId,
        planId: pId,
        startDate,
        endDate,
        status: status || "ACTIVO"
      }
    });

    res.redirect("/dashboard/admin?tab=billing-plans&success=subscription_assigned");
  } catch (error) {
    console.error("Error assigning billing subscription:", error);
    res.redirect("/dashboard/admin?tab=billing-plans&error=assign_subscription_failed");
  }
});

// POST Cancel Billing Subscription
router.post("/dashboard/admin/billing-subscriptions/cancel/:id", requireAdmin, async (req: Request, res: Response) => {
  const subId = parseInt(req.params.id as string, 10);
  try {
    await db.billingSubscription.update({
      where: { id: subId },
      data: { status: "CANCELADO" }
    });
    res.redirect("/dashboard/admin?tab=billing-plans&success=subscription_cancelled");
  } catch (error) {
    console.error("Error cancelling billing subscription:", error);
    res.redirect("/dashboard/admin?tab=billing-plans&error=cancel_subscription_failed");
  }
});

// POST Configure Professional SRI Issuer by Admin
router.post("/dashboard/admin/professionals/:id/issuer", requireAdmin, async (req: Request, res: Response) => {
  const profileId = parseInt(req.params.id as string, 10);
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
    codigoSri,
    firmaElectronica
  } = req.body;

  try {
    const profile = await db.professionalProfile.findUnique({
      where: { id: profileId },
      include: { issuer: true, user: true }
    });

    if (!profile) {
      return res.redirect("/dashboard/admin?tab=cuentas&subtab=profesionales&error=profile_not_found");
    }

    const cleanRuc = (ruc || "").trim();
    if (!cleanRuc) {
      return res.redirect("/dashboard/admin?tab=cuentas&subtab=profesionales&error=missing_ruc");
    }

    const payload: any = {
      ruc: cleanRuc,
      nombres: (nombres || profile.user.name || "").trim(),
      apellidos: (apellidos || "").trim(),
      nombreEmpresa: (nombreEmpresa || razonSocial || profile.user.name).trim(),
      razonSocial: (razonSocial || nombreEmpresa || profile.user.name).trim(),
      direccion: (direccion || "Ecuador").trim(),
      email: (email || profile.user.email).trim(),
      celular: (celular || "0999999999").trim(),
      establecimiento: (establecimiento || "001").trim(),
      puntoEmision: (puntoEmision || "001").trim(),
      startSecuencial: (startSecuencial || "000000001").trim(),
      regimen: regimen || "REGIMEN GENERAL",
      obligadoContabilidad: obligadoContabilidad === "true" || obligadoContabilidad === true,
      ambiente: parseInt(ambiente || "1", 10),
      professionalProfileId: profile.id
    };

    if (codigoSri && codigoSri.trim() !== "") {
      payload.codigoSri = codigoSri.trim();
    }

    if (firmaElectronica && firmaElectronica.trim() !== "") {
      payload.firmaElectronica = firmaElectronica.trim();
    }

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

    res.redirect("/dashboard/admin?tab=cuentas&subtab=profesionales&success=issuer_config_saved");
  } catch (error: any) {
    console.error("Error configuring professional issuer by admin:", error);
    res.redirect(`/dashboard/admin?tab=cuentas&subtab=profesionales&error=${encodeURIComponent(error.message || "config_issuer_failed")}`);
  }
});

// POST /dashboard/admin/agreements/save -> Save or update commercial agreement
router.post("/dashboard/admin/agreements/save", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id, empresa, titulo, descripcion, beneficio, descuento, tipoDescuento, condiciones, usuariosElegibles, orden, activo, link } = req.body;

    const data: any = {
      empresa: empresa?.trim() || titulo?.trim() || "Empresa Aliada",
      titulo: titulo?.trim() || empresa?.trim() || "Convenio Comercial",
      descripcion: descripcion?.trim() || null,
      beneficio: beneficio?.trim() || null,
      beneficios: beneficio?.trim() || null,
      descuento: descuento ? parseFloat(descuento) : null,
      tipoDescuento: tipoDescuento || "USD",
      condiciones: condiciones?.trim() || null,
      usuariosElegibles: usuariosElegibles || "TODOS",
      categoria: "Empresa Aliada",
      link: link?.trim() || null,
      orden: parseInt(orden || "0", 10),
      activo: activo === "true" || activo === true || activo === "on"
    };

    if (id && !isNaN(parseInt(id, 10))) {
      await db.agreement.update({
        where: { id: parseInt(id, 10) },
        data
      });
    } else {
      await db.agreement.create({
        data
      });
    }

    res.redirect("/dashboard/admin?tab=agreements&success=agreement_saved");
  } catch (error: any) {
    console.error("Error saving agreement:", error);
    res.redirect(`/dashboard/admin?tab=agreements&error=${encodeURIComponent(error.message || "save_agreement_failed")}`);
  }
});

// POST /dashboard/admin/agreements/toggle/:id -> Toggle agreement active state
router.post("/dashboard/admin/agreements/toggle/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    const agreement = await db.agreement.findUnique({ where: { id } });
    if (agreement) {
      await db.agreement.update({
        where: { id },
        data: { activo: !agreement.activo }
      });
    }
    res.redirect("/dashboard/admin?tab=agreements&success=agreement_toggled");
  } catch (error) {
    res.redirect("/dashboard/admin?tab=agreements&error=toggle_failed");
  }
});

// POST /dashboard/admin/agreements/delete/:id -> Delete agreement
router.post("/dashboard/admin/agreements/delete/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    await db.agreement.delete({ where: { id } });
    res.redirect("/dashboard/admin?tab=agreements&success=agreement_deleted");
  } catch (error) {
    res.redirect("/dashboard/admin?tab=agreements&error=delete_failed");
  }
});

// POST /dashboard/admin/benefits/save -> Save or update platform benefit
router.post("/dashboard/admin/benefits/save", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id, titulo, descripcion, icono, imagenBase64, imagen, categoria, requierePlan, orden, activo } = req.body;

    let imagenUrl: string | undefined = undefined;
    if (imagenBase64 && typeof imagenBase64 === "string" && imagenBase64.startsWith("data:")) {
      imagenUrl = await uploadBase64ToCloudinary(imagenBase64, "benefits");
    } else if (imagen && typeof imagen === "string" && imagen.trim()) {
      imagenUrl = imagen.trim();
    }

    const data: any = {
      titulo: titulo?.trim() || "Nuevo Beneficio",
      descripcion: descripcion?.trim() || "",
      icono: icono?.trim() || "fa-solid fa-star",
      categoria: categoria || "GENERAL",
      requierePlan: requierePlan || "GRATUITO",
      orden: parseInt(orden || "0", 10),
      activo: activo === "true" || activo === true || activo === "on"
    };

    if (imagenUrl) {
      data.imagen = imagenUrl;
    }

    if (id && !isNaN(parseInt(id, 10))) {
      await db.benefit.update({
        where: { id: parseInt(id, 10) },
        data
      });
    } else {
      await db.benefit.create({
        data
      });
    }

    res.redirect("/dashboard/admin?tab=benefits&success=benefit_saved");
  } catch (error: any) {
    console.error("Error saving benefit:", error);
    res.redirect(`/dashboard/admin?tab=benefits&error=${encodeURIComponent(error.message || "save_benefit_failed")}`);
  }
});

// POST /dashboard/admin/benefits/toggle/:id -> Toggle benefit active state
router.post("/dashboard/admin/benefits/toggle/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    const benefit = await db.benefit.findUnique({ where: { id } });
    if (benefit) {
      await db.benefit.update({
        where: { id },
        data: { activo: !benefit.activo }
      });
    }
    res.redirect("/dashboard/admin?tab=benefits&success=benefit_toggled");
  } catch (error) {
    res.redirect("/dashboard/admin?tab=benefits&error=toggle_failed");
  }
});

// POST /dashboard/admin/benefits/delete/:id -> Delete benefit
router.post("/dashboard/admin/benefits/delete/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    await db.benefit.delete({ where: { id } });
    res.redirect("/dashboard/admin?tab=benefits&success=benefit_deleted");
  } catch (error) {
    res.redirect("/dashboard/admin?tab=benefits&error=delete_failed");
  }
});

// POST /api/admin/test-email -> Quick test email route
router.post("/api/admin/test-email", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { email, emailType } = req.body;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ success: false, error: "Ingresa un correo electrónico válido." });
    }

    const targetEmail = email.trim();
    let result: any;

    if (emailType === "welcome") {
      result = await emailService.sendWelcomeRegistration(targetEmail, {
        recipientName: "Usuario de Prueba",
        email: targetEmail,
        temporaryPassword: "PasswordPrueba123!",
        loginUrl: `${req.protocol}://${req.get("host")}/login`,
        profileStatus: "CLIENT"
      });
    } else if (emailType === "reset") {
      result = await emailService.sendPasswordReset(targetEmail, {
        recipientName: "Usuario de Prueba",
        resetUrl: `${req.protocol}://${req.get("host")}/reset-password?token=test_admin_token_123`,
        expiresInMinutes: 60
      });
    } else if (emailType === "appointment") {
      result = await emailService.sendAppointmentRequested(targetEmail, {
        recipientName: "Paciente de Prueba",
        customerName: "Paciente de Prueba",
        professionalName: "Dr. Profesional de Ejemplo",
        date: new Date().toLocaleDateString("es-EC"),
        time: "10:00 AM",
        motivo: "Consulta médica de prueba desde el Panel Admin",
        appointmentId: "TEST-12345",
        appointmentUrl: `${req.protocol}://${req.get("host")}/dashboard/cliente`
      });
    } else {
      result = await emailService.sendRawEmail({
        to: targetEmail,
        subject: "📧 Prueba Rápida de Correo - Profesionales Ecuador",
        html: `
          <div style="font-family: sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
            <h2 style="color: #0A3C84; margin-top: 0;">Prueba Exitosa del Sistema de Correos</h2>
            <p style="font-size: 14px; line-height: 1.6;">Este es un correo de prueba enviado en tiempo real desde el <strong>Panel Administrativo de Profesionales Ecuador</strong>.</p>
            <div style="background: #f8fafc; padding: 12px 16px; border-radius: 12px; font-size: 13px; color: #475569; margin: 16px 0;">
              <strong>Fecha y Hora de Envío:</strong> ${new Date().toLocaleString("es-EC")}
            </div>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">Si has recibido este mensaje, significa que la configuración de correo (Gmail API / SMTP) está completamente operacional.</p>
          </div>
        `
      });
    }

    if (result && result.success) {
      return res.json({
        success: true,
        message: `¡Correo enviado exitosamente a ${targetEmail}!`,
        messageId: result.messageId || "N/A"
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result?.error || "No se pudo entregar el correo. Verifica las credenciales de servicio."
      });
    }
  } catch (err: any) {
    console.error("Error en endpoint test-email:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Excepción interna al procesar la prueba de correo."
    });
  }
});

// -------------------------------------------------------------
export default router;
