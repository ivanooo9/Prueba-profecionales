export type NavigationTab =
  | 'dashboard'
  | 'students'
  | 'courses'
  | 'attendance'
  | 'grades'
  | 'classes'
  | 'reports'
  | 'settings';

export type StudentStatus = 'active' | 'inactive' | 'warning';

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  identification: string;
  email: string;
  phone: string;
  courseId: string;
  courseName: string;
  status: StudentStatus;
  attendancePercentage: number;
  averageGrade: number;
  avatar?: string;
}

export type EnrollmentStatus = 'active' | 'inactive';

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  academicYearId?: string;
  academicYearName?: string;
  status: EnrollmentStatus;
  enrollmentDate: string;
}

export interface Course {
  id: string;
  name: string; // e.g. "1ro A"
  level: string; // e.g. "Educación General Básica"
  studentCount: number;
  subjectsCount: number;
  classroom: string; // e.g. "Aula 204"
  tutorName: string;
  status: 'active' | 'archived';
}

export interface CourseDependenciesDTO {
  courseId: number;
  courseName: string;
  level: string;
  status: string;
  canDelete: boolean;
  reason: string | null;
  dependencies: {
    enrollments: number;
    subjects: number;
    activities: number;
    grades: number;
    evaluationSchemes: number;
    classSessions: number;
  };
}

export type SubjectScheduleStatus = 'no_schedule' | 'incomplete' | 'complete' | 'excess';

export interface ScheduleSlot {
  id?: string;
  dayOfWeek: number; // 1 = Lunes ... 7 = Domingo
  startTime: string; // "07:00"
  endTime: string;   // "08:30"
  pedagogicalHours: number;
  room?: string;
  teacherUserId?: string;
  teacherName?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  status?: string;
}

export interface SubjectScheduleDTO {
  subject: {
    id: string;
    name: string;
    code: string;
    courseId: string;
    courseName: string;
    hoursPerWeek: number;
    teacherUserId?: string;
    teacherName: string;
  };
  activeSlots: ScheduleSlot[];
  scheduleStatus: SubjectScheduleStatus;
  totalPedagogicalHours: number;
  hoursPerWeek: number;
  history?: ScheduleSlot[];
}

export interface ScheduleSlotFormData {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  pedagogicalHours: number;
  room?: string;
  teacherUserId?: string;
}

export interface SubjectFormData {
  name: string;
  code?: string;
  hoursPerWeek?: number;
  teacherUserId?: number | null;
  academicYearId?: number;
  effectiveFrom?: string;
  scheduleSlots?: ScheduleSlotFormData[];
}

export interface Subject {
  id: string;
  name: string; // e.g. "Matemáticas"
  code: string; // e.g. "MAT-101"
  courseId: string;
  courseName: string;
  teacherName: string;
  teacherUserId?: string;
  hoursPerWeek: number;
  iconName?: string;
  scheduleStatus?: SubjectScheduleStatus;
  totalPedagogicalHours?: number;
  activeSlots?: ScheduleSlot[];
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  courseId: string;
  subjectId: string;
  sessionId?: string;
  date: string;
  status: AttendanceStatus;
  observation?: string;
}

export interface AttendanceContext {
  courseId: string;
  subjectId: string;
  date: string;
  sessionId?: string;
}

export type EvaluationType =
  | 'homework'
  | 'exam'
  | 'project'
  | 'practice'
  | 'participation'
  | 'activity'
  | 'lesson';

export interface Activity {
  id: string;
  courseId: string;
  subjectId: string;
  name: string;
  type: EvaluationType;
  date: string;
  maxScore: number;
  academicPeriodId?: string;
  evaluationSchemeId?: string;
  categoryId?: string;
  categoryName?: string;
}

export type Evaluation = Activity;

export interface GradeItem {
  id: string;
  evaluationId?: string;
  studentId: string;
  studentName: string;
  courseId: string;
  subjectId: string;
  subjectName: string;
  evaluationName: string;
  evaluationType: EvaluationType;
  score: number;
  maxScore: number;
  date: string;
  comments?: string;
}

export interface GradeDraft {
  evaluationId: string;
  studentId: string;
  score: number;
  comments?: string;
}

export interface ClassSession {
  id: string;
  subjectName: string;
  courseName: string;
  courseId: string;
  subjectId: string;
  date: string;
  time: string;
  room: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'canceled';
  topic?: string;
}

export interface AcademicAlert {
  id: string;
  studentId?: string;
  studentName?: string;
  courseName: string;
  type: 'low_attendance' | 'low_grade' | 'pending_evaluation';
  description: string;
  severity: 'high' | 'medium' | 'low';
  date: string;
}

export interface TeacherProfile {
  id: string;
  name: string;
  title: string;
  institution: string;
  avatar: string;
  email: string;
}

export interface AcademicDashboardDTO {
  teacherName: string;
  activeCoursesCount: number;
  totalCoursesCount: number;
  activeStudentsCount: number;
  totalStudentsCount: number;
  todaySessionsCount: number;
  todaySessions: ClassSession[];
  upcomingActivities: Activity[];
  recentGrades: GradeItem[];
  attendanceSummary: {
    totalRecords: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
    attendanceRate: number | null;
  };
  performanceSummary: {
    totalGradesCount: number;
    averageScore: number | null;
    normalizedPerformance: number | null;
  };
  academicAlerts: {
    id: string;
    studentId?: string;
    studentName?: string;
    courseId?: string;
    courseName?: string;
    type: string;
    severity: string;
    description: string;
    date: string;
  }[];
}

// ============================================================================
// REPORTES ACADÉMICOS FACTUALES (FASE 5)
// ============================================================================

export interface RosterStudentItem {
  id: number;
  studentId: number;
  firstName: string;
  lastName: string;
  fullName: string;
  identification: string;
  email: string | null;
  phone: string | null;
  status: string;
  enrollmentStatus?: string;
  enrolledAt?: string | null;
  courseId?: number;
  courseName?: string;
  courseLevel?: string;
}

export interface RosterReportDTO {
  course: {
    id: number;
    name: string;
    level: string;
    classroom?: string;
    status: string;
  } | null;
  totalStudents: number;
  uniqueStudentsCount: number;
  activeStudentsCount: number;
  students: RosterStudentItem[];
  generatedAt: string;
}

export interface AttendanceReportSummary {
  totalSessions: number;
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendanceRate: number | null;
}

export interface AttendanceStudentSummary {
  studentId: number;
  firstName: string;
  lastName: string;
  fullName: string;
  identification: string;
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendanceRate: number | null;
}

export interface AttendanceRecordItemDTO {
  id: number;
  sessionId: number;
  studentId: number;
  studentName: string;
  identification: string;
  sessionDate: string;
  courseName: string;
  subjectName: string;
  status: AttendanceStatus;
  observation?: string | null;
}

export interface AttendanceReportDTO {
  course: { id: number; name: string; level: string } | null;
  subject: { id: number; name: string; code?: string } | null;
  dateRange: { from: string | null; to: string | null };
  summary: AttendanceReportSummary;
  studentSummaries: AttendanceStudentSummary[];
  records: AttendanceRecordItemDTO[];
  generatedAt: string;
}

export interface GradeMatrixActivityItem {
  id: number;
  name: string;
  type: string;
  maxScore: number;
  dueDate: string | null;
  subjectName?: string;
}

export interface GradeMatrixStudentGrade {
  activityId: number;
  activityName: string;
  activityType: string;
  maxScore: number;
  score: number | null;
  isGraded: boolean;
  comments?: string | null;
  gradedAt?: string | null;
  status?: string;
  academicPeriodId?: number | null;
  academicPeriodStatus?: string | null;
}

export interface GradeMatrixStudentItem {
  studentId: number;
  firstName: string;
  lastName: string;
  fullName: string;
  identification: string;
  status: string;
  gradedActivitiesCount: number;
  simpleAverage: number | null;
  normalizedPerformance: number | null;
  isProvisional?: boolean;
  finalityStatus?: string;
  grades: GradeMatrixStudentGrade[];
}

export interface GradeReportDTO {
  course: { id: number; name: string; level: string } | null;
  subject: { id: number; name: string; code?: string } | null;
  activities: GradeMatrixActivityItem[];
  students: GradeMatrixStudentItem[];
  summary: {
    totalActivities: number;
    totalStudents: number;
    totalGradesRecorded: number;
    overallAverage: number | null;
    overallNormalizedPerformance: number | null;
    isProvisional?: boolean;
    finalityStatus?: string;
  };
  generatedAt: string;
}

export interface StudentReportDTO {
  student: {
    id: number;
    firstName: string;
    lastName: string;
    fullName: string;
    identification: string;
    email: string | null;
    phone: string | null;
    status: string;
    createdAt: string;
  };
  enrollments: {
    id: number;
    courseId: number;
    courseName: string;
    courseLevel: string;
    status: string;
    enrolledAt: string | null;
  }[];
  attendance: {
    summary: AttendanceReportSummary;
    history: {
      id: number;
      sessionDate: string;
      courseName: string;
      subjectName: string;
      status: AttendanceStatus;
      observation?: string | null;
    }[];
  };
  grades: {
    summary: {
      totalGradesCount: number;
      simpleAverage: number | null;
      normalizedPerformance: number | null;
      isProvisional?: boolean;
      finalityStatus?: string;
    };
    history: {
      id: number;
      activityId: number;
      activityName: string;
      activityType: string;
      subjectName: string;
      courseName: string;
      score: number | null;
      maxScore: number;
      gradedAt: string | null;
      comments?: string | null;
      status?: string;
      academicPeriodId?: number | null;
      academicPeriodStatus?: string | null;
      isProvisional?: boolean;
      finalityStatus?: string;
    }[];
  };
  generatedAt: string;
}

// ============================================================================
// ARQUITECTURA ACADÉMICA MULTINIVEL (FASE 3/4/5)
// ============================================================================

export type AcademicYearStatus = 'PLANNED' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';

export type AcademicPeriodType =
  | 'YEAR'
  | 'SEMESTER'
  | 'QUIMESTER'
  | 'TRIMESTER'
  | 'BIMESTER'
  | 'PARTIAL';

export type AcademicPeriodStatus = 'ACTIVE' | 'LOCKED' | 'CLOSED' | 'ARCHIVED';

export type AcademicEvaluationSchemeStatus =
  | 'DRAFT'
  | 'VALID'
  | 'LOCKED'
  | 'CLOSED';

export type AcademicGradeStatus = 'PENDING' | 'GRADED' | 'ABSENT' | 'EXCUSED';

export interface AcademicYear {
  id: number;
  organizationId?: number;
  name: string;
  startDate: string;
  endDate: string;
  status: AcademicYearStatus;
  periods?: AcademicPeriod[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AcademicPeriod {
  id: number;
  organizationId?: number;
  academicYearId: number;
  parentId?: number | null;
  name: string;
  type: AcademicPeriodType;
  order: number;
  startDate: string;
  endDate: string;
  status: AcademicPeriodStatus;
  academicYear?: AcademicYear;
  parent?: AcademicPeriod | null;
  children?: AcademicPeriod[];
}

export interface PeriodClosureBlocker {
  type: 'PENDING_GRADES' | 'ABSENT_GRADES' | 'INVALID_SCHEMES' | 'INCOMPLETE_WEIGHTS';
  message: string;
  count: number;
  details?: any[];
}

export interface PeriodClosureWarning {
  type: 'EXCUSED_GRADES_PRESENT' | 'NO_ACTIVITIES';
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

export interface AcademicEvaluationCategory {
  id: number;
  evaluationSchemeId: number;
  name: string;
  weightPercentage: number;
  order: number;
}

export interface AcademicEvaluationScheme {
  id: number;
  organizationId?: number;
  courseId: number;
  subjectId: number;
  academicPeriodId: number;
  maxScale: number;
  minPassingScore: number;
  status: AcademicEvaluationSchemeStatus;
  categories: AcademicEvaluationCategory[];
  course?: { id: number; name: string; level: string };
  subject?: { id: number; name: string; code?: string };
  academicPeriod?: { id: number; name: string; type: AcademicPeriodType };
}

export interface PeriodGradesMatrixActivityScore {
  activityId: number;
  activityName: string;
  activityType?: string;
  maxScore: number;
  score: number | null;
  status: AcademicGradeStatus;
}

export interface PeriodGradesMatrixCategory {
  categoryId: number;
  categoryName: string;
  weightPercentage: number;
  isEvaluated: boolean;
  activitiesCount: number;
  gradedCount: number;
  categoryAverage: number | null;
  weightedContribution: number;
  activities: PeriodGradesMatrixActivityScore[];
}

export interface PeriodGradesMatrixStudent {
  studentId: number;
  enrollmentId: number;
  identification: string;
  lastName: string;
  firstName: string;
  fullName: string;
  evaluatedWeightPercentage: number;
  isComplete: boolean;
  isProvisional?: boolean;
  isPassing: boolean;
  definitiveGrade: number;
  provisionalAverage: number | null;
  categories: PeriodGradesMatrixCategory[];
}

export interface PeriodGradesMatrixDTO {
  course: { id: number; name: string; level: string };
  subject: { id: number; name: string; code?: string };
  period: { id: number; name: string; type: AcademicPeriodType; status: AcademicPeriodStatus };
  scheme: {
    id: number;
    status: AcademicEvaluationSchemeStatus;
    maxScale: number;
    minPassingScore: number;
    totalCategories: number;
    categories?: AcademicEvaluationCategory[];
  } | null;
  categories?: PeriodGradesMatrixCategory[];
  activities?: {
    id: number;
    name: string;
    type: string;
    maxScore: number;
    dueDate: string | null;
    categoryId: number | null;
    categoryName?: string;
    evaluationSchemeId: number | null;
  }[];
  totalActivities: number;
  totalStudents: number;
  isProvisional?: boolean;
  students: PeriodGradesMatrixStudent[];
  generatedAt: string;
}



