import {
  Prisma,
  AcademicYearStatus,
  AcademicPeriodType,
  AcademicPeriodStatus,
  AcademicEvaluationSchemeStatus,
  AcademicGradeStatus,
} from "@prisma/client";
import { db } from "../lib/db";
import {
  ACADEMIC_ACTIVITY_TYPE,
  ACADEMIC_ATTENDANCE_STATUS,
  ACADEMIC_CLASS_SESSION_STATUS,
  ACADEMIC_COURSE_STATUS,
  ACADEMIC_ENROLLMENT_STATUS,
  ACADEMIC_STUDENT_STATUS,
  ACADEMIC_SUBJECT_STATUS,
  ACADEMIC_YEAR_STATUS,
  ACADEMIC_PERIOD_TYPE,
  ACADEMIC_PERIOD_STATUS,
  ACADEMIC_EVALUATION_SCHEME_STATUS,
  ACADEMIC_GRADE_STATUS,
} from "../constants/academic.constants";
import { ORGANIZATION_MEMBER_STATUS } from "../constants/organization.constants";

export interface AcademicAccessContext {
  userId?: number;
  isAcademicAdmin?: boolean;
}

/**
 * Retorna true si la fecha de inicio del periodo es estrictamente futura respecto a la fecha actual o de referencia,
 * considerando el calendario y la zona horaria académica oficial (America/Guayaquil, UTC-5).
 */
export function isAcademicPeriodFuture(startDate: Date | string, referenceDate: Date = new Date()): boolean {
  if (!startDate) return false;
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  if (isNaN(start.getTime())) return false;

  const nowUtcStr = referenceDate.toISOString().split("T")[0];
  const startUtcStr = start.toISOString().split("T")[0];

  if (nowUtcStr < startUtcStr) {
    return true;
  }
  if (referenceDate.getTime() < start.getTime()) {
    const nowEcStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Guayaquil",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(referenceDate);
    const startEcStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Guayaquil",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(start);
    if (nowEcStr >= startEcStr) {
      return false;
    }
    return true;
  }
  return false;
}

/**
 * Retorna la fecha formateada en 'YYYY-MM-DD' bajo la zona horaria oficial de Ecuador (America/Guayaquil, UTC-5).
 */
export function getEcuadorDateString(date: Date | string = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Guayaquil",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Retorna el día de la semana (1 = Lunes, 2 = Martes, 3 = Miércoles, 4 = Jueves, 5 = Viernes, 6 = Sábado, 7 = Domingo)
 * evaluado en la zona horaria oficial de Ecuador (America/Guayaquil, UTC-5).
 */
export function getEcuadorDayOfWeek(date: Date | string = new Date()): number {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return 1;
  const weekdayStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Guayaquil",
    weekday: "short",
  }).format(d);
  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return map[weekdayStr] || 1;
}

export function getDayNameSpanish(dayOfWeek: number): string {
  const names = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  return names[dayOfWeek] || "Día";
}

export interface ScheduleSlotInput {
  id?: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  pedagogicalHours?: number;
  room?: string | null;
  teacherUserId?: number | null;
}

export interface SaveSubjectScheduleInput {
  academicYearId: number;
  effectiveFrom?: string | Date;
  slots: ScheduleSlotInput[];
}

export type SubjectScheduleStatus = "no_schedule" | "incomplete" | "complete" | "excess";

export interface CreateAcademicActivityInput {
  subjectId: number;
  name: string;
  description?: string | null;
  type?: string;
  dueDate?: string | Date | null;
  maxScore: number;
  teacherUserId?: number | null;
  academicPeriodId?: number | null;
  evaluationSchemeId?: number | null;
  categoryId?: number | null;
}

export interface UpdateAcademicActivityInput {
  name?: string;
  description?: string | null;
  type?: string;
  dueDate?: string | Date | null;
  maxScore?: number;
  teacherUserId?: number | null;
  academicPeriodId?: number | null;
  evaluationSchemeId?: number | null;
  categoryId?: number | null;
}

export interface GradeRecordItemInput {
  studentId?: number;
  enrollmentId?: number;
  score?: number | null;
  status?: AcademicGradeStatus;
  comments?: string | null;
  reason?: string | null;
}

export interface SaveGradesBatchInput {
  grades: GradeRecordItemInput[];
  reason?: string | null;
  changedByUserId?: number | null;
}

export interface CreateAcademicYearInput {
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  status?: AcademicYearStatus;
}

export interface UpdateAcademicYearInput {
  name?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  status?: AcademicYearStatus;
}

export interface CreateAcademicPeriodInput {
  academicYearId: number;
  parentId?: number | null;
  name: string;
  type: AcademicPeriodType;
  order?: number;
  startDate: string | Date;
  endDate: string | Date;
  status?: AcademicPeriodStatus;
}

export interface UpdateAcademicPeriodInput {
  name?: string;
  type?: AcademicPeriodType;
  order?: number;
  startDate?: string | Date;
  endDate?: string | Date;
  parentId?: number | null;
  status?: AcademicPeriodStatus;
}

export interface CreateEvaluationSchemeInput {
  courseId: number;
  subjectId: number;
  academicPeriodId: number;
  maxScale?: number;
  minPassingScore?: number;
  status?: AcademicEvaluationSchemeStatus;
}

export interface UpdateEvaluationSchemeInput {
  maxScale?: number;
  minPassingScore?: number;
  status?: AcademicEvaluationSchemeStatus;
}

export interface CreateEvaluationCategoryInput {
  name: string;
  weightPercentage: number;
  order?: number;
}

export interface UpdateEvaluationCategoryInput {
  name?: string;
  weightPercentage?: number;
  order?: number;
}

export interface PeriodClosureBlocker {
  type: "PENDING_GRADES" | "ABSENT_GRADES" | "INVALID_SCHEMES" | "INCOMPLETE_WEIGHTS";
  message: string;
  count: number;
  details?: any[];
}

export interface PeriodClosureWarning {
  type: "EXCUSED_GRADES_PRESENT" | "NO_ACTIVITIES";
  message: string;
  count: number;
}

export interface PeriodClosureReadinessDTO {
  periodId: number;
  periodName: string;
  periodStatus: AcademicPeriodStatus;
  canClose: boolean;
  totalActivities: number;
  totalEnrollments: number;
  totalGrades: number;
  gradeSummary: {
    graded: number;
    pending: number;
    absent: number;
    excused: number;
  };
  schemes: {
    total: number;
    valid: number;
    draft: number;
    locked: number;
    closed: number;
    invalidWeight: number;
  };
  students: {
    total: number;
    complete: number;
    incomplete: number;
  };
  blockers: PeriodClosureBlocker[];
  warnings: PeriodClosureWarning[];
}

export interface CreateAcademicClassSessionInput {
  courseId: number;
  subjectId?: number | null;
  teacherUserId?: number | null;
  sessionDate: string | Date;
  startTime?: string | null;
  endTime?: string | null;
  room?: string | null;
  topic?: string | null;
}

export interface UpdateAcademicClassSessionInput {
  subjectId?: number | null;
  teacherUserId?: number | null;
  sessionDate?: string | Date;
  startTime?: string | null;
  endTime?: string | null;
  room?: string | null;
  topic?: string | null;
  status?: string;
}

export interface AttendanceRecordItemInput {
  studentId: number;
  status: string;
  observation?: string | null;
}

export interface SaveAttendanceBatchInput {
  sessionId: number;
  records: AttendanceRecordItemInput[];
}

export interface CreateAcademicCourseInput {
  name: string;
  level: string;
  classroom?: string | null;
  tutorUserId?: number | null;
}

export interface UpdateAcademicCourseInput {
  name?: string;
  level?: string;
  classroom?: string | null;
  tutorUserId?: number | null;
}

export interface CreateAcademicSubjectInput {
  name: string;
  code?: string | null;
  hoursPerWeek?: number | null;
  teacherUserId?: number | null;
  academicYearId?: number | null;
  effectiveFrom?: string | Date | null;
  schedule?: SaveSubjectScheduleInput | null;
  scheduleSlots?: ScheduleSlotInput[] | null;
}

export interface UpdateAcademicSubjectInput {
  name?: string;
  code?: string | null;
  hoursPerWeek?: number | null;
  teacherUserId?: number | null;
  academicYearId?: number | null;
  effectiveFrom?: string | Date | null;
  schedule?: SaveSubjectScheduleInput | null;
  scheduleSlots?: ScheduleSlotInput[] | null;
}

export interface CreateAcademicStudentInput {
  firstName: string;
  lastName: string;
  identification?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface UpdateAcademicStudentInput {
  firstName?: string;
  lastName?: string;
  identification?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface EnrollStudentInput {
  studentId: number;
  courseId: number;
  period?: string | null;
  academicYearId?: number | null;
}

export class AcademicService {
  /**
   * Valida que un usuario sea miembro activo de la organización dada.
   */
  private static async validateMember(
    organizationId: number,
    userId: number,
    roleTitle = "Docente / Tutor"
  ): Promise<void> {
    const member = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!member || member.status !== ORGANIZATION_MEMBER_STATUS.ACTIVE) {
      throw new Error(
        `El usuario especificado como ${roleTitle} (ID: ${userId}) no es un miembro activo de esta organización.`
      );
    }
  }

  // ============================================================================
  // CURSOS (AcademicCourse)
  // ============================================================================

  static async createCourse(
    organizationId: number,
    input: CreateAcademicCourseInput
  ) {
    const name = input.name?.trim();
    const level = input.level?.trim();

    if (!name) {
      throw new Error("El nombre del curso es obligatorio.");
    }
    if (!level) {
      throw new Error("El nivel educativo es obligatorio.");
    }

    // Verificar unicidad de nombre en la organización
    const existing = await db.academicCourse.findUnique({
      where: {
        organizationId_name: {
          organizationId,
          name,
        },
      },
    });

    if (existing) {
      throw new Error(
        `Ya existe un curso registrado con el nombre '${name}' en esta institución.`
      );
    }

    let tutorUserId: number | null = null;
    if (input.tutorUserId) {
      await this.validateMember(organizationId, input.tutorUserId, "Tutor del curso");
      tutorUserId = input.tutorUserId;
    }

    return await db.academicCourse.create({
      data: {
        organizationId,
        name,
        level,
        classroom: input.classroom?.trim() || null,
        status: ACADEMIC_COURSE_STATUS.ACTIVE,
        tutorUserId,
      },
      include: {
        tutorUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  static async getCourses(
    organizationId: number,
    filter?: { status?: string; search?: string },
    accessContext?: AcademicAccessContext
  ) {
    const whereClause: any = { organizationId };

    if (filter?.status) {
      whereClause.status = filter.status;
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          OR: [
            { tutorUserId: accessContext.userId },
            { subjects: { some: { teacherUserId: accessContext.userId, status: ACADEMIC_SUBJECT_STATUS.ACTIVE } } },
          ],
        },
      ];
    }

    if (filter?.search) {
      const term = filter.search.trim();
      whereClause.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { level: { contains: term, mode: "insensitive" } },
        { classroom: { contains: term, mode: "insensitive" } },
      ];
    }

    const courses = await db.academicCourse.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
      include: {
        tutorUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            enrollments: {
              where: { status: ACADEMIC_ENROLLMENT_STATUS.ACTIVE },
            },
            subjects: {
              where: { status: ACADEMIC_SUBJECT_STATUS.ACTIVE },
            },
          },
        },
      },
    });

    return courses.map((course) => ({
      ...course,
      studentCount: course._count.enrollments,
      subjectsCount: course._count.subjects,
      tutorName: course.tutorUser ? course.tutorUser.name : "Sin asignar",
    }));
  }

  static async getCourseById(
    organizationId: number,
    courseId: number,
    accessContext?: AcademicAccessContext
  ) {
    const course = await db.academicCourse.findFirst({
      where: {
        id: courseId,
        organizationId,
      },
      include: {
        tutorUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        subjects: {
          where: { status: ACADEMIC_SUBJECT_STATUS.ACTIVE },
          include: {
            teacherUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { name: "asc" },
        },
        enrollments: {
          where: { status: ACADEMIC_ENROLLMENT_STATUS.ACTIVE },
          include: {
            student: true,
          },
          orderBy: { student: { lastName: "asc" } },
        },
      },
    });

    if (!course) {
      const err: any = new Error("Curso no encontrado en esta institución.");
      err.statusCode = 404;
      throw err;
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      const isTutor = course.tutorUserId === accessContext.userId;
      const isSubjectTeacher = course.subjects.some((s) => s.teacherUserId === accessContext.userId);
      if (!isTutor && !isSubjectTeacher) {
        const err: any = new Error("No tienes permisos para acceder a este curso.");
        err.statusCode = 403;
        throw err;
      }
    }

    return {
      ...course,
      studentCount: course.enrollments.length,
      subjectsCount: course.subjects.length,
      tutorName: course.tutorUser ? course.tutorUser.name : "Sin asignar",
    };
  }

  static async updateCourse(
    organizationId: number,
    courseId: number,
    input: UpdateAcademicCourseInput
  ) {
    const course = await db.academicCourse.findFirst({
      where: { id: courseId, organizationId },
    });

    if (!course) {
      throw new Error("Curso no encontrado en esta institución.");
    }

    const data: any = {};

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) throw new Error("El nombre del curso no puede quedar vacío.");
      if (name !== course.name) {
        const existing = await db.academicCourse.findUnique({
          where: { organizationId_name: { organizationId, name } },
        });
        if (existing && existing.id !== courseId) {
          throw new Error(`Ya existe un curso registrado con el nombre '${name}'.`);
        }
      }
      data.name = name;
    }

    if (input.level !== undefined) {
      const level = input.level.trim();
      if (!level) throw new Error("El nivel educativo no puede quedar vacío.");
      data.level = level;
    }

    if (input.classroom !== undefined) {
      data.classroom = input.classroom?.trim() || null;
    }

    if (input.tutorUserId !== undefined) {
      if (input.tutorUserId) {
        await this.validateMember(organizationId, input.tutorUserId, "Tutor del curso");
        data.tutorUserId = input.tutorUserId;
      } else {
        data.tutorUserId = null;
      }
    }

    return await db.academicCourse.update({
      where: { id: courseId },
      data,
      include: {
        tutorUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  static async archiveCourse(organizationId: number, courseId: number) {
    const course = await db.academicCourse.findFirst({
      where: { id: courseId, organizationId },
    });

    if (!course) {
      throw new Error("Curso no encontrado en esta institución.");
    }

    return await db.academicCourse.update({
      where: { id: courseId },
      data: { status: ACADEMIC_COURSE_STATUS.ARCHIVED },
    });
  }

  static async reactivateCourse(organizationId: number, courseId: number) {
    const course = await db.academicCourse.findFirst({
      where: { id: courseId, organizationId },
    });

    if (!course) {
      throw new Error("Curso no encontrado en esta institución.");
    }

    const duplicate = await db.academicCourse.findFirst({
      where: {
        organizationId,
        name: course.name,
        status: ACADEMIC_COURSE_STATUS.ACTIVE,
        id: { not: courseId },
      },
    });

    if (duplicate) {
      const err: any = new Error(
        `Ya existe un curso activo con el nombre '${course.name}' (ID ${duplicate.id}). Modifique el nombre antes de reactivarlo.`
      );
      err.statusCode = 409;
      throw err;
    }

    return await db.academicCourse.update({
      where: { id: courseId },
      data: { status: ACADEMIC_COURSE_STATUS.ACTIVE },
    });
  }

  static async getCourseDependencies(organizationId: number, courseId: number) {
    const course = await db.academicCourse.findFirst({
      where: { id: courseId, organizationId },
      include: {
        _count: {
          select: {
            enrollments: true,
            subjects: true,
            activities: true,
            classSessions: true,
            evaluationSchemes: true,
          },
        },
      },
    });

    if (!course) {
      throw new Error("Curso no encontrado en esta institución.");
    }

    const activities = await db.academicActivity.findMany({
      where: { courseId, organizationId },
      select: { id: true },
    });
    const activityIds = activities.map((a) => a.id);
    const gradeCount = activityIds.length > 0
      ? await db.academicGrade.count({
          where: { organizationId, activityId: { in: activityIds } },
        })
      : 0;

    const totalDependencies =
      course._count.enrollments +
      course._count.subjects +
      course._count.activities +
      gradeCount +
      course._count.evaluationSchemes +
      course._count.classSessions;

    const canDelete = totalDependencies === 0;

    let reason: string | null = null;
    if (!canDelete) {
      const parts: string[] = [];
      if (course._count.enrollments > 0) parts.push(`${course._count.enrollments} matrícula(s)`);
      if (course._count.subjects > 0) parts.push(`${course._count.subjects} materia(s)`);
      if (course._count.activities > 0) parts.push(`${course._count.activities} actividad(es)`);
      if (gradeCount > 0) parts.push(`${gradeCount} calificación(es)`);
      if (course._count.evaluationSchemes > 0) parts.push(`${course._count.evaluationSchemes} esquema(s) de evaluación`);
      if (course._count.classSessions > 0) parts.push(`${course._count.classSessions} sesión(es) de clase`);
      reason = `No se puede eliminar porque contiene: ${parts.join(", ")}. Utilice la opción de Archivar para retirarlo de la vista activa preservando el historial.`;
    }

    return {
      courseId: course.id,
      courseName: course.name,
      level: course.level,
      status: course.status,
      canDelete,
      reason,
      dependencies: {
        enrollments: course._count.enrollments,
        subjects: course._count.subjects,
        activities: course._count.activities,
        grades: gradeCount,
        evaluationSchemes: course._count.evaluationSchemes,
        classSessions: course._count.classSessions,
      },
    };
  }

  static async deleteCourse(organizationId: number, courseId: number) {
    const deps = await this.getCourseDependencies(organizationId, courseId);

    if (!deps.canDelete) {
      const err: any = new Error(
        deps.reason || "El curso no se puede eliminar porque contiene dependencias académicas vinculadas."
      );
      err.statusCode = 409;
      err.code = "COURSE_HAS_DEPENDENCIES";
      err.dependencies = deps.dependencies;
      throw err;
    }

    return await db.academicCourse.delete({
      where: { id: courseId },
    });
  }

  // ============================================================================
  // ASIGNATURAS / MATERIAS (AcademicSubject)
  // ============================================================================

  static async createSubject(
    organizationId: number,
    courseId: number,
    input: CreateAcademicSubjectInput
  ) {
    // Validar que el curso pertenezca a la organización
    const course = await db.academicCourse.findFirst({
      where: { id: courseId, organizationId },
    });
    if (!course) {
      throw new Error("Curso no encontrado en esta institución.");
    }

    const name = input.name?.trim();
    if (!name) {
      throw new Error("El nombre de la materia o asignatura es obligatorio.");
    }

    // Unicidad de nombre de materia dentro del curso
    const existing = await db.academicSubject.findUnique({
      where: {
        courseId_name: {
          courseId,
          name,
        },
      },
    });
    if (existing) {
      throw new Error(
        `Ya existe una materia con el nombre '${name}' en este curso.`
      );
    }

    let teacherUserId: number | null = null;
    if (input.teacherUserId) {
      await this.validateMember(
        organizationId,
        input.teacherUserId,
        "Profesor de la materia"
      );
      teacherUserId = input.teacherUserId;
    }

    const hoursPerWeek =
      typeof input.hoursPerWeek === "number" && input.hoursPerWeek > 0
        ? Math.floor(input.hoursPerWeek)
        : null;

    const rawSchedule: SaveSubjectScheduleInput | null = input.schedule
      ? input.schedule
      : (input.scheduleSlots && input.academicYearId ? {
          academicYearId: input.academicYearId,
          effectiveFrom: input.effectiveFrom || undefined,
          slots: input.scheduleSlots,
        } : null);

    const hasSlots = rawSchedule && Array.isArray(rawSchedule.slots) && rawSchedule.slots.length > 0;

    if (!hasSlots) {
      const created = await db.academicSubject.create({
        data: {
          organizationId,
          courseId,
          name,
          code: input.code?.trim() || null,
          hoursPerWeek,
          status: ACADEMIC_SUBJECT_STATUS.ACTIVE,
          teacherUserId,
        },
        include: {
          teacherUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return {
        ...created,
        scheduleStatus: "no_schedule" as SubjectScheduleStatus,
        totalPedagogicalHours: 0,
        activeSlots: [],
      };
    }

    // Creación atómica de materia y horarios dentro de la misma transacción
    return await db.$transaction(async (tx) => {
      const createdSubject = await tx.academicSubject.create({
        data: {
          organizationId,
          courseId,
          name,
          code: input.code?.trim() || null,
          hoursPerWeek,
          status: ACADEMIC_SUBJECT_STATUS.ACTIVE,
          teacherUserId,
        },
        include: {
          teacherUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      const appliedSchedule = await this.applySubjectScheduleInTx(
        tx,
        organizationId,
        createdSubject.id,
        courseId,
        course.name,
        teacherUserId,
        rawSchedule!
      );

      return {
        ...createdSubject,
        scheduleStatus: appliedSchedule.scheduleStatus,
        totalPedagogicalHours: appliedSchedule.totalPedagogicalHours,
        activeSlots: appliedSchedule.activeSlots,
      };
    });
  }

  static async getSubjectsByCourse(
    organizationId: number,
    courseId: number,
    accessContext?: AcademicAccessContext
  ) {
    const course = await db.academicCourse.findFirst({
      where: { id: courseId, organizationId },
      include: {
        subjects: {
          where: { status: ACADEMIC_SUBJECT_STATUS.ACTIVE },
          select: { teacherUserId: true },
        },
      },
    });
    if (!course) {
      throw new Error("Curso no encontrado en esta institución.");
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      const isTutor = course.tutorUserId === accessContext.userId;
      const isSubjectTeacher = course.subjects.some((s) => s.teacherUserId === accessContext.userId);
      if (!isTutor && !isSubjectTeacher) {
        const err: any = new Error("No tienes permisos para consultar las materias de este curso.");
        err.statusCode = 403;
        throw err;
      }
    }

    const where: any = {
      courseId,
      organizationId,
      status: ACADEMIC_SUBJECT_STATUS.ACTIVE,
    };

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      if (course.tutorUserId !== accessContext.userId) {
        where.teacherUserId = accessContext.userId;
      }
    }

    let subjects: any[];
    try {
      subjects = await db.academicSubject.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
          teacherUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          scheduleSlots: {
            where: { status: "ACTIVE", effectiveTo: null },
            select: {
              id: true,
              dayOfWeek: true,
              startTime: true,
              endTime: true,
              pedagogicalHours: true,
              room: true,
              teacherUserId: true,
            },
            orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
          },
        },
      });
    } catch (err: any) {
      // Compatibilidad hacia atrás: Si la tabla AcademicSubjectScheduleSlot aún no existe en la base activa (P2021 / 42P01)
      if (
        err?.code === "P2021" ||
        err?.code === "42P01" ||
        (typeof err?.message === "string" &&
          (err.message.includes("AcademicSubjectScheduleSlot") ||
            err.message.includes("does not exist")))
      ) {
        subjects = await db.academicSubject.findMany({
          where,
          orderBy: { name: "asc" },
          include: {
            teacherUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });
      } else {
        throw err;
      }
    }

    return subjects.map((sub: any) => {
      const activeSlots = sub.scheduleSlots || [];
      const totalPedagogicalHours = activeSlots.reduce(
        (sum: number, slot: any) => sum + (slot.pedagogicalHours || 0),
        0
      );
      const reqHours = sub.hoursPerWeek || 0;

      let scheduleStatus: SubjectScheduleStatus = "no_schedule";
      if (totalPedagogicalHours === 0) {
        scheduleStatus = "no_schedule";
      } else if (reqHours === 0 || totalPedagogicalHours === reqHours) {
        scheduleStatus = "complete";
      } else if (totalPedagogicalHours < reqHours) {
        scheduleStatus = "incomplete";
      } else {
        scheduleStatus = "excess";
      }

      return {
        ...sub,
        scheduleStatus,
        totalPedagogicalHours,
        activeSlots,
      };
    });
  }

  static async updateSubject(
    organizationId: number,
    subjectId: number,
    input: UpdateAcademicSubjectInput
  ) {
    const subject = await db.academicSubject.findFirst({
      where: { id: subjectId, organizationId },
      include: { course: true },
    });
    if (!subject) {
      throw new Error("Materia no encontrada en esta institución.");
    }

    const data: any = {};

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) throw new Error("El nombre de la materia no puede quedar vacío.");
      if (name !== subject.name) {
        const existing = await db.academicSubject.findUnique({
          where: { courseId_name: { courseId: subject.courseId, name } },
        });
        if (existing && existing.id !== subjectId) {
          throw new Error(`Ya existe una materia con el nombre '${name}' en este curso.`);
        }
      }
      data.name = name;
    }

    if (input.code !== undefined) {
      data.code = input.code?.trim() || null;
    }

    if (input.hoursPerWeek !== undefined) {
      data.hoursPerWeek =
        typeof input.hoursPerWeek === "number" && input.hoursPerWeek > 0
          ? Math.floor(input.hoursPerWeek)
          : null;
    }

    if (input.teacherUserId !== undefined) {
      if (input.teacherUserId) {
        await this.validateMember(
          organizationId,
          input.teacherUserId,
          "Profesor de la materia"
        );
        data.teacherUserId = input.teacherUserId;
      } else {
        data.teacherUserId = null;
      }
    }

    const rawSchedule: SaveSubjectScheduleInput | null = input.schedule
      ? input.schedule
      : (input.scheduleSlots && input.academicYearId ? {
          academicYearId: input.academicYearId,
          effectiveFrom: input.effectiveFrom || undefined,
          slots: input.scheduleSlots,
        } : null);

    const hasScheduleToUpdate = rawSchedule && Array.isArray(rawSchedule.slots);

    if (!hasScheduleToUpdate) {
      const updated = await db.academicSubject.update({
        where: { id: subjectId },
        data,
        include: {
          teacherUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      let activeSlots: any[] = [];
      try {
        activeSlots = await db.academicSubjectScheduleSlot.findMany({
          where: { organizationId, subjectId, status: "ACTIVE", effectiveTo: null },
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        });
      } catch (err: any) {
        activeSlots = [];
      }

      const totalPedagogicalHours = activeSlots.reduce(
        (sum: number, s: any) => sum + (s.pedagogicalHours || 0),
        0
      );
      const reqHours = updated.hoursPerWeek || 0;
      let scheduleStatus: SubjectScheduleStatus = "no_schedule";
      if (totalPedagogicalHours === 0) scheduleStatus = "no_schedule";
      else if (reqHours === 0 || totalPedagogicalHours === reqHours) scheduleStatus = "complete";
      else if (totalPedagogicalHours < reqHours) scheduleStatus = "incomplete";
      else scheduleStatus = "excess";

      return {
        ...updated,
        scheduleStatus,
        totalPedagogicalHours,
        activeSlots,
      };
    }

    // Actualización atómica de asignatura y sus horarios
    return await db.$transaction(async (tx) => {
      const updated = await tx.academicSubject.update({
        where: { id: subjectId },
        data,
        include: {
          teacherUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      const appliedSchedule = await this.applySubjectScheduleInTx(
        tx,
        organizationId,
        subjectId,
        subject.courseId,
        subject.course.name,
        data.teacherUserId !== undefined ? data.teacherUserId : subject.teacherUserId,
        rawSchedule!
      );

      return {
        ...updated,
        scheduleStatus: appliedSchedule.scheduleStatus,
        totalPedagogicalHours: appliedSchedule.totalPedagogicalHours,
        activeSlots: appliedSchedule.activeSlots,
      };
    });
  }

  static async inactivateSubject(organizationId: number, subjectId: number) {
    const subject = await db.academicSubject.findFirst({
      where: { id: subjectId, organizationId },
    });
    if (!subject) {
      throw new Error("Materia no encontrada en esta institución.");
    }

    return await db.academicSubject.update({
      where: { id: subjectId },
      data: { status: ACADEMIC_SUBJECT_STATUS.INACTIVE },
    });
  }

  // ============================================================================
  // HORARIOS SEMANALES RECURRENTES POR MATERIA (FASE 11.2 / 11.3)
  // ============================================================================

  /**
   * Helper transaccional para aplicar y validar slots de horario semanal dentro de una transacción.
   */
  private static async applySubjectScheduleInTx(
    tx: any,
    organizationId: number,
    subjectId: number,
    courseId: number,
    courseName: string,
    defaultTeacherUserId: number | null,
    input: SaveSubjectScheduleInput
  ) {
    if (!input.academicYearId || isNaN(Number(input.academicYearId))) {
      const err: any = new Error("Debe especificar un año lectivo válido para el horario.");
      err.statusCode = 400;
      throw err;
    }

    const academicYear = await tx.academicYear.findFirst({
      where: { id: Number(input.academicYearId), organizationId },
    });
    if (!academicYear) {
      const err: any = new Error("Año lectivo no encontrado en esta institución.");
      err.statusCode = 404;
      throw err;
    }

    const effectiveFromDate = input.effectiveFrom ? new Date(input.effectiveFrom) : (academicYear.startDate || new Date());
    if (isNaN(effectiveFromDate.getTime())) {
      const err: any = new Error("Fecha de inicio de vigencia inválida.");
      err.statusCode = 400;
      throw err;
    }

    if (!Array.isArray(input.slots)) {
      const err: any = new Error("Debe proporcionar una lista de franjas horarias válida.");
      err.statusCode = 400;
      throw err;
    }

    const cleanSlots: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      pedagogicalHours: number;
      room?: string | null;
      teacherUserId?: number | null;
    }> = [];

    for (let i = 0; i < input.slots.length; i++) {
      const s = input.slots[i];
      const day = Number(s.dayOfWeek);
      if (isNaN(day) || day < 1 || day > 7) {
        const err: any = new Error(`Día de la semana inválido (${s.dayOfWeek}) en la franja #${i + 1}.`);
        err.statusCode = 400;
        throw err;
      }

      const start = s.startTime?.trim();
      const end = s.endTime?.trim();
      if (!start || !end || !/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
        const err: any = new Error(`Formato de hora inválido en la franja #${i + 1} (se espera HH:mm).`);
        err.statusCode = 400;
        throw err;
      }

      if (start >= end) {
        const err: any = new Error(
          `La hora de inicio (${start}) no puede ser posterior o igual a la hora de fin (${end}) en la franja #${i + 1}.`
        );
        err.statusCode = 400;
        err.code = "INVALID_TIME_RANGE";
        throw err;
      }

      const pedHours = s.pedagogicalHours && Number(s.pedagogicalHours) > 0 ? Math.floor(Number(s.pedagogicalHours)) : 2;
      const slotTeacherId = s.teacherUserId !== undefined ? s.teacherUserId : defaultTeacherUserId;

      cleanSlots.push({
        dayOfWeek: day,
        startTime: start,
        endTime: end,
        pedagogicalHours: pedHours,
        room: s.room?.trim() || null,
        teacherUserId: slotTeacherId || null,
      });
    }

    // Validar solapamientos internos dentro del mismo payload
    for (let i = 0; i < cleanSlots.length; i++) {
      for (let j = i + 1; j < cleanSlots.length; j++) {
        const a = cleanSlots[i];
        const b = cleanSlots[j];
        if (a.dayOfWeek === b.dayOfWeek) {
          const overlaps = a.startTime < b.endTime && a.endTime > b.startTime;
          if (overlaps) {
            const dayName = getDayNameSpanish(a.dayOfWeek);
            const err: any = new Error(
              `Conflicto en la solicitud: Las franjas ${a.startTime}-${a.endTime} y ${b.startTime}-${b.endTime} del ${dayName} se superponen.`
            );
            err.statusCode = 400;
            throw err;
          }
        }
      }
    }

    // Validar que el total de períodos no exceda las horas semanales permitidas
    const totalInputHours = cleanSlots.reduce((sum, s) => sum + s.pedagogicalHours, 0);
    const subjectRecord = await tx.academicSubject.findUnique({
      where: { id: subjectId },
      select: { hoursPerWeek: true },
    });
    const reqHours = subjectRecord?.hoursPerWeek || 0;

    if (reqHours > 0 && totalInputHours > reqHours) {
      const err: any = new Error(
        `La suma de períodos pedagógicos (${totalInputHours} hrs) no puede exceder la carga horaria semanal permitida (${reqHours} hrs).`
      );
      err.statusCode = 400;
      err.code = "ACADEMIC_SCHEDULE_EXCEEDS_HOURS";
      throw err;
    }

    // 1. Lock en el curso
    await tx.$executeRawUnsafe(
      `SELECT pg_advisory_xact_lock(hashtext($1))`,
      `sched:course:${organizationId}:${courseId}`
    );

    // 2. Lock en docentes involucrados (ordenados para evitar deadlocks)
    const teacherIds = Array.from(
      new Set(
        cleanSlots.map((s) => s.teacherUserId).filter((id): id is number => id !== null && id !== undefined && id > 0)
      )
    ).sort((a, b) => a - b);

    for (const tid of teacherIds) {
      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(hashtext($1))`,
        `sched:teacher:${organizationId}:${tid}`
      );
    }

    // 3. Validar conflictos de CURSO (ninguna otra materia activa en este curso puede coincidir en día/hora)
    const otherCourseSlots = await tx.academicSubjectScheduleSlot.findMany({
      where: {
        organizationId,
        courseId,
        subjectId: { not: subjectId },
        status: "ACTIVE",
        effectiveFrom: { lte: effectiveFromDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: effectiveFromDate } }],
      },
      include: { subject: { select: { id: true, name: true } } },
    });

    for (const slot of cleanSlots) {
      const conflict = otherCourseSlots.find((cs: any) => {
        if (cs.dayOfWeek !== slot.dayOfWeek) return false;
        return slot.startTime < cs.endTime && slot.endTime > cs.startTime;
      });

      if (conflict) {
        const dayName = getDayNameSpanish(slot.dayOfWeek);
        const err: any = new Error(
          `Conflicto de horario en el curso '${courseName}': Ya existe la materia '${conflict.subject?.name || "Asignatura"}' programada el ${dayName} de ${conflict.startTime} a ${conflict.endTime}.`
        );
        err.statusCode = 409;
        err.code = "ACADEMIC_SCHEDULE_COURSE_CONFLICT";
        throw err;
      }
    }

    // 4. Validar conflictos de DOCENTE (el docente no puede dar clase en otro curso a la misma hora)
    for (const slot of cleanSlots) {
      if (!slot.teacherUserId) continue;

      const otherTeacherSlots = await tx.academicSubjectScheduleSlot.findMany({
        where: {
          organizationId,
          teacherUserId: slot.teacherUserId,
          subjectId: { not: subjectId },
          status: "ACTIVE",
          effectiveFrom: { lte: effectiveFromDate },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: effectiveFromDate } }],
        },
        include: {
          subject: { select: { id: true, name: true } },
          course: { select: { id: true, name: true } },
          teacherUser: { select: { id: true, name: true } },
        },
      });

      const conflict = otherTeacherSlots.find((ts: any) => {
        if (ts.dayOfWeek !== slot.dayOfWeek) return false;
        return slot.startTime < ts.endTime && slot.endTime > ts.startTime;
      });

      if (conflict) {
        const dayName = getDayNameSpanish(slot.dayOfWeek);
        const teacherName = conflict.teacherUser?.name || `Docente ID ${slot.teacherUserId}`;
        const err: any = new Error(
          `Conflicto de horario para el docente ${teacherName}: Ya tiene asignada la materia '${conflict.subject?.name || "Asignatura"}' en el curso '${conflict.course?.name || "Curso"}' el ${dayName} de ${conflict.startTime} a ${conflict.endTime}.`
        );
        err.statusCode = 409;
        err.code = "ACADEMIC_SCHEDULE_TEACHER_CONFLICT";
        throw err;
      }
    }

    // 5. Versionamiento: Cerrar vigencia de slots activos existentes sin borrar historial
    const existingActiveSlots = await tx.academicSubjectScheduleSlot.findMany({
      where: {
        organizationId,
        subjectId,
        status: "ACTIVE",
        effectiveTo: null,
      },
    });

    if (existingActiveSlots.length > 0) {
      await tx.academicSubjectScheduleSlot.updateMany({
        where: { id: { in: existingActiveSlots.map((s: any) => s.id) } },
        data: {
          effectiveTo: effectiveFromDate,
          status: "SUPERSEDED",
        },
      });
    }

    // 6. Insertar nuevos slots
    const createdSlots = [];
    for (const slot of cleanSlots) {
      const created = await tx.academicSubjectScheduleSlot.create({
        data: {
          organizationId,
          academicYearId: Number(input.academicYearId),
          courseId,
          subjectId,
          teacherUserId: slot.teacherUserId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          pedagogicalHours: slot.pedagogicalHours,
          room: slot.room,
          effectiveFrom: effectiveFromDate,
          effectiveTo: null,
          status: "ACTIVE",
        },
        include: {
          teacherUser: { select: { id: true, name: true, email: true } },
        },
      });
      createdSlots.push(created);
    }

    // 7. Calcular estado de carga horaria
    const totalPedagogicalHours = createdSlots.reduce(
      (sum, s) => sum + (s.pedagogicalHours || 0),
      0
    );

    let scheduleStatus: SubjectScheduleStatus = "no_schedule";
    if (totalPedagogicalHours === 0) {
      scheduleStatus = "no_schedule";
    } else if (reqHours === 0 || totalPedagogicalHours === reqHours) {
      scheduleStatus = "complete";
    } else if (totalPedagogicalHours < reqHours) {
      scheduleStatus = "incomplete";
    } else {
      scheduleStatus = "excess";
    }

    return {
      activeSlots: createdSlots,
      totalPedagogicalHours,
      scheduleStatus,
    };
  }

  /**
   * Obtiene la configuración de horario semanal vigente y el historial de versiones para una materia.
   */
  static async getSubjectSchedule(
    organizationId: number,
    subjectId: number,
    options?: { effectiveDate?: Date | string; includeHistory?: boolean }
  ) {
    const subject = await db.academicSubject.findFirst({
      where: { id: subjectId, organizationId },
      include: {
        course: true,
        teacherUser: { select: { id: true, name: true, email: true } },
      },
    });

    if (!subject) {
      const err: any = new Error("Materia no encontrada en esta institución.");
      err.statusCode = 404;
      throw err;
    }

    const refDate = options?.effectiveDate ? new Date(options.effectiveDate) : new Date();

    let activeSlots: any[] = [];
    let history: any[] = [];
    try {
      // Obtener slots vigentes en la fecha de referencia
      activeSlots = await db.academicSubjectScheduleSlot.findMany({
        where: {
          organizationId,
          subjectId,
          status: "ACTIVE",
          effectiveFrom: { lte: refDate },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: refDate } }],
        },
        include: {
          teacherUser: { select: { id: true, name: true, email: true } },
        },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      });

      if (options?.includeHistory) {
        history = await db.academicSubjectScheduleSlot.findMany({
          where: {
            organizationId,
            subjectId,
          },
          include: {
            teacherUser: { select: { id: true, name: true, email: true } },
            academicYear: { select: { id: true, name: true } },
          },
          orderBy: [{ effectiveFrom: "desc" }, { dayOfWeek: "asc" }, { startTime: "asc" }],
        });
      }
    } catch (err: any) {
      if (
        err?.code === "P2021" ||
        err?.code === "42P01" ||
        (typeof err?.message === "string" &&
          (err.message.includes("AcademicSubjectScheduleSlot") ||
            err.message.includes("does not exist")))
      ) {
        activeSlots = [];
        history = [];
      } else {
        throw err;
      }
    }

    const totalPedagogicalHours = activeSlots.reduce(
      (sum, slot) => sum + (slot.pedagogicalHours || 0),
      0
    );
    const reqHours = subject.hoursPerWeek || 0;

    let scheduleStatus: SubjectScheduleStatus = "no_schedule";
    if (totalPedagogicalHours === 0) {
      scheduleStatus = "no_schedule";
    } else if (reqHours === 0 || totalPedagogicalHours === reqHours) {
      scheduleStatus = "complete";
    } else if (totalPedagogicalHours < reqHours) {
      scheduleStatus = "incomplete";
    } else {
      scheduleStatus = "excess";
    }

    return {
      subject: {
        id: subject.id,
        name: subject.name,
        code: subject.code,
        courseId: subject.courseId,
        courseName: subject.course.name,
        hoursPerWeek: subject.hoursPerWeek,
        teacherUserId: subject.teacherUserId,
        teacherName: subject.teacherUser?.name || "Sin asignar",
      },
      activeSlots,
      scheduleStatus,
      totalPedagogicalHours,
      hoursPerWeek: reqHours,
      history,
    };
  }

  /**
   * Guarda o versiona el horario semanal de una materia con comprobación transaccional de conflictos.
   */
  static async saveSubjectSchedule(
    organizationId: number,
    subjectId: number,
    input: SaveSubjectScheduleInput,
    userId?: number,
    isAcademicAdmin: boolean = true
  ) {
    const subject = await db.academicSubject.findFirst({
      where: { id: subjectId, organizationId },
      include: { course: true, teacherUser: true },
    });

    if (!subject) {
      const err: any = new Error("Materia no encontrada en esta institución.");
      err.statusCode = 404;
      throw err;
    }

    try {
      return await db.$transaction(async (tx) => {
        const result = await this.applySubjectScheduleInTx(
          tx,
          organizationId,
          subjectId,
          subject.courseId,
          subject.course.name,
          subject.teacherUserId,
          input
        );

        return {
          success: true,
          subjectId,
          academicYearId: Number(input.academicYearId),
          effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : new Date(),
          slotsCount: result.activeSlots.length,
          scheduleStatus: result.scheduleStatus,
          totalPedagogicalHours: result.totalPedagogicalHours,
          hoursPerWeek: subject.hoursPerWeek || 0,
          slots: result.activeSlots,
        };
      });
    } catch (err: any) {
      if (
        err?.code === "P2021" ||
        err?.code === "42P01" ||
        (typeof err?.message === "string" &&
          (err.message.includes("AcademicSubjectScheduleSlot") ||
            err.message.includes("does not exist")))
      ) {
        const customErr: any = new Error(
          "La tabla de configuración de horarios semanales ('AcademicSubjectScheduleSlot') aún no está creada en esta base de datos. Se requiere aplicar la migración correspondiente para habilitar el guardado de horarios."
        );
        customErr.statusCode = 503;
        customErr.code = "ACADEMIC_SCHEDULE_TABLE_NOT_MIGRATED";
        throw customErr;
      }
      throw err;
    }
  }

  /**
   * Obtiene la matriz completa del horario semanal de un curso.
   */
  static async getCourseSchedule(
    organizationId: number,
    courseId: number,
    options?: { academicYearId?: number; effectiveDate?: Date | string }
  ) {
    const course = await db.academicCourse.findFirst({
      where: { id: courseId, organizationId },
    });
    if (!course) {
      const err: any = new Error("Curso no encontrado en esta institución.");
      err.statusCode = 404;
      throw err;
    }

    const refDate = options?.effectiveDate ? new Date(options.effectiveDate) : new Date();
    const where: any = {
      organizationId,
      courseId,
      status: "ACTIVE",
      effectiveFrom: { lte: refDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: refDate } }],
    };

    if (options?.academicYearId) {
      where.academicYearId = Number(options.academicYearId);
    }

    let slots: any[] = [];
    try {
      slots = await db.academicSubjectScheduleSlot.findMany({
        where,
        include: {
          subject: { select: { id: true, name: true, code: true, hoursPerWeek: true } },
          teacherUser: { select: { id: true, name: true, email: true } },
        },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      });
    } catch (err: any) {
      if (
        err?.code === "P2021" ||
        err?.code === "42P01" ||
        (typeof err?.message === "string" &&
          (err.message.includes("AcademicSubjectScheduleSlot") ||
            err.message.includes("does not exist")))
      ) {
        slots = [];
      } else {
        throw err;
      }
    }

    return {
      courseId,
      courseName: course.name,
      level: course.level,
      classroom: course.classroom,
      slots,
    };
  }

  // ============================================================================
  // ESTUDIANTES (AcademicStudent)
  // ============================================================================

  static async createStudent(
    organizationId: number,
    input: CreateAcademicStudentInput
  ) {
    const firstName = input.firstName?.trim();
    const lastName = input.lastName?.trim();

    if (!firstName || !lastName) {
      throw new Error("Nombres y apellidos del estudiante son obligatorios.");
    }

    let identification: string | null = null;
    if (input.identification) {
      const trimmedId = input.identification.trim();
      if (trimmedId.length > 0) {
        // Verificar duplicado en la misma organización
        const existing = await db.academicStudent.findUnique({
          where: {
            organizationId_identification: {
              organizationId,
              identification: trimmedId,
            },
          },
        });
        if (existing) {
          throw new Error(
            `Ya existe un estudiante con la identificación '${trimmedId}' en esta institución.`
          );
        }
        identification = trimmedId;
      }
    }

    return await db.academicStudent.create({
      data: {
        organizationId,
        firstName,
        lastName,
        identification,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        status: ACADEMIC_STUDENT_STATUS.ACTIVE,
      },
    });
  }

  static async getStudents(
    organizationId: number,
    filter?: { status?: string; courseId?: number; search?: string },
    accessContext?: AcademicAccessContext
  ) {
    const whereClause: any = { organizationId };

    if (filter?.status) {
      whereClause.status = filter.status;
    }

    if (filter?.courseId) {
      whereClause.enrollments = {
        some: {
          courseId: filter.courseId,
          status: ACADEMIC_ENROLLMENT_STATUS.ACTIVE,
        },
      };
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      whereClause.enrollments = {
        some: {
          status: ACADEMIC_ENROLLMENT_STATUS.ACTIVE,
          ...(filter?.courseId ? { courseId: filter.courseId } : {}),
          course: {
            OR: [
              { tutorUserId: accessContext.userId },
              { subjects: { some: { teacherUserId: accessContext.userId, status: ACADEMIC_SUBJECT_STATUS.ACTIVE } } },
            ],
          },
        },
      };
    }

    if (filter?.search) {
      const term = filter.search.trim();
      whereClause.OR = [
        { firstName: { contains: term, mode: "insensitive" } },
        { lastName: { contains: term, mode: "insensitive" } },
        { identification: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
      ];
    }

    const students = await db.academicStudent.findMany({
      where: whereClause,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: {
        enrollments: {
          where: { status: ACADEMIC_ENROLLMENT_STATUS.ACTIVE },
          include: {
            course: {
              select: {
                id: true,
                name: true,
                level: true,
              },
            },
          },
        },
      },
    });

    return students.map((student) => {
      const primaryEnrollment = student.enrollments[0];
      return {
        ...student,
        courseId: primaryEnrollment ? String(primaryEnrollment.course.id) : "",
        courseName: primaryEnrollment ? primaryEnrollment.course.name : "Sin matrícula",
      };
    });
  }

  static async getStudentById(
    organizationId: number,
    studentId: number,
    accessContext?: AcademicAccessContext
  ) {
    const student = await db.academicStudent.findFirst({
      where: { id: studentId, organizationId },
      include: {
        enrollments: {
          include: {
            course: {
              include: {
                subjects: {
                  where: { status: ACADEMIC_SUBJECT_STATUS.ACTIVE },
                  select: { teacherUserId: true },
                },
              },
            },
          },
          orderBy: { enrollmentDate: "desc" },
        },
      },
    });

    if (!student) {
      throw new Error("Estudiante no encontrado en esta institución.");
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      const isAuthorized = student.enrollments.some(
        (e) =>
          e.status === ACADEMIC_ENROLLMENT_STATUS.ACTIVE &&
          (e.course.tutorUserId === accessContext.userId ||
            e.course.subjects.some((s) => s.teacherUserId === accessContext.userId))
      );
      if (!isAuthorized) {
        const err: any = new Error("No tienes permisos para consultar la ficha de este estudiante.");
        err.statusCode = 403;
        throw err;
      }
    }

    const primaryEnrollment = student.enrollments.find(
      (e) => e.status === ACADEMIC_ENROLLMENT_STATUS.ACTIVE
    ) || student.enrollments[0];

    return {
      ...student,
      courseId: primaryEnrollment ? String(primaryEnrollment.course.id) : "",
      courseName: primaryEnrollment ? primaryEnrollment.course.name : "Sin matrícula",
    };
  }

  static async updateStudent(
    organizationId: number,
    studentId: number,
    input: UpdateAcademicStudentInput
  ) {
    const student = await db.academicStudent.findFirst({
      where: { id: studentId, organizationId },
    });
    if (!student) {
      throw new Error("Estudiante no encontrado en esta institución.");
    }

    const data: any = {};

    if (input.firstName !== undefined) {
      const firstName = input.firstName.trim();
      if (!firstName) throw new Error("El nombre no puede quedar vacío.");
      data.firstName = firstName;
    }

    if (input.lastName !== undefined) {
      const lastName = input.lastName.trim();
      if (!lastName) throw new Error("El apellido no puede quedar vacío.");
      data.lastName = lastName;
    }

    if (input.identification !== undefined) {
      const trimmedId = input.identification?.trim() || null;
      if (trimmedId && trimmedId !== student.identification) {
        const existing = await db.academicStudent.findUnique({
          where: {
            organizationId_identification: {
              organizationId,
              identification: trimmedId,
            },
          },
        });
        if (existing && existing.id !== studentId) {
          throw new Error(
            `Ya existe otro estudiante con la identificación '${trimmedId}' en esta institución.`
          );
        }
      }
      data.identification = trimmedId;
    }

    if (input.email !== undefined) {
      data.email = input.email?.trim() || null;
    }

    if (input.phone !== undefined) {
      data.phone = input.phone?.trim() || null;
    }

    return await db.academicStudent.update({
      where: { id: studentId },
      data,
    });
  }

  static async inactivateStudent(organizationId: number, studentId: number) {
    const student = await db.academicStudent.findFirst({
      where: { id: studentId, organizationId },
    });
    if (!student) {
      throw new Error("Estudiante no encontrado en esta institución.");
    }

    return await db.academicStudent.update({
      where: { id: studentId },
      data: { status: ACADEMIC_STUDENT_STATUS.INACTIVE },
    });
  }

  // ============================================================================
  // MATRÍCULAS (AcademicEnrollment)
  // ============================================================================

  static async enrollStudent(organizationId: number, input: EnrollStudentInput) {
    const { studentId, courseId, period, academicYearId } = input;

    // Validación de año lectivo obligatorio en el flujo moderno
    if (!academicYearId || isNaN(Number(academicYearId)) || Number(academicYearId) <= 0) {
      throw new Error("El año lectivo es obligatorio para registrar la matrícula.");
    }
    const parsedYearId = Number(academicYearId);

    // Validación estricta multi-tenant: Estudiante, Curso y Año Lectivo deben pertenecer a organizationId
    const student = await db.academicStudent.findFirst({
      where: { id: studentId, organizationId },
    });
    if (!student) {
      throw new Error(
        `Estudiante con ID ${studentId} no existe en esta institución o no pertenece a ella.`
      );
    }

    const course = await db.academicCourse.findFirst({
      where: { id: courseId, organizationId },
    });
    if (!course) {
      throw new Error(
        `Curso con ID ${courseId} no existe en esta institución o no pertenece a ella.`
      );
    }

    const academicYear = await db.academicYear.findFirst({
      where: { id: parsedYearId, organizationId },
    });
    if (!academicYear) {
      throw new Error("Año lectivo no encontrado en esta institución.");
    }

    if (
      academicYear.status === AcademicYearStatus.CLOSED ||
      academicYear.status === AcademicYearStatus.ARCHIVED
    ) {
      throw new Error(
        "ACADEMIC_YEAR_INACTIVE: No se pueden matricular estudiantes en un año lectivo cerrado o archivado."
      );
    }

    // 1. Verificar si el estudiante ya tiene una matrícula para este año lectivo (Relación 1:1)
    const existingEnrollmentInYear = await db.academicEnrollment.findFirst({
      where: {
        organizationId,
        studentId,
        academicYearId: parsedYearId,
      },
      include: { course: true },
    });

    if (existingEnrollmentInYear) {
      if (existingEnrollmentInYear.courseId === courseId) {
        if (existingEnrollmentInYear.status === ACADEMIC_ENROLLMENT_STATUS.ACTIVE) {
          throw new Error(
            `El estudiante ${student.firstName} ${student.lastName} ya cuenta con una matrícula activa en el curso '${course.name}' para el año lectivo '${academicYear.name}'.`
          );
        } else {
          // Reactivación de matrícula previa inactiva / retirada para este año
          return await db.academicEnrollment.update({
            where: { id: existingEnrollmentInYear.id },
            data: {
              status: ACADEMIC_ENROLLMENT_STATUS.ACTIVE,
              period: period?.trim() || existingEnrollmentInYear.period,
              enrollmentDate: new Date(),
            },
            include: {
              student: true,
              course: true,
              academicYear: true,
            },
          });
        }
      } else {
        // REASIGNACIÓN / UPDATE: El estudiante cambia de curso para este año lectivo (Garantiza 1:1)
        return await db.academicEnrollment.update({
          where: { id: existingEnrollmentInYear.id },
          data: {
            courseId,
            status: ACADEMIC_ENROLLMENT_STATUS.ACTIVE,
            period: period?.trim() || existingEnrollmentInYear.period,
            enrollmentDate: new Date(),
          },
          include: {
            student: true,
            course: true,
            academicYear: true,
          },
        });
      }
    }

    // 2. Si no tenía matrícula en este año lectivo, desactivar cualquier matrícula huérfana previa para mantener 1:1
    await db.academicEnrollment.updateMany({
      where: {
        organizationId,
        studentId,
        academicYearId: null,
        status: ACADEMIC_ENROLLMENT_STATUS.ACTIVE,
      },
      data: {
        status: ACADEMIC_ENROLLMENT_STATUS.INACTIVE,
      },
    });

    try {
      return await db.academicEnrollment.create({
        data: {
          organizationId,
          studentId,
          courseId,
          academicYearId: parsedYearId,
          status: ACADEMIC_ENROLLMENT_STATUS.ACTIVE,
          period: period?.trim() || null,
        },
        include: {
          student: true,
          course: true,
          academicYear: true,
        },
      });
    } catch (err: any) {
      if (err.code === "P2002" || err.message?.includes("Unique constraint failed")) {
        throw new Error(
          `El estudiante ${student.firstName} ${student.lastName} ya posee una matrícula incompatible con este curso según la restricción académica actual.`
        );
      }
      throw err;
    }
  }

  static async getEnrollments(
    organizationId: number,
    filter?: { courseId?: number; studentId?: number; status?: string }
  ) {
    const whereClause: any = { organizationId };

    if (filter?.courseId) {
      whereClause.courseId = filter.courseId;
    }

    if (filter?.studentId) {
      whereClause.studentId = filter.studentId;
    }

    if (filter?.status) {
      whereClause.status = filter.status;
    }

    return await db.academicEnrollment.findMany({
      where: whereClause,
      orderBy: { enrollmentDate: "desc" },
      include: {
        student: true,
        course: {
          select: {
            id: true,
            name: true,
            level: true,
            classroom: true,
          },
        },
      },
    });
  }

  static async updateEnrollmentStatus(
    organizationId: number,
    enrollmentId: number,
    status: string
  ) {
    const allowed = [
      ACADEMIC_ENROLLMENT_STATUS.ACTIVE,
      ACADEMIC_ENROLLMENT_STATUS.INACTIVE,
      ACADEMIC_ENROLLMENT_STATUS.WITHDRAWN,
    ];

    if (!allowed.includes(status as any)) {
      throw new Error(`Estado de matrícula inválido: '${status}'.`);
    }

    const enrollment = await db.academicEnrollment.findFirst({
      where: { id: enrollmentId, organizationId },
    });

    if (!enrollment) {
      throw new Error("Matrícula no encontrada en esta institución.");
    }

    return await db.academicEnrollment.update({
      where: { id: enrollmentId },
      data: { status },
      include: {
        student: true,
        course: true,
      },
    });
  }

  // ============================================================================
  // SESIONES DE CLASE (AcademicClassSession - FASE 2)
  // ============================================================================

  static async createSession(
    organizationId: number,
    courseId: number,
    input: CreateAcademicClassSessionInput
  ) {
    // 1. Validar curso y pertenencia a la organización
    const course = await db.academicCourse.findFirst({
      where: { id: courseId, organizationId },
    });
    if (!course) {
      throw new Error("Curso no encontrado en esta institución.");
    }
    if (course.status === ACADEMIC_COURSE_STATUS.ARCHIVED) {
      throw new Error("No se pueden programar sesiones de clase para un curso archivado.");
    }

    // 2. Validar materia si se especifica
    let subjectId: number | null = null;
    if (input.subjectId) {
      const subject = await db.academicSubject.findFirst({
        where: { id: input.subjectId, organizationId },
      });
      if (!subject) {
        throw new Error("Materia no encontrada en esta institución.");
      }
      if (subject.courseId !== courseId) {
        throw new Error("La materia especificada no pertenece al curso indicado.");
      }
      if (subject.status === ACADEMIC_SUBJECT_STATUS.INACTIVE) {
        throw new Error("No se pueden programar sesiones para una materia inactiva.");
      }
      subjectId = input.subjectId;
    }

    // 3. Validar docente si se especifica
    let teacherUserId: number | null = null;
    if (input.teacherUserId) {
      await this.validateMember(
        organizationId,
        input.teacherUserId,
        "Docente de la sesión"
      );
      teacherUserId = input.teacherUserId;
    }

    // 4. Validar fecha
    const sessionDate = new Date(input.sessionDate);
    if (isNaN(sessionDate.getTime())) {
      throw new Error("Fecha de sesión inválida.");
    }

    return await db.academicClassSession.create({
      data: {
        organizationId,
        courseId,
        subjectId,
        teacherUserId,
        sessionDate,
        startTime: input.startTime?.trim() || null,
        endTime: input.endTime?.trim() || null,
        room: input.room?.trim() || course.classroom || null,
        topic: input.topic?.trim() || null,
        status: ACADEMIC_CLASS_SESSION_STATUS.SCHEDULED,
      },
      include: {
        course: {
          select: { id: true, name: true, level: true, classroom: true },
        },
        subject: {
          select: { id: true, name: true, code: true },
        },
        teacherUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  static async getSessions(
    organizationId: number,
    filter?: {
      courseId?: number;
      subjectId?: number;
      status?: string;
      date?: string;
      from?: string;
      to?: string;
      search?: string;
    },
    accessContext?: AcademicAccessContext
  ) {
    const whereClause: any = { organizationId };

    if (filter?.courseId) {
      whereClause.courseId = filter.courseId;
    }

    if (filter?.subjectId) {
      whereClause.subjectId = filter.subjectId;
    }

    if (filter?.status) {
      whereClause.status = filter.status;
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          OR: [
            { teacherUserId: accessContext.userId },
            { subject: { teacherUserId: accessContext.userId } },
          ],
        },
      ];
    }

    if (filter?.date) {
      const parsedDate = new Date(filter.date);
      if (!isNaN(parsedDate.getTime())) {
        const startOfDay = new Date(parsedDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(parsedDate);
        endOfDay.setUTCHours(23, 59, 59, 999);
        whereClause.sessionDate = {
          gte: startOfDay,
          lte: endOfDay,
        };
      }
    } else if (filter?.from || filter?.to) {
      const dateClause: any = {};
      let fromDate: Date | null = null;
      let toDate: Date | null = null;

      if (filter.from) {
        fromDate = new Date(filter.from);
        if (isNaN(fromDate.getTime())) {
          throw new Error("Parámetro 'from' no es una fecha válida.");
        }
        const startOfFrom = new Date(fromDate);
        startOfFrom.setUTCHours(0, 0, 0, 0);
        dateClause.gte = startOfFrom;
      }

      if (filter.to) {
        toDate = new Date(filter.to);
        if (isNaN(toDate.getTime())) {
          throw new Error("Parámetro 'to' no es una fecha válida.");
        }
        const endOfTo = new Date(toDate);
        endOfTo.setUTCHours(23, 59, 59, 999);
        dateClause.lte = endOfTo;
      }

      if (fromDate && toDate && fromDate > toDate) {
        throw new Error("El rango de fechas es inválido: 'from' no puede ser posterior a 'to'.");
      }

      whereClause.sessionDate = dateClause;
    }

    if (filter?.search) {
      const term = filter.search.trim();
      whereClause.OR = [
        { topic: { contains: term, mode: "insensitive" } },
        { room: { contains: term, mode: "insensitive" } },
        { course: { name: { contains: term, mode: "insensitive" } } },
        { subject: { name: { contains: term, mode: "insensitive" } } },
      ];
    }

    const sessions = await db.academicClassSession.findMany({
      where: whereClause,
      orderBy: [{ sessionDate: "desc" }, { startTime: "asc" }],
      include: {
        course: {
          select: { id: true, name: true, level: true, classroom: true },
        },
        subject: {
          select: { id: true, name: true, code: true },
        },
        teacherUser: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: {
            attendanceRecords: true,
          },
        },
      },
    });

    return sessions.map((s) => ({
      ...s,
      attendanceCount: s._count.attendanceRecords,
    }));
  }

  static async getSessionById(
    organizationId: number,
    sessionId: number,
    accessContext?: AcademicAccessContext
  ) {
    const session = await db.academicClassSession.findFirst({
      where: { id: sessionId, organizationId },
      include: {
        course: {
          select: { id: true, name: true, level: true, classroom: true, status: true, tutorUserId: true },
        },
        subject: {
          select: { id: true, name: true, code: true, status: true, teacherUserId: true },
        },
        teacherUser: {
          select: { id: true, name: true, email: true },
        },
        attendanceRecords: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                identification: true,
                email: true,
                status: true,
              },
            },
          },
          orderBy: { student: { lastName: "asc" } },
        },
      },
    });

    if (!session) {
      throw new Error("Sesión de clase no encontrada en esta institución.");
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      const isAuthorized =
        session.teacherUserId === accessContext.userId ||
        session.subject?.teacherUserId === accessContext.userId ||
        session.course?.tutorUserId === accessContext.userId;
      if (!isAuthorized) {
        const err: any = new Error("No tienes permisos para consultar esta sesión de clase.");
        err.statusCode = 403;
        throw err;
      }
    }

    return session;
  }

  static async updateSession(
    organizationId: number,
    sessionId: number,
    input: UpdateAcademicClassSessionInput
  ) {
    const session = await db.academicClassSession.findFirst({
      where: { id: sessionId, organizationId },
    });
    if (!session) {
      throw new Error("Sesión de clase no encontrada en esta institución.");
    }

    const data: any = {};

    if (input.subjectId !== undefined) {
      if (input.subjectId) {
        const subject = await db.academicSubject.findFirst({
          where: { id: input.subjectId, organizationId },
        });
        if (!subject) {
          throw new Error("Materia no encontrada en esta institución.");
        }
        if (subject.courseId !== session.courseId) {
          throw new Error("La materia especificada no pertenece al curso de esta sesión.");
        }
        if (subject.status === ACADEMIC_SUBJECT_STATUS.INACTIVE) {
          throw new Error("No se puede asignar una materia inactiva.");
        }
        data.subjectId = input.subjectId;
      } else {
        data.subjectId = null;
      }
    }

    if (input.teacherUserId !== undefined) {
      if (input.teacherUserId) {
        await this.validateMember(
          organizationId,
          input.teacherUserId,
          "Docente de la sesión"
        );
        data.teacherUserId = input.teacherUserId;
      } else {
        data.teacherUserId = null;
      }
    }

    if (input.sessionDate !== undefined) {
      const date = new Date(input.sessionDate);
      if (isNaN(date.getTime())) {
        throw new Error("Fecha de sesión inválida.");
      }
      data.sessionDate = date;
    }

    if (input.startTime !== undefined) {
      data.startTime = input.startTime?.trim() || null;
    }

    if (input.endTime !== undefined) {
      data.endTime = input.endTime?.trim() || null;
    }

    if (input.room !== undefined) {
      data.room = input.room?.trim() || null;
    }

    if (input.topic !== undefined) {
      data.topic = input.topic?.trim() || null;
    }

    if (input.status !== undefined) {
      const validStatuses = Object.values(ACADEMIC_CLASS_SESSION_STATUS);
      if (!validStatuses.includes(input.status as any)) {
        throw new Error(`Estado de sesión inválido: '${input.status}'.`);
      }
      data.status = input.status;
    }

    return await db.academicClassSession.update({
      where: { id: sessionId },
      data,
      include: {
        course: {
          select: { id: true, name: true, level: true },
        },
        subject: {
          select: { id: true, name: true, code: true },
        },
        teacherUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  static async updateSessionStatus(
    organizationId: number,
    sessionId: number,
    status: string
  ) {
    const validStatuses = Object.values(ACADEMIC_CLASS_SESSION_STATUS);
    if (!validStatuses.includes(status as any)) {
      throw new Error(`Estado de sesión inválido: '${status}'.`);
    }

    const session = await db.academicClassSession.findFirst({
      where: { id: sessionId, organizationId },
    });
    if (!session) {
      throw new Error("Sesión de clase no encontrada en esta institución.");
    }

    return await db.academicClassSession.update({
      where: { id: sessionId },
      data: { status },
      include: {
        course: true,
        subject: true,
        teacherUser: true,
      },
    });
  }

  static async cancelSession(organizationId: number, sessionId: number) {
    const session = await db.academicClassSession.findFirst({
      where: { id: sessionId, organizationId },
    });
    if (!session) {
      throw new Error("Sesión de clase no encontrada en esta institución.");
    }

    return await db.academicClassSession.update({
      where: { id: sessionId },
      data: { status: ACADEMIC_CLASS_SESSION_STATUS.CANCELLED },
      include: {
        course: true,
        subject: true,
        teacherUser: true,
      },
    });
  }

  // ============================================================================
  // REGISTRO DE ASISTENCIA (AcademicAttendanceRecord - FASE 2 Y FASE 11)
  // ============================================================================

  /**
   * Resuelve la Sesión Canónica Diaria para una materia, curso y fecha en Ecuador (America/Guayaquil).
   * Si existen múltiples bloques horarios para la misma materia en el mismo día, todas las tomas
   * de asistencia convergen a la misma sesión canónica para evitar duplicados.
   */
  static async resolveCanonicalDailySession(
    tx: any,
    organizationId: number,
    courseId: number,
    subjectId: number | null,
    sessionDate: Date | string,
    fallbackSessionId: number
  ) {
    const targetDateStr = getEcuadorDateString(sessionDate);

    const whereClause: any = {
      organizationId,
      courseId,
    };
    if (subjectId !== null && subjectId !== undefined) {
      whereClause.subjectId = subjectId;
    }

    const baseDate = typeof sessionDate === "string" ? new Date(sessionDate) : sessionDate;
    const windowStart = new Date(baseDate.getTime() - 24 * 3600 * 1000);
    const windowEnd = new Date(baseDate.getTime() + 24 * 3600 * 1000);

    const candidateSessions = await tx.academicClassSession.findMany({
      where: {
        ...whereClause,
        sessionDate: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
      include: {
        course: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        _count: {
          select: { attendanceRecords: true },
        },
      },
      orderBy: [
        { sessionDate: "asc" },
        { startTime: "asc" },
        { id: "asc" },
      ],
    });

    const sameDaySessions = candidateSessions.filter(
      (s: any) => getEcuadorDateString(s.sessionDate) === targetDateStr
    );

    if (sameDaySessions.length === 0) {
      const fallback = await tx.academicClassSession.findFirst({
        where: { id: fallbackSessionId, organizationId },
        include: {
          course: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
        },
      });
      return fallback;
    }

    // 1. Si alguna sesión ya tiene registros de asistencia en la base de datos, esa es la canónica
    const sessionWithRecords = sameDaySessions.find((s: any) => (s._count?.attendanceRecords || 0) > 0);
    if (sessionWithRecords) {
      return sessionWithRecords;
    }

    // 2. Si ninguna tiene registros aún, la primera sesión programada por horario o menor ID es la canónica
    return sameDaySessions[0];
  }

  /**
   * Resuelve de forma unívoca y estricta el año lectivo correspondiente a una sesión o fecha académica.
   * Exige coincidencia inequívoca dentro de la misma organización por rango de fechas [startDate, endDate].
   * Si no existe coincidencia exacta o existen múltiples años solapados, lanza un error de dominio controlado.
   */
  static async resolveSessionAcademicYear(
    tx: any,
    organizationId: number,
    sessionDate: Date | string
  ) {
    const sessionDateObj = typeof sessionDate === "string" ? new Date(sessionDate) : sessionDate;
    if (isNaN(sessionDateObj.getTime())) {
      const err: any = new Error("Fecha de sesión de clase inválida.");
      err.statusCode = 400;
      err.code = "ACADEMIC_SESSION_INVALID_DATE";
      throw err;
    }

    // Buscar años lectivos de la organización que cubran la fecha de la sesión
    const matchingYears = await tx.academicYear.findMany({
      where: {
        organizationId,
        startDate: { lte: sessionDateObj },
        endDate: { gte: sessionDateObj },
      },
    });

    if (matchingYears.length === 0) {
      const dateStr = getEcuadorDateString(sessionDateObj);
      const err: any = new Error(
        `ACADEMIC_YEAR_NOT_FOUND_FOR_DATE: No existe un año lectivo configurado en esta institución que cubra la fecha de la clase (${dateStr}).`
      );
      err.statusCode = 409;
      err.code = "ACADEMIC_YEAR_NOT_FOUND_FOR_DATE";
      throw err;
    }

    if (matchingYears.length > 1) {
      const dateStr = getEcuadorDateString(sessionDateObj);
      const yearNames = matchingYears.map((y: any) => `'${y.name}' (ID ${y.id})`).join(", ");
      const err: any = new Error(
        `ACADEMIC_YEAR_AMBIGUOUS_FOR_DATE: Se encontraron múltiples años lectivos que cubren la fecha de la clase (${dateStr}): ${yearNames}. La resolución temporal es ambigua.`
      );
      err.statusCode = 409;
      err.code = "ACADEMIC_YEAR_AMBIGUOUS_FOR_DATE";
      throw err;
    }

    return matchingYears[0];
  }

  static async saveAttendanceBatch(
    organizationId: number,
    sessionId: number,
    records: AttendanceRecordItemInput[],
    accessContext?: AcademicAccessContext,
    options?: { referenceDate?: Date }
  ) {
    // 1. Validar que la sesión exista y pertenezca a la organización
    const session = await db.academicClassSession.findFirst({
      where: { id: sessionId, organizationId },
      include: {
        course: true,
        subject: { select: { teacherUserId: true, name: true } },
      },
    });
    if (!session) {
      const err: any = new Error("Sesión de clase no encontrada en esta institución.");
      err.statusCode = 404;
      throw err;
    }

    // 2. Validar que la clase no esté cancelada
    if (session.status === ACADEMIC_CLASS_SESSION_STATUS.CANCELLED || (session.status as string) === "CANCELLED") {
      const err: any = new Error("No se puede registrar asistencia en una sesión de clase que ha sido cancelada.");
      err.statusCode = 400;
      err.code = "ACADEMIC_SESSION_CANCELLED";
      throw err;
    }

    // 3. Validar permisos docentes (RBAC)
    const isAcademicAdmin = Boolean(accessContext?.isAcademicAdmin);
    if (accessContext && !isAcademicAdmin && accessContext.userId) {
      const isOwner =
        session.teacherUserId === accessContext.userId ||
        session.subject?.teacherUserId === accessContext.userId ||
        session.course?.tutorUserId === accessContext.userId;
      if (!isOwner) {
        const err: any = new Error("No tienes permisos para registrar asistencia en esta sesión de clase.");
        err.statusCode = 403;
        err.code = "ACADEMIC_UNAUTHORIZED_SCHEDULE";
        throw err;
      }
    }

    if (!Array.isArray(records) || records.length === 0) {
      const err: any = new Error("Debe proporcionar al menos un registro de asistencia.");
      err.statusCode = 400;
      throw err;
    }

    const validStatuses = Object.values(ACADEMIC_ATTENDANCE_STATUS);

    // Pre-validar registros
    const seenStudentIds = new Set<number>();
    for (const item of records) {
      const studentId = Number(item.studentId);
      if (isNaN(studentId) || studentId <= 0) {
        const err: any = new Error(`ID de estudiante inválido: '${item.studentId}'.`);
        err.statusCode = 400;
        throw err;
      }
      if (seenStudentIds.has(studentId)) {
        const err: any = new Error(`El estudiante con ID ${studentId} aparece duplicado en la solicitud.`);
        err.statusCode = 400;
        throw err;
      }
      seenStudentIds.add(studentId);

      const statusUpper = item.status?.trim().toUpperCase();
      if (!validStatuses.includes(statusUpper as any)) {
        const err: any = new Error(
          `Estado de asistencia inválido: '${item.status}' para el estudiante ${studentId}. Estados permitidos: ${validStatuses.join(", ")}.`
        );
        err.statusCode = 400;
        throw err;
      }
    }

    // 4. Validar Cierre Diario Automático (00:00 America/Guayaquil)
    const refDate = options?.referenceDate || new Date();
    const todayEcuadorStr = getEcuadorDateString(refDate);
    const sessionDateStr = getEcuadorDateString(session.sessionDate);

    if (!isAcademicAdmin) {
      if (sessionDateStr < todayEcuadorStr) {
        const err: any = new Error(
          "La asistencia de este día está cerrada. Las modificaciones docentes sólo se permiten durante el mismo día calendario (hasta las 23:59:59 de Ecuador)."
        );
        err.statusCode = 409;
        err.code = "ACADEMIC_ATTENDANCE_DAY_CLOSED";
        throw err;
      }
      if (sessionDateStr > todayEcuadorStr) {
        const err: any = new Error("No se puede registrar asistencia en una fecha futura.");
        err.statusCode = 409;
        err.code = "ACADEMIC_ATTENDANCE_FUTURE_DATE";
        throw err;
      }
    }

    // 5. Ejecutar transacción atómica con Bloqueo Consultivo y Sesión Canónica
    return await db.$transaction(async (tx) => {
      // Bloqueo consultivo por curso, materia y fecha
      const lockKey = `attendance:${organizationId}:${session.courseId}:${session.subjectId || 0}:${sessionDateStr}`;
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, lockKey);

      // Re-verificar fecha dentro de la transacción (protección concurrencia en medianoche)
      const txRefDate = options?.referenceDate || new Date();
      const txTodayEcuadorStr = getEcuadorDateString(txRefDate);
      if (!isAcademicAdmin && sessionDateStr < txTodayEcuadorStr) {
        const err: any = new Error(
          "La asistencia de este día está cerrada. Las modificaciones docentes sólo se permiten durante el mismo día calendario (hasta las 23:59:59 de Ecuador)."
        );
        err.statusCode = 409;
        err.code = "ACADEMIC_ATTENDANCE_DAY_CLOSED";
        throw err;
      }

      // Resolver la sesión canónica del día
      const canonicalSession = await this.resolveCanonicalDailySession(
        tx,
        organizationId,
        session.courseId,
        session.subjectId || null,
        session.sessionDate,
        session.id
      );

      // Resolver unívocamente el año lectivo correspondiente a la fecha de la sesión
      const sessionYear = await AcademicService.resolveSessionAcademicYear(
        tx,
        organizationId,
        session.sessionDate
      );

      // Validar si la materia tiene horario programado para el día de la semana de la sesión
      if (session.subjectId) {
        const dayOfWeek = getEcuadorDayOfWeek(session.sessionDate);
        const sessionDateObj = new Date(session.sessionDate);

        let activeSlot: any = null;
        let totalSubjectSlots = 0;
        try {
          activeSlot = await tx.academicSubjectScheduleSlot.findFirst({
            where: {
              organizationId,
              courseId: session.courseId,
              subjectId: session.subjectId,
              dayOfWeek,
              status: "ACTIVE",
              effectiveFrom: { lte: sessionDateObj },
              OR: [
                { effectiveTo: null },
                { effectiveTo: { gte: sessionDateObj } },
              ],
            },
          });

          totalSubjectSlots = await tx.academicSubjectScheduleSlot.count({
            where: {
              organizationId,
              subjectId: session.subjectId,
              status: "ACTIVE",
              effectiveFrom: { lte: sessionDateObj },
              OR: [
                { effectiveTo: null },
                { effectiveTo: { gte: sessionDateObj } },
              ],
            },
          });
        } catch (err: any) {
          if (
            err?.code === "P2021" ||
            err?.code === "42P01" ||
            (typeof err?.message === "string" &&
              (err.message.includes("AcademicSubjectScheduleSlot") ||
                err.message.includes("does not exist")))
          ) {
            activeSlot = null;
            totalSubjectSlots = 0;
          } else {
            throw err;
          }
        }

        const isExtraordinary =
          session.topic?.toUpperCase().includes("EXTRAORDINARI") ||
          session.topic?.toUpperCase().includes("TUTORÍA") ||
          session.topic?.toUpperCase().includes("RECUPERACI");

        if (totalSubjectSlots > 0 && !activeSlot && !isExtraordinary && !isAcademicAdmin) {
          const dayName = getDayNameSpanish(dayOfWeek);
          const err: any = new Error(
            `La materia '${session.subject?.name || "Asignatura"}' no tiene horario de clases programado para los días ${dayName}.`
          );
          err.statusCode = 409;
          err.code = "ACADEMIC_SUBJECT_NOT_SCHEDULED_TODAY";
          throw err;
        }
      }

      const targetSessionId = canonicalSession.id;
      const results = [];

      for (const item of records) {
        const studentId = Number(item.studentId);
        const statusUpper = item.status.trim().toUpperCase();
        const observation = item.observation?.trim() || null;

        // Validar estudiante en la organización y que esté activo
        const student = await tx.academicStudent.findFirst({
          where: { id: studentId, organizationId },
        });
        if (!student) {
          const err: any = new Error(
            `El estudiante con ID ${studentId} no existe en esta institución.`
          );
          err.statusCode = 404;
          throw err;
        }
        if (student.status !== ACADEMIC_STUDENT_STATUS.ACTIVE) {
          const err: any = new Error(
            `No se puede registrar asistencia para el estudiante ${student.firstName} ${student.lastName} (ID: ${studentId}) porque se encuentra administrativamente INACTIVO.`
          );
          err.statusCode = 400;
          throw err;
        }

        // Validar matrícula activa en el curso y año lectivo de la sesión
        const enrollment = await tx.academicEnrollment.findFirst({
          where: {
            organizationId,
            studentId,
            courseId: session.courseId,
            academicYearId: sessionYear.id,
          },
        });

        if (!enrollment || enrollment.organizationId !== organizationId) {
          const err: any = new Error(
            `El estudiante ${student.firstName} ${student.lastName} (ID: ${studentId}) no está matriculado en el curso '${session.course.name}' para el año lectivo '${sessionYear.name}'.`
          );
          err.statusCode = 400;
          err.code = "ACADEMIC_STUDENT_NOT_ENROLLED_IN_YEAR";
          throw err;
        }

        if (enrollment.status !== ACADEMIC_ENROLLMENT_STATUS.ACTIVE) {
          const err: any = new Error(
            `No se puede registrar asistencia para el estudiante ${student.firstName} ${student.lastName} porque su matrícula en el curso '${session.course.name}' para el año lectivo '${sessionYear.name}' no está activa (Estado actual: ${enrollment.status}).`
          );
          err.statusCode = 400;
          err.code = "ACADEMIC_ENROLLMENT_INACTIVE";
          throw err;
        }

        // Guardar o actualizar registro en la sesión canónica
        const saved = await tx.academicAttendanceRecord.upsert({
          where: {
            sessionId_studentId: {
              sessionId: targetSessionId,
              studentId,
            },
          },
          update: {
            status: statusUpper,
            observation,
          },
          create: {
            organizationId,
            sessionId: targetSessionId,
            studentId,
            status: statusUpper,
            observation,
          },
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                identification: true,
              },
            },
          },
        });

        results.push(saved);
      }

      // Marcar sesión canónica como completada si estaba programada
      if (canonicalSession.status === ACADEMIC_CLASS_SESSION_STATUS.SCHEDULED) {
        await tx.academicClassSession.update({
          where: { id: targetSessionId },
          data: { status: ACADEMIC_CLASS_SESSION_STATUS.COMPLETED },
        });
      }

      return results;
    });
  }

  /**
   * Rectificación administrativa de asistencias cerradas con auditoría obligatoria en AuditLog.
   */
  static async rectifyAttendanceBatch(
    organizationId: number,
    sessionId: number,
    records: AttendanceRecordItemInput[],
    reason: string,
    accessContext?: AcademicAccessContext,
    options?: { referenceDate?: Date }
  ) {
    // 1. Exigir permisos administrativos
    const isAcademicAdmin = Boolean(accessContext?.isAcademicAdmin);
    if (!isAcademicAdmin) {
      const err: any = new Error(
        "Se requieren permisos administrativos para rectificar asistencias cerradas."
      );
      err.statusCode = 403;
      err.code = "ACADEMIC_FORBIDDEN";
      throw err;
    }

    // 2. Exigir motivo obligatorio
    if (!reason || typeof reason !== "string" || reason.trim().length < 10) {
      const err: any = new Error(
        "Debe proporcionar un motivo de rectificación administrativo válido (mínimo 10 caracteres)."
      );
      err.statusCode = 400;
      err.code = "INVALID_RECTIFICATION_REASON";
      throw err;
    }

    const adminUserId = accessContext?.userId;
    if (!adminUserId) {
      const err: any = new Error("Identificador de usuario administrador no disponible en la sesión.");
      err.statusCode = 401;
      throw err;
    }

    // 3. Validar sesión
    const session = await db.academicClassSession.findFirst({
      where: { id: sessionId, organizationId },
      include: {
        course: true,
        subject: { select: { name: true } },
      },
    });
    if (!session) {
      const err: any = new Error("Sesión de clase no encontrada en esta institución.");
      err.statusCode = 404;
      throw err;
    }

    if (!Array.isArray(records) || records.length === 0) {
      const err: any = new Error("Debe proporcionar al menos un registro de asistencia.");
      err.statusCode = 400;
      throw err;
    }

    const sessionDateStr = getEcuadorDateString(session.sessionDate);

    // 4. Transacción atómica de rectificación y auditoría
    return await db.$transaction(async (tx) => {
      const lockKey = `attendance:${organizationId}:${session.courseId}:${session.subjectId || 0}:${sessionDateStr}`;
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, lockKey);

      const canonicalSession = await this.resolveCanonicalDailySession(
        tx,
        organizationId,
        session.courseId,
        session.subjectId || null,
        session.sessionDate,
        session.id
      );

      const targetSessionId = canonicalSession.id;

      // Obtener registros existentes para registrar el diff en auditoría
      const existingRecords = await tx.academicAttendanceRecord.findMany({
        where: { sessionId: targetSessionId, organizationId },
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      const existingMap = new Map<number, { status: string; observation: string | null; studentName: string }>();
      for (const ex of existingRecords) {
        existingMap.set(ex.studentId, {
          status: ex.status,
          observation: ex.observation,
          studentName: `${ex.student.firstName} ${ex.student.lastName}`.trim(),
        });
      }

      const results = [];
      const changesList: any[] = [];

      for (const item of records) {
        const studentId = Number(item.studentId);
        const statusUpper = item.status.trim().toUpperCase();
        const observation = item.observation?.trim() || null;

        const student = await tx.academicStudent.findFirst({
          where: { id: studentId, organizationId },
        });
        if (!student) {
          const err: any = new Error(`Estudiante ID ${studentId} no encontrado en la institución.`);
          err.statusCode = 404;
          throw err;
        }

        const prev = existingMap.get(studentId);
        const studentFullName = `${student.firstName} ${student.lastName}`.trim();

        const saved = await tx.academicAttendanceRecord.upsert({
          where: {
            sessionId_studentId: {
              sessionId: targetSessionId,
              studentId,
            },
          },
          update: {
            status: statusUpper,
            observation,
          },
          create: {
            organizationId,
            sessionId: targetSessionId,
            studentId,
            status: statusUpper,
            observation,
          },
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                identification: true,
              },
            },
          },
        });

        results.push(saved);

        changesList.push({
          studentId,
          studentName: studentFullName,
          oldStatus: prev?.status || null,
          newStatus: statusUpper,
          oldObservation: prev?.observation || null,
          newObservation: observation,
        });
      }

      // Guardar auditoría atómica en AuditLog
      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: "ACADEMIC_ATTENDANCE_RECTIFICATION",
          details: JSON.stringify({
            organizationId,
            sessionId: targetSessionId,
            originalRequestedSessionId: session.id,
            courseId: session.courseId,
            courseName: session.course?.name,
            subjectId: session.subjectId,
            subjectName: session.subject?.name,
            sessionDate: session.sessionDate,
            sessionDateEcuador: sessionDateStr,
            reason: reason.trim(),
            adminUserId,
            totalStudentsAffected: changesList.length,
            changes: changesList,
            timestamp: new Date().toISOString(),
          }),
        },
      });

      return {
        success: true,
        sessionId: targetSessionId,
        sessionDate: sessionDateStr,
        changesCount: changesList.length,
        auditLogRecorded: true,
        records: results,
      };
    });
  }

  static async getAttendanceBySession(
    organizationId: number,
    sessionId: number,
    accessContext?: AcademicAccessContext
  ) {
    const session = await db.academicClassSession.findFirst({
      where: { id: sessionId, organizationId },
      include: {
        course: true,
        subject: { select: { teacherUserId: true } },
      },
    });
    if (!session) {
      throw new Error("Sesión de clase no encontrada en esta institución.");
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      const isAuthorized =
        session.teacherUserId === accessContext.userId ||
        session.subject?.teacherUserId === accessContext.userId ||
        session.course?.tutorUserId === accessContext.userId;
      if (!isAuthorized) {
        const err: any = new Error("No tienes permisos para consultar la asistencia de esta sesión.");
        err.statusCode = 403;
        throw err;
      }
    }

    return await db.academicAttendanceRecord.findMany({
      where: {
        sessionId,
        organizationId,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            identification: true,
            email: true,
            status: true,
          },
        },
      },
      orderBy: { student: { lastName: "asc" } },
    });
  }

  static async getAttendanceHistory(
    organizationId: number,
    filter?: {
      courseId?: number;
      subjectId?: number;
      studentId?: number;
      date?: string;
      status?: string;
    },
    accessContext?: AcademicAccessContext
  ) {
    const whereClause: any = { organizationId };

    if (filter?.status) {
      whereClause.status = filter.status.trim().toUpperCase();
    }

    if (filter?.studentId) {
      whereClause.studentId = filter.studentId;
    }

    const sessionWhere: any = {};
    if (filter?.courseId) {
      sessionWhere.courseId = filter.courseId;
    }
    if (filter?.subjectId) {
      sessionWhere.subjectId = filter.subjectId;
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      sessionWhere.OR = [
        { teacherUserId: accessContext.userId },
        { subject: { teacherUserId: accessContext.userId } },
      ];
    }

    if (filter?.date) {
      const parsedDate = new Date(filter.date);
      if (!isNaN(parsedDate.getTime())) {
        const startOfDay = new Date(parsedDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(parsedDate);
        endOfDay.setUTCHours(23, 59, 59, 999);
        sessionWhere.sessionDate = {
          gte: startOfDay,
          lte: endOfDay,
        };
      }
    }

    if (Object.keys(sessionWhere).length > 0) {
      whereClause.session = sessionWhere;
    }

    const records = await db.academicAttendanceRecord.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            identification: true,
            status: true,
          },
        },
        session: {
          include: {
            course: {
              select: { id: true, name: true, level: true },
            },
            subject: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
      orderBy: [{ session: { sessionDate: "desc" } }, { student: { lastName: "asc" } }],
    });

    return records.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      studentId: r.studentId,
      studentName: `${r.student.firstName} ${r.student.lastName}`,
      courseId: r.session.courseId,
      courseName: r.session.course.name,
      subjectId: r.session.subjectId,
      subjectName: r.session.subject ? r.session.subject.name : "General",
      date: r.session.sessionDate.toISOString().split("T")[0],
      status: r.status.toLowerCase(),
      observation: r.observation,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  static async updateAttendanceRecord(
    organizationId: number,
    attendanceId: number,
    input: { status?: string; observation?: string | null },
    accessContext?: AcademicAccessContext
  ) {
    const record = await db.academicAttendanceRecord.findFirst({
      where: { id: attendanceId, organizationId },
      include: {
        session: {
          include: {
            course: true,
            subject: { select: { teacherUserId: true } },
          },
        },
      },
    });
    if (!record) {
      throw new Error("Registro de asistencia no encontrado en esta institución.");
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      const isAuthorized =
        record.session.teacherUserId === accessContext.userId ||
        record.session.subject?.teacherUserId === accessContext.userId ||
        record.session.course?.tutorUserId === accessContext.userId;
      if (!isAuthorized) {
        const err: any = new Error("No tienes permisos para modificar este registro de asistencia.");
        err.statusCode = 403;
        throw err;
      }
    }

    const data: any = {};

    if (input.status !== undefined) {
      const validStatuses = Object.values(ACADEMIC_ATTENDANCE_STATUS);
      const statusUpper = input.status.trim().toUpperCase();
      if (!validStatuses.includes(statusUpper as any)) {
        throw new Error(
          `Estado de asistencia inválido: '${input.status}'. Permitidos: ${validStatuses.join(", ")}.`
        );
      }
      data.status = statusUpper;
    }

    if (input.observation !== undefined) {
      data.observation = input.observation?.trim() || null;
    }

    return await db.academicAttendanceRecord.update({
      where: { id: attendanceId },
      data,
      include: {
        student: true,
        session: {
          include: {
            course: true,
            subject: true,
          },
        },
      },
    });
  }

  // -------------------------------------------------------------
  // ACTIVIDADES Y EVALUACIONES (FASE 3)
  // -------------------------------------------------------------

  /**
   * Crea una nueva actividad / evaluación académica en un curso y materia.
   */
  static async createActivity(
    organizationId: number,
    courseId: number,
    input: CreateAcademicActivityInput,
    accessContext?: AcademicAccessContext
  ) {
    const course = await db.academicCourse.findFirst({
      where: { id: courseId, organizationId },
    });
    if (!course) {
      throw new Error("Curso no encontrado en esta institución.");
    }
    if (course.status === ACADEMIC_COURSE_STATUS.ARCHIVED) {
      throw new Error("No se pueden crear actividades en un curso archivado.");
    }

    const subject = await db.academicSubject.findFirst({
      where: { id: input.subjectId, organizationId },
    });
    if (!subject) {
      throw new Error("Materia no encontrada en esta institución.");
    }
    if (subject.courseId !== courseId) {
      throw new Error("La materia especificada no pertenece al curso seleccionado.");
    }
    if (subject.status === ACADEMIC_SUBJECT_STATUS.INACTIVE) {
      throw new Error("No se pueden crear actividades en una materia inactiva.");
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      if (subject.teacherUserId !== accessContext.userId) {
        const err: any = new Error("No tienes permisos para crear actividades en esta materia.");
        err.statusCode = 403;
        throw err;
      }
    }

    const name = input.name?.trim();
    if (!name) {
      throw new Error("El nombre de la actividad o evaluación es obligatorio.");
    }

    let activityType: string = ACADEMIC_ACTIVITY_TYPE.HOMEWORK;
    if (input.type) {
      const typeUpper = input.type.trim().toUpperCase();
      const validTypes = Object.values(ACADEMIC_ACTIVITY_TYPE);
      if (!validTypes.includes(typeUpper as any)) {
        throw new Error(
          `Tipo de actividad inválido: '${input.type}'. Permitidos: ${validTypes.join(", ")}.`
        );
      }
      activityType = typeUpper;
    }

    const maxScore = Number(input.maxScore);
    if (typeof input.maxScore !== "number" || isNaN(maxScore) || !isFinite(maxScore) || maxScore <= 0) {
      throw new Error("El puntaje máximo (maxScore) debe ser un número finito mayor a 0.");
    }

    let teacherUserId: number | null = null;
    if (input.teacherUserId !== undefined && input.teacherUserId !== null) {
      const teacherId = Number(input.teacherUserId);
      if (!isNaN(teacherId) && teacherId > 0) {
        await this.validateMember(organizationId, teacherId, "docente");
        teacherUserId = teacherId;
      }
    }

    let dueDate: Date | null = null;
    if (input.dueDate) {
      const parsedDate = new Date(input.dueDate);
      if (isNaN(parsedDate.getTime())) {
        throw new Error("La fecha límite o de realización no tiene un formato válido.");
      }
      dueDate = parsedDate;
    }

    let academicPeriodId: number | null = null;
    if (input.academicPeriodId) {
      const period = await db.academicPeriod.findFirst({
        where: { id: input.academicPeriodId, organizationId },
      });
      if (!period) {
        throw new Error(`Periodo académico con ID ${input.academicPeriodId} no existe en esta institución.`);
      }
      if (
        period.status === AcademicPeriodStatus.CLOSED ||
        period.status === AcademicPeriodStatus.ARCHIVED ||
        period.status === AcademicPeriodStatus.LOCKED
      ) {
        const err: any = new Error(
          period.status === AcademicPeriodStatus.LOCKED
            ? "ACADEMIC_PERIOD_LOCKED: No se pueden crear actividades en un periodo con estructura bloqueada (LOCKED)."
            : "ACADEMIC_PERIOD_IMMUTABLE: No se pueden crear actividades en un periodo cerrado o archivado."
        );
        err.statusCode = 400;
        err.code = period.status === AcademicPeriodStatus.LOCKED ? "ACADEMIC_PERIOD_LOCKED" : "ACADEMIC_PERIOD_IMMUTABLE";
        throw err;
      }
      if (accessContext && !accessContext.isAcademicAdmin && isAcademicPeriodFuture(period.startDate)) {
        const startFormatted = new Date(period.startDate).toISOString().split("T")[0];
        const err: any = new Error(
          `ACADEMIC_PERIOD_NOT_STARTED: No se pueden crear actividades en un periodo que aún no ha iniciado (Fecha de inicio: ${startFormatted}).`
        );
        err.statusCode = 409;
        err.code = "ACADEMIC_PERIOD_NOT_STARTED";
        throw err;
      }
      if (dueDate && (dueDate < period.startDate || dueDate > period.endDate)) {
        throw new Error(
          `La fecha límite (${dueDate.toISOString().split("T")[0]}) debe encontrarse dentro del rango del periodo (${period.startDate.toISOString().split("T")[0]} al ${period.endDate.toISOString().split("T")[0]}).`
        );
      }
      academicPeriodId = period.id;
    }

    // Validación obligatoria de Periodo Académico
    if (!academicPeriodId) {
      const err: any = new Error(
        "ACADEMIC_PERIOD_REQUIRED: Se requiere especificar el periodo académico para crear una actividad."
      );
      err.statusCode = 400;
      err.code = "ACADEMIC_PERIOD_REQUIRED";
      throw err;
    }

    // Validación obligatoria de Esquema de Evaluación en estado VALID
    const scheme = await db.academicEvaluationScheme.findFirst({
      where: {
        organizationId,
        courseId,
        subjectId: input.subjectId,
        academicPeriodId,
      },
      include: { categories: { orderBy: { order: "asc" } } },
    });

    if (!scheme) {
      const err: any = new Error(
        "EVALUATION_SCHEME_REQUIRED: Esta materia no tiene configuradas las ponderaciones para este periodo. Debe configurar las ponderaciones antes de crear actividades."
      );
      err.statusCode = 400;
      err.code = "EVALUATION_SCHEME_REQUIRED";
      throw err;
    }

    if (scheme.status !== AcademicEvaluationSchemeStatus.VALID) {
      const err: any = new Error(
        "EVALUATION_SCHEME_NOT_VALID: El esquema de ponderaciones se encuentra en borrador (DRAFT) o incompleto. Debe validarse (sumando 100%) antes de crear actividades."
      );
      err.statusCode = 400;
      err.code = "EVALUATION_SCHEME_NOT_VALID";
      throw err;
    }

    if (!scheme.categories || scheme.categories.length === 0) {
      const err: any = new Error(
        "EVALUATION_SCHEME_NO_CATEGORIES: El esquema de ponderaciones no posee categorías configuradas."
      );
      err.statusCode = 400;
      err.code = "EVALUATION_SCHEME_NO_CATEGORIES";
      throw err;
    }

    // Validación obligatoria de Categoría perteneciente al esquema
    if (!input.categoryId) {
      const err: any = new Error(
        "CATEGORY_REQUIRED: Se requiere especificar la categoría de evaluación a la que pertenece la actividad."
      );
      err.statusCode = 400;
      err.code = "CATEGORY_REQUIRED";
      throw err;
    }

    const category = scheme.categories.find((c) => c.id === Number(input.categoryId));
    if (!category) {
      const err: any = new Error(
        "CATEGORY_NOT_IN_SCHEME: La categoría seleccionada no pertenece al esquema de evaluación de esta materia y periodo."
      );
      err.statusCode = 400;
      err.code = "CATEGORY_NOT_IN_SCHEME";
      throw err;
    }

    const categoryId = category.id;
    const evaluationSchemeId = scheme.id;

    // Regla de examen único estricta según el tipo de actividad seleccionado (sin inferencia por nombre)
    if (activityType === ACADEMIC_ACTIVITY_TYPE.EXAM) {
      const existingExam = await db.academicActivity.findFirst({
        where: {
          organizationId,
          courseId,
          subjectId: input.subjectId,
          academicPeriodId,
          type: ACADEMIC_ACTIVITY_TYPE.EXAM,
        },
      });
      if (existingExam) {
        const err: any = new Error(
          "Ya existe una Evaluación Parcial registrada para este periodo académico (máximo 1 permitida)."
        );
        err.statusCode = 409;
        err.code = "DUPLICATE_EXAM_ACTIVITY";
        throw err;
      }
    }

    return await db.$transaction(async (tx) => {
      if (academicPeriodId) {
        await AcademicService.lockAcademicPeriodForAcademicWrite(tx, organizationId, academicPeriodId, { allowLocked: false, accessContext });
      }

      const activity = await tx.academicActivity.create({
        data: {
          organizationId,
          courseId,
          subjectId: input.subjectId,
          teacherUserId,
          name,
          description: input.description?.trim() || null,
          type: activityType,
          dueDate,
          maxScore,
          academicPeriodId,
          evaluationSchemeId,
          categoryId,
        },
        include: {
          course: true,
          subject: true,
          academicPeriod: true,
          category: true,
          teacherUser: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { grades: true },
          },
        },
      });

      // Asignación automática de calificaciones PENDING para los estudiantes matriculados activamente en el curso
      let enrollmentFilter: any = {
        courseId,
        organizationId,
        status: ACADEMIC_ENROLLMENT_STATUS.ACTIVE,
      };
      if (academicPeriodId) {
        const periodForEnrollment = await tx.academicPeriod.findUnique({
          where: { id: academicPeriodId },
          select: { academicYearId: true },
        });
        if (periodForEnrollment?.academicYearId) {
          enrollmentFilter.academicYearId = periodForEnrollment.academicYearId;
        }
      }

      const activeEnrollments = await tx.academicEnrollment.findMany({
        where: enrollmentFilter,
      });

      if (activeEnrollments.length > 0) {
        await tx.academicGrade.createMany({
          data: activeEnrollments.map((enr) => ({
            organizationId,
            activityId: activity.id,
            studentId: enr.studentId,
            enrollmentId: enr.id,
            status: AcademicGradeStatus.PENDING,
            score: null,
            gradedAt: null,
          })),
          skipDuplicates: true,
        });
      }

      return activity;
    });
  }

  /**
   * Lista actividades / evaluaciones con filtros opcionales.
   */
  static async getActivities(
    organizationId: number,
    filter?: {
      courseId?: number;
      subjectId?: number;
      academicPeriodId?: number;
      type?: string;
      search?: string;
    },
    accessContext?: AcademicAccessContext
  ) {
    const where: any = { organizationId };

    if (filter?.courseId) {
      where.courseId = Number(filter.courseId);
    }
    if (filter?.subjectId) {
      where.subjectId = Number(filter.subjectId);
    }
    if (filter?.academicPeriodId) {
      where.academicPeriodId = Number(filter.academicPeriodId);
    }
    if (filter?.type) {
      const typeUpper = filter.type.trim().toUpperCase();
      where.type = typeUpper;
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      where.OR = [
        { teacherUserId: accessContext.userId },
        { subject: { teacherUserId: accessContext.userId } },
      ];
    }

    if (filter?.search) {
      const term = filter.search.trim();
      const searchOR = [
        { name: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchOR }];
        delete where.OR;
      } else {
        where.OR = searchOR;
      }
    }

    return await db.academicActivity.findMany({
      where,
      include: {
        course: true,
        subject: true,
        academicPeriod: true,
        category: true,
        teacherUser: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { grades: true },
        },
      },
      orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
    });
  }

  /**
   * Obtiene una actividad por ID dentro de la organización.
   */
  static async getActivityById(
    organizationId: number,
    activityId: number,
    accessContext?: AcademicAccessContext
  ) {
    const activity = await db.academicActivity.findFirst({
      where: { id: activityId, organizationId },
      include: {
        course: true,
        subject: true,
        academicPeriod: true,
        category: true,
        teacherUser: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { grades: true },
        },
      },
    });
    if (!activity) {
      throw new Error("Actividad no encontrada en esta institución.");
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      const isAuthorized =
        activity.teacherUserId === accessContext.userId ||
        activity.subject?.teacherUserId === accessContext.userId;
      if (!isAuthorized) {
        const err: any = new Error("No tienes permisos para consultar esta actividad.");
        err.statusCode = 403;
        throw err;
      }
    }

    return activity;
  }

  /**
   * Actualiza una actividad académica validando maxScore histórico si existen calificaciones.
   */
  static async updateActivity(
    organizationId: number,
    activityId: number,
    input: UpdateAcademicActivityInput,
    accessContext?: AcademicAccessContext
  ) {
    const activity = await db.academicActivity.findFirst({
      where: { id: activityId, organizationId },
      include: {
        academicPeriod: true,
        subject: { select: { teacherUserId: true } },
      },
    });
    if (!activity) {
      throw new Error("Actividad no encontrada en esta institución.");
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      const isAuthorized =
        activity.teacherUserId === accessContext.userId ||
        activity.subject?.teacherUserId === accessContext.userId;
      if (!isAuthorized) {
        const err: any = new Error("No tienes permisos para modificar esta actividad.");
        err.statusCode = 403;
        throw err;
      }
    }

    if (
      activity.academicPeriod &&
      (activity.academicPeriod.status === AcademicPeriodStatus.CLOSED ||
        activity.academicPeriod.status === AcademicPeriodStatus.ARCHIVED ||
        activity.academicPeriod.status === AcademicPeriodStatus.LOCKED)
    ) {
      const err: any = new Error(
        activity.academicPeriod.status === AcademicPeriodStatus.LOCKED
          ? "ACADEMIC_PERIOD_LOCKED: No se puede modificar una actividad que pertenece a un periodo con estructura bloqueada (LOCKED)."
          : "ACADEMIC_PERIOD_IMMUTABLE: No se puede modificar una actividad que pertenece a un periodo académico cerrado o archivado."
      );
      err.statusCode = 400;
      err.code = activity.academicPeriod.status === AcademicPeriodStatus.LOCKED ? "ACADEMIC_PERIOD_LOCKED" : "ACADEMIC_PERIOD_IMMUTABLE";
      throw err;
    }

    if (
      accessContext &&
      !accessContext.isAcademicAdmin &&
      activity.academicPeriod &&
      isAcademicPeriodFuture(activity.academicPeriod.startDate)
    ) {
      const startFormatted = new Date(activity.academicPeriod.startDate).toISOString().split("T")[0];
      const err: any = new Error(
        `ACADEMIC_PERIOD_NOT_STARTED: No se puede modificar una actividad en un periodo que aún no ha iniciado (Fecha de inicio: ${startFormatted}).`
      );
      err.statusCode = 409;
      err.code = "ACADEMIC_PERIOD_NOT_STARTED";
      throw err;
    }

    const data: any = {};

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) {
        throw new Error("El nombre de la actividad no puede estar vacío.");
      }
      data.name = name;
    }

    if (input.description !== undefined) {
      data.description = input.description?.trim() || null;
    }

    if (input.type !== undefined) {
      const typeUpper = input.type.trim().toUpperCase();
      const validTypes = Object.values(ACADEMIC_ACTIVITY_TYPE);
      if (!validTypes.includes(typeUpper as any)) {
        throw new Error(
          `Tipo de actividad inválido: '${input.type}'. Permitidos: ${validTypes.join(", ")}.`
        );
      }
      data.type = typeUpper;
    }

    if (input.dueDate !== undefined) {
      if (input.dueDate === null) {
        data.dueDate = null;
      } else {
        const parsedDate = new Date(input.dueDate);
        if (isNaN(parsedDate.getTime())) {
          throw new Error("La fecha límite o de realización no tiene un formato válido.");
        }
        data.dueDate = parsedDate;
      }
    }

    if (input.maxScore !== undefined) {
      const newMaxScore = Number(input.maxScore);
      if (typeof input.maxScore !== "number" || isNaN(newMaxScore) || !isFinite(newMaxScore) || newMaxScore <= 0) {
        throw new Error("El puntaje máximo (maxScore) debe ser un número finito mayor a 0.");
      }

      // Regla de seguridad histórica: maxScore no puede ser menor a la nota más alta ya registrada
      const maxGrade = await db.academicGrade.aggregate({
        where: { activityId, organizationId, score: { not: null } },
        _max: { score: true },
      });

      const maxRecorded = maxGrade._max.score !== null ? maxGrade._max.score.toNumber() : null;
      if (maxRecorded !== null && newMaxScore < maxRecorded) {
        throw new Error(
          `No se puede reducir el puntaje máximo a ${newMaxScore} porque existen calificaciones registradas con puntaje de hasta ${maxRecorded}.`
        );
      }
      data.maxScore = newMaxScore;
    }

    if (input.teacherUserId !== undefined) {
      if (input.teacherUserId === null) {
        data.teacherUserId = null;
      } else {
        const teacherId = Number(input.teacherUserId);
        if (isNaN(teacherId) || teacherId <= 0) {
          data.teacherUserId = null;
        } else {
          await this.validateMember(organizationId, teacherId, "docente");
          data.teacherUserId = teacherId;
        }
      }
    }

    if (input.academicPeriodId !== undefined) {
      if (input.academicPeriodId === null) {
        data.academicPeriodId = null;
      } else {
        const period = await db.academicPeriod.findFirst({
          where: { id: input.academicPeriodId, organizationId },
        });
        if (!period) {
          throw new Error(`Periodo académico con ID ${input.academicPeriodId} no existe en esta institución.`);
        }
        if (
          period.status === AcademicPeriodStatus.CLOSED ||
          period.status === AcademicPeriodStatus.ARCHIVED ||
          period.status === AcademicPeriodStatus.LOCKED
        ) {
          const err: any = new Error(
            period.status === AcademicPeriodStatus.LOCKED
              ? "ACADEMIC_PERIOD_LOCKED: No se puede asignar un periodo académico con estructura bloqueada (LOCKED)."
              : "ACADEMIC_PERIOD_IMMUTABLE: No se puede asignar un periodo académico cerrado o archivado."
          );
          err.statusCode = 400;
          err.code = period.status === AcademicPeriodStatus.LOCKED ? "ACADEMIC_PERIOD_LOCKED" : "ACADEMIC_PERIOD_IMMUTABLE";
          throw err;
        }
        if (accessContext && !accessContext.isAcademicAdmin && isAcademicPeriodFuture(period.startDate)) {
          const startFormatted = new Date(period.startDate).toISOString().split("T")[0];
          const err: any = new Error(
            `ACADEMIC_PERIOD_NOT_STARTED: No se puede reasignar la actividad a un periodo que aún no ha iniciado (Fecha de inicio: ${startFormatted}).`
          );
          err.statusCode = 409;
          err.code = "ACADEMIC_PERIOD_NOT_STARTED";
          throw err;
        }
        data.academicPeriodId = period.id;
      }
    }

    if (input.categoryId !== undefined) {
      if (input.categoryId === null) {
        data.categoryId = null;
      } else {
        const category = await db.academicEvaluationCategory.findFirst({
          where: { id: input.categoryId, organizationId },
          include: { scheme: true },
        });
        if (!category) {
          const err: any = new Error(`Categoría de evaluación con ID ${input.categoryId} no existe en esta institución.`);
          err.statusCode = 400;
          err.code = "CATEGORY_NOT_FOUND";
          throw err;
        }

        const targetPeriodId = data.academicPeriodId || activity.academicPeriodId;
        if (
          category.scheme.courseId !== activity.courseId ||
          category.scheme.subjectId !== activity.subjectId ||
          (targetPeriodId && category.scheme.academicPeriodId !== targetPeriodId)
        ) {
          const err: any = new Error(
            "CATEGORY_NOT_IN_SCHEME: La categoría especificada no corresponde al curso, materia y periodo de esta actividad."
          );
          err.statusCode = 400;
          err.code = "CATEGORY_NOT_IN_SCHEME";
          throw err;
        }

        if (category.scheme.status !== AcademicEvaluationSchemeStatus.VALID) {
          const err: any = new Error(
            "EVALUATION_SCHEME_NOT_VALID: El esquema de ponderaciones de la categoría no se encuentra en estado válido (VALID)."
          );
          err.statusCode = 400;
          err.code = "EVALUATION_SCHEME_NOT_VALID";
          throw err;
        }

        data.categoryId = category.id;
        data.evaluationSchemeId = category.schemeId;
      }
    }

    return await db.$transaction(async (tx) => {
      if (activity.academicPeriodId) {
        await AcademicService.lockAcademicPeriodForAcademicWrite(tx, organizationId, activity.academicPeriodId, { allowLocked: false, accessContext });
      }
      if (input.academicPeriodId && input.academicPeriodId !== activity.academicPeriodId) {
        await AcademicService.lockAcademicPeriodForAcademicWrite(tx, organizationId, input.academicPeriodId, { allowLocked: false, accessContext });
      }

      return await tx.academicActivity.update({
        where: { id: activityId },
        data,
        include: {
          course: true,
          subject: true,
          academicPeriod: true,
          category: true,
          teacherUser: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { grades: true },
          },
        },
      });
    });
  }

  // -------------------------------------------------------------
  // REGISTRO DE CALIFICACIONES (FASE 3)
  // -------------------------------------------------------------

  /**
   * Guarda o actualiza un lote de calificaciones para una actividad de forma atómica y auditable.
   */
  static async saveGradesBatch(
    organizationId: number,
    activityId: number,
    grades: GradeRecordItemInput[],
    options?: { reason?: string; changedByUserId?: number | null },
    accessContext?: AcademicAccessContext
  ) {
    const activity = await db.academicActivity.findFirst({
      where: { id: activityId, organizationId },
      include: {
        academicPeriod: true,
        subject: { select: { teacherUserId: true } },
      },
    });
    if (!activity) {
      throw new Error("Actividad no encontrada en esta institución.");
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      const isAuthorized =
        activity.teacherUserId === accessContext.userId ||
        activity.subject?.teacherUserId === accessContext.userId;
      if (!isAuthorized) {
        const err: any = new Error("No tienes permisos para calificar esta actividad.");
        err.statusCode = 403;
        throw err;
      }
    }

    if (
      activity.academicPeriod &&
      (activity.academicPeriod.status === AcademicPeriodStatus.CLOSED ||
        activity.academicPeriod.status === AcademicPeriodStatus.ARCHIVED)
    ) {
      const err: any = new Error("No se pueden registrar o modificar calificaciones en un periodo académico cerrado o archivado.");
      err.statusCode = 400;
      err.code = "ACADEMIC_PERIOD_IMMUTABLE";
      throw err;
    }

    if (
      accessContext &&
      !accessContext.isAcademicAdmin &&
      activity.academicPeriod &&
      isAcademicPeriodFuture(activity.academicPeriod.startDate)
    ) {
      const startFormatted = new Date(activity.academicPeriod.startDate).toISOString().split("T")[0];
      const err: any = new Error(
        `ACADEMIC_PERIOD_NOT_STARTED: No se pueden registrar o modificar calificaciones en un periodo que aún no ha iniciado (Fecha de inicio: ${startFormatted}).`
      );
      err.statusCode = 409;
      err.code = "ACADEMIC_PERIOD_NOT_STARTED";
      throw err;
    }

    if (!Array.isArray(grades) || grades.length === 0) {
      throw new Error("Debe proporcionar al menos una calificación para registrar.");
    }

    // 1. Validar integridad de cada item del lote
    for (const item of grades) {
      const studentId = item.studentId ? Number(item.studentId) : null;
      const enrollmentId = item.enrollmentId ? Number(item.enrollmentId) : null;
      if (!studentId && !enrollmentId) {
        throw new Error("Debe proporcionar 'studentId' o 'enrollmentId' para cada calificación del lote.");
      }

      if (
        item.status === AcademicGradeStatus.GRADED ||
        (!item.status && item.score !== null && item.score !== undefined)
      ) {
        const scoreNum = Number(item.score);
        if (typeof item.score !== "number" || isNaN(scoreNum) || !isFinite(scoreNum) || scoreNum < 0) {
          throw new Error(
            `La calificación para el estudiante ${studentId || enrollmentId} debe ser un número no negativo válido (score >= 0).`
          );
        }
        const maxScoreNum = activity.maxScore.toNumber();
        if (scoreNum > maxScoreNum) {
          throw new Error(
            `La calificación ${scoreNum} no puede exceder el puntaje máximo de la actividad (${maxScoreNum}).`
          );
        }
      }
    }

    // Determinar changedByUserId para auditoría
    let auditUserId = options?.changedByUserId ? Number(options.changedByUserId) : null;
    if (!auditUserId || isNaN(auditUserId) || auditUserId <= 0) {
      auditUserId = activity.teacherUserId || null;
    }
    if (!auditUserId) {
      const fallbackMember = await db.organizationMember.findFirst({
        where: { organizationId, status: ORGANIZATION_MEMBER_STATUS.ACTIVE },
        select: { userId: true },
      });
      auditUserId = fallbackMember?.userId || 1;
    }

    // 2. Ejecutar upserts y logs de auditoría en una transacción atómica
    return await db.$transaction(async (tx) => {
      if (activity.academicPeriodId) {
        await AcademicService.lockAcademicPeriodForAcademicWrite(tx, organizationId, activity.academicPeriodId, { allowLocked: true, accessContext });
      }

      const results = [];

      for (const item of grades) {
        let studentId = item.studentId ? Number(item.studentId) : null;
        let enrollmentId = item.enrollmentId ? Number(item.enrollmentId) : null;

        if (!studentId && enrollmentId) {
          const enr = await tx.academicEnrollment.findFirst({
            where: { id: enrollmentId, organizationId },
          });
          if (!enr) {
            throw new Error(`Matrícula con ID ${enrollmentId} no encontrada en esta institución.`);
          }
          studentId = enr.studentId;
        } else if (studentId && !enrollmentId) {
          const enr = await tx.academicEnrollment.findFirst({
            where: { studentId, courseId: activity.courseId, organizationId },
          });
          if (enr) {
            enrollmentId = enr.id;
          }
        }

        if (!studentId) {
          throw new Error("No se pudo determinar el estudiante para registrar la calificación.");
        }

        // Determinar status y score normalizados
        let status: AcademicGradeStatus = item.status || AcademicGradeStatus.PENDING;
        let scoreDecimal: Prisma.Decimal | null = null;
        let gradedAt: Date | null = null;

        if (item.score !== undefined && item.score !== null) {
          status = item.status || AcademicGradeStatus.GRADED;
          scoreDecimal = new Prisma.Decimal(item.score);
          gradedAt = new Date();
        } else if (status === AcademicGradeStatus.GRADED) {
          throw new Error("Una calificación en estado 'GRADED' requiere un puntaje numérico no nulo.");
        } else {
          scoreDecimal = null;
          gradedAt = null;
        }

        const comments = item.comments !== undefined ? item.comments?.trim() || null : undefined;

        // Buscar registro previo
        const existingGrade = await tx.academicGrade.findUnique({
          where: {
            activityId_studentId: {
              activityId,
              studentId,
            },
          },
        });

        const prevScore = existingGrade?.score ?? null;
        const prevStatus = existingGrade?.status ?? null;

        const gradeRecord = await tx.academicGrade.upsert({
          where: {
            activityId_studentId: {
              activityId,
              studentId,
            },
          },
          create: {
            organizationId,
            activityId,
            studentId,
            enrollmentId,
            score: scoreDecimal,
            status,
            comments: comments || null,
            gradedAt,
          },
          update: {
            enrollmentId: enrollmentId || existingGrade?.enrollmentId || null,
            score: scoreDecimal,
            status,
            comments,
            gradedAt:
              status === AcademicGradeStatus.GRADED
                ? gradedAt || new Date()
                : status === AcademicGradeStatus.PENDING
                ? null
                : existingGrade?.gradedAt,
          },
          include: {
            student: true,
            activity: {
              include: {
                course: true,
                subject: true,
              },
            },
          },
        });

        // Auditoría atómica obligatoria si hubo cambios
        const hasScoreChanged =
          (prevScore === null && scoreDecimal !== null) ||
          (prevScore !== null && scoreDecimal === null) ||
          (prevScore !== null && scoreDecimal !== null && !prevScore.equals(scoreDecimal));
        const hasStatusChanged = prevStatus !== status;

        if (hasScoreChanged || hasStatusChanged || !existingGrade) {
          await tx.academicGradeAuditLog.create({
            data: {
              organizationId,
              gradeId: gradeRecord.id,
              previousScore: prevScore,
              newScore: scoreDecimal,
              previousStatus: prevStatus,
              newStatus: status,
              changedByUserId: auditUserId,
              reason:
                item.reason ||
                options?.reason ||
                (existingGrade ? "Actualización de calificación" : "Registro inicial de calificación"),
            },
          });
        }

        results.push(gradeRecord);
      }

      return results;
    });
  }

  /**
   * Obtiene las calificaciones de una actividad específica.
   */
  static async getGradesByActivity(
    organizationId: number,
    activityId: number,
    accessContext?: AcademicAccessContext
  ) {
    const activity = await db.academicActivity.findFirst({
      where: { id: activityId, organizationId },
      include: {
        subject: { select: { teacherUserId: true } },
      },
    });
    if (!activity) {
      throw new Error("Actividad no encontrada en esta institución.");
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      const isAuthorized =
        activity.teacherUserId === accessContext.userId ||
        activity.subject?.teacherUserId === accessContext.userId;
      if (!isAuthorized) {
        const err: any = new Error("No tienes permisos para consultar calificaciones de esta actividad.");
        err.statusCode = 403;
        throw err;
      }
    }

    return await db.academicGrade.findMany({
      where: { activityId, organizationId },
      include: {
        student: true,
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: [
        { student: { lastName: "asc" } },
        { student: { firstName: "asc" } },
      ],
    });
  }

  /**
   * Obtiene el historial general de calificaciones con filtros.
   */
  static async getGradesHistory(
    organizationId: number,
    filter?: {
      courseId?: number;
      subjectId?: number;
      activityId?: number;
      studentId?: number;
    },
    accessContext?: AcademicAccessContext
  ) {
    const where: any = { organizationId };

    if (filter?.activityId) {
      where.activityId = Number(filter.activityId);
    }
    if (filter?.studentId) {
      where.studentId = Number(filter.studentId);
    }
    if (filter?.courseId) {
      where.activity = { ...(where.activity || {}), courseId: Number(filter.courseId) };
    }
    if (filter?.subjectId) {
      where.activity = { ...(where.activity || {}), subjectId: Number(filter.subjectId) };
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      where.activity = {
        ...(where.activity || {}),
        OR: [
          { teacherUserId: accessContext.userId },
          { subject: { teacherUserId: accessContext.userId } },
        ],
      };
    }

    return await db.academicGrade.findMany({
      where,
      include: {
        student: true,
        activity: {
          include: {
            course: true,
            subject: true,
          },
        },
      },
      orderBy: [{ gradedAt: "desc" }, { createdAt: "desc" }],
    });
  }

  /**
   * Obtiene el expediente de calificaciones de un estudiante.
   */
  static async getStudentGrades(
    organizationId: number,
    studentId: number,
    accessContext?: AcademicAccessContext
  ) {
    const student = await db.academicStudent.findFirst({
      where: { id: studentId, organizationId },
      include: {
        enrollments: {
          where: { status: ACADEMIC_ENROLLMENT_STATUS.ACTIVE },
          include: {
            course: {
              include: {
                subjects: {
                  where: { status: ACADEMIC_SUBJECT_STATUS.ACTIVE },
                  select: { teacherUserId: true },
                },
              },
            },
          },
        },
      },
    });
    if (!student) {
      throw new Error("Estudiante no encontrado en esta institución.");
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      const isAuthorized = student.enrollments.some(
        (e) =>
          e.course.tutorUserId === accessContext.userId ||
          e.course.subjects.some((s) => s.teacherUserId === accessContext.userId)
      );
      if (!isAuthorized) {
        const err: any = new Error("No tienes permisos para consultar el expediente de calificaciones de este estudiante.");
        err.statusCode = 403;
        throw err;
      }
    }

    return await db.academicGrade.findMany({
      where: { studentId, organizationId },
      include: {
        student: true,
        activity: {
          include: {
            course: true,
            subject: true,
          },
        },
      },
      orderBy: [{ gradedAt: "desc" }],
    });
  }

  /**
   * Actualiza individualmente una calificación registrada con auditoría atómica.
   */
  static async updateGradeRecord(
    organizationId: number,
    gradeId: number,
    input: {
      score?: number | null;
      status?: AcademicGradeStatus;
      comments?: string | null;
      reason?: string | null;
      changedByUserId?: number | null;
    },
    accessContext?: AcademicAccessContext
  ) {
    const grade = await db.academicGrade.findFirst({
      where: { id: gradeId, organizationId },
      include: {
        activity: {
          include: {
            academicPeriod: true,
            subject: { select: { teacherUserId: true } },
          },
        },
      },
    });
    if (!grade) {
      throw new Error("Calificación no encontrada en esta institución.");
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      const isAuthorized =
        grade.activity.teacherUserId === accessContext.userId ||
        grade.activity.subject?.teacherUserId === accessContext.userId;
      if (!isAuthorized) {
        const err: any = new Error("No tienes permisos para modificar esta calificación.");
        err.statusCode = 403;
        throw err;
      }
    }

    if (
      grade.activity.academicPeriod &&
      (grade.activity.academicPeriod.status === AcademicPeriodStatus.CLOSED ||
        grade.activity.academicPeriod.status === AcademicPeriodStatus.ARCHIVED)
    ) {
      const err: any = new Error("No se puede modificar una calificación de un periodo académico cerrado o archivado.");
      err.statusCode = 400;
      err.code = "ACADEMIC_PERIOD_IMMUTABLE";
      throw err;
    }

    if (
      accessContext &&
      !accessContext.isAcademicAdmin &&
      grade.activity.academicPeriod &&
      isAcademicPeriodFuture(grade.activity.academicPeriod.startDate)
    ) {
      const startFormatted = new Date(grade.activity.academicPeriod.startDate).toISOString().split("T")[0];
      const err: any = new Error(
        `ACADEMIC_PERIOD_NOT_STARTED: No se puede modificar una calificación en un periodo que aún no ha iniciado (Fecha de inicio: ${startFormatted}).`
      );
      err.statusCode = 409;
      err.code = "ACADEMIC_PERIOD_NOT_STARTED";
      throw err;
    }

    let auditUserId = input.changedByUserId ? Number(input.changedByUserId) : null;
    if (!auditUserId || isNaN(auditUserId) || auditUserId <= 0) {
      auditUserId = grade.activity.teacherUserId || null;
    }
    if (!auditUserId) {
      const fallbackMember = await db.organizationMember.findFirst({
        where: { organizationId, status: ORGANIZATION_MEMBER_STATUS.ACTIVE },
        select: { userId: true },
      });
      auditUserId = fallbackMember?.userId || 1;
    }

    return await db.$transaction(async (tx) => {
      if (grade.activity.academicPeriodId) {
        await AcademicService.lockAcademicPeriodForAcademicWrite(tx, organizationId, grade.activity.academicPeriodId, { allowLocked: true, accessContext });
      }

      const data: any = {};
      let targetStatus: AcademicGradeStatus = input.status || grade.status;
      let targetScore: Prisma.Decimal | null = grade.score;

      if (input.score !== undefined) {
        if (input.score === null) {
          targetScore = null;
          if (!input.status) {
            targetStatus = AcademicGradeStatus.PENDING;
          }
        } else {
          const newScore = Number(input.score);
          if (typeof input.score !== "number" || isNaN(newScore) || !isFinite(newScore) || newScore < 0) {
            throw new Error("La calificación debe ser un número no negativo válido (score >= 0).");
          }
          const maxScoreNum = grade.activity.maxScore.toNumber();
          if (newScore > maxScoreNum) {
            throw new Error(
              `La calificación ${newScore} no puede superar el puntaje máximo de la actividad (${maxScoreNum}).`
            );
          }
          targetScore = new Prisma.Decimal(newScore);
          if (!input.status) {
            targetStatus = AcademicGradeStatus.GRADED;
          }
        }
      }

      if (input.status !== undefined) {
        targetStatus = input.status;
        if (
          targetStatus === AcademicGradeStatus.PENDING ||
          targetStatus === AcademicGradeStatus.ABSENT ||
          targetStatus === AcademicGradeStatus.EXCUSED
        ) {
          if (input.score === undefined) {
            targetScore = null;
          }
        } else if (targetStatus === AcademicGradeStatus.GRADED && targetScore === null) {
          throw new Error("Una calificación en estado 'GRADED' requiere un puntaje numérico no nulo.");
        }
      }

      data.status = targetStatus;
      data.score = targetScore;
      data.gradedAt =
        targetStatus === AcademicGradeStatus.GRADED
          ? new Date()
          : targetStatus === AcademicGradeStatus.PENDING
          ? null
          : grade.gradedAt;

      if (input.comments !== undefined) {
        data.comments = input.comments?.trim() || null;
      }

      const updated = await tx.academicGrade.update({
        where: { id: gradeId },
        data,
        include: {
          student: true,
          activity: {
            include: {
              course: true,
              subject: true,
            },
          },
        },
      });

      const prevScore = grade.score;
      const prevStatus = grade.status;
      const hasScoreChanged =
        (prevScore === null && targetScore !== null) ||
        (prevScore !== null && targetScore === null) ||
        (prevScore !== null && targetScore !== null && !prevScore.equals(targetScore));
      const hasStatusChanged = prevStatus !== targetStatus;

      if (hasScoreChanged || hasStatusChanged) {
        await tx.academicGradeAuditLog.create({
          data: {
            organizationId,
            gradeId: grade.id,
            previousScore: prevScore,
            newScore: targetScore,
            previousStatus: prevStatus,
            newStatus: targetStatus,
            changedByUserId: auditUserId,
            reason: input.reason || "Actualización individual de calificación",
          },
        });
      }

      return updated;
    });
  }

  // ============================================================================
  // DASHBOARD ACADÉMICO REAL Y READ MODELS (FASE 4)
  // ============================================================================

  /**
   * Obtiene el modelo de lectura consolidado del Dashboard Docente para la organización autenticada.
   * Totalmente read-only (GET writes = 0), sin tablas dedicadas y con aislamiento multi-tenant estricto.
   */
  static async getDashboard(
    organizationId: number,
    accessContextOrUserId?: AcademicAccessContext | number
  ) {
    let accessContext: AcademicAccessContext | undefined;
    if (typeof accessContextOrUserId === "number") {
      accessContext = { userId: accessContextOrUserId, isAcademicAdmin: false };
    } else if (accessContextOrUserId && typeof accessContextOrUserId === "object") {
      accessContext = accessContextOrUserId;
    }

    const isTeacher = Boolean(accessContext && !accessContext.isAcademicAdmin && accessContext.userId);
    const teacherId = isTeacher ? accessContext!.userId : undefined;

    // 1. Cursos activos y totales
    const courseWhere: any = { organizationId };
    if (teacherId) {
      courseWhere.OR = [
        { tutorUserId: teacherId },
        { subjects: { some: { teacherUserId: teacherId, status: ACADEMIC_SUBJECT_STATUS.ACTIVE } } },
      ];
    }

    const totalCoursesCount = await db.academicCourse.count({
      where: courseWhere,
    });

    const activeCoursesCount = await db.academicCourse.count({
      where: {
        ...courseWhere,
        status: ACADEMIC_COURSE_STATUS.ACTIVE,
      },
    });

    // 2. Estudiantes activos sin double-counting (COUNT DISTINCT studentId con matrícula ACTIVE y student ACTIVE)
    const enrollmentWhere: any = {
      organizationId,
      status: ACADEMIC_ENROLLMENT_STATUS.ACTIVE,
      student: {
        status: ACADEMIC_STUDENT_STATUS.ACTIVE,
      },
    };
    if (teacherId) {
      enrollmentWhere.course = {
        OR: [
          { tutorUserId: teacherId },
          { subjects: { some: { teacherUserId: teacherId, status: ACADEMIC_SUBJECT_STATUS.ACTIVE } } },
        ],
      };
    }

    const activeEnrollments = await db.academicEnrollment.findMany({
      where: enrollmentWhere,
      select: { studentId: true },
      distinct: ["studentId"],
    });
    const activeStudentsCount = activeEnrollments.length;

    const totalStudentsCount = teacherId
      ? activeStudentsCount
      : await db.academicStudent.count({
          where: { organizationId },
        });

    // 3. Sesiones de clase de hoy (rango de 24h en Ecuador y proyección de horarios semanales)
    const now = new Date();
    const todayDateStr = getEcuadorDateString(now);
    const dayOfWeek = getEcuadorDayOfWeek(now);

    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const baseDate = new Date(now);
    const windowStart = new Date(baseDate.getTime() - 24 * 3600 * 1000);
    const windowEnd = new Date(baseDate.getTime() + 24 * 3600 * 1000);

    const sessionWhere: any = {
      organizationId,
      sessionDate: {
        gte: windowStart,
        lte: windowEnd,
      },
    };
    if (teacherId) {
      sessionWhere.OR = [
        { teacherUserId: teacherId },
        { subject: { teacherUserId: teacherId } },
      ];
    }

    const candidateSessions = await db.academicClassSession.findMany({
      where: sessionWhere,
      include: {
        course: {
          select: { id: true, name: true, level: true, classroom: true },
        },
        subject: {
          select: { id: true, name: true, code: true },
        },
        teacherUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ sessionDate: "asc" }, { startTime: "asc" }],
    });

    const physicalTodaySessions = candidateSessions.filter(
      (s) => getEcuadorDateString(s.sessionDate) === todayDateStr
    );

    // Consultar franjas horarias de la malla semanal activa correspondientes al día de hoy (1=Lunes ... 7=Domingo)
    const slotWhere: any = {
      organizationId,
      dayOfWeek,
      status: "ACTIVE",
      effectiveFrom: { lte: now },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: now } },
      ],
      subject: { status: ACADEMIC_SUBJECT_STATUS.ACTIVE },
      course: { status: ACADEMIC_COURSE_STATUS.ACTIVE },
    };
    if (teacherId) {
      slotWhere.OR = [
        { teacherUserId: teacherId },
        { subject: { teacherUserId: teacherId } },
      ];
    }

    let todaySlots: any[] = [];
    try {
      todaySlots = await db.academicSubjectScheduleSlot.findMany({
        where: slotWhere,
        include: {
          course: {
            select: { id: true, name: true, level: true, classroom: true },
          },
          subject: {
            select: { id: true, name: true, code: true },
          },
          teacherUser: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { startTime: "asc" },
      });
    } catch {
      todaySlots = [];
    }

    // Cruzar sesiones físicas y franjas horarias recurrentes para evitar duplicidad
    const physicalByCourseSubject = new Map<string, any>();
    for (const session of physicalTodaySessions) {
      const key = `${session.courseId}-${session.subjectId || 0}`;
      if (!physicalByCourseSubject.has(key)) {
        physicalByCourseSubject.set(key, session);
      }
    }

    const mergedSessions: any[] = [];
    const seenSessionIds = new Set<number>();

    for (const slot of todaySlots) {
      const key = `${slot.courseId}-${slot.subjectId}`;
      const existingSession = physicalByCourseSubject.get(key);
      if (existingSession) {
        if (!seenSessionIds.has(existingSession.id)) {
          mergedSessions.push(existingSession);
          seenSessionIds.add(existingSession.id);
        }
      } else {
        // Proyectar sesión de clase basada en el horario recurrente activo
        mergedSessions.push({
          id: `slot-${slot.id}`,
          organizationId,
          courseId: slot.courseId,
          subjectId: slot.subjectId,
          teacherUserId: slot.teacherUserId,
          sessionDate: now,
          startTime: slot.startTime,
          endTime: slot.endTime,
          room: slot.room || slot.course?.classroom || "Aula general",
          status: "SCHEDULED",
          topic: "",
          course: slot.course,
          subject: slot.subject,
          teacherUser: slot.teacherUser,
          isVirtual: true,
        });
      }
    }

    for (const session of physicalTodaySessions) {
      if (!seenSessionIds.has(session.id)) {
        mergedSessions.push(session);
        seenSessionIds.add(session.id);
      }
    }

    mergedSessions.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
    const todaySessions = mergedSessions;

    // 4. Actividades y evaluaciones próximas (dueDate >= startOfDay o dueDate null)
    const activityWhere: any = {
      organizationId,
      OR: [
        { dueDate: { gte: startOfDay } },
        { dueDate: null },
      ],
    };
    if (teacherId) {
      activityWhere.AND = [
        {
          OR: [
            { teacherUserId: teacherId },
            { subject: { teacherUserId: teacherId } },
          ],
        },
      ];
    }

    const upcomingActivities = await db.academicActivity.findMany({
      where: activityWhere,
      include: {
        course: {
          select: { id: true, name: true, level: true },
        },
        subject: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { grades: true },
        },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 5,
    });

    // 5. Calificaciones recientes
    const gradeWhere: any = { organizationId };
    if (teacherId) {
      gradeWhere.activity = {
        OR: [
          { teacherUserId: teacherId },
          { subject: { teacherUserId: teacherId } },
        ],
      };
    }

    const recentGrades = await db.academicGrade.findMany({
      where: gradeWhere,
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, identification: true },
        },
        activity: {
          include: {
            course: {
              select: { id: true, name: true },
            },
            subject: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: [{ gradedAt: "desc" }, { createdAt: "desc" }],
      take: 5,
    });

    // 6. Resumen de Asistencia
    const attWhere: any = { organizationId };
    if (teacherId) {
      attWhere.session = {
        OR: [
          { teacherUserId: teacherId },
          { subject: { teacherUserId: teacherId } },
        ],
      };
    }

    const totalAttendanceRecords = await db.academicAttendanceRecord.count({
      where: attWhere,
    });

    const presentCount = await db.academicAttendanceRecord.count({
      where: { ...attWhere, status: ACADEMIC_ATTENDANCE_STATUS.PRESENT },
    });

    const absentCount = await db.academicAttendanceRecord.count({
      where: { ...attWhere, status: ACADEMIC_ATTENDANCE_STATUS.ABSENT },
    });

    const lateCount = await db.academicAttendanceRecord.count({
      where: { ...attWhere, status: ACADEMIC_ATTENDANCE_STATUS.LATE },
    });

    const excusedCount = await db.academicAttendanceRecord.count({
      where: { ...attWhere, status: ACADEMIC_ATTENDANCE_STATUS.EXCUSED },
    });

    // Fórmula formal unificada de porcentaje de asistencia: ((presentCount + lateCount) / totalAttendanceRecords) * 100
    const effectiveAttendance = presentCount + lateCount;
    const attendanceRate = totalAttendanceRecords > 0
      ? Math.round((effectiveAttendance / totalAttendanceRecords) * 1000) / 10
      : null;

    // 7. Resumen de Rendimiento Académico Descriptivo
    const totalGradesCount = await db.academicGrade.count({
      where: { ...gradeWhere, score: { not: null } },
    });

    let averageScore: number | null = null;
    let normalizedPerformance: number | null = null;

    if (totalGradesCount > 0) {
      const gradesAgg = await db.academicGrade.aggregate({
        where: { ...gradeWhere, score: { not: null } },
        _avg: { score: true },
      });
      averageScore = gradesAgg._avg.score !== null ? Math.round(Number(gradesAgg._avg.score) * 10) / 10 : null;

      // Rendimiento normalizado descriptivo: SUM(score) / SUM(maxScore) * 100
      const allGrades = await db.academicGrade.findMany({
        where: { ...gradeWhere, score: { not: null } },
        select: {
          score: true,
          activity: { select: { maxScore: true } },
        },
      });
      const sumScore = allGrades.reduce((acc, g) => acc + (g.score !== null ? g.score.toNumber() : 0), 0);
      const sumMaxScore = allGrades.reduce((acc, g) => acc + (g.activity?.maxScore ? g.activity.maxScore.toNumber() : 10), 0);
      if (sumMaxScore > 0) {
        normalizedPerformance = Math.round((sumScore / sumMaxScore) * 1000) / 10;
      }
    }

    // 8. Alertas Académicas Factuales (Derivadas de hechos reales en PostgreSQL)
    const academicAlerts: any[] = [];

    // Hecho 1: Estudiantes con inasistencias registradas
    const absentGroups = await db.academicAttendanceRecord.groupBy({
      by: ["studentId"],
      where: {
        ...attWhere,
        status: ACADEMIC_ATTENDANCE_STATUS.ABSENT,
      },
      _count: { id: true },
      having: {
        id: {
          _count: { gte: 1 },
        },
      },
    });

    for (const group of absentGroups.slice(0, 5)) {
      const student = await db.academicStudent.findFirst({
        where: { id: group.studentId, organizationId },
        include: {
          enrollments: {
            where: { status: ACADEMIC_ENROLLMENT_STATUS.ACTIVE },
            include: { course: true },
            take: 1,
          },
        },
      });
      if (student) {
        const absences = group._count.id;
        const courseName = student.enrollments[0]?.course?.name || "Sin curso asignado";
        academicAlerts.push({
          id: `absent-student-${student.id}`,
          studentId: String(student.id),
          studentName: `${student.firstName} ${student.lastName}`,
          courseName,
          type: "low_attendance",
          severity: absences >= 3 ? "critical" : "high",
          description: `Acumula ${absences} inasistencia(s) registrada(s).`,
          date: new Date().toISOString().split("T")[0],
        });
      }
    }

    // Hecho 2: Calificaciones bajas recientes (score < 7.0)
    const lowGrades = await db.academicGrade.findMany({
      where: {
        ...gradeWhere,
        score: { lt: 7.0, not: null },
      },
      include: {
        student: true,
        activity: { include: { course: true, subject: true } },
      },
      orderBy: [{ gradedAt: "desc" }, { createdAt: "desc" }],
      take: 5,
    });

    for (const lg of lowGrades) {
      const scoreVal = lg.score !== null ? lg.score.toNumber() : 0;
      if (!academicAlerts.some((a) => a.id === `grade-student-${lg.studentId}-${lg.activityId}`)) {
        academicAlerts.push({
          id: `grade-student-${lg.studentId}-${lg.activityId}`,
          studentId: String(lg.studentId),
          studentName: `${lg.student.firstName} ${lg.student.lastName}`,
          courseName: lg.activity.course.name,
          type: "low_grade",
          severity: scoreVal < 5.0 ? "critical" : "high",
          description: `Calificación de ${scoreVal}/${lg.activity.maxScore.toNumber()} en '${lg.activity.name}' (${lg.activity.subject.name}). Requiere seguimiento.`,
          date: lg.gradedAt ? lg.gradedAt.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        });
      }
    }

    // Hecho 3: Actividades próximas sin calificaciones registradas
    for (const act of upcomingActivities.slice(0, 3)) {
      if (act._count.grades === 0) {
        academicAlerts.push({
          id: `pending-activity-${act.id}`,
          courseName: act.course.name,
          type: "pending_evaluation",
          severity: "medium",
          description: `Actividad '${act.name}' programada sin calificaciones registradas aún.`,
          date: act.dueDate ? act.dueDate.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        });
      }
    }

    // Obtener nombre del docente
    let teacherName = "Docente";
    const targetUserId = accessContext?.userId;
    if (targetUserId) {
      const teacherUser = await db.user.findFirst({
        where: { id: targetUserId },
        select: { name: true },
      });
      if (teacherUser?.name) {
        teacherName = teacherUser.name;
      }
    }

    return {
      teacherName,
      activeCoursesCount,
      totalCoursesCount,
      activeStudentsCount,
      totalStudentsCount,
      todaySessionsCount: todaySessions.length,
      todaySessions,
      upcomingActivities,
      recentGrades,
      attendanceSummary: {
        totalRecords: totalAttendanceRecords,
        presentCount,
        absentCount,
        lateCount,
        excusedCount,
        attendanceRate,
      },
      performanceSummary: {
        totalGradesCount,
        averageScore,
        normalizedPerformance,
      },
      academicAlerts,
    };
  }

  // ============================================================================
  // REPORTES ACADÉMICOS Y READ MODELS FACTUALES (FASE 5)
  // ============================================================================

  /**
   * Reporte 1: Nómina General de Estudiantes (Student Roster)
   * Lista oficial de estudiantes por curso o institucional con ordenamiento determinista y sin duplicados.
   */
  static async getStudentRosterReport(
    organizationId: number,
    filter?: { courseId?: number; status?: string },
    accessContext?: AcademicAccessContext
  ) {
    let courseInfo: any = null;

    if (filter?.courseId) {
      const course = await db.academicCourse.findFirst({
        where: { id: filter.courseId, organizationId },
        include: {
          subjects: {
            where: { status: ACADEMIC_SUBJECT_STATUS.ACTIVE },
            select: { teacherUserId: true },
          },
        },
      });
      if (!course) {
        throw new Error("Curso no encontrado.");
      }

      if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
        const isAuthorized =
          course.tutorUserId === accessContext.userId ||
          course.subjects.some((s) => s.teacherUserId === accessContext.userId);
        if (!isAuthorized) {
          const err: any = new Error("No tienes permisos para consultar la nómina de este curso.");
          err.statusCode = 403;
          throw err;
        }
      }

      courseInfo = {
        id: course.id,
        name: course.name,
        level: course.level,
        classroom: course.classroom,
        status: course.status,
        tutorUserId: course.tutorUserId,
      };
    }

    // Consultar matrículas y estudiantes
    const enrollmentWhere: any = { organizationId };
    if (filter?.courseId) {
      enrollmentWhere.courseId = filter.courseId;
    }
    if (filter?.status) {
      enrollmentWhere.status = filter.status;
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId && !filter?.courseId) {
      enrollmentWhere.course = {
        OR: [
          { tutorUserId: accessContext.userId },
          { subjects: { some: { teacherUserId: accessContext.userId, status: ACADEMIC_SUBJECT_STATUS.ACTIVE } } },
        ],
      };
    }

    const enrollments = await db.academicEnrollment.findMany({
      where: enrollmentWhere,
      include: {
        student: true,
        course: true,
      },
      orderBy: [
        { student: { lastName: "asc" } },
        { student: { firstName: "asc" } },
      ],
    });

    // Mapear estudiantes evitando duplicidad si no se filtra por curso específico
    const seenStudentCourseKeys = new Set<string>();
    const studentsList: any[] = [];

    for (const enr of enrollments) {
      const key = `${enr.studentId}-${enr.courseId}`;
      if (!seenStudentCourseKeys.has(key)) {
        seenStudentCourseKeys.add(key);

        const isTutorOrAdmin = Boolean(
          accessContext?.isAcademicAdmin ||
          (accessContext?.userId && enr.course.tutorUserId === accessContext.userId)
        );

        studentsList.push({
          id: enr.id,
          studentId: enr.student.id,
          firstName: enr.student.firstName,
          lastName: enr.student.lastName,
          fullName: `${enr.student.firstName} ${enr.student.lastName}`,
          identification: enr.student.identification,
          email: isTutorOrAdmin ? enr.student.email : null,
          phone: isTutorOrAdmin ? enr.student.phone : null,
          status: enr.student.status,
          enrollmentStatus: enr.status,
          enrolledAt: enr.enrollmentDate,
          courseId: enr.course.id,
          courseName: enr.course.name,
          courseLevel: enr.course.level,
        });
      }
    }

    // Contar estudiantes únicos activos
    const uniqueStudentIds = new Set(studentsList.map((s) => s.studentId));
    const activeStudentsCount = studentsList.filter(
      (s) => s.enrollmentStatus === ACADEMIC_ENROLLMENT_STATUS.ACTIVE && s.status === ACADEMIC_STUDENT_STATUS.ACTIVE
    ).length;

    return {
      course: courseInfo,
      totalStudents: studentsList.length,
      uniqueStudentsCount: uniqueStudentIds.size,
      activeStudentsCount,
      students: studentsList,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Reporte 2: Consolidado de Asistencia (Attendance Summary Report)
   * Filtros por curso, materia, rango de fechas y métricas precisas.
   */
  static async getAttendanceReport(
    organizationId: number,
    filter?: {
      courseId?: number;
      subjectId?: number;
      studentId?: number;
      from?: string;
      to?: string;
    },
    accessContext?: AcademicAccessContext
  ) {
    // Validación de rango de fechas
    if (filter?.from && filter?.to) {
      const fromDate = new Date(filter.from);
      const toDate = new Date(filter.to);
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        throw new Error("Formato de fecha inválido.");
      }
      if (fromDate > toDate) {
        throw new Error("Rango de fechas inválido: 'from' no puede ser posterior a 'to'.");
      }
    }

    let courseInfo: any = null;
    let isCourseTutor = false;
    if (filter?.courseId) {
      const course = await db.academicCourse.findFirst({
        where: { id: filter.courseId, organizationId },
        include: {
          subjects: {
            where: { status: ACADEMIC_SUBJECT_STATUS.ACTIVE },
            select: { id: true, teacherUserId: true },
          },
        },
      });
      if (!course) {
        throw new Error("Curso no encontrado.");
      }

      if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
        isCourseTutor = course.tutorUserId === accessContext.userId;
        const teachesInCourse = course.subjects.some((s) => s.teacherUserId === accessContext.userId);
        if (!isCourseTutor && !teachesInCourse) {
          const err: any = new Error("No tienes permisos para consultar el reporte de asistencia de este curso.");
          err.statusCode = 403;
          throw err;
        }
      }

      courseInfo = {
        id: course.id,
        name: course.name,
        level: course.level,
        tutorUserId: course.tutorUserId,
      };
    }

    let subjectInfo: any = null;
    if (filter?.subjectId) {
      const subject = await db.academicSubject.findFirst({
        where: { id: filter.subjectId, organizationId },
      });
      if (!subject) {
        throw new Error("Materia no encontrada.");
      }

      if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
        if (!isCourseTutor && subject.teacherUserId !== accessContext.userId) {
          const err: any = new Error("No tienes permisos para consultar el reporte de asistencia de esta materia.");
          err.statusCode = 403;
          throw err;
        }
      }

      subjectInfo = { id: subject.id, name: subject.name, code: subject.code };
    }

    let isStudentTutor = false;
    if (filter?.studentId) {
      const student = await db.academicStudent.findFirst({
        where: { id: filter.studentId, organizationId },
        include: {
          enrollments: {
            where: { status: ACADEMIC_ENROLLMENT_STATUS.ACTIVE },
            include: {
              course: {
                include: {
                  subjects: {
                    where: { status: ACADEMIC_SUBJECT_STATUS.ACTIVE },
                    select: { teacherUserId: true },
                  },
                },
              },
            },
          },
        },
      });
      if (!student) {
        throw new Error("Estudiante no encontrado.");
      }

      if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
        isStudentTutor = student.enrollments.some((e) => e.course.tutorUserId === accessContext.userId);
        const teachesStudent = student.enrollments.some((e) =>
          e.course.subjects.some((s) => s.teacherUserId === accessContext.userId)
        );
        if (!isStudentTutor && !teachesStudent) {
          const err: any = new Error("No tienes permisos para consultar el reporte de este estudiante.");
          err.statusCode = 403;
          throw err;
        }
      }
    }

    // Construcción de filtros para registros de asistencia
    const whereClause: any = { organizationId };

    if (filter?.studentId) {
      whereClause.studentId = filter.studentId;
    }

    const sessionWhere: any = { organizationId };
    if (filter?.courseId) {
      sessionWhere.courseId = filter.courseId;
    }
    if (filter?.subjectId) {
      sessionWhere.subjectId = filter.subjectId;
    }

    // Regla de seguridad estricta: si el docente NO es tutor ni admin, sólo puede ver sus materias
    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      if (filter?.courseId && !isCourseTutor && !filter?.subjectId) {
        sessionWhere.subject = { teacherUserId: accessContext.userId };
      } else if (!filter?.courseId && !filter?.subjectId) {
        sessionWhere.subject = { teacherUserId: accessContext.userId };
      } else if (filter?.studentId && !isStudentTutor && !filter?.subjectId) {
        sessionWhere.subject = { teacherUserId: accessContext.userId };
      }
    }

    if (filter?.from || filter?.to) {
      sessionWhere.sessionDate = {};
      if (filter?.from) {
        const fromStr = filter.from.includes("T") ? filter.from.split("T")[0] : filter.from;
        const fromUtc = new Date(`${fromStr}T00:00:00.000Z`);
        const fromEc = new Date(`${fromStr}T00:00:00.000-05:00`);
        sessionWhere.sessionDate.gte = new Date(Math.min(fromUtc.getTime(), fromEc.getTime()));
      }
      if (filter?.to) {
        const toStr = filter.to.includes("T") ? filter.to.split("T")[0] : filter.to;
        const toUtc = new Date(`${toStr}T23:59:59.999Z`);
        const toEc = new Date(`${toStr}T23:59:59.999-05:00`);
        sessionWhere.sessionDate.lte = new Date(Math.max(toUtc.getTime(), toEc.getTime()));
      }
    }

    whereClause.session = sessionWhere;

    const records = await db.academicAttendanceRecord.findMany({
      where: whereClause,
      include: {
        student: true,
        session: {
          include: {
            course: true,
            subject: true,
          },
        },
      },
      orderBy: [
        { session: { sessionDate: "desc" } },
        { student: { lastName: "asc" } },
        { student: { firstName: "asc" } },
      ],
    });

    // Métricas consolidadas
    const totalRecords = records.length;
    const presentCount = records.filter((r) => r.status === ACADEMIC_ATTENDANCE_STATUS.PRESENT).length;
    const absentCount = records.filter((r) => r.status === ACADEMIC_ATTENDANCE_STATUS.ABSENT).length;
    const lateCount = records.filter((r) => r.status === ACADEMIC_ATTENDANCE_STATUS.LATE).length;
    const excusedCount = records.filter((r) => r.status === ACADEMIC_ATTENDANCE_STATUS.EXCUSED).length;
    const effectiveCount = presentCount + lateCount;
    const attendanceRate = totalRecords > 0 ? Math.round((effectiveCount / totalRecords) * 1000) / 10 : null;

    // Conteo de sesiones únicas
    const uniqueSessionIds = new Set(records.map((r) => r.sessionId));

    // Resumen por estudiante
    const studentMap = new Map<number, any>();
    for (const r of records) {
      if (!studentMap.has(r.studentId)) {
        studentMap.set(r.studentId, {
          studentId: r.student.id,
          firstName: r.student.firstName,
          lastName: r.student.lastName,
          fullName: `${r.student.firstName} ${r.student.lastName}`,
          identification: r.student.identification,
          totalRecords: 0,
          presentCount: 0,
          absentCount: 0,
          lateCount: 0,
          excusedCount: 0,
          attendanceRate: null,
        });
      }
      const st = studentMap.get(r.studentId);
      st.totalRecords += 1;
      if (r.status === ACADEMIC_ATTENDANCE_STATUS.PRESENT) st.presentCount += 1;
      if (r.status === ACADEMIC_ATTENDANCE_STATUS.ABSENT) st.absentCount += 1;
      if (r.status === ACADEMIC_ATTENDANCE_STATUS.LATE) st.lateCount += 1;
      if (r.status === ACADEMIC_ATTENDANCE_STATUS.EXCUSED) st.excusedCount += 1;
    }

    const studentSummaries = Array.from(studentMap.values()).map((st) => ({
      ...st,
      attendanceRate: st.totalRecords > 0 ? Math.round(((st.presentCount + st.lateCount) / st.totalRecords) * 1000) / 10 : null,
    }));

    return {
      course: courseInfo,
      subject: subjectInfo,
      dateRange: { from: filter?.from || null, to: filter?.to || null },
      summary: {
        totalSessions: uniqueSessionIds.size,
        totalRecords,
        presentCount,
        absentCount,
        lateCount,
        excusedCount,
        attendanceRate,
      },
      studentSummaries,
      records: records.map((r) => ({
        id: r.id,
        sessionId: r.sessionId,
        studentId: r.studentId,
        studentName: `${r.student.firstName} ${r.student.lastName}`,
        identification: r.student.identification,
        sessionDate: r.session.sessionDate.toISOString().split("T")[0],
        courseName: r.session.course.name,
        subjectName: r.session.subject?.name || "Sin materia",
        status: r.status,
        observation: r.observation,
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Helper unificado de cálculo de calificaciones con esquema ponderado oficial.
   * Utilizado por calculatePeriodGradesMatrix y getGradeReport para garantizar
   * consistencia matemática y reglamentaria idéntica.
   */
  static calculateStudentWeightedEvaluation(params: {
    activities: Array<{
      id: number;
      name: string;
      type: string;
      maxScore: Prisma.Decimal | number;
      categoryId?: number | null;
      subjectId?: number;
      academicPeriodId?: number | null;
    }>;
    categories: Array<{
      id: number;
      name: string;
      weightPercentage: Prisma.Decimal | number;
    }>;
    gradeMap: Map<string, { score: number | null; status: AcademicGradeStatus }>;
    studentId: number;
    maxScale?: number;
    minPassingScore?: number;
    isPeriodClosed?: boolean;
  }) {
    const {
      activities,
      categories,
      gradeMap,
      studentId,
      maxScale = 10.0,
      minPassingScore = 7.0,
      isPeriodClosed = false,
    } = params;

    let totalEvaluatedWeight = 0;
    let totalWeightedScoreSum = 0;
    let totalActivitiesCount = 0;
    let totalGradedActivitiesCount = 0;

    const categoryBreakdown = categories.map((cat) => {
      const catWeight = typeof cat.weightPercentage === "number" ? cat.weightPercentage : Number(cat.weightPercentage);
      const catActivities = activities.filter((a) => a.categoryId === cat.id);
      let catScoreSum = 0;
      let catMaxScoreSum = 0;
      let catGradedCount = 0;

      const activityScores = catActivities.map((act) => {
        const g = gradeMap.get(`${act.id}:${studentId}`);
        const isGraded = g !== undefined && g.status === AcademicGradeStatus.GRADED && g.score !== null;
        const actMax = typeof act.maxScore === "number" ? act.maxScore : Number(act.maxScore);

        if (isGraded && g.score !== null) {
          catScoreSum += g.score;
          catMaxScoreSum += actMax;
          catGradedCount += 1;
          totalGradedActivitiesCount += 1;
        }
        totalActivitiesCount += 1;

        return {
          activityId: act.id,
          activityName: act.name,
          activityType: act.type,
          maxScore: actMax,
          score: g?.score ?? null,
          status: g?.status ?? AcademicGradeStatus.PENDING,
        };
      });

      const isEvaluated = catGradedCount > 0 && catMaxScoreSum > 0;
      const categoryAverage = isEvaluated ? Math.round(((catScoreSum / catMaxScoreSum) * maxScale) * 100) / 100 : null;
      const categoryWeightedContribution = categoryAverage !== null ? Math.round((categoryAverage * (catWeight / 100)) * 100) / 100 : 0;

      if (isEvaluated) {
        totalEvaluatedWeight += catWeight;
        totalWeightedScoreSum += categoryWeightedContribution;
      }

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        weightPercentage: catWeight,
        isEvaluated,
        activitiesCount: catActivities.length,
        gradedCount: catGradedCount,
        categoryAverage,
        weightedContribution: categoryWeightedContribution,
        activities: activityScores,
      };
    });

    const studentUncatActivities = activities.filter(
      (a) => !a.categoryId || !categories.some((c) => c.id === a.categoryId)
    );
    if (studentUncatActivities.length > 0) {
      const uncatActivityScores = studentUncatActivities.map((act) => {
        const g = gradeMap.get(`${act.id}:${studentId}`);
        const actMax = typeof act.maxScore === "number" ? act.maxScore : Number(act.maxScore);
        return {
          activityId: act.id,
          activityName: act.name,
          activityType: act.type,
          maxScore: actMax,
          score: g?.score ?? null,
          status: g?.status ?? AcademicGradeStatus.PENDING,
        };
      });
      categoryBreakdown.push({
        categoryId: 0,
        categoryName: "Sin ponderar / Sin categoría",
        weightPercentage: 0,
        isEvaluated: false,
        activitiesCount: studentUncatActivities.length,
        gradedCount: 0,
        categoryAverage: null,
        weightedContribution: 0,
        activities: uncatActivityScores,
      });
    }

    const isComplete = totalEvaluatedWeight >= 100;
    const definitiveGrade = Math.round(totalWeightedScoreSum * 100) / 100;
    const provisionalAverage =
      totalEvaluatedWeight > 0
        ? Math.round((totalWeightedScoreSum / (totalEvaluatedWeight / 100)) * 100) / 100
        : null;

    const isPassing = (provisionalAverage ?? definitiveGrade) >= minPassingScore;
    const isProvisional = !isPeriodClosed || !isComplete;

    return {
      evaluatedWeightPercentage: totalEvaluatedWeight,
      isComplete,
      isProvisional,
      isPassing,
      definitiveGrade,
      provisionalAverage,
      officialGrade: isComplete ? definitiveGrade : provisionalAverage,
      categories: categoryBreakdown,
      totalActivitiesCount,
      totalGradedActivitiesCount,
    };
  }

  /**
   * Reporte 3: Boletín / Sábana de Calificaciones (Grade Roster Matrix)
   * Matriz Estudiantes x Actividades unificada con cálculo ponderado oficial idéntico a calculatePeriodGradesMatrix.
   */
  static async getGradeReport(
    organizationId: number,
    filter?: { courseId?: number; subjectId?: number },
    accessContext?: AcademicAccessContext
  ) {
    let courseInfo: any = null;
    let isCourseTutor = false;

    if (filter?.courseId) {
      const course = await db.academicCourse.findFirst({
        where: { id: filter.courseId, organizationId },
        include: {
          subjects: {
            where: { status: ACADEMIC_SUBJECT_STATUS.ACTIVE },
            select: { id: true, teacherUserId: true },
          },
        },
      });
      if (!course) {
        throw new Error("Curso no encontrado.");
      }

      if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
        isCourseTutor = course.tutorUserId === accessContext.userId;
        const teachesInCourse = course.subjects.some((s) => s.teacherUserId === accessContext.userId);
        if (!isCourseTutor && !teachesInCourse) {
          const err: any = new Error("No tienes permisos para consultar las calificaciones de este curso.");
          err.statusCode = 403;
          throw err;
        }
      }

      courseInfo = {
        id: course.id,
        name: course.name,
        level: course.level,
        tutorUserId: course.tutorUserId,
      };
    }

    let subjectInfo: any = null;
    if (filter?.subjectId) {
      const subject = await db.academicSubject.findFirst({
        where: { id: filter.subjectId, organizationId },
      });
      if (!subject) {
        throw new Error("Materia no encontrada.");
      }

      if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
        if (!isCourseTutor && subject.teacherUserId !== accessContext.userId) {
          const err: any = new Error("No tienes permisos para consultar las calificaciones de esta materia.");
          err.statusCode = 403;
          throw err;
        }
      }

      subjectInfo = { id: subject.id, name: subject.name, code: subject.code };
    }

    // 1. Actividades del curso/materia
    const activityWhere: any = { organizationId };
    if (filter?.courseId) {
      activityWhere.courseId = filter.courseId;
    }
    if (filter?.subjectId) {
      activityWhere.subjectId = filter.subjectId;
    }

    // Regla de seguridad estricta: docente ordinario sólo puede consultar sus asignaturas
    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      if (filter?.courseId && !isCourseTutor && !filter?.subjectId) {
        activityWhere.subject = { teacherUserId: accessContext.userId };
      } else if (!filter?.courseId && !filter?.subjectId) {
        activityWhere.OR = [
          { teacherUserId: accessContext.userId },
          { subject: { teacherUserId: accessContext.userId } },
        ];
      }
    }

    const activities = await db.academicActivity.findMany({
      where: activityWhere,
      include: {
        course: true,
        subject: true,
        academicPeriod: true,
        category: true,
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    });

    // 2. Estudiantes matriculados
    const enrollmentWhere: any = {
      organizationId,
      status: ACADEMIC_ENROLLMENT_STATUS.ACTIVE,
    };
    if (filter?.courseId) {
      enrollmentWhere.courseId = filter.courseId;
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId && !filter?.courseId) {
      enrollmentWhere.course = {
        OR: [
          { tutorUserId: accessContext.userId },
          { subjects: { some: { teacherUserId: accessContext.userId, status: ACADEMIC_SUBJECT_STATUS.ACTIVE } } },
        ],
      };
    }

    const enrollments = await db.academicEnrollment.findMany({
      where: enrollmentWhere,
      include: {
        student: true,
        course: true,
      },
      orderBy: [
        { student: { lastName: "asc" } },
        { student: { firstName: "asc" } },
      ],
    });

    // Desduplicar estudiantes en caso de no filtrar por curso
    const studentsMap = new Map<number, any>();
    for (const enr of enrollments) {
      if (!studentsMap.has(enr.student.id)) {
        studentsMap.set(enr.student.id, enr.student);
      }
    }
    const students = Array.from(studentsMap.values());

    // 3. Calificaciones existentes
    const activityIds = activities.map((a) => a.id);
    const studentIds = students.map((s) => s.id);

    const grades = await db.academicGrade.findMany({
      where: {
        organizationId,
        activityId: { in: activityIds.length > 0 ? activityIds : [-1] },
        studentId: { in: studentIds.length > 0 ? studentIds : [-1] },
      },
    });

    // Indexar calificaciones por activityId:studentId
    const gradeIndex = new Map<string, any>();
    const gradeMap = new Map<string, { score: number | null; status: AcademicGradeStatus }>();
    for (const g of grades) {
      gradeIndex.set(`${g.activityId}:${g.studentId}`, g);
      gradeMap.set(`${g.activityId}:${g.studentId}`, {
        score: g.score !== null ? g.score.toNumber() : null,
        status: g.status,
      });
    }

    // 4. Buscar esquemas de evaluación válidos para las actividades presentes
    const courseIds = Array.from(new Set(activities.map((a) => a.courseId).filter(Boolean)));
    const subjectIds = Array.from(new Set(activities.map((a) => a.subjectId).filter(Boolean)));
    const periodIds = Array.from(new Set(activities.map((a) => a.academicPeriodId).filter(Boolean))) as number[];

    const schemes = await db.academicEvaluationScheme.findMany({
      where: {
        organizationId,
        courseId: { in: courseIds.length > 0 ? courseIds : [-1] },
        subjectId: { in: subjectIds.length > 0 ? subjectIds : [-1] },
        academicPeriodId: { in: periodIds.length > 0 ? periodIds : [-1] },
        status: AcademicEvaluationSchemeStatus.VALID,
      },
      include: {
        categories: { orderBy: { order: "asc" } },
      },
    });

    const schemeMap = new Map<string, any>();
    for (const sc of schemes) {
      schemeMap.set(`${sc.courseId}:${sc.subjectId}:${sc.academicPeriodId}`, sc);
    }

    // 5. Construir matriz estudiantes x actividades
    let totalGradedScoresSum = 0;
    let totalGradedCount = 0;
    let totalMaxScoreGradedSum = 0;
    let studentOfficialGradesSum = 0;
    let studentOfficialGradesCount = 0;

    const hasUnassignedPeriod = activities.some((a) => !a.academicPeriodId);
    const hasNonClosedPeriod = activities.some(
      (a) => a.academicPeriod && a.academicPeriod.status !== AcademicPeriodStatus.CLOSED
    );

    const studentMatrix = students.map((std) => {
      let studentSumScores = 0;
      let studentGradedCount = 0;
      let studentSumMaxScores = 0;

      const studentGrades = activities.map((act) => {
        const grade = gradeIndex.get(`${act.id}:${std.id}`);
        const isGraded = grade !== undefined && grade !== null && grade.score !== null;
        const score = isGraded && grade.score !== null ? grade.score.toNumber() : null;

        if (isGraded && score !== null) {
          studentSumScores += score;
          studentGradedCount += 1;
          studentSumMaxScores += act.maxScore.toNumber();

          totalGradedScoresSum += score;
          totalGradedCount += 1;
          totalMaxScoreGradedSum += act.maxScore.toNumber();
        }

        return {
          activityId: act.id,
          activityName: act.name,
          activityType: act.type,
          maxScore: act.maxScore.toNumber(),
          score,
          isGraded,
          status: grade?.status || AcademicGradeStatus.PENDING,
          comments: grade?.comments || null,
          gradedAt: grade?.gradedAt || null,
          academicPeriodId: act.academicPeriodId,
          academicPeriodStatus: act.academicPeriod?.status || null,
          categoryId: act.categoryId || null,
          categoryName: act.category?.name || null,
        };
      });

      // Cálculo unificado con esquema(s) ponderado(s) oficial(es)
      let officialGrade: number | null = null;
      let definitiveGrade: number | null = null;
      let provisionalAverage: number | null = null;
      let isPassing: boolean = false;
      let studentCategoriesBreakdown: any[] = [];

      // Identificar si las actividades evaluadas corresponden a esquemas conocidos
      const evaluatedSchemeKeys = Array.from(
        new Set(
          activities
            .filter((a) => a.academicPeriodId)
            .map((a) => `${a.courseId}:${a.subjectId}:${a.academicPeriodId}`)
        )
      );

      if (evaluatedSchemeKeys.length > 0 && evaluatedSchemeKeys.every((k) => schemeMap.has(k))) {
        // Todas las actividades pertenecen a esquemas configurados válidos
        const schemeEvaluations = evaluatedSchemeKeys.map((key) => {
          const sc = schemeMap.get(key)!;
          const scActivities = activities.filter(
            (a) => `${a.courseId}:${a.subjectId}:${a.academicPeriodId}` === key
          );
          const isPeriodClosed = scActivities.some(
            (a) => a.academicPeriod?.status === AcademicPeriodStatus.CLOSED
          );

          return AcademicService.calculateStudentWeightedEvaluation({
            activities: scActivities,
            categories: sc.categories,
            gradeMap,
            studentId: std.id,
            maxScale: sc.maxScale ? sc.maxScale.toNumber() : 10.0,
            minPassingScore: sc.minPassingScore ? sc.minPassingScore.toNumber() : 7.0,
            isPeriodClosed,
          });
        });

        if (schemeEvaluations.length === 1) {
          const singleEval = schemeEvaluations[0];
          definitiveGrade = singleEval.definitiveGrade;
          provisionalAverage = singleEval.provisionalAverage;
          officialGrade = singleEval.officialGrade;
          isPassing = singleEval.isPassing;
          studentCategoriesBreakdown = singleEval.categories;
        } else {
          // Promedio consolidado entre múltiples esquemas/materias
          const validOfficial = schemeEvaluations
            .map((e) => e.officialGrade)
            .filter((g): g is number => g !== null);
          officialGrade = validOfficial.length > 0
            ? Math.round((validOfficial.reduce((a, b) => a + b, 0) / validOfficial.length) * 100) / 100
            : null;
          definitiveGrade = Math.round(
            (schemeEvaluations.reduce((a, b) => a + b.definitiveGrade, 0) / schemeEvaluations.length) * 100
          ) / 100;
          provisionalAverage = officialGrade;
          isPassing = (officialGrade ?? 0) >= 7.0;
          studentCategoriesBreakdown = schemeEvaluations.flatMap((e) => e.categories);
        }
      } else {
        // Fallback histórico para actividades sin esquema ponderado formal
        const unweightedSimple =
          studentGradedCount > 0 ? Math.round((studentSumScores / studentGradedCount) * 10) / 10 : null;
        officialGrade = unweightedSimple;
        definitiveGrade = unweightedSimple ?? 0;
        provisionalAverage = unweightedSimple;
        isPassing = (officialGrade ?? 0) >= 7.0;
      }

      if (officialGrade !== null) {
        studentOfficialGradesSum += officialGrade;
        studentOfficialGradesCount += 1;
      }

      const normalizedPerformance =
        studentGradedCount > 0 && studentSumMaxScores > 0
          ? Math.round((studentSumScores / studentSumMaxScores) * 1000) / 10
          : null;

      const studentIsProvisional =
        activities.length === 0 ||
        hasUnassignedPeriod ||
        hasNonClosedPeriod ||
        studentGradedCount < activities.length;

      const studentFinalityStatus =
        activities.length === 0
          ? "UNDETERMINED"
          : hasUnassignedPeriod
          ? "UNDETERMINED"
          : hasNonClosedPeriod || studentGradedCount < activities.length
          ? "PROVISIONAL"
          : "FINAL";

      return {
        studentId: std.id,
        firstName: std.firstName,
        lastName: std.lastName,
        fullName: `${std.firstName} ${std.lastName}`,
        identification: std.identification,
        status: std.status,
        gradedActivitiesCount: studentGradedCount,
        simpleAverage: officialGrade,
        definitiveGrade,
        provisionalAverage,
        officialGrade,
        isPassing,
        normalizedPerformance,
        isProvisional: studentIsProvisional,
        finalityStatus: studentFinalityStatus,
        grades: studentGrades,
        categories: studentCategoriesBreakdown,
      };
    });

    const overallAverage =
      studentOfficialGradesCount > 0
        ? Math.round((studentOfficialGradesSum / studentOfficialGradesCount) * 10) / 10
        : totalGradedCount > 0
        ? Math.round((totalGradedScoresSum / totalGradedCount) * 10) / 10
        : null;

    const overallNormalizedPerformance =
      totalGradedCount > 0 && totalMaxScoreGradedSum > 0
        ? Math.round((totalGradedScoresSum / totalMaxScoreGradedSum) * 1000) / 10
        : null;

    const isOverallProvisional =
      activities.length === 0 ||
      hasUnassignedPeriod ||
      hasNonClosedPeriod ||
      totalGradedCount < activities.length * students.length;

    const overallFinalityStatus =
      activities.length === 0
        ? "UNDETERMINED"
        : hasUnassignedPeriod
        ? "UNDETERMINED"
        : hasNonClosedPeriod || totalGradedCount < activities.length * students.length
        ? "PROVISIONAL"
        : "FINAL";

    return {
      course: courseInfo,
      subject: subjectInfo,
      activities: activities.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        maxScore: a.maxScore.toNumber(),
        dueDate: a.dueDate ? a.dueDate.toISOString().split("T")[0] : null,
        subjectName: a.subject?.name || "General",
        academicPeriodId: a.academicPeriodId,
        academicPeriodStatus: a.academicPeriod?.status || null,
        categoryId: a.categoryId || null,
        categoryName: a.category?.name || null,
      })),
      students: studentMatrix,
      summary: {
        totalActivities: activities.length,
        totalStudents: students.length,
        totalGradesRecorded: totalGradedCount,
        overallAverage,
        overallNormalizedPerformance,
        isProvisional: isOverallProvisional,
        finalityStatus: overallFinalityStatus,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Reporte 4: Ficha Individual del Estudiante (Individual Student Report)
   * Informe integral con datos personales, historial de asistencia, calificaciones y promedios.
   */
  static async getStudentReport(
    organizationId: number,
    studentId: number,
    accessContext?: AcademicAccessContext
  ) {
    const student = await db.academicStudent.findFirst({
      where: { id: studentId, organizationId },
      include: {
        enrollments: {
          where: { status: ACADEMIC_ENROLLMENT_STATUS.ACTIVE },
          include: {
            course: {
              include: {
                subjects: {
                  where: { status: ACADEMIC_SUBJECT_STATUS.ACTIVE },
                  select: { teacherUserId: true },
                },
              },
            },
          },
        },
      },
    });
    if (!student) {
      throw new Error("Estudiante no encontrado.");
    }

    let isTutor = false;
    let authorizedSubjectIds: number[] = [];
    let authorizedCourseIds: number[] = [];

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      isTutor = student.enrollments.some((e) => e.course.tutorUserId === accessContext.userId);

      if (!isTutor) {
        const taughtSubjects = await db.academicSubject.findMany({
          where: {
            organizationId,
            teacherUserId: accessContext.userId,
            course: { enrollments: { some: { studentId } } },
          },
          select: { id: true, courseId: true },
        });

        authorizedSubjectIds = taughtSubjects.map((s) => s.id);
        authorizedCourseIds = Array.from(new Set(taughtSubjects.map((s) => s.courseId)));

        if (authorizedSubjectIds.length === 0) {
          const err: any = new Error("No tienes permisos para consultar el reporte de este estudiante.");
          err.statusCode = 403;
          throw err;
        }
      }
    }

    const isTutorOrAdmin = Boolean(accessContext?.isAcademicAdmin || isTutor);

    // Matrículas del estudiante (restringidas a los cursos autorizados si es docente ordinario)
    const enrollmentWhere: any = { studentId, organizationId };
    if (!isTutorOrAdmin && authorizedCourseIds.length > 0) {
      enrollmentWhere.courseId = { in: authorizedCourseIds };
    }

    const enrollments = await db.academicEnrollment.findMany({
      where: enrollmentWhere,
      include: { course: true },
      orderBy: { createdAt: "desc" },
    });

    // Asistencias del estudiante (restringidas a materias del docente si no es tutor ni admin)
    const attendanceWhere: any = { studentId, organizationId };
    if (!isTutorOrAdmin) {
      attendanceWhere.session = { subjectId: { in: authorizedSubjectIds } };
    }

    const attendanceRecords = await db.academicAttendanceRecord.findMany({
      where: attendanceWhere,
      include: {
        session: {
          include: {
            course: true,
            subject: true,
          },
        },
      },
      orderBy: { session: { sessionDate: "desc" } },
    });

    const totalSessions = attendanceRecords.length;
    const presentCount = attendanceRecords.filter((r) => r.status === ACADEMIC_ATTENDANCE_STATUS.PRESENT).length;
    const absentCount = attendanceRecords.filter((r) => r.status === ACADEMIC_ATTENDANCE_STATUS.ABSENT).length;
    const lateCount = attendanceRecords.filter((r) => r.status === ACADEMIC_ATTENDANCE_STATUS.LATE).length;
    const excusedCount = attendanceRecords.filter((r) => r.status === ACADEMIC_ATTENDANCE_STATUS.EXCUSED).length;
    const effectiveSessions = presentCount + lateCount;
    const attendanceRate = totalSessions > 0 ? Math.round((effectiveSessions / totalSessions) * 1000) / 10 : null;

    // Calificaciones del estudiante (restringidas a materias del docente si no es tutor ni admin)
    const gradeWhere: any = { studentId, organizationId };
    if (!isTutorOrAdmin) {
      gradeWhere.activity = { subjectId: { in: authorizedSubjectIds } };
    }

    const grades = await db.academicGrade.findMany({
      where: gradeWhere,
      include: {
        activity: {
          include: {
            course: true,
            subject: true,
            academicPeriod: true,
          },
        },
      },
      orderBy: [{ activity: { dueDate: "desc" } }, { createdAt: "desc" }],
    });

    let totalScoreSum = 0;
    let totalMaxScoreSum = 0;
    let totalGradedActivitiesCount = 0;
    for (const g of grades) {
      if (g.score !== null) {
        const scoreVal = g.score.toNumber();
        totalScoreSum += scoreVal;
        totalMaxScoreSum += g.activity.maxScore.toNumber();
        totalGradedActivitiesCount += 1;
      }
    }

    const simpleAverage =
      totalGradedActivitiesCount > 0 ? Math.round((totalScoreSum / totalGradedActivitiesCount) * 10) / 10 : null;
    const normalizedPerformance =
      totalGradedActivitiesCount > 0 && totalMaxScoreSum > 0
        ? Math.round((totalScoreSum / totalMaxScoreSum) * 1000) / 10
        : null;

    const hasUnassignedGradePeriod = grades.some((g) => !g.activity.academicPeriodId);
    const hasNonClosedGradePeriod = grades.some(
      (g) => g.activity.academicPeriod && g.activity.academicPeriod.status !== AcademicPeriodStatus.CLOSED
    );
    const hasNonGraded = grades.some((g) => g.status !== AcademicGradeStatus.GRADED);

    const isGradesSummaryProvisional =
      grades.length === 0 || hasUnassignedGradePeriod || hasNonClosedGradePeriod || hasNonGraded;

    const gradesSummaryFinalityStatus =
      grades.length === 0
        ? "UNDETERMINED"
        : hasUnassignedGradePeriod
        ? "UNDETERMINED"
        : hasNonClosedGradePeriod || hasNonGraded
        ? "PROVISIONAL"
        : "FINAL";

    return {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        fullName: `${student.firstName} ${student.lastName}`,
        identification: student.identification,
        email: isTutorOrAdmin ? student.email : null,
        phone: isTutorOrAdmin ? student.phone : null,
        status: student.status,
        createdAt: student.createdAt,
      },
      enrollments: enrollments.map((e) => ({
        id: e.id,
        courseId: e.course.id,
        courseName: e.course.name,
        courseLevel: e.course.level,
        status: e.status,
        enrolledAt: e.enrollmentDate ? e.enrollmentDate.toISOString().split("T")[0] : null,
      })),
      attendance: {
        summary: {
          totalSessions,
          presentCount,
          absentCount,
          lateCount,
          excusedCount,
          attendanceRate,
        },
        history: attendanceRecords.map((r) => ({
          id: r.id,
          sessionDate: r.session.sessionDate.toISOString().split("T")[0],
          courseName: r.session.course.name,
          subjectName: r.session.subject?.name || "Sin materia",
          status: r.status,
          observation: r.observation,
        })),
      },
      grades: {
        summary: {
          totalGradesCount: grades.length,
          simpleAverage,
          normalizedPerformance,
          isProvisional: isGradesSummaryProvisional,
          finalityStatus: gradesSummaryFinalityStatus,
        },
        history: grades.map((g) => ({
          id: g.id,
          activityId: g.activity.id,
          activityName: g.activity.name,
          activityType: g.activity.type,
          subjectName: g.activity.subject?.name || "Materia",
          courseName: g.activity.course.name,
          score: g.score !== null ? g.score.toNumber() : null,
          status: g.status,
          maxScore: g.activity.maxScore.toNumber(),
          gradedAt: g.gradedAt ? g.gradedAt.toISOString().split("T")[0] : null,
          comments: g.comments,
          academicPeriodId: g.activity.academicPeriodId || null,
          academicPeriodStatus: g.activity.academicPeriod?.status || null,
          isProvisional:
            !g.activity.academicPeriod ||
            g.activity.academicPeriod.status !== AcademicPeriodStatus.CLOSED ||
            g.status !== AcademicGradeStatus.GRADED,
          finalityStatus: !g.activity.academicPeriod
            ? "UNDETERMINED"
            : g.activity.academicPeriod.status === AcademicPeriodStatus.CLOSED &&
              g.status === AcademicGradeStatus.GRADED
            ? "FINAL"
            : "PROVISIONAL",
        })),
      },
      generatedAt: new Date().toISOString(),
    };
  }

  // ============================================================================
  // AÑOS LECTIVOS (AcademicYear) - FASE 3
  // ============================================================================

  static async createAcademicYear(organizationId: number, input: CreateAcademicYearInput) {
    const name = input.name?.trim();
    if (!name) {
      throw new Error("El nombre del año lectivo es obligatorio (ej: 'Año Lectivo 2026-2027').");
    }

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("Las fechas de inicio y fin del año lectivo deben ser válidas.");
    }
    if (startDate >= endDate) {
      throw new Error("La fecha de inicio debe ser anterior a la fecha de fin del año lectivo.");
    }

    const existing = await db.academicYear.findFirst({
      where: { organizationId, name: { equals: name, mode: "insensitive" } },
    });
    if (existing) {
      throw new Error(`Ya existe un año lectivo con el nombre '${name}' en esta institución.`);
    }

    const status = input.status || AcademicYearStatus.PLANNED;

    if (status === AcademicYearStatus.ACTIVE) {
      const activeYear = await db.academicYear.findFirst({
        where: { organizationId, status: AcademicYearStatus.ACTIVE },
      });
      if (activeYear) {
        throw new Error(
          "ACADEMIC_YEAR_ALREADY_ACTIVE: Ya existe un año lectivo activo en esta institución. Cierra o archiva el año actual antes de activar otro."
        );
      }
    }

    return await db.academicYear.create({
      data: {
        organizationId,
        name,
        startDate,
        endDate,
        status,
      },
      include: {
        _count: {
          select: { periods: true, enrollments: true },
        },
      },
    });
  }

  static async getAcademicYears(
    organizationId: number,
    filter?: { status?: AcademicYearStatus; search?: string }
  ) {
    const where: any = { organizationId };

    if (filter?.status) {
      where.status = filter.status;
    }
    if (filter?.search) {
      where.name = { contains: filter.search.trim(), mode: "insensitive" };
    }

    return await db.academicYear.findMany({
      where,
      include: {
        periods: {
          orderBy: { order: "asc" },
        },
        _count: {
          select: { enrollments: true },
        },
      },
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    });
  }

  static async getAcademicYearById(organizationId: number, yearId: number) {
    const year = await db.academicYear.findFirst({
      where: { id: yearId, organizationId },
      include: {
        periods: {
          include: {
            subPeriods: { orderBy: { order: "asc" } },
            _count: { select: { activities: true, schemes: true } },
          },
          orderBy: { order: "asc" },
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });
    if (!year) {
      throw new Error("Año lectivo no encontrado en esta institución.");
    }
    return year;
  }

  static async updateAcademicYear(
    organizationId: number,
    yearId: number,
    input: UpdateAcademicYearInput
  ) {
    const year = await db.academicYear.findFirst({
      where: { id: yearId, organizationId },
      include: { periods: true },
    });
    if (!year) {
      throw new Error("Año lectivo no encontrado en esta institución.");
    }

    const data: any = {};

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) {
        throw new Error("El nombre del año lectivo no puede estar vacío.");
      }
      const duplicate = await db.academicYear.findFirst({
        where: {
          organizationId,
          name: { equals: name, mode: "insensitive" },
          id: { not: yearId },
        },
      });
      if (duplicate) {
        throw new Error(`Ya existe otro año lectivo con el nombre '${name}'.`);
      }
      data.name = name;
    }

    let newStart = year.startDate;
    let newEnd = year.endDate;

    if (input.startDate !== undefined) {
      const d = new Date(input.startDate);
      if (isNaN(d.getTime())) throw new Error("Fecha de inicio inválida.");
      newStart = d;
      data.startDate = d;
    }

    if (input.endDate !== undefined) {
      const d = new Date(input.endDate);
      if (isNaN(d.getTime())) throw new Error("Fecha de fin inválida.");
      newEnd = d;
      data.endDate = d;
    }

    if (newStart >= newEnd) {
      throw new Error("La fecha de inicio debe ser anterior a la fecha de fin del año lectivo.");
    }

    // Validar que los periodos hijos permanezcan dentro de las nuevas fechas
    for (const p of year.periods) {
      if (p.startDate < newStart || p.endDate > newEnd) {
        throw new Error(
          `No se pueden actualizar las fechas del año lectivo porque el periodo '${p.name}' (${p.startDate.toISOString().split("T")[0]} - ${p.endDate.toISOString().split("T")[0]}) quedaría fuera del nuevo rango.`
        );
      }
    }

    if (input.status !== undefined) {
      if (input.status === AcademicYearStatus.ACTIVE && year.status !== AcademicYearStatus.ACTIVE) {
        const activeYear = await db.academicYear.findFirst({
          where: { organizationId, status: AcademicYearStatus.ACTIVE, id: { not: yearId } },
        });
        if (activeYear) {
          throw new Error(
            "ACADEMIC_YEAR_ALREADY_ACTIVE: Ya existe un año lectivo activo en esta institución. Cierra o archiva el año actual antes de activar otro."
          );
        }
      }
      data.status = input.status;
    }

    return await db.academicYear.update({
      where: { id: yearId },
      data,
      include: {
        periods: { orderBy: { order: "asc" } },
        _count: { select: { enrollments: true } },
      },
    });
  }

  static async changeAcademicYearStatus(
    organizationId: number,
    yearId: number,
    status: AcademicYearStatus
  ) {
    const year = await db.academicYear.findFirst({
      where: { id: yearId, organizationId },
    });
    if (!year) {
      throw new Error("Año lectivo no encontrado en esta institución.");
    }

    if (status === AcademicYearStatus.ACTIVE && year.status !== AcademicYearStatus.ACTIVE) {
      const activeYear = await db.academicYear.findFirst({
        where: { organizationId, status: AcademicYearStatus.ACTIVE, id: { not: yearId } },
      });
      if (activeYear) {
        throw new Error(
          "ACADEMIC_YEAR_ALREADY_ACTIVE: Ya existe un año lectivo activo en esta institución. Cierra o archiva el año actual antes de activar otro."
        );
      }
    }

    return await db.academicYear.update({
      where: { id: yearId },
      data: { status },
    });
  }

  // ============================================================================
  // PERIODOS ACADÉMICOS (AcademicPeriod) - FASE 3
  // ============================================================================

  static async createAcademicPeriod(organizationId: number, input: CreateAcademicPeriodInput) {
    const year = await db.academicYear.findFirst({
      where: { id: input.academicYearId, organizationId },
    });
    if (!year) {
      throw new Error("El año lectivo asociado no existe en esta institución.");
    }

    const name = input.name?.trim();
    if (!name) {
      throw new Error("El nombre del periodo académico es obligatorio (ej: 'Primer Trimestre', 'Parcial 1').");
    }

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("Las fechas de inicio y fin del periodo deben ser válidas.");
    }
    if (startDate >= endDate) {
      throw new Error("La fecha de inicio debe ser anterior a la fecha de fin del periodo.");
    }

    if (startDate < year.startDate || endDate > year.endDate) {
      throw new Error(
        `Las fechas del periodo deben estar contenidas dentro de las fechas del año lectivo (${year.startDate.toISOString().split("T")[0]} al ${year.endDate.toISOString().split("T")[0]}).`
      );
    }

    let parentId: number | null = null;
    if (input.parentId) {
      const parent = await db.academicPeriod.findFirst({
        where: { id: input.parentId, organizationId, academicYearId: year.id },
      });
      if (!parent) {
        throw new Error("El periodo padre especificado no existe o no pertenece al mismo año lectivo.");
      }
      if (startDate < parent.startDate || endDate > parent.endDate) {
        throw new Error(
          `Las fechas del sub-periodo deben estar dentro del rango del periodo padre '${parent.name}' (${parent.startDate.toISOString().split("T")[0]} al ${parent.endDate.toISOString().split("T")[0]}).`
        );
      }
      parentId = parent.id;
    }

    const order = input.order !== undefined ? Number(input.order) : 1;
    const status = input.status || AcademicPeriodStatus.ACTIVE;

    return await db.academicPeriod.create({
      data: {
        organizationId,
        academicYearId: year.id,
        parentId,
        name,
        type: input.type,
        order,
        startDate,
        endDate,
        status,
      },
      include: {
        academicYear: true,
        parentPeriod: true,
        subPeriods: true,
      },
    });
  }

  static async getAcademicPeriods(
    organizationId: number,
    filter?: {
      academicYearId?: number;
      parentId?: number | null;
      type?: AcademicPeriodType;
      status?: AcademicPeriodStatus;
    }
  ) {
    const where: any = { organizationId };

    if (filter?.academicYearId) {
      where.academicYearId = Number(filter.academicYearId);
    }
    if (filter?.parentId !== undefined) {
      where.parentId = filter.parentId;
    }
    if (filter?.type) {
      where.type = filter.type;
    }
    if (filter?.status) {
      where.status = filter.status;
    }

    return await db.academicPeriod.findMany({
      where,
      include: {
        academicYear: true,
        parentPeriod: true,
        subPeriods: { orderBy: { order: "asc" } },
        schemes: {
          include: {
            categories: { orderBy: { order: "asc" } },
          },
        },
        _count: {
          select: { activities: true },
        },
      },
      orderBy: [{ academicYearId: "desc" }, { order: "asc" }, { startDate: "asc" }],
    });
  }

  static async getAcademicPeriodById(organizationId: number, periodId: number) {
    const period = await db.academicPeriod.findFirst({
      where: { id: periodId, organizationId },
      include: {
        academicYear: true,
        parentPeriod: true,
        subPeriods: {
          orderBy: { order: "asc" },
        },
        schemes: {
          include: {
            course: true,
            subject: true,
            categories: { orderBy: { order: "asc" } },
          },
        },
        _count: {
          select: { activities: true },
        },
      },
    });
    if (!period) {
      throw new Error("Periodo académico no encontrado en esta institución.");
    }
    return period;
  }

  static async updateAcademicPeriod(
    organizationId: number,
    periodId: number,
    input: UpdateAcademicPeriodInput
  ) {
    const period = await db.academicPeriod.findFirst({
      where: { id: periodId, organizationId },
      include: { academicYear: true, subPeriods: true },
    });
    if (!period) {
      throw new Error("Periodo académico no encontrado en esta institución.");
    }

    const data: any = {};

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) throw new Error("El nombre del periodo no puede estar vacío.");
      data.name = name;
    }

    if (input.type !== undefined) {
      data.type = input.type;
    }

    if (input.order !== undefined) {
      data.order = Number(input.order);
    }

    let newStart = period.startDate;
    let newEnd = period.endDate;

    if (input.startDate !== undefined) {
      const d = new Date(input.startDate);
      if (isNaN(d.getTime())) throw new Error("Fecha de inicio inválida.");
      newStart = d;
      data.startDate = d;
    }

    if (input.endDate !== undefined) {
      const d = new Date(input.endDate);
      if (isNaN(d.getTime())) throw new Error("Fecha de fin inválida.");
      newEnd = d;
      data.endDate = d;
    }

    if (newStart >= newEnd) {
      throw new Error("La fecha de inicio debe ser anterior a la fecha de fin del periodo.");
    }

    if (newStart < period.academicYear.startDate || newEnd > period.academicYear.endDate) {
      throw new Error(
        `Las fechas del periodo deben estar dentro de las fechas del año lectivo (${period.academicYear.startDate.toISOString().split("T")[0]} al ${period.academicYear.endDate.toISOString().split("T")[0]}).`
      );
    }

    // Validar sub-periodos existentes
    for (const sub of period.subPeriods) {
      if (sub.startDate < newStart || sub.endDate > newEnd) {
        throw new Error(
          `No se puede actualizar el periodo porque el sub-periodo '${sub.name}' quedaría fuera del nuevo rango.`
        );
      }
    }

    if (input.parentId !== undefined) {
      if (input.parentId === null) {
        data.parentId = null;
      } else {
        if (input.parentId === periodId) {
          throw new Error("Un periodo académico no puede ser padre de sí mismo.");
        }
        const parent = await db.academicPeriod.findFirst({
          where: { id: input.parentId, organizationId, academicYearId: period.academicYearId },
        });
        if (!parent) {
          throw new Error("Periodo padre no válido o no pertenece al mismo año lectivo.");
        }
        if (newStart < parent.startDate || newEnd > parent.endDate) {
          throw new Error("El rango de fechas excede el rango del periodo padre seleccionado.");
        }
        data.parentId = parent.id;
      }
    }

    if (input.status !== undefined) {
      data.status = input.status;
    }

    return await db.academicPeriod.update({
      where: { id: periodId },
      data,
      include: {
        academicYear: true,
        parentPeriod: true,
        subPeriods: true,
      },
    });
  }

  /**
   * Helper de concurrencia y protección de escrituras académicas.
   * Adquiere un bloqueo compartido (FOR SHARE) sobre la fila del periodo
   * para sincronizarse con el cierre de periodo (FOR UPDATE).
   * Valida además:
   * 1. Que el periodo no esté CLOSED o ARCHIVED (ACADEMIC_PERIOD_IMMUTABLE).
   * 2. Que el periodo no sea futuro para docentes no-administradores (ACADEMIC_PERIOD_NOT_STARTED).
   * 3. Que el periodo no esté LOCKED si la operación no lo permite (ACADEMIC_PERIOD_LOCKED).
   */
  private static async lockAcademicPeriodForAcademicWrite(
    tx: any,
    organizationId: number,
    periodId: number,
    options?: { allowLocked?: boolean; accessContext?: AcademicAccessContext }
  ) {
    const rows: any[] = await tx.$queryRaw`
      SELECT id, status, "academicYearId", "startDate", "endDate", name
      FROM "AcademicPeriod"
      WHERE id = ${periodId} AND "organizationId" = ${organizationId}
      FOR SHARE
    `;

    if (!rows || rows.length === 0) {
      const err: any = new Error("Periodo académico no encontrado en esta institución.");
      err.statusCode = 404;
      throw err;
    }

    const currentPeriod = rows[0];
    const currentStatus = currentPeriod.status as AcademicPeriodStatus;

    if (currentStatus === AcademicPeriodStatus.CLOSED) {
      const err: any = new Error("ACADEMIC_PERIOD_IMMUTABLE: No se pueden realizar modificaciones en un periodo académico cerrado.");
      err.statusCode = 400;
      err.code = "ACADEMIC_PERIOD_IMMUTABLE";
      throw err;
    }

    if (currentStatus === AcademicPeriodStatus.ARCHIVED) {
      const err: any = new Error("ACADEMIC_PERIOD_IMMUTABLE: No se pueden realizar modificaciones en un periodo académico archivado.");
      err.statusCode = 400;
      err.code = "ACADEMIC_PERIOD_IMMUTABLE";
      throw err;
    }

    // Control temporal: bloqueo de periodos no iniciados para docentes no administradores
    if (options?.accessContext && !options.accessContext.isAcademicAdmin) {
      if (isAcademicPeriodFuture(currentPeriod.startDate)) {
        const startFormatted = new Date(currentPeriod.startDate).toISOString().split("T")[0];
        const err: any = new Error(
          `ACADEMIC_PERIOD_NOT_STARTED: No se pueden registrar actividades o calificaciones en un periodo que aún no ha iniciado (Fecha de inicio: ${startFormatted}).`
        );
        err.statusCode = 409;
        err.code = "ACADEMIC_PERIOD_NOT_STARTED";
        throw err;
      }
    }

    if (currentStatus === AcademicPeriodStatus.LOCKED && !options?.allowLocked) {
      const err: any = new Error("ACADEMIC_PERIOD_LOCKED: No se pueden modificar actividades o esquemas en un periodo con estructura bloqueada (LOCKED).");
      err.statusCode = 400;
      err.code = "ACADEMIC_PERIOD_LOCKED";
      throw err;
    }

    return currentPeriod;
  }

  /**
   * Calcula de forma interna (reutilizable dentro de transacciones) el diagnóstico de preparación para cierre de un periodo académico.
   */
  static async calculateReadinessInternal(
    tx: any,
    organizationId: number,
    periodId: number
  ): Promise<PeriodClosureReadinessDTO> {
    const period = await tx.academicPeriod.findFirst({
      where: { id: periodId, organizationId },
      include: { academicYear: true },
    });
    if (!period) {
      throw new Error("Periodo académico no encontrado en esta institución.");
    }

    // 1. Actividades del periodo
    const activities = await tx.academicActivity.findMany({
      where: { academicPeriodId: periodId, organizationId },
      include: { category: true, course: true, subject: true },
    });
    const activityIds = activities.map((a: any) => a.id);

    // 2. Esquemas de evaluación del periodo
    const schemes = await tx.academicEvaluationScheme.findMany({
      where: { academicPeriodId: periodId, organizationId },
      include: { categories: true, course: true, subject: true },
    });

    // 3. Calificaciones registradas
    const grades =
      activityIds.length > 0
        ? await tx.academicGrade.findMany({
            where: {
              organizationId,
              activityId: { in: activityIds },
            },
          })
        : [];

    // 4. Matrículas activas en cursos asociados a las actividades o esquemas del periodo
    // Filtradas estrictamente por el año lectivo del periodo para evitar contaminación multi-año o legacy NULL
    const courseIds = Array.from(
      new Set([
        ...activities.map((a: any) => a.courseId).filter(Boolean),
        ...schemes.map((s: any) => s.courseId).filter(Boolean),
      ])
    ) as number[];

    const enrollments =
      courseIds.length > 0
        ? await tx.academicEnrollment.findMany({
            where: {
              organizationId,
              courseId: { in: courseIds },
              status: ACADEMIC_ENROLLMENT_STATUS.ACTIVE,
              academicYearId: period.academicYearId ?? null,
            },
            include: { student: true },
          })
        : [];

    // 5. Análisis de calificaciones (restringido a estudiantes con matrícula activa en el periodo)
    const activeStudentIds = new Set(enrollments.map((e: any) => e.studentId));
    const activeGrades = grades.filter((g: any) => activeStudentIds.has(g.studentId));

    let gradedCount = 0;
    let pendingCount = 0;
    let absentCount = 0;
    let excusedCount = 0;

    for (const g of activeGrades) {
      if (g.status === AcademicGradeStatus.GRADED) gradedCount++;
      else if (g.status === AcademicGradeStatus.PENDING) pendingCount++;
      else if (g.status === AcademicGradeStatus.ABSENT) absentCount++;
      else if (g.status === AcademicGradeStatus.EXCUSED) excusedCount++;
    }

    // Calificaciones faltantes implícitas (estudiante activo sin registro de calificación en una actividad)
    const gradeKeySet = new Set(grades.map((g: any) => `${g.activityId}:${g.studentId}`));
    let missingGradesCount = 0;
    for (const act of activities) {
      if (act.courseId) {
        const courseEnrs = enrollments.filter((e: any) => e.courseId === act.courseId);
        for (const enr of courseEnrs) {
          if (!gradeKeySet.has(`${act.id}:${enr.studentId}`)) {
            missingGradesCount++;
          }
        }
      }
    }
    const totalPending = pendingCount + missingGradesCount;

    // 6. Análisis de esquemas
    let draftSchemes = 0;
    let validSchemes = 0;
    let lockedSchemes = 0;
    let closedSchemes = 0;
    let invalidWeightSchemes = 0;

    for (const s of schemes) {
      if (s.status === AcademicEvaluationSchemeStatus.DRAFT) draftSchemes++;
      else if (s.status === AcademicEvaluationSchemeStatus.VALID) validSchemes++;
      else if (s.status === AcademicEvaluationSchemeStatus.LOCKED) lockedSchemes++;
      else if (s.status === AcademicEvaluationSchemeStatus.CLOSED) closedSchemes++;

      const sumWeight = s.categories.reduce(
        (acc: Prisma.Decimal, c: any) => acc.add(c.weightPercentage),
        new Prisma.Decimal(0)
      );
      if (!sumWeight.equals(new Prisma.Decimal(100.0))) {
        invalidWeightSchemes++;
      }
    }

    // 7. Análisis de completitud por estudiante
    const studentIds = Array.from(new Set(enrollments.map((e: any) => e.studentId))) as number[];
    let completeStudents = 0;
    let incompleteStudents = 0;

    for (const sId of studentIds) {
      const studentEnrs = enrollments.filter((e: any) => e.studentId === sId);
      const studentCourseIds = studentEnrs.map((e: any) => e.courseId);
      const studentActivities = activities.filter(
        (a: any) => a.courseId && studentCourseIds.includes(a.courseId)
      );

      let isStudentComplete = studentActivities.length > 0;
      for (const act of studentActivities) {
        const g = grades.find((gr: any) => gr.activityId === act.id && gr.studentId === sId);
        if (!g || (g.status !== AcademicGradeStatus.GRADED && g.status !== AcademicGradeStatus.EXCUSED)) {
          isStudentComplete = false;
          break;
        }
      }
      if (isStudentComplete) completeStudents++;
      else incompleteStudents++;
    }

    // 8. Generación de Bloqueos y Advertencias
    const blockers: PeriodClosureBlocker[] = [];
    const warnings: PeriodClosureWarning[] = [];

    if (totalPending > 0) {
      blockers.push({
        type: "PENDING_GRADES",
        message: `Existen ${totalPending} calificación(es) pendientes por registrar o calificar.`,
        count: totalPending,
      });
    }

    if (absentCount > 0) {
      blockers.push({
        type: "ABSENT_GRADES",
        message: `Existen ${absentCount} calificación(es) en estado ABSENT. Deben ser resueltas antes del cierre.`,
        count: absentCount,
      });
    }

    if (draftSchemes > 0) {
      blockers.push({
        type: "INVALID_SCHEMES",
        message: `Existen ${draftSchemes} esquema(s) de evaluación en estado borrador (DRAFT).`,
        count: draftSchemes,
      });
    }

    if (invalidWeightSchemes > 0) {
      blockers.push({
        type: "INCOMPLETE_WEIGHTS",
        message: `Existen ${invalidWeightSchemes} esquema(s) cuya suma de ponderaciones no alcanza el 100.00%.`,
        count: invalidWeightSchemes,
      });
    }

    if (excusedCount > 0) {
      warnings.push({
        type: "EXCUSED_GRADES_PRESENT",
        message: `Existen ${excusedCount} calificación(es) en estado EXCUSED (justificadas). No serán convertidas a 0.`,
        count: excusedCount,
      });
    }

    if (activities.length === 0) {
      warnings.push({
        type: "NO_ACTIVITIES",
        message: "No se registran actividades evaluativas en este periodo académico.",
        count: 0,
      });
    }

    const canClose = blockers.length === 0;

    return {
      periodId: period.id,
      periodName: period.name,
      periodStatus: period.status,
      canClose,
      totalActivities: activities.length,
      totalEnrollments: enrollments.length,
      totalGrades: grades.length,
      gradeSummary: {
        graded: gradedCount,
        pending: totalPending,
        absent: absentCount,
        excused: excusedCount,
      },
      schemes: {
        total: schemes.length,
        valid: validSchemes,
        draft: draftSchemes,
        locked: lockedSchemes,
        closed: closedSchemes,
        invalidWeight: invalidWeightSchemes,
      },
      students: {
        total: studentIds.length,
        complete: completeStudents,
        incomplete: incompleteStudents,
      },
      blockers,
      warnings,
    };
  }

  static async getPeriodClosureReadiness(
    organizationId: number,
    periodId: number
  ): Promise<PeriodClosureReadinessDTO> {
    return await AcademicService.calculateReadinessInternal(db, organizationId, periodId);
  }

  static async changeAcademicPeriodStatus(
    organizationId: number,
    periodId: number,
    status: AcademicPeriodStatus
  ) {
    const validStatuses = [
      AcademicPeriodStatus.ACTIVE,
      AcademicPeriodStatus.LOCKED,
      AcademicPeriodStatus.CLOSED,
      AcademicPeriodStatus.ARCHIVED,
    ];
    if (!validStatuses.includes(status)) {
      throw new Error(`Estado de periodo inválido: ${status}`);
    }

    return await db.$transaction(async (tx) => {
      // Bloqueo pesimista de fila
      const rows: any[] = await tx.$queryRaw`
        SELECT id, status, "academicYearId"
        FROM "AcademicPeriod"
        WHERE id = ${periodId} AND "organizationId" = ${organizationId}
        FOR UPDATE
      `;

      if (!rows || rows.length === 0) {
        throw new Error("Periodo académico no encontrado en esta institución.");
      }

      const currentPeriod = rows[0];
      const currentStatus = currentPeriod.status as AcademicPeriodStatus;

      // Idempotencia
      if (currentStatus === status) {
        return await tx.academicPeriod.findUnique({
          where: { id: periodId },
          include: {
            academicYear: true,
            parentPeriod: true,
            subPeriods: true,
          },
        });
      }

      // Estado terminal
      if (currentStatus === AcademicPeriodStatus.ARCHIVED) {
        throw new Error("No se puede cambiar el estado de un periodo académico ARCHIVED (estado terminal).");
      }

      // Reapertura prohibida
      if (currentStatus === AcademicPeriodStatus.CLOSED) {
        if (status !== AcademicPeriodStatus.ARCHIVED) {
          throw new Error("No se puede reabrir un periodo académico cerrado. La reapertura requiere un flujo administrativo auditado.");
        }
      }

      // Archivo solo permitido desde CLOSED
      if (status === AcademicPeriodStatus.ARCHIVED) {
        if (currentStatus !== AcademicPeriodStatus.CLOSED) {
          throw new Error("Solo se puede archivar un periodo académico que ya ha sido cerrado (CLOSED).");
        }
      }

      // Cierre con validación estricta de blockers
      if (status === AcademicPeriodStatus.CLOSED) {
        const readiness = await AcademicService.calculateReadinessInternal(tx, organizationId, periodId);
        if (!readiness.canClose) {
          const err: any = new Error(
            `No se puede cerrar el periodo académico '${readiness.periodName}'. Existen ${readiness.blockers.length} bloqueo(s) pendiente(s): ${readiness.blockers.map((b) => b.message).join(" | ")}`
          );
          err.code = "ACADEMIC_PERIOD_NOT_READY_TO_CLOSE";
          err.statusCode = 409;
          err.blockers = readiness.blockers;
          err.readiness = readiness;
          throw err;
        }

        // Cerrar esquemas de evaluación válidos o bloqueados del periodo
        await tx.academicEvaluationScheme.updateMany({
          where: {
            academicPeriodId: periodId,
            organizationId,
            status: { in: [AcademicEvaluationSchemeStatus.VALID, AcademicEvaluationSchemeStatus.LOCKED] },
          },
          data: {
            status: AcademicEvaluationSchemeStatus.CLOSED,
          },
        });
      }

      return await tx.academicPeriod.update({
        where: { id: periodId },
        data: { status },
        include: {
          academicYear: true,
          parentPeriod: true,
          subPeriods: true,
        },
      });
    });
  }

  // ============================================================================
  // ESQUEMAS Y CATEGORÍAS DE EVALUACIÓN (FASE 3)
  // ============================================================================

  static async createEvaluationScheme(
    organizationId: number,
    input: CreateEvaluationSchemeInput,
    accessContext?: AcademicAccessContext
  ) {
    const period = await db.academicPeriod.findFirst({
      where: { id: input.academicPeriodId, organizationId },
    });
    if (!period) {
      throw new Error("El periodo académico especificado no existe en esta institución.");
    }
    if (
      period.status === AcademicPeriodStatus.LOCKED ||
      period.status === AcademicPeriodStatus.CLOSED ||
      period.status === AcademicPeriodStatus.ARCHIVED
    ) {
      throw new Error("No se pueden crear esquemas de evaluación en un periodo bloqueado, cerrado o archivado.");
    }

    const course = await db.academicCourse.findFirst({
      where: { id: input.courseId, organizationId },
    });
    if (!course) {
      throw new Error("El curso especificado no existe en esta institución.");
    }

    const subject = await db.academicSubject.findFirst({
      where: { id: input.subjectId, organizationId },
    });
    if (!subject) {
      throw new Error("La materia especificada no existe en esta institución.");
    }
    if (subject.courseId !== course.id) {
      throw new Error("La materia no pertenece al curso seleccionado.");
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      if (subject.teacherUserId !== accessContext.userId) {
        const err: any = new Error("No tienes permisos para crear esquemas de evaluación en esta materia.");
        err.statusCode = 403;
        throw err;
      }
    }

    const existing = await db.academicEvaluationScheme.findUnique({
      where: {
        organizationId_courseId_subjectId_academicPeriodId: {
          organizationId,
          courseId: course.id,
          subjectId: subject.id,
          academicPeriodId: period.id,
        },
      },
    });
    if (existing) {
      throw new Error("Ya existe un esquema de evaluación para este curso, materia y periodo.");
    }

    const maxScale = input.maxScale !== undefined ? new Prisma.Decimal(input.maxScale) : new Prisma.Decimal(10.0);
    const minPassingScore = input.minPassingScore !== undefined ? new Prisma.Decimal(input.minPassingScore) : new Prisma.Decimal(7.0);

    return await db.$transaction(async (tx) => {
      await AcademicService.lockAcademicPeriodForAcademicWrite(tx, organizationId, period.id, { allowLocked: false });

      const created = await tx.academicEvaluationScheme.create({
        data: {
          organizationId,
          courseId: course.id,
          subjectId: subject.id,
          academicPeriodId: period.id,
          maxScale,
          minPassingScore,
          status: input.status || AcademicEvaluationSchemeStatus.DRAFT,
        },
        include: {
          course: true,
          subject: true,
          academicPeriod: true,
          categories: { orderBy: { order: "asc" } },
        },
      });

      if (created.status === AcademicEvaluationSchemeStatus.VALID) {
        await AcademicService.ensurePeriodFinalEvaluationInternal(tx, organizationId, created.id);
      }

      return created;
    });
  }

  static async getEvaluationSchemes(
    organizationId: number,
    filter?: {
      academicPeriodId?: number;
      courseId?: number;
      subjectId?: number;
      status?: AcademicEvaluationSchemeStatus;
    },
    accessContext?: AcademicAccessContext
  ) {
    const where: any = { organizationId };

    if (filter?.academicPeriodId) where.academicPeriodId = Number(filter.academicPeriodId);
    if (filter?.courseId) where.courseId = Number(filter.courseId);
    if (filter?.subjectId) where.subjectId = Number(filter.subjectId);
    if (filter?.status) where.status = filter.status;

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      where.subject = {
        teacherUserId: accessContext.userId,
      };
    }

    return await db.academicEvaluationScheme.findMany({
      where,
      include: {
        course: true,
        subject: true,
        academicPeriod: true,
        categories: { orderBy: { order: "asc" } },
        _count: { select: { activities: true } },
      },
      orderBy: [{ academicPeriodId: "desc" }, { createdAt: "desc" }],
    });
  }

  static async getEvaluationSchemeById(
    organizationId: number,
    schemeId: number,
    accessContext?: AcademicAccessContext
  ) {
    const scheme = await db.academicEvaluationScheme.findFirst({
      where: { id: schemeId, organizationId },
      include: {
        course: true,
        subject: true,
        academicPeriod: true,
        categories: { orderBy: { order: "asc" } },
        activities: {
          include: {
            category: true,
            _count: { select: { grades: true } },
          },
        },
      },
    });
    if (!scheme) {
      throw new Error("Esquema de evaluación no encontrado en esta institución.");
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      if (scheme.subject?.teacherUserId !== accessContext.userId) {
        const err: any = new Error("No tienes permisos para consultar este esquema de evaluación.");
        err.statusCode = 403;
        throw err;
      }
    }

    return scheme;
  }

  static async updateEvaluationScheme(
    organizationId: number,
    schemeId: number,
    input: UpdateEvaluationSchemeInput,
    accessContext?: AcademicAccessContext
  ) {
    const scheme = await db.academicEvaluationScheme.findFirst({
      where: { id: schemeId, organizationId },
      include: { academicPeriod: true, subject: { select: { teacherUserId: true } } },
    });
    if (!scheme) {
      throw new Error("Esquema de evaluación no encontrado en esta institución.");
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      if (scheme.subject?.teacherUserId !== accessContext.userId) {
        const err: any = new Error("No tienes permisos para modificar este esquema de evaluación.");
        err.statusCode = 403;
        throw err;
      }
    }

    if (
      scheme.academicPeriod?.status === AcademicPeriodStatus.LOCKED ||
      scheme.academicPeriod?.status === AcademicPeriodStatus.CLOSED ||
      scheme.academicPeriod?.status === AcademicPeriodStatus.ARCHIVED
    ) {
      throw new Error("No se pueden modificar esquemas de evaluación en un periodo bloqueado, cerrado o archivado.");
    }

    if (scheme.status === AcademicEvaluationSchemeStatus.LOCKED || scheme.status === AcademicEvaluationSchemeStatus.CLOSED) {
      if (input.maxScale !== undefined || input.minPassingScore !== undefined) {
        throw new Error("No se pueden modificar los parámetros de un esquema bloqueado o cerrado.");
      }
    }

    const data: any = {};
    if (input.maxScale !== undefined) {
      const s = Number(input.maxScale);
      if (isNaN(s) || s <= 0) throw new Error("La escala máxima debe ser mayor a 0.");
      data.maxScale = new Prisma.Decimal(s);
    }
    if (input.minPassingScore !== undefined) {
      const m = Number(input.minPassingScore);
      if (isNaN(m) || m < 0) throw new Error("El puntaje mínimo para aprobar no puede ser negativo.");
      data.minPassingScore = new Prisma.Decimal(m);
    }
    if (input.status !== undefined) {
      data.status = input.status;
    }

    return await db.$transaction(async (tx) => {
      if (scheme.academicPeriodId) {
        await AcademicService.lockAcademicPeriodForAcademicWrite(tx, organizationId, scheme.academicPeriodId, { allowLocked: false });
      }

      return await tx.academicEvaluationScheme.update({
        where: { id: schemeId },
        data,
        include: {
          categories: { orderBy: { order: "asc" } },
        },
      });
    });
  }

  /**
   * Valida un esquema de evaluación: la suma de categorías debe ser EXACTAMENTE 100.00%.
   * Si es válido, pasa el esquema a estado VALID.
   */
  static async validateEvaluationScheme(
    organizationId: number,
    schemeId: number,
    accessContext?: AcademicAccessContext
  ) {
    const scheme = await db.academicEvaluationScheme.findFirst({
      where: { id: schemeId, organizationId },
      include: { categories: true, academicPeriod: true, subject: { select: { teacherUserId: true } } },
    });
    if (!scheme) {
      throw new Error("Esquema de evaluación no encontrado en esta institución.");
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      if (scheme.subject?.teacherUserId !== accessContext.userId) {
        const err: any = new Error("No tienes permisos para validar este esquema de evaluación.");
        err.statusCode = 403;
        throw err;
      }
    }

    if (
      scheme.academicPeriod?.status === AcademicPeriodStatus.LOCKED ||
      scheme.academicPeriod?.status === AcademicPeriodStatus.CLOSED ||
      scheme.academicPeriod?.status === AcademicPeriodStatus.ARCHIVED
    ) {
      throw new Error("No se pueden validar esquemas de evaluación en un periodo bloqueado, cerrado o archivado.");
    }

    const totalWeight = scheme.categories.reduce(
      (acc, cat) => acc.add(cat.weightPercentage),
      new Prisma.Decimal(0)
    );

    if (!totalWeight.equals(new Prisma.Decimal(100.0))) {
      throw new Error(
        `EVALUATION_WEIGHT_MISMATCH: La suma de las ponderaciones debe ser exactamente 100.00% para validar el esquema (suma actual: ${totalWeight.toFixed(2)}%).`
      );
    }

    return await db.$transaction(async (tx) => {
      if (scheme.academicPeriodId) {
        await AcademicService.lockAcademicPeriodForAcademicWrite(tx, organizationId, scheme.academicPeriodId, { allowLocked: false });
      }

      const updated = await tx.academicEvaluationScheme.update({
        where: { id: schemeId },
        data: { status: AcademicEvaluationSchemeStatus.VALID },
        include: {
          categories: { orderBy: { order: "asc" } },
        },
      });

      await AcademicService.ensurePeriodFinalEvaluationInternal(tx, organizationId, schemeId);

      return updated;
    });
  }

  /**
   * Garantiza de forma idempotente y atómica la existencia de una única evaluación final
   * por cada combinación de (organización, curso, materia, parcial) asociada al esquema VALID.
   */
  static async ensurePeriodFinalEvaluationInternal(
    tx: any,
    organizationId: number,
    schemeId: number,
    accessContext?: AcademicAccessContext
  ) {
    const scheme = await tx.academicEvaluationScheme.findFirst({
      where: { id: schemeId, organizationId },
      include: {
        categories: { orderBy: { order: "asc" } },
        academicPeriod: true,
        subject: true,
      },
    });

    if (!scheme) return null;

    if (
      scheme.status !== AcademicEvaluationSchemeStatus.VALID &&
      scheme.status !== AcademicEvaluationSchemeStatus.LOCKED
    ) {
      return null;
    }

    if (
      scheme.academicPeriod.status === AcademicPeriodStatus.CLOSED ||
      scheme.academicPeriod.status === AcademicPeriodStatus.ARCHIVED
    ) {
      return null;
    }

    // Identificar la categoría de evaluación final / examen parcial
    const examCategory =
      scheme.categories.find((c: any) =>
        /evaluaci[oó]n\s+parcial|examen\s+parcial|evaluaci[oó]n\s+final|examen/i.test(c.name)
      ) ||
      scheme.categories.find((c: any) =>
        /evaluaci[oó]n|examen/i.test(c.name)
      );

    if (!examCategory) {
      return null;
    }

    // Verificar si ya existe una evaluación final en este periodo para este curso y materia
    const existing = await tx.academicActivity.findFirst({
      where: {
        organizationId,
        courseId: scheme.courseId,
        subjectId: scheme.subjectId,
        academicPeriodId: scheme.academicPeriodId,
        OR: [
          { name: "Evaluación final del parcial" },
          { categoryId: examCategory.id },
          { type: ACADEMIC_ACTIVITY_TYPE.EXAM },
        ],
      },
    });

    if (existing) {
      return existing;
    }

    // Crear la actividad de evaluación final automáticamente
    const activity = await tx.academicActivity.create({
      data: {
        organizationId,
        courseId: scheme.courseId,
        subjectId: scheme.subjectId,
        teacherUserId: scheme.subject?.teacherUserId || null,
        name: "Evaluación final del parcial",
        description: "Evaluación sumativa final correspondiente al parcial académico.",
        type: ACADEMIC_ACTIVITY_TYPE.EXAM,
        dueDate: scheme.academicPeriod.endDate,
        maxScore: scheme.maxScale,
        academicPeriodId: scheme.academicPeriodId,
        evaluationSchemeId: scheme.id,
        categoryId: examCategory.id,
      },
      include: {
        course: true,
        subject: true,
        academicPeriod: true,
        category: true,
      },
    });

    // Asignación de notas PENDING para matrículas activas del año lectivo
    let enrollmentFilter: any = {
      courseId: scheme.courseId,
      organizationId,
      status: ACADEMIC_ENROLLMENT_STATUS.ACTIVE,
    };
    if (scheme.academicPeriod?.academicYearId) {
      enrollmentFilter.academicYearId = scheme.academicPeriod.academicYearId;
    }

    const activeEnrollments = await tx.academicEnrollment.findMany({
      where: enrollmentFilter,
    });

    if (activeEnrollments.length > 0) {
      await tx.academicGrade.createMany({
        data: activeEnrollments.map((enr: any) => ({
          organizationId,
          activityId: activity.id,
          studentId: enr.studentId,
          enrollmentId: enr.id,
          status: AcademicGradeStatus.PENDING,
          score: null,
          gradedAt: null,
        })),
        skipDuplicates: true,
      });
    }

    return activity;
  }

  static async ensurePeriodFinalEvaluation(
    organizationId: number,
    schemeId: number,
    accessContext?: AcademicAccessContext
  ) {
    return await db.$transaction(async (tx) => {
      return await AcademicService.ensurePeriodFinalEvaluationInternal(
        tx,
        organizationId,
        schemeId,
        accessContext
      );
    });
  }

  static async lockEvaluationScheme(
    organizationId: number,
    schemeId: number,
    accessContext?: AcademicAccessContext
  ) {
    const scheme = await db.academicEvaluationScheme.findFirst({
      where: { id: schemeId, organizationId },
      include: { categories: true, academicPeriod: true, subject: { select: { teacherUserId: true } } },
    });
    if (!scheme) {
      throw new Error("Esquema de evaluación no encontrado en esta institución.");
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      if (scheme.subject?.teacherUserId !== accessContext.userId) {
        const err: any = new Error("No tienes permisos para bloquear este esquema de evaluación.");
        err.statusCode = 403;
        throw err;
      }
    }

    if (
      scheme.academicPeriod?.status === AcademicPeriodStatus.CLOSED ||
      scheme.academicPeriod?.status === AcademicPeriodStatus.ARCHIVED
    ) {
      throw new Error("No se pueden bloquear esquemas de evaluación en un periodo cerrado o archivado.");
    }

    const totalWeight = scheme.categories.reduce(
      (acc, cat) => acc.add(cat.weightPercentage),
      new Prisma.Decimal(0)
    );

    if (!totalWeight.equals(new Prisma.Decimal(100.0))) {
      throw new Error(
        `No se puede bloquear un esquema cuya suma de ponderaciones no sea exactamente 100.00% (actual: ${totalWeight.toFixed(2)}%).`
      );
    }

    return await db.$transaction(async (tx) => {
      if (scheme.academicPeriodId) {
        await AcademicService.lockAcademicPeriodForAcademicWrite(tx, organizationId, scheme.academicPeriodId, { allowLocked: false });
      }

      return await tx.academicEvaluationScheme.update({
        where: { id: schemeId },
        data: { status: AcademicEvaluationSchemeStatus.LOCKED },
        include: {
          categories: { orderBy: { order: "asc" } },
        },
      });
    });
  }

  static async closeEvaluationScheme(
    organizationId: number,
    schemeId: number,
    accessContext?: AcademicAccessContext
  ) {
    const scheme = await db.academicEvaluationScheme.findFirst({
      where: { id: schemeId, organizationId },
      include: { subject: { select: { teacherUserId: true } } },
    });
    if (!scheme) {
      throw new Error("Esquema de evaluación no encontrado en esta institución.");
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      if (scheme.subject?.teacherUserId !== accessContext.userId) {
        const err: any = new Error("No tienes permisos para cerrar este esquema de evaluación.");
        err.statusCode = 403;
        throw err;
      }
    }

    return await db.academicEvaluationScheme.update({
      where: { id: schemeId },
      data: { status: AcademicEvaluationSchemeStatus.CLOSED },
    });
  }

  /**
   * Crea una categoría de evaluación en un esquema con regla de techo estricto: Suma <= 100.00%.
   */
  static async createEvaluationCategory(
    organizationId: number,
    schemeId: number,
    input: CreateEvaluationCategoryInput,
    accessContext?: AcademicAccessContext
  ) {
    const scheme = await db.academicEvaluationScheme.findFirst({
      where: { id: schemeId, organizationId },
      include: { categories: true, academicPeriod: true, subject: { select: { teacherUserId: true } } },
    });
    if (!scheme) {
      throw new Error("Esquema de evaluación no encontrado en esta institución.");
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      if (scheme.subject?.teacherUserId !== accessContext.userId) {
        const err: any = new Error("No tienes permisos para agregar categorías a este esquema.");
        err.statusCode = 403;
        throw err;
      }
    }

    if (
      scheme.academicPeriod?.status === AcademicPeriodStatus.LOCKED ||
      scheme.academicPeriod?.status === AcademicPeriodStatus.CLOSED ||
      scheme.academicPeriod?.status === AcademicPeriodStatus.ARCHIVED
    ) {
      throw new Error("No se pueden agregar categorías a un esquema en un periodo bloqueado, cerrado o archivado.");
    }

    if (scheme.status === AcademicEvaluationSchemeStatus.LOCKED || scheme.status === AcademicEvaluationSchemeStatus.CLOSED) {
      throw new Error("No se pueden agregar categorías a un esquema bloqueado o cerrado.");
    }

    const name = input.name?.trim();
    if (!name) {
      throw new Error("El nombre de la categoría es obligatorio (ej: 'Tareas', 'Exámenes').");
    }

    const normalizedName = name.toLowerCase();
    const duplicateInScheme = scheme.categories.find(
      (c) => c.name.trim().toLowerCase() === normalizedName
    );
    if (duplicateInScheme) {
      throw new Error("EVALUATION_CATEGORY_DUPLICATE: Ya existe una categoría con ese nombre en este esquema.");
    }

    const weightNum = Number(input.weightPercentage);
    if (isNaN(weightNum) || !isFinite(weightNum) || weightNum <= 0 || weightNum > 100) {
      throw new Error("La ponderación debe ser un número mayor a 0% y menor o igual a 100.00%.");
    }

    const categoryWeight = new Prisma.Decimal(weightNum);

    return await db.$transaction(async (tx) => {
      if (scheme.academicPeriodId) {
        await AcademicService.lockAcademicPeriodForAcademicWrite(tx, organizationId, scheme.academicPeriodId, { allowLocked: false });
      }

      const currentCategories = await tx.academicEvaluationCategory.findMany({
        where: { schemeId },
      });

      const currentSum = currentCategories.reduce(
        (acc, c) => acc.add(c.weightPercentage),
        new Prisma.Decimal(0)
      );

      const resultingSum = currentSum.add(categoryWeight);

      if (resultingSum.greaterThan(new Prisma.Decimal(100.0))) {
        throw new Error(
          `EVALUATION_WEIGHT_EXCEEDED: La suma de ponderaciones no puede superar el 100.00% (suma actual: ${currentSum.toFixed(2)}%, nueva categoría: ${categoryWeight.toFixed(2)}%, total resultante: ${resultingSum.toFixed(2)}%).`
        );
      }

      const order = input.order !== undefined ? Number(input.order) : currentCategories.length + 1;

      const category = await tx.academicEvaluationCategory.create({
        data: {
          organizationId,
          schemeId,
          name,
          weightPercentage: categoryWeight,
          order,
        },
      });

      // Si el esquema estaba en VALID y la suma ya no es 100, revierte a DRAFT
      if (scheme.status === AcademicEvaluationSchemeStatus.VALID && !resultingSum.equals(new Prisma.Decimal(100.0))) {
        await tx.academicEvaluationScheme.update({
          where: { id: schemeId },
          data: { status: AcademicEvaluationSchemeStatus.DRAFT },
        });
      }

      return category;
    });
  }

  static async updateEvaluationCategory(
    organizationId: number,
    categoryId: number,
    input: UpdateEvaluationCategoryInput,
    accessContext?: AcademicAccessContext
  ) {
    const category = await db.academicEvaluationCategory.findFirst({
      where: { id: categoryId, organizationId },
      include: { scheme: { include: { categories: true, academicPeriod: true, subject: { select: { teacherUserId: true } } } } },
    });
    if (!category) {
      throw new Error("Categoría de evaluación no encontrada.");
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      if (category.scheme?.subject?.teacherUserId !== accessContext.userId) {
        const err: any = new Error("No tienes permisos para modificar esta categoría de evaluación.");
        err.statusCode = 403;
        throw err;
      }
    }

    if (
      category.scheme?.academicPeriod?.status === AcademicPeriodStatus.LOCKED ||
      category.scheme?.academicPeriod?.status === AcademicPeriodStatus.CLOSED ||
      category.scheme?.academicPeriod?.status === AcademicPeriodStatus.ARCHIVED
    ) {
      throw new Error("No se pueden modificar categorías de un esquema en un periodo bloqueado, cerrado o archivado.");
    }

    if (
      category.scheme.status === AcademicEvaluationSchemeStatus.LOCKED ||
      category.scheme.status === AcademicEvaluationSchemeStatus.CLOSED
    ) {
      throw new Error("No se pueden modificar categorías de un esquema bloqueado o cerrado.");
    }

    return await db.$transaction(async (tx) => {
      if (category.scheme?.academicPeriodId) {
        await AcademicService.lockAcademicPeriodForAcademicWrite(tx, organizationId, category.scheme.academicPeriodId, { allowLocked: false });
      }

      const data: any = {};

      if (input.name !== undefined) {
        const name = input.name.trim();
        if (!name) throw new Error("El nombre de la categoría no puede estar vacío.");

        const normalizedName = name.toLowerCase();
        const duplicateInScheme = category.scheme.categories.find(
          (c) => c.id !== categoryId && c.name.trim().toLowerCase() === normalizedName
        );
        if (duplicateInScheme) {
          throw new Error("EVALUATION_CATEGORY_DUPLICATE: Ya existe una categoría con ese nombre en este esquema.");
        }

        data.name = name;
      }

      if (input.order !== undefined) {
        data.order = Number(input.order);
      }

      if (input.weightPercentage !== undefined) {
        const weightNum = Number(input.weightPercentage);
        if (isNaN(weightNum) || !isFinite(weightNum) || weightNum <= 0 || weightNum > 100) {
          throw new Error("La ponderación debe ser un número mayor a 0% y menor o igual a 100.00%.");
        }

        const newWeight = new Prisma.Decimal(weightNum);

        const otherCategories = category.scheme.categories.filter((c) => c.id !== categoryId);
        const otherSum = otherCategories.reduce(
          (acc, c) => acc.add(c.weightPercentage),
          new Prisma.Decimal(0)
        );
        const resultingSum = otherSum.add(newWeight);

        if (resultingSum.greaterThan(new Prisma.Decimal(100.0))) {
          throw new Error(
            `EVALUATION_WEIGHT_EXCEEDED: La suma de ponderaciones no puede superar el 100.00% (otras categorías: ${otherSum.toFixed(2)}%, nueva ponderación: ${newWeight.toFixed(2)}%, total: ${resultingSum.toFixed(2)}%).`
          );
        }

        data.weightPercentage = newWeight;

        // Si cambia la ponderación y el total no es 100, asegurar estado DRAFT
        if (!resultingSum.equals(new Prisma.Decimal(100.0))) {
          await tx.academicEvaluationScheme.update({
            where: { id: category.schemeId },
            data: { status: AcademicEvaluationSchemeStatus.DRAFT },
          });
        }
      }

      return await tx.academicEvaluationCategory.update({
        where: { id: categoryId },
        data,
      });
    });
  }

  static async deleteEvaluationCategory(
    organizationId: number,
    categoryId: number,
    accessContext?: AcademicAccessContext
  ) {
    const category = await db.academicEvaluationCategory.findFirst({
      where: { id: categoryId, organizationId },
      include: {
        scheme: { include: { academicPeriod: true, subject: { select: { teacherUserId: true } } } },
        _count: { select: { activities: true } },
      },
    });
    if (!category) {
      throw new Error("Categoría de evaluación no encontrada.");
    }

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      if (category.scheme?.subject?.teacherUserId !== accessContext.userId) {
        const err: any = new Error("No tienes permisos para eliminar esta categoría de evaluación.");
        err.statusCode = 403;
        throw err;
      }
    }

    if (
      category.scheme?.academicPeriod?.status === AcademicPeriodStatus.LOCKED ||
      category.scheme?.academicPeriod?.status === AcademicPeriodStatus.CLOSED ||
      category.scheme?.academicPeriod?.status === AcademicPeriodStatus.ARCHIVED
    ) {
      throw new Error("No se pueden eliminar categorías de un esquema en un periodo bloqueado, cerrado o archivado.");
    }

    if (
      category.scheme.status === AcademicEvaluationSchemeStatus.LOCKED ||
      category.scheme.status === AcademicEvaluationSchemeStatus.CLOSED
    ) {
      throw new Error("No se pueden eliminar categorías de un esquema bloqueado o cerrado.");
    }

    if (category._count.activities > 0) {
      throw new Error(
        `No se puede eliminar la categoría '${category.name}' porque tiene ${category._count.activities} actividad(es) vinculada(s). Reasigne o elimine las actividades primero.`
      );
    }

    return await db.$transaction(async (tx) => {
      if (category.scheme?.academicPeriodId) {
        await AcademicService.lockAcademicPeriodForAcademicWrite(tx, organizationId, category.scheme.academicPeriodId, { allowLocked: false });
      }

      const deleted = await tx.academicEvaluationCategory.delete({
        where: { id: categoryId },
      });

      // El esquema vuelve a DRAFT tras eliminar categoría
      await tx.academicEvaluationScheme.update({
        where: { id: category.schemeId },
        data: { status: AcademicEvaluationSchemeStatus.DRAFT },
      });

      return deleted;
    });
  }

  // ============================================================================
  // MOTOR DE CÁLCULO PROGRESIVO Y PROMEDIOS (FASE 3)
  // ============================================================================

  /**
   * Calcula el modelo de calificaciones progresivas por categorías de evaluación para un curso, materia y periodo.
   * Aplica distinción estricta entre promedio provisional (sobre lo evaluado) y nota definitiva del periodo.
   */
  static async calculatePeriodGradesMatrix(
    organizationId: number,
    courseId: number,
    subjectId: number,
    academicPeriodId: number,
    studentId?: number,
    accessContext?: AcademicAccessContext
  ) {
    const course = await db.academicCourse.findFirst({
      where: { id: courseId, organizationId },
    });
    if (!course) throw new Error("Curso no encontrado.");

    const subject = await db.academicSubject.findFirst({
      where: { id: subjectId, organizationId },
    });
    if (!subject) throw new Error("Materia no encontrada.");

    if (accessContext && !accessContext.isAcademicAdmin && accessContext.userId) {
      if (subject.teacherUserId !== accessContext.userId) {
        const err: any = new Error("No tienes permisos para consultar las calificaciones de esta materia.");
        err.statusCode = 403;
        throw err;
      }
    }

    const period = await db.academicPeriod.findFirst({
      where: { id: academicPeriodId, organizationId },
    });
    if (!period) throw new Error("Periodo académico no encontrado.");

    // Buscar esquema de evaluación
    const scheme = await db.academicEvaluationScheme.findFirst({
      where: {
        organizationId,
        courseId,
        subjectId,
        academicPeriodId,
      },
      include: {
        categories: { orderBy: { order: "asc" } },
      },
    });

    const maxScale = scheme ? scheme.maxScale.toNumber() : 10.0;
    const minPassingScore = scheme ? scheme.minPassingScore.toNumber() : 7.0;
    const categories = scheme ? scheme.categories : [];

    // Estudiantes matriculados activos para el año del periodo académico
    const enrollmentWhere: any = {
      courseId,
      organizationId,
      status: ACADEMIC_ENROLLMENT_STATUS.ACTIVE,
    };
    if (period.academicYearId) {
      enrollmentWhere.academicYearId = period.academicYearId;
    }
    if (studentId) {
      enrollmentWhere.studentId = studentId;
    }

    const enrollments = await db.academicEnrollment.findMany({
      where: enrollmentWhere,
      include: { student: true },
      orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
    });

    // Actividades del periodo para esta materia
    const activities = await db.academicActivity.findMany({
      where: {
        organizationId,
        courseId,
        subjectId,
        academicPeriodId,
      },
      include: {
        category: true,
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    });

    // Calificaciones
    const activityIds = activities.map((a) => a.id);
    const grades = await db.academicGrade.findMany({
      where: {
        organizationId,
        activityId: { in: activityIds },
      },
    });

    const gradeMap = new Map<string, { score: number | null; status: AcademicGradeStatus }>();
    for (const g of grades) {
      gradeMap.set(`${g.activityId}:${g.studentId}`, {
        score: g.score !== null ? g.score.toNumber() : null,
        status: g.status,
      });
    }

    const studentsResult = enrollments.map((enr) => {
      const std = enr.student;
      const evalResult = AcademicService.calculateStudentWeightedEvaluation({
        activities,
        categories,
        gradeMap,
        studentId: std.id,
        maxScale,
        minPassingScore,
        isPeriodClosed: period.status === AcademicPeriodStatus.CLOSED,
      });

      return {
        studentId: std.id,
        enrollmentId: enr.id,
        identification: std.identification,
        lastName: std.lastName,
        firstName: std.firstName,
        fullName: `${std.lastName} ${std.firstName}`.trim(),
        studentName: `${std.lastName} ${std.firstName}`.trim(),
        evaluatedWeightPercentage: evalResult.evaluatedWeightPercentage,
        isComplete: evalResult.isComplete,
        isProvisional: evalResult.isProvisional,
        isPassing: evalResult.isPassing,
        definitiveGrade: evalResult.definitiveGrade,
        provisionalAverage: evalResult.provisionalAverage,
        categories: evalResult.categories,
      };
    });

    // Construir desglose de categorías y actividades a nivel raíz (independiente de si existen o no estudiantes)
    const uncategorizedRootActivities = activities.filter(
      (a) => !a.categoryId || !categories.some((c) => c.id === a.categoryId)
    );

    const rootCategories: any[] = categories.map((cat) => {
      const catActivities = activities.filter((a) => a.categoryId === cat.id);
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        weightPercentage: cat.weightPercentage.toNumber(),
        isEvaluated: false,
        activitiesCount: catActivities.length,
        gradedCount: 0,
        categoryAverage: null,
        weightedContribution: 0,
        activities: catActivities.map((act) => ({
          activityId: act.id,
          activityName: act.name,
          activityType: act.type,
          maxScore: act.maxScore.toNumber(),
          score: null,
          status: AcademicGradeStatus.PENDING,
        })),
      };
    });

    if (uncategorizedRootActivities.length > 0) {
      rootCategories.push({
        categoryId: 0,
        categoryName: "Sin ponderar / Sin categoría",
        weightPercentage: 0,
        isEvaluated: false,
        activitiesCount: uncategorizedRootActivities.length,
        gradedCount: 0,
        categoryAverage: null,
        weightedContribution: 0,
        activities: uncategorizedRootActivities.map((act) => ({
          activityId: act.id,
          activityName: act.name,
          activityType: act.type,
          maxScore: act.maxScore.toNumber(),
          score: null,
          status: AcademicGradeStatus.PENDING,
        })),
      });
    }

    const hasAnyProvisional =
      period.status !== AcademicPeriodStatus.CLOSED || studentsResult.some((s) => s.isProvisional);

    return {
      course: { id: course.id, name: course.name, level: course.level },
      subject: { id: subject.id, name: subject.name, code: subject.code },
      period: { id: period.id, name: period.name, type: period.type, status: period.status },
      scheme: scheme
        ? {
            id: scheme.id,
            status: scheme.status,
            maxScale,
            minPassingScore,
            totalCategories: categories.length,
            categories: categories.map((c) => ({
              id: c.id,
              evaluationSchemeId: scheme.id,
              name: c.name,
              weightPercentage: c.weightPercentage.toNumber(),
              order: c.order,
            })),
          }
        : null,
      categories: rootCategories,
      activities: activities.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        maxScore: a.maxScore.toNumber(),
        dueDate: a.dueDate ? a.dueDate.toISOString() : null,
        categoryId: a.categoryId,
        categoryName: a.category?.name || (a.categoryId ? undefined : "Sin ponderar"),
        evaluationSchemeId: a.evaluationSchemeId,
      })),
      totalActivities: activities.length,
      totalStudents: enrollments.length,
      isProvisional: hasAnyProvisional,
      students: studentsResult,
      generatedAt: new Date().toISOString(),
    };
  }
}




