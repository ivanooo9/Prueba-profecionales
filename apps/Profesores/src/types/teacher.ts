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

export interface Subject {
  id: string;
  name: string; // e.g. "Matemáticas"
  code: string; // e.g. "MAT-101"
  courseId: string;
  courseName: string;
  teacherName: string;
  hoursPerWeek: number;
  iconName?: string;
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

export type EvaluationType = 'homework' | 'exam' | 'project' | 'practice' | 'participation';

export interface Activity {
  id: string;
  courseId: string;
  subjectId: string;
  name: string;
  type: EvaluationType;
  date: string;
  maxScore: number;
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
    };
    history: {
      id: number;
      activityId: number;
      activityName: string;
      activityType: string;
      subjectName: string;
      courseName: string;
      score: number;
      maxScore: number;
      gradedAt: string | null;
      comments?: string | null;
    }[];
  };
  generatedAt: string;
}


