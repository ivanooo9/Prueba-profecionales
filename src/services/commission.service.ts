import { db } from "../lib/db";
import { ProductType } from "@prisma/client";

export interface CommissionResult {
  porcentaje: number;
  comisionMonto: number;
  configAppliedId: number | null;
  ruleType: "SPECIFIC_PRODUCT" | "SPECIFIC_CATEGORY" | "GENERAL" | "DEFAULT_ZERO";
}

export class CommissionService {
  /**
   * Calculates commission for a given product type, product ID, and paid value.
   * STRICT PRIORITY RULE:
   * 1. Specific active commission for (productType + productId)
   * 2. Specific active commission for (productType)
   * 3. General active commission (isGeneral = true)
   * 4. Fallback to 0% if no active rule found
   */
  static async calculateCommission(
    productType: ProductType,
    productId: number | null | undefined,
    valorPagado: number
  ): Promise<CommissionResult> {
    const now = new Date();

    // Helper filter for date validity
    const isDateValid = (startDate?: Date | null, endDate?: Date | null) => {
      if (startDate && startDate > now) return false;
      if (endDate && endDate < now) return false;
      return true;
    };

    // 1. Specific product rule (productType + productId)
    if (productId) {
      const specificProductRule = await db.commissionConfig.findFirst({
        where: {
          productType,
          productId,
          isActive: true,
          isGeneral: false,
        },
        orderBy: { updatedAt: "desc" },
      });

      if (specificProductRule && isDateValid(specificProductRule.startDate, specificProductRule.endDate)) {
        const porcentaje = specificProductRule.porcentaje;
        const comisionMonto = Number(((valorPagado * porcentaje) / 100).toFixed(2));
        return {
          porcentaje,
          comisionMonto,
          configAppliedId: specificProductRule.id,
          ruleType: "SPECIFIC_PRODUCT",
        };
      }
    }

    // 2. Specific category rule (productType without productId)
    const specificCategoryRule = await db.commissionConfig.findFirst({
      where: {
        productType,
        productId: null,
        isActive: true,
        isGeneral: false,
      },
      orderBy: { updatedAt: "desc" },
    });

    if (specificCategoryRule && isDateValid(specificCategoryRule.startDate, specificCategoryRule.endDate)) {
      const porcentaje = specificCategoryRule.porcentaje;
      const comisionMonto = Number(((valorPagado * porcentaje) / 100).toFixed(2));
      return {
        porcentaje,
        comisionMonto,
        configAppliedId: specificCategoryRule.id,
        ruleType: "SPECIFIC_CATEGORY",
      };
    }

    // 3. General rule
    const generalRule = await db.commissionConfig.findFirst({
      where: {
        isGeneral: true,
        isActive: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    if (generalRule && isDateValid(generalRule.startDate, generalRule.endDate)) {
      const porcentaje = generalRule.porcentaje;
      const comisionMonto = Number(((valorPagado * porcentaje) / 100).toFixed(2));
      return {
        porcentaje,
        comisionMonto,
        configAppliedId: generalRule.id,
        ruleType: "GENERAL",
      };
    }

    // 4. Default zero fallback
    return {
      porcentaje: 0,
      comisionMonto: 0,
      configAppliedId: null,
      ruleType: "DEFAULT_ZERO",
    };
  }

  /**
   * Fetches all active & inactive commission configurations for admin.
   */
  static async getAllConfigs() {
    return db.commissionConfig.findMany({
      orderBy: [{ isGeneral: "desc" }, { createdAt: "desc" }],
    });
  }

  /**
   * Upserts or sets general commission percentage.
   */
  static async setGeneralCommission(porcentaje: number) {
    const existing = await db.commissionConfig.findFirst({
      where: { isGeneral: true },
    });

    if (existing) {
      return db.commissionConfig.update({
        where: { id: existing.id },
        data: { porcentaje, isActive: true },
      });
    }

    return db.commissionConfig.create({
      data: {
        isGeneral: true,
        porcentaje,
        isActive: true,
      },
    });
  }

  /**
   * Upserts specific product commission configuration.
   */
  static async setSpecificCommission(data: {
    productType: ProductType;
    productId?: number | null;
    porcentaje: number;
    startDate?: Date | null;
    endDate?: Date | null;
  }) {
    const existing = await db.commissionConfig.findFirst({
      where: {
        isGeneral: false,
        productType: data.productType,
        productId: data.productId || null,
      },
    });

    if (existing) {
      return db.commissionConfig.update({
        where: { id: existing.id },
        data: {
          porcentaje: data.porcentaje,
          startDate: data.startDate,
          endDate: data.endDate,
          isActive: true,
        },
      });
    }

    return db.commissionConfig.create({
      data: {
        isGeneral: false,
        productType: data.productType,
        productId: data.productId || null,
        porcentaje: data.porcentaje,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: true,
      },
    });
  }
}
