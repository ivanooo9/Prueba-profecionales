import { Request, Response } from "express";
import { db } from "../../lib/db";
import { SriClient } from "../../lib/sri/sri-client";
import { signDocument } from "../../lib/sri/sri-signer";

const sriClient = new SriClient();

/**
 * Controller for Admin SRI Invoicing and Payment Approvals.
 */
export class AdminInvoicesController {
  /**
   * Process and authorize an invoice with SRI.
   */
  static async authorizeInvoice(req: Request, res: Response) {
    const invoiceId = parseInt(req.params.id as string, 10);
    try {
      const invoice = await db.invoice.findUnique({
        where: { id: invoiceId },
        include: { issuer: true, client: true }
      });

      if (!invoice || !invoice.claveAcceso || !invoice.xmlNoFirmado) {
        return res.status(400).json({ success: false, error: "Factura o XML no encontrado" });
      }

      if (!invoice.issuer.firmaElectronica || !invoice.issuer.codigoSri) {
        return res.status(400).json({ success: false, error: "Firma electrónica del emisor no configurada" });
      }

      // 1. Sign XML Document (sri-signer decrypts credentials automatically)
      const signRes = signDocument(
        invoice.xmlNoFirmado,
        invoice.issuer.firmaElectronica,
        invoice.issuer.codigoSri
      );

      if (!signRes.success || !signRes.xmlSignedBase64) {
        return res.status(500).json({ success: false, error: signRes.error || "Error al firmar XML" });
      }

      // 2. Transmit to SRI Reception WS
      const recepcionRes = await sriClient.validarComprobante(signRes.xmlSignedBase64, invoice.tipoAmbiente);
      if (recepcionRes.estado !== "RECIBIDA") {
        return res.status(400).json({
          success: false,
          estado: recepcionRes.estado,
          mensajes: recepcionRes.mensajes
        });
      }

      // 3. Consult SRI Authorization WS
      const autRes = await sriClient.autorizacionComprobante(invoice.claveAcceso, invoice.tipoAmbiente);
      if (autRes.estado === "AUTORIZADO") {
        await db.invoice.update({
          where: { id: invoiceId },
          data: {
            estado: "AUTORIZADA",
            xmlAutorizado: autRes.comprobanteXml || signRes.xmlSigned
          }
        });
      }

      res.json({
        success: true,
        estado: autRes.estado,
        numeroAutorizacion: autRes.numeroAutorizacion,
        fechaAutorizacion: autRes.fechaAutorizacion,
        mensajes: autRes.mensajes
      });
    } catch (error: any) {
      console.error("Error in authorizeInvoice controller:", error);
      res.status(500).json({ success: false, error: error.message || "Error procesando autorización SRI" });
    }
  }

  /**
   * Approve a bank payment request for certificates or topups.
   */
  static async approvePaymentRequest(req: Request, res: Response) {
    const requestId = parseInt(req.params.id as string, 10);
    try {
      const paymentReq = await db.paymentRequest.findUnique({
        where: { id: requestId },
        include: { certificate: true, issuer: true }
      });

      if (!paymentReq) {
        return res.redirect("/dashboard/admin?tab=pedidos&error=payment_not_found");
      }

      await db.$transaction(async (tx) => {
        await tx.paymentRequest.update({
          where: { id: requestId },
          data: {
            estado: "APROBADO",
            fechaProcesado: new Date()
          }
        });

        if (paymentReq.certificateId) {
          await tx.certificate.update({
            where: { id: paymentReq.certificateId },
            data: { estado: "APROBADO" }
          });
        }

        if (paymentReq.tipo === "BILLING_PLAN" && paymentReq.issuer?.professionalProfileId) {
          const profileId = paymentReq.issuer.professionalProfileId;
          const pendingSub = await tx.billingSubscription.findFirst({
            where: { profileId, status: "PENDIENTE" },
            orderBy: { createdAt: "desc" }
          });
          if (pendingSub) {
            await tx.billingSubscription.update({
              where: { id: pendingSub.id },
              data: { status: "ACTIVO" }
            });
          }
        }
      });

      res.redirect("/dashboard/admin?tab=pedidos&success=payment_approved");
    } catch (error: any) {
      console.error("Error approving payment request:", error);
      res.redirect("/dashboard/admin?tab=pedidos&error=approval_failed");
    }
  }
}
