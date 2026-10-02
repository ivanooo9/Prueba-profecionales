import { Router, Request, Response } from "express";
import { db } from "../lib/db";
import { StudentService } from "../services/student.service";
import { StudentIdController } from "../controllers/student/student-id.controller";
import { ProfileCompletionService } from "../services/profile-completion.service";
import { uploadBase64ToCloudinary } from "../lib/cloudinary";
import { toTitleCase } from "../lib/utils";

const router = Router();

// Middleware local: Verificar que el usuario tenga rol STUDENT o acceso a panel de estudiante
async function requireStudent(req: Request, res: Response, next: Function) {
  const user = res.locals.user;
  if (!user) {
    if (req.originalUrl.startsWith('/api/') || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({ success: false, error: "No autenticado." });
    }
    return res.redirect("/login?redirect=/student");
  }

  // Asignar req.user
  (req as any).user = user;

  // Permitir si es STUDENT o ADMIN
  const roleName = user.role?.name;
  if (roleName !== "STUDENT" && roleName !== "ADMIN") {
    if (req.originalUrl.startsWith('/api/') || req.headers.accept?.includes('application/json')) {
      return res.status(403).json({ success: false, error: "Acceso denegado." });
    }
    return res.status(403).render("preview-error", {
      title: "Acceso Denegado",
      message: "Esta sección es exclusiva para usuarios con rol de Estudiante.",
    });
  }

  // Verificar si la cuenta está suspendida
  if (user.status === "SUSPENDED") {
    if (req.originalUrl.startsWith('/api/') || req.headers.accept?.includes('application/json')) {
      return res.status(403).json({ success: false, error: "Cuenta suspendida." });
    }
    return res.status(403).render("preview-error", {
      title: "Cuenta Suspendida",
      message: "Tu cuenta de estudiante se encuentra suspendida temporalmente por administración.",
    });
  }

  next();
}

/**
 * GET /student
 * Dashboard del Estudiante
 */
router.get("/", requireStudent, async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user.id;
    const profile = await StudentService.getOrCreateStudentProfile(userId);

    // Consultar citas agendadas por el estudiante con profesionales
    const appointments = await db.appointment.findMany({
      where: { userId },
      include: {
        profile: {
          include: { user: true, specialties: { include: { specialty: true } } },
        },
      },
      orderBy: { fecha: "desc" },
    });

    // Consultar estado de solicitud de transición a profesional pendiente
    const pendingTransition = await db.roleTransitionRequest.findFirst({
      where: { userId, estado: "PENDIENTE" },
      orderBy: { fechaSolicitud: "desc" },
    });

    const profileCompletion = await ProfileCompletionService.calculateStudentCompletion(userId);
    const convenios = await db.agreement.findMany({
      where: { activo: true },
      orderBy: { orden: "asc" }
    });

    // Consultar inscripciones a cursos y conversatorios de la plataforma (ej: Curso de Medicina)
    const enrollments = await db.eventEnrollment.findMany({
      where: { userId },
      include: {
        conversatorio: {
          include: {
            speakers: true,
            certificateDesign: true
          }
        },
        curso: {
          include: {
            certificateDesign: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Consultar certificados oficiales emitidos por la plataforma
    const platformCertificates = await db.certificate.findMany({
      where: { userId },
      include: {
        conversatorio: true,
        curso: true
      },
      orderBy: { fechaEmision: "desc" }
    });

    res.render("dashboard-estudiante", {
      title: "Panel del Estudiante - Profesionales Ecuador",
      profile,
      appointments,
      pendingTransition,
      profileCompletion,
      convenios,
      enrollments,
      platformCertificates,
      isDashboard: true,
      activePage: "dashboard-estudiante",
      successMessage: req.query.success || null,
      errorMessage: req.query.error || null,
    });
  } catch (error: any) {
    console.error("Error en GET /student:", error);
    res.status(500).render("preview-error", {
      title: "Error de Servidor",
      message: error.message || "Error al cargar el panel de estudiante.",
    });
  }
});

/**
 * POST /student/profile
 * Actualizar perfil académico y personal del estudiante
 */
router.post("/profile", requireStudent, async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user.id;
    const {
      institucionEducativa,
      carrera,
      carnetEstudiante,
      estadoCarrera,
      bio,
      fotoBase64,
      bannerBase64,
      provincia,
      ciudad,
      telefono,
      linkedinUrl,
      githubUrl,
      instagramUrl,
      facebookUrl,
      twitterUrl,
      websiteUrl,
      tiktokUrl,
    } = req.body;

    if (!carnetEstudiante || typeof carnetEstudiante !== "string" || carnetEstudiante.trim() === "") {
      return res.redirect("/student?error=" + encodeURIComponent("El carnet estudiantil es obligatorio para registrar o actualizar tu perfil de estudiante."));
    }

    let fotoUrl: string | undefined = undefined;
    if (fotoBase64 && typeof fotoBase64 === "string" && fotoBase64.startsWith("data:image")) {
      fotoUrl = await uploadBase64ToCloudinary(fotoBase64, "student_photos");
    }

    let bannerUrl: string | undefined = undefined;
    if (bannerBase64 && typeof bannerBase64 === "string" && bannerBase64.startsWith("data:image")) {
      bannerUrl = await uploadBase64ToCloudinary(bannerBase64, "student_banners");
    }

    // Obtener foto previa si no se subió nueva
    const existing = await db.studentProfile.findUnique({ where: { userId } });

    await StudentService.upsertStudentProfile({
      userId,
      institucionEducativa: institucionEducativa?.trim(),
      carrera: carrera?.trim(),
      carnetEstudiante: carnetEstudiante.trim(),
      estadoCarrera: estadoCarrera || "EN_CURSO",
      bio: bio?.trim(),
      foto: fotoUrl || existing?.foto || undefined,
      banner: bannerUrl || existing?.banner || undefined,
      provincia: provincia?.trim(),
      ciudad: ciudad?.trim(),
      telefono: telefono?.trim(),
      linkedinUrl: linkedinUrl?.trim() || undefined,
      githubUrl: githubUrl?.trim() || undefined,
      instagramUrl: instagramUrl?.trim() || undefined,
      facebookUrl: facebookUrl?.trim() || undefined,
      twitterUrl: twitterUrl?.trim() || undefined,
      websiteUrl: websiteUrl?.trim() || undefined,
      tiktokUrl: tiktokUrl?.trim() || undefined,
    });

    res.redirect("/student?success=Perfil+actualizado+exitosamente");
  } catch (error: any) {
    console.error("Error en POST /student/profile:", error);
    res.redirect(`/student?error=${encodeURIComponent(error.message || "Error al actualizar perfil")}`);
  }
});

/**
 * POST /student/projects
 * Crear o editar proyecto académico/personal
 */
router.post("/projects", requireStudent, async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user.id;
    const profile = await db.studentProfile.findUnique({ where: { userId } });

    if (!profile) {
      return res.redirect("/student?error=Primero+debes+configurar+tu+perfil+de+estudiante");
    }

    const { id, titulo, descripcion, areaTecnologia, enlaceRepo, imagenBase64, imagenesBase64 } = req.body;

    const uploadedImages: string[] = [];
    let base64Array: string[] = [];

    if (Array.isArray(imagenesBase64)) {
      base64Array = imagenesBase64;
    } else if (typeof imagenesBase64 === "string" && imagenesBase64.trim() !== "") {
      try {
        const parsed = JSON.parse(imagenesBase64);
        if (Array.isArray(parsed)) base64Array = parsed;
        else base64Array = [imagenesBase64];
      } catch (e) {
        base64Array = [imagenesBase64];
      }
    }

    if (imagenBase64 && typeof imagenBase64 === "string" && imagenBase64.startsWith("data:")) {
      base64Array.unshift(imagenBase64);
    }

    // Limit to max 5 images
    base64Array = base64Array.slice(0, 5);

    for (const b64 of base64Array) {
      if (b64 && typeof b64 === "string" && b64.startsWith("data:")) {
        const url = await uploadBase64ToCloudinary(b64, "student_projects");
        if (url) uploadedImages.push(url);
      } else if (b64 && typeof b64 === "string" && b64.startsWith("http")) {
        uploadedImages.push(b64);
      }
    }

    const imagenUrl = uploadedImages.length > 0 ? uploadedImages[0] : undefined;

    await StudentService.saveStudentProject({
      id: id ? parseInt(id) : undefined,
      studentProfileId: profile.id,
      titulo: titulo?.trim(),
      descripcion: descripcion?.trim(),
      areaTecnologia: areaTecnologia?.trim(),
      enlaceRepo: enlaceRepo?.trim(),
      imagenUrl,
      imagenes: uploadedImages,
    });

    res.redirect("/student?success=Proyecto+guardado+correctamente");
  } catch (error: any) {
    console.error("Error en POST /student/projects:", error);
    res.redirect(`/student?error=${encodeURIComponent(error.message || "Error al guardar proyecto")}`);
  }
});

/**
 * POST /student/projects/:id/delete
 */
router.post("/projects/:id/delete", requireStudent, async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user.id;
    const profile = await db.studentProfile.findUnique({ where: { userId } });
    if (profile) {
      const projId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
      await StudentService.deleteStudentProject(projId, profile.id);
    }
    res.redirect("/student?success=Proyecto+eliminado");
  } catch (error: any) {
    res.redirect(`/student?error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * POST /student/external-courses
 * Agregar curso externo realizado fuera de la plataforma
 */
router.post("/external-courses", requireStudent, async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user.id;
    const profile = await db.studentProfile.findUnique({ where: { userId } });

    if (!profile) {
      return res.redirect("/student?error=Perfil+no+encontrado");
    }

    const { id, institucion, nombreCurso, horas, anioEmision, certificadoBase64 } = req.body;

    let certificadoUrl: string | undefined = undefined;
    if (certificadoBase64 && typeof certificadoBase64 === "string" && certificadoBase64.startsWith("data:")) {
      certificadoUrl = await uploadBase64ToCloudinary(certificadoBase64, "student_external_certificates");
    }

    await StudentService.saveExternalCourse({
      id: id ? parseInt(id) : undefined,
      studentProfileId: profile.id,
      institucion: institucion?.trim(),
      nombreCurso: nombreCurso?.trim(),
      horas: horas ? parseInt(horas) : undefined,
      anioEmision: anioEmision ? parseInt(anioEmision) : undefined,
      certificadoUrl,
    });

    res.redirect("/student?success=Curso+externo+registrado+exitosamente");
  } catch (error: any) {
    console.error("Error en POST /student/external-courses:", error);
    res.redirect(`/student?error=${encodeURIComponent(error.message || "Error al registrar curso")}`);
  }
});

/**
 * POST /student/external-courses/:id/delete
 */
router.post("/external-courses/:id/delete", requireStudent, async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user.id;
    const profile = await db.studentProfile.findUnique({ where: { userId } });
    if (profile) {
      const courseId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
      await StudentService.deleteExternalCourse(courseId, profile.id);
    }
    res.redirect("/student?success=Curso+externo+eliminado");
  } catch (error: any) {
    res.redirect(`/student?error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * POST /student/experiences
 * Agregar pasantía preprofesional o experiencia laboral
 */
router.post("/experiences", requireStudent, async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user.id;
    const profile = await db.studentProfile.findUnique({ where: { userId } });

    if (!profile) {
      return res.redirect("/student?error=Perfil+no+encontrado");
    }

    const {
      id,
      tipo,
      empresaInstitucion,
      cargo,
      fechaInicio,
      fechaFin,
      actualmenteTrabajando,
      descripcionFunciones,
      imagenesBase64,
    } = req.body;

    const uploadedImages: string[] = [];
    let base64Array: string[] = [];

    if (Array.isArray(imagenesBase64)) {
      base64Array = imagenesBase64;
    } else if (typeof imagenesBase64 === "string" && imagenesBase64.trim() !== "") {
      try {
        const parsed = JSON.parse(imagenesBase64);
        if (Array.isArray(parsed)) base64Array = parsed;
        else base64Array = [imagenesBase64];
      } catch (e) {
        base64Array = [imagenesBase64];
      }
    }

    // Limit to maximum 5 photos
    base64Array = base64Array.slice(0, 5);

    for (const b64 of base64Array) {
      if (b64 && typeof b64 === "string" && b64.startsWith("data:")) {
        const url = await uploadBase64ToCloudinary(b64, "student_experiences");
        if (url) uploadedImages.push(url);
      } else if (b64 && typeof b64 === "string" && b64.startsWith("http")) {
        uploadedImages.push(b64);
      }
    }

    await StudentService.saveStudentExperience({
      id: id ? parseInt(id) : undefined,
      studentProfileId: profile.id,
      tipo: tipo || "PASANTIA_PREPROFESIONAL",
      empresaInstitucion: empresaInstitucion?.trim(),
      cargo: cargo?.trim(),
      fechaInicio: fechaInicio ? new Date(fechaInicio) : undefined,
      fechaFin: fechaFin ? new Date(fechaFin) : undefined,
      actualmenteTrabajando: actualmenteTrabajando === "true" || actualmenteTrabajando === true,
      descripcionFunciones: descripcionFunciones?.trim(),
      imagenes: uploadedImages,
    });

    res.redirect("/student?success=Experiencia+o+pasantía+registrada");
  } catch (error: any) {
    console.error("Error en POST /student/experiences:", error);
    res.redirect(`/student?error=${encodeURIComponent(error.message || "Error al registrar experiencia")}`);
  }
});

/**
 * POST /student/experiences/:id/delete
 */
router.post("/experiences/:id/delete", requireStudent, async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user.id;
    const profile = await db.studentProfile.findUnique({ where: { userId } });
    if (profile) {
      const expId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
      await StudentService.deleteStudentExperience(expId, profile.id);
    }
    res.redirect("/student?success=Experiencia+eliminada");
  } catch (error: any) {
    res.redirect(`/student?error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * POST /student/request-transition
 * Solicitar paso a Rol Profesional (Estudiante -> Profesional)
 */
router.post("/request-transition", requireStudent, async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user.id;
    const userRole = res.locals.user.role?.name || "STUDENT";
    const { motivoSolicitud, tituloCertificadoBase64 } = req.body;

    let docUrl: string | undefined = undefined;
    if (tituloCertificadoBase64 && typeof tituloCertificadoBase64 === "string" && tituloCertificadoBase64.startsWith("data:")) {
      docUrl = await uploadBase64ToCloudinary(tituloCertificadoBase64, "role_transition_docs");
    }

    if (!docUrl) {
      return res.redirect("/student?error=" + encodeURIComponent("Es obligatorio adjuntar la foto o PDF de tu título profesional o acta de grado para realizar la solicitud."));
    }

    await StudentService.requestRoleTransition({
      userId,
      currentRole: userRole,
      targetRole: "PROFESSIONAL",
      motivoSolicitud: motivoSolicitud?.trim(),
      tituloCertificadoUrl: docUrl,
    });

    res.redirect("/student?success=Solicitud+de+cambio+a+Perfil+Profesional+enviada+al+Administrador+exitosamente");
  } catch (error: any) {
    console.error("Error en POST /student/request-transition:", error);
    res.redirect(`/student?error=${encodeURIComponent(error.message || "Error al solicitar cambio de rol")}`);
  }
});

/**
 * POST /student/configurar-nombre
 * Actualizar el nombre que constará en los certificados del estudiante (con restricción de 60 días)
 */
router.post("/configurar-nombre", requireStudent, async (req: Request, res: Response) => {
  const user = res.locals.user;
  const { nombreCertificado } = req.body;

  if (!nombreCertificado || typeof nombreCertificado !== "string" || nombreCertificado.trim() === "") {
    return res.status(400).json({ success: false, error: "El nombre no puede estar vacío." });
  }

  try {
    const dbUser = await db.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      return res.status(404).json({ success: false, error: "Usuario no encontrado." });
    }

    const now = new Date();
    if (dbUser.lastCertNameUpdate) {
      const lastUpdate = new Date(dbUser.lastCertNameUpdate);
      const msPerDay = 24 * 60 * 60 * 1000;
      const diffDays = (now.getTime() - lastUpdate.getTime()) / msPerDay;
      if (diffDays < 60) {
        const daysRemaining = Math.ceil(60 - diffDays);
        return res.status(400).json({
          success: false,
          error: `Solo puedes cambiar el nombre de tus certificados una vez cada 60 días. Faltan ${daysRemaining} días.`
        });
      }
    }

    const formattedName = toTitleCase(nombreCertificado);

    await db.user.update({
      where: { id: user.id },
      data: {
        nombreCertificado: formattedName,
        lastCertNameUpdate: now
      }
    });

    return res.json({ success: true, message: "Nombre de certificado actualizado correctamente." });
  } catch (error) {
    console.error("Error updating student certificate name:", error);
    return res.status(500).json({ success: false, error: "Error interno al actualizar el nombre del certificado." });
  }
});

// -------------------------------------------------------------
// Rutas API de Estudiantes ID (profesionales.ec/e/@estudiante)
// -------------------------------------------------------------
router.get("/id/config", requireStudent, StudentIdController.getDashboardConfig);
router.post("/id/config", requireStudent, StudentIdController.updateConfig);
router.post("/id/links", requireStudent, StudentIdController.upsertLink);
router.delete("/id/links/:id", requireStudent, StudentIdController.deleteLink);
router.post("/id/links/reorder", requireStudent, StudentIdController.reorderLinks);
router.post("/id/blocks", requireStudent, StudentIdController.upsertBlock);
router.delete("/id/blocks/:id", requireStudent, StudentIdController.deleteBlock);

export default router;
