import { db } from "../lib/db";
import { WithdrawalStatus } from "@prisma/client";

export class ReferralWalletService {
  /**
   * Ensures a ReferralWallet exists for a given referral profile.
   */
  static async ensureWallet(referralId: number) {
    let wallet = await db.referralWallet.findUnique({
      where: { referralId },
    });

    if (!wallet) {
      wallet = await db.referralWallet.create({
        data: {
          referralId,
          saldoPendiente: 0.0,
          saldoDisponible: 0.0,
          saldoRetirado: 0.0,
        },
      });
    }

    return wallet;
  }

  /**
   * Credits earned commission from an approved sale to the referral's wallet.
   */
  static async creditSaleCommission(saleId: number) {
    const sale = await db.referralSale.findUnique({
      where: { id: saleId },
      include: { referral: true },
    });

    if (!sale || sale.estado !== "APROBADO" || sale.comisionCalculada <= 0) {
      return null;
    }

    const wallet = await this.ensureWallet(sale.referralId);

    // Prevent double crediting
    const existingTx = await db.referralWalletTransaction.findFirst({
      where: {
        walletId: wallet.id,
        referralSaleId: sale.id,
        tipo: "ACREDITACION_VENTA",
      },
    });

    if (existingTx) {
      return wallet;
    }

    // Atomic transaction update
    const [updatedWallet] = await db.$transaction([
      db.referralWallet.update({
        where: { id: wallet.id },
        data: {
          saldoDisponible: { increment: sale.comisionCalculada },
        },
      }),
      db.referralWalletTransaction.create({
        data: {
          walletId: wallet.id,
          tipo: "ACREDITACION_VENTA",
          monto: sale.comisionCalculada,
          concepto: `Comisión aprobada por venta de ${sale.productName} (Cliente: ${sale.clienteNombre})`,
          referralSaleId: sale.id,
        },
      }),
      db.referralAuditLog.create({
        data: {
          referralId: sale.referralId,
          accion: "COMISION_ACREDITADA",
          detalle: `Se acreditaron $${sale.comisionCalculada} por venta aprobada #${sale.id}`,
        },
      }),
    ]);

    return updatedWallet;
  }

  /**
   * Submits a withdrawal request for available funds.
   */
  static async requestWithdrawal(
    referralId: number,
    monto: number,
    observacionesReferido?: string
  ) {
    const profile = await db.referralProfile.findUnique({
      where: { id: referralId },
      include: { wallet: true },
    });

    if (!profile || profile.status !== "ACTIVE") {
      throw new Error("Su cuenta de referido debe estar activa para solicitar retiros.");
    }

    if (!profile.banco || !profile.numeroCuenta || !profile.titularNombre) {
      throw new Error("Debe registrar sus datos bancarios completos antes de solicitar un retiro.");
    }

    const wallet = await this.ensureWallet(referralId);

    if (monto <= 0) {
      throw new Error("El monto a retirar debe ser mayor a $0.00.");
    }

    if (wallet.saldoDisponible < monto) {
      throw new Error(`Saldo disponible insuficiente. Disponible: $${wallet.saldoDisponible.toFixed(2)}.`);
    }

    // Process withdrawal request atomically
    const [withdrawal] = await db.$transaction([
      db.referralWithdrawal.create({
        data: {
          referralId,
          monto,
          banco: profile.banco,
          tipoCuenta: profile.tipoCuenta || "Ahorros",
          numeroCuenta: profile.numeroCuenta,
          titularNombre: profile.titularNombre,
          titularCedula: profile.titularCedula || profile.cedula || "",
          observacionesReferido,
          estado: "PENDIENTE",
        },
      }),
      db.referralWallet.update({
        where: { id: wallet.id },
        data: {
          saldoDisponible: { decrement: monto },
          saldoPendiente: { increment: monto },
        },
      }),
      db.referralAuditLog.create({
        data: {
          referralId,
          accion: "SOLICITUD_RETIRO",
          detalle: `Solicitud de retiro creada por $${monto.toFixed(2)}`,
        },
      }),
    ]);

    // Record wallet transaction
    await db.referralWalletTransaction.create({
      data: {
        walletId: wallet.id,
        tipo: "DEBITO_RETIRO",
        monto: -monto,
        concepto: `Solicitud de retiro #${withdrawal.id} en proceso de aprobación`,
        withdrawalId: withdrawal.id,
      },
    });

    return withdrawal;
  }

  /**
   * Processes withdrawal status by Admin (APROBADO, PAGADO, RECHAZADO).
   */
  static async processWithdrawalStatus(
    withdrawalId: number,
    nuevoEstado: WithdrawalStatus,
    comprobantePagoUrl?: string,
    observacionesAdmin?: string
  ) {
    const withdrawal = await db.referralWithdrawal.findUnique({
      where: { id: withdrawalId },
      include: { referral: { include: { wallet: true } } },
    });

    if (!withdrawal) {
      throw new Error("Solicitud de retiro no encontrada.");
    }

    const wallet = await this.ensureWallet(withdrawal.referralId);
    const monto = withdrawal.monto;

    if (nuevoEstado === "PAGADO" && withdrawal.estado !== "PAGADO") {
      // Move from saldoPendiente to saldoRetirado
      await db.$transaction([
        db.referralWithdrawal.update({
          where: { id: withdrawalId },
          data: {
            estado: "PAGADO",
            comprobantePagoUrl: comprobantePagoUrl || withdrawal.comprobantePagoUrl,
            observacionesAdmin: observacionesAdmin || withdrawal.observacionesAdmin,
          },
        }),
        db.referralWallet.update({
          where: { id: wallet.id },
          data: {
            saldoPendiente: { decrement: monto },
            saldoRetirado: { increment: monto },
          },
        }),
        db.referralAuditLog.create({
          data: {
            referralId: withdrawal.referralId,
            accion: "RETIRO_PAGADO",
            detalle: `Retiro #${withdrawal.id} por $${monto.toFixed(2)} marcado como PAGADO`,
          },
        }),
      ]);
    } else if (nuevoEstado === "RECHAZADO" && withdrawal.estado !== "RECHAZADO" && withdrawal.estado !== "PAGADO") {
      // Revert from saldoPendiente back to saldoDisponible
      await db.$transaction([
        db.referralWithdrawal.update({
          where: { id: withdrawalId },
          data: {
            estado: "RECHAZADO",
            observacionesAdmin,
          },
        }),
        db.referralWallet.update({
          where: { id: wallet.id },
          data: {
            saldoPendiente: { decrement: monto },
            saldoDisponible: { increment: monto },
          },
        }),
        db.referralWalletTransaction.create({
          data: {
            walletId: wallet.id,
            tipo: "REINTEGRO_RETIRO",
            monto: monto,
            concepto: `Reintegro por solicitud de retiro #${withdrawal.id} rechazada`,
            withdrawalId: withdrawal.id,
          },
        }),
        db.referralAuditLog.create({
          data: {
            referralId: withdrawal.referralId,
            accion: "RETIRO_RECHAZADO",
            detalle: `Retiro #${withdrawal.id} por $${monto.toFixed(2)} RECHAZADO: ${observacionesAdmin || "Sin observaciones"}`,
          },
        }),
      ]);
    } else if (nuevoEstado === "APROBADO") {
      await db.referralWithdrawal.update({
        where: { id: withdrawalId },
        data: {
          estado: "APROBADO",
          observacionesAdmin,
        },
      });
    }

    return db.referralWithdrawal.findUnique({ where: { id: withdrawalId } });
  }

  /**
   * Retrieves wallet summary for a referral.
   */
  static async getWalletSummary(referralId: number) {
    const wallet = await this.ensureWallet(referralId);
    const transactions = await db.referralWalletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const withdrawals = await db.referralWithdrawal.findMany({
      where: { referralId },
      orderBy: { createdAt: "desc" },
    });

    return {
      wallet,
      transactions,
      withdrawals,
    };
  }
}
