import { db } from "../lib/db";

const RESERVED_SLUGS = new Set([
  "admin", "api", "login", "logout", "register", "student", "cursos",
  "conversatorios", "articulos", "directorio", "eventos", "nosotros",
  "contacto", "profile-setup", "dashboard", "facturacion", "referidos",
  "prensa", "terminos", "privacidad", "soporte", "help", "ayuda", "home"
]);

export class ProfessionalIdService {
  /**
   * Valida si un slug es reservado o inválido
   */
  public static isReservedSlug(slug: string): boolean {
    if (!slug) return true;
    const clean = slug.trim().toLowerCase();
    return RESERVED_SLUGS.has(clean) || clean.startsWith("api") || clean.startsWith("admin");
  }

  /**
   * Obtiene o inicializa automáticamente el objeto ProfessionalId para un usuario
   */
  public static async getOrCreateIdForUser(userId: number) {
    const profile = await db.professionalProfile.findUnique({
      where: { userId },
      include: {
        user: true,
        professionalId: {
          include: {
            links: { orderBy: { sortOrder: 'asc' } },
            blocks: { orderBy: { sortOrder: 'asc' } }
          }
        }
      }
    });

    if (!profile) {
      throw new Error("El usuario no posee un perfil profesional activo.");
    }

    if (profile.professionalId) {
      return {
        ...profile.professionalId,
        professionalProfile: profile
      };
    }

    // Generar un slug único inicial basado en el perfil o nombre
    let baseSlug = profile.slug || profile.user.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!baseSlug || this.isReservedSlug(baseSlug)) {
      baseSlug = `profesional-${profile.id}`;
    }

    let finalSlug = baseSlug;
    let counter = 1;
    while (await db.professionalId.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Formatear WhatsApp inicial
    let rawPhone = (profile.whatsapp || profile.telefono || '').replace(/[^0-9]/g, '');
    if (rawPhone && !rawPhone.startsWith('593')) {
      rawPhone = rawPhone.startsWith('0') ? '593' + rawPhone.substring(1) : '593' + rawPhone;
    }
    const initialWaMsg = encodeURIComponent(`Hola ${profile.user.name}, vi tu Profesionales ID y deseo solicitar información.`);
    const initialWaUrl = rawPhone ? `https://wa.me/${rawPhone}?text=${initialWaMsg}` : '';

    // Crear el registro inicial de ProfessionalId con botones predeterminados
    const newId = await db.professionalId.create({
      data: {
        professionalProfileId: profile.id,
        slug: finalSlug,
        shortDescription: profile.slogan || profile.bio?.slice(0, 120) || "¡Bienvenidos a mi canal de enlace directo!",
        primaryActionType: "WHATSAPP",
        primaryActionTitle: "Escríbeme por WhatsApp",
        primaryActionValue: initialWaUrl || rawPhone,
        theme: "light",
        buttonStyle: "rounded",
        alignment: "center",
        isActive: true,
        links: {
          create: [
            {
              type: "PROFILE",
              title: "Ver mi Perfil Profesional Completo",
              icon: "fa-solid fa-address-card",
              url: `/directorio/${finalSlug}`,
              sortOrder: 0,
              isActive: true
            },
            ...(rawPhone ? [{
              type: "WHATSAPP",
              title: "Contacto por WhatsApp",
              icon: "fa-brands fa-whatsapp",
              url: initialWaUrl,
              sortOrder: 1,
              isActive: true
            }] : []),
            ...(profile.website ? [{
              type: "EXTERNAL_URL",
              title: "Visitar mi sitio web",
              icon: "fa-solid fa-globe",
              url: profile.website.startsWith('http') ? profile.website : `https://${profile.website}`,
              sortOrder: 2,
              isActive: true
            }] : [])
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
      professionalProfile: profile
    };
  }

  /**
   * Obtiene la vista pública por slug (@usuario)
   */
  public static async getPublicIdBySlug(slugInput: string) {
    let cleanSlug = slugInput.trim().toLowerCase();
    if (cleanSlug.startsWith('@')) {
      cleanSlug = cleanSlug.slice(1);
    }

    if (this.isReservedSlug(cleanSlug)) {
      return null;
    }

    const item = await db.professionalId.findUnique({
      where: { slug: cleanSlug },
      include: {
        professionalProfile: {
          include: {
            user: true,
            specialties: {
              include: {
                specialty: {
                  include: {
                    profession: true
                  }
                }
              }
            },
            services: { where: { estado: "ACTIVO" } }
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
   * Actualiza la configuración básica del ProfessionalId
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
    const profIdObj = await this.getOrCreateIdForUser(userId);

    const updateData: any = {};

    if (typeof data.shortDescription === 'string') updateData.shortDescription = data.shortDescription.trim();
    if (typeof data.primaryActionType === 'string') updateData.primaryActionType = data.primaryActionType;
    if (typeof data.primaryActionTitle === 'string') updateData.primaryActionTitle = data.primaryActionTitle.trim();
    if (typeof data.primaryActionValue === 'string') updateData.primaryActionValue = data.primaryActionValue.trim();
    if (typeof data.theme === 'string') updateData.theme = data.theme;
    if (typeof data.buttonStyle === 'string') updateData.buttonStyle = data.buttonStyle;
    if (typeof data.alignment === 'string') updateData.alignment = data.alignment;
    if (typeof data.isActive === 'boolean') updateData.isActive = data.isActive;

    if (data.slug && data.slug.trim() !== profIdObj.slug) {
      let newSlug = data.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
      if (this.isReservedSlug(newSlug)) {
        throw new Error("El identificador de enlace no está disponible.");
      }
      const existing = await db.professionalId.findUnique({ where: { slug: newSlug } });
      if (existing && existing.id !== profIdObj.id) {
        throw new Error("El enlace ya está en uso por otro profesional.");
      }
      updateData.slug = newSlug;
    }

    return await db.professionalId.update({
      where: { id: profIdObj.id },
      data: updateData,
      include: {
        links: { orderBy: { sortOrder: 'asc' } },
        blocks: { orderBy: { sortOrder: 'asc' } }
      }
    });
  }

  /**
   * Crea o actualiza un enlace/botón (con autollenado inteligente de URLs)
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
    const profIdObj = await this.getOrCreateIdForUser(userId);
    const prof = profIdObj.professionalProfile;
    const slug = prof.slug || profIdObj.slug;

    // Calcular teléfono y mensaje formateado de WhatsApp
    let rawPhone = (prof.whatsapp || prof.telefono || '').replace(/[^0-9]/g, '');
    if (rawPhone && !rawPhone.startsWith('593')) {
      rawPhone = rawPhone.startsWith('0') ? '593' + rawPhone.substring(1) : '593' + rawPhone;
    }
    const waMsg = encodeURIComponent(`Hola ${prof.user.name}, vi tu Profesionales ID y deseo solicitar información.`);
    const defaultWaUrl = rawPhone ? `https://wa.me/${rawPhone}?text=${waMsg}` : '';

    // Autollenado de URL según el tipo de botón si no viene especificada
    let finalUrl = linkData.url ? linkData.url.trim() : null;
    let finalTitle = linkData.title ? linkData.title.trim() : 'Botón';
    let finalIcon = linkData.icon || 'fa-solid fa-link';

    if (linkData.type === 'WHATSAPP') {
      if (!finalUrl || !finalUrl.includes('wa.me')) {
        finalUrl = defaultWaUrl;
      }
      if (!finalTitle || finalTitle === 'Botón') finalTitle = 'Contacto por WhatsApp';
      if (!linkData.icon) finalIcon = 'fa-brands fa-whatsapp';
    } else if (linkData.type === 'AGENDA') {
      if (!finalUrl) finalUrl = `/directorio/${slug}#agendamiento`;
      if (!finalTitle || finalTitle === 'Botón') finalTitle = 'Agendar una Cita Directa';
      if (!linkData.icon) finalIcon = 'fa-solid fa-calendar-check';
    } else if (linkData.type === 'SERVICES') {
      if (!finalUrl) finalUrl = `/directorio/${slug}#servicios`;
      if (!finalTitle || finalTitle === 'Botón') finalTitle = 'Consultar Mis Servicios';
      if (!linkData.icon) finalIcon = 'fa-solid fa-stethoscope';
    } else if (linkData.type === 'PROFILE') {
      if (!finalUrl) finalUrl = `/directorio/${slug}`;
      if (!finalTitle || finalTitle === 'Botón') finalTitle = 'Ver mi Perfil Profesional Completo';
      if (!linkData.icon) finalIcon = 'fa-solid fa-address-card';
    } else if (linkData.type === 'PHONE') {
      if (!finalUrl) finalUrl = rawPhone ? `tel:${rawPhone}` : 'tel:';
      if (!finalTitle || finalTitle === 'Botón') finalTitle = 'Llamada Telefónica';
      if (!linkData.icon) finalIcon = 'fa-solid fa-phone';
    } else if (linkData.type === 'EMAIL') {
      if (!finalUrl) finalUrl = prof.user.email ? `mailto:${prof.user.email}` : 'mailto:';
      if (!finalTitle || finalTitle === 'Botón') finalTitle = 'Enviar Correo Electrónico';
      if (!linkData.icon) finalIcon = 'fa-solid fa-envelope';
    }

    if (linkData.id) {
      const existing = await db.professionalIdLink.findFirst({
        where: { id: linkData.id, professionalId: profIdObj.id }
      });
      if (!existing) {
        throw new Error("El botón especificado no existe.");
      }

      return await db.professionalIdLink.update({
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
      const maxSort = await db.professionalIdLink.aggregate({
        where: { professionalId: profIdObj.id },
        _max: { sortOrder: true }
      });
      const nextSort = (maxSort._max.sortOrder || 0) + 1;

      return await db.professionalIdLink.create({
        data: {
          professionalId: profIdObj.id,
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
    const profIdObj = await this.getOrCreateIdForUser(userId);
    const existing = await db.professionalIdLink.findFirst({
      where: { id: linkId, professionalId: profIdObj.id }
    });

    if (!existing) {
      throw new Error("No tienes permisos para eliminar este botón.");
    }

    await db.professionalIdLink.delete({ where: { id: linkId } });
    return true;
  }

  /**
   * Reordena los enlaces según un arreglo de IDs
   */
  public static async reorderLinks(userId: number, linkIds: number[]) {
    const profIdObj = await this.getOrCreateIdForUser(userId);

    const updates = linkIds.map((id, index) =>
      db.professionalIdLink.updateMany({
        where: { id, professionalId: profIdObj.id },
        data: { sortOrder: index }
      })
    );

    await db.$transaction(updates);
    return true;
  }

  /**
   * Crea o actualiza un bloque destacado/promoción
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
    const profIdObj = await this.getOrCreateIdForUser(userId);

    const payload = {
      type: blockData.type,
      title: blockData.title.trim(),
      description: blockData.description ? blockData.description.trim() : null,
      image: blockData.image || null,
      buttonText: blockData.buttonText ? blockData.buttonText.trim() : "Aprovechar",
      url: blockData.url ? blockData.url.trim() : null,
      targetId: blockData.targetId ? Number(blockData.targetId) : null,
      startAt: blockData.startAt ? new Date(blockData.startAt) : null,
      endAt: blockData.endAt ? new Date(blockData.endAt) : null,
      isActive: blockData.isActive !== undefined ? blockData.isActive : true
    };

    if (blockData.id) {
      const existing = await db.professionalIdBlock.findFirst({
        where: { id: blockData.id, professionalId: profIdObj.id }
      });
      if (!existing) throw new Error("El bloque especificado no existe.");

      return await db.professionalIdBlock.update({
        where: { id: blockData.id },
        data: payload
      });
    } else {
      const maxSort = await db.professionalIdBlock.aggregate({
        where: { professionalId: profIdObj.id },
        _max: { sortOrder: true }
      });
      const nextSort = (maxSort._max.sortOrder || 0) + 1;

      return await db.professionalIdBlock.create({
        data: {
          ...payload,
          professionalId: profIdObj.id,
          sortOrder: nextSort
        }
      });
    }
  }

  /**
   * Elimina un bloque destacado
   */
  public static async deleteBlock(userId: number, blockId: number) {
    const profIdObj = await this.getOrCreateIdForUser(userId);
    const existing = await db.professionalIdBlock.findFirst({
      where: { id: blockId, professionalId: profIdObj.id }
    });

    if (!existing) throw new Error("No tienes permisos para eliminar este bloque.");

    await db.professionalIdBlock.delete({ where: { id: blockId } });
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

    const item = await db.professionalId.findUnique({ where: { slug: cleanSlug } });
    if (!item) return;

    await db.professionalIdAnalytics.create({
      data: {
        professionalId: item.id,
        linkId: linkId || null,
        eventType,
        sessionIdentifier: sessionData?.sessionIdentifier || null,
        referrer: sessionData?.referrer ? sessionData.referrer.slice(0, 255) : null,
        userAgent: sessionData?.userAgent ? sessionData.userAgent.slice(0, 255) : null
      }
    });

    if (linkId) {
      await db.professionalIdLink.updateMany({
        where: { id: linkId, professionalId: item.id },
        data: { clicksCount: { increment: 1 } }
      }).catch(() => {});
    }
  }

  /**
   * Obtiene resumen de analíticas para el dashboard profesional
   */
  public static async getAnalyticsSummary(userId: number) {
    const profIdObj = await this.getOrCreateIdForUser(userId);

    const totalVisits = await db.professionalIdAnalytics.count({
      where: { professionalId: profIdObj.id, eventType: "VISIT" }
    });

    const totalLinkClicks = await db.professionalIdAnalytics.count({
      where: { professionalId: profIdObj.id, eventType: "LINK_CLICK" }
    });

    const primaryActionClicks = await db.professionalIdAnalytics.count({
      where: { professionalId: profIdObj.id, eventType: "PRIMARY_ACTION" }
    });

    const profileClicks = await db.professionalIdAnalytics.count({
      where: { professionalId: profIdObj.id, eventType: "PROFILE_CLICK" }
    });

    const linksBreakdown = await db.professionalIdLink.findMany({
      where: { professionalId: profIdObj.id },
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
