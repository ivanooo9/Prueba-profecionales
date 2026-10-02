import express, { Request, Response, NextFunction } from "express";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "../lib/db";
import { CertificateEligibilityService, getValidCertificateUserName } from "../services/certificate-eligibility.service";
import { StudentService } from "../services/student.service";
import {
  AUTH_COOKIE_OPTIONS,
  comparePassword,
  createAuthSession,
  generatePasswordResetToken,
  hashPassword,
  revokeSessionFromToken,
  verifyPasswordResetToken,
} from "../lib/auth";
import { generateInvoiceXml } from "../lib/sri/xml-generator";
import { signDocument } from "../lib/sri/sri-signer";
import { SriClient } from "../lib/sri/sri-client";
import { generateRidePdf } from "../lib/sri/ride-generator";
import { emailService } from "../lib/email";
import { uploadBase64ToCloudinary, getSignedCloudinaryDeliveryUrl } from "../lib/cloudinary";
import {
  buildBankAccountSnapshot,
  findActiveBankAccountById,
  formatBankAccountLabel,
  getActiveBankAccounts,
  parseSubmittedBankAccountId,
} from "../lib/bank-accounts";
import { toTitleCase } from "../lib/utils";
import QRCode from "qrcode";
import crypto from "crypto";
import { requireAdmin, requireProfessional, requireClient } from "../lib/middlewares";
import { getUniqueSlug, generateSlug } from "../lib/slug";
import { cachedFetch, cacheKeyFactory as cacheKey } from "../lib/cache";
import { getEffectiveTiempoMinimoPonencia } from "../lib/video";

const router = express.Router();

const CONVERSATORIO_ESTADO = {
  PROGRAMADO: "PROGRAMADO",
  ACTIVO: "ACTIVO",
  FINALIZADO: "FINALIZADO"
} as const;

type ConversatorioEstado = (typeof CONVERSATORIO_ESTADO)[keyof typeof CONVERSATORIO_ESTADO];
const sriClient = new SriClient();

const getSystemConfig = () =>
  cachedFetch(cacheKey.systemConfig.singleton(), () =>
    db.systemConfig.findUnique({ where: { id: 1 } })
  );

const getAllProfessions = () =>
  cachedFetch(cacheKey.profession.all(), () =>
    db.profession.findMany({
      include: { specialties: true },
      orderBy: { orden: "asc" },
    })
  );

const getProfessionByNombre = (nombre: string) =>
  cachedFetch(cacheKey.profession.byNombre(nombre), () =>
    db.profession.findUnique({
      where: { nombre },
      include: { specialties: true },
    })
  );

const getHeroCarouselsByTipo = (tipo: string) =>
  cachedFetch(cacheKey.heroCarousel.byTipo(tipo), () =>
    db.heroCarousel.findMany({
      where: { tipo, activo: true },
      orderBy: { orden: "asc" },
    })
  );

const getHeroCarouselsByTipoProfession = (tipo: string, professionId: number) =>
  cachedFetch(cacheKey.heroCarousel.byTipoProfession(tipo, professionId), () =>
    db.heroCarousel.findMany({
      where: { tipo, profesionId: professionId, activo: true },
      orderBy: { orden: "asc" },
    })
  );

const getAgreements = () =>
  cachedFetch(cacheKey.agreement.all(), () =>
    db.agreement.findMany({ where: { conversatorioId: null }, orderBy: { orden: "asc" } })
  );

const getSpecialties = () =>
  cachedFetch(cacheKey.specialty.all(), () =>
    db.specialty.findMany({ orderBy: { nombre: "asc" } })
  );

const getEditablePageBySlug = (slug: string) =>
  cachedFetch(cacheKey.editablePage.bySlug(slug), () =>
    db.editablePage.findUnique({ where: { slug } })
  );

const getMembershipPlans = () =>
  cachedFetch(cacheKey.membershipPlan.all(), () =>
    db.membershipPlan.findMany({ orderBy: { precio: "asc" } })
  );

const getMembershipPlanById = (id: number) =>
  cachedFetch(cacheKey.membershipPlan.byId(id), () =>
    db.membershipPlan.findUnique({ where: { id } })
  );

const getRoleByName = (name: string) =>
  cachedFetch(cacheKey.role.byName(name), () => db.role.findUnique({ where: { name } }));

function getSafeQueryString(value: unknown, maxLength = 120): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ").slice(0, maxLength).trim();
}

async function ensureProfessionalProfileSlugs<T extends { id: number; slug: string | null; user?: { name?: string | null } | null }>(profiles: T[]): Promise<T[]> {
  for (const profile of profiles) {
    if (profile.slug) continue;

    const baseText = profile.user?.name?.trim() || "profesional";

    for (let attempt = 0; attempt < 3; attempt++) {
      const slug = await getUniqueSlug("professionalProfile", baseText, profile.id);

      try {
        const result = await db.professionalProfile.updateMany({
          where: { id: profile.id, slug: null },
          data: { slug }
        });

        if (result.count > 0) {
          profile.slug = slug;
          break;
        }

        const existing = await db.professionalProfile.findUnique({
          where: { id: profile.id },
          select: { slug: true }
        });
        if (existing?.slug) {
          profile.slug = existing.slug;
        }
        break;
      } catch (error: any) {
        if (error?.code !== "P2002" || attempt === 2) {
          throw error;
        }
      }
    }
  }

  return profiles;
}

const STALE_TRANSFER_PAYMENT = {
  HOURS: 24,
  RETRY_EMAIL_AFTER_HOURS: 6,
  CURRENCY: "USD",
} as const;

function isValidConfigEmail(value: string | null | undefined): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function formatEcDateTime(value: Date): string {
  return value.toLocaleString("es-EC", {
    timeZone: "America/Guayaquil",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

router.get("/", async (req: Request, res: Response) => {
  try {
    // Query only featured, approved, and verified professionals from database
    const featuredProfessionals = await db.professionalProfile.findMany({
      where: {
        status: "APROBADO",
        verified: true,
        subscriptionEnds: { gt: new Date() }
      },
      include: {
        user: true,
        specialties: {
          include: {
            specialty: true,
          },
        },
      },
      take: 6,
    });

    // Query active professions for categories carousel
    const professions = await getAllProfessions();

    // Query active homepage sliders
    const carousels = await getHeroCarouselsByTipo("Inicio");

    // Query agreements
    const agreements = await getAgreements();

    // Query active promotions for homepage banners
    const activeHomePromotions = await db.professionalPromotion.findMany({
      where: {
        status: "ACTIVO",
        endDate: { gt: new Date() },
        plan: { allowHomeBanner: true },
        bannerHome: { not: null }
      },
      include: {
        profile: {
          include: { user: true }
        }
      }
    });

    // Query active homepage popup (most recent active one)
    const activePopup = await db.professionalPromotion.findFirst({
      where: {
        status: "ACTIVO",
        endDate: { gt: new Date() },
        plan: { allowPopupHome: true },
        popupImage: { not: null }
      },
      include: {
        profile: {
          include: { user: true }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.render("index", {
      title: "Inicio",
      activePage: "inicio",
      featuredProfessionals: featuredProfessionals || [],
      professions: professions || [],
      carousels: carousels || [],
      agreements: agreements || [],
      activeHomePromotions: activeHomePromotions || [],
      activePopup: activePopup || null
    });
  } catch (error) {
    console.error("Error loading home page database content:", error);
    res.render("index", {
      title: "Inicio",
      activePage: "inicio",
      featuredProfessionals: [],
      professions: [],
      agreements: [],
      activeHomePromotions: [],
      activePopup: null
    });
  }
});

// Dynamic Profession & Specialties View Route
router.get("/profesion/:nombre", async (req: Request, res: Response) => {
  const nombre = req.params.nombre as string;
  try {
    const profession = await getProfessionByNombre(nombre);

    if (!profession) {
      return res.redirect("/directorio?error=profession_not_found");
    }

    // Load carousels filtered by profession
    const carousels = await getHeroCarouselsByTipoProfession("Profesion", (profession as any).id);

    // Run dynamic aggregates to count approved professionals per specialty
    const specialtiesWithCounts = await Promise.all(
      ((profession as any).specialties || []).map(async (spec: any) => {
        const count = await db.professionalProfileSpecialty.count({
          where: {
            specialtyId: spec.id,
            profile: {
              status: "APROBADO"
            }
          }
        });
        return {
          id: spec.id,
          professionId: spec.professionId,
          nombre: spec.nombre,
          descripcion: spec.descripcion,
          imagen: spec.imagen,
          orden: spec.orden,
          professionalCount: count
        };
      })
    );

    // Query active promotions for category banners
    const activeCategoryPromotions = await db.professionalPromotion.findMany({
      where: {
        status: "ACTIVO",
        endDate: { gt: new Date() },
        plan: { allowCategoryBanner: true },
        bannerCategory: { not: null },
        profile: {
          specialties: {
            some: {
              specialty: {
                profession: {
                  nombre: profession.nombre
                }
              }
            }
          }
        }
      },
      include: {
        profile: {
          include: { user: true }
        }
      }
    });

    // Query active category popup
    const activePopup = await db.professionalPromotion.findFirst({
      where: {
        status: "ACTIVO",
        endDate: { gt: new Date() },
        plan: { allowPopupCategory: true },
        popupImage: { not: null },
        profile: {
          specialties: {
            some: {
              specialty: {
                profession: {
                  nombre: profession.nombre
                }
              }
            }
          }
        }
      },
      include: {
        profile: {
          include: { user: true }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.render("profesion", {
      title: profession.nombre,
      activePage: "profesionales",
      profession,
      specialties: specialtiesWithCounts,
      carousels,
      activeCategoryPromotions: activeCategoryPromotions || [],
      activePopup: activePopup || null
    });
  } catch (error) {
    console.error("Error loading profession page:", error);
    res.redirect("/directorio?error=db_error");
  }
});

// Directory / Search Route
router.get("/directorio", async (req: Request, res: Response) => {
  try {
    const search = getSafeQueryString(req.query.search);
    const profession = getSafeQueryString(req.query.profession);
    const specialty = getSafeQueryString(req.query.specialty);
    const provincia = getSafeQueryString(req.query.provincia);
    const ciudad = getSafeQueryString(req.query.ciudad);
    const sort = getSafeQueryString(req.query.sort, 40) || "destacados";

    const whereClause: any = {
      status: "APROBADO"
    };

    // Helper function for local intent mapping
    function expandQueryWithIntents(query: string): string[] {
      const normalized = query.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""); // Remove accents
      const keywords: string[] = [];

      const mappings = [
        {
          terms: ["dolor", "cabeza", "fiebre", "gripe", "tos", "enfermo", "medico", "malestar", "salud", "doctor", "clinica", "consultorio", "pediatra", "ginecologo"],
          targets: ["Salud y Medicina", "Medicina General", "Médico", "Doctor"]
        },
        {
          terms: ["sri", "declaracion", "impuestos", "factura", "iva", "renta", "contable", "balance", "contabilidad", "auditoría", "auditoria", "declaración"],
          targets: ["Finanzas y Contabilidad", "Contabilidad General (CPA)", "Asesoría Tributaria y SRI", "Contador"]
        },
        {
          terms: ["juicio", "demanda", "alimentos", "divorcio", "pension", "abogado", "ley", "legal", "contrato", "herencia", "litigio", "penal", "civil", "pensión"],
          targets: ["Derecho y Leyes", "Derecho Civil y Familia", "Derecho Penal", "Abogado"]
        },
        {
          terms: ["pagina web", "sitio web", "app", "aplicacion", "software", "sistema", "desarrollo", "programador", "codigo", "computadora", "tecnologia", "ingeniero en sistemas", "desarrollador", "página web", "aplicación", "código", "tecnología"],
          targets: ["Tecnología e Ingeniería", "Desarrollo de Software / Apps", "Ingeniero", "Desarrollador", "Software"]
        },
        {
          terms: ["diente", "muela", "caries", "ortodoncia", "dentista", "brackets", "limpieza dental", "odontologo", "odontologia"],
          targets: ["Salud y Medicina", "Odontología General", "Ortodoncia y Estética Dental", "Dentista"]
        },
        {
          terms: ["ansiedad", "depresion", "estres", "terapia", "psicologo", "emocional", "psicologia", "bienestar", "depresión", "estrés", "psicólogo", "psicología"],
          targets: ["Psicología y Bienestar", "Psicología Clínica", "Psicólogo"]
        },
        {
          terms: ["diseño", "logo", "ilustracion", "flyer", "banner", "marca", "identidad", "grafico", "publicidad", "branding", "diseñador", "gráfico"],
          targets: ["Marketing y Diseño", "Diseño Gráfico y Branding", "Marketing Digital y SEO", "Diseñador"]
        },
        {
          terms: ["plomero", "electricista", "carpintero", "mecanico", "cerrajero", "construccion", "albañil", "pintura", "plomeria", "electricidad", "mecánica", "cerrajería", "construcción"],
          targets: ["Oficios y Servicios Técnicos", "Electricidad y Acometidas", "Plomería e Instalaciones Sanitarias", "Mecánica Automotriz", "Carpintería y Mueblería a Medida"]
        }
      ];

      for (const map of mappings) {
        if (map.terms.some(term => normalized.includes(term))) {
          keywords.push(...map.targets);
        }
      }

      return keywords;
    }

    let aiFilters: any = null;
    let localTargets: string[] = [];

    if (search) {
      // 1. Run local semantic intent mapping first
      localTargets = expandQueryWithIntents(search);

      // 2. Fall back to Gemini API (using gemini-2.0-flash which matches the quota/model list)
      const config = await getSystemConfig();
      if (config && config.geminiApiKey) {
        try {
          // Query available professions & specialties to teach Gemini
          const dbProfessions = await getAllProfessions();

          const professionsList = dbProfessions.map(p => ({
            professionName: p.nombre,
            specialties: p.specialties.map(s => s.nombre)
          }));

          const prompt = `
          Eres el motor de búsqueda inteligente de la plataforma "Profesionales Ecuador".
          Tu tarea es analizar la consulta de búsqueda de un usuario y asociarla con una o más Profesiones o Especialidades de nuestra base de datos.

          Lista de Profesiones y Especialidades disponibles:
          ${JSON.stringify(professionsList, null, 2)}

          Consulta del usuario: "${search}"

          Instrucciones de clasificación:
          1. Identifica la intención del usuario. Por ejemplo, si dice "me duele la cabeza" o "tengo fiebre", la intención se asocia con "Medicina" o "Médico General". Si dice "declaraciones del SRI" o "impuestos", se asocia con "Contabilidad" o "Contador". Si dice "juicio de alimentos", se asocia con "Derecho" o "Abogado". Si dice "página web" o "app móvil", se asocia con "Desarrollo de Software" o "Sistemas".
          2. Si la consulta parece ser el nombre de una persona (ej: "Juan", "Carlos", "Dra. Gomez"), establece "isNameQuery" en true.
          3. Devuelve los resultados estrictamente en este formato JSON, no agregues texto explicativo, markdown o bloques adicionales fuera del JSON:
          {
            "matchedProfession": "Nombre exacto de la Profesión identificada, o null",
            "matchedSpecialty": "Nombre exacto de la Especialidad identificada, o null",
            "keywords": ["palabras", "clave", "derivadas"],
            "isNameQuery": false
          }
          `;

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);

          const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.geminiApiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: "application/json"
              }
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (apiResponse.ok) {
            const data: any = await apiResponse.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              aiFilters = JSON.parse(text);
            }
          } else {
            const errText = await apiResponse.text();
            console.warn("[Gemini Search AI] API returned error status:", apiResponse.status, errText);
          }
        } catch (geminiError) {
          console.warn("[Gemini Search AI] Error or timeout during classification:", geminiError);
        }
      }
    }

    if (search) {
      const orConditions: any[] = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { bio: { contains: search, mode: 'insensitive' } },
        { slogan: { contains: search, mode: 'insensitive' } },
        { specialties: { some: { specialty: { nombre: { contains: search, mode: 'insensitive' } } } } }
      ];

      // Add local semantic mapping targets
      localTargets.forEach(target => {
        orConditions.push({
          specialties: {
            some: {
              specialty: {
                nombre: { contains: target, mode: 'insensitive' }
              }
            }
          }
        });
        orConditions.push({
          specialties: {
            some: {
              specialty: {
                profession: {
                  nombre: { contains: target, mode: 'insensitive' }
                }
              }
            }
          }
        });
      });

      // Add AI filters if retrieved successfully
      if (aiFilters) {
        const matchedProfession = getSafeQueryString(aiFilters.matchedProfession);
        if (matchedProfession) {
          orConditions.push({
            specialties: {
              some: {
                specialty: {
                  profession: {
                    nombre: { contains: matchedProfession, mode: 'insensitive' }
                  }
                }
              }
            }
          });
        }
        const matchedSpecialty = getSafeQueryString(aiFilters.matchedSpecialty);
        if (matchedSpecialty) {
          orConditions.push({
            specialties: {
              some: {
                specialty: {
                  nombre: { contains: matchedSpecialty, mode: 'insensitive' }
                }
              }
            }
          });
        }
        if (aiFilters.keywords && Array.isArray(aiFilters.keywords)) {
          aiFilters.keywords
            .map((keyword: unknown) => getSafeQueryString(keyword))
            .filter(Boolean)
            .forEach((keyword: string) => {
              orConditions.push({ bio: { contains: keyword, mode: 'insensitive' } });
              orConditions.push({ slogan: { contains: keyword, mode: 'insensitive' } });
              orConditions.push({ user: { name: { contains: keyword, mode: 'insensitive' } } });
              orConditions.push({ specialties: { some: { specialty: { nombre: { contains: keyword, mode: 'insensitive' } } } } });
            });
        }
      }

      whereClause.OR = orConditions;
    }

    if (profession || specialty) {
      const specialtyFilter: any = {};
      if (specialty) {
        specialtyFilter.nombre = { contains: specialty, mode: "insensitive" };
      }
      if (profession) {
        specialtyFilter.profession = {
          nombre: { contains: profession, mode: "insensitive" }
        };
      }
      whereClause.specialties = {
        some: {
          specialty: specialtyFilter
        }
      };
    }

    if (provincia) {
      whereClause.provincia = provincia;
    }

    if (ciudad) {
      whereClause.ciudad = ciudad;
    }

    let profiles = await db.professionalProfile.findMany({
      where: whereClause,
      include: {
        user: true,
        services: true,
        specialties: {
          include: {
            specialty: {
              include: {
                profession: true
              }
            }
          }
        },
        promotions: {
          where: {
            status: "ACTIVO",
            endDate: { gt: new Date() },
            plan: {
              allowPrioritySearch: true
            }
          }
        }
      }
    });

    profiles = await ensureProfessionalProfileSlugs(profiles);

    profiles.sort((a, b) => {
      const now = new Date();
      const aFeatured = Boolean(a.verified && a.subscriptionEnds && new Date(a.subscriptionEnds) > now);
      const bFeatured = Boolean(b.verified && b.subscriptionEnds && new Date(b.subscriptionEnds) > now);

      if (aFeatured !== bFeatured) {
        return aFeatured ? -1 : 1;
      }

      const aPriority = a.promotions && a.promotions.length > 0;
      const bPriority = b.promotions && b.promotions.length > 0;
      if (aPriority !== bPriority) {
        return aPriority ? -1 : 1;
      }

      if (sort === "precio_asc") {
        return (a.tarifa || 0) - (b.tarifa || 0);
      }

      if (sort === "precio_desc") {
        return (b.tarifa || 0) - (a.tarifa || 0);
      }

      return (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0);
    });

    // Pagination calculations
    const limit = 6;
    const rawPage = parseInt(getSafeQueryString(req.query.page, 20) || "1", 10);
    const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
    const totalCount = profiles.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const currentPage = Math.min(page, totalPages);
    const paginatedProfiles = profiles.slice((currentPage - 1) * limit, currentPage * limit);

    // Load filter options dynamically
    const professions = await getAllProfessions();

    const activeProfiles = await db.professionalProfile.findMany({
      where: { status: "APROBADO" },
      select: { provincia: true, ciudad: true }
    });

    const provinces = Array.from(new Set(activeProfiles.map((p) => p.provincia).filter(Boolean))) as string[];
    const cities = Array.from(new Set(activeProfiles.map((p) => p.ciudad).filter(Boolean))) as string[];

    // Extract specialties list belonging to selected profession (if selected)
    let specialtiesList: any[] = [];
    if (profession) {
      const parentProf = professions.find((p) => p.nombre === profession);
      if (parentProf) {
        specialtiesList = parentProf.specialties;
      }
    } else {
      // Return all unique specialties
      const allSpecs = await getSpecialties();
      specialtiesList = allSpecs;
    }

    res.render("directorio", {
      title: "Directorio de Profesionales",
      activePage: "profesionales",
      profiles: paginatedProfiles,
      professions,
      specialties: specialtiesList,
      provinces,
      cities,
      query: { ...req.query, search, profession, specialty, provincia, ciudad, sort },
      currentPage: currentPage,
      totalPages,
      totalCount
    });
  } catch (error) {
    console.error("Error loading directory database content:", error);
    res.render("directorio", {
      title: "Directorio de Profesionales",
      activePage: "profesionales",
      profiles: [],
      professions: [],
      specialties: [],
      provinces: [],
      cities: [],
      query: {},
      currentPage: 1,
      totalPages: 1,
      totalCount: 0
    });
  }
});

// Appointment booking error codes mapped to user-friendly Spanish messages
const APPOINTMENT_ERROR_MESSAGES: Record<string, string> = {
  invalid_name: "El nombre ingresado no es válido. Verifica que no contenga números y tenga máximo 40 caracteres.",
  invalid_email: "El correo electrónico no tiene un formato válido.",
  invalid_phone: "El número de celular debe tener exactamente 10 dígitos numéricos, sin espacios ni guiones.",
  invalid_date: "La fecha seleccionada no es válida o ya pasó.",
  invalid_time: "La hora seleccionada no tiene un formato válido.",
  slot_unavailable: "La fecha u hora seleccionada no está disponible para este profesional. Elige otro horario dentro de los días y horas de atención.",
  motivo_too_long: "El motivo no puede superar los 100 caracteres.",
  booking_failed: "No se pudo procesar tu solicitud de cita. Intenta nuevamente."
};

// Maps JavaScript's Date.getDay() to the Prisma `dia` enum used in ProfessionalSchedule
const JS_DAY_TO_DB: Record<number, string> = {
  0: "DOMINGO",
  1: "LUNES",
  2: "MARTES",
  3: "MIERCOLES",
  4: "JUEVES",
  5: "VIERNES",
  6: "SABADO"
};

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface ValidatedAppointmentInput {
  nombre: string;
  correo: string;
  telefono: string;
  motivo?: string;
  fecha: string;
  hora: string;
}

interface ScheduleRange {
  dia: string;
  horaInicio: string;
  horaFin: string;
}

function validateAppointmentInput(
  body: any,
  schedules: ScheduleRange[]
): { ok: true; data: ValidatedAppointmentInput } | { ok: false; error: string } {
  const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "";
  const correo = typeof body?.correo === "string" ? body.correo.trim() : "";
  const telefono = typeof body?.telefono === "string" ? body.telefono.trim() : "";
  const motivo = typeof body?.motivo === "string" ? body.motivo.trim() : "";
  const fecha = typeof body?.fecha === "string" ? body.fecha.trim() : "";
  const hora = typeof body?.hora === "string" ? body.hora.trim() : "";

  if (!nombre || nombre.length > 40 || /\d/.test(nombre)) {
    return { ok: false, error: "invalid_name" };
  }

  if (motivo && motivo.length > 100) {
    return { ok: false, error: "motivo_too_long" };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return { ok: false, error: "invalid_email" };
  }

  if (!/^\d{10}$/.test(telefono)) {
    return { ok: false, error: "invalid_phone" };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return { ok: false, error: "invalid_date" };
  }

  const today = todayLocalISO();
  if (fecha < today) {
    return { ok: false, error: "invalid_date" };
  }

  if (!/^\d{2}:\d{2}$/.test(hora)) {
    return { ok: false, error: "invalid_time" };
  }

  if (!schedules || schedules.length === 0) {
    return { ok: false, error: "slot_unavailable" };
  }

  const [y, mo, d] = fecha.split("-").map(Number);
  const date = new Date(y, mo - 1, d);
  if (isNaN(date.getTime())) {
    return { ok: false, error: "invalid_date" };
  }

  const dbDay = JS_DAY_TO_DB[date.getDay()];
  const dayRanges = schedules.filter((s) => s.dia === dbDay);
  if (dayRanges.length === 0) {
    return { ok: false, error: "slot_unavailable" };
  }

  const requestedMinutes = timeToMinutes(hora);
  const fitsAnyRange = dayRanges.some((s) => {
    const start = timeToMinutes(s.horaInicio);
    const end = timeToMinutes(s.horaFin);
    return requestedMinutes >= start && requestedMinutes < end;
  });
  if (!fitsAnyRange) {
    return { ok: false, error: "slot_unavailable" };
  }

  if (fecha === today) {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (requestedMinutes <= nowMinutes) {
      return { ok: false, error: "slot_unavailable" };
    }
  }

  return {
    ok: true,
    data: {
      nombre,
      correo: correo.toLowerCase(),
      telefono,
      motivo: motivo || undefined,
      fecha,
      hora
    }
  };
}

// Dynamic Public Profile View Route
router.get("/directorio/:idOrSlug", async (req: Request, res: Response) => {
  const param = req.params.idOrSlug as string;
  const profileId = /^\d+$/.test(param) ? parseInt(param, 10) : NaN;
  try {
    let profile = null;

    if (!isNaN(profileId)) {
      const legacyProfile = await db.professionalProfile.findUnique({
        where: { id: profileId },
        select: { slug: true }
      });

      if (legacyProfile?.slug) {
        const queryString = new URLSearchParams(
          Object.entries(req.query).flatMap(([key, value]) => typeof value === "string" ? [[key, value]] : [])
        ).toString();
        return res.redirect(301, `/directorio/${legacyProfile.slug}${queryString ? `?${queryString}` : ""}`);
      }
    } else {
      profile = await db.professionalProfile.findUnique({
        where: { slug: param },
        include: {
          user: {
            include: {
              acquiredCertificates: {
                where: { estado: "APROBADO" },
                include: {
                  conversatorio: true,
                  curso: true
                },
                orderBy: { fechaEmision: "desc" }
              }
            }
          },
          services: true,
          schedules: true,
          articles: true,
          template: true,
          education: {
            orderBy: { anioEmision: "desc" }
          },
          specialties: {
            include: {
              specialty: {
                include: {
                  profession: true
                }
              }
            }
          }
        }
      });
    }

    if (!profile) {
      return res.redirect("/directorio?error=profile_not_found");
    }

    // Fetch collaborated courses for this professional profile
    const collaboratedCursos = await db.curso.findMany({
      where: {
        OR: [
          { docenteId: profile.id },
          { profileId: profile.id }
        ],
        estado: "ACTIVO"
      },
      include: {
        category: true,
        branch: true,
        discounts: true
      },
      orderBy: { createdAt: "desc" }
    });

    let viewName = "perfil";
    if (profile.template) {
      if (profile.template.baseLayout === "ejecutiva") {
        viewName = "perfil-ejecutiva";
      } else if (profile.template.baseLayout === "medica") {
        viewName = "perfil-medica";
      }
    }
    res.render(viewName, {
      title: `${profile.user.name} - Directorio`,
      activePage: "profesionales",
      profile,
      collaboratedCursos,
      previewMode: false,
      successMsg: req.query.success === "booked" ? "Su cita ha sido solicitada con éxito. Se le ha enviado un correo de confirmación y el profesional revisará su reservación." : null,
      errorMsg: typeof req.query.error === "string" && APPOINTMENT_ERROR_MESSAGES[req.query.error]
        ? APPOINTMENT_ERROR_MESSAGES[req.query.error]
        : null
    });
  } catch (error) {
    console.error("Error loading professional profile view:", error);
    res.redirect("/directorio?error=internal_error");
  }
});

// GET Route: Revista PDF for a Conversatorio. Keeps large/base64 PDFs out of the detail page HTML.
router.get("/conversatorios/:idOrSlug/revista.pdf", async (req: Request, res: Response) => {
  const param = req.params.idOrSlug as string;
  const conversatorioId = /^\d+$/.test(param) ? parseInt(param, 10) : NaN;

  try {
    let conversatorio = !isNaN(conversatorioId)
      ? await db.conversatorio.findUnique({ where: { id: conversatorioId }, select: { revistaPdf: true } })
      : null;

    if (!conversatorio) {
      conversatorio = await db.conversatorio.findUnique({ where: { slug: param }, select: { revistaPdf: true } });
    }

    if (!conversatorio?.revistaPdf) {
      return res.status(404).send("Revista no encontrada.");
    }

    if (conversatorio.revistaPdf.startsWith("data:application/pdf;base64,")) {
      const base64Data = conversatorio.revistaPdf.split(",")[1];
      const pdfBuffer = Buffer.from(base64Data, "base64");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'inline; filename="Revista_Profesionales_Ecuador.pdf"');
      return res.send(pdfBuffer);
    }

    return res.redirect(conversatorio.revistaPdf);
  } catch (error) {
    console.error("Error loading conversatorio revista PDF:", error);
    return res.status(500).send("Error al cargar la revista.");
  }
});

// GET Route: Detailed view of a single Conversatorio
router.get("/conversatorios/:idOrSlug", async (req: Request, res: Response) => {
  const param = req.params.idOrSlug as string;
  const isNumeric = /^\d+$/.test(param.trim());
  const conversatorioId = isNumeric ? parseInt(param, 10) : NaN;
  try {
    let conversatorio = null;

    if (isNumeric) {
      conversatorio = await db.conversatorio.findUnique({
        where: { id: conversatorioId },
        include: {
          itinerary: { orderBy: [{ orden: "asc" }, { id: "asc" }] },
          speakers: { orderBy: [{ dayIndex: "asc" }, { id: "asc" }] },
          certificateDesign: true,
          agreements: { orderBy: { orden: "asc" } }
        }
      });
    }

    if (!conversatorio) {
      conversatorio = await db.conversatorio.findUnique({
        where: { slug: param },
        include: {
          itinerary: { orderBy: [{ orden: "asc" }, { id: "asc" }] },
          speakers: { orderBy: [{ dayIndex: "asc" }, { id: "asc" }] },
          certificateDesign: true,
          agreements: { orderBy: { orden: "asc" } }
        }
      });
    }

    if (!conversatorio) {
      return res.redirect("/eventos?error=event_not_found");
    }

    if (isNumeric && conversatorio.slug) {
      return res.redirect(301, `/conversatorios/${conversatorio.slug}`);
    }

    let systemConfig = await getSystemConfig();
    if (!systemConfig) {
      systemConfig = await db.systemConfig.create({
        data: {
          id: 1,
          adminPassword: "admin1234",
          systemName: "Profesionales Ecuador"
        }
      });
    }

    const actualConversatorioId = conversatorio.id;

    let isEnrolled = false;
    let hasCertificate = false;
    let acquiredCertificateCode = null;
    let certificatePending = false;

    if (res.locals.user) {
      if (res.locals.user.role?.name === "ADMIN") {
        isEnrolled = true;
        hasCertificate = true;
      } else {
        const enrollment = await db.eventEnrollment.findFirst({
          where: { userId: res.locals.user.id, conversatorioId: actualConversatorioId }
        });
        isEnrolled = !!enrollment;

        const certificate = await db.certificate.findFirst({
          where: { userId: res.locals.user.id, conversatorioId: actualConversatorioId }
        });
        if (certificate) {
          if (certificate.estado === "APROBADO") {
            hasCertificate = true;
            acquiredCertificateCode = certificate.codigo;
          } else if (certificate.estado === "PENDIENTE") {
            certificatePending = true;
          }
        }
      }
    }

    const orderedSpeakers = [...(conversatorio.speakers || [])].sort((a, b) => {
      const dayA = a.dayIndex ?? 0;
      const dayB = b.dayIndex ?? 0;
      if (dayA !== dayB) return dayA - dayB;
      return a.id - b.id;
    });

    let completedCount = 0;
    const totalSpeakers = orderedSpeakers.length;
    let progressPct = 0;
    let nextSpeakerId: number | null = orderedSpeakers[0]?.id || null;
    let ctaButtonLabel = "Iniciar Evento";

    if (res.locals.user) {
      const userLogs = await db.eventAccessLog.findMany({
        where: { userId: res.locals.user.id, conversatorioId: actualConversatorioId },
        select: { speakerId: true }
      });
      const completedSpeakerIds = new Set(userLogs.map(l => l.speakerId).filter(Boolean));
      completedCount = completedSpeakerIds.size;
      progressPct = totalSpeakers > 0 ? Math.round((completedCount / totalSpeakers) * 100) : 0;

      if (completedCount > 0) {
        ctaButtonLabel = "Continuar Evento";
        const nextSpeaker = orderedSpeakers.find(s => !completedSpeakerIds.has(s.id));
        if (nextSpeaker) {
          nextSpeakerId = nextSpeaker.id;
        }
      }
    }

    const sortedItinerary = (conversatorio.itinerary || [])
      .sort((a, b) => {
        const ordA = typeof (a as any).orden === "number" ? (a as any).orden : 0;
        const ordB = typeof (b as any).orden === "number" ? (b as any).orden : 0;
        if (ordA !== ordB) return ordA - ordB;
        return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
      })
      .map((day, i) => ({
        ...day,
        computedIndex: i,
        orden: i
      }));
    const conversatorioAgreements = conversatorio.usePecConvenios
      ? await getAgreements()
      : conversatorio.agreements;

    const userRole = res.locals.user?.role?.name;
    const isEstudiante = userRole === "STUDENT";
    const precioOriginal = conversatorio.gratuito ? 0.00 : (conversatorio.precio ?? 0.00);
    const tieneDescuentoEstudiante = !conversatorio.gratuito && isEstudiante && conversatorio.descuentoEstudianteUsd !== null && conversatorio.descuentoEstudianteUsd !== undefined && conversatorio.descuentoEstudianteUsd > 0 && conversatorio.descuentoEstudianteUsd < precioOriginal;
    const precioFinal = tieneDescuentoEstudiante
      ? Number(conversatorio.descuentoEstudianteUsd)
      : precioOriginal;
    const descuentoUsd = tieneDescuentoEstudiante ? (precioOriginal - Number(conversatorio.descuentoEstudianteUsd)) : 0;

    const activeBankAccounts = await getActiveBankAccounts();

    res.render("conversatorio-detalle", {
      title: `${conversatorio.titulo} - Detalle`,
      activePage: "educacion",
      isEnrolled,
      hasCertificate,
      acquiredCertificateCode,
      certificatePending,
      systemConfig,
      activeBankAccounts,
      conversatorioAgreements,
      nextSpeakerId,
      ctaButtonLabel,
      completedCount,
      totalSpeakers,
      progressPct,
      isEstudiante,
      precioOriginal,
      precioFinal,
      descuentoUsd,
      tieneDescuentoEstudiante,
      conversatorio: {
        ...conversatorio,
        itinerary: sortedItinerary
      }
    });
  } catch (error) {
    console.error("Error loading conversatorio details:", error);
    res.redirect("/eventos?error=internal_error");
  }
});

// GET Route: Speaker profile detail page
router.get("/conversatorios/:conversatorioParam/ponentes/:speakerParam", async (req: Request, res: Response) => {
  const conversatorioParam = req.params.conversatorioParam as string;
  const speakerParam = req.params.speakerParam as string;

  const isConvNum = /^\d+$/.test(conversatorioParam.trim());
  const convIdNum = isConvNum ? parseInt(conversatorioParam, 10) : NaN;

  const isSpkNum = /^\d+$/.test(speakerParam.trim());
  const spkIdNum = isSpkNum ? parseInt(speakerParam, 10) : NaN;

  try {
    const conversatorio = await db.conversatorio.findFirst({
      where: isConvNum ? { id: convIdNum } : { slug: conversatorioParam },
      include: {
        certificateDesign: true,
        speakers: { orderBy: [{ dayIndex: "asc" }, { id: "asc" }] },
        qas: {
          where: { activo: true },
          orderBy: [{ orden: "asc" }, { id: "asc" }]
        }
      }
    });

    if (!conversatorio) {
      return res.redirect("/eventos?error=event_not_found");
    }

    let speaker = await db.conversatorioSpeaker.findFirst({
      where: isSpkNum
        ? { id: spkIdNum, conversatorioId: conversatorio.id }
        : { conversatorioId: conversatorio.id, slug: speakerParam },
      include: { resources: { orderBy: { createdAt: "asc" } } }
    });

    if (!speaker && !isSpkNum) {
      const allSpeakers = await db.conversatorioSpeaker.findMany({
        where: { conversatorioId: conversatorio.id },
        include: { resources: { orderBy: { createdAt: "asc" } } }
      });
      speaker = allSpeakers.find(s => (s.slug || generateSlug(s.nombre)) === speakerParam) || null;
    }

    if (!speaker) {
      return res.redirect(`/conversatorios/${conversatorio.slug || conversatorio.id}?error=speaker_not_found`);
    }

    if (!speaker.slug) {
      const generatedSlug = generateSlug(speaker.nombre) || `speaker-${speaker.id}`;
      await db.conversatorioSpeaker.update({
        where: { id: speaker.id },
        data: { slug: generatedSlug }
      });
      speaker.slug = generatedSlug;
    }

    if ((isConvNum || isSpkNum) && conversatorio.slug && speaker.slug) {
      return res.redirect(301, `/conversatorios/${conversatorio.slug}/ponentes/${speaker.slug}`);
    }

    // Bunny Stream videos se almacenan en bunnyVideoId (videoUrl = null).
    // Exponemos un marcador en videoUrl para que la vista detecte que hay video;
    // el reproductor resuelve la fuente real mediante /api/videos/... (provider "bunny").
    if (!speaker.videoUrl && (speaker as any).bunnyVideoId) {
      (speaker as any).videoUrl = "bunny:" + (process.env.BUNNY_STREAM_LIBRARY_ID || "") + ":" + (speaker as any).bunnyVideoId;
    }

    let hasCertificate = false;
    let acquiredCertificateCode: string | null = null;
    let certificatePending = false;
    let isEnrolled = false;
    let isAlreadyCompleted = false;
    let completedCount = 0;
    let totalSpeakers = 1;
    let progressPct = 0;

    if (res.locals.user?.id) {
      if (res.locals.user.role?.name === "ADMIN") {
        hasCertificate = true;
        isEnrolled = true;
      } else {
        const certificate = await db.certificate.findFirst({
          where: { userId: res.locals.user.id, conversatorioId: conversatorio.id }
        });
        if (certificate) {
          if (certificate.estado === "APROBADO") {
            hasCertificate = true;
            acquiredCertificateCode = certificate.codigo;
          } else if (certificate.estado === "PENDIENTE") {
            certificatePending = true;
          }
        }

        const enrollment = await db.eventEnrollment.findFirst({
          where: { userId: res.locals.user.id, conversatorioId: conversatorio.id }
        });
        isEnrolled = !!enrollment;
      }

      totalSpeakers = conversatorio.speakers.length || 1;

      const userLogs = await db.eventAccessLog.findMany({
        where: { userId: res.locals.user.id, conversatorioId: conversatorio.id },
        select: { speakerId: true }
      });

      const distinctSpeakerIds = new Set(userLogs.map(l => l.speakerId).filter(Boolean));
      completedCount = distinctSpeakerIds.size;
      progressPct = Math.round((completedCount / totalSpeakers) * 100);
      isAlreadyCompleted = userLogs.some(l => l.speakerId === speaker.id);
    }

    let systemConfig = await getSystemConfig();
    if (!systemConfig) {
      systemConfig = await db.systemConfig.create({
        data: {
          id: 1,
          adminPassword: "admin1234",
          systemName: "Profesionales Ecuador"
        }
      });
    }

    let parsedRedes = { facebook: "", instagram: "", twitter: "", linkedin: "" };
    if (speaker.redes) {
      try {
        parsedRedes = { ...parsedRedes, ...JSON.parse(speaker.redes as string) };
      } catch (e) {
        const legacyRedes: unknown = speaker.redes;
        parsedRedes = legacyRedes && typeof legacyRedes === 'object' ? { ...parsedRedes, ...(legacyRedes as any) } : parsedRedes;
      }
    }

    const activeBankAccounts = await getActiveBankAccounts();

    const orderedSpeakersDetail = [...(conversatorio.speakers || [])].sort((a, b) => {
      const dayA = a.dayIndex ?? 0;
      const dayB = b.dayIndex ?? 0;
      if (dayA !== dayB) return dayA - dayB;
      return a.id - b.id;
    });

    const currentIdx = orderedSpeakersDetail.findIndex(s => s.id === speaker.id);
    const nextSpeaker = (currentIdx !== -1 && currentIdx + 1 < orderedSpeakersDetail.length)
      ? orderedSpeakersDetail[currentIdx + 1]
      : null;

    const globalMinutesDetail = systemConfig?.tiempoMinimoPonenciaMinutos ?? 3;
    const requiredMinutes = getEffectiveTiempoMinimoPonencia(conversatorio, globalMinutesDetail);

    const rawResources = Array.isArray(speaker.resources) ? speaker.resources : [];
    const processedResources = await Promise.all(
      rawResources.map(async (resItem: any) => {
        if (resItem && resItem.url) {
          const signedUrl = await getSignedCloudinaryDeliveryUrl(resItem.url);
          return { ...resItem, url: signedUrl };
        }
        return resItem;
      })
    );

    res.render("ponente-detalle", {
      title: `${speaker.nombre} - Ponente`,
      activePage: "educacion",
      conversatorio,
      hasCertificate,
      acquiredCertificateCode,
      certificatePending,
      isEnrolled,
      systemConfig,
      activeBankAccounts,
      isAlreadyCompleted,
      completedCount,
      totalSpeakers,
      progressPct,
      nextSpeaker,
      requiredMinutes,
      speaker: {
        ...speaker,
        redes: parsedRedes,
        resources: processedResources
      }
    });
  } catch (error) {
    console.error("Error loading speaker profile details:", error);
    res.redirect("/eventos?error=internal_error");
  }
});

// GET Route: Ponencia Grabada / Video Player details view
router.get("/conversatorios/:conversatorioParam/ponentes/:speakerParam/ponencia", async (req: Request, res: Response) => {
  const conversatorioParam = req.params.conversatorioParam as string;
  const speakerParam = req.params.speakerParam as string;

  const isConvNum = /^\d+$/.test(conversatorioParam.trim());
  const convIdNum = isConvNum ? parseInt(conversatorioParam, 10) : NaN;

  const isSpkNum = /^\d+$/.test(speakerParam.trim());
  const spkIdNum = isSpkNum ? parseInt(speakerParam, 10) : NaN;

  try {
    const conversatorio = await db.conversatorio.findFirst({
      where: isConvNum ? { id: convIdNum } : { slug: conversatorioParam },
      include: { certificateDesign: true, speakers: { orderBy: [{ dayIndex: "asc" }, { id: "asc" }] } }
    });

    if (!conversatorio) {
      return res.redirect("/eventos?error=event_not_found");
    }

    let speaker = await db.conversatorioSpeaker.findFirst({
      where: isSpkNum
        ? { id: spkIdNum, conversatorioId: conversatorio.id }
        : { conversatorioId: conversatorio.id, slug: speakerParam }
    });

    if (!speaker && !isSpkNum) {
      const allSpeakers = await db.conversatorioSpeaker.findMany({
        where: { conversatorioId: conversatorio.id }
      });
      speaker = allSpeakers.find(s => (s.slug || generateSlug(s.nombre)) === speakerParam) || null;
    }

    if (!speaker || (!speaker.videoUrl && !speaker.bunnyVideoId)) {
      return res.redirect(`/conversatorios/${conversatorio.slug || conversatorio.id}/ponentes/${speaker?.slug || speakerParam}?error=video_not_found`);
    }

    // Bunny Stream videos se almacenan en bunnyVideoId (videoUrl = null).
    // Normalizamos un marcador en videoUrl para que las vistas detecten que hay video;
    // el reproductor resuelve la fuente real mediante /api/videos/... (provider "bunny").
    if (!speaker.videoUrl && speaker.bunnyVideoId) {
      (speaker as any).videoUrl = "bunny:" + (process.env.BUNNY_STREAM_LIBRARY_ID || "") + ":" + speaker.bunnyVideoId;
    }

    if (!speaker.slug) {
      const generatedSlug = generateSlug(speaker.nombre) || `speaker-${speaker.id}`;
      await db.conversatorioSpeaker.update({
        where: { id: speaker.id },
        data: { slug: generatedSlug }
      });
      speaker.slug = generatedSlug;
    }

    if ((isConvNum || isSpkNum) && conversatorio.slug && speaker.slug) {
      return res.redirect(301, `/conversatorios/${conversatorio.slug}/ponentes/${speaker.slug}/ponencia`);
    }

    let hasCertificate = false;
    let acquiredCertificateCode: string | null = null;
    let isEnrolled = false;
    if (res.locals.user) {
      if (res.locals.user.role?.name === "ADMIN") {
        hasCertificate = true;
      } else {
        const certificate = await db.certificate.findFirst({
          where: {
            userId: res.locals.user.id,
            conversatorioId: conversatorio.id,
            estado: "APROBADO"
          }
        });
        if (certificate) {
          hasCertificate = true;
          acquiredCertificateCode = certificate.codigo;
        }

        const enrollment = await db.eventEnrollment.findFirst({
          where: {
            userId: res.locals.user.id,
            conversatorioId: conversatorio.id,
          }
        });
        isEnrolled = !!enrollment;
      }
    }

    const isAccessGranted = conversatorio.gratuito || speaker.gratuita || hasCertificate || isEnrolled;

    if (!isAccessGranted && (conversatorio.estado === "ACTIVO" || conversatorio.estado === "FINALIZADO")) {
      return res.redirect(`/conversatorios/${conversatorio.slug || conversatorio.id}/ponentes/${speaker.slug || speaker.id}?error=certificate_required`);
    }

    let isAlreadyCompleted = false;
    let completedCount = 0;
    let totalSpeakers = 1;
    let progressPct = 0;

    if (res.locals.user?.id) {
      totalSpeakers = conversatorio.speakers.length || 1;

      const userLogs = await db.eventAccessLog.findMany({
        where: { userId: res.locals.user.id, conversatorioId: conversatorio.id },
        select: { speakerId: true }
      });

      const distinctSpeakerIds = new Set(userLogs.map(l => l.speakerId).filter(Boolean));
      completedCount = distinctSpeakerIds.size;
      progressPct = Math.round((completedCount / totalSpeakers) * 100);
      isAlreadyCompleted = userLogs.some(l => l.speakerId === speaker.id);
    }

    const orderedSpeakersVideo = [...(conversatorio.speakers || [])].sort((a, b) => {
      const dayA = a.dayIndex ?? 0;
      const dayB = b.dayIndex ?? 0;
      if (dayA !== dayB) return dayA - dayB;
      return a.id - b.id;
    });

    const currentIdxVideo = orderedSpeakersVideo.findIndex(s => s.id === speaker.id);
    const nextSpeaker = (currentIdxVideo !== -1 && currentIdxVideo + 1 < orderedSpeakersVideo.length)
      ? orderedSpeakersVideo[currentIdxVideo + 1]
      : null;

    const systemConfig = await getSystemConfig();
    const globalMinutes = systemConfig?.tiempoMinimoPonenciaMinutos ?? 3;
    const requiredMinutes = getEffectiveTiempoMinimoPonencia(conversatorio, globalMinutes);

    res.render("ponencia-video", {
      title: `Ponencia de ${speaker.nombre}`,
      activePage: "educacion",
      conversatorio,
      speaker,
      isAlreadyCompleted,
      completedCount,
      totalSpeakers,
      progressPct,
      nextSpeaker,
      hasCertificate,
      acquiredCertificateCode,
      requiredMinutes
    });
  } catch (error) {
    console.error("Error loading ponencia video:", error);
    res.redirect("/eventos?error=internal_error");
  }
});

// POST API Endpoint: Mark Conversatorio Speaker as Completed
router.post("/api/events/conversatorio/complete-speaker", async (req: Request, res: Response) => {
  try {
    const user = res.locals.user;
    if (!user?.id) {
      return res.status(401).json({ success: false, error: "Debes iniciar sesión para completar la ponencia." });
    }

    const userId = user.id;
    const { conversatorioId, speakerId, durationWatchedSeconds } = req.body;

    if (!conversatorioId || !speakerId) {
      return res.status(400).json({ success: false, error: "Datos de conversatorio o ponente incompletos." });
    }

    const convId = Number(conversatorioId);
    const spkId = Number(speakerId);

    const conv = await db.conversatorio.findUnique({
      where: { id: convId },
      include: { speakers: true }
    });

    if (!conv) {
      return res.status(404).json({ success: false, error: "Conversatorio no encontrado." });
    }

    if (conv.estado === "PROGRAMADO") {
      return res.status(403).json({
        success: false,
        error: "El evento está en estado PROGRAMADO. No se pueden completar ponencias hasta que esté ACTIVO."
      });
    }

    // Check user access
    const enrollment = await db.eventEnrollment.findFirst({
      where: { userId, conversatorioId: convId }
    });
    const certPassBefore = await db.certificate.findFirst({
      where: { userId, conversatorioId: convId }
    });

    if (!enrollment && !certPassBefore && user.role?.name !== "ADMIN" && !conv.gratuito) {
      return res.status(403).json({ success: false, error: "Debes estar inscrito en este conversatorio para completar la ponencia." });
    }

    // Anti-cheat stay requirement (configurable in systemConfig or per conversatorio)
    const systemConfig = await getSystemConfig();
    const globalMinutes = systemConfig?.tiempoMinimoPonenciaMinutos ?? 3;
    const requiredMinutes = getEffectiveTiempoMinimoPonencia(conv, globalMinutes);
    const requiredSeconds = requiredMinutes * 60;

    if (requiredSeconds > 0 && !conv.certificadoInmediato) {
      const watchedSecs = Number(durationWatchedSeconds || 0);
      if (watchedSecs < Math.max(0, requiredSeconds - 5)) {
        return res.status(400).json({
          success: false,
          error: `Debes permanecer en la ponencia al menos ${requiredMinutes} minuto(s) para marcarla como completada.`
        });
      }
    }

    // Create completion log in eventAccessLog
    const existingLog = await db.eventAccessLog.findFirst({
      where: { userId, conversatorioId: convId, speakerId: spkId }
    });

    if (!existingLog) {
      await db.eventAccessLog.create({
        data: {
          userId,
          conversatorioId: convId,
          speakerId: spkId
        }
      });
    }

    // Recalculate progress
    const totalSpeakers = conv.speakers.length || 1;
    const userLogs = await db.eventAccessLog.findMany({
      where: { userId, conversatorioId: convId },
      select: { speakerId: true }
    });
    const distinctSpeakerIds = new Set(userLogs.map(l => l.speakerId).filter(Boolean));
    const completedCount = distinctSpeakerIds.size;
    const progressPct = Math.round((completedCount / totalSpeakers) * 100);

    // Evaluate certificate eligibility
    const io = req.app.get("io");
    const certResult = await CertificateEligibilityService.checkAndGrantConversatorioCertificate(
      userId,
      convId,
      io
    );

    return res.json({
      success: true,
      completedCount,
      totalSpeakers,
      progressPct,
      minRequiredPct: conv.porcentajeMinimoCertificado,
      certificateGranted: !!certResult,
      certCode: certResult?.codigo || null,
      isNewGrant: !certPassBefore && !!certResult
    });
  } catch (error) {
    console.error("Error completing conversatorio speaker:", error);
    return res.status(500).json({ success: false, error: "No se pudo registrar el avance de la ponencia." });
  }
});

// POST Claim Certificate for Conversatorio
router.post("/api/events/conversatorio/claim-certificate", async (req: Request, res: Response) => {
  try {
    const user = res.locals.user;
    if (!user?.id) {
      return res.status(401).json({ success: false, error: "Debes iniciar sesión para reclamar tu certificado." });
    }

    const { conversatorioId } = req.body;
    const convId = Number(conversatorioId);
    if (!convId || isNaN(convId)) {
      return res.status(400).json({ success: false, error: "ID de conversatorio no válido." });
    }

    const dbUser = await db.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      return res.status(404).json({ success: false, error: "Usuario no encontrado." });
    }

    const certUserName = getValidCertificateUserName(dbUser);
    if (!certUserName) {
      return res.status(400).json({
        success: false,
        error: "Debes configurar tu nombre real en tu perfil antes de emitir el certificado.",
        requiresNameConfig: true
      });
    }

    const conv = await db.conversatorio.findUnique({
      where: { id: convId },
      include: { speakers: true }
    });

    if (!conv) {
      return res.status(404).json({ success: false, error: "Conversatorio no encontrado." });
    }

    if (conv.estado === "PROGRAMADO") {
      return res.status(403).json({
        success: false,
        error: "El evento está en estado PROGRAMADO. No se pueden emitir certificados hasta que esté ACTIVO."
      });
    }

    const io = req.app.get("io");
    const cert = await CertificateEligibilityService.checkAndGrantConversatorioCertificate(
      user.id,
      convId,
      io
    );

    if (cert) {
      return res.json({
        success: true,
        message: "Certificado generado exitosamente.",
        codigo: cert.codigo,
        certificateUrl: `/certificado/${cert.codigo}`
      });
    } else {
      return res.status(400).json({
        success: false,
        error: "Aún no cumples con los requisitos de certificación para este conversatorio."
      });
    }
  } catch (error) {
    console.error("Error claiming certificate:", error);
    return res.status(500).json({ success: false, error: "No se pudo procesar el reclamo de certificado." });
  }
});

// POST Appointment Reservation Route
router.post("/citas/agendar", async (req: Request, res: Response) => {
  const { profileId } = req.body;
  const user = (req as any).user;

  try {
    const parsedProfileId = parseInt(profileId as string);
    if (isNaN(parsedProfileId)) {
      return res.redirect(`/directorio?error=internal_error`);
    }

    // Fetch profile (for slug in redirects) and its schedules for slot validation
    const profile = await db.professionalProfile.findUnique({
      where: { id: parsedProfileId },
      select: {
        id: true,
        slug: true,
        user: { select: { email: true, name: true } },
        schedules: { select: { dia: true, horaInicio: true, horaFin: true } }
      }
    });

    if (!profile) {
      return res.redirect(`/directorio?error=profile_not_found`);
    }

    const validation = validateAppointmentInput(req.body, profile.schedules);
    const redirectPath = profile.slug ? `/directorio/${profile.slug}` : "/directorio";
    if (!validation.ok) {
      return res.redirect(`${redirectPath}?error=${validation.error}`);
    }

    const { nombre, correo, telefono, motivo, fecha, hora } = validation.data;

    // Create the appointment
    const appointment = await db.appointment.create({
      data: {
        profileId: parsedProfileId,
        userId: user ? user.id : null,
        nombre,
        correo,
        telefono,
        fecha,
        hora,
        motivo: motivo ?? null,
        estado: "PENDIENTE"
      },
      include: {
        profile: {
          include: {
            user: true
          }
        }
      }
    });

    // Notify Client
    emailService.sendAppointmentRequested(correo, {
      recipientName: nombre,
      customerName: nombre,
      professionalName: appointment.profile.user.name,
      motivo: motivo || "Consulta General",
      date: fecha,
      time: hora,
      appointmentId: appointment.id
    }).catch(err => console.warn("Could not send client booking email:", err));

    // Notify Professional
    emailService.sendAppointmentRequested(appointment.profile.user.email, {
      recipientName: appointment.profile.user.name,
      customerName: nombre,
      professionalName: appointment.profile.user.name,
      motivo: motivo || "Consulta General",
      date: fecha,
      time: hora,
      appointmentId: appointment.id
    }).catch(err => console.warn("Could not send professional booking email:", err));

    res.redirect(`${redirectPath}?success=booked`);
  } catch (error) {
    console.error("Error creating appointment booking:", error);
    res.redirect(`/directorio?error=booking_failed`);
  }
});

// Cursos Route
router.get("/cursos", async (req: Request, res: Response) => {
  try {
    const { search, professionId, categoryId, branchId, docenteId, precio, sort } = req.query;
    const sortMode = typeof sort === "string" && sort.trim() ? sort.trim() : "destacados";

    // 0. Fetch existing cursos to filter dropdown options dynamically
    const existingCursos = await db.curso.findMany({
      select: {
        id: true,
        professionId: true,
        areaProfesional: true,
        categoryId: true,
        branchId: true,
        docenteId: true
      }
    });

    const activeProfIds = new Set<number>();
    const activeProfNames = new Set<string>();
    const activeCategoryIds = new Set<number>();
    const activeBranchIds = new Set<number>();
    const activeDocenteIds = new Set<number>();

    existingCursos.forEach(c => {
      if (c.professionId) activeProfIds.add(c.professionId);
      if (c.areaProfesional) activeProfNames.add(c.areaProfesional.toLowerCase().trim());
      if (c.categoryId) activeCategoryIds.add(c.categoryId);
      if (c.branchId) activeBranchIds.add(c.branchId);
      if (c.docenteId) activeDocenteIds.add(c.docenteId);
    });

    const rawProfessions = await db.profession.findMany({
      include: {
        specialties: { orderBy: { orden: "asc" } },
        cursoCategories: {
          include: { branches: { orderBy: { orden: "asc" } } },
          orderBy: { orden: "asc" }
        }
      },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }]
    });

    // Only keep professions that have registered courses
    const professions = existingCursos.length === 0 ? rawProfessions : rawProfessions.filter(p => {
      return activeProfIds.has(p.id) || activeProfNames.has(p.nombre.toLowerCase().trim());
    });

    const rawCategories = await db.cursoCategory.findMany({
      include: {
        profession: { select: { id: true, nombre: true } },
        branches: { orderBy: { orden: "asc" } }
      },
      where: { activo: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }]
    });

    // Only keep categories linked to courses or belonging to active professions with courses
    const professionsWithCoursesIds = new Set(professions.map(p => p.id));
    const categories = existingCursos.length === 0 ? rawCategories : rawCategories.filter(c => {
      if (activeCategoryIds.size > 0) {
        return activeCategoryIds.has(c.id);
      }
      return c.professionId ? professionsWithCoursesIds.has(c.professionId) : true;
    });

    const rawBranches = await db.cursoBranch.findMany({
      where: { activo: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }]
    });

    const activeCategoryIdsInUse = new Set(categories.map(c => c.id));
    const branches = existingCursos.length === 0 ? rawBranches : rawBranches.filter(b => {
      if (activeBranchIds.size > 0) {
        return activeBranchIds.has(b.id);
      }
      return activeCategoryIdsInUse.has(b.categoryId);
    });

    const rawDocentes = await db.professionalProfile.findMany({
      where: { isDocenteActive: true },
      include: {
        user: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    // Only keep docentes who have courses assigned
    const docentes = existingCursos.length === 0 ? rawDocentes : rawDocentes.filter(d => {
      return activeDocenteIds.has(d.id);
    });

    const andConditions: any[] = [];

    // 1. Text Search Filter (Keywords, Title, Slogan, Description, Category, Branch)
    const searchStr = typeof search === "string" ? search.trim() : "";
    if (searchStr) {
      andConditions.push({
        OR: [
          { titulo: { contains: searchStr, mode: "insensitive" } },
          { slogan: { contains: searchStr, mode: "insensitive" } },
          { descripcion: { contains: searchStr, mode: "insensitive" } },
          { keywords: { contains: searchStr, mode: "insensitive" } },
          { areaProfesional: { contains: searchStr, mode: "insensitive" } },
          { category: { nombre: { contains: searchStr, mode: "insensitive" } } },
          { branch: { nombre: { contains: searchStr, mode: "insensitive" } } }
        ]
      });
    }

    // 2. Profession Filter
    const parsedProfId = professionId ? parseInt(String(professionId), 10) : null;
    if (parsedProfId) {
      const selectedProf = professions.find(p => p.id === parsedProfId);
      const profOr: any[] = [{ professionId: parsedProfId }];
      if (selectedProf) {
        profOr.push({ areaProfesional: { contains: selectedProf.nombre, mode: "insensitive" } });
      }
      andConditions.push({ OR: profOr });
    }

    // 3. Category Filter
    const parsedCatId = categoryId ? parseInt(String(categoryId), 10) : null;
    if (parsedCatId) {
      andConditions.push({ categoryId: parsedCatId });
    }

    // 4. Branch Filter
    const parsedBranchId = branchId ? parseInt(String(branchId), 10) : null;
    if (parsedBranchId) {
      andConditions.push({ branchId: parsedBranchId });
    }

    // 5. Docente Filter
    const parsedDocenteId = docenteId ? parseInt(String(docenteId), 10) : null;
    if (parsedDocenteId) {
      andConditions.push({ docenteId: parsedDocenteId });
    }

    // 6. Price Filter (Gratis o Pagado)
    const precioStr = typeof precio === "string" ? precio.trim() : "";
    if (precioStr === "free") {
      andConditions.push({
        OR: [{ gratuito: true }, { precio: 0 }]
      });
    } else if (precioStr === "paid") {
      andConditions.push({
        gratuito: false,
        precio: { gt: 0 }
      });
    }

    const whereCondition = andConditions.length > 0 ? { AND: andConditions } : {};

    // Determine sorting
    let orderByCondition: any;
    if (sortMode === "nombre_asc") {
      orderByCondition = [{ destacado: "desc" }, { titulo: "asc" }];
    } else if (sortMode === "recientes") {
      orderByCondition = [{ destacado: "desc" }, { createdAt: "desc" }];
    } else {
      orderByCondition = [{ destacado: "desc" }, { createdAt: "desc" }];
    }

    const allCursos = await db.curso.findMany({
      where: whereCondition,
      include: {
        profession: { select: { id: true, nombre: true } },
        category: { select: { id: true, nombre: true } },
        branch: { select: { id: true, nombre: true } },
        docente: { select: { id: true, user: { select: { name: true } } } },
        speakers: true,
        discounts: true,
        modules: {
          include: {
            lessons: {
              include: { resources: true }
            }
          }
        }
      },
      orderBy: orderByCondition
    });

    const now = new Date();
    const processedCursos = allCursos.map((cur: any) => {
      let activePrice = cur.precio ?? 0;
      let hasActiveDiscount = false;
      let discountPercent = 0;

      if (!cur.gratuito && cur.discounts && cur.discounts.length > 0) {
        const validDiscount = cur.discounts.find((d: any) => {
          const start = new Date(d.fechaInicio);
          const end = new Date(d.fechaFin);
          return now >= start && now <= end;
        });
        if (validDiscount) {
          activePrice = cur.precio * (1 - validDiscount.porcentaje / 100);
          hasActiveDiscount = true;
          discountPercent = validDiscount.porcentaje;
        }
      }

      return {
        ...cur,
        activePrice,
        hasActiveDiscount,
        discountPercent
      };
    });

    const cursos = processedCursos;

    res.render("cursos", {
      title: "Cursos de Educación Continua - Profesionales Ecuador",
      activePage: "cursos",
      professions,
      categories,
      branches,
      docentes,
      cursos,
      upcomingCursos: cursos,
      pastCursos: [],
      query: {
        search: searchStr,
        professionId: parsedProfId ? String(parsedProfId) : "",
        categoryId: parsedCatId ? String(parsedCatId) : "",
        branchId: parsedBranchId ? String(parsedBranchId) : "",
        docenteId: parsedDocenteId ? String(parsedDocenteId) : "",
        precio: precioStr,
        sort: sortMode
      }
    });
  } catch (error) {
    console.error("Error loading courses page:", error);
    res.render("cursos", {
      title: "Cursos de Educación Continua - Profesionales Ecuador",
      activePage: "cursos",
      professions: [],
      categories: [],
      branches: [],
      docentes: [],
      cursos: [],
      upcomingCursos: [],
      pastCursos: [],
      query: {}
    });
  }
});



// Education / Events Route (Conversatorios)
router.get("/eventos", async (req: Request, res: Response) => {
  try {
    const conversatorios = await db.conversatorio.findMany({
      where: {
        estado: { in: Object.values(CONVERSATORIO_ESTADO) }
      },
      include: { speakers: true, itinerary: true },
      orderBy: { fechaInicio: "asc" }
    });

    const conversatoriosByEstado = Object.values(CONVERSATORIO_ESTADO).reduce<Record<ConversatorioEstado, typeof conversatorios>>(
      (acc, estado) => {
        acc[estado] = conversatorios.filter((conv) => conv.estado === estado);
        return acc;
      },
      {
        [CONVERSATORIO_ESTADO.PROGRAMADO]: [],
        [CONVERSATORIO_ESTADO.ACTIVO]: [],
        [CONVERSATORIO_ESTADO.FINALIZADO]: []
      }
    );

    res.render("eventos", {
      title: "Conversatorios y Conferencias",
      activePage: "educacion",
      programadosConversatorios: conversatoriosByEstado.PROGRAMADO,
      activosConversatorios: conversatoriosByEstado.ACTIVO,
      finalizadosConversatorios: conversatoriosByEstado.FINALIZADO
    });
  } catch (error) {
    console.error("Error loading events page:", error);
    res.render("eventos", {
      title: "Conversatorios y Conferencias",
      activePage: "educacion",
      programadosConversatorios: [],
      activosConversatorios: [],
      finalizadosConversatorios: []
    });
  }
});

// Contact Page Route
router.get("/contacto", async (req: Request, res: Response) => {
  try {
    const page = await getEditablePageBySlug("contacto");

    let contactoData = {
      email: "info@profesionales.ec",
      telefono: "+593 998 925 381",
      ubicacion: "Quito, Ecuador",
      razones: [
        "Soporte técnico especializado",
        "Consultas sobre preinscripción",
        "Alianzas y convenios"
      ]
    };

    if (page && page.contenido) {
      try {
        const parsed = JSON.parse(page.contenido);
        contactoData = { ...contactoData, ...parsed };
      } catch (e) {
        console.error("Error parsing CMS contact data:", e);
      }
    }

    res.render("contacto", {
      title: "Contáctanos",
      activePage: "contacto",
      contactoData
    });
  } catch (error) {
    console.error("Error loading contact page:", error);
    res.redirect("/?error=db_error");
  }
});

// POST Contact message submission
router.post("/contacto/mensaje", async (req: Request, res: Response) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, error: "Todos los campos son obligatorios." });
  }

  try {
    await db.contactMessage.create({
      data: {
        nombre: name,
        email: email,
        asunto: subject,
        mensaje: message
      }
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error creating contact message:", error);
    res.status(500).json({ success: false, error: "Error interno del servidor." });
  }
});

// Alias for /nosotros and /acerca-de
router.get(["/nosotros", "/acerca-de"], (req: Request, res: Response) => {
  res.redirect("/p/nosotros");
});

// Dynamic CMS Page Route
router.get("/p/:slug", async (req: Request, res: Response) => {
  const slug = req.params.slug as string;
  try {
    const page = await getEditablePageBySlug(slug);

    if (!page) {
      return res.status(404).render("index", {
        title: "Página no encontrada",
        activePage: "inicio",
        featuredProfessionals: []
      });
    }

    if (slug === "nosotros") {
      let nosotrosData = {
        subtitle: "Somos una plataforma creada para conectar conocimiento, experiencia y oportunidades. Impulsamos la formación continua, la colaboración profesional y el crecimiento de expertos en distintas áreas.",
        mision: "Impulsar el desarrollo profesional en Ecuador y en la región, proporcionando una plataforma de difusión, capacitación y networking basada en altos estándares de calidad, ética y excelencia académica.",
        vision: "Convertirnos en la principal red de profesionales en Ecuador, reconocida por su contribución activa al crecimiento educativo, social y empresarial del país.",
        quienesSomos: "En Profesionales Ecuador creemos en el poder de la excelencia, la educación continua y la colaboración entre expertos.\n\nSomos una plataforma diseñada para conectar a profesionales de diversas áreas con personas, empresas e instituciones que valoran el conocimiento especializado y la formación de calidad.\n\nNuestro propósito es crear un espacio confiable donde el crecimiento profesional y la capacitación sean accesibles para todos.",
        historia: "Profesionales Ecuador nace de la visión compartida del Ing. Terry Mendieta y el Ing. Juan Estrada, quienes identificaron la necesidad de un espacio serio y organizados para conectar a expertos de diferentes áreas.\n\nContamos además con el valioso apoyo del Dr. Luis Gutiérrez en nuestro primer conversatorio, marcando el inicio de esta gran comunidad.\n\nDesde entonces, hemos crecido consolidándonos como un referente en conversatorios, formación continua y eventos de alta calidad.",
        fundadores: [
          { nombre: "Terry Mendieta", cargo: "CEO / Fundador", iniciales: "TM" },
          { nombre: "Juan Estrada", cargo: "CEO / Fundador", iniciales: "JE" }
        ],
        valores: [
          { titulo: "Excelencia", descripcion: "Promovemos siempre lo mejor de cada profesional.", icon: "fa-solid fa-award" },
          { titulo: "Innovación", descripcion: "Apostamos por la mejora continua y el uso de nuevas tecnologías.", icon: "fa-solid fa-lightbulb" },
          { titulo: "Ética", descripcion: "Actuamos con transparencia, respeto y responsabilidad.", icon: "fa-solid fa-shield-halved" },
          { titulo: "Compromiso Social", descripcion: "Buscamos impactar positivamente en nuestra sociedad.", icon: "fa-solid fa-heart" }
        ],
        porQueConfiar: [
          "Somos un espacio de crecimiento y formación continua.",
          "Contamos con una red de expertos evaluados y certificados.",
          "Trabajamos bajo principios éticos y legales que protegen a todos nuestros usuarios.",
          "Nos comprometemos con tu desarrollo personal y profesional."
        ],
        compromiso: [
          "Evaluamos cuidadosamente el perfil de cada profesional antes de su incorporación a la plataforma.",
          "Organizamos conversatorios y eventos con los más altos estándares de calidad.",
          "Fomentamos la actualización constante y la difusión de conocimientos a través de contenidos confiables y pertinentes.",
          "Protegemos y promovemos la imagen de nuestros profesionales, siempre respetando acuerdos claros y transparentes."
        ],
        eventosPolitica: "En cada evento, conversatorio o actividad organizada por Profesionales Ecuador, los participantes autorizan la grabación de audio y video, así como la captura de fotografías.\n\nEstas grabaciones podrán ser utilizadas posteriormente con fines promocionales, educativos o comerciales, sin limitaciones territoriales ni temporales.\n\nImportante: El profesional autoriza de manera gratuita el uso comercial de su imagen, salvo que se llegue a un acuerdo diferente por escrito en algún caso extraordinario. Todos los contenidos generados en nuestros conversatorios son propiedad de Profesionales Ecuador, salvo pacto en contrario formalizado por escrito."
      };

      if (page.contenido) {
        try {
          const parsed = JSON.parse(page.contenido);
          nosotrosData = { ...nosotrosData, ...parsed };
        } catch (e) {
          console.error("Error parsing CMS nosotros data:", e);
        }
      }

      return res.render("nosotros", {
        title: page.titulo,
        activePage: "nosotros",
        nosotrosData,
        page
      });
    }

    res.render("pagina-cms", {
      title: page.titulo,
      activePage: "",
      page
    });
  } catch (error) {
    console.error("Error loading CMS page:", error);
    res.redirect("/?error=db_error");
  }
});

// GET Pre-registration / Plans Selection Route
router.get("/preinscripcion", async (req: Request, res: Response) => {
  try {
    let plans = await getMembershipPlans();

    // Auto-seed default plans if table is empty
    if (plans.length === 0) {
      await db.membershipPlan.createMany({
        data: [
          {
            nombre: "Preinscripción GRATIS",
            precio: 0.0,
            descripcion: "Sin costo inicial",
            caracteristicas: "Perfil profesional completo\nApareces en búsquedas\nSubir fotos y documentos\nProceso de verificación estándar (3-5 días)",
            popular: false
          },
          {
            nombre: "Evita la Lista de Espera",
            precio: 10.0,
            descripcion: "Pago sujeto a validación y revisión manual",
            caracteristicas: "Todo lo del plan gratuito\nVerificación prioritaria (24-48 horas)\nInsignia de verificado destacada\nMejor posicionamiento en búsquedas",
            popular: true
          }
        ]
      });

      plans = await getMembershipPlans();
    }

    res.render("preinscripcion", {
      title: "Preinscripción Profesional",
      activePage: "registro",
      plans
    });
  } catch (error) {
    console.error("Error loading pre-registration page:", error);
    res.redirect("/login?error=db_error");
  }
});

// GET Professional Stepper Register Route
router.get("/registro-profesional", async (req: Request, res: Response) => {
  const user = (req as any).user || res.locals.user;
  try {
    const professions = await getAllProfessions();

    const planId = req.query.planId ? parseInt(req.query.planId as string) : 1;
    let selectedPlan = null;
    if (planId) {
      selectedPlan = await getMembershipPlanById(planId);
    }
    let systemConfig = await getSystemConfig();
    if (!systemConfig) {
      systemConfig = await db.systemConfig.create({
        data: {
          id: 1,
          adminPassword: "admin1234",
          systemName: "Profesionales Ecuador"
        }
      });
    }

    const activeBankAccounts = await getActiveBankAccounts();

    // Pre-fill form data for logged in user completing or updating their professional setup
    const formData: Record<string, any> = {};
    if (user) {
      // Auto-sync student profile data if migrating/transitioning
      await StudentService.syncStudentToProfessionalProfile(user.id);

      formData.name = user.name || "";
      formData.email = user.email || "";
      formData.telefono = user.telefono || "";
      formData.ciudad = user.ciudad || "";
      formData.provincia = user.provincia || "";
      formData.cedula = user.cedula || "";

      const studentProfile = await db.studentProfile.findUnique({
        where: { userId: user.id }
      });

      const existingProfile = await db.professionalProfile.findUnique({
        where: { userId: user.id },
        include: { specialties: true }
      });

      if (existingProfile) {
        formData.bio = existingProfile.bio || studentProfile?.bio || "";
        formData.slogan = existingProfile.slogan || (studentProfile?.carrera ? `Profesional en ${studentProfile.carrera}` : "");
        formData.photo = existingProfile.photo || studentProfile?.foto || "";
        formData.banner = existingProfile.banner || studentProfile?.banner || "";
        formData.provincia = existingProfile.provincia || studentProfile?.provincia || user.provincia || "";
        formData.ciudad = existingProfile.ciudad || studentProfile?.ciudad || user.ciudad || "";
        formData.telefono = existingProfile.telefono || studentProfile?.telefono || user.telefono || "";
        formData.tarifa = existingProfile.tarifa || 0;
        formData.callePrincipal = existingProfile.callePrincipal || existingProfile.direccion || "";
        formData.referencia = existingProfile.referencia || "";
        formData.facebook = existingProfile.facebook || studentProfile?.facebookUrl || "";
        formData.instagram = existingProfile.instagram || studentProfile?.instagramUrl || "";
        formData.linkedin = existingProfile.linkedin || studentProfile?.linkedinUrl || "";
        formData.xTwitter = existingProfile.xTwitter || studentProfile?.twitterUrl || "";
        formData.tiktok = existingProfile.tiktok || studentProfile?.tiktokUrl || "";
        formData.website = existingProfile.website || studentProfile?.websiteUrl || "";
        formData.youtube = existingProfile.youtube || "";
        formData.specialtyIds = existingProfile.specialties.map(s => s.specialtyId);
      } else if (studentProfile) {
        formData.bio = studentProfile.bio || "";
        formData.slogan = studentProfile.carrera ? `Profesional en ${studentProfile.carrera}` : "";
        formData.photo = studentProfile.foto || "";
        formData.banner = studentProfile.banner || "";
        formData.provincia = studentProfile.provincia || user.provincia || "";
        formData.ciudad = studentProfile.ciudad || user.ciudad || "";
        formData.telefono = studentProfile.telefono || user.telefono || "";
        formData.facebook = studentProfile.facebookUrl || "";
        formData.instagram = studentProfile.instagramUrl || "";
        formData.linkedin = studentProfile.linkedinUrl || "";
        formData.xTwitter = studentProfile.twitterUrl || "";
        formData.tiktok = studentProfile.tiktokUrl || "";
        formData.website = studentProfile.websiteUrl || "";
      }
    }

    res.render("registro-profesional", {
      title: "Registro Profesional",
      activePage: "registro",
      professions,
      selectedPlan,
      bankAccounts: systemConfig.bankAccounts,
      activeBankAccounts,
      formData,
      user
    });
  } catch (error) {
    console.error("Error loading register page:", error);
    res.redirect("/login?error=internal_error");
  }
});

// Helper: re-render registration form with error and pre-filled data
async function renderRegFormWithError(
  res: Response,
  statusCode: number,
  errorMessage: string,
  body: any
) {
  try {
    const professions = await getAllProfessions();

    const planId = body.planId ? parseInt(body.planId as string) : null;
    let selectedPlan = null;
    if (planId) {
      selectedPlan = await getMembershipPlanById(planId);
    }
    let systemConfig = await getSystemConfig();
    if (!systemConfig) {
      systemConfig = await db.systemConfig.create({
        data: {
          id: 1,
          adminPassword: "admin1234",
          systemName: "Profesionales Ecuador"
        }
      });
    }

    let step = parseInt(body.activeStep) || 1;
    const lowerErr = (errorMessage || "").toLowerCase();
    if (lowerErr.includes("correo") || lowerErr.includes("cédula") || lowerErr.includes("nombre") || lowerErr.includes("teléfono") || lowerErr.includes("contraseña")) {
      step = 1;
    } else if (lowerErr.includes("especialidad") || lowerErr.includes("profesión") || lowerErr.includes("provincia") || lowerErr.includes("ciudad") || lowerErr.includes("tarifa") || lowerErr.includes("coordenadas")) {
      step = 2;
    } else if (lowerErr.includes("slogan") || lowerErr.includes("descripción") || lowerErr.includes("foto") || lowerErr.includes("verificación") || lowerErr.includes("bio")) {
      step = 3;
    } else if (lowerErr.includes("facebook") || lowerErr.includes("instagram") || lowerErr.includes("linkedin") || lowerErr.includes("twitter") || lowerErr.includes("tiktok") || lowerErr.includes("youtube")) {
      step = 4;
    } else if (lowerErr.includes("pago") || lowerErr.includes("comprobante") || lowerErr.includes("banco") || lowerErr.includes("transferencia")) {
      step = 6;
    }

    const formData: Record<string, any> = {};
    const safeFields = [
      "name", "email", "cedula", "telefono", "provincia", "ciudad",
      "callePrincipal", "referencia", "tarifa", "slogan", "bio",
      "facebook", "instagram", "xTwitter", "linkedin", "tiktok", "youtube",
      "latitud", "longitud", "initialServices", "planId", "specialtyIds",
      "professionId", "paymentMethod", "paymentReference", "paymentBank", "paymentBankAccountId", "paymentReceipt"
    ];
    for (const field of safeFields) {
      if (body[field] !== undefined) {
        formData[field] = body[field];
      }
    }

    const activeBankAccounts = await getActiveBankAccounts();

    return res.status(statusCode).render("registro-profesional", {
      title: "Registro Profesional",
      activePage: "registro",
      professions,
      selectedPlan,
      bankAccounts: systemConfig.bankAccounts,
      activeBankAccounts,
      error: errorMessage,
      formData,
      activeStep: step
    });
  } catch (dbError) {
    console.error("Error re-rendering registration form:", dbError);
    return res.status(statusCode).json({ success: false, error: errorMessage });
  }
}

// POST Professional Stepper Register Route
router.post("/registro-profesional", async (req: Request, res: Response) => {
  const {
    name,
    email,
    password,
    cedula,
    telefono,
    provincia,
    ciudad,
    callePrincipal,
    referencia,
    tarifa,
    slogan,
    bio,
    photo,
    cedulaFrontal,
    cedulaPosterior,
    facebook,
    instagram,
    xTwitter,
    linkedin,
    tiktok,
    youtube,
    specialtyIds,
    initialServices,
    planId,
    paymentMethod,
    paymentReference,
    paymentBank,
    paymentReceipt,
    latitud,
    longitud
  } = req.body;

  // Normalize and validate mandatory specialty selection
  let parsedSpecialtyIds: number[] = [];
  if (Array.isArray(specialtyIds)) {
    parsedSpecialtyIds = specialtyIds.map(id => parseInt(id as string, 10)).filter(id => !isNaN(id));
  } else if (typeof specialtyIds === "string" && specialtyIds.trim() !== "") {
    parsedSpecialtyIds = specialtyIds.split(",").map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
  } else if (typeof specialtyIds === "number") {
    parsedSpecialtyIds = [specialtyIds];
  }

  if (parsedSpecialtyIds.length === 0) {
    return renderRegFormWithError(res, 400, "Es obligatorio seleccionar tu profesión y al menos una especialidad.", req.body);
  }
  if (typeof name === "string" && /\d/.test(name)) {
    return renderRegFormWithError(res, 400, "El nombre no puede contener números.", req.body);
  }
  if (typeof telefono === "string" && !/^\d{10}$/.test(telefono)) {
    return renderRegFormWithError(res, 400, "El teléfono solo puede contener números (exactamente 10 dígitos).", req.body);
  }
  if (typeof email === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return renderRegFormWithError(res, 400, "El correo electrónico debe tener un dominio válido (ejemplo@dominio.com).", req.body);
  }

  // Validate latitud/longitud if provided
  let parsedLat: number | null = null;
  let parsedLng: number | null = null;
  if (latitud !== undefined && latitud !== "" && longitud !== undefined && longitud !== "") {
    const latNum = parseFloat(latitud as string);
    const lngNum = parseFloat(longitud as string);
    if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      return renderRegFormWithError(res, 400, "Coordenadas de ubicación inválidas.", req.body);
    }
    parsedLat = latNum;
    parsedLng = lngNum;
  }

  // Validate social media URL prefixes (optional fields, only check if non-empty)
  if (typeof facebook === "string" && facebook.trim() && !facebook.startsWith("https://www.facebook.com/")) {
    return renderRegFormWithError(res, 400, "El enlace de Facebook debe comenzar con https://www.facebook.com/", req.body);
  }
  if (typeof instagram === "string" && instagram.trim() && !instagram.startsWith("https://www.instagram.com/")) {
    return renderRegFormWithError(res, 400, "El enlace de Instagram debe comenzar con https://www.instagram.com/", req.body);
  }
  const linkedinPrefixes = ["https://www.linkedin.com/in/", "https://www.linkedin.com/company/"];
  if (typeof linkedin === "string" && linkedin.trim() && !linkedinPrefixes.some(p => linkedin.startsWith(p))) {
    return renderRegFormWithError(res, 400, "El enlace de LinkedIn debe comenzar con https://www.linkedin.com/in/ o https://www.linkedin.com/company/", req.body);
  }
  const twitterPrefixes = ["https://x.com/", "https://twitter.com/"];
  if (typeof xTwitter === "string" && xTwitter.trim() && !twitterPrefixes.some(p => xTwitter.startsWith(p))) {
    return renderRegFormWithError(res, 400, "El enlace de X/Twitter debe comenzar con https://x.com/ o https://twitter.com/", req.body);
  }
  if (typeof tiktok === "string" && tiktok.trim() && !tiktok.startsWith("https://www.tiktok.com/@")) {
    return renderRegFormWithError(res, 400, "El enlace de TikTok debe comenzar con https://www.tiktok.com/@", req.body);
  }
  const youtubePrefixes = ["https://www.youtube.com/", "https://youtu.be/"];
  if (typeof youtube === "string" && youtube.trim() && !youtubePrefixes.some(p => youtube.startsWith(p))) {
    return renderRegFormWithError(res, 400, "El enlace de YouTube debe comenzar con https://www.youtube.com/ o https://youtu.be/", req.body);
  }

  // Validate bio length
  if (typeof bio === "string" && bio.length > 500) {
    return renderRegFormWithError(res, 400, "La descripción no puede superar los 500 caracteres", req.body);
  }

  try {
    const loggedInUser = (req as any).user || res.locals.user;

    // 1. Verify email uniqueness
    if (loggedInUser) {
      const existingEmail = await db.user.findFirst({
        where: { email, NOT: { id: loggedInUser.id } }
      });
      if (existingEmail) {
        return renderRegFormWithError(res, 400, `El correo electrónico "${email}" ya pertenece a otra cuenta registrada.`, req.body);
      }
    } else {
      const existingEmail = await db.user.findUnique({ where: { email } });
      if (existingEmail) {
        return renderRegFormWithError(res, 400, `El correo electrónico "${email}" ya está registrado. Si ya tienes cuenta, inicia sesión.`, req.body);
      }
    }

    // 2. Verify Cédula uniqueness
    if (cedula) {
      const existingCedula = await db.professionalProfile.findFirst({
        where: { cedula, NOT: loggedInUser ? { userId: loggedInUser.id } : undefined }
      });
      if (existingCedula) {
        return renderRegFormWithError(res, 400, `Ya existe una cuenta profesional vinculada a la cédula "${cedula}". Verifica que sea correcta.`, req.body);
      }
    }

    const parsedPlanId = planId ? parseInt(planId as string) : null;
    const requiresPremiumPayment = parsedPlanId === 2;
    const isTransferPayment = paymentMethod === "transferencia" || paymentMethod === "transfer";
    const activeBankAccounts = await getActiveBankAccounts();
    let selectedBankAccount: Awaited<ReturnType<typeof findActiveBankAccountById>> = null;

    if (requiresPremiumPayment) {
      if (!["transferencia", "transfer", "payphone"].includes(String(paymentMethod || ""))) {
        return renderRegFormWithError(res, 400, "Seleccione un método de pago válido para el plan premium.", req.body);
      }

      if (isTransferPayment && !paymentReceipt) {
        return renderRegFormWithError(res, 400, "Por favor, suba el comprobante de transferencia.", req.body);
      }

      if (isTransferPayment && activeBankAccounts.length > 0) {
        const bankAccountId = parseSubmittedBankAccountId(req.body);
        if (!bankAccountId) {
          return renderRegFormWithError(res, 400, "Seleccione la cuenta bancaria de destino para la transferencia.", req.body);
        }

        selectedBankAccount = await findActiveBankAccountById(db, bankAccountId);
        if (!selectedBankAccount) {
          return renderRegFormWithError(res, 400, "La cuenta bancaria seleccionada no está disponible.", req.body);
        }
      }
    }

    // 3. Resolve Role
    let dbRole = await getRoleByName("PROFESSIONAL");
    if (!dbRole) {
      dbRole = await db.role.create({
        data: { name: "PROFESSIONAL", description: "Profesional Afiliado" }
      });
    }

    let hashedPassword = loggedInUser?.password || "";
    if (password && password.trim().length > 0) {
      hashedPassword = await hashPassword(password);
    } else if (!loggedInUser) {
      return renderRegFormWithError(res, 400, "La contraseña es obligatoria para usuarios nuevos.", req.body);
    }

    // Upload files to Cloudinary if provided in Base64
    let photoUrl = photo || null;
    let cedulaFrontalUrl = cedulaFrontal || null;
    let cedulaPosteriorUrl = cedulaPosterior || null;

    try {
      if (photo && (photo.startsWith("data:") || photo.length > 200)) {
        photoUrl = await uploadBase64ToCloudinary(photo, "fotos");
      }
      if (cedulaFrontal && (cedulaFrontal.startsWith("data:") || cedulaFrontal.length > 200)) {
        cedulaFrontalUrl = await uploadBase64ToCloudinary(cedulaFrontal, "cedulas");
      }
      if (cedulaPosterior && (cedulaPosterior.startsWith("data:") || cedulaPosterior.length > 200)) {
        cedulaPosteriorUrl = await uploadBase64ToCloudinary(cedulaPosterior, "cedulas");
      }
    } catch (uploadError) {
      console.error("Error al subir documentos a Cloudinary:", uploadError);
      return renderRegFormWithError(res, 500, "Error al cargar documentos de verificación. Intente de nuevo.", req.body);
    }

    // 4. Create or Update User and Profile in a Transaction
    let profileStatus = "PENDIENTE";
    const result = await db.$transaction(async (tx) => {
      let userObj: any;
      if (loggedInUser) {
        userObj = await tx.user.update({
          where: { id: loggedInUser.id },
          data: {
            name: name || loggedInUser.name,
            telefono: telefono || loggedInUser.telefono,
            ciudad: ciudad || loggedInUser.ciudad,
            roleId: dbRole.id,
            requireProfileSetup: false,
            setupRedirectUrl: null,
            ...(password && password.trim().length > 0 ? { password: hashedPassword } : {})
          }
        });
      } else {
        userObj = await tx.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            roleId: dbRole.id,
            status: "ACTIVE"
          }
        });
      }

      let planType = "GRATUITO";
      let status = "PENDIENTE";
      let verified = false;
      let subscriptionEnds = new Date();

      if (parsedPlanId) {
        const plan = await tx.membershipPlan.findUnique({ where: { id: parsedPlanId } });
        if (plan) {
          if (requiresPremiumPayment) {
            planType = "PREMIUM";
            status = "PENDIENTE";
            verified = false;
          } else if (plan.precio > 0) {
            planType = "VERIFICADO";
            status = "APROBADO";
            verified = true;
            subscriptionEnds = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          } else {
            planType = "GRATUITO";
          }
        }
      }

      // Capture status for email
      profileStatus = status;

      const existingProfile = await tx.professionalProfile.findUnique({
        where: { userId: userObj.id }
      });

      const slug = existingProfile?.slug || await getUniqueSlug("professionalProfile", name);

      let profile: any;
      if (existingProfile) {
        profile = await tx.professionalProfile.update({
          where: { id: existingProfile.id },
          data: {
            slug,
            bio: (bio !== undefined && bio !== "") ? bio : existingProfile.bio,
            slogan: (slogan !== undefined && slogan !== "") ? slogan : existingProfile.slogan,
            photo: photoUrl || existingProfile.photo,
            provincia: provincia || existingProfile.provincia,
            ciudad: ciudad || existingProfile.ciudad,
            direccion: callePrincipal || existingProfile.direccion,
            callePrincipal: callePrincipal || existingProfile.callePrincipal,
            referencia: referencia || existingProfile.referencia,
            tarifa: tarifa ? parseFloat(tarifa) : existingProfile.tarifa,
            cedula: cedula || existingProfile.cedula,
            telefono: telefono || existingProfile.telefono,
            cedulaFrontal: cedulaFrontalUrl || existingProfile.cedulaFrontal,
            cedulaPosterior: cedulaPosteriorUrl || existingProfile.cedulaPosterior,
            facebook: facebook || existingProfile.facebook,
            instagram: instagram || existingProfile.instagram,
            xTwitter: xTwitter || existingProfile.xTwitter,
            linkedin: linkedin || existingProfile.linkedin,
            tiktok: tiktok || existingProfile.tiktok,
            youtube: youtube || existingProfile.youtube,
            status: (existingProfile && existingProfile.status === "APROBADO") ? "APROBADO" : status,
            verified: verified,
            planType: planType,
            subscriptionEnds: subscriptionEnds,
            latitud: parsedLat,
            longitud: parsedLng
          }
        });
      } else {
        profile = await tx.professionalProfile.create({
          data: {
            userId: userObj.id,
            slug,
            bio,
            slogan,
            photo: photoUrl,
            provincia,
            ciudad,
            direccion: callePrincipal,
            callePrincipal,
            referencia,
            tarifa: parseFloat(tarifa || 0),
            cedula,
            telefono,
            cedulaFrontal: cedulaFrontalUrl,
            cedulaPosterior: cedulaPosteriorUrl,
            facebook: facebook || null,
            instagram: instagram || null,
            xTwitter: xTwitter || null,
            linkedin: linkedin || null,
            tiktok: tiktok || null,
            youtube: youtube || null,
            status: status,
            verified: verified,
            planType: planType,
            subscriptionEnds: subscriptionEnds,
            latitud: parsedLat,
            longitud: parsedLng
          }
        });
      }

      if (requiresPremiumPayment && isTransferPayment) {
        let comprobanteUrl = paymentReceipt;
        if (typeof paymentReceipt === "string" && paymentReceipt.startsWith("data:")) {
          comprobanteUrl = await uploadBase64ToCloudinary(paymentReceipt, "comprobantes");
        }

        const issuer = await tx.issuer.create({
          data: {
            ruc: cedula || "9999999999001",
            nombres: name,
            apellidos: "",
            nombreEmpresa: "Profesional Independiente",
            razonSocial: String(name).toUpperCase(),
            direccion: callePrincipal || "Ecuador",
            email,
            celular: telefono || "0999999999",
            professionalProfileId: profile.id
          }
        });

        const bankAccountLabel = selectedBankAccount ? formatBankAccountLabel(selectedBankAccount) : null;

        await tx.paymentRequest.create({
          data: {
            ruc: issuer.ruc,
            razonSocial: issuer.razonSocial,
            monto: 10.00,
            tipo: "MEMBERSHIP",
            referencia: paymentReference || "S/R",
            bancoDestino: bankAccountLabel || paymentBank || "Transferencia",
            comprobante: comprobanteUrl,
            estado: "PENDIENTE",
            issuerId: issuer.id,
            bankAccountId: selectedBankAccount?.id ?? null,
            bankAccountSnapshot: selectedBankAccount ? buildBankAccountSnapshot(selectedBankAccount) : undefined,
            bankAccountLabel: bankAccountLabel ?? null
          }
        });
      }

      // Link specialties
      for (const specId of parsedSpecialtyIds) {
        await tx.professionalProfileSpecialty.create({
          data: {
            profileId: profile.id,
            specialtyId: specId
          }
        });
      }

      // Link initial services
      const parsedServices = typeof initialServices === "string" ? JSON.parse(initialServices) : (initialServices || []);
      if (Array.isArray(parsedServices)) {
        for (const service of parsedServices) {
          await tx.professionalService.create({
            data: {
              profileId: profile.id,
              nombre: service.nombre,
              precio: parseFloat(service.precio || 0),
              estado: "ACTIVO"
            }
          });
        }
      }

      return userObj;
    });

    // 5. Auto login user by setting a tracked session JWT.
    const token = await createAuthSession(result, "PROFESSIONAL", req);

    res.cookie("token", token, AUTH_COOKIE_OPTIONS);

    // Send welcome email for professional (fire-and-forget)
    emailService.sendWelcomeRegistration(email, {
      recipientName: name,
      email,
      loginUrl: `${process.env.BASE_URL || "http://localhost:3000"}/login`,
      profileStatus
    }).catch(err => console.warn("Could not send welcome email:", err));

    const preferredResponseType = req.accepts(["html", "json"]);
    if (preferredResponseType === "json") {
      if (requiresPremiumPayment && paymentMethod === "payphone") {
        return res.status(200).json({
          success: true,
          payphone: {
            itemType: "MEMBERSHIP",
            itemId: 2,
            baseAmount: 10.00,
            hasTax: false,
            productName: "Servicio de creación de cuenta premium"
          }
        });
      }

      return res.status(200).json({ success: true, redirect: "/dashboard/profesional" });
    }

    return res.redirect(303, "/dashboard/profesional");
  } catch (error) {
    console.error("Error registering professional:", error);
    return renderRegFormWithError(res, 500, "Ocurrió un error interno al registrar su perfil profesional.", req.body);
  }
});

// Redirect alias for student dashboard
router.get("/dashboard/estudiante", (req: Request, res: Response) => {
  return res.redirect("/student");
});

// Login Page Route
router.get("/login", (req: Request, res: Response) => {
  if (res.locals.user) {
    const role = res.locals.user.role?.name;
    if (role === "ADMIN") return res.redirect("/dashboard/admin");
    if (role === "PROFESSIONAL") return res.redirect("/dashboard/profesional");
    if (role === "STUDENT") return res.redirect("/student");
    if (role === "REFERIDO") return res.redirect("/dashboard/referido");
    return res.redirect("/dashboard/cliente");
  }
  res.render("login", {
    title: "Iniciar Sesión",
    activePage: "login",
    error: req.query.error === "unauthorized" ? "Debe iniciar sesión para acceder." : null,
    success: req.query.success === "registered" ? "Usuario registrado con éxito. Inicie sesión." : null
  });
});

// POST Login Route
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await db.user.findUnique({
      where: { email },
      include: { role: true }
    });

    if (!user) {
      return res.render("login", {
        title: "Iniciar Sesión",
        activePage: "login",
        error: "El correo electrónico no está registrado.",
        success: null
      });
    }

    if (user.status !== "ACTIVE") {
      return res.render("login", {
        title: "Iniciar Sesión",
        activePage: "login",
        error: "Su cuenta no está activa. Contacte al soporte.",
        success: null
      });
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return res.render("login", {
        title: "Iniciar Sesión",
        activePage: "login",
        error: "La contraseña es incorrecta.",
        success: null
      });
    }

    const token = await createAuthSession(user, user.role.name, req);

    res.cookie("token", token, AUTH_COOKIE_OPTIONS);

    if (user.requireProfileSetup) {
      return res.redirect("/profile-setup");
    }

    if (user.role.name === "ADMIN") {
      return res.redirect("/dashboard/admin");
    } else if (user.role.name === "PROFESSIONAL") {
      return res.redirect("/dashboard/profesional");
    } else if (user.role.name === "STUDENT") {
      return res.redirect("/student");
    } else if (user.role.name === "REFERIDO") {
      return res.redirect("/dashboard/referido");
    } else {
      return res.redirect("/dashboard/cliente");
    }
  } catch (error) {
    console.error("Error in login POST:", error);
    res.render("login", {
      title: "Iniciar Sesión",
      activePage: "login",
      error: "Error interno al iniciar sesión.",
      success: null
    });
  }
});

// GET Forgot Password
router.get("/forgot-password", (req: Request, res: Response) => {
  res.render("forgot-password", {
    title: "Recuperar Contraseña",
    activePage: "forgot-password",
    error: null,
    success: null,
  });
});

// POST Forgot Password
router.post("/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || typeof email !== "string") {
    return res.render("forgot-password", {
      title: "Recuperar Contraseña",
      activePage: "forgot-password",
      error: "Por favor, ingresa un correo electrónico válido.",
      success: null,
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  try {
    const user = await db.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      return res.render("forgot-password", {
        title: "Recuperar Contraseña",
        activePage: "forgot-password",
        error: null,
        success: "Si el correo electrónico está registrado en la plataforma, recibirás un enlace de recuperación en tu bandeja de entrada.",
      });
    }

    const token = generatePasswordResetToken(user.id, user.email);
    const host = req.get("host") || "localhost:3000";
    const protocol = req.protocol || "http";
    const resetUrl = `${protocol}://${host}/reset-password/${token}`;

    const sendResult = await emailService.sendPasswordReset(user.email, {
      recipientName: user.name,
      resetToken: token,
      resetUrl,
      expiresInMinutes: 30,
    });

    if (!sendResult.success) {
      console.error("[ForgotPassword] Error enviando email de recuperación:", sendResult.error);
      return res.render("forgot-password", {
        title: "Recuperar Contraseña",
        activePage: "forgot-password",
        error: `No se pudo enviar el correo de recuperación: ${sendResult.error}`,
        success: null,
      });
    }

    return res.render("forgot-password", {
      title: "Recuperar Contraseña",
      activePage: "forgot-password",
      error: null,
      success: "Te hemos enviado un correo electrónico con las instrucciones y el enlace para restablecer tu contraseña. Revisa tu bandeja de entrada o spam.",
    });
  } catch (error) {
    console.error("Error processing forgot password:", error);
    return res.render("forgot-password", {
      title: "Recuperar Contraseña",
      activePage: "forgot-password",
      error: "Error interno al procesar la solicitud.",
      success: null,
    });
  }
});

// GET Reset Password with Token
router.get("/reset-password/:token", async (req: Request, res: Response) => {
  const token = req.params.token as string;
  const payload = verifyPasswordResetToken(token);

  if (!payload) {
    return res.render("forgot-password", {
      title: "Recuperar Contraseña",
      activePage: "forgot-password",
      error: "El enlace de recuperación es inválido o ha expirado. Por favor, solicita uno nuevo.",
      success: null,
    });
  }

  res.render("reset-password", {
    title: "Restablecer Contraseña",
    activePage: "reset-password",
    token,
    userEmail: payload.email,
    error: null,
  });
});

// POST Reset Password with Token
router.post("/reset-password/:token", async (req: Request, res: Response) => {
  const token = req.params.token as string;
  const { password, confirmPassword } = req.body;
  const payload = verifyPasswordResetToken(token);

  if (!payload) {
    return res.render("forgot-password", {
      title: "Recuperar Contraseña",
      activePage: "forgot-password",
      error: "El enlace de recuperación es inválido o ha expirado. Por favor, solicita uno nuevo.",
      success: null,
    });
  }

  if (!password || password.length < 6) {
    return res.render("reset-password", {
      title: "Restablecer Contraseña",
      activePage: "reset-password",
      token,
      userEmail: payload.email,
      error: "La contraseña debe tener al menos 6 caracteres.",
    });
  }

  if (password !== confirmPassword) {
    return res.render("reset-password", {
      title: "Restablecer Contraseña",
      activePage: "reset-password",
      token,
      userEmail: payload.email,
      error: "Las contraseñas no coinciden.",
    });
  }

  try {
    const hashedPassword = await hashPassword(password);
    const updatedUser = await db.user.update({
      where: { id: payload.userId },
      data: { password: hashedPassword }
    });

    emailService.sendPasswordUpdated(updatedUser.email, {
      recipientName: updatedUser.name,
      updateDate: new Date().toLocaleDateString("es-EC")
    }).catch(err => console.warn("Error enviando email de password-updated:", err));

    return res.redirect("/login?success=" + encodeURIComponent("Tu contraseña ha sido restablecida con éxito. Inicia sesión con tu nueva clave."));
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.render("reset-password", {
      title: "Restablecer Contraseña",
      activePage: "reset-password",
      token,
      userEmail: payload.email,
      error: "Error interno al actualizar la contraseña.",
    });
  }
});

// GET profile setup wizard (force first login)
router.get("/profile-setup", async (req: Request, res: Response) => {
  if (!res.locals.user) {
    return res.redirect("/login");
  }
  res.render("profile-setup", {
    title: "Configuración Inicial de Cuenta",
    activePage: "setup",
    user: res.locals.user,
    error: null
  });
});

// POST profile setup wizard
router.post("/profile-setup", async (req: Request, res: Response) => {
  if (!res.locals.user) {
    return res.redirect("/login");
  }

  const { name, telefono, ciudad, nombreCertificado, password, confirmPassword } = req.body;
  const provinciasEcuador = [
    "Azuay", "Bolívar", "Cañar", "Carchi", "Chimborazo", "Cotopaxi",
    "El Oro", "Esmeraldas", "Galápagos", "Guayas", "Imbabura", "Loja",
    "Los Ríos", "Manabí", "Morona Santiago", "Napo", "Orellana", "Pastaza",
    "Pichincha", "Santa Elena", "Santo Domingo de los Tsáchilas", "Sucumbíos",
    "Tungurahua", "Zamora Chinchipe"
  ];

  if (!name || !telefono || !ciudad || !nombreCertificado || !password) {
    return res.render("profile-setup", {
      title: "Configuración Inicial de Cuenta",
      activePage: "setup",
      user: res.locals.user,
      error: "Todos los campos son obligatorios."
    });
  }

  if (!/^\d{10}$/.test(String(telefono))) {
    return res.render("profile-setup", {
      title: "Configuración Inicial de Cuenta",
      activePage: "setup",
      user: res.locals.user,
      error: "El teléfono debe contener exactamente 10 números."
    });
  }

  if (!provinciasEcuador.includes(String(ciudad))) {
    return res.render("profile-setup", {
      title: "Configuración Inicial de Cuenta",
      activePage: "setup",
      user: res.locals.user,
      error: "Selecciona una provincia válida de Ecuador."
    });
  }

  if (password !== confirmPassword) {
    return res.render("profile-setup", {
      title: "Configuración Inicial de Cuenta",
      activePage: "setup",
      user: res.locals.user,
      error: "Las contraseñas no coinciden."
    });
  }

  try {
    const hashedPassword = await hashPassword(password);

    // Update name, password, phone, city, etc.
    const updatedUser = await db.user.update({
      where: { id: res.locals.user.id },
      data: {
        name,
        telefono,
        ciudad,
        nombreCertificado: toTitleCase(nombreCertificado),
        password: hashedPassword,
        requireProfileSetup: false
      }
    });

    // Propagate preferred certificate name to all certificates owned by the user
    await db.certificate.updateMany({
      where: { userId: res.locals.user.id },
      data: { nombreUsuario: toTitleCase(nombreCertificado) }
    });

    let targetRedirect = res.locals.user.setupRedirectUrl || "/dashboard/cliente";
    if (targetRedirect === "/professional") {
      targetRedirect = "/dashboard/profesional";
    }

    // Clear target redirect URL in a separate action
    await db.user.update({
      where: { id: res.locals.user.id },
      data: { setupRedirectUrl: null }
    });

    res.redirect(targetRedirect);
  } catch (error) {
    console.error("Error setting up profile:", error);
    res.render("profile-setup", {
      title: "Configuración Inicial de Cuenta",
      activePage: "setup",
      user: res.locals.user,
      error: "Error interno al guardar los cambios."
    });
  }
});

// POST Manual Enrollment (Admin only)
router.post("/api/admin/enrollments/manual", requireAdmin, async (req: Request, res: Response) => {
  const { email, type, eventType, eventId } = req.body;
  const actualType = (type || eventType || "").toString().trim().toLowerCase();
  const evId = parseInt(eventId as string, 10);

  if (!email || !actualType || isNaN(evId)) {
    return res.status(400).json({ success: false, error: "Faltan parámetros obligatorios: email, tipo de evento o ID de evento." });
  }

  try {
    // 1. Find or create user
    let user = await db.user.findUnique({
      where: { email },
      include: { role: true }
    });

    let tempPassword = "";
    let eventName = "";
    let isNewUser = false;
    let eventStartDate: Date = new Date();

    if (!user) {
      isNewUser = true;
      // Get role CLIENT
      let clientRole = await getRoleByName("CLIENT");
      if (!clientRole) {
        clientRole = await db.role.create({
          data: { name: "CLIENT", description: "Cliente estándar" }
        });
      }

      // Generate random temporary password
      tempPassword = "TEMP-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      const hashedPassword = await hashPassword(tempPassword);

      // Target redirect URL depending on type
      const redirectUrl = actualType === "curso" ? `/cursos/${evId}/aula` : `/conversatorios/${evId}`;

      user = await db.user.create({
        data: {
          email,
          name: "Nuevo Alumno",
          password: hashedPassword,
          roleId: clientRole.id,
          requireProfileSetup: true,
          setupRedirectUrl: redirectUrl
        },
        include: { role: true }
      });
    }

    // 2. Perform enrollment depending on type
    if (actualType === "conversatorio") {
      const conversatorio = await db.conversatorio.findUnique({
        where: { id: evId },
        include: { certificateDesign: true }
      });

      if (!conversatorio) {
        return res.status(404).json({ success: false, error: "Conversatorio no encontrado." });
      }

      eventName = conversatorio.titulo;
      eventStartDate = conversatorio.fechaInicio;

      // Create enrollment
      await db.eventEnrollment.upsert({
        where: {
          userId_conversatorioId: {
            userId: user.id,
            conversatorioId: evId
          }
        },
        update: {},
        create: {
          userId: user.id,
          conversatorioId: evId
        }
      });

      // Auto-create approved certificate (Only if certificadoInmediato is explicitly enabled)
      const isImmediateCertConv = conversatorio.certificadoInmediato === true;
      if (isImmediateCertConv) {
        const io = req.app.get("io");
        await CertificateEligibilityService.checkAndGrantConversatorioCertificate(user.id, evId, io);
      }

    } else if (actualType === "curso") {
      const curso = await db.curso.findUnique({
        where: { id: evId },
        include: { certificateDesign: true }
      });

      if (!curso) {
        return res.status(404).json({ success: false, error: "Curso no encontrado." });
      }

      eventName = curso.titulo;
      eventStartDate = curso.fechaInicio;

      // Create enrollment
      await db.eventEnrollment.upsert({
        where: {
          userId_cursoId: {
            userId: user.id,
            cursoId: evId
          }
        },
        update: {},
        create: {
          userId: user.id,
          cursoId: evId
        }
      });

      // Auto-create approved certificate (Only if certificadoInmediato is explicitly enabled and name is valid)
      const isImmediateCertCur = curso.certificadoInmediato === true;
      if (isImmediateCertCur) {
        const existingCert = await db.certificate.findFirst({
          where: { userId: user.id, cursoId: evId }
        });

        const certUserName = getValidCertificateUserName(user);

        if (!existingCert && certUserName) {
          const design = curso.certificateDesign;
          const horasVal = design?.horas ?? 40;
          const eventNameVal = design?.nombreEvento ?? curso.titulo;
          const codigoCertificado = "CERT-" + Math.random().toString(36).substring(2, 10).toUpperCase() + "-" + evId;

          await db.certificate.create({
            data: {
              userId: user.id,
              cursoId: evId,
              codigo: codigoCertificado,
              horas: horasVal,
              nombreEvento: eventNameVal,
              nombreUsuario: certUserName,
              precioPagado: 0.00,
              estado: "APROBADO"
            }
          });
        }
      }
    } else {
      return res.status(400).json({ success: false, error: "Tipo de evento no soportado." });
    }

    // Send email asynchronously in the background
    if (isNewUser) {
      const loginUrl = `${process.env.BASE_URL || "http://localhost:3000"}/login`;
      emailService.sendCredentialsLegacy(email, {
        email,
        tempPassword,
        eventName,
        eventType: actualType,
        loginUrl
      }).catch(err => console.error("Error sending credentials email:", err));
    } else {
      emailService.sendEventEnrolled(email, {
        recipientName: user.name,
        eventName,
        eventType: actualType,
        startDate: eventStartDate.toISOString()
      }).catch(err => console.error("Error sending enrollment email:", err));
    }

    res.json({
      success: true,
      isNewUser,
      email
    });

  } catch (error) {
    console.error("Error in manual enrollment:", error);
    res.status(500).json({ success: false, error: "Error interno del servidor." });
  }
});

// POST Register Route
router.post("/register", async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;
  try {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return res.render("login", {
        title: "Registro de Cuenta",
        activePage: "login",
        error: "El correo electrónico ya está registrado.",
        success: null,
        formData: req.body,
        mode: "register"
      });
    }

    // Resolve Role
    let dbRole = await getRoleByName(role);
    if (!dbRole) {
      // Ensure basic roles exist
      await db.role.createMany({
        data: [
          { name: "ADMIN", description: "Administrador del Sistema" },
          { name: "PROFESSIONAL", description: "Profesional Afiliado" },
          { name: "CLIENT", description: "Cliente o Paciente" }
        ]
      });
      dbRole = await getRoleByName(role);
    }

    if (!dbRole) {
      return res.render("login", {
        title: "Iniciar Sesión",
        activePage: "login",
        error: "El rol seleccionado no es válido.",
        success: null
      });
    }

    const hashedPassword = await hashPassword(password);
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        roleId: dbRole.id,
        status: "ACTIVE"
      },
      include: { role: true }
    });

    // If professional, create profile
    if (dbRole.name === "PROFESSIONAL") {
      const slug = await getUniqueSlug("professionalProfile", name);
      await db.professionalProfile.create({
        data: {
          userId: user.id,
          status: "PENDIENTE",
          bio: "Biografía profesional por configurar",
          slogan: "Slogan por configurar",
          slug
        }
      });
    }

    // Send welcome email (fire-and-forget)
    const profileStatus = dbRole.name === "PROFESSIONAL" ? "PENDIENTE" : undefined;
    emailService.sendWelcomeRegistration(email, {
      recipientName: name,
      email,
      loginUrl: `${process.env.BASE_URL || "http://localhost:3000"}/login`,
      profileStatus
    }).catch(err => console.warn("Could not send welcome email:", err));

    const token = await createAuthSession(user, user.role.name, req);

    res.cookie("token", token, AUTH_COOKIE_OPTIONS);

    if (dbRole.name === "PROFESSIONAL") {
      return res.redirect("/dashboard/profesional");
    } else {
      return res.redirect("/dashboard/cliente");
    }
  } catch (error) {
    console.error("Error in register POST:", error);
    res.render("login", {
      title: "Iniciar Sesión",
      activePage: "login",
      error: "Error interno al registrar usuario.",
      success: null
    });
  }
});

// AJAX API Route: Login returning JSON
router.post("/api/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await db.user.findUnique({
      where: { email },
      include: { role: true }
    });

    if (!user) {
      return res.status(400).json({ success: false, error: "El correo electrónico no está registrado." });
    }

    if (user.status !== "ACTIVE") {
      return res.status(400).json({ success: false, error: "Su cuenta no está activa. Contacte al soporte." });
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return res.status(400).json({ success: false, error: "La contraseña es incorrecta." });
    }

    const token = await createAuthSession(user, user.role.name, req);

    res.cookie("token", token, AUTH_COOKIE_OPTIONS);

    return res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role.name, nombreCertificado: user.nombreCertificado } });
  } catch (error) {
    console.error("AJAX login error:", error);
    return res.status(500).json({ success: false, error: "Error interno al iniciar sesión." });
  }
});

// AJAX API Route: Get current authenticated session user
router.get("/api/auth/me", (req: Request, res: Response) => {
  const user = (req as any).user || res.locals.user;
  if (!user) {
    return res.status(401).json({ success: false, error: "No autenticado." });
  }
  const userData = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role?.name || (typeof user.role === "string" ? user.role : null),
    status: user.status,
  };
  return res.json({
    success: true,
    data: userData,
    user: userData,
  });
});

// AJAX API Route: Register returning JSON
router.post("/api/auth/register", async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  const roleName = "CLIENT"; // Registrations from checkout flow are always CLIENT / CLIENTE role
  try {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, error: "El correo electrónico ya está registrado." });
    }

    let dbRole = await getRoleByName(roleName);
    if (!dbRole) {
      dbRole = await db.role.create({
        data: { name: roleName, description: "Cliente o Paciente" }
      });
    }

    const hashedPassword = await hashPassword(password);
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        roleId: dbRole.id,
        status: "ACTIVE"
      },
      include: { role: true }
    });

    const token = await createAuthSession(user, user.role.name, req);

    res.cookie("token", token, AUTH_COOKIE_OPTIONS);

    // Send welcome email for client (fire-and-forget)
    emailService.sendWelcomeRegistration(email, {
      recipientName: name,
      email,
      loginUrl: `${process.env.BASE_URL || "http://localhost:3000"}/login`
      // profileStatus es undefined para clientes (sin perfil en revisión)
    }).catch(err => console.warn("Could not send welcome email:", err));

    return res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role.name, nombreCertificado: user.nombreCertificado } });
  } catch (error) {
    console.error("AJAX register error:", error);
    return res.status(500).json({ success: false, error: "Error interno al registrarse." });
  }
});

// GET Dashboard Notifications
router.get("/api/notifications", async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ success: false, error: "No autorizado" });
  }

  try {
    const notifications: any[] = [];
    const roleName = user.role.name;

    if (roleName === "ADMIN") {
      const staleTransferCutoff = new Date(Date.now() - STALE_TRANSFER_PAYMENT.HOURS * 60 * 60 * 1000);
      const staleTransferRetryCutoff = new Date(Date.now() - STALE_TRANSFER_PAYMENT.RETRY_EMAIL_AFTER_HOURS * 60 * 60 * 1000);
      const adminConfig = await getSystemConfig();

      // 1. Pending professional profiles
      const pendingProfiles = await db.professionalProfile.findMany({
        where: { status: "PENDIENTE" },
        include: { user: true }
      });
      pendingProfiles.forEach(p => {
        notifications.push({
          id: `profile-${p.id}`,
          title: "Perfil Pendiente",
          message: `El perfil de ${p.user.name} está pendiente de aprobación.`,
          link: "/dashboard/admin?tab=professionals",
          type: "warning",
          date: p.createdAt
        });
      });

      // 2. Pending payment requests
      const pendingPayments = await db.paymentRequest.findMany({
        where: { estado: "PENDIENTE" }
      });
      pendingPayments.forEach(p => {
        notifications.push({
          id: `payment-${p.id}`,
          title: "Pago por Aprobar",
          message: `Solicitud de pago de $${p.monto} (${p.tipo}) por aprobar.`,
          link: "/dashboard/admin?tab=orders",
          type: "info",
          date: p.fechaSolicitud
        });
      });

      // 3. Stale transfer payments (> 24h pending) across every PaymentRequest type.
      const staleTransferPayments = await db.paymentRequest.findMany({
        where: {
          estado: "PENDIENTE",
          fechaSolicitud: { lte: staleTransferCutoff }
        },
        include: {
          issuer: {
            include: {
              professionalProfile: {
                include: { user: true }
              }
            }
          },
          certificate: {
            include: {
              user: true,
              curso: true,
              conversatorio: true
            }
          },
          promotion: {
            include: {
              plan: true,
              profile: {
                include: { user: true }
              }
            }
          }
        },
        orderBy: { fechaSolicitud: "asc" }
      });

      const adminEmail = adminConfig?.adminEmail?.trim().toLowerCase() || null;
      const adminAlertEmail = isValidConfigEmail(adminEmail) ? adminEmail : null;
      const dashboardUrl = `${process.env.BASE_URL || `${req.protocol}://${req.get("host")}`}/dashboard/admin?tab=orders`;

      for (const payment of staleTransferPayments) {
        const payerName =
          payment.certificate?.user?.name ||
          payment.issuer?.professionalProfile?.user?.name ||
          payment.promotion?.profile?.user?.name ||
          payment.razonSocial;
        const concept =
          payment.certificate?.curso?.titulo ||
          payment.certificate?.conversatorio?.titulo ||
          payment.certificate?.nombreEvento ||
          payment.promotion?.plan?.nombre ||
          payment.tipo;
        const ageHours = Math.floor((Date.now() - payment.fechaSolicitud.getTime()) / (60 * 60 * 1000));

        notifications.push({
          id: `stale-transfer-${payment.id}`,
          title: "Transferencia pendiente > 24h",
          message: `El pago por transferencia #${payment.id} de ${payerName} (${concept}) lleva ${ageHours} horas pendiente.`,
          link: "/dashboard/admin?tab=orders",
          type: "warning",
          date: payment.fechaSolicitud
        });

        const shouldNotifyByEmail =
          !!adminAlertEmail &&
          !payment.staleAdminEmailSentAt &&
          (!payment.staleAdminEmailLastAttemptAt || payment.staleAdminEmailLastAttemptAt <= staleTransferRetryCutoff);

        if (!shouldNotifyByEmail || !adminAlertEmail) {
          continue;
        }

        const claim = await db.paymentRequest.updateMany({
          where: {
            id: payment.id,
            staleAdminEmailSentAt: null,
            OR: [
              { staleAdminEmailLastAttemptAt: null },
              { staleAdminEmailLastAttemptAt: { lte: staleTransferRetryCutoff } }
            ]
          },
          data: {
            staleAdminEmailLastAttemptAt: new Date()
          }
        });

        if (claim.count === 0) {
          continue;
        }

        const result = await emailService.sendStaleTransferPaymentAdminAlert(adminAlertEmail, {
          recipientName: "Administrador",
          paymentId: payment.id,
          paymentType: payment.tipo,
          payerName,
          amount: payment.monto,
          currency: STALE_TRANSFER_PAYMENT.CURRENCY,
          reference: payment.referencia,
          bankName: payment.bancoDestino || "Transferencia",
          requestedAt: formatEcDateTime(payment.fechaSolicitud),
          ageHours,
          dashboardUrl,
        });

        if (result.success) {
          await db.paymentRequest.update({
            where: { id: payment.id },
            data: { staleAdminEmailSentAt: new Date() }
          });
        } else {
          console.warn(`No se pudo enviar alerta de transferencia pendiente #${payment.id}:`, result.error);
        }
      }

      // 4. Pending Referral Sales
      const pendingReferralSales = await db.referralSale.findMany({
        where: { estado: "PENDIENTE" },
        include: { referral: { include: { user: true } } }
      });
      pendingReferralSales.forEach(s => {
        notifications.push({
          id: `ref-sale-${s.id}`,
          title: "Venta de Referido por Aprobar",
          message: `Venta #${s.id} ($${s.valorPagado.toFixed(2)}) por ${s.referral?.user?.name || s.clienteNombre} requiere revisión.`,
          link: "/dashboard/admin?tab=referidos",
          type: "info",
          date: s.createdAt
        });
      });

      // 5. Pending Referral Withdrawals
      const pendingWithdrawals = await db.referralWithdrawal.findMany({
        where: { estado: "PENDIENTE" },
        include: { referral: { include: { user: true } } }
      });
      pendingWithdrawals.forEach(w => {
        notifications.push({
          id: `ref-withdrawal-${w.id}`,
          title: "Solicitud de Retiro de Referido",
          message: `${w.referral?.user?.name || 'Referido'} solicitó un retiro de $${w.monto.toFixed(2)}.`,
          link: "/dashboard/admin?tab=referidos",
          type: "warning",
          date: w.createdAt
        });
      });

      // 6. Pending Role Transitions
      const pendingRoleTransitions = await db.roleTransitionRequest.findMany({
        where: { estado: "PENDIENTE" },
        include: { user: true }
      });
      pendingRoleTransitions.forEach(r => {
        notifications.push({
          id: `role-trans-${r.id}`,
          title: "Solicitud de Cambio de Rol",
          message: `${r.user.name} solicitó su ascenso a ${r.targetRole}.`,
          link: "/dashboard/admin?tab=professionals",
          type: "info",
          date: r.fechaSolicitud
        });
      });

      // 7. Unread Contact Messages (Soporte)
      const unreadContactMsgs = await db.contactMessage.findMany({
        where: { leido: false }
      });
      unreadContactMsgs.forEach(m => {
        notifications.push({
          id: `contact-msg-${m.id}`,
          title: "Nuevo Mensaje de Contacto",
          message: `Mensaje de ${m.nombre} (${m.email}): "${m.asunto || 'Consulta General'}"`,
          link: "/dashboard/admin?tab=soporte",
          type: "info",
          date: m.fecha
        });
      });

    } else if (roleName === "PROFESSIONAL") {
      // 1. Pending appointments
      const pendingAppointments = await db.appointment.findMany({
        where: {
          profile: { userId: user.id },
          estado: "PENDIENTE"
        }
      });
      pendingAppointments.forEach(a => {
        notifications.push({
          id: `appt-${a.id}`,
          title: "Nueva Cita",
          message: `${a.nombre} solicitó una cita para el ${a.fecha} a las ${a.hora}.`,
          link: "/dashboard/profesional?tab=appointments",
          type: "info",
          date: a.createdAt
        });
      });

      // 2. Pending task submissions
      const pendingSubmissions = await db.cursoSubmission.findMany({
        where: {
          estado: "PENDIENTE",
          task: {
            lesson: {
              module: {
                curso: {
                  profile: { userId: user.id }
                }
              }
            }
          }
        },
        include: {
          user: true,
          task: {
            include: {
              lesson: {
                include: {
                  module: {
                    include: {
                      curso: true
                    }
                  }
                }
              }
            }
          }
        }
      });
      pendingSubmissions.forEach(s => {
        notifications.push({
          id: `sub-${s.id}`,
          title: "Tarea Entregada",
          message: `${s.user.name} entregó la tarea "${s.task.titulo}" del curso "${s.task.lesson.module.curso.titulo}".`,
          link: "/dashboard/profesional?tab=cursos",
          type: "warning",
          date: s.fechaEntrega
        });
      });

    } else if (roleName === "CLIENT") {
      // 1. Confirmed appointments
      const confirmedAppointments = await db.appointment.findMany({
        where: {
          userId: user.id,
          estado: "CONFIRMADA"
        }
      });
      confirmedAppointments.forEach(a => {
        notifications.push({
          id: `appt-conf-${a.id}`,
          title: "Cita Confirmada",
          message: `Tu cita con el profesional para el ${a.fecha} a las ${a.hora} ha sido confirmada.`,
          link: "/dashboard/cliente?tab=citas",
          type: "success",
          date: a.updatedAt
        });
      });

      // 2. Reprogrammed appointments
      const reprogAppointments = await db.appointment.findMany({
        where: {
          userId: user.id,
          estado: "REPROGRAMADA"
        }
      });
      reprogAppointments.forEach(a => {
        notifications.push({
          id: `appt-reprog-${a.id}`,
          title: "Cita Reprogramada",
          message: `Tu cita para el ${a.fecha} a las ${a.hora} ha sido reprogramada.`,
          link: "/dashboard/cliente?tab=citas",
          type: "warning",
          date: a.updatedAt
        });
      });

      // 3. Certificates
      const certificates = await db.certificate.findMany({
        where: {
          userId: user.id,
          estado: "APROBADO"
        }
      });
      certificates.forEach(c => {
        notifications.push({
          id: `cert-${c.id}`,
          title: "Certificado Disponible",
          message: `Tu certificado para el evento "${c.nombreEvento}" ya está disponible.`,
          link: "/dashboard/cliente?tab=certificados",
          type: "success",
          date: c.fechaEmision
        });
      });
    }

    // Sort notifications by date desc
    notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({ success: true, notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ success: false, error: "Error interno del servidor." });
  }
});

// GET Dashboard Search Autocomplete
router.get("/api/dashboard/search", async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ success: false, error: "No autorizado" });
  }

  const query = getSafeQueryString(req.query.q);
  if (!query) {
    return res.json({ success: true, results: {} });
  }

  try {
    const results: any = {};
    const roleName = user.role.name;

    if (roleName === "ADMIN") {
      // 1. Search Clients
      results.clients = await db.user.findMany({
        where: {
          role: { name: "CLIENT" },
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } }
          ]
        },
        select: { id: true, name: true, email: true },
        take: 5
      });

      // 2. Search Professionals
      results.professionals = await db.professionalProfile.findMany({
        where: {
          OR: [
            { user: { name: { contains: query, mode: "insensitive" } } },
            { user: { email: { contains: query, mode: "insensitive" } } }
          ]
        },
        include: { user: { select: { name: true, email: true } } },
        take: 5
      });

      // 3. Search Cursos
      results.cursos = await db.curso.findMany({
        where: { titulo: { contains: query, mode: "insensitive" } },
        select: { id: true, titulo: true, slug: true },
        take: 5
      });

      // 4. Search Conversatorios
      results.conversatorios = await db.conversatorio.findMany({
        where: { titulo: { contains: query, mode: "insensitive" } },
        select: { id: true, titulo: true, slug: true },
        take: 5
      });

      // 5. Search Articles
      results.articles = await db.article.findMany({
        where: { titulo: { contains: query, mode: "insensitive" } },
        select: { id: true, titulo: true, slug: true },
        take: 5
      });

    } else if (roleName === "PROFESSIONAL") {
      // Search own articles
      results.articles = await db.article.findMany({
        where: {
          profile: { userId: user.id },
          titulo: { contains: query, mode: "insensitive" }
        },
        select: { id: true, titulo: true, slug: true },
        take: 5
      });

    } else if (roleName === "CLIENT") {
      // 1. Search own appointments
      results.appointments = await db.appointment.findMany({
        where: {
          userId: user.id,
          OR: [
            { nombre: { contains: query, mode: "insensitive" } },
            { motivo: { contains: query, mode: "insensitive" } }
          ]
        },
        select: { id: true, nombre: true, motivo: true, fecha: true, hora: true },
        take: 5
      });

      // 2. Search own certificates
      results.certificates = await db.certificate.findMany({
        where: {
          userId: user.id,
          nombreEvento: { contains: query, mode: "insensitive" }
        },
        select: { id: true, nombreEvento: true, codigo: true },
        take: 5
      });
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error("Error during dashboard search:", error);
    res.status(500).json({ success: false, error: "Error interno del servidor." });
  }
});

// Logout Route
router.get("/logout", async (req: Request, res: Response) => {
  await revokeSessionFromToken(req.cookies?.token);
  res.clearCookie("token");
  res.redirect("/");
});

// -------------------------------------------------------------
// Password Reset Pages & Endpoints
// -------------------------------------------------------------

router.get("/forgot-password", (req: Request, res: Response) => {
  res.render("forgot-password", {
    title: "Recuperar Contraseña",
    activePage: "forgot-password"
  });
});

router.get("/reset-password", async (req: Request, res: Response) => {
  const token = (req.query.token as string) || "";
  if (!token) {
    return res.redirect("/forgot-password");
  }

  let userEmail = "";
  const payload = verifyPasswordResetToken(token);
  if (payload) {
    userEmail = payload.email;
  } else {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "super-secret-key-professionals-ecuador-2026") as any;
      if (decoded && decoded.userId) {
        const user = await db.user.findUnique({ where: { id: decoded.userId } });
        if (user) userEmail = user.email;
      }
    } catch (err) {
      // invalid token
    }
  }

  res.render("reset-password", {
    title: "Restablecer Contraseña",
    activePage: "reset-password",
    token,
    userEmail: userEmail || "",
    error: null
  });
});

router.post("/api/auth/request-password-reset", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email requerido" });
    }

    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      // Por seguridad, no revelar si el email existe o no
      return res.json({ success: true, message: "Si el correo existe, recibiras instrucciones" });
    }

    const token = jwt.sign(
      { userId: user.id, passwordHash: user.password ? user.password.slice(0, 10) : "" },
      process.env.JWT_SECRET || "fallback-secret",
      { expiresIn: "1h" }
    );

    const resetUrl = `${process.env.BASE_URL || "http://localhost:3000"}/reset-password?token=${token}`;

    emailService.sendPasswordReset(user.email, {
      recipientName: user.name || user.email,
      resetToken: token,
      resetUrl,
      expiresInMinutes: 60,
    }).catch((err) => console.warn("Error enviando email de reset:", err));

    return res.json({ success: true, message: "Si el correo existe, recibiras instrucciones" });
  } catch (error) {
    console.error("Error en request-password-reset:", error);
    return res.status(500).json({ error: "Error interno" });
  }
});

router.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token y nueva contrasena requeridos" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "La contrasena debe tener al menos 6 caracteres" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret") as any;
    } catch (jwtError) {
      return res.status(400).json({ error: "Token invalido o expirado" });
    }

    const user = await db.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(400).json({ error: "Usuario no encontrado" });
    }

    // Verificar que la contrasena no haya cambiado desde que se genero el token
    const currentHashPrefix = user.password ? user.password.slice(0, 10) : "";
    if (currentHashPrefix !== decoded.passwordHash) {
      return res.status(400).json({ error: "El enlace ya fue usado o la contrasena fue cambiada" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    emailService.sendPasswordUpdated(user.email, {
      recipientName: user.name || user.email,
      updateDate: new Date().toLocaleString("es-EC"),
      supportEmail: process.env.SUPPORT_EMAIL || "soporte@profesionales.ec",
    }).catch((err) => console.warn("Error enviando confirmacion de actualizacion:", err));

    return res.json({ success: true, message: "Contrasena actualizada correctamente" });
  } catch (error) {
    console.error("Error en reset-password:", error);
    return res.status(500).json({ error: "Error interno" });
  }
});

// -------------------------------------------------------------
// Registro y Perfil Público de Estudiantes
// -------------------------------------------------------------

function slugifyStudentName(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function generateUniqueStudentSlug(name: string): Promise<string> {
  const baseSlug = slugifyStudentName(name);
  let finalSlug = baseSlug;
  let counter = 1;
  while (await db.studentProfile.findUnique({ where: { slug: finalSlug } })) {
    finalSlug = `${baseSlug}-${counter}`;
    counter++;
  }
  return finalSlug;
}

router.get("/registro-estudiante", async (req: Request, res: Response) => {
  if (res.locals.user) {
    return res.redirect("/student");
  }
  const professions = await getAllProfessions();
  const universities = await db.university.findMany({
    where: { activo: true },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }]
  });
  res.render("registro-estudiante", {
    title: "Registro de Estudiante - Profesionales Ecuador",
    activePage: "registro-estudiante",
    professions,
    universities,
    error: req.query.error || null,
  });
});

router.post("/registro-estudiante", async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      password,
      universityId,
      institucionEducativa,
      carrera,
      profesionId,
      especialidadNombre,
      estadoCarrera,
      provincia,
      ciudad,
      telefono,
      bio,
      fotoBase64,
      carnetDocBase64,
    } = req.body;

    const professions = await getAllProfessions();
    const universities = await db.university.findMany({
      where: { activo: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }]
    });

    let finalInstitucion = institucionEducativa?.trim() || "";
    let parsedUniId: number | null = null;
    if (universityId) {
      const val = parseInt(universityId as string, 10);
      if (!isNaN(val)) {
        parsedUniId = val;
        const uni = await db.university.findUnique({ where: { id: val } });
        if (uni) {
          finalInstitucion = uni.nombre;
        }
      }
    }

    if (!name || !email || !password || !finalInstitucion || !carrera) {
      return res.render("registro-estudiante", {
        title: "Registro de Estudiante - Profesionales Ecuador",
        activePage: "registro-estudiante",
        professions,
        universities,
        error: "Por favor completa todos los campos obligatorios (*).",
        formData: req.body,
        activeStep: 1
      });
    }

    if (!bio || !bio.trim()) {
      return res.render("registro-estudiante", {
        title: "Registro de Estudiante - Profesionales Ecuador",
        activePage: "registro-estudiante",
        professions,
        universities,
        error: "La presentación / biografía breve es obligatoria (*).",
        formData: req.body,
        activeStep: 3
      });
    }

    if (!fotoBase64 || typeof fotoBase64 !== "string" || !fotoBase64.startsWith("data:image")) {
      return res.render("registro-estudiante", {
        title: "Registro de Estudiante - Profesionales Ecuador",
        activePage: "registro-estudiante",
        professions,
        universities,
        error: "Por favor sube tu foto de perfil obligatoria (*).",
        formData: req.body,
        activeStep: 3
      });
    }

    if (!carnetDocBase64 || typeof carnetDocBase64 !== "string" || !carnetDocBase64.startsWith("data:")) {
      return res.render("registro-estudiante", {
        title: "Registro de Estudiante - Profesionales Ecuador",
        activePage: "registro-estudiante",
        professions,
        universities,
        error: "Es obligatorio adjuntar la foto o PDF de tu carnet estudiantil o certificado de matrícula (*).",
        formData: req.body,
        activeStep: 3
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = await db.user.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } }
    });
    if (existingUser) {
      return res.render("registro-estudiante", {
        title: "Registro de Estudiante - Profesionales Ecuador",
        activePage: "registro-estudiante",
        professions,
        universities,
        error: "El correo electrónico ya se encuentra registrado en el sistema. Por favor inicia sesión o usa un correo diferente.",
        formData: req.body,
        activeStep: 1
      });
    }

    let fotoUrl: string | null = null;
    if (fotoBase64 && typeof fotoBase64 === "string" && fotoBase64.startsWith("data:image")) {
      try {
        fotoUrl = await uploadBase64ToCloudinary(fotoBase64, "student_photos");
      } catch (e) {
        console.error("Error uploading student avatar:", e);
      }
    }

    let carnetUrl: string | null = null;
    if (carnetDocBase64 && typeof carnetDocBase64 === "string" && carnetDocBase64.startsWith("data:")) {
      try {
        carnetUrl = await uploadBase64ToCloudinary(carnetDocBase64, "student_carnets");
      } catch (e) {
        console.error("Error uploading student carnet doc:", e);
      }
    }

    let clientRole = await db.role.findUnique({ where: { name: "CLIENT" } });
    if (!clientRole) {
      clientRole = await db.role.create({
        data: { name: "CLIENT", description: "Cliente o Comprador de la Plataforma" }
      });
    }

    const hashedPassword = await hashPassword(password);
    const fullCarrera = carrera.trim();
    const studentSlug = await generateUniqueStudentSlug(name.trim());

    // Crear usuario inicialmente con rol CLIENT y perfil estudiante, pendiente de aprobación del carnet por el Administrador
    const user = await db.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        roleId: clientRole.id,
        ciudad: ciudad?.trim() || null,
        telefono: telefono?.trim() || null,
        studentProfile: {
          create: {
            slug: studentSlug,
            universityId: parsedUniId,
            institucionEducativa: finalInstitucion,
            carrera: fullCarrera,
            estadoCarrera: estadoCarrera === "EGRESADO" ? "EGRESADO" : "EN_CURSO",
            bio: bio?.trim() || null,
            foto: fotoUrl,
            carnetEstudiante: carnetUrl || fotoUrl,
            provincia: provincia?.trim() || null,
            ciudad: ciudad?.trim() || null,
            telefono: telefono?.trim() || null,
          },
        },
      },
      include: { role: true },
    });

    // Crear solicitud de transición de rol pendiente para revisión del Administrador
    await db.roleTransitionRequest.create({
      data: {
        userId: user.id,
        currentRole: "CLIENT",
        targetRole: "STUDENT",
        motivoSolicitud: `Registro inicial de estudiante (${finalInstitucion} - ${fullCarrera})`,
        tituloCertificadoUrl: carnetUrl || fotoUrl,
        estado: "PENDIENTE",
      }
    });

    // Send welcome email for student (fire-and-forget)
    emailService.sendWelcomeRegistration(cleanEmail, {
      recipientName: name.trim(),
      email: cleanEmail,
      loginUrl: `${process.env.BASE_URL || "http://localhost:3000"}/login`
    }).catch(err => console.warn("Could not send student welcome email:", err));

    return res.redirect("/login?success=" + encodeURIComponent("¡Registro recibido con éxito! El carnet o matrícula adjuntada pasará a revisión del Administrador para verificar y activar tu cuenta de estudiante. Puedes iniciar sesión mientras se revisa tu solicitud."));
  } catch (error: any) {
    console.error("Error en POST /registro-estudiante:", error);
    const professions = await getAllProfessions();
    const universities = await db.university.findMany({
      where: { activo: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }]
    });
    let userFacingError = error.message || "Error al procesar el registro.";
    let activeStep = 1;
    if (error.code === "P2002" || (error.message && error.message.includes("Unique constraint failed"))) {
      userFacingError = "El correo electrónico ya se encuentra registrado en el sistema. Por favor inicia sesión o utiliza uno diferente.";
      activeStep = 1;
    }

    return res.render("registro-estudiante", {
      title: "Registro de Estudiante - Profesionales Ecuador",
      activePage: "registro-estudiante",
      professions,
      universities,
      error: userFacingError,
      formData: req.body,
      activeStep
    });
  }
});

router.get("/directorio-estudiantes", (req: Request, res: Response) => {
  const query = req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "";
  return res.redirect(301, `/estudiantes${query}`);
});

router.get("/estudiantes", async (req: Request, res: Response) => {
  try {
    const search = getSafeQueryString(req.query.search);
    const universityId = getSafeQueryString(req.query.universityId);
    const profession = getSafeQueryString(req.query.profession);
    const estadoCarrera = getSafeQueryString(req.query.estadoCarrera);
    const provincia = getSafeQueryString(req.query.provincia);
    const ciudad = getSafeQueryString(req.query.ciudad);
    const sort = getSafeQueryString(req.query.sort, 40);

    const whereClause: any = {
      status: "ACTIVE",
      role: { name: "STUDENT" },
      studentProfile: { isNot: null }
    };

    if (search && search.trim() !== "") {
      const term = search.trim();
      whereClause.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { studentProfile: { is: { carrera: { contains: term, mode: "insensitive" } } } },
        { studentProfile: { is: { institucionEducativa: { contains: term, mode: "insensitive" } } } },
        { studentProfile: { is: { bio: { contains: term, mode: "insensitive" } } } }
      ];
    }

    const studentProfileWhere: any = {};
    if (universityId && universityId.trim() !== "") {
      const parsedUniId = parseInt(universityId, 10);
      if (!isNaN(parsedUniId)) {
        studentProfileWhere.universityId = parsedUniId;
      }
    }
    if (profession && profession.trim() !== "") {
      studentProfileWhere.carrera = { contains: profession.trim(), mode: "insensitive" };
    }
    if (estadoCarrera && estadoCarrera.trim() !== "") {
      studentProfileWhere.estadoCarrera = estadoCarrera.trim();
    }
    if (provincia && provincia.trim() !== "") {
      studentProfileWhere.provincia = { contains: provincia.trim(), mode: "insensitive" };
    }
    if (ciudad && ciudad.trim() !== "") {
      studentProfileWhere.ciudad = { contains: ciudad.trim(), mode: "insensitive" };
    }

    if (Object.keys(studentProfileWhere).length > 0) {
      whereClause.studentProfile = {
        is: studentProfileWhere
      };
    }

    let students = await db.user.findMany({
      where: whereClause,
      include: {
        studentProfile: {
          include: {
            university: true,
            projects: true,
            externalCourses: true,
            experiences: true,
            _count: {
              select: {
                projects: true,
                externalCourses: true,
                experiences: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    if (sort === "nombre_asc") {
      students.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "destacados") {
      students.sort((a, b) => {
        const aCount = a.studentProfile?._count?.projects || 0;
        const bCount = b.studentProfile?._count?.projects || 0;
        return bCount - aCount;
      });
    }

    const universities = await db.university.findMany({
      where: { activo: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }]
    });

    const professions = await getAllProfessions();

    const activeStudentProfiles = await db.studentProfile.findMany({
      select: { provincia: true, ciudad: true }
    });

    const provinces = Array.from(new Set(activeStudentProfiles.map((p) => p.provincia).filter(Boolean))) as string[];
    const cities = Array.from(new Set(activeStudentProfiles.map((p) => p.ciudad).filter(Boolean))) as string[];

    res.render("directorio-estudiantes", {
      title: "Directorio Nacional de Estudiantes - Profesionales Ecuador",
      activePage: "estudiantes",
      students,
      universities,
      professions,
      provinces,
      cities,
      query: {
        search: search || "",
        universityId: universityId || "",
        profession: profession || "",
        estadoCarrera: estadoCarrera || "",
        provincia: provincia || "",
        ciudad: ciudad || "",
        sort: sort || "destacados"
      }
    });
  } catch (error: any) {
    console.error("Error en GET /estudiantes:", error);
    res.status(500).render("preview-error", {
      title: "Error de Servidor",
      message: "Error al cargar el directorio de estudiantes."
    });
  }
});

/**
 * Redirección de URL amigable /e/:identifier hacia /estudiantes/:identifier
 */
router.get(["/e/:identifier", "/e/@:identifier"], (req: Request, res: Response) => {
  const rawIdentifier = Array.isArray(req.params.identifier) ? req.params.identifier[0] : req.params.identifier;
  const clean = String(rawIdentifier || "").replace(/^@/, "");
  return res.redirect(301, `/estudiantes/${encodeURIComponent(clean)}`);
});

/**
 * Vista pública del perfil del estudiante (Soporta Slug amigable e ID)
 */
router.get(["/estudiantes/:identifier", "/estudiante/:identifier", "/estudiantes/@:identifier"], async (req: Request, res: Response) => {
  try {
    const rawIdentifier = Array.isArray(req.params.identifier) ? req.params.identifier[0] : req.params.identifier;
    if (!rawIdentifier) {
      return res.status(404).render("preview-error", {
        title: "Estudiante No Encontrado",
        message: "Identificador de estudiante no válido.",
      });
    }

    const cleanIdentifier = String(rawIdentifier).replace(/^@/, "");
    const parsedId = parseInt(cleanIdentifier, 10);
    const isNumeric = !isNaN(parsedId);

    const studentProfile = await db.studentProfile.findFirst({
      where: {
        OR: [
          { slug: cleanIdentifier },
          { studentId: { slug: cleanIdentifier } },
          ...(isNumeric ? [{ id: parsedId }, { userId: parsedId }] : [])
        ]
      },
      include: {
        university: true,
        user: {
          include: {
            certificates: { include: { curso: true } },
            acquiredCertificates: { include: { conversatorio: true } },
          },
        },
        projects: { orderBy: { createdAt: "desc" } },
        externalCourses: { orderBy: { createdAt: "desc" } },
        experiences: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!studentProfile || !studentProfile.user) {
      return res.status(404).render("preview-error", {
        title: "Estudiante No Encontrado",
        message: "El perfil de estudiante solicitado no existe o no se encuentra activo.",
      });
    }

    res.render("perfil-estudiante-publico", {
      title: `${studentProfile.user.name} - Perfil Académico | Profesionales Ecuador`,
      student: {
        ...studentProfile.user,
        studentProfile
      },
      activePage: "estudiantes",
    });
  } catch (error: any) {
    console.error("Error en GET /estudiantes/:identifier:", error);
    res.status(500).render("preview-error", {
      title: "Error",
      message: "Error al cargar el perfil del estudiante.",
    });
  }
});

/**
 * GET /download/file
 * Endpoint universal de descarga segura que autodetecta mediante Magic Bytes y Content-Type
 * el formato real de todo archivo (JPG, PNG, WEBP, PDF, DOCX, ZIP) y fuerza la cabecera
 * Content-Disposition respetando siempre la extensión y el nombre de archivo original.
 */
router.get("/download/file", async (req: Request, res: Response) => {
  try {
    const rawUrl = req.query.url ? String(req.query.url) : "";
    let filename = req.query.name ? String(req.query.name) : "Archivo";

    if (!rawUrl || (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://"))) {
      return res.status(400).send("URL de archivo inválida.");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let fetchResponse: any;
    try {
      fetchResponse = await fetch(rawUrl, { signal: controller.signal as any });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr.name === "AbortError") {
        return res.status(504).send("Tiempo de espera agotado al obtener el archivo original.");
      }
      throw fetchErr;
    }
    clearTimeout(timeoutId);

    if (!fetchResponse.ok) {
      return res.status(fetchResponse.status).send("No se pudo obtener el archivo solicitado.");
    }

    const arrayBuffer = await fetchResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let detectedMime = fetchResponse.headers.get("content-type") || "application/octet-stream";
    const lowerType = detectedMime.toLowerCase();

    // Prioridad 1: Extensión explícita del parámetro name o de la URL original
    const nameOrUrlMatch = (filename + " " + rawUrl).match(/\.(jpg|jpeg|png|webp|svg|pdf|docx|doc|pptx|ppt|xlsx|xls|zip|rar)(\?|$)/i);
    let detectedExt = nameOrUrlMatch ? `.${nameOrUrlMatch[1].toLowerCase()}` : "";

    if (!detectedExt) {
      if (lowerType.includes("jpeg") || lowerType.includes("jpg")) detectedExt = ".jpg";
      else if (lowerType.includes("png")) detectedExt = ".png";
      else if (lowerType.includes("webp")) detectedExt = ".webp";
      else if (lowerType.includes("svg")) detectedExt = ".svg";
      else if (lowerType.includes("pdf")) detectedExt = ".pdf";
      else if (lowerType.includes("word") || lowerType.includes("docx")) detectedExt = ".docx";
      else if (lowerType.includes("presentation") || lowerType.includes("pptx")) detectedExt = ".pptx";
      else if (lowerType.includes("spreadsheet") || lowerType.includes("excel") || lowerType.includes("xlsx")) detectedExt = ".xlsx";
      else if (lowerType.includes("zip")) detectedExt = ".zip";
    }

    // Inspección por Magic Bytes si el Mime retornado es genérico
    if (!detectedExt || lowerType.includes("octet-stream")) {
      if (buffer.length >= 5 && buffer.toString("ascii", 0, 5) === "%PDF-") {
        detectedExt = ".pdf";
        detectedMime = "application/pdf";
      } else if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        detectedExt = ".png";
        detectedMime = "image/png";
      } else if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        detectedExt = ".jpg";
        detectedMime = "image/jpeg";
      } else if (buffer.length >= 4 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
        detectedExt = ".webp";
        detectedMime = "image/webp";
      } else if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) {
        const lowerName = (filename + " " + rawUrl).toLowerCase();
        if (lowerName.includes("pptx") || lowerName.includes("ppt")) {
          detectedExt = ".pptx";
          detectedMime = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        } else if (lowerName.includes("xlsx") || lowerName.includes("xls")) {
          detectedExt = ".xlsx";
          detectedMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        } else if (lowerName.includes("docx") || lowerName.includes("doc")) {
          detectedExt = ".docx";
          detectedMime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        } else {
          detectedExt = ".zip";
          detectedMime = "application/zip";
        }
      }
    }

    if (!detectedExt) {
      detectedExt = ".pdf";
    }

    // Asegurar que el nombre de archivo termine con la extensión correcta sin duplicar
    if (filename.toLowerCase().endsWith(detectedExt)) {
      filename = filename.slice(0, -detectedExt.length);
    }

    const safeBaseName = filename.replace(/[^a-zA-Z0-9_.-]/g, "_").replace(/\.[^/.]+$/, "");
    const finalFilename = `${safeBaseName || "Archivo"}${detectedExt}`;

    res.setHeader("Content-Type", detectedMime);
    res.setHeader("Content-Disposition", `attachment; filename="${finalFilename}"`);
    res.setHeader("Content-Length", buffer.length);
    return res.send(buffer);
  } catch (error: any) {
    console.error("Error en GET /download/file:", error);
    return res.status(500).send("Error procesando la descarga del archivo.");
  }
});

// Alias para mantener compatibilidad
router.get("/download/pdf", (req: Request, res: Response) => {
  const rawUrl = String(req.query.url || '');
  const name = String(req.query.name || '');
  return res.redirect(`/download/file?url=${encodeURIComponent(rawUrl)}&name=${encodeURIComponent(name)}`);
});

/**
 * POST /api/conversatorios/:conversatorioId/questions
 * Permite a los usuarios inscritos enviar una pregunta al ponente / administrador
 */
router.post("/api/conversatorios/:conversatorioId/questions", async (req: Request, res: Response) => {
  try {
    const user = res.locals.user || (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, error: "Debes iniciar sesión para enviar una pregunta." });
    }

    const paramId = Array.isArray(req.params.conversatorioId) ? req.params.conversatorioId[0] : req.params.conversatorioId;
    const conversatorioId = parseInt(paramId, 10);
    if (!conversatorioId || isNaN(conversatorioId)) {
      return res.status(400).json({ success: false, error: "ID de conversatorio inválido." });
    }

    const { pregunta, speakerId } = req.body;
    if (!pregunta || typeof pregunta !== "string" || pregunta.trim().length < 5) {
      return res.status(400).json({ success: false, error: "La pregunta debe contener al menos 5 caracteres." });
    }

    const conversatorio = await db.conversatorio.findUnique({ where: { id: conversatorioId } });
    if (!conversatorio) {
      return res.status(404).json({ success: false, error: "Conversatorio no encontrado." });
    }

    // Verificar si el usuario está inscrito en el evento
    const enrollment = await db.eventEnrollment.findFirst({
      where: {
        userId: user.id,
        conversatorioId: conversatorio.id
      }
    });

    const isAccessGranted = conversatorio.gratuito || !!enrollment || user.role?.name === "ADMIN";

    if (!isAccessGranted) {
      return res.status(403).json({
        success: false,
        error: "Debes estar inscrito en este conversatorio para enviar preguntas al ponente o administración."
      });
    }

    const newQuestion = await db.conversatorioQuestionAnswer.create({
      data: {
        conversatorioId: conversatorio.id,
        speakerId: speakerId ? parseInt(String(speakerId), 10) : null,
        userId: user.id,
        pregunta: pregunta.trim(),
        estado: "PENDIENTE",
        activo: true
      }
    });

    return res.json({
      success: true,
      message: "¡Tu pregunta ha sido enviada con éxito! La administración la revisará y responderá en la sección Q&A.",
      questionId: newQuestion.id
    });
  } catch (error: any) {
    console.error("Error en POST /api/conversatorios/:conversatorioId/questions:", error);
    return res.status(500).json({ success: false, error: error.message || "Error procesando tu pregunta." });
  }
});

/**
 * GET /api/conversatorios/:conversatorioId/questions/public
 * Obtiene la lista oficial de Preguntas Aprobadas y Respuestas (Q&A) para la vista pública (sin revelar autor)
 */
router.get("/api/conversatorios/:conversatorioId/questions/public", async (req: Request, res: Response) => {
  try {
    const paramId = Array.isArray(req.params.conversatorioId) ? req.params.conversatorioId[0] : req.params.conversatorioId;
    const conversatorioId = parseInt(paramId, 10);
    if (!conversatorioId || isNaN(conversatorioId)) {
      return res.status(400).json({ success: false, error: "ID de conversatorio inválido." });
    }

    const speakerId = req.query.speakerId ? parseInt(String(req.query.speakerId), 10) : undefined;

    const whereCondition: any = {
      conversatorioId,
      estado: "APROBADO",
      activo: true
    };

    if (speakerId && !isNaN(speakerId)) {
      whereCondition.OR = [
        { speakerId: speakerId },
        { speakerId: null }
      ];
    }

    const qas = await db.conversatorioQuestionAnswer.findMany({
      where: whereCondition,
      select: {
        id: true,
        pregunta: true,
        respuesta: true,
        destacado: true,
        orden: true,
        createdAt: true
      },
      orderBy: [
        { destacado: "desc" },
        { orden: "asc" },
        { createdAt: "asc" }
      ]
    });

    return res.json({ success: true, qas });
  } catch (error: any) {
    console.error("Error en GET /api/conversatorios/:conversatorioId/questions/public:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /beneficios -> Public page displaying platform benefits & commercial agreements
router.get("/beneficios", async (req: Request, res: Response) => {
  try {
    const convenios = await db.agreement.findMany({
      where: { activo: true },
      orderBy: { orden: "asc" }
    });

    const benefits = await db.benefit.findMany({
      where: { activo: true },
      orderBy: { orden: "asc" }
    });

    res.render("beneficios", {
      title: "Beneficios & Convenios",
      activePage: "beneficios",
      convenios: convenios || [],
      benefits: benefits || []
    });
  } catch (error) {
    console.error("Error loading beneficios page:", error);
    res.render("beneficios", {
      title: "Beneficios & Convenios",
      activePage: "beneficios",
      convenios: [],
      benefits: []
    });
  }
});

// GET /tarjeta/vcard/:token -> Download VCard file
router.get("/tarjeta/vcard/:token", async (req: Request, res: Response) => {
  try {
    const rawToken = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
    const token = (rawToken || "").trim();
    let name = "";
    let email = "";
    let phone = "";
    let title = "";

    const prof: any = await db.professionalProfile.findFirst({
      where: {
        OR: [
          { cardPublicToken: token },
          { slug: token },
          ...(!isNaN(parseInt(token, 10)) ? [{ id: parseInt(token, 10) }] : [])
        ]
      },
      include: { user: true }
    });

    if (prof) {
      name = prof.user?.name || "Profesional";
      email = prof.user?.email || "";
      phone = prof.telefono || prof.whatsapp || "";
      title = prof.slogan || "Profesional Ecuador";
    } else {
      const student: any = await db.studentProfile.findFirst({
        where: {
          OR: [
            { cardPublicToken: token },
            { slug: token },
            ...(!isNaN(parseInt(token, 10)) ? [{ id: parseInt(token, 10) }] : [])
          ]
        },
        include: { user: true }
      });
      if (student) {
        name = student.user?.name || "Estudiante";
        email = student.user?.email || "";
        phone = student.telefono || "";
        title = `${student.carrera} - ${student.institucionEducativa}`;
      } else {
        return res.status(404).send("Tarjeta no encontrada");
      }
    }

    const vcardData = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `N:${name};;;;`,
      `FN:${name}`,
      `TITLE:${title}`,
      `EMAIL:${email}`,
      phone ? `TEL;TYPE=CELL:${phone}` : "",
      "END:VCARD"
    ].filter(Boolean).join("\n");

    res.setHeader("Content-Type", "text/vcard; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${name.replace(/\s+/g, "_")}.vcf"`);
    return res.send(vcardData);
  } catch (error) {
    console.error("Error generating vcard:", error);
    res.status(500).send("Error generando VCard");
  }
});

// GET /tarjeta/:identifier -> Public Digital Business Card View
router.get("/tarjeta/:identifier", async (req: Request, res: Response) => {
  try {
    const rawIdentifier = Array.isArray(req.params.identifier) ? req.params.identifier[0] : req.params.identifier;
    const identifier = (rawIdentifier || "").trim();
    if (!identifier) return res.redirect("/");

    const numId = !isNaN(parseInt(identifier, 10)) ? parseInt(identifier, 10) : undefined;

    // 1. Try finding Professional Profile by public token, slug, or numeric ID
    let prof: any = await db.professionalProfile.findFirst({
      where: {
        OR: [
          ...(numId ? [{ id: numId }] : []),
          { cardPublicToken: identifier },
          { slug: identifier }
        ]
      },
      include: {
        user: true,
        specialties: { include: { specialty: true } }
      }
    });

    if (prof) {
      if (!prof.cardPublicToken) {
        const newToken = crypto.randomBytes(8).toString("hex");
        await db.professionalProfile.update({
          where: { id: prof.id },
          data: { cardPublicToken: newToken }
        });
        prof.cardPublicToken = newToken;
      }

      const cardUrl = `${req.protocol}://${req.get("host")}/tarjeta/${prof.cardPublicToken}`;
      const qrCodeDataUrl = await QRCode.toDataURL(cardUrl, { width: 300, margin: 2 });

      const social: any[] = [];
      if (prof.whatsapp) social.push({ name: "WhatsApp", icon: "fa-brands fa-whatsapp", url: `https://wa.me/${prof.whatsapp.replace(/\D/g, "")}` });
      if (prof.linkedin) social.push({ name: "LinkedIn", icon: "fa-brands fa-linkedin", url: prof.linkedin });
      if (prof.instagram) social.push({ name: "Instagram", icon: "fa-brands fa-instagram", url: prof.instagram });
      if (prof.facebook) social.push({ name: "Facebook", icon: "fa-brands fa-facebook", url: prof.facebook });
      if (prof.website) social.push({ name: "Sitio Web", icon: "fa-solid fa-globe", url: prof.website });

      const headline = (prof.specialties || []).map((s: any) => s.specialty?.nombre).filter(Boolean).join(" • ") || "Profesional Registrado";
      const locationText = [prof.ciudad, prof.provincia].filter(Boolean).join(", ");

      return res.render("tarjeta-digital", {
        card: {
          name: prof.user?.name || "Profesional",
          headline,
          subheadline: locationText,
          bio: prof.bio || prof.slogan || "",
          photo: prof.photo,
          banner: prof.banner,
          verified: prof.verified,
          email: prof.user?.email,
          phone: prof.telefono || prof.whatsapp,
          publicToken: prof.cardPublicToken,
          profileUrl: `/profesionales/${prof.slug || prof.id}`,
          social
        },
        qrCodeDataUrl
      });
    }

    // 2. Try finding Student Profile
    let student: any = await db.studentProfile.findFirst({
      where: {
        OR: [
          ...(numId ? [{ id: numId }] : []),
          { cardPublicToken: identifier },
          { slug: identifier }
        ]
      },
      include: {
        user: true,
        university: true
      }
    });

    if (student) {
      if (!student.cardPublicToken) {
        const newToken = crypto.randomBytes(8).toString("hex");
        await db.studentProfile.update({
          where: { id: student.id },
          data: { cardPublicToken: newToken }
        });
        student.cardPublicToken = newToken;
      }

      const cardUrl = `${req.protocol}://${req.get("host")}/tarjeta/${student.cardPublicToken}`;
      const qrCodeDataUrl = await QRCode.toDataURL(cardUrl, { width: 300, margin: 2 });

      const social: any[] = [];
      if (student.linkedinUrl) social.push({ name: "LinkedIn", icon: "fa-brands fa-linkedin", url: student.linkedinUrl });
      if (student.githubUrl) social.push({ name: "GitHub", icon: "fa-brands fa-github", url: student.githubUrl });
      if (student.instagramUrl) social.push({ name: "Instagram", icon: "fa-brands fa-instagram", url: student.instagramUrl });
      if (student.websiteUrl) social.push({ name: "Sitio Web", icon: "fa-solid fa-globe", url: student.websiteUrl });

      const locationText = [student.ciudad, student.provincia].filter(Boolean).join(", ");

      return res.render("tarjeta-digital", {
        card: {
          name: student.user?.name || "Estudiante",
          headline: `${student.carrera} (${student.institucionEducativa})`,
          subheadline: locationText,
          bio: student.bio || "",
          photo: student.foto,
          banner: student.banner,
          verified: false,
          email: student.user?.email,
          phone: student.telefono,
          publicToken: student.cardPublicToken,
          profileUrl: `/estudiantes/${student.id}`,
          social
        },
        qrCodeDataUrl
      });
    }

    return res.status(404).render("404", { title: "Tarjeta no encontrada" });
  } catch (error) {
    console.error("Error loading digital card:", error);
    res.status(500).redirect("/");
  }
});

// -------------------------------------------------------------
export default router;
