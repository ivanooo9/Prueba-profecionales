import { db } from "../lib/db";
import { ProductType } from "@prisma/client";
import { CommissionService } from "./commission.service";
import { ReferralWalletService } from "./referral-wallet.service";
import { hashPassword } from "../lib/auth";
import { sendSaleApprovedClientWelcomeEmail, sendSaleApprovedReferralNotification, sendSaleRejectedReferralNotification } from "../lib/referral-email";
import { CertificateEligibilityService, getValidCertificateUserName } from "./certificate-eligibility.service";
import crypto from "crypto";

export class ReferralSaleService {
  /**
   * Registers a new sale in PENDIENTE status by a Referral.
   */
  static async createPendingSale(data: {
    referralId: number;
    clienteNombre: string;
    clienteCedula: string;
    clienteEmail: string;
    clienteTelefono: string;
    productType: ProductType;
    productId?: number | null;
    productName: string;
    valorPagado: number;
    comprobanteUrl: string;
  }) {
    // Preliminary calculation of commission for preview
    const commissionRes = await CommissionService.calculateCommission(
      data.productType,
      data.productId,
      data.valorPagado
    );

    const sale = await db.referralSale.create({
      data: {
        referralId: data.referralId,
        clienteNombre: data.clienteNombre.trim(),
        clienteCedula: data.clienteCedula.trim(),
        clienteEmail: data.clienteEmail.trim().toLowerCase(),
        clienteTelefono: data.clienteTelefono.trim(),
        productType: data.productType,
        productId: data.productId || null,
        productName: data.productName.trim(),
        valorPagado: data.valorPagado,
        comprobanteUrl: data.comprobanteUrl,
        comisionPorcentaje: commissionRes.porcentaje,
        comisionCalculada: commissionRes.comisionMonto,
        estado: "PENDIENTE",
      },
    });

    await db.referralAuditLog.create({
      data: {
        referralId: data.referralId,
        accion: "VENTA_REGISTRADA",
        detalle: `Venta #${sale.id} registrada por $${data.valorPagado} (${data.productName})`,
      },
    });

    return sale;
  }

  /**
   * Edits a pending sale (Only allowed when status is PENDIENTE).
   */
  static async updatePendingSale(
    saleId: number,
    referralId: number,
    data: {
      clienteNombre?: string;
      clienteCedula?: string;
      clienteEmail?: string;
      clienteTelefono?: string;
      productType?: ProductType;
      productId?: number | null;
      productName?: string;
      valorPagado?: number;
      comprobanteUrl?: string;
    }
  ) {
    const sale = await db.referralSale.findUnique({
      where: { id: saleId },
    });

    if (!sale || sale.referralId !== referralId) {
      throw new Error("Venta no encontrada.");
    }

    if (sale.estado !== "PENDIENTE") {
      throw new Error("Únicamente las ventas en estado PENDIENTE pueden ser editadas.");
    }

    const newProductType = data.productType || sale.productType;
    const newProductId = data.productId !== undefined ? data.productId : sale.productId;
    const newValor = data.valorPagado !== undefined ? data.valorPagado : sale.valorPagado;

    const commissionRes = await CommissionService.calculateCommission(
      newProductType,
      newProductId,
      newValor
    );

    return db.referralSale.update({
      where: { id: saleId },
      data: {
        ...(data.clienteNombre && { clienteNombre: data.clienteNombre.trim() }),
        ...(data.clienteCedula && { clienteCedula: data.clienteCedula.trim() }),
        ...(data.clienteEmail && { clienteEmail: data.clienteEmail.trim().toLowerCase() }),
        ...(data.clienteTelefono && { clienteTelefono: data.clienteTelefono.trim() }),
        ...(data.productType && { productType: data.productType }),
        ...(data.productId !== undefined && { productId: data.productId }),
        ...(data.productName && { productName: data.productName.trim() }),
        ...(data.valorPagado !== undefined && { valorPagado: data.valorPagado }),
        ...(data.comprobanteUrl && { comprobanteUrl: data.comprobanteUrl }),
        comisionPorcentaje: commissionRes.porcentaje,
        comisionCalculada: commissionRes.comisionMonto,
      },
    });
  }

  /**
   * Approves a sale, creates/configures client account, enrolls in product, and credits commission to Referral's wallet.
   */
  static async approveSaleAndEnrollClient(saleId: number, adminUserId: number, observacionesAdmin?: string) {
    const sale = await db.referralSale.findUnique({
      where: { id: saleId },
      include: { referral: { include: { user: true } } },
    });

    if (!sale) {
      throw new Error("Venta no encontrada.");
    }

    if (sale.estado === "APROBADO") {
      throw new Error("Esta venta ya ha sido aprobada previamente.");
    }

    // 1. Recalculate official commission using Priority Rule
    const commissionRes = await CommissionService.calculateCommission(
      sale.productType,
      sale.productId,
      sale.valorPagado
    );

    // 2. Client account creation / lookup
    const clientEmail = sale.clienteEmail.trim().toLowerCase();
    let clientUser = await db.user.findUnique({
      where: { email: clientEmail },
    });

    let tempPasswordForClient: string | undefined = undefined;

    if (!clientUser) {
      // Find or create CLIENT role
      let clientRole = await db.role.findFirst({ where: { name: "CLIENT" } });
      if (!clientRole) {
        clientRole = await db.role.create({
          data: { name: "CLIENT", description: "Cliente o Comprador de la Plataforma" },
        });
      }

      // Generate random secure password for client onboarding
      tempPasswordForClient = `Cliente_${crypto.randomBytes(4).toString("hex")}`;
      const passwordHash = await hashPassword(tempPasswordForClient);

      clientUser = await db.user.create({
        data: {
          email: clientEmail,
          password: passwordHash,
          name: sale.clienteNombre,
          telefono: sale.clienteTelefono,
          roleId: clientRole.id,
          requireProfileSetup: true,
        },
      });
    }

    // 3. Smart Product Resolution & Automatic Enrollment
    let targetConversatorioId: number | null = null;
    let targetCursoId: number | null = null;

    if (sale.productType === "CONVERSATORIO") {
      if (sale.productId) {
        const existsConv = await db.conversatorio.findUnique({ where: { id: sale.productId } });
        if (existsConv) targetConversatorioId = existsConv.id;
      }
      if (!targetConversatorioId && sale.productName) {
        const foundConv = await db.conversatorio.findFirst({
          where: { titulo: { equals: sale.productName.trim(), mode: "insensitive" } },
        });
        if (foundConv) targetConversatorioId = foundConv.id;
      }
    } else if (sale.productType === "CURSO") {
      if (sale.productId) {
        const existsCur = await db.curso.findUnique({ where: { id: sale.productId } });
        if (existsCur) targetCursoId = existsCur.id;
      }
      if (!targetCursoId && sale.productName) {
        const foundCur = await db.curso.findFirst({
          where: { titulo: { equals: sale.productName.trim(), mode: "insensitive" } },
        });
        if (foundCur) targetCursoId = foundCur.id;
      }
    }

    try {
      if (targetConversatorioId) {
        // 3.1 Event Enrollment
        await db.eventEnrollment.upsert({
          where: {
            userId_conversatorioId: {
              userId: clientUser.id,
              conversatorioId: targetConversatorioId,
            },
          },
          update: {},
          create: {
            userId: clientUser.id,
            conversatorioId: targetConversatorioId,
          },
        });

        // 3.2 Certificate Pass Creation (Only if certificadoInmediato is enabled)
        const conv = await db.conversatorio.findUnique({ where: { id: targetConversatorioId } });
        if (conv?.certificadoInmediato) {
          await CertificateEligibilityService.checkAndGrantConversatorioCertificate(
            clientUser.id,
            targetConversatorioId
          );
        }
      } else if (targetCursoId) {
        // 3.3 Course Enrollment
        await db.eventEnrollment.upsert({
          where: {
            userId_cursoId: {
              userId: clientUser.id,
              cursoId: targetCursoId,
            },
          },
          update: {},
          create: {
            userId: clientUser.id,
            cursoId: targetCursoId,
          },
        });

        // 3.4 Course Certificate Pass Creation (Only if certificadoInmediato is enabled and user has valid name)
        const cur = await db.curso.findUnique({ where: { id: targetCursoId } });
        if (cur?.certificadoInmediato) {
          const existingCert = await db.certificate.findFirst({
            where: {
              userId: clientUser.id,
              cursoId: targetCursoId,
            },
          });

          const certUserName = getValidCertificateUserName(clientUser);

          if (!existingCert && certUserName) {
            const certCode = `CERT-CURSO-${targetCursoId}-${clientUser.id}-${Date.now().toString(36).toUpperCase()}`;
            await db.certificate.create({
              data: {
                userId: clientUser.id,
                cursoId: targetCursoId,
                codigo: certCode,
                horas: 20,
                fechaEmision: new Date(),
                nombreEvento: cur?.titulo || sale.productName,
                nombreUsuario: certUserName,
                precioPagado: sale.valorPagado,
                estado: "APROBADO",
              },
            });
          }
        }
      }
    } catch (enrollErr) {
      console.warn("[ReferralSaleService] Automatic enrollment skipped due to product reference:", enrollErr);
    }

    // 4. Update sale to APROBADO
    const updatedSale = await db.referralSale.update({
      where: { id: saleId },
      data: {
        estado: "APROBADO",
        comisionPorcentaje: commissionRes.porcentaje,
        comisionCalculada: commissionRes.comisionMonto,
        aprobadoAt: new Date(),
        aprobadoPorId: adminUserId,
        observacionesAdmin: observacionesAdmin || "Venta verificada y aprobada por la administración.",
      },
    });

    // 5. Credit commission to Referral's wallet
    await ReferralWalletService.creditSaleCommission(saleId);

    // 6. Audit log
    await db.referralAuditLog.create({
      data: {
        referralId: sale.referralId,
        actorId: adminUserId,
        accion: "VENTA_APROBADA",
        detalle: `Venta #${sale.id} aprobada. Cliente ${sale.clienteEmail} inscrito. Comisión: $${commissionRes.comisionMonto}`,
      },
    });

    // 7. Send Emails (Non-blocking)
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    sendSaleApprovedClientWelcomeEmail({
      to: clientEmail,
      clientName: sale.clienteNombre,
      tempPassword: tempPasswordForClient,
      loginUrl: `${baseUrl}/login`,
      productName: sale.productName,
    }).catch(err => console.error("Error sending client welcome email:", err));

    sendSaleApprovedReferralNotification({
      to: sale.referral.user.email,
      saleId: sale.id,
      productName: sale.productName,
      clientName: sale.clienteNombre,
      commissionAmount: commissionRes.comisionMonto,
    }).catch(err => console.error("Error sending referral approval notification email:", err));

    return updatedSale;
  }

  /**
   * Rejects a sale with admin observations.
   */
  static async rejectSale(saleId: number, adminUserId: number, observacionesAdmin: string) {
    const sale = await db.referralSale.findUnique({
      where: { id: saleId },
      include: { referral: { include: { user: true } } },
    });

    if (!sale) {
      throw new Error("Venta no encontrada.");
    }

    if (sale.estado === "APROBADO") {
      throw new Error("No se puede rechazar una venta que ya fue aprobada.");
    }

    const updatedSale = await db.referralSale.update({
      where: { id: saleId },
      data: {
        estado: "RECHAZADO",
        observacionesAdmin,
      },
    });

    await db.referralAuditLog.create({
      data: {
        referralId: sale.referralId,
        actorId: adminUserId,
        accion: "VENTA_RECHAZADA",
        detalle: `Venta #${sale.id} rechazada. Motivo: ${observacionesAdmin}`,
      },
    });

    sendSaleRejectedReferralNotification({
      to: sale.referral.user.email,
      saleId: sale.id,
      productName: sale.productName,
      clientName: sale.clienteNombre,
      reason: observacionesAdmin,
    }).catch(err => console.error("Error sending sale rejection notification email:", err));

    return updatedSale;
  }
}
