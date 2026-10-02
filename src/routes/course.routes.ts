import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { db } from "../lib/db";
import { generateInvoiceXml } from "../lib/sri/xml-generator";
import { signDocument } from "../lib/sri/sri-signer";
import { SriClient } from "../lib/sri/sri-client";
import { generateRidePdf } from "../lib/sri/ride-generator";
import { sendInvoiceEmail, sendAppointmentEmail, sendCredentialsEmail, sendEnrollmentNotificationEmail, emailService } from "../lib/email";
import { uploadBase64ToCloudinary } from "../lib/cloudinary";
import {
  buildBankAccountSnapshot,
  findActiveBankAccountById,
  formatBankAccountLabel,
  getActiveBankAccounts,
  parseSubmittedBankAccountId,
} from "../lib/bank-accounts";
import { toTitleCase } from "../lib/utils";
import { requireAdmin, requireProfessional, requireClient } from "../lib/middlewares";
import { getUniqueSlug, generateSlug } from "../lib/slug";
import { cachedFetch, cacheKeyFactory as cacheKey } from "../lib/cache";

const router = express.Router();
const sriClient = new SriClient();

const getSystemConfig = () =>
  cachedFetch(cacheKey.systemConfig.singleton(), () =>
    db.systemConfig.findUnique({ where: { id: 1 } })
  );

// CURSOS - AULA VIRTUAL & CURRICULUM CRUD API ROUTES
// -------------------------------------------------------------

// GET Route: Public Course Detail
router.get("/cursos/:idOrSlug", async (req: Request, res: Response) => {
  const param = req.params.idOrSlug as string;
  const cursoId = parseInt(param, 10);
  try {
    let curso = null;

    if (!isNaN(cursoId)) {
      curso = await db.curso.findUnique({
        where: { id: cursoId },
        include: {
          speakers: true,
          itinerary: true,
          certificateDesign: true,
          discounts: true,
          modules: {
            orderBy: { orden: "asc" },
            include: {
              lessons: {
                orderBy: { orden: "asc" },
                include: { resources: true }
              }
            }
          }
        }
      });
    }

    if (!curso) {
      curso = await db.curso.findUnique({
        where: { slug: param },
        include: {
          speakers: true,
          itinerary: true,
          certificateDesign: true,
          discounts: true,
          modules: {
            orderBy: { orden: "asc" },
            include: {
              lessons: {
                orderBy: { orden: "asc" },
                include: { resources: true }
              }
            }
          }
        }
      });
    }

    if (!curso || (curso.estado !== "ACTIVO" && (!res.locals.user || res.locals.user.role?.name !== "ADMIN"))) {
      return res.redirect("/cursos?error=course_not_found");
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

    const actualCursoId = curso.id;

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
          where: { userId: res.locals.user.id, cursoId: actualCursoId }
        });
        isEnrolled = !!enrollment;

        const certificate = await db.certificate.findFirst({
          where: { userId: res.locals.user.id, cursoId: actualCursoId }
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

    let price = curso.gratuito ? 0.00 : (curso.precio ?? 0.00);
    const originalPrice = curso.precio ?? 0.00;
    let hasActiveDiscount = false;
    let discountPercent = 0;

    const userRole = res.locals.user?.role?.name;
    const isEstudiante = userRole === "STUDENT";
    const tieneDescuentoEstudiante = !curso.gratuito && isEstudiante && curso.descuentoEstudianteUsd !== null && curso.descuentoEstudianteUsd !== undefined && curso.descuentoEstudianteUsd > 0 && curso.descuentoEstudianteUsd < originalPrice;

    if (tieneDescuentoEstudiante) {
      price = Number(curso.descuentoEstudianteUsd);
      hasActiveDiscount = true;
      discountPercent = originalPrice > 0 ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
    } else if (!curso.gratuito && curso.discounts && curso.discounts.length > 0) {
      const now = new Date();
      const validDiscount = curso.discounts.find(d => {
        const start = new Date(d.fechaInicio);
        const end = new Date(d.fechaFin);
        return now >= start && now <= end;
      });
      if (validDiscount) {
        price = originalPrice * (1 - validDiscount.porcentaje / 100);
        hasActiveDiscount = true;
        discountPercent = validDiscount.porcentaje;
      }
    }

    let completedCount = 0;
    const allLessons = (curso.modules || []).flatMap(m => m.lessons || []);
    const totalLessons = allLessons.length;
    let progressPct = 0;
    let nextLessonId: number | null = allLessons[0]?.id || null;
    let ctaButtonLabel = "Iniciar Curso";

    if (res.locals.user) {
      const userLogs = await db.eventAccessLog.findMany({
        where: { userId: res.locals.user.id, cursoId: actualCursoId },
        select: { lessonId: true }
      });
      const completedLessonIds = new Set(userLogs.map(l => l.lessonId).filter(Boolean));
      completedCount = completedLessonIds.size;
      progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

      if (completedCount > 0) {
        ctaButtonLabel = "Continuar Curso";
        const nextLesson = allLessons.find(l => !completedLessonIds.has(l.id));
        if (nextLesson) {
          nextLessonId = nextLesson.id;
        }
      }
    }

    const activeBankAccounts = await getActiveBankAccounts();

    res.render("curso-detalle", {
      title: `${curso.titulo} - Detalle`,
      curso,
      isEnrolled,
      hasCertificate,
      acquiredCertificateCode,
      certificatePending,
      price,
      originalPrice,
      hasActiveDiscount,
      discountPercent,
      isEstudiante,
      tieneDescuentoEstudiante,
      bankAccounts: systemConfig.bankAccounts,
      activeBankAccounts,
      nextLessonId,
      ctaButtonLabel,
      completedCount,
      totalLessons,
      progressPct,
      activePage: "cursos"
    });
  } catch (error) {
    console.error("Error loading course details:", error);
    res.redirect("/cursos?error=internal_error");
  }
});

// POST Route: Enroll in Free Course
router.post("/cursos/:id/inscribirse", async (req: Request, res: Response) => {
  const cursoId = parseInt(req.params.id as string);
  const isAjax = req.body.ajax || req.headers.accept?.includes("application/json");
  if (!res.locals.user) {
    if (isAjax) return res.status(401).json({ success: false, error: "Inicie sesión para continuar." });
    return res.redirect(`/login?redirect=/cursos/${cursoId}&error=auth_required`);
  }
  const userId = res.locals.user.id;
  const { nombreUsuario } = req.body;

  try {
    const curso = await db.curso.findUnique({
      where: { id: cursoId },
      include: { certificateDesign: true }
    });

    if (!curso) {
      if (isAjax) return res.status(404).json({ success: false, error: "Curso no encontrado." });
      return res.redirect("/cursos?error=course_not_found");
    }

    if (!curso.gratuito) {
      if (isAjax) return res.status(400).json({ success: false, error: "Este curso no es gratuito." });
      return res.redirect(`/cursos/${cursoId}?error=paid_required`);
    }

    const rawNombreUsuario = (typeof nombreUsuario === "string" && nombreUsuario.trim().length > 0)
      ? nombreUsuario.trim()
      : (res.locals.user.nombreCertificado || res.locals.user.name || "Participante");

    await db.eventEnrollment.upsert({
      where: {
        userId_cursoId: { userId, cursoId }
      },
      update: {},
      create: { userId, cursoId }
    });

    // Auto-create free certificate if immediate certificate mode is explicitly enabled
    const isImmediateCert = curso.certificadoInmediato === true;
    if (isImmediateCert) {
      const existingCert = await db.certificate.findFirst({
        where: { userId, cursoId }
      });
      if (!existingCert) {
        const design = curso.certificateDesign;
        const horasVal = design?.horas ?? 40;
        const eventNameVal = design?.nombreEvento ?? curso.titulo;
        const codigoCertificado = "CERT-" + Math.random().toString(36).substring(2, 10).toUpperCase() + "-" + cursoId;

        await db.certificate.create({
          data: {
            userId,
            cursoId,
            codigo: codigoCertificado,
            horas: horasVal,
            nombreEvento: eventNameVal,
            nombreUsuario: toTitleCase(rawNombreUsuario),
            precioPagado: 0.00,
            estado: "APROBADO"
          }
        });
      }
    }

    if (isAjax) {
      return res.json({ success: true, redirect: `/cursos/${cursoId}/aula?success=enrolled` });
    }
    res.redirect(`/cursos/${cursoId}/aula?success=enrolled`);
  } catch (error) {
    console.error("Error enrolling in course:", error);
    if (isAjax) return res.status(500).json({ success: false, error: "Error procesando la inscripción." });
    res.redirect(`/cursos/${cursoId}?error=enrollment_failed`);
  }
});

// POST Route: Buy Paid Course Certificate / Access
router.post("/cursos/:id/comprar", async (req: Request, res: Response) => {
  const cursoId = parseInt(req.params.id as string);
  const isAjax = req.body.ajax || req.headers.accept?.includes("application/json");

  if (!res.locals.user) {
    if (isAjax) return res.status(401).json({ success: false, error: "Inicie sesión para continuar." });
    return res.redirect(`/login?redirect=/cursos/${cursoId}&error=auth_required`);
  }

  const userId = res.locals.user.id;
  const { paymentMethod, reference, banco, nombreUsuario, comprobante } = req.body;

  try {
    const curso = await db.curso.findUnique({
      where: { id: cursoId },
      include: { certificateDesign: true, discounts: true }
    });

    if (!curso) {
      if (isAjax) return res.status(404).json({ success: false, error: "Curso no encontrado." });
      return res.redirect("/cursos?error=course_not_found");
    }

    let price = curso.gratuito ? 0.00 : (curso.precio ?? 0.00);
    if (!curso.gratuito && curso.discounts && curso.discounts.length > 0) {
      const now = new Date();
      const validDiscount = curso.discounts.find(d => {
        const start = new Date(d.fechaInicio);
        const end = new Date(d.fechaFin);
        return now >= start && now <= end;
      });
      if (validDiscount) {
        price = price * (1 - validDiscount.porcentaje / 100);
      }
    }

    let certEstado = "APROBADO";
    const isTransfer = paymentMethod === "transferencia" || paymentMethod === "transfer";
    let uploadedComprobante = null;
    let selectedBankAccount: Awaited<ReturnType<typeof findActiveBankAccountById>> = null;

    // PayPhone se procesa exclusively a través de la pasarela real (/api/payphone/prepare).
    // Rechazar cualquier intento de usar payphone por esta ruta.
    if (paymentMethod === "payphone") {
      if (isAjax) {
        return res.status(400).json({
          success: false,
          error: "El pago con PayPhone debe realizarse a través de la pasarela de pago. Por favor, use el botón de PayPhone."
        });
      }
      return res.redirect(`/cursos/${cursoId}?error=payphone_gateway_required`);
    }

    if (paymentMethod === "gratuito") {
      if (!curso.gratuito) {
        if (isAjax) return res.status(400).json({ success: false, error: "Este curso no es gratuito." });
        return res.redirect(`/cursos/${cursoId}?error=invalid_payment_method`);
      }
      price = 0.00;
    } else if (isTransfer) {
      certEstado = "PENDIENTE";
      const activeBankAccounts = await getActiveBankAccounts();
      if (activeBankAccounts.length > 0) {
        const bankAccountId = parseSubmittedBankAccountId(req.body);
        if (!bankAccountId) {
          if (isAjax) return res.status(400).json({ success: false, error: "Seleccione la cuenta bancaria de destino para la transferencia." });
          return res.redirect(`/cursos/${cursoId}?error=missing_bank_account`);
        }

        selectedBankAccount = await findActiveBankAccountById(db, bankAccountId);
        if (!selectedBankAccount) {
          if (isAjax) return res.status(400).json({ success: false, error: "La cuenta bancaria seleccionada no está disponible." });
          return res.redirect(`/cursos/${cursoId}?error=invalid_bank_account`);
        }
      }

      if (!comprobante) {
        if (isAjax) return res.status(400).json({ success: false, error: "Por favor, suba la captura de su comprobante de pago." });
        return res.redirect(`/cursos/${cursoId}?error=missing_receipt`);
      }
      try {
        uploadedComprobante = await uploadBase64ToCloudinary(comprobante, "comprobantes");
      } catch (uploadErr) {
        console.error("Error subiendo comprobante a Cloudinary:", uploadErr);
        if (isAjax) return res.status(500).json({ success: false, error: "Error al cargar el comprobante de pago." });
        return res.redirect(`/cursos/${cursoId}?error=receipt_upload_failed`);
      }
    }

    // Always ensure EventEnrollment exists so user has access to course classroom and lessons
    await db.eventEnrollment.upsert({
      where: {
        userId_cursoId: { userId, cursoId }
      },
      update: {},
      create: { userId, cursoId }
    });

    const isImmediateCert = curso.certificadoInmediato === true;
    let certificate: Awaited<ReturnType<typeof db.certificate.create>> | null = null;

    if (isImmediateCert || (isTransfer && certEstado === "PENDIENTE")) {
      const design = curso.certificateDesign;
      const horasVal = design?.horas ?? 40;
      const eventNameVal = design?.nombreEvento ?? curso.titulo;
      const codigoCertificado = "CERT-" + Math.random().toString(36).substring(2, 10).toUpperCase() + "-" + cursoId;

      const rawNombreUsuario = nombreUsuario || res.locals.user.nombreCertificado || res.locals.user.name || "Participante";
      const formattedNombre = toTitleCase(rawNombreUsuario);

      certificate = await db.certificate.create({
        data: {
          userId,
          cursoId,
          codigo: codigoCertificado,
          horas: horasVal,
          nombreEvento: eventNameVal,
          nombreUsuario: formattedNombre,
          precioPagado: price,
          estado: certEstado
        }
      });
    }

    // Send certificate email if certificate was created
    if (certificate) {
      try {
        const certUser = res.locals.user;
        const eventNameVal = certificate.nombreEvento;
        const codigoCertificado = certificate.codigo;
        if (certUser?.email) {
          if (certEstado === "PENDIENTE") {
            emailService
              .sendCertificateRequested(certUser.email, {
                recipientName: certUser.name || certUser.email,
                eventName: eventNameVal,
                requestId: certificate.id,
                requestDate: new Date().toLocaleDateString("es-EC"),
              })
              .catch((err) =>
                console.warn("Error enviando email de certificado solicitado (curso):", err)
              );
          } else if (certEstado === "APROBADO") {
            emailService
              .sendCertificateAvailable(certUser.email, {
                recipientName: certUser.name || certUser.email,
                eventName: eventNameVal,
                certificateUrl: `${process.env.BASE_URL || "http://localhost:3000"}/certificados/${codigoCertificado}`,
                issuedAt: new Date().toISOString(),
              })
              .catch((err) =>
                console.warn("Error enviando email de certificado disponible (curso):", err)
              );
          }
        }
      } catch (emailErr) {
        console.warn("No se pudo preparar email de certificado (curso):", emailErr);
      }
    }

    // Create PaymentRequest for tracking if transfer
    if (isTransfer && certificate) {
      const bankAccountLabel = selectedBankAccount ? formatBankAccountLabel(selectedBankAccount) : null;

      await db.paymentRequest.create({
        data: {
          ruc: "9999999999001",
          razonSocial: nombreUsuario || res.locals.user.nombreCertificado || res.locals.user.name,
          monto: price,
          tipo: "CERTIFICATE",
          referencia: reference || "S/N",
          bancoDestino: bankAccountLabel || banco || "Transferencia",
          comprobante: uploadedComprobante,
          estado: "PENDIENTE",
          certificateId: certificate.id,
          bankAccountId: selectedBankAccount?.id ?? null,
          bankAccountSnapshot: selectedBankAccount ? buildBankAccountSnapshot(selectedBankAccount) : undefined,
          bankAccountLabel: bankAccountLabel ?? null
        }
      });
    } else if (paymentMethod === "payphone") {
      // Mockup deshabilitado: PayPhone real va por /api/payphone/prepare.
      // (Ya se valida al inicio de la ruta — este branch nunca debería alcanzarse.)
      if (isAjax) {
        return res.status(400).json({
          success: false,
          error: "El pago con PayPhone debe realizarse a través de la pasarela de pago. Por favor, use el botón de PayPhone."
        });
      }
      return res.redirect(`/cursos/${cursoId}?error=payphone_gateway_required`);
    } else if (paymentMethod === "kushki") {
      await db.paymentRequest.create({
        data: {
          ruc: "9999999999001",
          razonSocial: nombreUsuario || res.locals.user.nombreCertificado || res.locals.user.name,
          monto: price,
          tipo: "CERTIFICATE",
          referencia: "TRANS-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
          bancoDestino: "Kushki Pagos",
          comprobante: null,
          estado: "APROBADO",
          certificateId: certificate?.id ?? null,
          fechaProcesado: new Date()
        }
      });
    }

    const redirectUrl = `/cursos/${cursoId}/aula?success=${isTransfer ? "certificate_pending" : "certificate_acquired"}`;
    if (isAjax) {
      return res.json({ success: true, redirect: redirectUrl });
    }
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Error purchasing course:", error);
    if (isAjax) return res.status(500).json({ success: false, error: "Error procesando la solicitud." });
    res.redirect(`/cursos/${cursoId}?error=purchase_failed`);
  }
});

// GET Route: Course Aula Virtual (Student Classroom)
router.get("/cursos/:id/aula", async (req: Request, res: Response) => {
  const cursoId = parseInt(req.params.id as string);
  if (!res.locals.user) {
    return res.redirect(`/login?redirect=/cursos/${cursoId}/aula&error=auth_required`);
  }
  const userId = res.locals.user.id;

  try {
    const curso = await db.curso.findUnique({
      where: { id: cursoId },
      include: {
        certificateDesign: true,
        modules: {
          orderBy: { orden: "asc" },
          include: {
            lessons: {
              orderBy: { orden: "asc" },
              include: {
                resources: true,
                tasks: true
              }
            }
          }
        }
      }
    });

    if (!curso) {
      return res.redirect("/cursos?error=course_not_found");
    }

    // Verify Access
    let hasAccess = false;
    let isPending = false;

    if (res.locals.user.role?.name === "ADMIN") {
      hasAccess = true;
    } else {
      // Check if enrolled
      const enrollment = await db.eventEnrollment.findFirst({
        where: { userId, cursoId }
      });

      if (enrollment) {
        if (curso.gratuito) {
          hasAccess = true;
        } else {
          // If paid, check approved certificate
          const certificate = await db.certificate.findFirst({
            where: { userId, cursoId }
          });
          if (certificate) {
            if (certificate.estado === "APROBADO") {
              hasAccess = true;
            } else if (certificate.estado === "PENDIENTE") {
              isPending = true;
            }
          }
        }
      }
    }

    if (!hasAccess) {
      if (isPending) {
        return res.redirect(`/cursos/${cursoId}?error=payment_pending`);
      }
      return res.redirect(`/cursos/${cursoId}?error=not_enrolled`);
    }

    // Get current lesson
    let currentLesson: any = null;
    const lessonIdParam = req.query.lessonId ? parseInt(req.query.lessonId as string) : null;

    // Flatten lessons list to find the selected one or the first one
    const allLessons: any[] = [];
    curso.modules.forEach(mod => {
      mod.lessons.forEach(les => {
        allLessons.push(les);
      });
    });

    if (lessonIdParam) {
      currentLesson = allLessons.find(l => l.id === lessonIdParam);
    }
    if (!currentLesson && allLessons.length > 0) {
      currentLesson = allLessons[0];
    }

    // Load submissions for tasks in the current lesson
    let submissions: any[] = [];
    if (currentLesson && currentLesson.tasks && currentLesson.tasks.length > 0) {
      const taskIds = currentLesson.tasks.map((t: any) => t.id);
      submissions = await db.cursoSubmission.findMany({
        where: {
          userId,
          taskId: { in: taskIds }
        }
      });
    }

    // Log access
    if (currentLesson) {
      await db.eventAccessLog.create({
        data: {
          userId,
          cursoId,
          lessonId: currentLesson.id
        }
      });
    }

    res.render("curso-aula", {
      title: `${curso.titulo} - Aula Virtual`,
      curso,
      currentLesson,
      submissions,
      activePage: "cursos"
    });
  } catch (error) {
    console.error("Error loading virtual classroom:", error);
    res.redirect(`/cursos/${cursoId}?error=aula_failed`);
  }
});

// POST Route: Student Submits Homework Task (AJAX)
router.post("/api/cursos/:id/tasks/:taskId/submit", async (req: Request, res: Response) => {
  const taskId = parseInt(req.params.taskId as string);
  if (!res.locals.user) {
    return res.status(401).json({ success: false, error: "Sesión expirada." });
  }
  const userId = res.locals.user.id;
  const { archivoUrl, comentario } = req.body;

  if (!archivoUrl) {
    return res.status(400).json({ success: false, error: "El archivo de entrega es obligatorio." });
  }

  try {
    const task = await db.cursoTask.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return res.status(404).json({ success: false, error: "Tarea no encontrada." });
    }

    let uploadedUrl = archivoUrl;
    if (archivoUrl && (archivoUrl.startsWith("data:") || archivoUrl.length > 200)) {
      try {
        uploadedUrl = await uploadBase64ToCloudinary(archivoUrl, "tareas");
      } catch (uploadErr) {
        console.error("Error subiendo tarea a Cloudinary:", uploadErr);
        return res.status(500).json({ success: false, error: "Error al procesar el archivo. Intente nuevamente." });
      }
    }

    const submission = await db.cursoSubmission.upsert({
      where: {
        userId_taskId: { userId, taskId }
      },
      update: {
        archivoUrl: uploadedUrl,
        comentario,
        estado: "PENDIENTE",
        calificacion: null,
        comentarioFeedback: null,
        fechaEntrega: new Date()
      },
      create: {
        userId,
        taskId,
        archivoUrl: uploadedUrl,
        comentario,
        estado: "PENDIENTE"
      }
    });

    res.json({ success: true, submission });
  } catch (error) {
    console.error("Error saving task submission:", error);
    res.status(500).json({ success: false, error: "Error interno al enviar la tarea." });
  }
});

// -------------------------------------------------------------
// ADMIN CURRICULUM MANAGEMENT API ENDPOINTS
// -------------------------------------------------------------

// GET: Fetch Curriculum Structure JSON
router.get("/api/cursos/:id/curriculum", requireAdmin, async (req: Request, res: Response) => {
  const cursoId = parseInt(req.params.id as string);
  try {
    const modules = await db.cursoModule.findMany({
      where: { cursoId },
      orderBy: { orden: "asc" },
      include: {
        lessons: {
          orderBy: { orden: "asc" },
          include: {
            resources: true,
            tasks: true
          }
        }
      }
    });
    res.json({ success: true, modules });
  } catch (error) {
    console.error("Error fetching curriculum:", error);
    res.status(500).json({ success: false, error: "Error al cargar el temario." });
  }
});

// POST: Save/Update Module
router.post("/api/cursos/:id/modules", requireAdmin, async (req: Request, res: Response) => {
  const cursoId = parseInt(req.params.id as string);
  const { id, titulo, orden } = req.body;

  try {
    const ordVal = parseInt(orden || 0);
    if (id) {
      const updated = await db.cursoModule.update({
        where: { id: parseInt(id) },
        data: { titulo, orden: ordVal }
      });
      return res.json({ success: true, module: updated });
    } else {
      const created = await db.cursoModule.create({
        data: { cursoId, titulo, orden: ordVal }
      });
      return res.json({ success: true, module: created });
    }
  } catch (error) {
    console.error("Error saving module:", error);
    res.status(500).json({ success: false, error: "Error al guardar el módulo." });
  }
});

// POST: Delete Module
router.post("/api/cursos/:id/modules/:moduleId/delete", requireAdmin, async (req: Request, res: Response) => {
  const moduleId = parseInt(req.params.moduleId as string);
  try {
    await db.cursoModule.delete({
      where: { id: moduleId }
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting module:", error);
    res.status(500).json({ success: false, error: "Error al eliminar el módulo." });
  }
});

// POST: Save/Update Lesson
router.post("/api/cursos/:id/lessons", requireAdmin, async (req: Request, res: Response) => {
  const { id, moduleId, titulo, descripcion, videoUrl, orden } = req.body;
  try {
    const modIdVal = parseInt(moduleId);
    const ordVal = parseInt(orden || 0);
    const isBunny = videoUrl && videoUrl.startsWith('bunny:');
    const finalVideoUrl = isBunny ? null : videoUrl;
    const finalBunnyId = isBunny ? videoUrl.split(':')[2] : null;

    if (id) {
      const updated = await db.cursoLesson.update({
        where: { id: parseInt(id) },
        data: { titulo, descripcion, videoUrl: finalVideoUrl, bunnyVideoId: finalBunnyId, orden: ordVal }
      });
      return res.json({ success: true, lesson: updated });
    } else {
      const created = await db.cursoLesson.create({
        data: { moduleId: modIdVal, titulo, descripcion, videoUrl: finalVideoUrl, bunnyVideoId: finalBunnyId, orden: ordVal }
      });
      return res.json({ success: true, lesson: created });
    }
  } catch (error) {
    console.error("Error saving lesson:", error);
    res.status(500).json({ success: false, error: "Error al guardar la lección." });
  }
});

// POST: Delete Lesson
router.post("/api/cursos/:id/lessons/:lessonId/delete", requireAdmin, async (req: Request, res: Response) => {
  const lessonId = parseInt(req.params.lessonId as string);
  try {
    await db.cursoLesson.delete({
      where: { id: lessonId }
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting lesson:", error);
    res.status(500).json({ success: false, error: "Error al eliminar la lección." });
  }
});

// POST: Save/Update Resource
router.post("/api/cursos/:id/resources", requireAdmin, async (req: Request, res: Response) => {
  const { id, lessonId, nombre, url } = req.body;
  try {
    const lesIdVal = parseInt(lessonId);
    if (id) {
      const updated = await db.cursoResource.update({
        where: { id: parseInt(id) },
        data: { nombre, url }
      });
      return res.json({ success: true, resource: updated });
    } else {
      const created = await db.cursoResource.create({
        data: { lessonId: lesIdVal, nombre, url }
      });
      return res.json({ success: true, resource: created });
    }
  } catch (error) {
    console.error("Error saving resource:", error);
    res.status(500).json({ success: false, error: "Error al guardar el recurso." });
  }
});

// POST: Delete Resource
router.post("/api/cursos/:id/resources/:resourceId/delete", requireAdmin, async (req: Request, res: Response) => {
  const resourceId = parseInt(req.params.resourceId as string);
  try {
    await db.cursoResource.delete({
      where: { id: resourceId }
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting resource:", error);
    res.status(500).json({ success: false, error: "Error al eliminar el recurso." });
  }
});

// POST: Save/Update Task
router.post("/api/cursos/:id/tasks", requireAdmin, async (req: Request, res: Response) => {
  const { id, lessonId, titulo, descripcion, archivoUrl, puntos } = req.body;
  try {
    const lesIdVal = parseInt(lessonId);
    const ptsVal = parseInt(puntos || 100);

    if (id) {
      const updated = await db.cursoTask.update({
        where: { id: parseInt(id) },
        data: { titulo, descripcion, archivoUrl, puntos: ptsVal }
      });
      return res.json({ success: true, task: updated });
    } else {
      const created = await db.cursoTask.create({
        data: { lessonId: lesIdVal, titulo, descripcion, archivoUrl, puntos: ptsVal }
      });
      return res.json({ success: true, task: created });
    }
  } catch (error) {
    console.error("Error saving task:", error);
    res.status(500).json({ success: false, error: "Error al guardar la tarea." });
  }
});

// POST: Delete Task
router.post("/api/cursos/:id/tasks/:taskId/delete", requireAdmin, async (req: Request, res: Response) => {
  const taskId = parseInt(req.params.taskId as string);
  try {
    await db.cursoTask.delete({
      where: { id: taskId }
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ success: false, error: "Error al eliminar la tarea." });
  }
});

// GET: Fetch Submissions for a Course
router.get("/api/cursos/:id/submissions", requireAdmin, async (req: Request, res: Response) => {
  const cursoId = parseInt(req.params.id as string);
  try {
    const submissions = await db.cursoSubmission.findMany({
      where: {
        task: {
          lesson: {
            module: {
              cursoId: cursoId
            }
          }
        }
      },
      include: {
        user: true,
        task: {
          include: {
            lesson: true
          }
        }
      },
      orderBy: { fechaEntrega: "desc" }
    });
    res.json({ success: true, submissions });
  } catch (error) {
    console.error("Error fetching course submissions:", error);
    res.status(500).json({ success: false, error: "Error al cargar las entregas." });
  }
});

// POST: Grade Submission
router.post("/api/cursos/submissions/:submissionId/grade", requireAdmin, async (req: Request, res: Response) => {
  const submissionId = parseInt(req.params.submissionId as string);
  const { calificacion, comentarioFeedback, estado } = req.body;
  try {
    const scoreVal = calificacion ? parseFloat(calificacion) : null;
    const updated = await db.cursoSubmission.update({
      where: { id: submissionId },
      data: {
        calificacion: scoreVal,
        comentarioFeedback,
        estado // APROBADA or RECHAZADA
      }
    });
    res.json({ success: true, submission: updated });
  } catch (error) {
    console.error("Error grading submission:", error);
    res.status(500).json({ success: false, error: "Error al calificar la entrega." });
  }
});
export default router;
