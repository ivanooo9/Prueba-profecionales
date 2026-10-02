import { Router, Request, Response, NextFunction } from "express";
import { db } from "../lib/db";
import { comparePassword, hashPassword } from "../lib/auth";
import { ReferralSaleService } from "../services/referral-sale.service";
import { ReferralWalletService } from "../services/referral-wallet.service";
import { uploadBase64ToCloudinary } from "../lib/cloudinary";
import { ProductType } from "@prisma/client";
import { emitToRole, emitToUser } from "../lib/socket";

export const referralRouter = Router();

/**
 * Middleware: Requires logged in user with role REFERIDO.
 */
const requireReferralRole = (req: Request, res: Response, next: NextFunction) => {
  if (!req.path.startsWith("/dashboard/referido")) {
    return next();
  }
  const user = res.locals.user;
  if (!user || user.role?.name !== "REFERIDO") {
    return res.redirect("/login?error=unauthorized_referral");
  }
  next();
};

/**
 * Middleware: Forces redirect to onboarding wizard if status is PENDING_CONFIG.
 */
const checkPendingConfig = (req: Request, res: Response, next: NextFunction) => {
  if (!req.path.startsWith("/dashboard/referido")) {
    return next();
  }
  const user = res.locals.user;
  const profile = user?.referralProfile;

  const isOnboardingPath = req.path === "/dashboard/referido/configuracion-inicial";

  if (profile && profile.status === "PENDING_CONFIG" && !isOnboardingPath) {
    return res.redirect("/dashboard/referido/configuracion-inicial");
  }

  next();
};

// Apply auth & onboarding check to all referral routes
referralRouter.use(requireReferralRole);
referralRouter.use(checkPendingConfig);



/**
 * GET /dashboard/referido/configuracion-inicial - Onboarding Wizard View
 */
referralRouter.get("/dashboard/referido/configuracion-inicial", async (req: Request, res: Response) => {
  try {
    const user = res.locals.user;
    const profile = await db.referralProfile.findUnique({
      where: { userId: user.id },
    });

    res.render("referido-configuracion-inicial", {
      user,
      profile,
      error: req.query.error,
      success: req.query.success,
    });
  } catch (error) {
    console.error("Error loading referral onboarding:", error);
    res.status(500).send("Error al cargar la configuración inicial.");
  }
});

/**
 * POST /dashboard/referido/configuracion-inicial - Save Onboarding & Mandatory Password Change
 */
referralRouter.post("/dashboard/referido/configuracion-inicial", async (req: Request, res: Response) => {
  try {
    const user = res.locals.user;
    const {
      nombres,
      apellidos,
      cedula,
      fechaNacimiento,
      whatsapp,
      direccion,
      ciudad,
      provincia,
      pais,
      banco,
      tipoCuenta,
      numeroCuenta,
      titularNombre,
      titularCedula,
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    // 1. Password validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.redirect("/dashboard/referido/configuracion-inicial?error=missing_password_fields");
    }

    if (newPassword !== confirmPassword) {
      return res.redirect("/dashboard/referido/configuracion-inicial?error=password_mismatch");
    }

    if (newPassword.length < 6) {
      return res.redirect("/dashboard/referido/configuracion-inicial?error=password_too_short");
    }

    const isValidCurrent = await comparePassword(currentPassword, user.password);
    if (!isValidCurrent) {
      return res.redirect("/dashboard/referido/configuracion-inicial?error=invalid_current_password");
    }

    // 2. Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // 3. Update User & ReferralProfile atomically
    await db.$transaction(async (tx) => {
      // Update User
      await tx.user.update({
        where: { id: user.id },
        data: {
          password: newPasswordHash,
          name: `${nombres} ${apellidos}`.trim(),
          telefono: whatsapp || null,
          ciudad: ciudad || null,
        },
      });

      // Update or create ReferralProfile
      await tx.referralProfile.upsert({
        where: { userId: user.id },
        update: {
          status: "ACTIVE",
          activatedAt: new Date(),
          nombres: nombres?.trim(),
          apellidos: apellidos?.trim(),
          cedula: cedula?.trim(),
          fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
          whatsapp: whatsapp?.trim(),
          direccion: direccion?.trim(),
          ciudad: ciudad?.trim(),
          provincia: provincia?.trim(),
          pais: pais?.trim() || "Ecuador",
          banco: banco?.trim(),
          tipoCuenta: tipoCuenta?.trim() || "Ahorros",
          numeroCuenta: numeroCuenta?.trim(),
          titularNombre: titularNombre?.trim(),
          titularCedula: titularCedula?.trim(),
        },
        create: {
          userId: user.id,
          status: "ACTIVE",
          activatedAt: new Date(),
          nombres: nombres?.trim(),
          apellidos: apellidos?.trim(),
          cedula: cedula?.trim(),
          fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
          whatsapp: whatsapp?.trim(),
          direccion: direccion?.trim(),
          ciudad: ciudad?.trim(),
          provincia: provincia?.trim(),
          pais: pais?.trim() || "Ecuador",
          banco: banco?.trim(),
          tipoCuenta: tipoCuenta?.trim() || "Ahorros",
          numeroCuenta: numeroCuenta?.trim(),
          titularNombre: titularNombre?.trim(),
          titularCedula: titularCedula?.trim(),
        },
      });

      await tx.referralAuditLog.create({
        data: {
          referralId: user.referralProfile?.id,
          actorId: user.id,
          accion: "CONFIGURACION_INICIAL_COMPLETADA",
          detalle: "Cuenta configurada activada y contraseña cambiada por el referido.",
        },
      });
    });

    res.redirect("/dashboard/referido?success=account_activated");
  } catch (error) {
    console.error("Error during referral onboarding submission:", error);
    res.redirect("/dashboard/referido/configuracion-inicial?error=server_error");
  }
});

/**
 * GET /dashboard/referido - Main Referral Dashboard
 */
referralRouter.get("/dashboard/referido", async (req: Request, res: Response) => {
  try {
    const user = res.locals.user;
    let profile = await db.referralProfile.findUnique({
      where: { userId: user.id },
      include: { wallet: true },
    });

    if (!profile) {
      profile = await db.referralProfile.create({
        data: { userId: user.id },
        include: { wallet: true },
      });
    }

    const walletSummary = await ReferralWalletService.getWalletSummary(profile.id);
    const wallet = walletSummary.wallet;

    // Sales Stats
    const sales = await db.referralSale.findMany({
      where: { referralId: profile.id },
      orderBy: { createdAt: "desc" },
    });

    const totalVentas = sales.length;
    const ventasAprobadas = sales.filter((s) => s.estado === "APROBADO");
    const ventasPendientes = sales.filter((s) => s.estado === "PENDIENTE" || s.estado === "EN_REVISION");
    const ventasRechazadas = sales.filter((s) => s.estado === "RECHAZADO");

    const totalGeneradoHistorico = ventasAprobadas.reduce((sum, s) => sum + s.comisionCalculada, 0);

    // Current month sales
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const ventasMesActual = ventasAprobadas.filter((s) => s.aprobadoAt && s.aprobadoAt >= startOfMonth);
    const totalGeneradoMesActual = ventasMesActual.reduce((sum, s) => sum + s.comisionCalculada, 0);

    // Available paid products for selection in sale registration form
    const conversatorios = await db.conversatorio.findMany({
      where: {
        OR: [{ gratuito: false }, { precio: { gt: 0 } }],
      },
      select: { id: true, titulo: true, precio: true },
      orderBy: { createdAt: "desc" },
    });

    const cursos = await db.curso.findMany({
      where: {
        OR: [{ gratuito: false }, { precio: { gt: 0 } }],
      },
      select: { id: true, titulo: true, precio: true },
      orderBy: { createdAt: "desc" },
    });

    const membershipPlans = await db.membershipPlan.findMany({
      where: { precio: { gt: 0 } },
      select: { id: true, nombre: true, precio: true },
      orderBy: { precio: "asc" },
    });

    const promotionPlans = await db.promotionPlan.findMany({
      where: { precio: { gte: 0 } },
      select: { id: true, nombre: true, precio: true },
      orderBy: { precio: "asc" },
    });

    res.render("dashboard-referido", {
      user,
      profile,
      wallet: walletSummary.wallet,
      transactions: walletSummary.transactions,
      withdrawals: walletSummary.withdrawals,
      sales,
      conversatorios,
      cursos,
      membershipPlans,
      promotionPlans,
      stats: {
        totalVentas,
        cantAprobadas: ventasAprobadas.length,
        cantPendientes: ventasPendientes.length,
        cantRechazadas: ventasRechazadas.length,
        totalGeneradoHistorico,
        totalGeneradoMesActual,
        saldoPendiente: wallet.saldoPendiente,
        saldoDisponible: wallet.saldoDisponible,
        saldoRetirado: wallet.saldoRetirado,
      },
      recentSales: sales.slice(0, 5),
      activeTab: req.query.tab || "dashboard",
      success: req.query.success,
      error: req.query.error,
    });
  } catch (error) {
    console.error("Error loading referral dashboard:", error);
    res.status(500).send("Error interno al cargar el panel de referido.");
  }
});

/**
 * GET /dashboard/referido/ventas - Subroute redirecting to unified dashboard
 */
referralRouter.get("/dashboard/referido/ventas", async (req: Request, res: Response) => {
  const queryParams = new URLSearchParams(req.query as any);
  queryParams.set("tab", "ventas");
  res.redirect(`/dashboard/referido?${queryParams.toString()}`);
});

/**
 * POST /dashboard/referido/ventas - Register New Pending Sale
 */
referralRouter.post("/dashboard/referido/ventas", async (req: Request, res: Response) => {
  try {
    const user = res.locals.user;
    const profile = await db.referralProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile || profile.status !== "ACTIVE") {
      return res.redirect("/dashboard/referido?tab=ventas&error=account_not_active");
    }

    const {
      clienteNombre,
      clienteCedula,
      clienteEmail,
      clienteTelefono,
      productType,
      productId,
      productName,
      valorPagado,
      comprobanteUrl,
    } = req.body;

    if (!clienteNombre || !clienteEmail || !productType || !valorPagado || !comprobanteUrl) {
      return res.redirect("/dashboard/referido?tab=ventas&error=missing_fields");
    }

    let finalComprobanteUrl = comprobanteUrl;
    if (comprobanteUrl && (comprobanteUrl.startsWith("data:") || comprobanteUrl.length > 500)) {
      try {
        finalComprobanteUrl = await uploadBase64ToCloudinary(comprobanteUrl, "comprobantes-referidos");
      } catch (uploadErr) {
        console.warn("Cloudinary upload fallback to raw data for referral sale:", uploadErr);
      }
    }

    const createdSale = await ReferralSaleService.createPendingSale({
      referralId: profile.id,
      clienteNombre,
      clienteCedula: clienteCedula || "9999999999",
      clienteEmail,
      clienteTelefono: clienteTelefono || "0999999999",
      productType: productType as ProductType,
      productId: productId ? parseInt(productId) : null,
      productName,
      valorPagado: parseFloat(valorPagado),
      comprobanteUrl: finalComprobanteUrl,
    });

    const io = req.app.get("io");
    emitToRole(io, "ADMIN", "admin:new_sale", {
      saleId: createdSale.id,
      clienteNombre,
      productName,
      valorPagado: parseFloat(valorPagado),
      referralEmail: user.email,
    });

    res.redirect("/dashboard/referido?tab=ventas&success=sale_registered");
  } catch (error) {
    console.error("Error registering referral sale:", error);
    res.redirect("/dashboard/referido?tab=ventas&error=server_error");
  }
});

/**
 * GET /dashboard/referido/billetera - Subroute redirecting to unified dashboard
 */
referralRouter.get("/dashboard/referido/billetera", async (req: Request, res: Response) => {
  const queryParams = new URLSearchParams(req.query as any);
  queryParams.set("tab", "billetera");
  res.redirect(`/dashboard/referido?${queryParams.toString()}`);
});

/**
 * POST /dashboard/referido/retiros - Request Withdrawal
 */
referralRouter.post("/dashboard/referido/retiros", async (req: Request, res: Response) => {
  try {
    const user = res.locals.user;
    const profile = await db.referralProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) return res.redirect("/dashboard/referido");

    const { monto, observacionesReferido } = req.body;
    const amountNum = parseFloat(monto);

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.redirect("/dashboard/referido?tab=billetera&error=invalid_amount");
    }

    const createdReq = await ReferralWalletService.requestWithdrawal(profile.id, amountNum, observacionesReferido);

    const io = req.app.get("io");
    emitToRole(io, "ADMIN", "admin:new_withdrawal", {
      withdrawalId: createdReq.id,
      monto: amountNum,
      referralEmail: user.email,
    });

    res.redirect("/dashboard/referido?tab=billetera&success=withdrawal_submitted");
  } catch (error: any) {
    console.error("Error requesting withdrawal:", error);
    res.redirect(`/dashboard/referido?tab=billetera&error=${encodeURIComponent(error.message || "error")}`);
  }
});

/**
 * POST /dashboard/referido/configuracion - Update Personal & Banking Information
 */
referralRouter.post("/dashboard/referido/configuracion", async (req: Request, res: Response) => {
  try {
    const user = res.locals.user;
    const profile = await db.referralProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) return res.redirect("/dashboard/referido");

    const {
      nombres,
      apellidos,
      cedula,
      whatsapp,
      direccion,
      ciudad,
      provincia,
      banco,
      tipoCuenta,
      numeroCuenta,
      titularNombre,
      titularCedula,
    } = req.body;

    if (!nombres || !apellidos || !cedula || !banco || !numeroCuenta) {
      return res.redirect("/dashboard/referido?tab=config&error=missing_required_fields");
    }

    await db.referralProfile.update({
      where: { id: profile.id },
      data: {
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        cedula: cedula.trim(),
        whatsapp: whatsapp ? whatsapp.trim() : null,
        direccion: direccion ? direccion.trim() : null,
        ciudad: ciudad ? ciudad.trim() : null,
        provincia: provincia ? provincia.trim() : null,
        banco: banco.trim(),
        tipoCuenta: tipoCuenta ? tipoCuenta.trim() : "Ahorros",
        numeroCuenta: numeroCuenta.trim(),
        titularNombre: titularNombre ? titularNombre.trim() : `${nombres.trim()} ${apellidos.trim()}`,
        titularCedula: titularCedula ? titularCedula.trim() : cedula.trim(),
      },
    });

    // Update User display name & whatsapp phone
    await db.user.update({
      where: { id: user.id },
      data: {
        name: `${nombres.trim()} ${apellidos.trim()}`,
        ...(whatsapp && { telefono: whatsapp.trim() }),
      },
    });

    res.redirect("/dashboard/referido?tab=config&success=profile_updated");
  } catch (error) {
    console.error("Error updating referral profile configuration:", error);
    res.redirect("/dashboard/referido?tab=config&error=server_error");
  }
});
