import { Request, Response } from "express";
import { AcademicService } from "../services/academic.service";

function parseParamId(raw: string | string[] | undefined): number {
  if (!raw) return NaN;
  const val = Array.isArray(raw) ? raw[0] : raw;
  return parseInt(String(val), 10);
}

function getOrgId(req: Request): number {
  const orgId = (req as any).organizationId || parseParamId(req.params.id);
  if (!orgId || isNaN(orgId) || orgId <= 0) {
    throw new Error("Identificador de organización inválido.");
  }
  return orgId;
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
      const status = error.message?.includes("Ya existe") ? 409 : 400;
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
      });

      return res.status(200).json({
        success: true,
        data: courses,
      });
    } catch (error: any) {
      return res.status(400).json({
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

      const course = await AcademicService.getCourseById(organizationId, courseId);
      return res.status(200).json({
        success: true,
        data: course,
      });
    } catch (error: any) {
      const status = error.message?.includes("no encontrado") ? 404 : 400;
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
      const status = error.message?.includes("no encontrado")
        ? 404
        : error.message?.includes("Ya existe")
        ? 409
        : 400;
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
      const status = error.message?.includes("no encontrado") ? 404 : 400;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al archivar el curso.",
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

      const { name, code, hoursPerWeek, teacherUserId } = req.body;

      const subject = await AcademicService.createSubject(organizationId, courseId, {
        name,
        code,
        hoursPerWeek: hoursPerWeek !== undefined && hoursPerWeek !== null ? Number(hoursPerWeek) : null,
        teacherUserId: teacherUserId ? parseInt(teacherUserId, 10) : null,
      });

      return res.status(201).json({
        success: true,
        data: subject,
      });
    } catch (error: any) {
      const status = error.message?.includes("no encontrado")
        ? 404
        : error.message?.includes("Ya existe")
        ? 409
        : 400;
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

      const subjects = await AcademicService.getSubjectsByCourse(organizationId, courseId);
      return res.status(200).json({
        success: true,
        data: subjects,
      });
    } catch (error: any) {
      const status = error.message?.includes("no encontrado") ? 404 : 400;
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

      const { name, code, hoursPerWeek, teacherUserId } = req.body;

      const updated = await AcademicService.updateSubject(organizationId, subjectId, {
        name,
        code,
        hoursPerWeek: hoursPerWeek !== undefined && hoursPerWeek !== null ? Number(hoursPerWeek) : undefined,
        teacherUserId: teacherUserId !== undefined ? (teacherUserId ? parseInt(teacherUserId, 10) : null) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      const status = error.message?.includes("no encontrada")
        ? 404
        : error.message?.includes("Ya existe")
        ? 409
        : 400;
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
      const status = error.message?.includes("no encontrada") ? 404 : 400;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al inactivar la materia.",
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
      const status = error.message?.includes("Ya existe") ? 409 : 400;
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
      });

      return res.status(200).json({
        success: true,
        data: students,
      });
    } catch (error: any) {
      return res.status(400).json({
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

      const student = await AcademicService.getStudentById(organizationId, studentId);
      return res.status(200).json({
        success: true,
        data: student,
      });
    } catch (error: any) {
      const status = error.message?.includes("no encontrado") ? 404 : 400;
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
      const status = error.message?.includes("no encontrado")
        ? 404
        : error.message?.includes("Ya existe")
        ? 409
        : 400;
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
      const status = error.message?.includes("no encontrado") ? 404 : 400;
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
      const { studentId, courseId, period } = req.body;

      const parsedStudentId = parseInt(studentId, 10);
      const parsedCourseId = parseInt(courseId, 10);

      if (isNaN(parsedStudentId) || isNaN(parsedCourseId)) {
        return res.status(400).json({
          success: false,
          error: "Los identificadores de estudiante y curso son requeridos y deben ser numéricos.",
        });
      }

      const enrollment = await AcademicService.enrollStudent(organizationId, {
        studentId: parsedStudentId,
        courseId: parsedCourseId,
        period,
      });

      return res.status(201).json({
        success: true,
        data: enrollment,
      });
    } catch (error: any) {
      const status = error.message?.includes("no existe")
        ? 404
        : error.message?.includes("ya se encuentra matriculado")
        ? 409
        : 400;
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
      return res.status(400).json({
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
      const status = error.message?.includes("no encontrada") ? 404 : 400;
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
      const status = error.message?.includes("no encontrado") ? 404 : 400;
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
      });

      return res.status(200).json({
        success: true,
        data: sessions,
      });
    } catch (error: any) {
      return res.status(400).json({
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

      const session = await AcademicService.getSessionById(organizationId, sessionId);
      return res.status(200).json({
        success: true,
        data: session,
      });
    } catch (error: any) {
      const status = error.message?.includes("no encontrada") ? 404 : 400;
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
      const status = error.message?.includes("no encontrada") ? 404 : 400;
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
      const status = error.message?.includes("no encontrada") ? 404 : 400;
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
      const status = error.message?.includes("no encontrada") ? 404 : 400;
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
        sanitizedRecords
      );

      return res.status(200).json({
        success: true,
        data: saved,
      });
    } catch (error: any) {
      const status = error.message?.includes("no encontrada") ? 404 : 400;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al guardar el registro de asistencia.",
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

      const records = await AcademicService.getAttendanceBySession(organizationId, sessionId);
      return res.status(200).json({
        success: true,
        data: records,
      });
    } catch (error: any) {
      const status = error.message?.includes("no encontrada") ? 404 : 400;
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
      });

      return res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      return res.status(400).json({
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
      });

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      const status = error.message?.includes("no encontrado") ? 404 : 400;
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

      const { subjectId, name, description, type, dueDate, maxScore, teacherUserId } = req.body;

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
      });

      return res.status(201).json({
        success: true,
        data: created,
      });
    } catch (error: any) {
      const status = error.message?.includes("no encontrado") ? 404 : 400;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al registrar la actividad.",
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
      });

      return res.status(200).json({
        success: true,
        data: activities,
      });
    } catch (error: any) {
      return res.status(400).json({
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

      const activity = await AcademicService.getActivityById(organizationId, activityId);
      return res.status(200).json({
        success: true,
        data: activity,
      });
    } catch (error: any) {
      const status = error.message?.includes("no encontrada") ? 404 : 400;
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

      const { name, description, type, dueDate, maxScore, teacherUserId } = req.body;

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
      });

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      const status = error.message?.includes("no encontrada") ? 404 : 400;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al actualizar la actividad.",
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

      const { grades } = req.body;
      if (!Array.isArray(grades) || grades.length === 0) {
        return res.status(400).json({
          success: false,
          error: "El cuerpo de la solicitud debe incluir un array 'grades' no vacío.",
        });
      }

      const formattedGrades = grades.map((item: any) => ({
        studentId: parseInt(String(item.studentId), 10),
        score: item.score !== undefined && item.score !== null ? Number(item.score) : NaN,
        comments: item.comments ? String(item.comments) : null,
      }));

      const saved = await AcademicService.saveGradesBatch(
        organizationId,
        activityId,
        formattedGrades
      );

      return res.status(200).json({
        success: true,
        data: saved,
      });
    } catch (error: any) {
      const status = error.message?.includes("no encontrada") ? 404 : 400;
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

      const grades = await AcademicService.getGradesByActivity(organizationId, activityId);
      return res.status(200).json({
        success: true,
        data: grades,
      });
    } catch (error: any) {
      const status = error.message?.includes("no encontrada") ? 404 : 400;
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
      });

      return res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      return res.status(400).json({
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

      const grades = await AcademicService.getStudentGrades(organizationId, studentId);
      return res.status(200).json({
        success: true,
        data: grades,
      });
    } catch (error: any) {
      const status = error.message?.includes("no encontrado") ? 404 : 400;
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

      const { score, comments } = req.body;

      if (score !== undefined && (typeof score !== "number" || isNaN(score) || !isFinite(score) || score < 0)) {
        return res.status(400).json({ success: false, error: "El campo score debe ser un número no negativo válido." });
      }

      const updated = await AcademicService.updateGradeRecord(organizationId, gradeId, {
        score: score !== undefined ? Number(score) : undefined,
        comments: comments !== undefined ? (comments ? String(comments).trim() : null) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      const status = error.message?.includes("no encontrada") ? 404 : 400;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al actualizar la calificación.",
      });
    }
  }

  // ============================================================================
  // DASHBOARD ACADÉMICO REAL (FASE 4)
  // ============================================================================

  static async getDashboard(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const currentUserId = (req as any).user?.id ? Number((req as any).user.id) : undefined;

      const dashboard = await AcademicService.getDashboard(organizationId, currentUserId);

      return res.status(200).json({
        success: true,
        data: dashboard,
      });
    } catch (error: any) {
      return res.status(400).json({
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
      const { courseId, status } = req.query;

      const report = await AcademicService.getStudentRosterReport(organizationId, {
        courseId: courseId ? parseInt(String(courseId), 10) : undefined,
        status: status as string | undefined,
      });

      return res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      const status = error.message?.includes("no encontrado") ? 404 : 400;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al generar nómina de estudiantes.",
      });
    }
  }

  static async getAttendanceReport(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const { courseId, subjectId, studentId, from, to } = req.query;

      const report = await AcademicService.getAttendanceReport(organizationId, {
        courseId: courseId ? parseInt(String(courseId), 10) : undefined,
        subjectId: subjectId ? parseInt(String(subjectId), 10) : undefined,
        studentId: studentId ? parseInt(String(studentId), 10) : undefined,
        from: from as string | undefined,
        to: to as string | undefined,
      });

      return res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      const status = error.message?.includes("no encontrado") || error.message?.includes("no encontrada") ? 404 : 400;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al generar reporte de asistencia.",
      });
    }
  }

  static async getGradeReport(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const { courseId, subjectId } = req.query;

      const report = await AcademicService.getGradeReport(organizationId, {
        courseId: courseId ? parseInt(String(courseId), 10) : undefined,
        subjectId: subjectId ? parseInt(String(subjectId), 10) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      const status = error.message?.includes("no encontrado") || error.message?.includes("no encontrada") ? 404 : 400;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al generar boletín de calificaciones.",
      });
    }
  }

  static async getStudentReport(req: Request, res: Response) {
    try {
      const organizationId = getOrgId(req);
      const studentId = parseParamId(req.params.studentId);
      if (isNaN(studentId) || studentId <= 0) {
        return res.status(400).json({ success: false, error: "ID de estudiante inválido." });
      }

      const report = await AcademicService.getStudentReport(organizationId, studentId);

      return res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      const status = error.message?.includes("no encontrado") ? 404 : 400;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al generar ficha individual del estudiante.",
      });
    }
  }
}



