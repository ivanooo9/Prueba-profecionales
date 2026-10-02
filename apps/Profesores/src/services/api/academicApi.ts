import { apiClient } from './apiClient';
import {
  Activity,
  AttendanceRecord,
  AttendanceStatus,
  ClassSession,
  Course,
  Enrollment,
  EvaluationType,
  GradeItem,
  Student,
  Subject,
  AcademicDashboardDTO,
  RosterReportDTO,
  AttendanceReportDTO,
  GradeReportDTO,
  StudentReportDTO,
} from '../../types/teacher';


function mapCourse(raw: any): Course {
  return {
    id: String(raw.id),
    name: raw.name || '',
    level: raw.level || '',
    classroom: raw.classroom || '',
    tutorName: raw.tutorName || (raw.tutorUser ? raw.tutorUser.name : 'Sin asignar'),
    studentCount: raw.studentCount ?? (raw.enrollments ? raw.enrollments.length : 0),
    subjectsCount: raw.subjectsCount ?? (raw.subjects ? raw.subjects.length : 0),
    status: raw.status?.toLowerCase() === 'archived' ? 'archived' : 'active',
  };
}

function mapSubject(raw: any): Subject {
  return {
    id: String(raw.id),
    name: raw.name || '',
    code: raw.code || '',
    courseId: String(raw.courseId),
    courseName: raw.course ? raw.course.name : '',
    teacherName: raw.teacherUser ? raw.teacherUser.name : 'Sin asignar',
    hoursPerWeek: raw.hoursPerWeek ?? 0,
  };
}

function mapStudent(raw: any): Student {
  return {
    id: String(raw.id),
    firstName: raw.firstName || '',
    lastName: raw.lastName || '',
    identification: raw.identification || '',
    email: raw.email || '',
    phone: raw.phone || '',
    courseId: raw.courseId ? String(raw.courseId) : '',
    courseName: raw.courseName || 'Sin matrícula',
    status: raw.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active',
    attendancePercentage: 0,
    averageGrade: 0,
  };
}

function mapEnrollment(raw: any): Enrollment {
  return {
    id: String(raw.id),
    studentId: String(raw.studentId),
    courseId: String(raw.courseId),
    status: raw.status?.toLowerCase() === 'active' ? 'active' : 'inactive',
    enrollmentDate: raw.enrollmentDate
      ? new Date(raw.enrollmentDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  };
}

function mapClassSession(raw: any): ClassSession {
  const sessionDateStr = raw.sessionDate
    ? new Date(raw.sessionDate).toISOString().split('T')[0]
    : '';

  const timeStr = raw.startTime && raw.endTime
    ? `${raw.startTime} - ${raw.endTime}`
    : raw.startTime || raw.endTime || '08:00 - 09:30';

  let status: 'scheduled' | 'in_progress' | 'completed' | 'canceled' = 'scheduled';
  const statusLower = (raw.status || '').toLowerCase();
  if (statusLower === 'in_progress') status = 'in_progress';
  else if (statusLower === 'completed') status = 'completed';
  else if (statusLower === 'cancelled' || statusLower === 'canceled') status = 'canceled';

  return {
    id: String(raw.id),
    courseId: String(raw.courseId),
    courseName: raw.course?.name || 'Curso',
    subjectId: raw.subjectId ? String(raw.subjectId) : '',
    subjectName: raw.subject?.name || 'Materia General',
    date: sessionDateStr,
    time: timeStr,
    room: raw.room || raw.course?.classroom || 'Aula general',
    status,
    topic: raw.topic || '',
  };
}

function mapAttendanceRecord(raw: any): AttendanceRecord {
  const dateStr = raw.date || (raw.session?.sessionDate ? new Date(raw.session.sessionDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  const statusLower = (raw.status || 'present').toLowerCase() as AttendanceStatus;

  return {
    id: String(raw.id),
    sessionId: raw.sessionId ? String(raw.sessionId) : undefined,
    studentId: String(raw.studentId),
    studentName: raw.studentName || (raw.student ? `${raw.student.firstName} ${raw.student.lastName}` : 'Estudiante'),
    courseId: String(raw.courseId || raw.session?.courseId || ''),
    subjectId: String(raw.subjectId || raw.session?.subjectId || ''),
    date: dateStr,
    status: statusLower,
    observation: raw.observation || undefined,
  };
}

function mapActivity(raw: any): Activity {
  const typeLower = (raw.type || 'homework').toLowerCase() as EvaluationType;
  const dateStr = raw.dueDate
    ? new Date(raw.dueDate).toISOString().split('T')[0]
    : raw.createdAt
    ? new Date(raw.createdAt).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  return {
    id: String(raw.id),
    courseId: String(raw.courseId),
    subjectId: String(raw.subjectId),
    name: raw.name || '',
    type: typeLower,
    date: dateStr,
    maxScore: typeof raw.maxScore === 'number' ? raw.maxScore : Number(raw.maxScore),
  };
}

function mapGradeItem(raw: any): GradeItem {
  const activity = raw.activity || {};
  const student = raw.student || {};
  const course = activity.course || {};
  const subject = activity.subject || {};

  const typeLower = (activity.type || raw.evaluationType || 'homework').toLowerCase() as EvaluationType;
  const dateStr = raw.gradedAt
    ? new Date(raw.gradedAt).toISOString().split('T')[0]
    : activity.dueDate
    ? new Date(activity.dueDate).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const rawMaxScore = typeof activity.maxScore === 'number' ? activity.maxScore : (typeof raw.maxScore === 'number' ? raw.maxScore : (activity.maxScore ? Number(activity.maxScore) : Number(raw.maxScore)));

  return {
    id: String(raw.id),
    evaluationId: String(raw.activityId || activity.id || ''),
    studentId: String(raw.studentId || student.id || ''),
    studentName: raw.studentName || (student.firstName && student.lastName ? `${student.firstName} ${student.lastName}` : 'Estudiante'),
    courseId: String(activity.courseId || course.id || ''),
    subjectId: String(activity.subjectId || subject.id || ''),
    subjectName: raw.subjectName || subject.name || 'Materia',
    evaluationName: raw.evaluationName || activity.name || 'Evaluación',
    evaluationType: typeLower,
    score: typeof raw.score === 'number' ? raw.score : Number(raw.score) || 0,
    maxScore: rawMaxScore,
    date: dateStr,
    comments: raw.comments || undefined,
  };
}

function mapDashboard(raw: any): AcademicDashboardDTO {
  return {
    teacherName: raw.teacherName || 'Docente',
    activeCoursesCount: raw.activeCoursesCount ?? 0,
    totalCoursesCount: raw.totalCoursesCount ?? 0,
    activeStudentsCount: raw.activeStudentsCount ?? 0,
    totalStudentsCount: raw.totalStudentsCount ?? 0,
    todaySessionsCount: raw.todaySessionsCount ?? 0,
    todaySessions: Array.isArray(raw.todaySessions) ? raw.todaySessions.map(mapClassSession) : [],
    upcomingActivities: Array.isArray(raw.upcomingActivities) ? raw.upcomingActivities.map(mapActivity) : [],
    recentGrades: Array.isArray(raw.recentGrades) ? raw.recentGrades.map(mapGradeItem) : [],
    attendanceSummary: {
      totalRecords: raw.attendanceSummary?.totalRecords ?? 0,
      presentCount: raw.attendanceSummary?.presentCount ?? 0,
      absentCount: raw.attendanceSummary?.absentCount ?? 0,
      lateCount: raw.attendanceSummary?.lateCount ?? 0,
      excusedCount: raw.attendanceSummary?.excusedCount ?? 0,
      attendanceRate: raw.attendanceSummary?.attendanceRate ?? null,
    },
    performanceSummary: {
      totalGradesCount: raw.performanceSummary?.totalGradesCount ?? 0,
      averageScore: raw.performanceSummary?.averageScore ?? null,
      normalizedPerformance: raw.performanceSummary?.normalizedPerformance ?? null,
    },
    academicAlerts: Array.isArray(raw.academicAlerts)
      ? raw.academicAlerts.map((a: any) => ({
          id: String(a.id),
          studentId: a.studentId ? String(a.studentId) : undefined,
          studentName: a.studentName || undefined,
          courseId: a.courseId ? String(a.courseId) : undefined,
          courseName: a.courseName || undefined,
          type: a.type || 'low_grade',
          severity: a.severity || 'medium',
          description: a.description || '',
          date: a.date
            ? typeof a.date === 'string'
              ? a.date.split('T')[0]
              : new Date(a.date).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
        }))
      : [],
  };
}



export const academicApi = {
  // ============================================================================
  // CURSOS
  // ============================================================================

  async getCourses(
    orgId: number,
    filter?: { status?: string; search?: string }
  ): Promise<Course[]> {
    const params = new URLSearchParams();
    if (filter?.status) params.append('status', filter.status);
    if (filter?.search) params.append('search', filter.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiClient.get<any[]>(
      `/api/organizations/${orgId}/academic/courses${query}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al obtener cursos.');
    }

    return response.data.map(mapCourse);
  },

  async getCourseById(orgId: number, courseId: number | string): Promise<Course> {
    const response = await apiClient.get<any>(
      `/api/organizations/${orgId}/academic/courses/${courseId}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Curso no encontrado.');
    }
    return mapCourse(response.data);
  },

  async createCourse(
    orgId: number,
    data: { name: string; level: string; classroom?: string; tutorUserId?: number | null }
  ): Promise<Course> {
    const response = await apiClient.post<any>(
      `/api/organizations/${orgId}/academic/courses`,
      data
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al crear curso.');
    }
    return mapCourse(response.data);
  },

  async updateCourse(
    orgId: number,
    courseId: number | string,
    data: { name?: string; level?: string; classroom?: string; tutorUserId?: number | null }
  ): Promise<Course> {
    const response = await apiClient.put<any>(
      `/api/organizations/${orgId}/academic/courses/${courseId}`,
      data
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al actualizar curso.');
    }
    return mapCourse(response.data);
  },

  async archiveCourse(orgId: number, courseId: number | string): Promise<void> {
    const response = await apiClient.patch(
      `/api/organizations/${orgId}/academic/courses/${courseId}/archive`
    );
    if (!response.success) {
      throw new Error(response.error || 'Error al archivar curso.');
    }
  },

  // ============================================================================
  // ASIGNATURAS / MATERIAS
  // ============================================================================

  async getSubjectsByCourse(
    orgId: number,
    courseId: number | string
  ): Promise<Subject[]> {
    const response = await apiClient.get<any[]>(
      `/api/organizations/${orgId}/academic/courses/${courseId}/subjects`
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al obtener materias.');
    }
    return response.data.map(mapSubject);
  },

  async createSubject(
    orgId: number,
    courseId: number | string,
    data: { name: string; code?: string; hoursPerWeek?: number | null; teacherUserId?: number | null }
  ): Promise<Subject> {
    const response = await apiClient.post<any>(
      `/api/organizations/${orgId}/academic/courses/${courseId}/subjects`,
      data
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al registrar materia.');
    }
    return mapSubject(response.data);
  },

  async updateSubject(
    orgId: number,
    subjectId: number | string,
    data: { name?: string; code?: string; hoursPerWeek?: number | null; teacherUserId?: number | null }
  ): Promise<Subject> {
    const response = await apiClient.put<any>(
      `/api/organizations/${orgId}/academic/subjects/${subjectId}`,
      data
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al actualizar materia.');
    }
    return mapSubject(response.data);
  },

  async inactivateSubject(orgId: number, subjectId: number | string): Promise<void> {
    const response = await apiClient.patch(
      `/api/organizations/${orgId}/academic/subjects/${subjectId}/inactivate`
    );
    if (!response.success) {
      throw new Error(response.error || 'Error al inactivar materia.');
    }
  },

  // ============================================================================
  // ESTUDIANTES
  // ============================================================================

  async getStudents(
    orgId: number,
    filter?: { status?: string; courseId?: number | string; search?: string }
  ): Promise<Student[]> {
    const params = new URLSearchParams();
    if (filter?.status) params.append('status', filter.status);
    if (filter?.courseId) params.append('courseId', String(filter.courseId));
    if (filter?.search) params.append('search', filter.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiClient.get<any[]>(
      `/api/organizations/${orgId}/academic/students${query}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al obtener estudiantes.');
    }

    return response.data.map(mapStudent);
  },

  async getStudentById(orgId: number, studentId: number | string): Promise<Student> {
    const response = await apiClient.get<any>(
      `/api/organizations/${orgId}/academic/students/${studentId}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Estudiante no encontrado.');
    }
    return mapStudent(response.data);
  },

  async createStudent(
    orgId: number,
    data: {
      firstName: string;
      lastName: string;
      identification?: string | null;
      email?: string | null;
      phone?: string | null;
    }
  ): Promise<Student> {
    const response = await apiClient.post<any>(
      `/api/organizations/${orgId}/academic/students`,
      data
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al registrar estudiante.');
    }
    return mapStudent(response.data);
  },

  async updateStudent(
    orgId: number,
    studentId: number | string,
    data: {
      firstName?: string;
      lastName?: string;
      identification?: string | null;
      email?: string | null;
      phone?: string | null;
    }
  ): Promise<Student> {
    const response = await apiClient.put<any>(
      `/api/organizations/${orgId}/academic/students/${studentId}`,
      data
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al actualizar estudiante.');
    }
    return mapStudent(response.data);
  },

  async inactivateStudent(orgId: number, studentId: number | string): Promise<void> {
    const response = await apiClient.patch(
      `/api/organizations/${orgId}/academic/students/${studentId}/inactivate`
    );
    if (!response.success) {
      throw new Error(response.error || 'Error al inactivar estudiante.');
    }
  },

  // ============================================================================
  // MATRÍCULAS
  // ============================================================================

  async getEnrollments(
    orgId: number,
    filter?: { courseId?: number | string; studentId?: number | string; status?: string }
  ): Promise<Enrollment[]> {
    const params = new URLSearchParams();
    if (filter?.courseId) params.append('courseId', String(filter.courseId));
    if (filter?.studentId) params.append('studentId', String(filter.studentId));
    if (filter?.status) params.append('status', filter.status);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiClient.get<any[]>(
      `/api/organizations/${orgId}/academic/enrollments${query}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al obtener matrículas.');
    }

    return response.data.map(mapEnrollment);
  },

  async enrollStudent(
    orgId: number,
    studentId: number | string,
    courseId: number | string,
    period?: string | null
  ): Promise<Enrollment> {
    const response = await apiClient.post<any>(
      `/api/organizations/${orgId}/academic/enrollments`,
      {
        studentId: Number(studentId),
        courseId: Number(courseId),
        period,
      }
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al procesar matrícula.');
    }
    return mapEnrollment(response.data);
  },

  async updateEnrollmentStatus(
    orgId: number,
    enrollmentId: number | string,
    status: string
  ): Promise<Enrollment> {
    const response = await apiClient.patch<any>(
      `/api/organizations/${orgId}/academic/enrollments/${enrollmentId}/status`,
      { status }
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al actualizar matrícula.');
    }
    return mapEnrollment(response.data);
  },

  // ============================================================================
  // SESIONES DE CLASE (FASE 2)
  // ============================================================================

  async getSessions(
    orgId: number,
    filter?: { courseId?: number | string; subjectId?: number | string; status?: string; date?: string; search?: string }
  ): Promise<ClassSession[]> {
    const params = new URLSearchParams();
    if (filter?.courseId) params.append('courseId', String(filter.courseId));
    if (filter?.subjectId) params.append('subjectId', String(filter.subjectId));
    if (filter?.status) params.append('status', filter.status);
    if (filter?.date) params.append('date', filter.date);
    if (filter?.search) params.append('search', filter.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiClient.get<any[]>(
      `/api/organizations/${orgId}/academic/sessions${query}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al obtener sesiones de clase.');
    }

    return response.data.map(mapClassSession);
  },

  async getSessionById(orgId: number, sessionId: number | string): Promise<ClassSession & { attendanceRecords: AttendanceRecord[] }> {
    const response = await apiClient.get<any>(
      `/api/organizations/${orgId}/academic/sessions/${sessionId}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Sesión de clase no encontrada.');
    }
    const session = mapClassSession(response.data);
    const attendanceRecords = Array.isArray(response.data.attendanceRecords)
      ? response.data.attendanceRecords.map(mapAttendanceRecord)
      : [];
    return {
      ...session,
      attendanceRecords,
    };
  },

  async createSession(
    orgId: number,
    courseId: number | string,
    data: {
      subjectId?: number | string | null;
      teacherUserId?: number | string | null;
      sessionDate: string;
      startTime?: string | null;
      endTime?: string | null;
      room?: string | null;
      topic?: string | null;
    }
  ): Promise<ClassSession> {
    const response = await apiClient.post<any>(
      `/api/organizations/${orgId}/academic/courses/${courseId}/sessions`,
      {
        ...data,
        subjectId: data.subjectId ? Number(data.subjectId) : null,
        teacherUserId: data.teacherUserId ? Number(data.teacherUserId) : null,
      }
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al programar sesión de clase.');
    }
    return mapClassSession(response.data);
  },

  async updateSession(
    orgId: number,
    sessionId: number | string,
    data: {
      subjectId?: number | string | null;
      teacherUserId?: number | string | null;
      sessionDate?: string;
      startTime?: string | null;
      endTime?: string | null;
      room?: string | null;
      topic?: string | null;
      status?: string;
    }
  ): Promise<ClassSession> {
    const response = await apiClient.put<any>(
      `/api/organizations/${orgId}/academic/sessions/${sessionId}`,
      {
        ...data,
        subjectId: data.subjectId !== undefined ? (data.subjectId ? Number(data.subjectId) : null) : undefined,
        teacherUserId: data.teacherUserId !== undefined ? (data.teacherUserId ? Number(data.teacherUserId) : null) : undefined,
      }
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al actualizar sesión de clase.');
    }
    return mapClassSession(response.data);
  },

  async cancelSession(orgId: number, sessionId: number | string): Promise<void> {
    const response = await apiClient.patch(
      `/api/organizations/${orgId}/academic/sessions/${sessionId}/cancel`
    );
    if (!response.success) {
      throw new Error(response.error || 'Error al cancelar sesión de clase.');
    }
  },

  // ============================================================================
  // REGISTRO Y CONTROL DE ASISTENCIA (FASE 2)
  // ============================================================================

  async saveAttendanceBatch(
    orgId: number,
    sessionId: number | string,
    records: { studentId: number | string; status: AttendanceStatus; observation?: string | null }[]
  ): Promise<AttendanceRecord[]> {
    const response = await apiClient.post<any[]>(
      `/api/organizations/${orgId}/academic/sessions/${sessionId}/attendance`,
      {
        records: records.map((r) => ({
          studentId: Number(r.studentId),
          status: r.status,
          observation: r.observation || null,
        })),
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al registrar asistencia.');
    }

    return response.data.map(mapAttendanceRecord);
  },

  async getAttendanceBySession(
    orgId: number,
    sessionId: number | string
  ): Promise<AttendanceRecord[]> {
    const response = await apiClient.get<any[]>(
      `/api/organizations/${orgId}/academic/sessions/${sessionId}/attendance`
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al consultar asistencia de la sesión.');
    }
    return response.data.map(mapAttendanceRecord);
  },

  async getAttendanceHistory(
    orgId: number,
    filter?: {
      courseId?: number | string;
      subjectId?: number | string;
      studentId?: number | string;
      date?: string;
      status?: string;
    }
  ): Promise<AttendanceRecord[]> {
    const params = new URLSearchParams();
    if (filter?.courseId) params.append('courseId', String(filter.courseId));
    if (filter?.subjectId) params.append('subjectId', String(filter.subjectId));
    if (filter?.studentId) params.append('studentId', String(filter.studentId));
    if (filter?.date) params.append('date', filter.date);
    if (filter?.status) params.append('status', filter.status);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiClient.get<any[]>(
      `/api/organizations/${orgId}/academic/attendance/history${query}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al obtener historial de asistencia.');
    }

    return response.data.map(mapAttendanceRecord);
  },

  async updateAttendanceRecord(
    orgId: number,
    attendanceId: number | string,
    data: { status?: AttendanceStatus; observation?: string | null }
  ): Promise<AttendanceRecord> {
    const response = await apiClient.patch<any>(
      `/api/organizations/${orgId}/academic/attendance/${attendanceId}`,
      data
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al actualizar registro de asistencia.');
    }
    return mapAttendanceRecord(response.data);
  },

  // ============================================================================
  // ACTIVIDADES Y EVALUACIONES (FASE 3)
  // ============================================================================

  async getActivities(
    orgId: number,
    filter?: {
      courseId?: number | string;
      subjectId?: number | string;
      type?: string;
      search?: string;
    }
  ): Promise<Activity[]> {
    const params = new URLSearchParams();
    if (filter?.courseId) params.append('courseId', String(filter.courseId));
    if (filter?.subjectId) params.append('subjectId', String(filter.subjectId));
    if (filter?.type) params.append('type', filter.type);
    if (filter?.search) params.append('search', filter.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiClient.get<any[]>(
      `/api/organizations/${orgId}/academic/activities${query}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al obtener actividades.');
    }

    return response.data.map(mapActivity);
  },

  async getActivityById(
    orgId: number,
    activityId: number | string
  ): Promise<Activity> {
    const response = await apiClient.get<any>(
      `/api/organizations/${orgId}/academic/activities/${activityId}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al obtener detalle de la actividad.');
    }
    return mapActivity(response.data);
  },

  async createActivity(
    orgId: number,
    courseId: number | string,
    data: {
      subjectId: number | string;
      name: string;
      description?: string | null;
      type?: string;
      dueDate?: string | null;
      maxScore: number;
      teacherUserId?: number | string | null;
    }
  ): Promise<Activity> {
    const response = await apiClient.post<any>(
      `/api/organizations/${orgId}/academic/courses/${courseId}/activities`,
      {
        ...data,
        subjectId: Number(data.subjectId),
        maxScore: Number(data.maxScore),
        teacherUserId: data.teacherUserId ? Number(data.teacherUserId) : null,
      }
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al crear la actividad.');
    }
    return mapActivity(response.data);
  },

  async updateActivity(
    orgId: number,
    activityId: number | string,
    data: {
      name?: string;
      description?: string | null;
      type?: string;
      dueDate?: string | null;
      maxScore?: number;
      teacherUserId?: number | string | null;
    }
  ): Promise<Activity> {
    const response = await apiClient.put<any>(
      `/api/organizations/${orgId}/academic/activities/${activityId}`,
      {
        ...data,
        maxScore: data.maxScore !== undefined ? Number(data.maxScore) : undefined,
        teacherUserId: data.teacherUserId !== undefined ? (data.teacherUserId ? Number(data.teacherUserId) : null) : undefined,
      }
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al actualizar la actividad.');
    }
    return mapActivity(response.data);
  },

  // ============================================================================
  // CALIFICACIONES Y EVALUACIONES (FASE 3)
  // ============================================================================

  async saveGradesBatch(
    orgId: number,
    activityId: number | string,
    grades: { studentId: number | string; score: number; comments?: string | null }[]
  ): Promise<GradeItem[]> {
    const response = await apiClient.post<any[]>(
      `/api/organizations/${orgId}/academic/activities/${activityId}/grades`,
      {
        grades: grades.map((g) => ({
          studentId: Number(g.studentId),
          score: Number(g.score),
          comments: g.comments || null,
        })),
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al guardar calificaciones.');
    }

    return response.data.map(mapGradeItem);
  },

  async getGradesByActivity(
    orgId: number,
    activityId: number | string
  ): Promise<GradeItem[]> {
    const response = await apiClient.get<any[]>(
      `/api/organizations/${orgId}/academic/activities/${activityId}/grades`
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al obtener calificaciones de la actividad.');
    }
    return response.data.map(mapGradeItem);
  },

  async getGradesHistory(
    orgId: number,
    filter?: {
      courseId?: number | string;
      subjectId?: number | string;
      activityId?: number | string;
      studentId?: number | string;
    }
  ): Promise<GradeItem[]> {
    const params = new URLSearchParams();
    if (filter?.courseId) params.append('courseId', String(filter.courseId));
    if (filter?.subjectId) params.append('subjectId', String(filter.subjectId));
    if (filter?.activityId) params.append('activityId', String(filter.activityId));
    if (filter?.studentId) params.append('studentId', String(filter.studentId));

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiClient.get<any[]>(
      `/api/organizations/${orgId}/academic/grades/history${query}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al consultar historial de calificaciones.');
    }

    return response.data.map(mapGradeItem);
  },

  async getStudentGrades(
    orgId: number,
    studentId: number | string
  ): Promise<GradeItem[]> {
    const response = await apiClient.get<any[]>(
      `/api/organizations/${orgId}/academic/students/${studentId}/grades`
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al obtener expediente de calificaciones del estudiante.');
    }
    return response.data.map(mapGradeItem);
  },

  async updateGradeRecord(
    orgId: number,
    gradeId: number | string,
    data: { score?: number; comments?: string | null }
  ): Promise<GradeItem> {
    const response = await apiClient.patch<any>(
      `/api/organizations/${orgId}/academic/grades/${gradeId}`,
      {
        ...data,
        score: data.score !== undefined ? Number(data.score) : undefined,
      }
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al actualizar calificación.');
    }
    return mapGradeItem(response.data);
  },

  // ============================================================================
  // DASHBOARD & AGENDA
  // ============================================================================

  async getDashboard(orgId: number): Promise<AcademicDashboardDTO> {
    const response = await apiClient.get<any>(
      `/api/organizations/${orgId}/academic/dashboard`
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al obtener datos del dashboard académico.');
    }
    return mapDashboard(response.data);
  },

  // ============================================================================
  // REPORTES ACADÉMICOS REALES (FASE 5)
  // ============================================================================

  async getRosterReport(
    orgId: number,
    filter?: { courseId?: number | string; status?: string }
  ): Promise<RosterReportDTO> {
    const params = new URLSearchParams();
    if (filter?.courseId) params.append('courseId', String(filter.courseId));
    if (filter?.status) params.append('status', filter.status);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiClient.get<RosterReportDTO>(
      `/api/organizations/${orgId}/academic/reports/roster${query}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al generar nómina de estudiantes.');
    }
    return response.data;
  },

  async getAttendanceReport(
    orgId: number,
    filter?: {
      courseId?: number | string;
      subjectId?: number | string;
      studentId?: number | string;
      from?: string;
      to?: string;
    }
  ): Promise<AttendanceReportDTO> {
    const params = new URLSearchParams();
    if (filter?.courseId) params.append('courseId', String(filter.courseId));
    if (filter?.subjectId) params.append('subjectId', String(filter.subjectId));
    if (filter?.studentId) params.append('studentId', String(filter.studentId));
    if (filter?.from) params.append('from', filter.from);
    if (filter?.to) params.append('to', filter.to);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiClient.get<AttendanceReportDTO>(
      `/api/organizations/${orgId}/academic/reports/attendance${query}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al generar reporte consolidado de asistencia.');
    }
    return response.data;
  },

  async getGradeReport(
    orgId: number,
    filter?: { courseId?: number | string; subjectId?: number | string }
  ): Promise<GradeReportDTO> {
    const params = new URLSearchParams();
    if (filter?.courseId) params.append('courseId', String(filter.courseId));
    if (filter?.subjectId) params.append('subjectId', String(filter.subjectId));

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiClient.get<GradeReportDTO>(
      `/api/organizations/${orgId}/academic/reports/grades${query}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al generar boletín de calificaciones.');
    }
    return response.data;
  },

  async getStudentReport(
    orgId: number,
    studentId: number | string
  ): Promise<StudentReportDTO> {
    const response = await apiClient.get<StudentReportDTO>(
      `/api/organizations/${orgId}/academic/reports/students/${studentId}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al generar ficha individual del estudiante.');
    }
    return response.data;
  },
};



