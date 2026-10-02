import { db } from "../lib/db";
import {
  ACADEMIC_ACTIVITY_TYPE,
  ACADEMIC_ATTENDANCE_STATUS,
  ACADEMIC_CLASS_SESSION_STATUS,
  ACADEMIC_COURSE_STATUS,
  ACADEMIC_ENROLLMENT_STATUS,
  ACADEMIC_STUDENT_STATUS,
  ACADEMIC_SUBJECT_STATUS,
} from "../constants/academic.constants";
import { ORGANIZATION_MEMBER_STATUS } from "../constants/organization.constants";

export interface CreateAcademicActivityInput {
  subjectId: number;
  name: string;
  description?: string | null;
  type?: string;
  dueDate?: string | Date | null;
  maxScore: number;
  teacherUserId?: number | null;
}

export interface UpdateAcademicActivityInput {
  name?: string;
  description?: string | null;
  type?: string;
  dueDate?: string | Date | null;
  maxScore?: number;
  teacherUserId?: number | null;
}

export interface GradeRecordItemInput {
  studentId: number;
  score: number;
  comments?: string | null;
}

export interface SaveGradesBatchInput {
  grades: GradeRecordItemInput[];
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
}

export interface UpdateAcademicSubjectInput {
  name?: string;
  code?: string | null;
  hoursPerWeek?: number | null;
  teacherUserId?: number | null;
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
    filter?: { status?: string; search?: string }
  ) {
    const whereClause: any = { organizationId };

    if (filter?.status) {
      whereClause.status = filter.status;
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

  static async getCourseById(organizationId: number, courseId: number) {
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
      throw new Error("Curso no encontrado en esta institución.");
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

    return await db.academicSubject.create({
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
  }

  static async getSubjectsByCourse(organizationId: number, courseId: number) {
    const course = await db.academicCourse.findFirst({
      where: { id: courseId, organizationId },
    });
    if (!course) {
      throw new Error("Curso no encontrado en esta institución.");
    }

    return await db.academicSubject.findMany({
      where: {
        courseId,
        organizationId,
        status: ACADEMIC_SUBJECT_STATUS.ACTIVE,
      },
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
  }

  static async updateSubject(
    organizationId: number,
    subjectId: number,
    input: UpdateAcademicSubjectInput
  ) {
    const subject = await db.academicSubject.findFirst({
      where: { id: subjectId, organizationId },
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

    return await db.academicSubject.update({
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
    filter?: { status?: string; courseId?: number; search?: string }
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

  static async getStudentById(organizationId: number, studentId: number) {
    const student = await db.academicStudent.findFirst({
      where: { id: studentId, organizationId },
      include: {
        enrollments: {
          include: {
            course: true,
          },
          orderBy: { enrollmentDate: "desc" },
        },
      },
    });

    if (!student) {
      throw new Error("Estudiante no encontrado en esta institución.");
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
    const { studentId, courseId, period } = input;

    // Validación estricta multi-tenant: Estudiante y Curso deben pertenecer a organizationId
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

    // Verificar si ya existe matrícula para este estudiante en este curso
    const existing = await db.academicEnrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId,
        },
      },
    });

    if (existing) {
      if (existing.status === ACADEMIC_ENROLLMENT_STATUS.ACTIVE) {
        throw new Error(
          `El estudiante ${student.firstName} ${student.lastName} ya se encuentra matriculado activamente en el curso '${course.name}'.`
        );
      } else {
        // Reactivación de matrícula previa inactiva / retirada
        return await db.academicEnrollment.update({
          where: { id: existing.id },
          data: {
            status: ACADEMIC_ENROLLMENT_STATUS.ACTIVE,
            period: period?.trim() || existing.period,
            enrollmentDate: new Date(),
          },
          include: {
            student: true,
            course: true,
          },
        });
      }
    }

    return await db.academicEnrollment.create({
      data: {
        organizationId,
        studentId,
        courseId,
        status: ACADEMIC_ENROLLMENT_STATUS.ACTIVE,
        period: period?.trim() || null,
      },
      include: {
        student: true,
        course: true,
      },
    });
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
    }
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

  static async getSessionById(organizationId: number, sessionId: number) {
    const session = await db.academicClassSession.findFirst({
      where: { id: sessionId, organizationId },
      include: {
        course: {
          select: { id: true, name: true, level: true, classroom: true, status: true },
        },
        subject: {
          select: { id: true, name: true, code: true, status: true },
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
  // REGISTRO DE ASISTENCIA (AcademicAttendanceRecord - FASE 2)
  // ============================================================================

  static async saveAttendanceBatch(
    organizationId: number,
    sessionId: number,
    records: AttendanceRecordItemInput[]
  ) {
    // 1. Validar que la sesión exista y pertenezca a la organización
    const session = await db.academicClassSession.findFirst({
      where: { id: sessionId, organizationId },
      include: {
        course: true,
      },
    });
    if (!session) {
      throw new Error("Sesión de clase no encontrada en esta institución.");
    }

    if (!Array.isArray(records) || records.length === 0) {
      throw new Error("Debe proporcionar al menos un registro de asistencia.");
    }

    const validStatuses = Object.values(ACADEMIC_ATTENDANCE_STATUS);

    // Pre-validar registros
    const seenStudentIds = new Set<number>();
    for (const item of records) {
      const studentId = Number(item.studentId);
      if (isNaN(studentId) || studentId <= 0) {
        throw new Error(`ID de estudiante inválido: '${item.studentId}'.`);
      }
      if (seenStudentIds.has(studentId)) {
        throw new Error(`El estudiante con ID ${studentId} aparece duplicado en la solicitud.`);
      }
      seenStudentIds.add(studentId);

      const statusUpper = item.status?.trim().toUpperCase();
      if (!validStatuses.includes(statusUpper as any)) {
        throw new Error(
          `Estado de asistencia inválido: '${item.status}' para el estudiante ${studentId}. Estados permitidos: ${validStatuses.join(", ")}.`
        );
      }
    }

    // Ejecutar transacción atómica
    return await db.$transaction(async (tx) => {
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
          throw new Error(
            `El estudiante con ID ${studentId} no existe en esta institución.`
          );
        }
        if (student.status !== ACADEMIC_STUDENT_STATUS.ACTIVE) {
          throw new Error(
            `No se puede registrar asistencia para el estudiante ${student.firstName} ${student.lastName} (ID: ${studentId}) porque se encuentra administrativamente INACTIVO.`
          );
        }

        // Validar matrícula activa en el curso de la sesión
        const enrollment = await tx.academicEnrollment.findUnique({
          where: {
            studentId_courseId: {
              studentId,
              courseId: session.courseId,
            },
          },
        });

        if (!enrollment || enrollment.organizationId !== organizationId) {
          throw new Error(
            `El estudiante ${student.firstName} ${student.lastName} (ID: ${studentId}) no está matriculado en el curso '${session.course.name}'.`
          );
        }

        if (enrollment.status !== ACADEMIC_ENROLLMENT_STATUS.ACTIVE) {
          throw new Error(
            `No se puede registrar asistencia para el estudiante ${student.firstName} ${student.lastName} porque su matrícula en el curso '${session.course.name}' no está activa (Estado actual: ${enrollment.status}).`
          );
        }

        // Guardar o actualizar registro (Idempotencia / Corrección de asistencia)
        const saved = await tx.academicAttendanceRecord.upsert({
          where: {
            sessionId_studentId: {
              sessionId,
              studentId,
            },
          },
          update: {
            status: statusUpper,
            observation,
          },
          create: {
            organizationId,
            sessionId,
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

      return results;
    });
  }

  static async getAttendanceBySession(organizationId: number, sessionId: number) {
    const session = await db.academicClassSession.findFirst({
      where: { id: sessionId, organizationId },
    });
    if (!session) {
      throw new Error("Sesión de clase no encontrada en esta institución.");
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
    }
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
    input: { status?: string; observation?: string | null }
  ) {
    const record = await db.academicAttendanceRecord.findFirst({
      where: { id: attendanceId, organizationId },
    });
    if (!record) {
      throw new Error("Registro de asistencia no encontrado en esta institución.");
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
    input: CreateAcademicActivityInput
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

    return await db.academicActivity.create({
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
      },
      include: {
        course: true,
        subject: true,
        teacherUser: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { grades: true },
        },
      },
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
      type?: string;
      search?: string;
    }
  ) {
    const where: any = { organizationId };

    if (filter?.courseId) {
      where.courseId = Number(filter.courseId);
    }
    if (filter?.subjectId) {
      where.subjectId = Number(filter.subjectId);
    }
    if (filter?.type) {
      const typeUpper = filter.type.trim().toUpperCase();
      where.type = typeUpper;
    }
    if (filter?.search) {
      const term = filter.search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
      ];
    }

    return await db.academicActivity.findMany({
      where,
      include: {
        course: true,
        subject: true,
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
  static async getActivityById(organizationId: number, activityId: number) {
    const activity = await db.academicActivity.findFirst({
      where: { id: activityId, organizationId },
      include: {
        course: true,
        subject: true,
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
    return activity;
  }

  /**
   * Actualiza una actividad académica validando maxScore histórico si existen calificaciones.
   */
  static async updateActivity(
    organizationId: number,
    activityId: number,
    input: UpdateAcademicActivityInput
  ) {
    const activity = await db.academicActivity.findFirst({
      where: { id: activityId, organizationId },
    });
    if (!activity) {
      throw new Error("Actividad no encontrada en esta institución.");
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
        where: { activityId, organizationId },
        _max: { score: true },
      });

      if (maxGrade._max.score !== null && newMaxScore < maxGrade._max.score) {
        throw new Error(
          `No se puede reducir el puntaje máximo a ${newMaxScore} porque existen calificaciones registradas con puntaje de hasta ${maxGrade._max.score}.`
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

    return await db.academicActivity.update({
      where: { id: activityId },
      data,
      include: {
        course: true,
        subject: true,
        teacherUser: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { grades: true },
        },
      },
    });
  }

  // -------------------------------------------------------------
  // REGISTRO DE CALIFICACIONES (FASE 3)
  // -------------------------------------------------------------

  /**
   * Guarda o actualiza un lote de calificaciones para una actividad de forma atómica.
   */
  static async saveGradesBatch(
    organizationId: number,
    activityId: number,
    grades: GradeRecordItemInput[]
  ) {
    const activity = await db.academicActivity.findFirst({
      where: { id: activityId, organizationId },
    });
    if (!activity) {
      throw new Error("Actividad no encontrada en esta institución.");
    }

    if (!Array.isArray(grades) || grades.length === 0) {
      throw new Error("Debe proporcionar al menos una calificación para registrar.");
    }

    // 1. Validar integridad de cada item del lote
    for (const item of grades) {
      const studentId = Number(item.studentId);
      if (isNaN(studentId) || studentId <= 0) {
        throw new Error(`ID de estudiante inválido en el lote de calificaciones.`);
      }

      const score = Number(item.score);
      if (typeof item.score !== "number" || isNaN(score) || !isFinite(score) || score < 0) {
        throw new Error(
          `La calificación para el estudiante ${studentId} debe ser un número no negativo válido (score >= 0).`
        );
      }
      if (score > activity.maxScore) {
        throw new Error(
          `La calificación ${score} para el estudiante ${studentId} no puede exceder el puntaje máximo de la actividad (${activity.maxScore}).`
        );
      }
    }

    // 2. Validar estudiantes y matrículas activas en el curso
    const studentIds = Array.from(new Set(grades.map((g) => Number(g.studentId))));

    const students = await db.academicStudent.findMany({
      where: {
        id: { in: studentIds },
        organizationId,
      },
    });

    if (students.length !== studentIds.length) {
      throw new Error("Uno o más estudiantes no pertenecen a esta institución.");
    }

    const inactiveStudents = students.filter((s) => s.status !== ACADEMIC_STUDENT_STATUS.ACTIVE);
    if (inactiveStudents.length > 0) {
      throw new Error(
        `No se pueden registrar calificaciones para estudiantes inactivos (${inactiveStudents.map((s) => s.id).join(", ")}).`
      );
    }

    const enrollments = await db.academicEnrollment.findMany({
      where: {
        studentId: { in: studentIds },
        courseId: activity.courseId,
        organizationId,
        status: ACADEMIC_ENROLLMENT_STATUS.ACTIVE,
      },
    });

    const enrolledStudentIds = new Set(enrollments.map((e) => e.studentId));
    const nonEnrolled = studentIds.filter((id) => !enrolledStudentIds.has(id));
    if (nonEnrolled.length > 0) {
      throw new Error(
        `Los siguientes estudiantes no tienen una matrícula activa en el curso de esta actividad: ${nonEnrolled.join(", ")}.`
      );
    }

    // 3. Ejecutar upserts en una transacción atómica (todo o nada)
    return await db.$transaction(async (tx) => {
      const results = [];
      for (const item of grades) {
        const studentId = Number(item.studentId);
        const score = Number(item.score);
        const comments = item.comments?.trim() || null;

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
            score,
            comments,
          },
          update: {
            score,
            comments: item.comments !== undefined ? comments : undefined,
            gradedAt: new Date(),
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
        results.push(gradeRecord);
      }
      return results;
    });
  }

  /**
   * Obtiene las calificaciones de una actividad específica.
   */
  static async getGradesByActivity(organizationId: number, activityId: number) {
    const activity = await db.academicActivity.findFirst({
      where: { id: activityId, organizationId },
    });
    if (!activity) {
      throw new Error("Actividad no encontrada en esta institución.");
    }

    return await db.academicGrade.findMany({
      where: { activityId, organizationId },
      include: {
        student: true,
        activity: {
          include: {
            course: true,
            subject: true,
          },
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
    }
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
  static async getStudentGrades(organizationId: number, studentId: number) {
    const student = await db.academicStudent.findFirst({
      where: { id: studentId, organizationId },
    });
    if (!student) {
      throw new Error("Estudiante no encontrado en esta institución.");
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
   * Actualiza individualmente una calificación registrada.
   */
  static async updateGradeRecord(
    organizationId: number,
    gradeId: number,
    input: { score?: number; comments?: string | null }
  ) {
    const grade = await db.academicGrade.findFirst({
      where: { id: gradeId, organizationId },
      include: { activity: true },
    });
    if (!grade) {
      throw new Error("Calificación no encontrada en esta institución.");
    }

    const data: any = {};

    if (input.score !== undefined) {
      const newScore = Number(input.score);
      if (typeof input.score !== "number" || isNaN(newScore) || !isFinite(newScore) || newScore < 0) {
        throw new Error("La calificación debe ser un número no negativo válido (score >= 0).");
      }
      if (newScore > grade.activity.maxScore) {
        throw new Error(
          `La calificación ${newScore} no puede superar el puntaje máximo de la actividad (${grade.activity.maxScore}).`
        );
      }
      data.score = newScore;
      data.gradedAt = new Date();
    }

    if (input.comments !== undefined) {
      data.comments = input.comments?.trim() || null;
    }

    return await db.academicGrade.update({
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
  }

  // ============================================================================
  // DASHBOARD ACADÉMICO REAL Y READ MODELS (FASE 4)
  // ============================================================================

  /**
   * Obtiene el modelo de lectura consolidado del Dashboard Docente para la organización autenticada.
   * Totalmente read-only (GET writes = 0), sin tablas dedicadas y con aislamiento multi-tenant estricto.
   */
  static async getDashboard(organizationId: number, currentUserId?: number) {
    // 1. Cursos activos y totales
    const totalCoursesCount = await db.academicCourse.count({
      where: { organizationId },
    });

    const activeCoursesCount = await db.academicCourse.count({
      where: {
        organizationId,
        status: ACADEMIC_COURSE_STATUS.ACTIVE,
      },
    });

    // 2. Estudiantes activos sin double-counting (COUNT DISTINCT studentId con matrícula ACTIVE y student ACTIVE)
    const activeEnrollments = await db.academicEnrollment.findMany({
      where: {
        organizationId,
        status: ACADEMIC_ENROLLMENT_STATUS.ACTIVE,
        student: {
          status: ACADEMIC_STUDENT_STATUS.ACTIVE,
        },
      },
      select: { studentId: true },
      distinct: ["studentId"],
    });
    const activeStudentsCount = activeEnrollments.length;

    const totalStudentsCount = await db.academicStudent.count({
      where: { organizationId },
    });

    // 3. Sesiones de clase de hoy (rango de 24h UTC correspondiente a hoy)
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const todaySessions = await db.academicClassSession.findMany({
      where: {
        organizationId,
        sessionDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
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
      orderBy: [{ sessionDate: "asc" }, { startTime: "asc" }],
    });

    // 4. Actividades y evaluaciones próximas (dueDate >= startOfDay o dueDate null)
    const upcomingActivities = await db.academicActivity.findMany({
      where: {
        organizationId,
        OR: [
          { dueDate: { gte: startOfDay } },
          { dueDate: null },
        ],
      },
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
    const recentGrades = await db.academicGrade.findMany({
      where: { organizationId },
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
    const totalAttendanceRecords = await db.academicAttendanceRecord.count({
      where: { organizationId },
    });

    const presentCount = await db.academicAttendanceRecord.count({
      where: { organizationId, status: ACADEMIC_ATTENDANCE_STATUS.PRESENT },
    });

    const absentCount = await db.academicAttendanceRecord.count({
      where: { organizationId, status: ACADEMIC_ATTENDANCE_STATUS.ABSENT },
    });

    const lateCount = await db.academicAttendanceRecord.count({
      where: { organizationId, status: ACADEMIC_ATTENDANCE_STATUS.LATE },
    });

    const excusedCount = await db.academicAttendanceRecord.count({
      where: { organizationId, status: ACADEMIC_ATTENDANCE_STATUS.EXCUSED },
    });

    // Fórmula formal de porcentaje de asistencia: (presentCount / totalRecords) * 100
    const attendanceRate = totalAttendanceRecords > 0
      ? Math.round((presentCount / totalAttendanceRecords) * 1000) / 10
      : null;

    // 7. Resumen de Rendimiento Académico Descriptivo
    const totalGradesCount = await db.academicGrade.count({
      where: { organizationId },
    });

    let averageScore: number | null = null;
    let normalizedPerformance: number | null = null;

    if (totalGradesCount > 0) {
      const gradesAgg = await db.academicGrade.aggregate({
        where: { organizationId },
        _avg: { score: true },
      });
      averageScore = gradesAgg._avg.score !== null ? Math.round(gradesAgg._avg.score * 10) / 10 : null;

      // Rendimiento normalizado descriptivo: SUM(score) / SUM(maxScore) * 100
      const allGrades = await db.academicGrade.findMany({
        where: { organizationId },
        select: {
          score: true,
          activity: { select: { maxScore: true } },
        },
      });
      const sumScore = allGrades.reduce((acc, g) => acc + g.score, 0);
      const sumMaxScore = allGrades.reduce((acc, g) => acc + (g.activity?.maxScore || 10), 0);
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
        organizationId,
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
        organizationId,
        score: { lt: 7.0 },
      },
      include: {
        student: true,
        activity: { include: { course: true, subject: true } },
      },
      orderBy: [{ gradedAt: "desc" }, { createdAt: "desc" }],
      take: 5,
    });

    for (const lg of lowGrades) {
      if (!academicAlerts.some((a) => a.id === `grade-student-${lg.studentId}-${lg.activityId}`)) {
        academicAlerts.push({
          id: `grade-student-${lg.studentId}-${lg.activityId}`,
          studentId: String(lg.studentId),
          studentName: `${lg.student.firstName} ${lg.student.lastName}`,
          courseName: lg.activity.course.name,
          type: "low_grade",
          severity: lg.score < 5.0 ? "critical" : "high",
          description: `Calificación de ${lg.score}/${lg.activity.maxScore} en '${lg.activity.name}' (${lg.activity.subject.name}). Requiere seguimiento.`,
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
    if (currentUserId) {
      const teacherUser = await db.user.findFirst({
        where: { id: currentUserId },
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
    filter?: { courseId?: number; status?: string }
  ) {
    let courseInfo: any = null;

    if (filter?.courseId) {
      const course = await db.academicCourse.findFirst({
        where: { id: filter.courseId, organizationId },
      });
      if (!course) {
        throw new Error("Curso no encontrado.");
      }
      courseInfo = {
        id: course.id,
        name: course.name,
        level: course.level,
        classroom: course.classroom,
        status: course.status,
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
        studentsList.push({
          id: enr.id,
          studentId: enr.student.id,
          firstName: enr.student.firstName,
          lastName: enr.student.lastName,
          fullName: `${enr.student.firstName} ${enr.student.lastName}`,
          identification: enr.student.identification,
          email: enr.student.email,
          phone: enr.student.phone,
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
    }
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
    if (filter?.courseId) {
      const course = await db.academicCourse.findFirst({
        where: { id: filter.courseId, organizationId },
      });
      if (!course) {
        throw new Error("Curso no encontrado.");
      }
      courseInfo = { id: course.id, name: course.name, level: course.level };
    }

    let subjectInfo: any = null;
    if (filter?.subjectId) {
      const subject = await db.academicSubject.findFirst({
        where: { id: filter.subjectId, organizationId },
      });
      if (!subject) {
        throw new Error("Materia no encontrada.");
      }
      subjectInfo = { id: subject.id, name: subject.name, code: subject.code };
    }

    if (filter?.studentId) {
      const student = await db.academicStudent.findFirst({
        where: { id: filter.studentId, organizationId },
      });
      if (!student) {
        throw new Error("Estudiante no encontrado.");
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

    if (filter?.from || filter?.to) {
      sessionWhere.sessionDate = {};
      if (filter?.from) {
        sessionWhere.sessionDate.gte = new Date(filter.from);
      }
      if (filter?.to) {
        // Incluir todo el día límite
        const toDateEnd = new Date(filter.to);
        toDateEnd.setUTCHours(23, 59, 59, 999);
        sessionWhere.sessionDate.lte = toDateEnd;
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
    const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 1000) / 10 : null;

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
      attendanceRate: st.totalRecords > 0 ? Math.round((st.presentCount / st.totalRecords) * 1000) / 10 : null,
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
   * Reporte 3: Boletín / Sábana de Calificaciones (Grade Roster Matrix)
   * Matriz Estudiantes x Actividades con distinción de sin calificar vs calificado con 0.
   */
  static async getGradeReport(
    organizationId: number,
    filter?: { courseId?: number; subjectId?: number }
  ) {
    let courseInfo: any = null;
    if (filter?.courseId) {
      const course = await db.academicCourse.findFirst({
        where: { id: filter.courseId, organizationId },
      });
      if (!course) {
        throw new Error("Curso no encontrado.");
      }
      courseInfo = { id: course.id, name: course.name, level: course.level };
    }

    let subjectInfo: any = null;
    if (filter?.subjectId) {
      const subject = await db.academicSubject.findFirst({
        where: { id: filter.subjectId, organizationId },
      });
      if (!subject) {
        throw new Error("Materia no encontrada.");
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

    const activities = await db.academicActivity.findMany({
      where: activityWhere,
      include: {
        course: true,
        subject: true,
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
    for (const g of grades) {
      gradeIndex.set(`${g.activityId}:${g.studentId}`, g);
    }

    // 4. Construir matriz estudiantes x actividades
    let totalGradedScoresSum = 0;
    let totalGradedCount = 0;
    let totalMaxScoreGradedSum = 0;

    const studentMatrix = students.map((std) => {
      let studentSumScores = 0;
      let studentGradedCount = 0;
      let studentSumMaxScores = 0;

      const studentGrades = activities.map((act) => {
        const grade = gradeIndex.get(`${act.id}:${std.id}`);
        const isGraded = grade !== undefined && grade !== null;
        const score = isGraded ? grade.score : null;

        if (isGraded) {
          studentSumScores += grade.score;
          studentGradedCount += 1;
          studentSumMaxScores += act.maxScore;

          totalGradedScoresSum += grade.score;
          totalGradedCount += 1;
          totalMaxScoreGradedSum += act.maxScore;
        }

        return {
          activityId: act.id,
          activityName: act.name,
          activityType: act.type,
          maxScore: act.maxScore,
          score,
          isGraded,
          comments: grade?.comments || null,
          gradedAt: grade?.gradedAt || null,
        };
      });

      const simpleAverage =
        studentGradedCount > 0
          ? Math.round((studentSumScores / studentGradedCount) * 10) / 10
          : null;

      const normalizedPerformance =
        studentGradedCount > 0 && studentSumMaxScores > 0
          ? Math.round((studentSumScores / studentSumMaxScores) * 1000) / 10
          : null;

      return {
        studentId: std.id,
        firstName: std.firstName,
        lastName: std.lastName,
        fullName: `${std.firstName} ${std.lastName}`,
        identification: std.identification,
        status: std.status,
        gradedActivitiesCount: studentGradedCount,
        simpleAverage,
        normalizedPerformance,
        grades: studentGrades,
      };
    });

    const overallAverage =
      totalGradedCount > 0
        ? Math.round((totalGradedScoresSum / totalGradedCount) * 10) / 10
        : null;

    const overallNormalizedPerformance =
      totalGradedCount > 0 && totalMaxScoreGradedSum > 0
        ? Math.round((totalGradedScoresSum / totalMaxScoreGradedSum) * 1000) / 10
        : null;

    return {
      course: courseInfo,
      subject: subjectInfo,
      activities: activities.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        maxScore: a.maxScore,
        dueDate: a.dueDate ? a.dueDate.toISOString().split("T")[0] : null,
        subjectName: a.subject?.name || "General",
      })),
      students: studentMatrix,
      summary: {
        totalActivities: activities.length,
        totalStudents: students.length,
        totalGradesRecorded: totalGradedCount,
        overallAverage,
        overallNormalizedPerformance,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Reporte 4: Ficha Individual del Estudiante (Individual Student Report)
   * Informe integral con datos personales, historial de asistencia, calificaciones y promedios.
   */
  static async getStudentReport(organizationId: number, studentId: number) {
    const student = await db.academicStudent.findFirst({
      where: { id: studentId, organizationId },
    });
    if (!student) {
      throw new Error("Estudiante no encontrado.");
    }

    // Matrículas del estudiante
    const enrollments = await db.academicEnrollment.findMany({
      where: { studentId, organizationId },
      include: { course: true },
      orderBy: { createdAt: "desc" },
    });

    // Asistencias del estudiante
    const attendanceRecords = await db.academicAttendanceRecord.findMany({
      where: { studentId, organizationId },
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
    const attendanceRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 1000) / 10 : null;

    // Calificaciones del estudiante
    const grades = await db.academicGrade.findMany({
      where: { studentId, organizationId },
      include: {
        activity: {
          include: {
            course: true,
            subject: true,
          },
        },
      },
      orderBy: [{ activity: { dueDate: "desc" } }, { createdAt: "desc" }],
    });

    let totalScoreSum = 0;
    let totalMaxScoreSum = 0;
    for (const g of grades) {
      totalScoreSum += g.score;
      totalMaxScoreSum += g.activity.maxScore;
    }

    const simpleAverage = grades.length > 0 ? Math.round((totalScoreSum / grades.length) * 10) / 10 : null;
    const normalizedPerformance =
      grades.length > 0 && totalMaxScoreSum > 0
        ? Math.round((totalScoreSum / totalMaxScoreSum) * 1000) / 10
        : null;

    return {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        fullName: `${student.firstName} ${student.lastName}`,
        identification: student.identification,
        email: student.email,
        phone: student.phone,
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
        },
        history: grades.map((g) => ({
          id: g.id,
          activityId: g.activity.id,
          activityName: g.activity.name,
          activityType: g.activity.type,
          subjectName: g.activity.subject?.name || "Materia",
          courseName: g.activity.course.name,
          score: g.score,
          maxScore: g.activity.maxScore,
          gradedAt: g.gradedAt ? g.gradedAt.toISOString().split("T")[0] : null,
          comments: g.comments,
        })),
      },
      generatedAt: new Date().toISOString(),
    };
  }
}



