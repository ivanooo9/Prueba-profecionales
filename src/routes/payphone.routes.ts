import express, { Request, Response, NextFunction } from "express";
import { db } from "../lib/db";
import { toTitleCase } from "../lib/utils";
import { emailService } from "../lib/email";
import {
  preparePayment,
  confirmPayment,
  getConfig,
  type PayPhoneItemType,
} from "../lib/payphone";
import { cachedFetch, cacheKeyFactory as cacheKey } from "../lib/cache";

const router = express.Router();

const getMembershipPlanById = (id: number) =>
  cachedFetch(cacheKey.membershipPlan.byId(id), () =>
    db.membershipPlan.findUnique({ where: { id } })
  );

const getPromotionPlanById = (id: number) =>
  cachedFetch(cacheKey.promotionPlan.byId(id), () =>
    db.promotionPlan.findUnique({ where: { id } })
  );

// =====================================================
// Tipos y constantes
// =====================================================

const VALID_ITEM_TYPES: PayPhoneItemType[] = [
  "COURSE",
  "CERTIFICATE",
  "MEMBERSHIP",
  "CONVERSATORIO",
  "PROMOTION",
];

/** Etiquetas legibles en español para cada itemType. */
const ITEM_TYPE_LABELS: Record<string, string> = {
  COURSE: "Curso",
  CERTIFICATE: "Certificado",
  MEMBERSHIP: "Membresía",
  CONVERSATORIO: "Conversatorio",
  PROMOTION: "Promoción",
};

export interface ActivateServiceResult {
  success: boolean;
  serviceLabel: string;
  message: string;
}

// =====================================================
// Middlewares
// =====================================================

/**
 * Middleware de autenticación para endpoints JSON.
 * A diferencia de requireAdmin/requireClient/requireProfessional (que redirigen a /login),
 * este devuelve 401 JSON para que el frontend AJAX lo maneje limpiamente.
 * Requiere usuario logueado, cualquier rol.
 */
function requireAnyUser(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) {
    return res
      .status(401)
      .json({ success: false, error: "Debes iniciar sesión para continuar." });
  }
  next();
}

// =====================================================
// Helper: activación del servicio comprado
// =====================================================

/**
 * Activa el servicio asociado a una transacción aprobada de PayPhone.
 * Es idempotente: si el servicio ya estaba activado/emitido, no lo duplica.
 *
 * @param itemType  Tipo de item (COURSE, CERTIFICATE, MEMBERSHIP, CONVERSATORIO, PROMOTION)
 * @param itemId    ID del item comprado
 * @param userId    ID del usuario que pagó
 * @param transactionId ID de la PayPhoneTransaction (para leer el monto)
 */
async function activateService(
  itemType: string,
  itemId: number,
  userId: number,
  transactionId: number
): Promise<ActivateServiceResult> {
  // Monto pagado en dólares (la DB guarda centavos)
  const tx = await db.payPhoneTransaction.findUnique({
    where: { id: transactionId },
    select: { amount: true },
  });
  const precioPagado = tx ? tx.amount / 100 : 0;

  switch (itemType) {
    // ---------------- COURSE ----------------
    case "COURSE": {
      const curso = await db.curso.findUnique({
        where: { id: itemId },
        select: { id: true, titulo: true },
      });
      // Idempotente: upsert sobre la clave compuesta userId_cursoId
      await db.eventEnrollment.upsert({
        where: { userId_cursoId: { userId, cursoId: itemId } },
        update: {},
        create: { userId, cursoId: itemId },
      });
      const label = curso?.titulo || `Curso #${itemId}`;
      return {
        success: true,
        serviceLabel: label,
        message: `Tu acceso al curso "${label}" ha sido activado.`,
      };
    }

    // ---------------- CONVERSATORIO ----------------
    case "CONVERSATORIO": {
      const conv = await db.conversatorio.findUnique({
        where: { id: itemId },
        select: { id: true, titulo: true },
      });
      await db.eventEnrollment.upsert({
        where: { userId_conversatorioId: { userId, conversatorioId: itemId } },
        update: {},
        create: { userId, conversatorioId: itemId },
      });
      const label = conv?.titulo || `Conversatorio #${itemId}`;
      return {
        success: true,
        serviceLabel: label,
        message: `Tu inscripción al conversatorio "${label}" ha sido activada.`,
      };
    }

    // ---------------- CERTIFICATE ----------------
    case "CERTIFICATE": {
      // itemId puede ser un curso o un conversatorio. Lo determinamos consultando.
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { name: true, nombreCertificado: true },
      });

      const curso = await db.curso.findUnique({
        where: { id: itemId },
        include: { certificateDesign: true },
      });
      // Usamos `any` porque el include de certificateDesign varía según el modelo;
      // el acceso seguro se controla con null-checks.
      let conversatorio: any = null;
      if (!curso) {
        conversatorio = await db.conversatorio.findUnique({
          where: { id: itemId },
          include: { certificateDesign: true },
        });
      }

      if (!curso && !conversatorio) {
        throw new Error(
          `No se encontró el evento #${itemId} para emitir el certificado.`
        );
      }

      const design = curso?.certificateDesign || conversatorio?.certificateDesign;
      const eventName =
        design?.nombreEvento || curso?.titulo || conversatorio?.titulo || "Evento";
      const horas = design?.horas ?? 40;
      const nombreUsuario = toTitleCase(
        user?.nombreCertificado || user?.name || "Participante"
      );

      // Always ensure EventEnrollment exists so user has access to content
      if (conversatorio) {
        await db.eventEnrollment.upsert({
          where: { userId_conversatorioId: { userId, conversatorioId: itemId } },
          update: {},
          create: { userId, conversatorioId: itemId }
        });
      } else if (curso) {
        await db.eventEnrollment.upsert({
          where: { userId_cursoId: { userId, cursoId: itemId } },
          update: {},
          create: { userId, cursoId: itemId }
        });
      }

      const isImmediateCert = (conversatorio?.certificadoInmediato ?? curso?.certificadoInmediato) ?? true;

      // Idempotencia: si ya existe un certificado para este usuario+evento, no duplicar
      const existingFilter = curso
        ? { userId, cursoId: itemId }
        : { userId, conversatorioId: itemId };
      const existing = await db.certificate.findFirst({
        where: existingFilter as any,
      });
      if (existing) {
        return {
          success: true,
          serviceLabel: eventName,
          message: `Tu inscripción a "${eventName}" fue confirmada y tu certificado ya estaba emitido.`,
        };
      }

      if (!isImmediateCert) {
        return {
          success: true,
          serviceLabel: eventName,
          message: `¡Inscripción confirmada! Podrás obtener tu certificado al completar el porcentaje requerido de asistencia en la plataforma.`,
        };
      }

      const codigo =
        "CERT-" +
        Math.random().toString(36).substring(2, 10).toUpperCase() +
        "-" +
        itemId;

      const createdCert = await db.certificate.create({
        data: {
          userId,
          cursoId: curso ? itemId : null,
          conversatorioId: conversatorio ? itemId : null,
          codigo,
          horas,
          nombreEvento: eventName,
          nombreUsuario,
          precioPagado,
          estado: "APROBADO",
        },
      });

      // Send certificate-available email (fire-and-forget)
      try {
        const certUser = await db.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true },
        });
        if (certUser?.email) {
          emailService
            .sendCertificateAvailable(certUser.email, {
              recipientName: certUser.name || certUser.email,
              eventName,
              certificateUrl: `${process.env.BASE_URL || "http://localhost:3000"}/certificados/${codigo}`,
              issuedAt: new Date().toISOString(),
            })
            .catch((err) =>
              console.warn("Error enviando email de certificado disponible (PayPhone):", err)
            );
        }
      } catch (emailErr) {
        console.warn("No se pudo preparar email de certificado disponible (PayPhone):", emailErr);
      }

      return {
        success: true,
        serviceLabel: eventName,
        message: `Tu certificado para "${eventName}" ha sido emitido correctamente.`,
      };
    }

    // ---------------- MEMBERSHIP ----------------
    case "MEMBERSHIP": {
      const profile = await db.professionalProfile.findUnique({
        where: { userId },
      });
      if (!profile) {
        throw new Error(
          "No se encontró el perfil profesional para activar la membresía."
        );
      }

      // itemId = MembershipPlan.id. Mapeamos el nombre del plan a planType.
      let planType = "PROFESIONAL";
      const plan = await getMembershipPlanById(itemId);
      if (plan) {
        const nombreUpper = plan.nombre.toUpperCase();
        if (nombreUpper.includes("PREMIUM")) planType = "PREMIUM";
        else if (nombreUpper.includes("VERIFICADO")) planType = "VERIFICADO";
        else planType = "PROFESIONAL";
      }

      const ends = new Date();
      ends.setDate(ends.getDate() + 30);

      await db.professionalProfile.update({
        where: { userId },
        data: { planType, verified: true, status: "APROBADO", subscriptionEnds: ends },
      });

      return {
        success: true,
        serviceLabel: `Plan ${planType}`,
        message: `Tu plan profesional ha sido actualizado a ${planType} por 30 días.`,
      };
    }

    // ---------------- PROMOTION ----------------
    case "PROMOTION": {
      const profile = await db.professionalProfile.findUnique({
        where: { userId },
      });
      if (!profile) {
        throw new Error(
          "No se encontró el perfil profesional para activar la promoción."
        );
      }

      // itemId = PromotionPlan.id
      const plan = await getPromotionPlanById(itemId);
      if (!plan) {
        throw new Error(`Plan de promoción #${itemId} no encontrado.`);
      }

      // Idempotencia: si ya hay una promoción ACTIVA para este perfil+plan, no duplicar
      const existing = await db.professionalPromotion.findFirst({
        where: { profileId: profile.id, planId: itemId, status: "ACTIVO" },
      });
      if (existing) {
        return {
          success: true,
          serviceLabel: plan.nombre,
          message: `Tu promoción "${plan.nombre}" ya estaba activada.`,
        };
      }

      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + plan.duracionDias);

      await db.professionalPromotion.create({
        data: {
          profileId: profile.id,
          planId: itemId,
          startDate: start,
          endDate: end,
          status: "ACTIVO",
        },
      });

      return {
        success: true,
        serviceLabel: plan.nombre,
        message: `Tu promoción "${plan.nombre}" ha sido activada por ${plan.duracionDias} días.`,
      };
    }

    default:
      throw new Error(`Tipo de item no soportado para activación: ${itemType}`);
  }
}

// =====================================================
// Rutas
// =====================================================

/**
 * POST /api/payphone/prepare
 * Prepara un pago en PayPhone. Requiere usuario logueado (cualquier rol).
 * Devuelve JSON con la URL de pago (payWithCardUrl) para redirigir al usuario.
 */
router.post(
  "/api/payphone/prepare",
  requireAnyUser,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { itemType, itemId, baseAmount, hasTax, productName } = req.body;

      // 1. Validaciones
      if (
        !itemType ||
        itemId === undefined ||
        itemId === null ||
        baseAmount === undefined ||
        baseAmount === null ||
        !productName
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Faltan campos requeridos: itemType, itemId, baseAmount, productName.",
        });
      }

      if (!VALID_ITEM_TYPES.includes(itemType as PayPhoneItemType)) {
        return res.status(400).json({
          success: false,
          error: `itemType inválido. Valores permitidos: ${VALID_ITEM_TYPES.join(
            ", "
          )}.`,
        });
      }

      const baseAmountNum = Number(baseAmount);
      if (isNaN(baseAmountNum) || baseAmountNum <= 0) {
        return res.status(400).json({
          success: false,
          error: "baseAmount debe ser un número mayor a 0.",
        });
      }

      const itemIdNum = parseInt(itemId, 10);
      if (isNaN(itemIdNum)) {
        return res
          .status(400)
          .json({ success: false, error: "itemId debe ser un número entero." });
      }

      // 2. taxRate se lee internamente en preparePayment vía getConfig();
      //    lo obtenemos aquí solo para validación temprana de configuración.
      const { taxRate } = await getConfig();

      // 3. Preparar pago
      const result = await preparePayment({
        baseAmount: baseAmountNum,
        hasTax: !!hasTax,
        productName: String(productName),
        userName: user.name || user.email,
        itemType: itemType as PayPhoneItemType,
        itemId: itemIdNum,
        userId: user.id,
      });

      // 4. URL de pago: preferimos tarjeta, fallback a app PayPhone
      const payWithCardUrl =
        result.prepareResponse.payWithCard ||
        result.prepareResponse.payWithPayPhone ||
        null;

      return res.json({
        success: true,
        clientTransactionId: result.clientTransactionId,
        paymentId:
          result.prepareResponse.paymentId !== undefined
            ? String(result.prepareResponse.paymentId)
            : null,
        payWithCardUrl,
        transactionId: result.transaction.id,
        taxRate,
      });
    } catch (error) {
      console.error("PayPhone prepare error:", error);
      const message =
        error instanceof Error &&
        (error.message.includes("BASE_URL") ||
          error.message.includes("token no configurado") ||
          error.message.includes("storeId no configurado"))
          ? error.message
          : "No se pudo preparar el pago con PayPhone. Verifica la configuración pública del servicio e inténtalo nuevamente.";

      return res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
);

/**
 * GET /validar-pago-pp
 * Ruta pública (callback de PayPhone). PayPhone redirige aquí con ?id=&clientTxId=
 * Confirma el pago, actualiza la transacción y activa el servicio comprado.
 */
router.get("/validar-pago-pp", async (req: Request, res: Response) => {
  const id = req.query.id as string | undefined;
  const clientTxId = req.query.clientTxId as string | undefined;

  // Render base helper para no repetir código
  const renderResult = (
    status: "success" | "cancelled" | "error",
    message: string,
    transaction: any,
    serviceMessage: string | null
  ) => {
    const amountUSD =
      transaction && typeof transaction.amount === "number"
        ? transaction.amount / 100
        : null;
    return res.render("validar-pago-pp", {
      title:
        status === "success"
          ? "Pago Aprobado"
          : status === "cancelled"
          ? "Pago Cancelado"
          : "Validación de Pago",
      activePage: "validar-pago-pp",
      status,
      message,
      transaction,
      itemType: transaction?.itemType || null,
      itemId: transaction?.itemId || null,
      serviceMessage,
      amountUSD,
      itemTypeLabel: transaction?.itemType
        ? ITEM_TYPE_LABELS[transaction.itemType] || transaction.itemType
        : null,
    });
  };

  // 1. Validar parámetros
  if (!id || !clientTxId) {
    return renderResult(
      "error",
      "Parámetros de validación incompletos. Contacta al soporte si crees que es un error.",
      null,
      null
    );
  }

  try {
    // 2. Confirmar el pago con PayPhone (actualiza status en DB internamente)
    const { confirmResponse, transaction } = await confirmPayment(
      parseInt(id, 10),
      clientTxId
    );
    const statusCode = (confirmResponse as any).statusCode as number | undefined;

    // 3. Recuperar el registro completo (con itemType, itemId, userId) para activación + vista
    const fullTx = await db.payPhoneTransaction.findUnique({
      where: { id: transaction.id },
    });

    // 4. Branch por statusCode
    if (statusCode === 3) {
      // APPROVED → activar servicio
      let serviceMessage =
        "Tu servicio ha sido activado correctamente.";

      if (fullTx) {
        try {
          const activation = await activateService(
            fullTx.itemType,
            fullTx.itemId,
            fullTx.userId,
            fullTx.id
          );
          serviceMessage = activation.message;
        } catch (actErr) {
          console.error(
            `PayPhone: error activando servicio (tx ${fullTx.id}, tipo ${fullTx.itemType}):`,
            actErr
          );
          serviceMessage =
            "El pago fue aprobado, pero hubo un problema al activar tu servicio. Por favor contáctanos para asistencia.";
        }

        // Send payment-registered email (fire-and-forget)
        try {
          const payerUser = await db.user.findUnique({
            where: { id: fullTx.userId },
            select: { name: true, email: true },
          });
          if (payerUser?.email) {
            const itemLabel =
              ITEM_TYPE_LABELS[fullTx.itemType] || fullTx.itemType;
            const txRef = fullTx.paymentId || fullTx.clientTransactionId;
            emailService
              .sendPaymentRegistered(payerUser.email, {
                recipientName: payerUser.name || payerUser.email,
                amount: fullTx.amount / 100,
                currency: "USD",
                concept: `${itemLabel} #${fullTx.itemId}`,
                paymentMethod: "PayPhone",
                paymentDate: new Date().toLocaleDateString("es-EC"),
                reference: txRef,
                transactionId: txRef,
              })
              .catch((err) =>
                console.warn("Error enviando email de pago registrado (PayPhone):", err)
              );
          }
        } catch (emailErr) {
          console.warn("No se pudo preparar email de pago (PayPhone):", emailErr);
        }
      }

      return renderResult(
        "success",
        "Pago aprobado. Tu servicio ha sido activado.",
        fullTx,
        serviceMessage
      );
    }

    if (statusCode === 2) {
      // CANCELLED
      return renderResult(
        "cancelled",
        "El pago fue cancelado o rechazado.",
        fullTx,
        null
      );
    }

    // Estado desconocido / pendiente
    return renderResult(
      "error",
      "No se pudo confirmar el pago. Inténtalo de nuevo.",
      fullTx,
      null
    );
  } catch (error) {
    console.error("PayPhone confirm/validar-pago-pp error:", error);
    return renderResult(
      "error",
      "No se pudo confirmar el pago. Inténtalo de nuevo.",
      null,
      null
    );
  }
});

export default router;
