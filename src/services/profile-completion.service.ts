import { db } from "../lib/db";

export interface ProfileCompletionItem {
  key: string;
  label: string;
  isComplete: boolean;
  weight: number;
}

export interface ProfileCompletionResult {
  percentage: number;
  completedCount: number;
  totalCount: number;
  items: ProfileCompletionItem[];
  missingItems: ProfileCompletionItem[];
}

export class ProfileCompletionService {
  /**
   * Calcula el porcentaje real de completitud del perfil para un Profesional.
   */
  static async calculateProfessionalCompletion(profileId: number): Promise<ProfileCompletionResult> {
    const profile = await db.professionalProfile.findUnique({
      where: { id: profileId },
      include: {
        services: true,
        specialties: true,
        issuer: true
      }
    });

    if (!profile) {
      return { percentage: 0, completedCount: 0, totalCount: 0, items: [], missingItems: [] };
    }

    const items: ProfileCompletionItem[] = [
      {
        key: "photo",
        label: "Fotografía de Perfil",
        isComplete: !!(profile.photo && profile.photo.trim().length > 0),
        weight: 15
      },
      {
        key: "slogan",
        label: "Slogan / Título Profesional",
        isComplete: !!(profile.slogan && profile.slogan.trim().length > 0),
        weight: 15
      },
      {
        key: "bio",
        label: "Biografía / Resumen Curricular",
        isComplete: !!(profile.bio && profile.bio.trim().length > 10),
        weight: 15
      },
      {
        key: "specialty",
        label: "Especialidades o Dirección",
        isComplete: !!(profile.specialties.length > 0 || (profile.ciudad && profile.provincia)),
        weight: 15
      },
      {
        key: "services",
        label: "Servicios Registrados en Catálogo",
        isComplete: profile.services.length > 0,
        weight: 15
      },
      {
        key: "issuer",
        label: "Configuración de Emisor SRI",
        isComplete: !!(profile.issuer && profile.issuer.ruc),
        weight: 15
      },
      {
        key: "card",
        label: "Tarjeta de Presentación Digital & QR",
        isComplete: !!(profile.cardPublicToken && profile.cardPublicToken.trim().length > 0),
        weight: 10
      }
    ];

    const completedWeight = items.filter(i => i.isComplete).reduce((acc, curr) => acc + curr.weight, 0);
    const completedCount = items.filter(i => i.isComplete).length;

    return {
      percentage: Math.min(100, completedWeight),
      completedCount,
      totalCount: items.length,
      items,
      missingItems: items.filter(i => !i.isComplete)
    };
  }

  /**
   * Calcula el porcentaje real de completitud del perfil para un Estudiante.
   */
  static async calculateStudentCompletion(userId: number): Promise<ProfileCompletionResult> {
    const student = await db.studentProfile.findUnique({
      where: { userId },
      include: {
        projects: true,
        experiences: true
      }
    });

    if (!student) {
      return { percentage: 0, completedCount: 0, totalCount: 0, items: [], missingItems: [] };
    }

    const items: ProfileCompletionItem[] = [
      {
        key: "photo",
        label: "Fotografía de Perfil",
        isComplete: !!(student.foto && student.foto.trim().length > 0),
        weight: 20
      },
      {
        key: "education",
        label: "Universidad / Carrera",
        isComplete: !!(student.carrera && student.carrera.trim().length > 0 && student.institucionEducativa),
        weight: 20
      },
      {
        key: "bio",
        label: "Biografía / Presentación Personal",
        isComplete: !!(student.bio && student.bio.trim().length > 10),
        weight: 20
      },
      {
        key: "projects",
        label: "Proyectos o Experiencias Académicas",
        isComplete: student.projects.length > 0 || student.experiences.length > 0,
        weight: 20
      },
      {
        key: "card",
        label: "Tarjeta Digital & Código QR",
        isComplete: !!(student.cardPublicToken && student.cardPublicToken.trim().length > 0),
        weight: 20
      }
    ];

    const completedWeight = items.filter(i => i.isComplete).reduce((acc, curr) => acc + curr.weight, 0);
    const completedCount = items.filter(i => i.isComplete).length;

    return {
      percentage: Math.min(100, completedWeight),
      completedCount,
      totalCount: items.length,
      items,
      missingItems: items.filter(i => !i.isComplete)
    };
  }
}
