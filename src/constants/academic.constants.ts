/**
 * Constantes y Enums del Módulo Académico / Profesores (TEACHING)
 * Profesional Ecuador V4.0 - Fase 1
 */

export const ACADEMIC_COURSE_STATUS = {
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;

export type AcademicCourseStatus =
  (typeof ACADEMIC_COURSE_STATUS)[keyof typeof ACADEMIC_COURSE_STATUS];

export const ACADEMIC_SUBJECT_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type AcademicSubjectStatus =
  (typeof ACADEMIC_SUBJECT_STATUS)[keyof typeof ACADEMIC_SUBJECT_STATUS];

export const ACADEMIC_STUDENT_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type AcademicStudentStatus =
  (typeof ACADEMIC_STUDENT_STATUS)[keyof typeof ACADEMIC_STUDENT_STATUS];

export const ACADEMIC_ENROLLMENT_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  WITHDRAWN: 'WITHDRAWN',
} as const;

export type AcademicEnrollmentStatus =
  (typeof ACADEMIC_ENROLLMENT_STATUS)[keyof typeof ACADEMIC_ENROLLMENT_STATUS];

export const ACADEMIC_CLASS_SESSION_STATUS = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type AcademicClassSessionStatus =
  (typeof ACADEMIC_CLASS_SESSION_STATUS)[keyof typeof ACADEMIC_CLASS_SESSION_STATUS];

export const ACADEMIC_ATTENDANCE_STATUS = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'LATE',
  EXCUSED: 'EXCUSED',
} as const;

export type AcademicAttendanceStatus =
  (typeof ACADEMIC_ATTENDANCE_STATUS)[keyof typeof ACADEMIC_ATTENDANCE_STATUS];

export const ACADEMIC_ACTIVITY_TYPE = {
  HOMEWORK: 'HOMEWORK',
  EXAM: 'EXAM',
  PROJECT: 'PROJECT',
  PRACTICE: 'PRACTICE',
  PARTICIPATION: 'PARTICIPATION',
  LESSON: 'LESSON',
  ACTIVITY: 'ACTIVITY',
} as const;

export type AcademicActivityType =
  (typeof ACADEMIC_ACTIVITY_TYPE)[keyof typeof ACADEMIC_ACTIVITY_TYPE];

export const ACADEMIC_YEAR_STATUS = {
  PLANNED: 'PLANNED',
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type AcademicYearStatus =
  (typeof ACADEMIC_YEAR_STATUS)[keyof typeof ACADEMIC_YEAR_STATUS];

export const ACADEMIC_PERIOD_TYPE = {
  YEAR: 'YEAR',
  SEMESTER: 'SEMESTER',
  QUIMESTER: 'QUIMESTER',
  TRIMESTER: 'TRIMESTER',
  BIMESTER: 'BIMESTER',
  PARTIAL: 'PARTIAL',
} as const;

export type AcademicPeriodType =
  (typeof ACADEMIC_PERIOD_TYPE)[keyof typeof ACADEMIC_PERIOD_TYPE];

export const ACADEMIC_PERIOD_STATUS = {
  ACTIVE: 'ACTIVE',
  LOCKED: 'LOCKED',
  CLOSED: 'CLOSED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type AcademicPeriodStatus =
  (typeof ACADEMIC_PERIOD_STATUS)[keyof typeof ACADEMIC_PERIOD_STATUS];

export const ACADEMIC_EVALUATION_SCHEME_STATUS = {
  DRAFT: 'DRAFT',
  VALID: 'VALID',
  LOCKED: 'LOCKED',
  CLOSED: 'CLOSED',
} as const;

export type AcademicEvaluationSchemeStatus =
  (typeof ACADEMIC_EVALUATION_SCHEME_STATUS)[keyof typeof ACADEMIC_EVALUATION_SCHEME_STATUS];

export const ACADEMIC_GRADE_STATUS = {
  PENDING: 'PENDING',
  GRADED: 'GRADED',
  ABSENT: 'ABSENT',
  EXCUSED: 'EXCUSED',
} as const;

export type AcademicGradeStatus =
  (typeof ACADEMIC_GRADE_STATUS)[keyof typeof ACADEMIC_GRADE_STATUS];


