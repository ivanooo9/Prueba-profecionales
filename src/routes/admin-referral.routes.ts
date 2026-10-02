import { Router, Request, Response, NextFunction } from "express";
import { db } from "../lib/db";
import { hashPassword } from "../lib/auth";
import { sendReferralWelcomeEmail } from "../lib/referral-email";
import { CommissionService } from "../services/commission.service";
import { ReferralSaleService } from "../services/referral-sale.service";
import { ReferralWalletService } from "../services/referral-wallet.service";
import { ProductType, ReferralAccountStatus, WithdrawalStatus } from "@prisma/client";
import { emitToUser } from "../lib/socket";
import crypto from "crypto";

export const adminReferralRouter = Router();

/**
 * Middleware: Admin check
 */
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.path.startsWith("/dashboard/admin/referidos")) {
    return next();
  }
  const user = res.locals.user;
  if (!user || user.role?.name !== "ADMIN") {
    return res.redirect("/login?error=unauthorized_admin");
  }
  next();
};

adminReferralRouter.use(requireAdmin);

/**
 * GET /dashboard/admin/referidos - Referrals List & Creation
 */
adminReferralRouter.get("/dashboard/admin/referidos", async (req: Request, res: Response) => {
  try {
    const referrers = await db.referralProfile.findMany({
      include: {
        user: true,
        wallet: true,
        _count: { select: { sales: true, withdrawals: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.render("admin-referidos-lista", {
      user: res.locals.user,
      referrers,
      success: req.query.success,
      error: req.query.error,
    });
  } catch (error) {
    console.error("Error loading admin referrers:", error);
    res.status(500).send("Error al cargar la lista de referidos.");
  }
});

/**
 * POST /dashboard/admin/referidos/crear - Ultra-simplified Account Creation (EMAIL ONLY)
 */
adminReferralRouter.post("/dashboard/admin/referidos/crear", async (req: Request, res: Response) => {
  const referer = req.headers.referer || "";
  const isMainDashboard = referer.includes("/dashboard/admin") && !referer.includes("/dashboard/admin/referidos");
  const targetRedirect = (param: string) => isMainDashboard ? `/dashboard/admin?tab=referidos&${param}` : `/dashboard/admin/referidos?${param}`;

  try {
    const { email } = req.body;
    if (!email || !email.includes("@")) {
      return res.redirect(targetRedirect("error=invalid_email"));
    }

    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await db.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return res.redirect(targetRedirect("error=email_already_exists"));
    }

    // Get or create REFERIDO role
    let referralRole = await db.role.findFirst({ where: { name: "REFERIDO" } });
    if (!referralRole) {
      referralRole = await db.role.create({
        data: { name: "REFERIDO", description: "Rol Comercial de Referido y Afiliado" },
      });
    }

    // Generate random secure temporary password
    const tempPassword = `Ref_${crypto.randomBytes(4).toString("hex")}`;
    const passwordHash = await hashPassword(tempPassword);

    // Create User & ReferralProfile atomically
    const newReferral = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: cleanEmail,
          password: passwordHash,
          name: cleanEmail.split("@")[0],
          roleId: referralRole.id,
          status: "ACTIVE",
        },
      });

      const profile = await tx.referralProfile.create({
        data: {
          userId: newUser.id,
          status: "PENDING_CONFIG",
        },
      });

      await tx.referralWallet.create({
        data: {
          referralId: profile.id,
        },
      });

      await tx.referralAuditLog.create({
        data: {
          referralId: profile.id,
          actorId: res.locals.user.id,
          accion: "CUENTA_REFERIDO_CREADA",
          detalle: `Cuenta creada por administración para ${cleanEmail}`,
        },
      });

      return profile;
    });

    // Send Welcome Email automatically with credentials
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    sendReferralWelcomeEmail({
      to: cleanEmail,
      tempPassword,
      loginUrl: `${baseUrl}/login`,
    }).catch((err) => console.error("Error sending referral welcome email:", err));

    res.redirect(targetRedirect(`success=referral_created&refEmail=${encodeURIComponent(cleanEmail)}&refPass=${encodeURIComponent(tempPassword)}`));
  } catch (error) {
    console.error("Error creating referral account:", error);
    res.redirect(targetRedirect("error=server_error"));
  }
});

/**
 * POST /dashboard/admin/referidos/:id/estado - Toggle Status (ACTIVE / SUSPENDED)
 */
adminReferralRouter.post("/dashboard/admin/referidos/:id/estado", async (req: Request, res: Response) => {
  const referer = req.headers.referer || "";
  const isMainDashboard = referer.includes("/dashboard/admin") && !referer.includes("/dashboard/admin/referidos");
  const targetRedirect = (param: string) => isMainDashboard ? `/dashboard/admin?tab=referidos&${param}` : `/dashboard/admin/referidos?${param}`;

  try {
    const profileId = parseInt(req.params.id as string);
    const { nuevoEstado } = req.body;

    const profile = await db.referralProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      return res.redirect(targetRedirect("error=not_found"));
    }

    await db.referralProfile.update({
      where: { id: profileId },
      data: { status: nuevoEstado as ReferralAccountStatus },
    });

    await db.referralAuditLog.create({
      data: {
        referralId: profileId,
        actorId: res.locals.user.id,
        accion: "CAMBIO_ESTADO_CUENTA",
        detalle: `Estado cambiado a ${nuevoEstado} por administración`,
      },
    });

    res.redirect(targetRedirect("success=status_updated"));
  } catch (error) {
    console.error("Error updating referral status:", error);
    res.redirect(targetRedirect("error=server_error"));
  }
});

/**
 * GET /dashboard/admin/referidos/ventas - Admin Sales Review Panel
 */
adminReferralRouter.get("/dashboard/admin/referidos/ventas", async (req: Request, res: Response) => {
  try {
    const estado = req.query.estado as string;

    const whereCondition: any = {};
    if (estado) {
      whereCondition.estado = estado;
    }

    const sales = await db.referralSale.findMany({
      where: whereCondition,
      include: {
        referral: { include: { user: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.render("admin-referidos-ventas", {
      user: res.locals.user,
      sales,
      selectedEstado: estado || "TODOS",
      success: req.query.success,
      error: req.query.error,
    });
  } catch (error) {
    console.error("Error loading admin sales review:", error);
    res.status(500).send("Error al cargar la revisión de ventas.");
  }
});

/**
 * POST /dashboard/admin/referidos/ventas/:id/aprobar - Approve Sale & Trigger Auto-Onboarding
 */
adminReferralRouter.post("/dashboard/admin/referidos/ventas/:id/aprobar", async (req: Request, res: Response) => {
  const referer = req.headers.referer || "";
  const isMainDashboard = referer.includes("/dashboard/admin") && !referer.includes("/dashboard/admin/referidos");
  const targetRedirect = (param: string) => isMainDashboard ? `/dashboard/admin?tab=referidos&${param}` : `/dashboard/admin/referidos/ventas?${param}`;

  try {
    const saleId = parseInt(req.params.id as string);
    const { observacionesAdmin } = req.body;

    const sale = await db.referralSale.findUnique({
      where: { id: saleId },
      include: { referral: true },
    });

    await ReferralSaleService.approveSaleAndEnrollClient(
      saleId,
      res.locals.user.id,
      observacionesAdmin
    );

    if (sale?.referral?.userId) {
      const io = req.app.get("io");
      emitToUser(io, sale.referral.userId, "referral:sale_approved", {
        saleId,
        productName: sale.productName,
        comision: sale.comisionCalculada,
      });
    }

    res.redirect(targetRedirect("success=sale_approved"));
  } catch (error: any) {
    console.error("Error approving sale:", error);
    res.redirect(targetRedirect(`error=${encodeURIComponent(error.message || "error")}`));
  }
});

/**
 * POST /dashboard/admin/referidos/ventas/:id/rechazar - Reject Sale
 */
adminReferralRouter.post("/dashboard/admin/referidos/ventas/:id/rechazar", async (req: Request, res: Response) => {
  const referer = req.headers.referer || "";
  const isMainDashboard = referer.includes("/dashboard/admin") && !referer.includes("/dashboard/admin/referidos");
  const targetRedirect = (param: string) => isMainDashboard ? `/dashboard/admin?tab=referidos&${param}` : `/dashboard/admin/referidos/ventas?${param}`;

  try {
    const saleId = parseInt(req.params.id as string);
    const { observacionesAdmin } = req.body;

    await ReferralSaleService.rejectSale(
      saleId,
      res.locals.user.id,
      observacionesAdmin || "Venta no verificada"
    );

    res.redirect(targetRedirect("success=sale_rejected"));
  } catch (error: any) {
    console.error("Error rejecting sale:", error);
    res.redirect(targetRedirect(`error=${encodeURIComponent(error.message || "error")}`));
  }
});

/**
 * GET /dashboard/admin/referidos/comisiones - Commission Rules Management
 */
adminReferralRouter.get("/dashboard/admin/referidos/comisiones", async (req: Request, res: Response) => {
  try {
    const configs = await CommissionService.getAllConfigs();
    const conversatorios = await db.conversatorio.findMany({
      select: { id: true, titulo: true },
    });
    const cursos = await db.curso.findMany({
      select: { id: true, titulo: true },
    });

    const generalConfig = configs.find((c) => c.isGeneral);

    res.render("admin-referidos-comisiones", {
      user: res.locals.user,
      configs,
      generalConfig,
      conversatorios,
      cursos,
      success: req.query.success,
      error: req.query.error,
    });
  } catch (error) {
    console.error("Error loading commission rules:", error);
    res.status(500).send("Error al cargar las reglas de comisión.");
  }
});

/**
 * POST /dashboard/admin/referidos/comisiones/general - Update General Commission %
 */
adminReferralRouter.post("/dashboard/admin/referidos/comisiones/general", async (req: Request, res: Response) => {
  const referer = req.headers.referer || "";
  const isMainDashboard = referer.includes("/dashboard/admin") && !referer.includes("/dashboard/admin/referidos");
  const targetRedirect = (param: string) => isMainDashboard ? `/dashboard/admin?tab=referidos&${param}` : `/dashboard/admin/referidos/comisiones?${param}`;

  try {
    const { porcentaje } = req.body;
    const porcentajeNum = parseFloat(porcentaje);

    if (isNaN(porcentajeNum) || porcentajeNum < 0 || porcentajeNum > 100) {
      return res.redirect(targetRedirect("error=invalid_percentage"));
    }

    await CommissionService.setGeneralCommission(porcentajeNum);

    res.redirect(targetRedirect("success=general_updated"));
  } catch (error) {
    console.error("Error setting general commission:", error);
    res.redirect(targetRedirect("error=server_error"));
  }
});

/**
 * POST /dashboard/admin/referidos/comisiones/especifica - Create/Update Specific Commission %
 */
adminReferralRouter.post("/dashboard/admin/referidos/comisiones/especifica", async (req: Request, res: Response) => {
  const referer = req.headers.referer || "";
  const isMainDashboard = referer.includes("/dashboard/admin") && !referer.includes("/dashboard/admin/referidos");
  const targetRedirect = (param: string) => isMainDashboard ? `/dashboard/admin?tab=referidos&${param}` : `/dashboard/admin/referidos/comisiones?${param}`;

  try {
    const { productType, productId, porcentaje, startDate, endDate } = req.body;
    const porcentajeNum = parseFloat(porcentaje);

    if (!productType || isNaN(porcentajeNum) || porcentajeNum < 0 || porcentajeNum > 100) {
      return res.redirect(targetRedirect("error=invalid_fields"));
    }

    const parsedProductId = productId && productId !== "" && productId !== "ALL" ? parseInt(productId) : null;

    await CommissionService.setSpecificCommission({
      productType: productType as ProductType,
      productId: parsedProductId,
      porcentaje: porcentajeNum,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    });

    res.redirect(targetRedirect("success=specific_updated"));
  } catch (error) {
    console.error("Error setting specific commission:", error);
    res.redirect(targetRedirect("error=server_error"));
  }
});

/**
 * POST /dashboard/admin/referidos/comisiones/eliminar/:id - Delete Commission Rule
 */
adminReferralRouter.post("/dashboard/admin/referidos/comisiones/eliminar/:id", async (req: Request, res: Response) => {
  const referer = req.headers.referer || "";
  const isMainDashboard = referer.includes("/dashboard/admin") && !referer.includes("/dashboard/admin/referidos");
  const targetRedirect = (param: string) => isMainDashboard ? `/dashboard/admin?tab=referidos&${param}` : `/dashboard/admin/referidos/comisiones?${param}`;

  try {
    const id = parseInt(req.params.id as string);
    await db.commissionConfig.delete({ where: { id } });
    res.redirect(targetRedirect("success=rule_deleted"));
  } catch (error) {
    console.error("Error deleting commission rule:", error);
    res.redirect(targetRedirect("error=server_error"));
  }
});

/**
 * GET /dashboard/admin/referidos/retiros - Withdrawal Requests Review
 */
adminReferralRouter.get("/dashboard/admin/referidos/retiros", async (req: Request, res: Response) => {
  try {
    const withdrawals = await db.referralWithdrawal.findMany({
      include: {
        referral: { include: { user: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.render("admin-referidos-retiros", {
      user: res.locals.user,
      withdrawals,
      success: req.query.success,
      error: req.query.error,
    });
  } catch (error) {
    console.error("Error loading withdrawal requests:", error);
    res.status(500).send("Error al cargar las solicitudes de retiro.");
  }
});

/**
 * POST /dashboard/admin/referidos/retiros/:id/procesar - Process Withdrawal Status
 */
adminReferralRouter.post("/dashboard/admin/referidos/retiros/:id/procesar", async (req: Request, res: Response) => {
  const referer = req.headers.referer || "";
  const isMainDashboard = referer.includes("/dashboard/admin") && !referer.includes("/dashboard/admin/referidos");
  const targetRedirect = (param: string) => isMainDashboard ? `/dashboard/admin?tab=referidos&${param}` : `/dashboard/admin/referidos/retiros?${param}`;

  try {
    const withdrawalId = parseInt(req.params.id as string);
    const { estado, observacionesAdmin, comprobantePagoUrl } = req.body;

    const withdrawal = await db.referralWithdrawal.findUnique({
      where: { id: withdrawalId },
      include: { referral: true },
    });

    await ReferralWalletService.processWithdrawalStatus(
      withdrawalId,
      estado as WithdrawalStatus,
      comprobantePagoUrl,
      observacionesAdmin
    );

    if (withdrawal?.referral?.userId) {
      const io = req.app.get("io");
      emitToUser(io, withdrawal.referral.userId, "referral:withdrawal_updated", {
        withdrawalId,
        estado,
        monto: withdrawal.monto,
      });
    }

    res.redirect(targetRedirect("success=withdrawal_processed"));
  } catch (error: any) {
    console.error("Error processing withdrawal:", error);
    res.redirect(targetRedirect(`error=${encodeURIComponent(error.message || "error")}`));
  }
});
