import { Request, Response } from "express";
import { CertificateService } from "../../services/certificate.service";

/**
 * Controller for Public Certificate Verification Modal and QR Lookups.
 */
export class PublicVerificationController {
  /**
   * Verify certificate authenticity by unique code or scanned QR code.
   */
  static async verifyCertificate(req: Request, res: Response) {
    const { code } = req.params;

    if (!code || typeof code !== "string") {
      return res.status(400).json({
        success: false,
        error: "Código de certificado no proporcionado."
      });
    }

    try {
      const result = await CertificateService.verifyCertificateCode(code);

      if (!result.found) {
        return res.status(404).json({
          success: false,
          error: "Código de certificado no encontrado o no registrado en el sistema."
        });
      }

      res.json({
        success: true,
        certificate: result
      });
    } catch (error: any) {
      console.error("Error verifying certificate code:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Error interno consultando la validez del certificado."
      });
    }
  }
}
