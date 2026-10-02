import { db } from "../lib/db";
import { Server as SocketIOServer } from "socket.io";
import { emitToUser } from "../lib/socket";
import { emailService } from "../lib/email/service";

function toTitleCase(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function isPlaceholderName(str: string): boolean {
  const s = str.toLowerCase().trim();
  return (
    !s ||
    s === "nuevo alumno" ||
    s === "nuevo usuario" ||
    s === "alumno" ||
    s === "usuario" ||
    s === "estudiante" ||
    s.startsWith("nuevo alumno") ||
    s.startsWith("nuevo usuario")
  );
}

export function getValidCertificateUserName(user: { name?: string | null; nombreCertificado?: string | null }): string | null {
  const pref = (user.nombreCertificado || "").trim();
  if (pref && !isPlaceholderName(pref)) {
    return toTitleCase(pref);
  }
  const name = (user.name || "").trim();
  if (name && !isPlaceholderName(name)) {
    return toTitleCase(name);
  }
  return null;
}

export class CertificateEligibilityService {
  /**
   * Evaluates user progress for a Conversatorio and automatically issues Certificate if threshold is reached.
   */
  static async checkAndGrantConversatorioCertificate(
    userId: number,
    conversatorioId: number,
    io?: SocketIOServer
  ) {
    if (!userId || !conversatorioId) return null;

    const conversatorio = await db.conversatorio.findUnique({
      where: { id: conversatorioId },
      include: { speakers: true, certificateDesign: true }
    });

    if (!conversatorio) return null;
    // Rule: PROGRAMADO status cannot issue certificates or track completion
    if (conversatorio.estado === "PROGRAMADO") return null;

    // Check if certificate already exists for user (Prevent duplicate certificates)
    const existingCert = await db.certificate.findFirst({
      where: { userId, conversatorioId }
    });
    if (existingCert) return existingCert;

    // Validate user and user name before issuing certificate
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    const certUserName = getValidCertificateUserName(user);
    if (!certUserName) {
      console.log(`[CertificateEligibilityService] Skipping certificate generation for userId ${userId}: user name "${user.name}" is placeholder/unconfigured.`);
      return null;
    }

    // If immediate mode is enabled OR user reaches minimum percentage
    let shouldGrant = conversatorio.certificadoInmediato;
    let currentPct = 100;

    if (!shouldGrant) {
      const totalSpeakers = conversatorio.speakers.length;
      if (totalSpeakers === 0) {
        shouldGrant = true;
      } else {
        const viewedLogs = await db.eventAccessLog.findMany({
          where: {
            userId,
            conversatorioId,
            speakerId: { not: null }
          },
          select: { speakerId: true },
          distinct: ["speakerId"]
        });

        currentPct = Math.round((viewedLogs.length / totalSpeakers) * 100);
        if (currentPct >= conversatorio.porcentajeMinimoCertificado) {
          shouldGrant = true;
        }
      }
    }

    if (shouldGrant) {
      const certCode = `CERT-CONV-${conversatorioId}-${userId}-${Date.now().toString(36).toUpperCase()}`;
      const newCert = await db.certificate.create({
        data: {
          userId,
          conversatorioId,
          codigo: certCode,
          horas: conversatorio.certificateDesign?.horas || 8,
          fechaEmision: new Date(),
          nombreEvento: conversatorio.titulo,
          nombreUsuario: certUserName,
          precioPagado: conversatorio.precio,
          estado: "APROBADO"
        }
      });

      if (io) {
        emitToUser(io, userId, "referral:sale_approved", {
          productName: conversatorio.titulo,
          comision: 0,
        });
      }

      // Notify user via Email (Google OAuth)
      if (user.email) {
        const baseUrl = process.env.BASE_URL || "http://localhost:3000";
        emailService.sendEmail("certificate-available", user.email, {
          recipientName: certUserName,
          eventName: conversatorio.titulo,
          certificateUrl: `${baseUrl}/certificado/${certCode}`,
          issuedAt: new Date().toLocaleDateString("es-EC")
        }).catch(err => console.error(`[CertificateEligibilityService] Failed to send certificate email to ${user.email}:`, err));
      }

      return newCert;
    }

    return null;
  }

  /**
   * Calculates progress for a Conversatorio user (returns percentage and threshold)
   */
  static async getConversatorioProgress(userId: number, conversatorioId: number) {
    const conversatorio = await db.conversatorio.findUnique({
      where: { id: conversatorioId },
      include: { speakers: true }
    });

    if (!conversatorio) return { currentPct: 0, requiredPct: 100, isImmediate: true, isEarned: false };
    if (conversatorio.estado === "PROGRAMADO") {
      return { currentPct: 0, requiredPct: conversatorio.porcentajeMinimoCertificado, isImmediate: false, isEarned: false };
    }

    const existingCert = await db.certificate.findFirst({
      where: { userId, conversatorioId }
    });

    if (existingCert) {
      return { currentPct: 100, requiredPct: conversatorio.porcentajeMinimoCertificado, isImmediate: conversatorio.certificadoInmediato, isEarned: true };
    }

    const totalSpeakers = conversatorio.speakers.length;
    if (totalSpeakers === 0) {
      return { currentPct: 100, requiredPct: conversatorio.porcentajeMinimoCertificado, isImmediate: conversatorio.certificadoInmediato, isEarned: conversatorio.certificadoInmediato };
    }

    const viewedLogs = await db.eventAccessLog.findMany({
      where: {
        userId,
        conversatorioId,
        speakerId: { not: null }
      },
      select: { speakerId: true },
      distinct: ["speakerId"]
    });

    const currentPct = Math.round((viewedLogs.length / totalSpeakers) * 100);
    const isEarned = conversatorio.certificadoInmediato || currentPct >= conversatorio.porcentajeMinimoCertificado;

    return {
      currentPct,
      requiredPct: conversatorio.porcentajeMinimoCertificado,
      isImmediate: conversatorio.certificadoInmediato,
      isEarned
    };
  }
}
