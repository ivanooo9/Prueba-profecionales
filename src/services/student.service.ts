import { db } from "../lib/db";

export interface CreateStudentProfileInput {
  userId: number;
  institucionEducativa: string;
  carrera: string;
  carnetEstudiante?: string;
  estadoCarrera?: string;
  bio?: string;
  foto?: string;
  banner?: string;
  provincia?: string;
  ciudad?: string;
  telefono?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  twitterUrl?: string;
  websiteUrl?: string;
  tiktokUrl?: string;
}

export interface StudentProjectInput {
  id?: number;
  studentProfileId: number;
  titulo: string;
  descripcion?: string;
  areaTecnologia?: string;
  enlaceRepo?: string;
  imagenUrl?: string;
  imagenes?: string[];
  fechaRealizacion?: Date;
}

export interface StudentExternalCourseInput {
  id?: number;
  studentProfileId: number;
  institucion: string;
  nombreCurso: string;
  horas?: number;
  anioEmision?: number;
  certificadoUrl?: string;
}

export interface StudentExperienceInput {
  id?: number;
  studentProfileId: number;
  tipo?: string;
  empresaInstitucion: string;
  cargo: string;
  fechaInicio?: Date;
  fechaFin?: Date;
  actualmenteTrabajando?: boolean;
  descripcionFunciones?: string;
  imagenes?: string[];
}

export class StudentService {
  /**
   * Obtener o crear Perfil de Estudiante para un usuario
   */
  static async getOrCreateStudentProfile(userId: number) {
    let profile = await db.studentProfile.findUnique({
      where: { userId },
      include: {
        projects: { orderBy: { createdAt: "desc" } },
        externalCourses: { orderBy: { createdAt: "desc" } },
        experiences: { orderBy: { createdAt: "desc" } },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            telefono: true,
            ciudad: true,
            certificates: {
              include: {
                curso: { select: { id: true, titulo: true, slug: true } },
              },
            },
            acquiredCertificates: {
              include: {
                conversatorio: { select: { id: true, titulo: true, slug: true } },
              },
            },
          },
        },
      },
    });

    if (!profile) {
      const userObj = await db.user.findUnique({
        where: { id: userId },
        select: { ciudad: true, telefono: true }
      });

      await db.studentProfile.create({
        data: {
          userId,
          institucionEducativa: "Universidad / Instituto",
          carrera: "Carrera / Especialidad",
          estadoCarrera: "EN_CURSO",
          ciudad: userObj?.ciudad || undefined,
          telefono: userObj?.telefono || undefined
        }
      });

      profile = await db.studentProfile.findUnique({
        where: { userId },
        include: {
          projects: { orderBy: { createdAt: "desc" } },
          externalCourses: { orderBy: { createdAt: "desc" } },
          experiences: { orderBy: { createdAt: "desc" } },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              status: true,
              telefono: true,
              ciudad: true,
              certificates: {
                include: {
                  curso: { select: { id: true, titulo: true, slug: true } },
                },
              },
              acquiredCertificates: {
                include: {
                  conversatorio: { select: { id: true, titulo: true, slug: true } },
                },
              },
            },
          },
        },
      });
    }

    return profile;
  }

  /**
   * Crear o actualizar información del Perfil de Estudiante
   */
  static async upsertStudentProfile(data: CreateStudentProfileInput) {
    const profile = await db.studentProfile.upsert({
      where: { userId: data.userId },
      update: {
        institucionEducativa: data.institucionEducativa,
        carrera: data.carrera,
        carnetEstudiante: data.carnetEstudiante,
        estadoCarrera: data.estadoCarrera || "EN_CURSO",
        bio: data.bio,
        foto: data.foto,
        banner: data.banner,
        provincia: data.provincia,
        ciudad: data.ciudad,
        telefono: data.telefono,
        linkedinUrl: data.linkedinUrl,
        githubUrl: data.githubUrl,
        instagramUrl: data.instagramUrl,
        facebookUrl: data.facebookUrl,
        twitterUrl: data.twitterUrl,
        websiteUrl: data.websiteUrl,
        tiktokUrl: data.tiktokUrl,
      },
      create: {
        userId: data.userId,
        institucionEducativa: data.institucionEducativa,
        carrera: data.carrera,
        carnetEstudiante: data.carnetEstudiante,
        estadoCarrera: data.estadoCarrera || "EN_CURSO",
        bio: data.bio,
        foto: data.foto,
        banner: data.banner,
        provincia: data.provincia,
        ciudad: data.ciudad,
        telefono: data.telefono,
        linkedinUrl: data.linkedinUrl,
        githubUrl: data.githubUrl,
        instagramUrl: data.instagramUrl,
        facebookUrl: data.facebookUrl,
        twitterUrl: data.twitterUrl,
        websiteUrl: data.websiteUrl,
        tiktokUrl: data.tiktokUrl,
      },
    });

    return profile;
  }

  /**
   * Agregar o editar un Proyecto de Estudiante
   */
  static async saveStudentProject(data: StudentProjectInput) {
    if (data.id) {
      return await db.studentProject.update({
        where: { id: data.id },
        data: {
          titulo: data.titulo,
          descripcion: data.descripcion,
          areaTecnologia: data.areaTecnologia,
          enlaceRepo: data.enlaceRepo,
          imagenUrl: data.imagenUrl,
          imagenes: data.imagenes || [],
          fechaRealizacion: data.fechaRealizacion,
        },
      });
    }

    return await db.studentProject.create({
      data: {
        studentProfileId: data.studentProfileId,
        titulo: data.titulo,
        descripcion: data.descripcion,
        areaTecnologia: data.areaTecnologia,
        enlaceRepo: data.enlaceRepo,
        imagenUrl: data.imagenUrl,
        imagenes: data.imagenes || [],
        fechaRealizacion: data.fechaRealizacion,
      },
    });
  }

  /**
   * Eliminar un Proyecto de Estudiante
   */
  static async deleteStudentProject(id: number, studentProfileId: number) {
    return await db.studentProject.deleteMany({
      where: { id, studentProfileId },
    });
  }

  /**
   * Agregar o editar un Curso Externo del Estudiante
   */
  static async saveExternalCourse(data: StudentExternalCourseInput) {
    if (data.id) {
      return await db.studentExternalCourse.update({
        where: { id: data.id },
        data: {
          institucion: data.institucion,
          nombreCurso: data.nombreCurso,
          horas: data.horas,
          anioEmision: data.anioEmision,
          certificadoUrl: data.certificadoUrl,
        },
      });
    }

    return await db.studentExternalCourse.create({
      data: {
        studentProfileId: data.studentProfileId,
        institucion: data.institucion,
        nombreCurso: data.nombreCurso,
        horas: data.horas,
        anioEmision: data.anioEmision,
        certificadoUrl: data.certificadoUrl,
      },
    });
  }

  /**
   * Eliminar un Curso Externo
   */
  static async deleteExternalCourse(id: number, studentProfileId: number) {
    return await db.studentExternalCourse.deleteMany({
      where: { id, studentProfileId },
    });
  }

  /**
   * Agregar o editar Pasantías / Experiencia Laboral
   */
  static async saveStudentExperience(data: StudentExperienceInput) {
    if (data.id) {
      return await db.studentExperience.update({
        where: { id: data.id },
        data: {
          tipo: data.tipo || "PASANTIA_PREPROFESIONAL",
          empresaInstitucion: data.empresaInstitucion,
          cargo: data.cargo,
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaFin,
          actualmenteTrabajando: data.actualmenteTrabajando || false,
          descripcionFunciones: data.descripcionFunciones,
          ...(data.imagenes ? { imagenes: data.imagenes } : {}),
        },
      });
    }

    return await db.studentExperience.create({
      data: {
        studentProfileId: data.studentProfileId,
        tipo: data.tipo || "PASANTIA_PREPROFESIONAL",
        empresaInstitucion: data.empresaInstitucion,
        cargo: data.cargo,
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
        actualmenteTrabajando: data.actualmenteTrabajando || false,
        descripcionFunciones: data.descripcionFunciones,
        imagenes: data.imagenes || [],
      },
    });
  }

  /**
   * Eliminar Experiencia / Pasantía
   */
  static async deleteStudentExperience(id: number, studentProfileId: number) {
    return await db.studentExperience.deleteMany({
      where: { id, studentProfileId },
    });
  }

  /**
   * Calcular Precio con Descuento para Estudiante
   */
  static calculateStudentPrice(originalPrice: number, descuentoUsd: number = 0) {
    if (!originalPrice || originalPrice <= 0) {
      return { finalPrice: 0, discountApplied: 0 };
    }
    const discountApplied = Math.min(originalPrice, Math.max(0, descuentoUsd));
    const finalPrice = Math.max(0, originalPrice - discountApplied);
    return { finalPrice, discountApplied };
  }

  /**
   * Solicitar Transición de Rol a Profesional (Estudiante o Cliente -> Profesional)
   */
  static async requestRoleTransition(data: {
    userId: number;
    currentRole: string;
    targetRole?: string;
    motivoSolicitud?: string;
    tituloCertificadoUrl?: string;
  }) {
    // Verificar si ya existe una solicitud pendiente
    const existingPending = await db.roleTransitionRequest.findFirst({
      where: {
        userId: data.userId,
        estado: "PENDIENTE",
      },
    });

    const target = data.targetRole || "PROFESSIONAL";

    // Requerir documento obligatorio según el rol solicitado
    if (!data.tituloCertificadoUrl) {
      if (target === "STUDENT") {
        throw new Error("Es obligatorio adjuntar una foto o PDF de tu carnet estudiantil o certificado de matrícula.");
      } else {
        throw new Error("Es obligatorio adjuntar una foto o documento de tu título profesional o acta de grado.");
      }
    }

    if (existingPending) {
      throw new Error("Ya tienes una solicitud de cambio de rol pendiente de aprobación.");
    }

    return await db.roleTransitionRequest.create({
      data: {
        userId: data.userId,
        currentRole: data.currentRole,
        targetRole: data.targetRole || "PROFESSIONAL",
        motivoSolicitud: data.motivoSolicitud,
        tituloCertificadoUrl: data.tituloCertificadoUrl,
        estado: "PENDIENTE",
      },
    });
  }

  /**
   * Sincronizar/migrar automáticamente los datos del usuario o StudentProfile a ProfessionalProfile y ProfessionalEducation
   */
  static async syncStudentToProfessionalProfile(userId: number, customTx?: any) {
    const prisma = customTx || db;
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        projects: true,
        externalCourses: true,
        experiences: true,
      },
    });

    const userObj = await prisma.user.findUnique({ where: { id: userId } });
    if (!userObj) return null;

    const roleTransition = await prisma.roleTransitionRequest.findFirst({
      where: { userId, targetRole: "PROFESSIONAL" },
      orderBy: { fechaSolicitud: "desc" }
    });

    let profProfile = await prisma.professionalProfile.findUnique({
      where: { userId }
    });

    const defaultSlogan = studentProfile?.carrera
      ? `Profesional en ${studentProfile.carrera}`
      : "Profesional Registrado";

    if (!profProfile) {
      const { getUniqueSlug } = require("../lib/slug");
      const uniqueSlug = await getUniqueSlug("professionalProfile", userObj.name);
      profProfile = await prisma.professionalProfile.create({
        data: {
          userId,
          slug: uniqueSlug,
          status: "APROBADO",
          planType: "PROFESIONAL",
          slogan: defaultSlogan,
          bio: studentProfile?.bio || null,
          photo: studentProfile?.foto || null,
          banner: studentProfile?.banner || null,
          provincia: studentProfile?.provincia || null,
          ciudad: studentProfile?.ciudad || userObj.ciudad || null,
          telefono: studentProfile?.telefono || userObj.telefono || null,
          linkedin: studentProfile?.linkedinUrl || null,
          instagram: studentProfile?.instagramUrl || null,
          xTwitter: studentProfile?.twitterUrl || null,
          facebook: studentProfile?.facebookUrl || null,
          website: studentProfile?.websiteUrl || null,
          tiktok: studentProfile?.tiktokUrl || null,
        }
      });
    } else {
      profProfile = await prisma.professionalProfile.update({
        where: { id: profProfile.id },
        data: {
          slogan: profProfile.slogan || defaultSlogan,
          bio: profProfile.bio || studentProfile?.bio || null,
          photo: profProfile.photo || studentProfile?.foto || null,
          banner: profProfile.banner || studentProfile?.banner || null,
          provincia: profProfile.provincia || studentProfile?.provincia || userObj.ciudad || null,
          ciudad: profProfile.ciudad || studentProfile?.ciudad || userObj.ciudad || null,
          telefono: profProfile.telefono || studentProfile?.telefono || userObj.telefono || null,
          linkedin: profProfile.linkedin || studentProfile?.linkedinUrl || null,
          instagram: profProfile.instagram || studentProfile?.instagramUrl || null,
          xTwitter: profProfile.xTwitter || studentProfile?.twitterUrl || null,
          facebook: profProfile.facebook || studentProfile?.facebookUrl || null,
          website: profProfile.website || studentProfile?.websiteUrl || null,
          tiktok: profProfile.tiktok || studentProfile?.tiktokUrl || null,
        }
      });
    }

    // Migrar Título / Certificado de Solicitud
    if (roleTransition?.tituloCertificadoUrl) {
      const existingEdu = await prisma.professionalEducation.findFirst({
        where: { profileId: profProfile.id, tipo: "TITULO_ACADEMICO" }
      });
      if (!existingEdu) {
        await prisma.professionalEducation.create({
          data: {
            profileId: profProfile.id,
            tipo: "TITULO_ACADEMICO",
            titulo: studentProfile?.carrera ? `Título en ${studentProfile.carrera}` : "Título Profesional / Acta de Grado",
            institucion: studentProfile?.institucionEducativa || "Institución de Educación Superior",
            anioEmision: new Date().getFullYear(),
            imagen: roleTransition.tituloCertificadoUrl,
            verificado: true,
          }
        });
      } else if (!existingEdu.imagen && roleTransition.tituloCertificadoUrl) {
        await prisma.professionalEducation.update({
          where: { id: existingEdu.id },
          data: { imagen: roleTransition.tituloCertificadoUrl }
        });
      }
    }

    // Migrar Cursos Externos del estudiante si existen
    if (studentProfile?.externalCourses) {
      for (const course of studentProfile.externalCourses) {
        const img = course.certificadoUrl || roleTransition?.tituloCertificadoUrl || "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=400";
        const exists = await prisma.professionalEducation.findFirst({
          where: { profileId: profProfile.id, titulo: course.nombreCurso }
        });
        if (!exists) {
          await prisma.professionalEducation.create({
            data: {
              profileId: profProfile.id,
              tipo: "CURSO_SEMINARIO",
              titulo: course.nombreCurso,
              institucion: course.institucion || "Certificación Externa",
              horas: course.horas || null,
              anioEmision: course.anioEmision || new Date().getFullYear(),
              imagen: img,
              verificado: true,
            }
          });
        } else if (!exists.imagen || exists.imagen === "") {
          await prisma.professionalEducation.update({
            where: { id: exists.id },
            data: { imagen: img }
          });
        }
      }
    }

    // Migrar Proyectos Académicos del estudiante si existen
    if (studentProfile?.projects) {
      for (const project of studentProfile.projects) {
        const img = (project.imagenes && project.imagenes.length > 0 ? project.imagenes[0] : project.imagenUrl) || roleTransition?.tituloCertificadoUrl || "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=400";
        const exists = await prisma.professionalEducation.findFirst({
          where: { profileId: profProfile.id, titulo: project.titulo }
        });
        if (!exists) {
          await prisma.professionalEducation.create({
            data: {
              profileId: profProfile.id,
              tipo: "PROYECTO_ESTUDIANTIL",
              titulo: project.titulo,
              institucion: project.areaTecnologia || "Proyecto Universitario",
              anioEmision: project.fechaRealizacion ? project.fechaRealizacion.getFullYear() : new Date().getFullYear(),
              imagen: img,
              verificado: true,
            }
          });
        }
      }
    }

    // Migrar Pasantías / Experiencias del estudiante si existen
    if (studentProfile?.experiences) {
      for (const exp of studentProfile.experiences) {
        const img = (exp.imagenes && exp.imagenes.length > 0 ? exp.imagenes[0] : null) || roleTransition?.tituloCertificadoUrl || "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=400";
        const expTitle = `${exp.cargo} - ${exp.empresaInstitucion}`;
        const eduTipo = exp.tipo === "EXPERIENCIA_LABORAL" ? "EXPERIENCIA_LABORAL" : "PASANTIA_PREPROFESIONAL";
        const exists = await prisma.professionalEducation.findFirst({
          where: { profileId: profProfile.id, titulo: expTitle }
        });
        if (!exists) {
          await prisma.professionalEducation.create({
            data: {
              profileId: profProfile.id,
              tipo: eduTipo,
              titulo: expTitle,
              institucion: exp.empresaInstitucion,
              anioEmision: exp.fechaInicio ? exp.fechaInicio.getFullYear() : new Date().getFullYear(),
              imagen: img,
              verificado: true,
            }
          });
        }
      }
    }

    // Migrar Certificados Obtenidos en la Plataforma (Certificate)
    const platformCertificates = await prisma.certificate.findMany({
      where: { userId, estado: "APROBADO" },
      include: { curso: true, conversatorio: true }
    });

    for (const cert of platformCertificates) {
      const certTitle = cert.nombreEvento || cert.curso?.titulo || cert.conversatorio?.titulo || "Certificado Aprobado";
      const inst = cert.curso ? "Profesionales Ecuador - Curso" : "Profesionales Ecuador - Conversatorio";
      const img = cert.conversatorio?.imagen || cert.curso?.portada || roleTransition?.tituloCertificadoUrl || "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=400";

      const exists = await prisma.professionalEducation.findFirst({
        where: { profileId: profProfile.id, titulo: certTitle }
      });
      if (!exists) {
        await prisma.professionalEducation.create({
          data: {
            profileId: profProfile.id,
            tipo: "CURSO_SEMINARIO",
            titulo: certTitle,
            institucion: inst,
            horas: cert.horas || null,
            anioEmision: cert.fechaEmision ? cert.fechaEmision.getFullYear() : new Date().getFullYear(),
            imagen: img,
            verificado: true,
          }
        });
      }
    }

    // Sincronizar Agenda de Citas (Appointments) reservadas por el usuario hacia su nueva agenda profesional
    await prisma.appointment.updateMany({
      where: { userId },
      data: { profileId: profProfile.id }
    });

    // Evolución de Estudiantes ID (@estudiante) hacia Profesionales ID (@profesional) si existía perfil de estudiante
    if (studentProfile) {
      const studentIdObj = await prisma.studentId.findUnique({
        where: { studentProfileId: studentProfile.id },
        include: { links: true, blocks: true }
      });

      if (studentIdObj) {
        let profIdObj = await prisma.professionalId.findUnique({
          where: { professionalProfileId: profProfile.id }
        });

        let targetSlug = studentIdObj.slug;
        if (await prisma.professionalId.findUnique({ where: { slug: targetSlug } })) {
          targetSlug = `${studentIdObj.slug}-prof`;
        }

        if (!profIdObj) {
          profIdObj = await prisma.professionalId.create({
            data: {
              professionalProfileId: profProfile.id,
              slug: targetSlug,
              shortDescription: studentIdObj.shortDescription || profProfile.slogan,
              primaryActionType: "WHATSAPP",
              primaryActionTitle: "Escríbeme por WhatsApp",
              theme: studentIdObj.theme === 'academic_blue' ? 'light' : studentIdObj.theme,
              buttonStyle: studentIdObj.buttonStyle,
              alignment: studentIdObj.alignment,
              isActive: true
            }
          });

          // Migrar botones de StudentId a ProfessionalId
          for (const link of studentIdObj.links) {
            await prisma.professionalIdLink.create({
              data: {
                professionalId: profIdObj.id,
                type: link.type === 'CV' ? 'DOCUMENT' : (link.type === 'PROFILE' ? 'PROFILE' : link.type),
                title: link.title,
                icon: link.icon,
                url: link.url,
                sortOrder: link.sortOrder,
                isActive: link.isActive,
                clicksCount: link.clicksCount
              }
            });
          }

          // Migrar bloques de StudentId a ProfessionalId
          for (const block of studentIdObj.blocks) {
            await prisma.professionalIdBlock.create({
              data: {
                professionalId: profIdObj.id,
                type: "PROMOTION",
                title: block.title,
                description: block.description,
                image: block.image,
                buttonText: block.buttonText,
                url: block.url,
                sortOrder: block.sortOrder,
                isActive: block.isActive
              }
            });
          }
        }
      }
    }

    return profProfile;
  }

  /**
   * Administrador: Aprobar Transición de Rol a Profesional o Estudiante
   */
  static async approveRoleTransition(requestId: number, adminObservacion?: string) {
    return await db.$transaction(async (tx) => {
      const request = await tx.roleTransitionRequest.findUnique({
        where: { id: requestId },
        include: { user: { include: { role: true } } },
      });

      if (!request) {
        throw new Error("Solicitud no encontrada.");
      }

      if (request.estado !== "PENDIENTE") {
        throw new Error("La solicitud ya ha sido procesada previamente.");
      }

      // Buscar o asegurar el Rol según el targetRole de la solicitud
      const targetRoleName = request.targetRole || "PROFESSIONAL";
      const targetRole = await tx.role.findUnique({
        where: { name: targetRoleName },
      });

      if (!targetRole) {
        throw new Error(`El rol '${targetRoleName}' no está configurado en el sistema.`);
      }

      // Ruta de destino según el rol aprobado
      const isProf = targetRoleName === "PROFESSIONAL";
      const isStud = targetRoleName === "STUDENT";
      const targetDashboard = isProf
        ? "/registro-profesional?planId=1"
        : isStud
          ? "/student"
          : "/dashboard/cliente";

      // Actualizar el rol del usuario y forzar configuración de perfil
      await tx.user.update({
        where: { id: request.userId },
        data: {
          roleId: targetRole.id,
          requireProfileSetup: true,
          setupRedirectUrl: targetDashboard,
        },
      });

      if (targetRoleName === "PROFESSIONAL") {
        await StudentService.syncStudentToProfessionalProfile(request.userId, tx);
      } else if (targetRoleName === "STUDENT") {
        // Crear Perfil Estudiante inicial si no existe
        const existingStudentProfile = await tx.studentProfile.findUnique({
          where: { userId: request.userId },
        });

        if (!existingStudentProfile) {
          const { getUniqueSlug } = require("../lib/slug");
          const studentSlug = await getUniqueSlug("studentProfile", request.user.name);
          await tx.studentProfile.create({
            data: {
              userId: request.userId,
              slug: studentSlug,
              institucionEducativa: "Universidad / Instituto por definir",
              carrera: "Carrera por definir",
              estadoCarrera: "EN_CURSO",
            },
          });
        }
      }

      // Actualizar estado de la solicitud
      const updatedRequest = await tx.roleTransitionRequest.update({
        where: { id: requestId },
        data: {
          estado: "APROBADO",
          adminObservacion,
          fechaProcesado: new Date(),
        },
      });

      return updatedRequest;
    });
  }

  /**
   * Administrador: Rechazar Transición de Rol
   */
  static async rejectRoleTransition(requestId: number, adminObservacion?: string) {
    const request = await db.roleTransitionRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.estado !== "PENDIENTE") {
      throw new Error("Solicitud inválida o ya procesada.");
    }

    return await db.roleTransitionRequest.update({
      where: { id: requestId },
      data: {
        estado: "RECHAZADO",
        adminObservacion: adminObservacion || "Solicitud no aprobada por el administrador.",
        fechaProcesado: new Date(),
      },
    });
  }

  /**
   * Administrador: Listar estudiantes registrados en la plataforma
   */
  static async getStudentsListForAdmin() {
    return await db.user.findMany({
      where: {
        role: {
          name: "STUDENT",
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        telefono: true,
        ciudad: true,
        createdAt: true,
        studentProfile: {
          select: {
            id: true,
            institucionEducativa: true,
            carrera: true,
            estadoCarrera: true,
            foto: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Administrador: Suspender o Reactivar Cuenta de Estudiante
   */
  static async toggleStudentAccountStatus(userId: number, status: "ACTIVE" | "SUSPENDED") {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || user.role.name !== "STUDENT") {
      throw new Error("Usuario no encontrado o no posee rol de Estudiante.");
    }

    return await db.user.update({
      where: { id: userId },
      data: { status },
    });
  }

  /**
   * Administrador: Eliminar cuenta de Estudiante completamente (liberando su email)
   */
  static async deleteStudentAccount(userId: number) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || user.role.name !== "STUDENT") {
      throw new Error("Usuario no encontrado o no posee rol de Estudiante.");
    }

    await db.$transaction(async (tx) => {
      // 1. Borrar Perfil de Estudiante y sus relaciones (proyectos, cursos externos, experiencias)
      const studentProfile = await tx.studentProfile.findUnique({ where: { userId } });
      if (studentProfile) {
        await tx.studentProject.deleteMany({ where: { studentProfileId: studentProfile.id } });
        await tx.studentExternalCourse.deleteMany({ where: { studentProfileId: studentProfile.id } });
        await tx.studentExperience.deleteMany({ where: { studentProfileId: studentProfile.id } });
        await tx.studentProfile.delete({ where: { id: studentProfile.id } });
      }

      // 2. Solicitudes de cambio de rol
      await tx.roleTransitionRequest.deleteMany({ where: { userId } });

      // 3. Certificados asociados al usuario
      await tx.certificate.deleteMany({ where: { userId } });
      await tx.cursoCertificate.deleteMany({ where: { userId } });

      // 4. Sesiones, logs de auditoría, transacciones, inscripciones y citas agendadas
      await tx.userSession.deleteMany({ where: { userId } });
      await tx.auditLog.deleteMany({ where: { userId } });
      await tx.payPhoneTransaction.deleteMany({ where: { userId } });
      await tx.eventAccessLog.deleteMany({ where: { userId } });
      await tx.eventEnrollment.deleteMany({ where: { userId } });
      await tx.cursoSubmission.deleteMany({ where: { userId } });
      await tx.appointment.deleteMany({ where: { userId } });
      await tx.referralProfile.deleteMany({ where: { userId } });

      // 5. Borrar usuario principal de la BD (libera email)
      await tx.user.delete({ where: { id: userId } });
    });
  }
}
