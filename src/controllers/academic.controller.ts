import { Request, Response } from "express";
import { AcademicService, AcademicAccessContext } from "../services/academic.service";

function parseParamId(raw: string | string[] | undefined): number {
  if (!raw) return NaN;
  const val = Array.isArray(raw) ? raw[0] : raw;
  return parseInt(String(val), 10);
}

function parseOptionalPositiveInt(raw: any, paramName: string): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const str = String(Array.isArray(raw) ? raw[0] : raw).trim();
  if (!/^\d+$/.test(str)) {
    const err: any = new Error(`El parámetro '${paramName}' debe ser un número entero positivo.`);
    err.statusCode = 400;
    throw err;
  }
  const num = parseInt(str, 10);
  if (num <= 0) {
    const err: any = new Error(`El parámetro '${paramName}' debe ser un número entero positivo.`);
    err.statusCode = 400;
    throw err;
  }
  return num;
}

function parseOptionalDateString(raw: any, paramName: string): string | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const str = String(Array.isArray(raw) ? raw[0] : raw).trim();
  const d = new Date(str);
  if (isNaN(d.getTime())) {
    const err: any = new Error(`El parámetro '${paramName}' debe tener un formato de fecha válido (YYYY-MM-DD).`);
    err.statusCode = 400;
    throw err;
  }
  return str;
}

function getOrgId(req: Request): number {
  const orgId = (req as any).organizationId || parseParamId(req.params.id);
  if (!orgId || isNaN(orgId) || orgId <= 0) {
    throw new Error("Identificador de organización inválido.");
  }
  return orgId;
}

function getAccessContext(req: Request, res: Response): AcademicAccessContext {
  const user = (req as any).user || res.locals?.user;
  const isGlobalAdmin = user?.role?.name === "ADMIN";
  const member = (req as any).organizationMember || res.locals?.organizationMember;
  const isOrgAdmin = member && (member.role === "OWNER" || member.role === "ADMIN");
  const isAcademicAdmin = Boolean(isGlobalAdmin || isOrgAdmin);
  const userId = user?.id ? Number(user.id) : undefined;
  return {
    userId,
    isAcademicAdmin,
  };
}

function getErrorStatus(error: any, defaultStatus = 400): number {
  if (error?.statusCode && typeof error.statusCode === "number") {
    return error.statusCode;
  }
  const msg = String(error?.message || "");
  const code = String(error?.code || "");
  if (
    code === "ACADEMIC_PERIOD_NOT_STARTED" ||
    code === "ACADEMIC_ATTENDANCE_DAY_CLOSED" ||
    code === "ACADEMIC_ATTENDANCE_FUTURE_DATE" ||
    code === "ACADEMIC_SUBJECT_NOT_SCHEDULED_TODAY" ||
    code === "ACADEMIC_SCHEDULE_COURSE_CONFLICT" ||
    code === "ACADEMIC_SCHEDULE_TEACHER_CONFLICT" ||
    code === "COURSE_HAS_DEPENDENCIES" ||
    msg.includes("ACADEMIC_PERIOD_NOT_STARTED") ||
    msg.includes("ACADEMIC_ATTENDANCE_DAY_CLOSED") ||
    msg.includes("ACADEMIC_ATTENDANCE_FUTURE_DATE") ||
    msg.includes("ACADEMIC_SUBJECT_NOT_SCHEDULED_TODAY") ||
    msg.includes("ACADEMIC_SCHEDULE_COURSE_CONFLICT") ||
    msg.includes("ACADEMIC_SCHEDULE_TEACHER_CONFLICT") ||
    msg.includes("Conflicto de horario") ||
    msg.includes("no tiene horario de clases programado") ||
    msg.includes("aún no ha iniciado") ||
    msg.includes("está cerrada")
  ) {
    return 409;
  }
  if (
    code === "ACADEMIC_UNAUTHORIZED_SCHEDULE" ||
    code === "ACADEMIC_FORBIDDEN" ||
    msg.includes("No tienes permisos") ||
    msg.includes("permisos administrativos") ||
    msg.includes("Acceso denegado") ||
    msg.includes("no autorizado") ||
    msg.includes("no pertenece")
  ) {
    return 403;
  }
  if (
    msg.includes("no encontrado") ||
    msg.includes("no encontrada") ||
    msg.includes("no existe")
  ) {
    return 404;
  }
  if (msg.includes("Ya existe") || msg.includes("duplicado")) {
    return 409;
  }
  return defaultStatus;
}

export class AcademicController {
  // ============================================================================
  // CURSOS
  // ============================================================================

  static async createCourse(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const { name, level, classroom, tutorUserId } = req.body;

      const course = await AcademicService.createCourse(organizationId, {
        name,
        level,
        classroom,
        tutorUserId: tutorUserId ? parseInt(tutorUserId, 10) : null,
      });

      return res.status(201).json({
        success: true,
        data: course,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al crear el curso.",
      });
    }
  }

  static async getCourses(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const { status, search } = req.query;

      const courses = await AcademicService.getCourses(organizationId, {
        status: status as string | undefined,
        search: search as string | undefined,
      }, getAccessContext(req, res));

      return res.status(200).json({
        success: true,
        data: courses,
      });
    } catch (error: any) {
      const status = getErrorStatus(error, 400);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al listar cursos.",
      });
    }
  }

  static async getCourseById(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const courseId = parseParamId(req.params.courseId);
      if (isNaN(courseId) || courseId <= 0) {
        return res.status(400).json({ success: false, error: "ID de curso inválido." });
      }

      const course = await AcademicService.getCourseById(organizationId, courseId, getAccessContext(req, res));
      return res.status(200).json({
        success: true,
        data: course,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al obtener el curso.",
      });
    }
  }

  static async updateCourse(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const courseId = parseParamId(req.params.courseId);
      if (isNaN(courseId) || courseId <= 0) {
        return res.status(400).json({ success: false, error: "ID de curso inválido." });
      }

      const { name, level, classroom, tutorUserId } = req.body;

      const updated = await AcademicService.updateCourse(organizationId, courseId, {
        name,
        level,
        classroom,
        tutorUserId: tutorUserId !== undefined ? (tutorUserId ? parseInt(tutorUserId, 10) : null) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al actualizar el curso.",
      });
    }
  }

  static async archiveCourse(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const courseId = parseParamId(req.params.courseId);
      if (isNaN(courseId) || courseId <= 0) {
        return res.status(400).json({ success: false, error: "ID de curso inválido." });
      }

      const archived = await AcademicService.archiveCourse(organizationId, courseId);
      return res.status(200).json({
        success: true,
        data: archived,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al archivar el curso.",
      });
    }
  }

  static async reactivateCourse(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const courseId = parseParamId(req.params.courseId);
      if (isNaN(courseId) || courseId <= 0) {
        return res.status(400).json({ success: false, error: "ID de curso inválido." });
      }

      const reactivated = await AcademicService.reactivateCourse(organizationId, courseId);
      return res.status(200).json({
        success: true,
        data: reactivated,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al reactivar el curso.",
      });
    }
  }

  static async getCourseDependencies(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const courseId = parseParamId(req.params.courseId);
      if (isNaN(courseId) || courseId <= 0) {
        return res.status(400).json({ success: false, error: "ID de curso inválido." });
      }

      const deps = await AcademicService.getCourseDependencies(organizationId, courseId);
      return res.status(200).json({
        success: true,
        data: deps,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al consultar dependencias del curso.",
      });
    }
  }

  static async deleteCourse(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const courseId = parseParamId(req.params.courseId);
      if (isNaN(courseId) || courseId <= 0) {
        return res.status(400).json({ success: false, error: "ID de curso inválido." });
      }

      const deleted = await AcademicService.deleteCourse(organizationId, courseId);
      return res.status(200).json({
        success: true,
        data: deleted,
        message: "Curso eliminado definitivamente.",
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al eliminar el curso.",
        code: error.code,
        dependencies: error.dependencies,
      });
    }
  }

  // ============================================================================
  // ASIGNATURAS / MATERIAS
  // ============================================================================

  static async createSubject(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const courseId = parseParamId(req.params.courseId);
      if (isNaN(courseId) || courseId <= 0) {
        return res.status(400).json({ success: false, error: "ID de curso inválido." });
      }

      const { name, code, hoursPerWeek, teacherUserId, academicYearId, effectiveFrom, schedule, scheduleSlots } = req.body;

      const subject = await AcademicService.createSubject(organizationId, courseId, {
        name,
        code,
        hoursPerWeek: hoursPerWeek !== undefined && hoursPerWeek !== null ? Number(hoursPerWeek) : null,
        teacherUserId: teacherUserId ? parseInt(teacherUserId, 10) : null,
        academicYearId: academicYearId ? Number(academicYearId) : undefined,
        effectiveFrom,
        schedule,
        scheduleSlots,
      });

      return res.status(201).json({
        success: true,
        data: subject,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al registrar la materia.",
      });
    }
  }

  static async getSubjectsByCourse(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const courseId = parseParamId(req.params.courseId);
      if (isNaN(courseId) || courseId <= 0) {
        return res.status(400).json({ success: false, error: "ID de curso inválido." });
      }

      const subjects = await AcademicService.getSubjectsByCourse(organizationId, courseId, getAccessContext(req, res));
      return res.status(200).json({
        success: true,
        data: subjects,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al obtener materias.",
      });
    }
  }

  static async updateSubject(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const subjectId = parseParamId(req.params.subjectId);
      if (isNaN(subjectId) || subjectId <= 0) {
        return res.status(400).json({ success: false, error: "ID de materia inválido." });
      }

      const { name, code, hoursPerWeek, teacherUserId, academicYearId, effectiveFrom, schedule, scheduleSlots } = req.body;

      const updated = await AcademicService.updateSubject(organizationId, subjectId, {
        name,
        code,
        hoursPerWeek: hoursPerWeek !== undefined && hoursPerWeek !== null ? Number(hoursPerWeek) : undefined,
        teacherUserId: teacherUserId !== undefined ? (teacherUserId ? parseInt(teacherUserId, 10) : null) : undefined,
        academicYearId: academicYearId ? Number(academicYearId) : undefined,
        effectiveFrom,
        schedule,
        scheduleSlots,
      });

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al actualizar la materia.",
      });
    }
  }

  static async inactivateSubject(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const subjectId = parseParamId(req.params.subjectId);
      if (isNaN(subjectId) || subjectId <= 0) {
        return res.status(400).json({ success: false, error: "ID de materia inválido." });
      }

      const inactivated = await AcademicService.inactivateSubject(organizationId, subjectId);
      return res.status(200).json({
        success: true,
        data: inactivated,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al inactivar la materia.",
      });
    }
  }

  // ============================================================================
  // HORARIOS SEMANALES (FASE 11.2)
  // ============================================================================

  static async getSubjectSchedule(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const subjectId = parseParamId(req.params.subjectId);
      if (isNaN(subjectId) || subjectId <= 0) {
        return res.status(400).json({ success: false, error: "ID de materia inválido." });
      }

      const includeHistory = req.query.includeHistory === "true" || req.query.history === "true";
      const effectiveDate = req.query.effectiveDate ? String(req.query.effectiveDate) : undefined;

      const schedule = await AcademicService.getSubjectSchedule(organizationId, subjectId, {
        effectiveDate,
        includeHistory,
      });

      return res.status(200).json({
        success: true,
        data: schedule,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al consultar el horario de la materia.",
      });
    }
  }

  static async saveSubjectSchedule(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const subjectId = parseParamId(req.params.subjectId);
      if (isNaN(subjectId) || subjectId <= 0) {
        return res.status(400).json({ success: false, error: "ID de materia inválido." });
      }

      const accessContext = getAccessContext(req, res);
      const { academicYearId, effectiveFrom, slots } = req.body;

      const result = await AcademicService.saveSubjectSchedule(
        organizationId,
        subjectId,
        {
          academicYearId: Number(academicYearId),
          effectiveFrom,
          slots: slots || [],
        },
        accessContext.userId || 0,
        Boolean(accessContext.isAcademicAdmin)
      );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al guardar el horario de la materia.",
      });
    }
  }

  static async getCourseSchedule(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const courseId = parseParamId(req.params.courseId);
      if (isNaN(courseId) || courseId <= 0) {
        return res.status(400).json({ success: false, error: "ID de curso inválido." });
      }

      const academicYearId = req.query.academicYearId ? parseParamId(String(req.query.academicYearId)) : undefined;
      const effectiveDate = req.query.effectiveDate ? String(req.query.effectiveDate) : undefined;

      const schedule = await AcademicService.getCourseSchedule(organizationId, courseId, {
        academicYearId: !isNaN(academicYearId || NaN) ? academicYearId : undefined,
        effectiveDate,
      });

      return res.status(200).json({
        success: true,
        data: schedule,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al consultar el horario del curso.",
      });
    }
  }

  // ============================================================================
  // ESTUDIANTES
  // ============================================================================

  static async createStudent(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const { firstName, lastName, identification, email, phone } = req.body;

      const student = await AcademicService.createStudent(organizationId, {
        firstName,
        lastName,
        identification,
        email,
        phone,
      });

      return res.status(201).json({
        success: true,
        data: student,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al registrar el estudiante.",
      });
    }
  }

  static async getStudents(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const { status, courseId, search } = req.query;

      const students = await AcademicService.getStudents(organizationId, {
        status: status as string | undefined,
        courseId: courseId ? parseInt(courseId as string, 10) : undefined,
        search: search as string | undefined,
      }, getAccessContext(req, res));

      return res.status(200).json({
        success: true,
        data: students,
      });
    } catch (error: any) {
      const status = getErrorStatus(error, 400);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al listar estudiantes.",
      });
    }
  }

  static async getStudentById(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const studentId = parseParamId(req.params.studentId);
      if (isNaN(studentId) || studentId <= 0) {
        return res.status(400).json({ success: false, error: "ID de estudiante inválido." });
      }

      const student = await AcademicService.getStudentById(organizationId, studentId, getAccessContext(req, res));
      return res.status(200).json({
        success: true,
        data: student,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al obtener el estudiante.",
      });
    }
  }

  static async updateStudent(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const studentId = parseParamId(req.params.studentId);
      if (isNaN(studentId) || studentId <= 0) {
        return res.status(400).json({ success: false, error: "ID de estudiante inválido." });
      }

      const { firstName, lastName, identification, email, phone } = req.body;

      const updated = await AcademicService.updateStudent(organizationId, studentId, {
        firstName,
        lastName,
        identification,
        email,
        phone,
      });

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al actualizar el estudiante.",
      });
    }
  }

  static async inactivateStudent(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const studentId = parseParamId(req.params.studentId);
      if (isNaN(studentId) || studentId <= 0) {
        return res.status(400).json({ success: false, error: "ID de estudiante inválido." });
      }

      const inactivated = await AcademicService.inactivateStudent(organizationId, studentId);
      return res.status(200).json({
        success: true,
        data: inactivated,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al inactivar el estudiante.",
      });
    }
  }

  // ============================================================================
  // MATRÍCULAS
  // ============================================================================

  static async enrollStudent(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const { studentId, courseId, period, academicYearId } = req.body;

      const parsedStudentId = parseInt(studentId, 10);
      const parsedCourseId = parseInt(courseId, 10);
      const parsedAcademicYearId =
        academicYearId !== undefined && academicYearId !== null
          ? parseInt(String(academicYearId), 10)
          : undefined;

      if (isNaN(parsedStudentId) || isNaN(parsedCourseId)) {
        return res.status(400).json({
          success: false,
          error: "Los identificadores de estudiante y curso son requeridos y deben ser numéricos.",
        });
      }

      if (
        parsedAcademicYearId === undefined ||
        isNaN(parsedAcademicYearId) ||
        parsedAcademicYearId <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: "El identificador de año lectivo (academicYearId) es requerido y debe ser numérico.",
        });
      }

      const enrollment = await AcademicService.enrollStudent(organizationId, {
        studentId: parsedStudentId,
        courseId: parsedCourseId,
        period,
        academicYearId: parsedAcademicYearId,
      });

      return res.status(201).json({
        success: true,
        data: enrollment,
      });
    } catch (error: any) {
      const isNotFound =
        error.message?.includes("no existe") || error.message?.includes("no encontrado");
      const isConflict =
        error.message?.includes("ya se encuentra matriculado") ||
        error.message?.includes("ya cuenta con una matrícula") ||
        error.message?.includes("incompatible con este curso") ||
        error.message?.includes("P2002");

      const status = isNotFound ? 404 : isConflict ? 409 : 400;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al procesar la matrícula.",
      });
    }
  }

  static async getEnrollments(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const { courseId, studentId, status } = req.query;

      const enrollments = await AcademicService.getEnrollments(organizationId, {
        courseId: courseId ? parseInt(courseId as string, 10) : undefined,
        studentId: studentId ? parseInt(studentId as string, 10) : undefined,
        status: status as string | undefined,
      });

      return res.status(200).json({
        success: true,
        data: enrollments,
      });
    } catch (error: any) {
      const status = getErrorStatus(error, 400);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al consultar matrículas.",
      });
    }
  }

  static async updateEnrollmentStatus(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const enrollmentId = parseParamId(req.params.enrollmentId);
      if (isNaN(enrollmentId) || enrollmentId <= 0) {
        return res.status(400).json({ success: false, error: "ID de matrícula inválido." });
      }

      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, error: "El nuevo estado es obligatorio." });
      }

      const updated = await AcademicService.updateEnrollmentStatus(
        organizationId,
        enrollmentId,
        status
      );

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al actualizar estado de la matrícula.",
      });
    }
  }

  // ============================================================================
  // SESIONES DE CLASE (AcademicClassSession - FASE 2)
  // ============================================================================

  static async createSession(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const courseId = parseParamId(req.params.courseId) || parseParamId(req.body.courseId);
      if (isNaN(courseId) || courseId <= 0) {
        return res.status(400).json({ success: false, error: "ID de curso inválido." });
      }

      const {
        subjectId,
        teacherUserId,
        sessionDate,
        startTime,
        endTime,
        room,
        topic,
      } = req.body;

      if (!sessionDate) {
        return res.status(400).json({ success: false, error: "La fecha de sesión es obligatoria." });
      }

      const session = await AcademicService.createSession(organizationId, courseId, {
        courseId,
        subjectId: subjectId ? parseInt(subjectId, 10) : null,
        teacherUserId: teacherUserId ? parseInt(teacherUserId, 10) : null,
        sessionDate,
        startTime,
        endTime,
        room,
        topic,
      });

      return res.status(201).json({
        success: true,
        data: session,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al programar la sesión de clase.",
      });
    }
  }

  static async getSessions(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const courseId = parseParamId(req.params.courseId) || (req.query.courseId ? parseInt(String(req.query.courseId), 10) : undefined);
      const { subjectId, status, date, from, to, search } = req.query;

      const sessions = await AcademicService.getSessions(organizationId, {
        courseId: !isNaN(courseId as number) && (courseId as number) > 0 ? (courseId as number) : undefined,
        subjectId: subjectId ? parseInt(String(subjectId), 10) : undefined,
        status: status as string | undefined,
        date: date as string | undefined,
        from: from as string | undefined,
        to: to as string | undefined,
        search: search as string | undefined,
      }, getAccessContext(req, res));

      return res.status(200).json({
        success: true,
        data: sessions,
      });
    } catch (error: any) {
      const status = getErrorStatus(error, 400);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al listar sesiones de clase.",
      });
    }
  }

  static async getSessionById(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const sessionId = parseParamId(req.params.sessionId);
      if (isNaN(sessionId) || sessionId <= 0) {
        return res.status(400).json({ success: false, error: "ID de sesión inválido." });
      }

      const session = await AcademicService.getSessionById(organizationId, sessionId, getAccessContext(req, res));
      return res.status(200).json({
        success: true,
        data: session,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al obtener la sesión de clase.",
      });
    }
  }

  static async updateSession(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const sessionId = parseParamId(req.params.sessionId);
      if (isNaN(sessionId) || sessionId <= 0) {
        return res.status(400).json({ success: false, error: "ID de sesión inválido." });
      }

      const {
        subjectId,
        teacherUserId,
        sessionDate,
        startTime,
        endTime,
        room,
        topic,
        status,
      } = req.body;

      const updated = await AcademicService.updateSession(organizationId, sessionId, {
        subjectId: subjectId !== undefined ? (subjectId ? parseInt(subjectId, 10) : null) : undefined,
        teacherUserId: teacherUserId !== undefined ? (teacherUserId ? parseInt(teacherUserId, 10) : null) : undefined,
        sessionDate,
        startTime,
        endTime,
        room,
        topic,
        status,
      });

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al actualizar la sesión de clase.",
      });
    }
  }

  static async updateSessionStatus(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const sessionId = parseParamId(req.params.sessionId);
      if (isNaN(sessionId) || sessionId <= 0) {
        return res.status(400).json({ success: false, error: "ID de sesión inválido." });
      }

      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, error: "El estado es obligatorio." });
      }

      const updated = await AcademicService.updateSessionStatus(organizationId, sessionId, status);
      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al actualizar el estado de la sesión.",
      });
    }
  }

  static async cancelSession(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const sessionId = parseParamId(req.params.sessionId);
      if (isNaN(sessionId) || sessionId <= 0) {
        return res.status(400).json({ success: false, error: "ID de sesión inválido." });
      }

      const cancelled = await AcademicService.cancelSession(organizationId, sessionId);
      return res.status(200).json({
        success: true,
        data: cancelled,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al cancelar la sesión de clase.",
      });
    }
  }

  // ============================================================================
  // REGISTRO DE ASISTENCIA (AcademicAttendanceRecord - FASE 2)
  // ============================================================================

  static async saveAttendanceBatch(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const sessionId = parseParamId(req.params.sessionId);
      if (isNaN(sessionId) || sessionId <= 0) {
        return res.status(400).json({ success: false, error: "ID de sesión inválido." });
      }

      const { records } = req.body;
      if (!Array.isArray(records)) {
        return res.status(400).json({
          success: false,
          error: "El campo 'records' debe ser una lista de registros de asistencia.",
        });
      }

      const sanitizedRecords = records.map((r: any) => ({
        studentId: parseInt(r.studentId, 10),
        status: String(r.status || "").trim(),
        observation: r.observation ? String(r.observation).trim() : null,
      }));

      const saved = await AcademicService.saveAttendanceBatch(
        organizationId,
        sessionId,
        sanitizedRecords,
        getAccessContext(req, res)
      );

      return res.status(200).json({
        success: true,
        data: saved,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al guardar el registro de asistencia.",
      });
    }
  }

  static async rectifyAttendanceBatch(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const sessionId = parseParamId(req.params.sessionId || req.body.sessionId);
      if (isNaN(sessionId) || sessionId <= 0) {
        return res.status(400).json({ success: false, error: "ID de sesión inválido." });
      }

      const { records, reason } = req.body;
      if (!Array.isArray(records)) {
        return res.status(400).json({
          success: false,
          error: "El campo 'records' debe ser una lista de registros de asistencia.",
        });
      }

      if (!reason || typeof reason !== "string" || reason.trim().length < 10) {
        return res.status(400).json({
          success: false,
          error: "Debe proporcionar un motivo de rectificación válido (mínimo 10 caracteres).",
          code: "INVALID_RECTIFICATION_REASON",
        });
      }

      const sanitizedRecords = records.map((r: any) => ({
        studentId: parseInt(r.studentId, 10),
        status: String(r.status || "").trim(),
        observation: r.observation ? String(r.observation).trim() : null,
      }));

      const accessContext = getAccessContext(req, res);
      const result = await AcademicService.rectifyAttendanceBatch(
        organizationId,
        sessionId,
        sanitizedRecords,
        reason,
        accessContext
      );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al rectificar el registro de asistencia.",
        code: error.code,
      });
    }
  }

  static async getAttendanceBySession(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const sessionId = parseParamId(req.params.sessionId);
      if (isNaN(sessionId) || sessionId <= 0) {
        return res.status(400).json({ success: false, error: "ID de sesión inválido." });
      }

      const records = await AcademicService.getAttendanceBySession(organizationId, sessionId, getAccessContext(req, res));
      return res.status(200).json({
        success: true,
        data: records,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al obtener la asistencia de la sesión.",
      });
    }
  }

  static async getAttendanceHistory(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const { courseId, subjectId, studentId, date, status } = req.query;

      const history = await AcademicService.getAttendanceHistory(organizationId, {
        courseId: courseId ? parseInt(String(courseId), 10) : undefined,
        subjectId: subjectId ? parseInt(String(subjectId), 10) : undefined,
        studentId: studentId ? parseInt(String(studentId), 10) : undefined,
        date: date as string | undefined,
        status: status as string | undefined,
      }, getAccessContext(req, res));

      return res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      const status = getErrorStatus(error, 400);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al consultar historial de asistencia.",
      });
    }
  }

  static async updateAttendanceRecord(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const attendanceId = parseParamId(req.params.attendanceId);
      if (isNaN(attendanceId) || attendanceId <= 0) {
        return res.status(400).json({ success: false, error: "ID de registro de asistencia inválido." });
      }

      const { status, observation } = req.body;

      const updated = await AcademicService.updateAttendanceRecord(organizationId, attendanceId, {
        status: status ? String(status).trim() : undefined,
        observation: observation !== undefined ? (observation ? String(observation).trim() : null) : undefined,
      }, getAccessContext(req, res));

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al actualizar registro de asistencia.",
      });
    }
  }

  // ============================================================================
  // ACTIVIDADES Y EVALUACIONES (FASE 3)
  // ============================================================================

  static async createActivity(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const courseId = parseParamId(req.params.courseId);
      if (isNaN(courseId) || courseId <= 0) {
        return res.status(400).json({ success: false, error: "ID de curso inválido." });
      }

      const {
        subjectId,
        name,
        description,
        type,
        dueDate,
        maxScore,
        teacherUserId,
        academicPeriodId,
        evaluationSchemeId,
        categoryId,
      } = req.body;

      const parsedSubjectId = parseInt(String(subjectId), 10);
      if (isNaN(parsedSubjectId) || parsedSubjectId <= 0) {
        return res.status(400).json({ success: false, error: "El campo subjectId es requerido y debe ser numérico." });
      }

      if (maxScore === undefined || maxScore === null || typeof maxScore !== "number" || isNaN(maxScore) || !isFinite(maxScore) || maxScore <= 0) {
        return res.status(400).json({ success: false, error: "El campo maxScore debe ser un número finito mayor a 0." });
      }

      const created = await AcademicService.createActivity(organizationId, courseId, {
        subjectId: parsedSubjectId,
        name: String(name || ""),
        description: description ? String(description) : null,
        type: type ? String(type) : undefined,
        dueDate: dueDate || null,
        maxScore: Number(maxScore),
        teacherUserId: teacherUserId ? parseInt(String(teacherUserId), 10) : null,
        academicPeriodId: academicPeriodId ? parseInt(String(academicPeriodId), 10) : null,
        evaluationSchemeId: evaluationSchemeId ? parseInt(String(evaluationSchemeId), 10) : null,
        categoryId: categoryId ? parseInt(String(categoryId), 10) : null,
      }, getAccessContext(req, res));

      return res.status(201).json({
        success: true,
        data: created,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al registrar la actividad.",
        code: error.code || undefined,
      });
    }
  }

  static async getActivities(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const courseIdParam = req.params.courseId;
      const { courseId: queryCourseId, subjectId, type, search } = req.query;

      const effectiveCourseId = courseIdParam || queryCourseId;

      const activities = await AcademicService.getActivities(organizationId, {
        courseId: effectiveCourseId ? parseInt(String(effectiveCourseId), 10) : undefined,
        subjectId: subjectId ? parseInt(String(subjectId), 10) : undefined,
        type: type as string | undefined,
        search: search as string | undefined,
      }, getAccessContext(req, res));

      return res.status(200).json({
        success: true,
        data: activities,
      });
    } catch (error: any) {
      const status = getErrorStatus(error, 400);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al consultar actividades.",
      });
    }
  }

  static async getActivityById(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const activityId = parseParamId(req.params.activityId);
      if (isNaN(activityId) || activityId <= 0) {
        return res.status(400).json({ success: false, error: "ID de actividad inválido." });
      }

      const activity = await AcademicService.getActivityById(organizationId, activityId, getAccessContext(req, res));
      return res.status(200).json({
        success: true,
        data: activity,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al obtener detalle de la actividad.",
      });
    }
  }

  static async updateActivity(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const activityId = parseParamId(req.params.activityId);
      if (isNaN(activityId) || activityId <= 0) {
        return res.status(400).json({ success: false, error: "ID de actividad inválido." });
      }

      const {
        name,
        description,
        type,
        dueDate,
        maxScore,
        teacherUserId,
        academicPeriodId,
        evaluationSchemeId,
        categoryId,
      } = req.body;

      if (maxScore !== undefined && (typeof maxScore !== "number" || isNaN(maxScore) || !isFinite(maxScore) || maxScore <= 0)) {
        return res.status(400).json({ success: false, error: "El campo maxScore debe ser un número finito mayor a 0." });
      }

      const updated = await AcademicService.updateActivity(organizationId, activityId, {
        name: name !== undefined ? String(name) : undefined,
        description: description !== undefined ? (description ? String(description) : null) : undefined,
        type: type !== undefined ? String(type) : undefined,
        dueDate: dueDate !== undefined ? (dueDate ? String(dueDate) : null) : undefined,
        maxScore: maxScore !== undefined ? Number(maxScore) : undefined,
        teacherUserId: teacherUserId !== undefined ? (teacherUserId ? parseInt(String(teacherUserId), 10) : null) : undefined,
        academicPeriodId: academicPeriodId !== undefined ? (academicPeriodId ? parseInt(String(academicPeriodId), 10) : null) : undefined,
        evaluationSchemeId: evaluationSchemeId !== undefined ? (evaluationSchemeId ? parseInt(String(evaluationSchemeId), 10) : null) : undefined,
        categoryId: categoryId !== undefined ? (categoryId ? parseInt(String(categoryId), 10) : null) : undefined,
      }, getAccessContext(req, res));

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al actualizar la actividad.",
        code: error.code || undefined,
      });
    }
  }

  // ============================================================================
  // CALIFICACIONES / NOTAS (FASE 3)
  // ============================================================================

  static async saveGradesBatch(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const activityId = parseParamId(req.params.activityId);
      if (isNaN(activityId) || activityId <= 0) {
        return res.status(400).json({ success: false, error: "ID de actividad inválido." });
      }

      const { grades, reason } = req.body;
      if (!Array.isArray(grades) || grades.length === 0) {
        return res.status(400).json({
          success: false,
          error: "El cuerpo de la solicitud debe incluir un array 'grades' no vacío.",
        });
      }

      const changedByUserId = (req as any).user?.id ? Number((req as any).user.id) : null;

      const formattedGrades = grades.map((item: any) => ({
        studentId: item.studentId ? parseInt(String(item.studentId), 10) : undefined,
        enrollmentId: item.enrollmentId ? parseInt(String(item.enrollmentId), 10) : undefined,
        score: item.score !== undefined && item.score !== null ? Number(item.score) : (item.score === null ? null : undefined),
        status: item.status ? (String(item.status).trim().toUpperCase() as any) : undefined,
        comments: item.comments ? String(item.comments) : null,
        reason: item.reason ? String(item.reason) : undefined,
      }));

      const saved = await AcademicService.saveGradesBatch(
        organizationId,
        activityId,
        formattedGrades,
        { reason: reason ? String(reason) : undefined, changedByUserId },
        getAccessContext(req, res)
      );

      return res.status(200).json({
        success: true,
        data: saved,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al guardar el lote de calificaciones.",
      });
    }
  }

  static async getGradesByActivity(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const activityId = parseParamId(req.params.activityId);
      if (isNaN(activityId) || activityId <= 0) {
        return res.status(400).json({ success: false, error: "ID de actividad inválido." });
      }

      const grades = await AcademicService.getGradesByActivity(organizationId, activityId, getAccessContext(req, res));
      return res.status(200).json({
        success: true,
        data: grades,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al consultar las calificaciones de la actividad.",
      });
    }
  }

  static async getGradesHistory(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const { courseId, subjectId, activityId, studentId } = req.query;

      const history = await AcademicService.getGradesHistory(organizationId, {
        courseId: courseId ? parseInt(String(courseId), 10) : undefined,
        subjectId: subjectId ? parseInt(String(subjectId), 10) : undefined,
        activityId: activityId ? parseInt(String(activityId), 10) : undefined,
        studentId: studentId ? parseInt(String(studentId), 10) : undefined,
      }, getAccessContext(req, res));

      return res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      const status = getErrorStatus(error, 400);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al consultar historial de calificaciones.",
      });
    }
  }

  static async getStudentGrades(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const studentId = parseParamId(req.params.studentId);
      if (isNaN(studentId) || studentId <= 0) {
        return res.status(400).json({ success: false, error: "ID de estudiante inválido." });
      }

      const grades = await AcademicService.getStudentGrades(organizationId, studentId, getAccessContext(req, res));
      return res.status(200).json({
        success: true,
        data: grades,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al consultar calificaciones del estudiante.",
      });
    }
  }

  static async updateGradeRecord(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const gradeId = parseParamId(req.params.gradeId);
      if (isNaN(gradeId) || gradeId <= 0) {
        return res.status(400).json({ success: false, error: "ID de calificación inválido." });
      }

      const { score, status, comments, reason } = req.body;

      if (score !== undefined && score !== null && (typeof score !== "number" || isNaN(score) || !isFinite(score) || score < 0)) {
        return res.status(400).json({ success: false, error: "El campo score debe ser un número no negativo válido o null." });
      }

      const changedByUserId = (req as any).user?.id ? Number((req as any).user.id) : null;

      const updated = await AcademicService.updateGradeRecord(organizationId, gradeId, {
        score: score !== undefined ? (score === null ? null : Number(score)) : undefined,
        status: status ? (String(status).trim().toUpperCase() as any) : undefined,
        comments: comments !== undefined ? (comments ? String(comments).trim() : null) : undefined,
        reason: reason ? String(reason).trim() : undefined,
        changedByUserId,
      }, getAccessContext(req, res));

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al actualizar la calificación.",
      });
    }
  }

  // ============================================================================
  // AÑOS LECTIVOS (AcademicYear - FASE 3/4)
  // ============================================================================

  static async createAcademicYear(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const { name, startDate, endDate, status } = req.body;

      if (!name || !startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: "Los campos name, startDate y endDate son obligatorios.",
        });
      }

      const year = await AcademicService.createAcademicYear(organizationId, {
        name,
        startDate,
        endDate,
        status,
      });

      return res.status(201).json({
        success: true,
        data: year,
      });
    } catch (error: any) {
      const isConflict =
        error.message?.includes("ACADEMIC_YEAR_ALREADY_ACTIVE") ||
        error.message?.includes("Ya existe");
      const status = isConflict ? 409 : 400;
      const errorMsg = error.message?.includes("ACADEMIC_YEAR_ALREADY_ACTIVE")
        ? "Ya existe un año lectivo activo en esta institución. Cierra o archiva el año actual antes de activar otro."
        : error.message || "Error al crear el año lectivo.";

      return res.status(status).json({
        success: false,
        error: errorMsg,
      });
    }
  }

  static async getAcademicYears(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const { status, search } = req.query;

      const years = await AcademicService.getAcademicYears(organizationId, {
        status: status as any,
        search: search as string | undefined,
      });

      return res.status(200).json({
        success: true,
        data: years,
      });
    } catch (error: any) {
      const status = getErrorStatus(error, 400);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al consultar años lectivos.",
      });
    }
  }

  static async getAcademicYearById(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const yearId = parseParamId(req.params.yearId);
      if (isNaN(yearId) || yearId <= 0) {
        return res.status(400).json({ success: false, error: "ID de año lectivo inválido." });
      }

      const year = await AcademicService.getAcademicYearById(organizationId, yearId);
      return res.status(200).json({
        success: true,
        data: year,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al obtener el año lectivo.",
      });
    }
  }

  static async updateAcademicYear(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const yearId = parseParamId(req.params.yearId);
      if (isNaN(yearId) || yearId <= 0) {
        return res.status(400).json({ success: false, error: "ID de año lectivo inválido." });
      }

      const { name, startDate, endDate, status } = req.body;

      const updated = await AcademicService.updateAcademicYear(organizationId, yearId, {
        name,
        startDate,
        endDate,
        status,
      });

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      const isNotFound = error.message?.includes("no encontrado");
      const isConflict =
        error.message?.includes("ACADEMIC_YEAR_ALREADY_ACTIVE") ||
        error.message?.includes("Ya existe");
      const status = isNotFound ? 404 : isConflict ? 409 : 400;
      const errorMsg = error.message?.includes("ACADEMIC_YEAR_ALREADY_ACTIVE")
        ? "Ya existe un año lectivo activo en esta institución. Cierra o archiva el año actual antes de activar otro."
        : error.message || "Error al actualizar el año lectivo.";

      return res.status(status).json({
        success: false,
        error: errorMsg,
      });
    }
  }

  static async changeAcademicYearStatus(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const yearId = parseParamId(req.params.yearId);
      if (isNaN(yearId) || yearId <= 0) {
        return res.status(400).json({ success: false, error: "ID de año lectivo inválido." });
      }

      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, error: "El campo status es obligatorio." });
      }

      const updated = await AcademicService.changeAcademicYearStatus(organizationId, yearId, status);
      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      const isNotFound = error.message?.includes("no encontrado");
      const isConflict =
        error.message?.includes("ACADEMIC_YEAR_ALREADY_ACTIVE") ||
        error.message?.includes("Ya existe");
      const status = isNotFound ? 404 : isConflict ? 409 : 400;
      const errorMsg = error.message?.includes("ACADEMIC_YEAR_ALREADY_ACTIVE")
        ? "Ya existe un año lectivo activo en esta institución. Cierra o archiva el año actual antes de activar otro."
        : error.message || "Error al cambiar el estado del año lectivo.";

      return res.status(status).json({
        success: false,
        error: errorMsg,
      });
    }
  }

  // ============================================================================
  // PERIODOS ACADÉMICOS (AcademicPeriod - FASE 3/4)
  // ============================================================================

  static async createAcademicPeriod(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const { academicYearId, parentId, name, type, order, startDate, endDate, status } = req.body;

      const parsedYearId = parseInt(String(academicYearId), 10);
      if (isNaN(parsedYearId) || parsedYearId <= 0) {
        return res.status(400).json({ success: false, error: "El campo academicYearId es obligatorio y debe ser numérico." });
      }

      if (!name || !type || !startDate || !endDate) {
        return res.status(400).json({ success: false, error: "Los campos name, type, startDate y endDate son obligatorios." });
      }

      const period = await AcademicService.createAcademicPeriod(organizationId, {
        academicYearId: parsedYearId,
        parentId: parentId ? parseInt(String(parentId), 10) : null,
        name,
        type,
        order: order !== undefined ? Number(order) : undefined,
        startDate,
        endDate,
        status,
      });

      return res.status(201).json({
        success: true,
        data: period,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al registrar el periodo académico.",
      });
    }
  }

  static async getAcademicPeriods(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const { academicYearId, parentId, type, status } = req.query;

      const periods = await AcademicService.getAcademicPeriods(organizationId, {
        academicYearId: academicYearId ? parseInt(String(academicYearId), 10) : undefined,
        parentId: parentId !== undefined ? (parentId === "null" || parentId === "" ? null : parseInt(String(parentId), 10)) : undefined,
        type: type as any,
        status: status as any,
      });

      return res.status(200).json({
        success: true,
        data: periods,
      });
    } catch (error: any) {
      const status = getErrorStatus(error, 400);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al consultar periodos académicos.",
      });
    }
  }

  static async getAcademicPeriodById(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const periodId = parseParamId(req.params.periodId);
      if (isNaN(periodId) || periodId <= 0) {
        return res.status(400).json({ success: false, error: "ID de periodo inválido." });
      }

      const period = await AcademicService.getAcademicPeriodById(organizationId, periodId);
      return res.status(200).json({
        success: true,
        data: period,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al obtener el periodo académico.",
      });
    }
  }

  static async updateAcademicPeriod(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const periodId = parseParamId(req.params.periodId);
      if (isNaN(periodId) || periodId <= 0) {
        return res.status(400).json({ success: false, error: "ID de periodo inválido." });
      }

      const { name, type, order, startDate, endDate, parentId, status } = req.body;

      const updated = await AcademicService.updateAcademicPeriod(organizationId, periodId, {
        name,
        type,
        order: order !== undefined ? Number(order) : undefined,
        startDate,
        endDate,
        parentId: parentId !== undefined ? (parentId === null ? null : parseInt(String(parentId), 10)) : undefined,
        status,
      });

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al actualizar el periodo académico.",
      });
    }
  }

  static async getPeriodClosureReadiness(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const periodId = parseParamId(req.params.periodId);
      if (isNaN(periodId) || periodId <= 0) {
        return res.status(400).json({ success: false, error: "ID de periodo inválido." });
      }

      const readiness = await AcademicService.getPeriodClosureReadiness(organizationId, periodId);
      return res.status(200).json({
        success: true,
        data: readiness,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al obtener la verificación de cierre del periodo.",
      });
    }
  }

  static async changeAcademicPeriodStatus(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const periodId = parseParamId(req.params.periodId);
      if (isNaN(periodId) || periodId <= 0) {
        return res.status(400).json({ success: false, error: "ID de periodo inválido." });
      }

      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, error: "El campo status es obligatorio." });
      }

      const updated = await AcademicService.changeAcademicPeriodStatus(organizationId, periodId, status);
      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      if (error.code === "ACADEMIC_PERIOD_NOT_READY_TO_CLOSE" || error.statusCode === 409) {
        return res.status(409).json({
          success: false,
          error: error.message || "El periodo académico no cumple los requisitos para ser cerrado.",
          code: "ACADEMIC_PERIOD_NOT_READY_TO_CLOSE",
          blockers: error.blockers || [],
          readiness: error.readiness || null,
        });
      }

      const status = error.message?.includes("no encontrado") ? 404 : 400;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al cambiar el estado del periodo académico.",
      });
    }
  }

  // ============================================================================
  // ESQUEMAS DE EVALUACIÓN (AcademicEvaluationScheme - FASE 3/4)
  // ============================================================================

  static async createEvaluationScheme(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const { courseId, subjectId, academicPeriodId, maxScale, minPassingScore, status } = req.body;

      const parsedCourseId = parseInt(String(courseId), 10);
      const parsedSubjectId = parseInt(String(subjectId), 10);
      const parsedPeriodId = parseInt(String(academicPeriodId), 10);

      if (isNaN(parsedCourseId) || isNaN(parsedSubjectId) || isNaN(parsedPeriodId)) {
        return res.status(400).json({
          success: false,
          error: "Los campos courseId, subjectId y academicPeriodId son obligatorios y numéricos.",
        });
      }

      const scheme = await AcademicService.createEvaluationScheme(organizationId, {
        courseId: parsedCourseId,
        subjectId: parsedSubjectId,
        academicPeriodId: parsedPeriodId,
        maxScale: maxScale !== undefined ? Number(maxScale) : undefined,
        minPassingScore: minPassingScore !== undefined ? Number(minPassingScore) : undefined,
        status,
      }, getAccessContext(req, res));

      return res.status(201).json({
        success: true,
        data: scheme,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al crear el esquema de evaluación.",
      });
    }
  }

  static async getEvaluationSchemes(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const { academicPeriodId, courseId, subjectId, status } = req.query;

      const schemes = await AcademicService.getEvaluationSchemes(organizationId, {
        academicPeriodId: academicPeriodId ? parseInt(String(academicPeriodId), 10) : undefined,
        courseId: courseId ? parseInt(String(courseId), 10) : undefined,
        subjectId: subjectId ? parseInt(String(subjectId), 10) : undefined,
        status: status as any,
      }, getAccessContext(req, res));

      return res.status(200).json({
        success: true,
        data: schemes,
      });
    } catch (error: any) {
      const status = getErrorStatus(error, 400);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al consultar esquemas de evaluación.",
      });
    }
  }

  static async getEvaluationSchemeById(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const schemeId = parseParamId(req.params.schemeId);
      if (isNaN(schemeId) || schemeId <= 0) {
        return res.status(400).json({ success: false, error: "ID de esquema inválido." });
      }

      const scheme = await AcademicService.getEvaluationSchemeById(organizationId, schemeId, getAccessContext(req, res));
      return res.status(200).json({
        success: true,
        data: scheme,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al obtener el esquema de evaluación.",
      });
    }
  }

  static async updateEvaluationScheme(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const schemeId = parseParamId(req.params.schemeId);
      if (isNaN(schemeId) || schemeId <= 0) {
        return res.status(400).json({ success: false, error: "ID de esquema inválido." });
      }

      const { maxScale, minPassingScore, status } = req.body;

      const updated = await AcademicService.updateEvaluationScheme(organizationId, schemeId, {
        maxScale: maxScale !== undefined ? Number(maxScale) : undefined,
        minPassingScore: minPassingScore !== undefined ? Number(minPassingScore) : undefined,
        status,
      }, getAccessContext(req, res));

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al actualizar el esquema de evaluación.",
      });
    }
  }

  static async validateEvaluationScheme(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const schemeId = parseParamId(req.params.schemeId);
      if (isNaN(schemeId) || schemeId <= 0) {
        return res.status(400).json({ success: false, error: "ID de esquema inválido." });
      }

      const validated = await AcademicService.validateEvaluationScheme(organizationId, schemeId, getAccessContext(req, res));
      return res.status(200).json({
        success: true,
        data: validated,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al validar el esquema de evaluación.",
      });
    }
  }

  static async lockEvaluationScheme(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const schemeId = parseParamId(req.params.schemeId);
      if (isNaN(schemeId) || schemeId <= 0) {
        return res.status(400).json({ success: false, error: "ID de esquema inválido." });
      }

      const locked = await AcademicService.lockEvaluationScheme(organizationId, schemeId, getAccessContext(req, res));
      return res.status(200).json({
        success: true,
        data: locked,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al bloquear el esquema de evaluación.",
      });
    }
  }

  static async closeEvaluationScheme(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const schemeId = parseParamId(req.params.schemeId);
      if (isNaN(schemeId) || schemeId <= 0) {
        return res.status(400).json({ success: false, error: "ID de esquema inválido." });
      }

      const closed = await AcademicService.closeEvaluationScheme(organizationId, schemeId, getAccessContext(req, res));
      return res.status(200).json({
        success: true,
        data: closed,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al cerrar el esquema de evaluación.",
      });
    }
  }

  // ============================================================================
  // CATEGORÍAS DE EVALUACIÓN (AcademicEvaluationCategory - FASE 3/4)
  // ============================================================================

  static async createEvaluationCategory(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const schemeId = parseParamId(req.params.schemeId);
      if (isNaN(schemeId) || schemeId <= 0) {
        return res.status(400).json({ success: false, error: "ID de esquema inválido." });
      }

      const { name, weightPercentage, order } = req.body;

      if (!name || weightPercentage === undefined || weightPercentage === null) {
        return res.status(400).json({
          success: false,
          error: "Los campos name y weightPercentage son obligatorios.",
        });
      }

      const category = await AcademicService.createEvaluationCategory(organizationId, schemeId, {
        name,
        weightPercentage: Number(weightPercentage),
        order: order !== undefined ? Number(order) : undefined,
      }, getAccessContext(req, res));

      return res.status(201).json({
        success: true,
        data: category,
      });
    } catch (error: any) {
      const isNotFound = error.message?.includes("no encontrado");
      const isConflict = error.message?.includes("EVALUATION_CATEGORY_DUPLICATE") || error.message?.includes("Ya existe");
      const status = isNotFound ? 404 : isConflict ? 409 : 400;
      const errorMsg = error.message?.includes("EVALUATION_CATEGORY_DUPLICATE")
        ? "Ya existe una categoría con ese nombre en este esquema."
        : error.message || "Error al registrar la categoría de evaluación.";

      return res.status(status).json({
        success: false,
        error: errorMsg,
      });
    }
  }

  static async updateEvaluationCategory(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const categoryId = parseParamId(req.params.categoryId);
      if (isNaN(categoryId) || categoryId <= 0) {
        return res.status(400).json({ success: false, error: "ID de categoría inválido." });
      }

      const { name, weightPercentage, order } = req.body;

      const updated = await AcademicService.updateEvaluationCategory(organizationId, categoryId, {
        name,
        weightPercentage: weightPercentage !== undefined ? Number(weightPercentage) : undefined,
        order: order !== undefined ? Number(order) : undefined,
      }, getAccessContext(req, res));

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      const isNotFound = error.message?.includes("no encontrada");
      const isConflict = error.message?.includes("EVALUATION_CATEGORY_DUPLICATE") || error.message?.includes("Ya existe");
      const status = isNotFound ? 404 : isConflict ? 409 : 400;
      const errorMsg = error.message?.includes("EVALUATION_CATEGORY_DUPLICATE")
        ? "Ya existe una categoría con ese nombre en este esquema."
        : error.message || "Error al actualizar la categoría de evaluación.";

      return res.status(status).json({
        success: false,
        error: errorMsg,
      });
    }
  }

  static async deleteEvaluationCategory(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const categoryId = parseParamId(req.params.categoryId);
      if (isNaN(categoryId) || categoryId <= 0) {
        return res.status(400).json({ success: false, error: "ID de categoría inválido." });
      }

      const deleted = await AcademicService.deleteEvaluationCategory(organizationId, categoryId, getAccessContext(req, res));
      return res.status(200).json({
        success: true,
        data: deleted,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al eliminar la categoría de evaluación.",
      });
    }
  }

  // ============================================================================
  // SÁBANA / MATRIZ DE CALIFICACIONES (Grades Matrix - FASE 3/4)
  // ============================================================================

  static async getPeriodGradesMatrix(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const { courseId, subjectId, academicPeriodId, periodId, studentId } = req.query;

      const effectivePeriodId = academicPeriodId || periodId;

      const parsedCourseId = parseInt(String(courseId), 10);
      const parsedSubjectId = parseInt(String(subjectId), 10);
      const parsedPeriodId = parseInt(String(effectivePeriodId), 10);

      if (isNaN(parsedCourseId) || isNaN(parsedSubjectId) || isNaN(parsedPeriodId)) {
        return res.status(400).json({
          success: false,
          error: "Los parámetros de consulta courseId, subjectId y academicPeriodId son obligatorios y numéricos.",
        });
      }

      const parsedStudentId = studentId ? parseInt(String(studentId), 10) : undefined;

      const matrix = await AcademicService.calculatePeriodGradesMatrix(
        organizationId,
        parsedCourseId,
        parsedSubjectId,
        parsedPeriodId,
        parsedStudentId,
        getAccessContext(req, res)
      );

      return res.status(200).json({
        success: true,
        data: matrix,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al calcular la matriz de calificaciones.",
      });
    }
  }

  // ============================================================================
  // DASHBOARD ACADÉMICO REAL (FASE 4)
  // ============================================================================

  static async getDashboard(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const dashboard = await AcademicService.getDashboard(organizationId, getAccessContext(req, res));

      return res.status(200).json({
        success: true,
        data: dashboard,
      });
    } catch (error: any) {
      const status = getErrorStatus(error, 400);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al obtener el dashboard académico.",
      });
    }
  }

  // ============================================================================
  // REPORTES ACADÉMICOS Y READ MODELS FACTUALES (FASE 5)
  // ============================================================================

  static async getRosterReport(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const courseId = parseOptionalPositiveInt(req.query.courseId, "courseId");
      const status = req.query.status ? String(req.query.status).trim() : undefined;

      const report = await AcademicService.getStudentRosterReport(organizationId, {
        courseId,
        status,
      }, getAccessContext(req, res));

      return res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al generar nómina de estudiantes.",
      });
    }
  }

  static async getAttendanceReport(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const courseId = parseOptionalPositiveInt(req.query.courseId, "courseId");
      const subjectId = parseOptionalPositiveInt(req.query.subjectId, "subjectId");
      const studentId = parseOptionalPositiveInt(req.query.studentId, "studentId");
      const from = parseOptionalDateString(req.query.from, "from");
      const to = parseOptionalDateString(req.query.to, "to");

      if (from && to) {
        const fromDate = new Date(from);
        const toDate = new Date(to);
        if (fromDate > toDate) {
          return res.status(400).json({
            success: false,
            error: "Rango de fechas inválido: 'from' no puede ser posterior a 'to'.",
          });
        }
      }

      const report = await AcademicService.getAttendanceReport(organizationId, {
        courseId,
        subjectId,
        studentId,
        from,
        to,
      }, getAccessContext(req, res));

      return res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al generar reporte de asistencia.",
      });
    }
  }

  static async getGradeReport(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const courseId = parseOptionalPositiveInt(req.query.courseId, "courseId");
      const subjectId = parseOptionalPositiveInt(req.query.subjectId, "subjectId");

      const report = await AcademicService.getGradeReport(organizationId, {
        courseId,
        subjectId,
      }, getAccessContext(req, res));

      return res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al generar boletín de calificaciones.",
      });
    }
  }

  static async getStudentReport(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const studentId = parseOptionalPositiveInt(req.params.studentId, "studentId");
      if (!studentId) {
        return res.status(400).json({ success: false, error: "ID de estudiante inválido." });
      }

      const report = await AcademicService.getStudentReport(organizationId, studentId, getAccessContext(req, res));

      return res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      const status = getErrorStatus(error);
      return res.status(status).json({
        success: false,
        error: error.message || "Error al generar ficha individual del estudiante.",
      });
    }
  }
}



