import { db } from "../lib/db";
import { randomBytes } from "crypto";

/**
 * Service to handle Certificate issuance, unique code generation, QR verification,
 * and academic name lock policies.
 */
export class CertificateService {
  /**
   * Generates a unique certificate code (e.g. CERT-A1B2C3-X).
   */
  static generateUniqueCode(): string {
    const hex = randomBytes(3).toString("hex").toUpperCase();
    const suffix = randomBytes(1).toString("hex").substring(0, 1).toUpperCase();
    return `CERT-${hex}-${suffix}`;
  }

  /**
   * Validates a certificate code or QR code string against the database.
   */
  static async verifyCertificateCode(code: string) {
    const cleanCode = code.trim().toUpperCase();

    // Check in acquired certificates table first
    const cert = await db.certificate.findFirst({
      where: { codigo: cleanCode },
      include: {
        user: { select: { id: true, name: true, email: true, nombreCertificado: true } },
        conversatorio: { select: { id: true, titulo: true } },
        curso: { select: { id: true, titulo: true } }
      }
    });

    if (cert) {
      return {
        found: true,
        type: "Certificate",
        code: cert.codigo,
        studentName: cert.nombreUsuario || cert.user.nombreCertificado || cert.user.name,
        eventName: cert.nombreEvento || cert.conversatorio?.titulo || cert.curso?.titulo || "Evento Académico",
        hours: cert.horas,
        issueDate: cert.fechaEmision,
        status: cert.estado
      };
    }

    // Fallback check in CursoCertificate table
    const cursoCert = await db.cursoCertificate.findFirst({
      where: { codigo: cleanCode },
      include: {
        user: { select: { id: true, name: true, email: true, nombreCertificado: true } },
        curso: { select: { id: true, titulo: true } }
      }
    });

    if (cursoCert) {
      return {
        found: true,
        type: "CursoCertificate",
        code: cursoCert.codigo,
        studentName: cursoCert.user.nombreCertificado || cursoCert.user.name,
        eventName: cursoCert.curso.titulo,
        hours: 40,
        issueDate: cursoCert.fechaEmision,
        status: "APROBADO"
      };
    }

    return { found: false };
  }

  /**
   * Checks if user is eligible to change their preferred certificate name (60-day rule).
   */
  static isNameChangeAllowed(lastUpdate: Date | null): { allowed: boolean; daysRemaining: number } {
    if (!lastUpdate) {
      return { allowed: true, daysRemaining: 0 };
    }

    const SixtyDaysInMs = 60 * 24 * 60 * 60 * 1000;
    const timePassed = Date.now() - new Date(lastUpdate).getTime();
    const daysPassed = Math.floor(timePassed / (24 * 60 * 60 * 1000));

    if (timePassed >= SixtyDaysInMs) {
      return { allowed: true, daysRemaining: 0 };
    }

    return {
      allowed: false,
      daysRemaining: 60 - daysPassed
    };
  }
}
