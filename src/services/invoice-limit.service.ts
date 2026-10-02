import { db } from "../lib/db";

export interface InvoiceQuotaResult {
  isUnlimited: boolean;
  limit: number;
  used: number;
  available: number;
  source: string; // "PONENTE" | "PLAN_FACTURACION" | "PLAN_AFILIACION"
  planType: string;
  isPonente: boolean;
  activeBillingPlanName?: string;
}

export class InvoiceLimitService {
  /**
   * Obtiene la cuota actual de facturación del profesional según las reglas de negocio:
   * 1. Ponente -> Facturación ilimitada
   * 2. Si tiene plan de facturación o afiliación ilimitado -> Ilimitado
   * 3. De lo contrario -> Mayor límite disponible entre Plan de Afiliación y Plan de Facturación
   * 4. Consumo total basado únicamente en facturas con estado 'AUTORIZADA'
   */
  static async getInvoiceQuota(profileId: number): Promise<InvoiceQuotaResult> {
    const profile = await db.professionalProfile.findUnique({
      where: { id: profileId },
      include: {
        issuer: true,
        billingSubscriptions: {
          where: {
            status: "ACTIVO",
            endDate: { gte: new Date() }
          },
          include: { plan: true },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!profile) {
      return {
        isUnlimited: false,
        limit: 0,
        used: 0,
        available: 0,
        source: "PERFIL_NO_ENCONTRADO",
        planType: "GRATUITO",
        isPonente: false
      };
    }

    // Conteo real de facturas consumidas (únicamente estado AUTORIZADA)
    const used = profile.issuer
      ? await db.invoice.count({
          where: { issuerId: profile.issuer.id, estado: "AUTORIZADA" }
        })
      : 0;

    // 1. Caso Ponente: Facturación Ilimitada
    if (profile.isPonente) {
      return {
        isUnlimited: true,
        limit: -1,
        used,
        available: -1,
        source: "Ponente (Facturación Ilimitada)",
        planType: profile.planType,
        isPonente: true
      };
    }

    // Cargar SystemConfig para límites por defecto configurables desde admin
    let systemConfig = await db.systemConfig.findFirst({ where: { id: 1 } });
    const freeLimit = systemConfig?.freeInvoiceLimit ?? 5;
    const premiumLimit = systemConfig?.premiumInvoiceLimit ?? 50;

    // Límite por Plan de Afiliación
    const isPremium = profile.planType === "PREMIUM" || profile.planType === "VERIFICADO";
    const membershipLimit = isPremium ? premiumLimit : freeLimit;
    const membershipSource = isPremium
      ? `Plan Afiliación Premium (${premiumLimit} facturas)`
      : `Plan Gratuito (${freeLimit} facturas)`;

    // Revisar suscripciones activas a Planes de Facturación específicos
    const activeSubs = profile.billingSubscriptions || [];
    let hasUnlimitedBillingPlan = false;
    let maxBillingPlanLimit = 0;
    let activeBillingPlanName: string | undefined;

    for (const sub of activeSubs) {
      if (sub.plan && sub.plan.isActive) {
        if (sub.plan.invoiceLimit === -1) {
          hasUnlimitedBillingPlan = true;
          activeBillingPlanName = sub.plan.nombre;
        } else if (sub.plan.invoiceLimit > maxBillingPlanLimit) {
          maxBillingPlanLimit = sub.plan.invoiceLimit;
          activeBillingPlanName = sub.plan.nombre;
        }
      }
    }

    // 2. Caso Plan de Facturación Ilimitado
    if (hasUnlimitedBillingPlan) {
      return {
        isUnlimited: true,
        limit: -1,
        used,
        available: -1,
        source: `Plan de Facturación ${activeBillingPlanName || "Ilimitado"}`,
        planType: profile.planType,
        isPonente: false,
        activeBillingPlanName
      };
    }

    // 3. Obtener el MAYOR límite disponible entre Plan de Afiliación y Plan de Facturación
    const effectiveLimit = Math.max(membershipLimit, maxBillingPlanLimit);
    const available = Math.max(0, effectiveLimit - used);

    let source = membershipSource;
    if (maxBillingPlanLimit > membershipLimit) {
      source = `Plan de Facturación ${activeBillingPlanName} (${maxBillingPlanLimit} facturas)`;
    }

    return {
      isUnlimited: false,
      limit: effectiveLimit,
      used,
      available,
      source,
      planType: profile.planType,
      isPonente: false,
      activeBillingPlanName
    };
  }

  /**
   * Verifica si el profesional tiene cuota disponible para emitir una nueva factura.
   */
  static async canEmitInvoice(profileId: number): Promise<{ allowed: boolean; reason?: string; quota?: InvoiceQuotaResult }> {
    const quota = await this.getInvoiceQuota(profileId);
    if (quota.isUnlimited) {
      return { allowed: true, quota };
    }

    if (quota.available > 0) {
      return { allowed: true, quota };
    }

    return {
      allowed: false,
      reason: `No puedes emitir más facturas porque alcanzaste el límite de tu plan (${quota.used}/${quota.limit} facturas autorizadas utilizadas). Por favor, adquiere un plan de facturación superior para continuar.`,
      quota
    };
  }

  /**
   * Incrementa el contador de consumo de facturas en la suscripción activa.
   * Se invoca EXCLUSIVAMENTE cuando la factura adquiere el estado 'AUTORIZADA'.
   */
  static async incrementInvoiceCounter(profileId: number): Promise<void> {
    const activeSub = await db.billingSubscription.findFirst({
      where: {
        profileId,
        status: "ACTIVO",
        endDate: { gte: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });

    if (activeSub) {
      await db.billingSubscription.update({
        where: { id: activeSub.id },
        data: { invoicesUsed: { increment: 1 } }
      });
    }
  }
}
