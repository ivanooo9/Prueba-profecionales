import { db } from "../lib/db";

const RESERVED_SLUGS = new Set([
  "admin", "api", "login", "logout", "register", "student", "cursos",
  "conversatorios", "articulos", "directorio", "eventos", "nosotros",
  "contacto", "profile-setup", "dashboard", "facturacion", "referidos",
  "prensa", "terminos", "privacidad", "soporte", "help", "ayuda", "home"
]);

export class StudentIdService {
  /**
   * Valida si un slug es reservado o inválido
   */
  public static isReservedSlug(slug: string): boolean {
    if (!slug) return true;
    const clean = slug.trim().toLowerCase();
    return RESERVED_SLUGS.has(clean) || clean.startsWith("api") || clean.startsWith("admin");
  }

  /**
   * Obtiene o inicializa automáticamente el objeto StudentId para un estudiante
   */
  public static async getOrCreateIdForStudent(userId: number) {
    const profile = await db.studentProfile.findUnique({
      where: { userId },
      include: {
        user: true,
        university: true,
        projects: { orderBy: { createdAt: 'desc' } },
        studentId: {
          include: {
            links: { orderBy: { sortOrder: 'asc' } },
            blocks: { orderBy: { sortOrder: 'asc' } }
          }
        }
      }
    });

    if (!profile) {
      throw new Error("El usuario no posee un perfil estudiantil activo.");
    }

    if (profile.studentId) {
      const { studentId: existingStudentId, ...cleanProfile } = profile;
      return {
        ...existingStudentId,
        studentProfile: cleanProfile
      };
    }

    // Generar un slug único inicial basado en el perfil o nombre
    let baseSlug = profile.slug || profile.user.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!baseSlug || this.isReservedSlug(baseSlug)) {
      baseSlug = `estudiante-${profile.id}`;
    }

    let finalSlug = baseSlug;
    let counter = 1;
    while (await db.studentId.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Formatear WhatsApp inicial para pasantías
    let rawPhone = (profile.telefono || '').replace(/[^0-9]/g, '');
    if (rawPhone && !rawPhone.startsWith('593')) {
      rawPhone = rawPhone.startsWith('0') ? '593' + rawPhone.substring(1) : '593' + rawPhone;
    }
    const initialWaMsg = encodeURIComponent(`Hola ${profile.user.name}, vi tu Estudiantes ID y me interesa consultarte sobre una oportunidad de pasantía / empleo.`);
    const initialWaUrl = rawPhone ? `https://wa.me/${rawPhone}?text=${initialWaMsg}` : '';

    // Crear el registro inicial de StudentId con botones predeterminados
    const newId = await db.studentId.create({
      data: {
        studentProfileId: profile.id,
        slug: finalSlug,
        shortDescription: profile.bio?.slice(0, 120) || `Estudiante de ${profile.carrera} en ${profile.institucionEducativa || 'Universidad'}`,
        primaryActionType: "CV_DOWNLOAD",
        primaryActionTitle: "Descargar Hoja de Vida / CV",
        primaryActionValue: "",
        theme: "academic_blue",
        buttonStyle: "rounded",
        alignment: "center",
        isActive: true,
        links: {
          create: [
            {
              type: "PORTFOLIO",
              title: "Portafolio de Proyectos Destacados",
              icon: "fa-solid fa-folder-open",
              url: `/estudiante/${finalSlug}#proyectos`,
              sortOrder: 0,
              isActive: true
            },
            ...(rawPhone ? [{
              type: "WHATSAPP",
              title: "Disponible para Pasantías / Empleo",
              icon: "fa-brands fa-whatsapp",
              url: initialWaUrl,
              sortOrder: 1,
              isActive: true
            }] : []),
            ...(profile.githubUrl ? [{
              type: "GITHUB",
              title: "Mi Repositorio GitHub",
              icon: "fa-brands fa-github",
              url: profile.githubUrl.startsWith('http') ? profile.githubUrl : `https://${profile.githubUrl}`,
              sortOrder: 2,
              isActive: true
            }] : []),
            ...(profile.linkedinUrl ? [{
              type: "LINKEDIN",
              title: "Perfil Profesional LinkedIn",
              icon: "fa-brands fa-linkedin",
              url: profile.linkedinUrl.startsWith('http') ? profile.linkedinUrl : `https://${profile.linkedinUrl}`,
              sortOrder: 3,
              isActive: true
            }] : []),
            {
              type: "PROFILE",
              title: "Ver mi Perfil Académico Completo",
              icon: "fa-solid fa-graduation-cap",
              url: `/estudiante/${finalSlug}`,
              sortOrder: 4,
              isActive: true
            }
          ]
        }
      },
      include: {
        links: { orderBy: { sortOrder: 'asc' } },
        blocks: { orderBy: { sortOrder: 'asc' } }
      }
    });

    return {
      ...newId,
      studentProfile: profile
    };
  }

  /**
   * Obtiene la vista pública por slug (@estudiante)
   */
  public static async getPublicIdBySlug(slugInput: string) {
    let cleanSlug = slugInput.trim().toLowerCase();
    if (cleanSlug.startsWith('@')) {
      cleanSlug = cleanSlug.slice(1);
    }

    if (this.isReservedSlug(cleanSlug)) {
      return null;
    }

    const item = await db.studentId.findUnique({
      where: { slug: cleanSlug },
      include: {
        studentProfile: {
          include: {
            user: true,
            university: true,
            projects: { orderBy: { createdAt: 'desc' } },
            externalCourses: { orderBy: { createdAt: 'desc' } },
            experiences: { orderBy: { createdAt: 'desc' } }
          }
        },
        links: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        },
        blocks: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    if (!item || !item.isActive) {
      return null;
    }

    // Filtrar bloques expirados por fecha
    const now = new Date();
    const activeBlocks = item.blocks.filter(b => {
      if (b.startAt && b.startAt > now) return false;
      if (b.endAt && b.endAt < now) return false;
      return true;
    });

    return {
      ...item,
      blocks: activeBlocks
    };
  }

  /**
   * Actualiza la configuración básica del StudentId
   */
  public static async updateConfig(userId: number, data: {
    shortDescription?: string;
    primaryActionType?: string;
    primaryActionTitle?: string;
    primaryActionValue?: string;
    theme?: string;
    buttonStyle?: string;
    alignment?: string;
    isActive?: boolean;
    slug?: string;
  }) {
    const studentIdObj = await this.getOrCreateIdForStudent(userId);

    const updateData: any = {};

    if (typeof data.shortDescription === 'string') updateData.shortDescription = data.shortDescription.trim();
    if (typeof data.primaryActionType === 'string') updateData.primaryActionType = data.primaryActionType;
    if (typeof data.primaryActionTitle === 'string') updateData.primaryActionTitle = data.primaryActionTitle.trim();
    if (typeof data.primaryActionValue === 'string') updateData.primaryActionValue = data.primaryActionValue.trim();
    if (typeof data.theme === 'string') updateData.theme = data.theme;
    if (typeof data.buttonStyle === 'string') updateData.buttonStyle = data.buttonStyle;
    if (typeof data.alignment === 'string') updateData.alignment = data.alignment;
    if (typeof data.isActive === 'boolean') updateData.isActive = data.isActive;

    if (data.slug && data.slug.trim() !== studentIdObj.slug) {
      let newSlug = data.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
      if (this.isReservedSlug(newSlug)) {
        throw new Error("El identificador de enlace no está disponible.");
      }
      const existing = await db.studentId.findUnique({ where: { slug: newSlug } });
      if (existing && existing.id !== studentIdObj.id) {
        throw new Error("El enlace ya está en uso por otro estudiante.");
      }
      updateData.slug = newSlug;
    }

    return await db.studentId.update({
      where: { id: studentIdObj.id },
      data: updateData,
      include: {
        links: { orderBy: { sortOrder: 'asc' } },
        blocks: { orderBy: { sortOrder: 'asc' } }
      }
    });
  }

  /**
   * Crea o actualiza un enlace/botón estudiantil
   */
  public static async upsertLink(userId: number, linkData: {
    id?: number;
    type: string;
    title: string;
    icon?: string;
    url?: string;
    targetId?: number;
    isActive?: boolean;
  }) {
    const studentIdObj = await this.getOrCreateIdForStudent(userId);
    const prof = studentIdObj.studentProfile;
    const slug = prof.slug || studentIdObj.slug;

    // Calcular teléfono y mensaje formateado de WhatsApp para pasantías
    let rawPhone = (prof.telefono || '').replace(/[^0-9]/g, '');
    if (rawPhone && !rawPhone.startsWith('593')) {
      rawPhone = rawPhone.startsWith('0') ? '593' + rawPhone.substring(1) : '593' + rawPhone;
    }
    const waMsg = encodeURIComponent(`Hola ${prof.user.name}, vi tu Estudiantes ID y me interesa consultarte sobre una oportunidad de pasantía / empleo.`);
    const defaultWaUrl = rawPhone ? `https://wa.me/${rawPhone}?text=${waMsg}` : '';

    // Autollenado inteligente según tipo de botón
    let finalUrl = linkData.url ? linkData.url.trim() : null;
    let finalTitle = linkData.title ? linkData.title.trim() : 'Botón';
    let finalIcon = linkData.icon || 'fa-solid fa-link';

    if (linkData.type === 'WHATSAPP') {
      if (!finalUrl || !finalUrl.includes('wa.me')) finalUrl = defaultWaUrl;
      if (!finalTitle || finalTitle === 'Botón') finalTitle = 'Disponible para Pasantías / Empleo';
      if (!linkData.icon) finalIcon = 'fa-brands fa-whatsapp';
    } else if (linkData.type === 'PORTFOLIO' || linkData.type === 'PROJECTS') {
      if (!finalUrl) finalUrl = `/estudiante/${slug}#proyectos`;
      if (!finalTitle || finalTitle === 'Botón') finalTitle = 'Portafolio de Proyectos';
      if (!linkData.icon) finalIcon = 'fa-solid fa-folder-open';
    } else if (linkData.type === 'PROFILE') {
      if (!finalUrl) finalUrl = `/estudiante/${slug}`;
      if (!finalTitle || finalTitle === 'Botón') finalTitle = 'Ver mi Perfil Académico Completo';
      if (!linkData.icon) finalIcon = 'fa-solid fa-graduation-cap';
    } else if (linkData.type === 'GITHUB') {
      if (!finalUrl) finalUrl = prof.githubUrl ? (prof.githubUrl.startsWith('http') ? prof.githubUrl : `https://${prof.githubUrl}`) : 'https://github.com';
      if (!finalTitle || finalTitle === 'Botón') finalTitle = 'Mi Repositorio GitHub';
      if (!linkData.icon) finalIcon = 'fa-brands fa-github';
    } else if (linkData.type === 'LINKEDIN') {
      if (!finalUrl) finalUrl = prof.linkedinUrl ? (prof.linkedinUrl.startsWith('http') ? prof.linkedinUrl : `https://${prof.linkedinUrl}`) : 'https://linkedin.com';
      if (!finalTitle || finalTitle === 'Botón') finalTitle = 'Perfil Profesional LinkedIn';
      if (!linkData.icon) finalIcon = 'fa-brands fa-linkedin';
    } else if (linkData.type === 'PHONE') {
      if (!finalUrl) finalUrl = rawPhone ? `tel:${rawPhone}` : 'tel:';
      if (!finalTitle || finalTitle === 'Botón') finalTitle = 'Llamada Telefónica';
      if (!linkData.icon) finalIcon = 'fa-solid fa-phone';
    } else if (linkData.type === 'EMAIL') {
      if (!finalUrl) finalUrl = prof.user.email ? `mailto:${prof.user.email}` : 'mailto:';
      if (!finalTitle || finalTitle === 'Botón') finalTitle = 'Enviar Correo Electrónico';
      if (!linkData.icon) finalIcon = 'fa-solid fa-envelope';
    } else if (linkData.type === 'CV') {
      if (!finalTitle || finalTitle === 'Botón') finalTitle = 'Descargar Hoja de Vida / CV';
      if (!linkData.icon) finalIcon = 'fa-solid fa-file-pdf';
    }

    if (linkData.id) {
      const existing = await db.studentIdLink.findFirst({
        where: { id: linkData.id, studentId: studentIdObj.id }
      });
      if (!existing) throw new Error("El botón especificado no existe.");

      return await db.studentIdLink.update({
        where: { id: linkData.id },
        data: {
          type: linkData.type,
          title: finalTitle,
          icon: finalIcon,
          url: finalUrl,
          targetId: linkData.targetId ? Number(linkData.targetId) : null,
          isActive: linkData.isActive !== undefined ? linkData.isActive : true
        }
      });
    } else {
      const maxSort = await db.studentIdLink.aggregate({
        where: { studentId: studentIdObj.id },
        _max: { sortOrder: true }
      });
      const nextSort = (maxSort._max.sortOrder || 0) + 1;

      return await db.studentIdLink.create({
        data: {
          studentId: studentIdObj.id,
          type: linkData.type,
          title: finalTitle,
          icon: finalIcon,
          url: finalUrl,
          targetId: linkData.targetId ? Number(linkData.targetId) : null,
          sortOrder: nextSort,
          isActive: linkData.isActive !== undefined ? linkData.isActive : true
        }
      });
    }
  }

  /**
   * Elimina un enlace
   */
  public static async deleteLink(userId: number, linkId: number) {
    const studentIdObj = await this.getOrCreateIdForStudent(userId);
    const existing = await db.studentIdLink.findFirst({
      where: { id: linkId, studentId: studentIdObj.id }
    });

    if (!existing) throw new Error("No tienes permisos para eliminar este botón.");

    await db.studentIdLink.delete({ where: { id: linkId } });
    return true;
  }

  /**
   * Reordena los enlaces
   */
  public static async reorderLinks(userId: number, linkIds: number[]) {
    const studentIdObj = await this.getOrCreateIdForStudent(userId);

    const updates = linkIds.map((id, index) =>
      db.studentIdLink.updateMany({
        where: { id, studentId: studentIdObj.id },
        data: { sortOrder: index }
      })
    );

    await db.$transaction(updates);
    return true;
  }

  /**
   * Crea o actualiza un bloque destacado (Proyecto/Logro)
   */
  public static async upsertBlock(userId: number, blockData: {
    id?: number;
    type: string;
    title: string;
    description?: string;
    image?: string;
    buttonText?: string;
    url?: string;
    targetId?: number;
    startAt?: string | null;
    endAt?: string | null;
    isActive?: boolean;
  }) {
    const studentIdObj = await this.getOrCreateIdForStudent(userId);

    const payload = {
      type: blockData.type || "FEATURED_PROJECT",
      title: blockData.title.trim(),
      description: blockData.description ? blockData.description.trim() : null,
      image: blockData.image || null,
      buttonText: blockData.buttonText ? blockData.buttonText.trim() : "Ver Proyecto",
      url: blockData.url ? blockData.url.trim() : null,
      targetId: blockData.targetId ? Number(blockData.targetId) : null,
      startAt: blockData.startAt ? new Date(blockData.startAt) : null,
      endAt: blockData.endAt ? new Date(blockData.endAt) : null,
      isActive: blockData.isActive !== undefined ? blockData.isActive : true
    };

    if (blockData.id) {
      const existing = await db.studentIdBlock.findFirst({
        where: { id: blockData.id, studentId: studentIdObj.id }
      });
      if (!existing) throw new Error("El bloque especificado no existe.");

      return await db.studentIdBlock.update({
        where: { id: blockData.id },
        data: payload
      });
    } else {
      const maxSort = await db.studentIdBlock.aggregate({
        where: { studentId: studentIdObj.id },
        _max: { sortOrder: true }
      });
      const nextSort = (maxSort._max.sortOrder || 0) + 1;

      return await db.studentIdBlock.create({
        data: {
          ...payload,
          studentId: studentIdObj.id,
          sortOrder: nextSort
        }
      });
    }
  }

  /**
   * Elimina un bloque destacado
   */
  public static async deleteBlock(userId: number, blockId: number) {
    const studentIdObj = await this.getOrCreateIdForStudent(userId);
    const existing = await db.studentIdBlock.findFirst({
      where: { id: blockId, studentId: studentIdObj.id }
    });

    if (!existing) throw new Error("No tienes permisos para eliminar este bloque.");

    await db.studentIdBlock.delete({ where: { id: blockId } });
    return true;
  }

  /**
   * Registra un evento de analítica (Visita, Clic en Botón, Acción Principal, Perfil)
   */
  public static async trackEvent(slug: string, eventType: string, linkId?: number, sessionData?: {
    sessionIdentifier?: string;
    referrer?: string;
    userAgent?: string;
  }) {
    let cleanSlug = slug.trim().toLowerCase();
    if (cleanSlug.startsWith('@')) cleanSlug = cleanSlug.slice(1);

    const item = await db.studentId.findUnique({ where: { slug: cleanSlug } });
    if (!item) return;

    await db.studentIdAnalytics.create({
      data: {
        studentId: item.id,
        linkId: linkId || null,
        eventType,
        sessionIdentifier: sessionData?.sessionIdentifier || null,
        referrer: sessionData?.referrer ? sessionData.referrer.slice(0, 255) : null,
        userAgent: sessionData?.userAgent ? sessionData.userAgent.slice(0, 255) : null
      }
    });

    if (linkId) {
      await db.studentIdLink.updateMany({
        where: { id: linkId, studentId: item.id },
        data: { clicksCount: { increment: 1 } }
      }).catch(() => {});
    }
  }

  /**
   * Resumen de analíticas para el dashboard estudiantil
   */
  public static async getAnalyticsSummary(userId: number) {
    const studentIdObj = await this.getOrCreateIdForStudent(userId);

    const totalVisits = await db.studentIdAnalytics.count({
      where: { studentId: studentIdObj.id, eventType: "VISIT" }
    });

    const totalLinkClicks = await db.studentIdAnalytics.count({
      where: { studentId: studentIdObj.id, eventType: "LINK_CLICK" }
    });

    const primaryActionClicks = await db.studentIdAnalytics.count({
      where: { studentId: studentIdObj.id, eventType: "PRIMARY_ACTION" }
    });

    const profileClicks = await db.studentIdAnalytics.count({
      where: { studentId: studentIdObj.id, eventType: "PROFILE_CLICK" }
    });

    const linksBreakdown = await db.studentIdLink.findMany({
      where: { studentId: studentIdObj.id },
      select: { id: true, title: true, type: true, clicksCount: true, icon: true },
      orderBy: { clicksCount: 'desc' }
    });

    return {
      totalVisits,
      totalLinkClicks,
      primaryActionClicks,
      profileClicks,
      linksBreakdown
    };
  }
}
