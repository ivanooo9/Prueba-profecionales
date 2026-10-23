import { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { TeacherDashboard } from './components/dashboard/TeacherDashboard';
import { StudentManagementView } from './components/students/StudentManagementView';
import { CoursesView } from './components/courses/CoursesView';
import type { SubjectFormData } from './components/courses/SubjectFormModal';
import { AttendanceView } from './components/attendance/AttendanceView';
import { GradesView } from './components/grades/GradesView';
import { ClassScheduleView } from './components/classes/ClassScheduleView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';

import { QuickAttendanceModal } from './components/modals/QuickAttendanceModal';
import { StudentFormModal } from './components/students/StudentFormModal';

import {
  AttendanceContext,
  AttendanceRecord,
  AttendanceStatus,
  Activity,
  ClassSession,
  Course,
  Enrollment,
  GradeDraft,
  GradeItem,
  NavigationTab,
  Student,
  Subject,
  AcademicDashboardDTO,
  AcademicYear,
} from './types/teacher';

import { academicApi } from './services/api/academicApi';
import { ApiError } from './services/api/apiClient';
import { organizationApi, Organization, UserSession } from './services/api/organizationApi';
import { getLocalDateString } from './utils/date';
import { navigateToLogin } from './utils/auth';
import { AlertCircle, AlertTriangle, Building2, Loader2, LogIn, Lock, RefreshCw } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Estados de Auth, Organización y Módulo
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<Organization[]>([]);
  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(null);
  const [isTeachingEnabled, setIsTeachingEnabled] = useState(false);
  const [isActivatingModule, setIsActivatingModule] = useState(false);
  const organizationRequestRef = useRef(0);
  const academicRequestRef = useRef(0);

  // Estados de Datos Académicos F1-F3 (Autoridad: Backend PostgreSQL)
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classSessions, setClassSessions] = useState<ClassSession[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [dashboardData, setDashboardData] = useState<AcademicDashboardDTO | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [authExpired, setAuthExpired] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);

  // Modales
  const [isQuickAttendanceOpen, setIsQuickAttendanceOpen] = useState(false);
  const [attendanceContext, setAttendanceContext] = useState<AttendanceContext | null>(null);
  const [isNewStudentModalOpen, setIsNewStudentModalOpen] = useState(false);

  // Carga de datos académicos F1, F2, F3 y F4 desde el API
  const loadAcademicData = useCallback(async (orgId: number, silent = false) => {
    const requestId = ++academicRequestRef.current;
    if (!silent) setIsDataLoading(true);
    setApiError(null);
    try {
      const [
        fetchedCourses,
        fetchedStudents,
        fetchedEnrollments,
        fetchedYears,
        fetchedSessions,
        fetchedAttendanceHistory,
        fetchedActivities,
        fetchedGrades,
        fetchedDashboard,
      ] = await Promise.all([
        academicApi.getCourses(orgId),
        academicApi.getStudents(orgId),
        academicApi.getEnrollments(orgId),
        academicApi.getAcademicYears(orgId).catch(() => []),
        academicApi.getSessions(orgId),
        academicApi.getAttendanceHistory(orgId),
        academicApi.getActivities(orgId),
        academicApi.getGradesHistory(orgId),
        academicApi.getDashboard(orgId),
      ]);

      // Cargar materias de cada curso activo
      const subjectsResults = await Promise.all(
        fetchedCourses.map((c) =>
          academicApi.getSubjectsByCourse(orgId, c.id)
        )
      );
      const flattenedSubjects = subjectsResults.flat();

      if (requestId !== academicRequestRef.current) return;

      setCourses(fetchedCourses);
      setStudents(fetchedStudents);
      setEnrollments(fetchedEnrollments);
      setAcademicYears(fetchedYears);
      setSubjects(flattenedSubjects);
      setClassSessions(fetchedSessions);
      setAttendanceHistory(fetchedAttendanceHistory);
      setActivities(fetchedActivities);
      setGrades(fetchedGrades);
      setDashboardData(fetchedDashboard);
    } catch (err: any) {
      if (requestId !== academicRequestRef.current) return;
      console.error('[Academic Load Error]:', err);
      if (err instanceof ApiError && err.status === 401) {
        setAuthExpired(true);
        setApiError('Tu sesión ha expirado o no es válida. Por favor, inicia sesión nuevamente.');
      } else if (err instanceof ApiError && err.status === 403) {
        setIsForbidden(true);
        setApiError(err.message || 'No tienes permisos suficientes para acceder a los datos de esta institución.');
      } else {
        setApiError(err.message || 'Error al conectar con la base de datos académica.');
      }
      if (!silent) {
        setCourses([]);
        setStudents([]);
        setEnrollments([]);
        setAcademicYears([]);
        setSubjects([]);
        setClassSessions([]);
        setAttendanceHistory([]);
        setActivities([]);
        setGrades([]);
        setDashboardData(null);
      }
    } finally {
      if (requestId === academicRequestRef.current && !silent) setIsDataLoading(false);
    }
  }, []);



  // Inicialización de autenticación y organización
  const initAuth = useCallback(async () => {
    const requestId = ++organizationRequestRef.current;
    academicRequestRef.current += 1;
    setIsAuthLoading(true);
    setApiError(null);
    setAuthExpired(false);
    setIsForbidden(false);
    try {
      const user = await organizationApi.getCurrentUser();
      if (requestId !== organizationRequestRef.current) return;
      setCurrentUser(user);

      if (!user) {
        setUserOrganizations([]);
        setActiveOrganization(null);
        setIsTeachingEnabled(false);
        return;
      }

      const orgs = await organizationApi.getUserOrganizations();
      if (requestId !== organizationRequestRef.current) return;
      setUserOrganizations(orgs);

      if (orgs.length > 0) {
        let selectedOrg: Organization | null = null;

        // 1. URL search params: ?orgId=... or ?organizationId=...
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const urlOrgParam = urlParams.get('orgId') || urlParams.get('organizationId');
          if (urlOrgParam && !isNaN(Number(urlOrgParam))) {
            const matched = orgs.find((o) => o.id === Number(urlOrgParam));
            if (matched) {
              selectedOrg = matched;
            }
          }
        }

        // 2. Saved org in localStorage (strictly validate against userOrganizations)
        if (!selectedOrg) {
          const savedOrgId = localStorage.getItem('profesores_active_org_id');
          if (savedOrgId) {
            const matched = orgs.find((o) => String(o.id) === savedOrgId);
            if (matched) {
              selectedOrg = matched;
            } else {
              localStorage.removeItem('profesores_active_org_id');
            }
          }
        }

        // 3. Auto-select only if exactly 1 organization
        if (!selectedOrg && orgs.length === 1) {
          selectedOrg = orgs[0];
        }

        // 4. If multiple orgs and no valid selection, selectedOrg remains null (requires explicit user choice)
        setActiveOrganization(selectedOrg);
        if (selectedOrg) {
          localStorage.setItem('profesores_active_org_id', String(selectedOrg.id));
          const modules = await organizationApi.getOrganizationModules(selectedOrg.id);
          if (requestId !== organizationRequestRef.current) return;
          const hasTeaching = modules.some(
            (m) => m.module.code === 'TEACHING' && m.status === 'ACTIVE'
          );
          setIsTeachingEnabled(hasTeaching);

          if (hasTeaching) {
            await loadAcademicData(selectedOrg.id);
          }
        } else {
          setIsTeachingEnabled(false);
        }
      } else {
        setActiveOrganization(null);
        setIsTeachingEnabled(false);
        setCourses([]);
        setStudents([]);
        setEnrollments([]);
        setSubjects([]);
        setClassSessions([]);
        setAttendanceHistory([]);
        setActivities([]);
        setGrades([]);
        setDashboardData(null);
      }
    } catch (err) {
      console.error('[Init Auth Error]:', err);
      if (requestId === organizationRequestRef.current) {
        if (err instanceof ApiError && err.status === 401) {
          setAuthExpired(true);
          setApiError('Tu sesión ha expirado o no es válida. Inicia sesión para continuar.');
        } else if (err instanceof ApiError && err.status === 403) {
          setIsForbidden(true);
          setApiError(err.message || 'Acceso restringido: no tienes permisos para consultar esta información.');
        } else {
          setApiError(err instanceof Error ? err.message : 'No se pudo inicializar la sesión académica.');
        }
      }
    } finally {
      if (requestId === organizationRequestRef.current) setIsAuthLoading(false);
    }
  }, [loadAcademicData]);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Cambio de organización activa
  const handleSelectOrganization = async (orgId: number) => {
    const selected = userOrganizations.find((o) => o.id === orgId);
    if (!selected) return;

    const requestId = ++organizationRequestRef.current;
    academicRequestRef.current += 1;
    setActiveOrganization(selected);
    setIsTeachingEnabled(false);
    setApiError(null);
    setAuthExpired(false);
    setIsForbidden(false);
    setIsDataLoading(true);
    localStorage.setItem('profesores_active_org_id', String(orgId));
    setCourses([]);
    setStudents([]);
    setEnrollments([]);
    setSubjects([]);
    setClassSessions([]);
    setAttendanceHistory([]);
    setActivities([]);
    setGrades([]);
    setDashboardData(null);

    try {
      const modules = await organizationApi.getOrganizationModules(selected.id);
      if (requestId !== organizationRequestRef.current) return;
      const hasTeaching = modules.some(
        (m) => m.module.code === 'TEACHING' && m.status === 'ACTIVE'
      );
      setIsTeachingEnabled(hasTeaching);

      if (hasTeaching) await loadAcademicData(selected.id);
    } catch (err) {
      if (requestId === organizationRequestRef.current) {
        setApiError(err instanceof Error ? err.message : 'No se pudo cargar la institución.');
      }
    } finally {
      if (requestId === organizationRequestRef.current) setIsDataLoading(false);
    }
  };

  // Activar módulo TEACHING en la organización
  const handleEnableTeachingModule = async () => {
    if (!activeOrganization) return;
    setIsActivatingModule(true);
    setApiError(null);
    try {
      await organizationApi.enableModule(
        activeOrganization.id,
        'TEACHING'
      );
      setIsTeachingEnabled(true);
      await loadAcademicData(activeOrganization.id);
    } catch (err: any) {
      console.error('[Enable Teaching Module Error]:', err);
      setApiError(err.message || 'Error al activar el módulo de Gestión Académica.');
    } finally {
      setIsActivatingModule(false);
    }
  };

  const handleAddCourse = async (newCourse: { name: string; level: string; classroom?: string }) => {
    if (!activeOrganization) {
      throw new Error('Selecciona una institución antes de registrar un curso.');
    }
    if (!isTeachingEnabled) {
      throw new Error('El módulo de Gestión Académica no está habilitado para esta institución.');
    }

    const created = await academicApi.createCourse(activeOrganization.id, newCourse);
    setCourses((previousCourses) => [...previousCourses, created]);
    setDashboardData((previousDashboard) => previousDashboard
      ? {
          ...previousDashboard,
          activeCoursesCount: previousDashboard.activeCoursesCount + 1,
          totalCoursesCount: previousDashboard.totalCoursesCount + 1,
        }
      : previousDashboard
    );
  };

  const handleUpdateCourse = async (
    courseId: string,
    updated: { name: string; level: string; classroom?: string }
  ) => {
    if (!activeOrganization) throw new Error('Selecciona una institución.');
    const saved = await academicApi.updateCourse(activeOrganization.id, courseId, updated);
    setCourses((prev) => prev.map((c) => (c.id === courseId ? saved : c)));
  };

  const handleArchiveCourse = async (courseId: string) => {
    if (!activeOrganization) throw new Error('Selecciona una institución.');
    await academicApi.archiveCourse(activeOrganization.id, courseId);
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, status: 'archived' as const } : c))
    );
    setDashboardData((prev) =>
      prev
        ? {
            ...prev,
            activeCoursesCount: Math.max(0, prev.activeCoursesCount - 1),
          }
        : prev
    );
  };

  const handleReactivateCourse = async (courseId: string) => {
    if (!activeOrganization) throw new Error('Selecciona una institución.');
    const reactivated = await academicApi.reactivateCourse(activeOrganization.id, courseId);
    setCourses((prev) => prev.map((c) => (c.id === courseId ? reactivated : c)));
    setDashboardData((prev) =>
      prev
        ? {
            ...prev,
            activeCoursesCount: prev.activeCoursesCount + 1,
          }
        : prev
    );
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!activeOrganization) throw new Error('Selecciona una institución.');
    await academicApi.deleteCourse(activeOrganization.id, courseId);
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
    setDashboardData((prev) =>
      prev
        ? {
            ...prev,
            totalCoursesCount: Math.max(0, prev.totalCoursesCount - 1),
          }
        : prev
    );
  };

  const handleAddSubject = async (courseId: string, newSubject: SubjectFormData) => {
    if (!activeOrganization) {
      throw new Error('Selecciona una institución antes de registrar una materia.');
    }
    if (!isTeachingEnabled) {
      throw new Error('El módulo de Gestión Académica no está habilitado para esta institución.');
    }

    const created = await academicApi.createSubject(activeOrganization.id, courseId, newSubject);
    setSubjects((previousSubjects) => [...previousSubjects, created]);
    setCourses((previousCourses) => previousCourses.map((course) => (
      course.id === courseId
        ? { ...course, subjectsCount: course.subjectsCount + 1 }
        : course
    )));
  };

  // Handlers F1 conectados a API
  const handleAddStudent = async (newStudent: Partial<Student>) => {
    if (!activeOrganization) {
      throw new Error('No hay una organización activa seleccionada.');
    }
    try {
      const created = await academicApi.createStudent(activeOrganization.id, {
        firstName: newStudent.firstName || '',
        lastName: newStudent.lastName || '',
        identification: newStudent.identification || null,
        email: newStudent.email || null,
        phone: newStudent.phone || null,
      });
      setStudents((prev) => [created, ...prev]);
    } catch (err: any) {
      console.error('[App] Error al registrar estudiante:', err);
      throw err;
    }
  };

  const handleUpdateStudent = async (id: string, updated: Partial<Student>) => {
    if (!activeOrganization) {
      throw new Error('No hay una organización activa seleccionada.');
    }
    try {
      const saved = await academicApi.updateStudent(activeOrganization.id, id, {
        firstName: updated.firstName,
        lastName: updated.lastName,
        identification: updated.identification,
        email: updated.email,
        phone: updated.phone,
      });
      setStudents((prev) => prev.map((s) => (s.id === id ? saved : s)));
    } catch (err: any) {
      console.error('[App] Error al actualizar estudiante:', err);
      throw err;
    }
  };

  const handleAddEnrollment = async (
    studentIds: string[] | string,
    courseId: string,
    academicYearId?: string | null
  ) => {
    if (!activeOrganization) {
      throw new Error('Selecciona una institución antes de matricular.');
    }
    const ids = Array.isArray(studentIds) ? studentIds : [studentIds];
    if (ids.length === 0) {
      throw new Error('Selecciona al menos un estudiante para matricular.');
    }

    const orgId = activeOrganization.id;
    const errors: { studentId: string; identification?: string; name?: string; error: string }[] = [];
    const failedStudentIds: string[] = [];

    const results = await Promise.allSettled(
      ids.map(async (sId) => {
        const studentObj = students.find((s) => s.id === sId);
        try {
          const res = await academicApi.enrollStudent(
            orgId,
            sId,
            courseId,
            undefined,
            academicYearId
          );
          return { studentId: sId, res };
        } catch (err: any) {
          const errMsg = err?.message || 'Error al procesar matrícula';
          errors.push({
            studentId: sId,
            identification: studentObj?.identification,
            name: studentObj ? `${studentObj.firstName} ${studentObj.lastName}` : undefined,
            error: errMsg,
          });
          failedStudentIds.push(sId);
          throw err;
        }
      })
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failedCount = failedStudentIds.length;

    if (successCount > 0) {
      const [enrollmentsResult, coursesResult, studentsResult] = await Promise.allSettled([
        academicApi.getEnrollments(orgId),
        academicApi.getCourses(orgId),
        academicApi.getStudents(orgId),
      ]);
      if (enrollmentsResult.status === 'fulfilled') setEnrollments(enrollmentsResult.value);
      if (coursesResult.status === 'fulfilled') setCourses(coursesResult.value);
      if (studentsResult.status === 'fulfilled') setStudents(studentsResult.value);
    }

    if (failedCount === ids.length && ids.length > 0) {
      const firstError = errors[0]?.error || 'No se pudo procesar la matrícula.';
      throw new Error(firstError);
    }

    if (failedCount > 0) {
      const sampleError = errors[0]
        ? ` (${errors[0].name || errors[0].identification || 'Estudiante'}: ${errors[0].error})`
        : '';
      setApiError(
        `Se matricularon ${successCount} estudiante(s) correctamente. ${failedCount} falló${sampleError}.`
      );
    }

    return {
      success: failedCount === 0,
      totalRequested: ids.length,
      successCount,
      failedCount,
      failedStudentIds,
      errors,
    };
  };

  // Handlers F2 (Asistencia y Sesiones conectadas a PostgreSQL)
  const handleSaveAttendance = async (
    records: {
      studentId: string;
      status: AttendanceStatus;
      observation?: string;
    }[],
    context: AttendanceContext
  ) => {
    if (!activeOrganization) {
      throw new Error('Selecciona una institución antes de registrar asistencia.');
    }
    try {
      let targetSessionId = context.sessionId;

      if (!targetSessionId || isNaN(Number(targetSessionId))) {
        // Buscar si ya existe una sesión en esa fecha para el curso y materia
        const existingSessions = await academicApi.getSessions(activeOrganization.id, {
          courseId: context.courseId,
          subjectId: context.subjectId || undefined,
          date: context.date,
        });

        if (existingSessions.length > 0) {
          targetSessionId = existingSessions[0].id;
        } else {
          // Crear sesión de clase real en PostgreSQL
          const createdSession = await academicApi.createSession(
            activeOrganization.id,
            context.courseId,
            {
              subjectId: context.subjectId || null,
              sessionDate: context.date,
            }
          );
          targetSessionId = createdSession.id;
        }
      }

      await academicApi.saveAttendanceBatch(
        activeOrganization.id,
        targetSessionId,
        records
      );

      // Refrescar historial de asistencias, sesiones y dashboard
      const [historyResult, sessionsResult, dashboardResult] = await Promise.allSettled([
        academicApi.getAttendanceHistory(activeOrganization.id),
        academicApi.getSessions(activeOrganization.id),
        academicApi.getDashboard(activeOrganization.id),
      ]);
      if (historyResult.status === 'fulfilled') setAttendanceHistory(historyResult.value);
      if (sessionsResult.status === 'fulfilled') setClassSessions(sessionsResult.value);
      if (dashboardResult.status === 'fulfilled') setDashboardData(dashboardResult.value);
      if (historyResult.status === 'rejected' || sessionsResult.status === 'rejected') {
        setApiError('La asistencia se guardó, pero no se pudo actualizar todo el historial visible. Recarga la información.');
      }
    } catch (err: any) {
      console.error('[Save Attendance Error]:', err);
      throw new Error(err.message || 'Error al registrar asistencia.');
    }
  };

  const openQuickAttendance = (context: AttendanceContext | null = null) => {
    setAttendanceContext(context);
    setIsQuickAttendanceOpen(true);
  };

  // Handlers F3 (Actividades y Calificaciones conectadas a PostgreSQL)
  const handleAddGrade = async (newGrade: Omit<GradeItem, 'id'>) => {
    if (!activeOrganization) {
      throw new Error('Selecciona una institución antes de registrar una calificación.');
    }
    try {
      let targetActivityId = newGrade.evaluationId;
      if (!targetActivityId) {
        const existingActivity = activities.find((activity) =>
          activity.courseId === newGrade.courseId &&
          activity.subjectId === newGrade.subjectId &&
          activity.name === newGrade.evaluationName &&
          activity.date === newGrade.date
        );
        if (existingActivity) {
          targetActivityId = existingActivity.id;
        } else {
          const createdActivity = await academicApi.createActivity(
            activeOrganization.id,
            newGrade.courseId,
            {
              subjectId: newGrade.subjectId,
              name: newGrade.evaluationName,
              type: newGrade.evaluationType,
              dueDate: newGrade.date,
              maxScore: newGrade.maxScore,
            }
          );
          targetActivityId = createdActivity.id;
          setActivities((prev) => [createdActivity, ...prev]);
        }
      }

      await academicApi.saveGradesBatch(activeOrganization.id, targetActivityId, [
        {
          studentId: newGrade.studentId,
          score: newGrade.score,
          comments: newGrade.comments,
        },
      ]);

      try {
        setGrades(await academicApi.getGradesHistory(activeOrganization.id));
      } catch {
        setApiError('La calificación se guardó, pero no se pudo actualizar el libro visible. Recarga la información.');
      }
    } catch (err: any) {
      console.error('[Add Grade Error]:', err);
      throw new Error(err.message || 'Error al registrar la calificación.');
    }
  };

  const handleSaveGrades = async (drafts: GradeDraft[]) => {
    if (!activeOrganization) {
      throw new Error('Selecciona una institución antes de guardar calificaciones.');
    }
    if (drafts.length === 0) return;
    try {
      const evaluationId = drafts[0].evaluationId;
      await academicApi.saveGradesBatch(
        activeOrganization.id,
        evaluationId,
        drafts.map((d) => ({
          studentId: d.studentId,
          score: d.score,
          comments: d.comments,
        }))
      );

      try {
        setGrades(await academicApi.getGradesHistory(activeOrganization.id));
      } catch {
        setApiError('Las calificaciones se guardaron, pero no se pudo actualizar el libro visible. Recarga la información.');
      }
    } catch (err: any) {
      console.error('[Save Grades Error]:', err);
      throw new Error(err.message || 'Error al guardar calificaciones.');
    }
  };

  const handleAddActivity = async (newActivity: Omit<Activity, 'id'>) => {
    if (!activeOrganization) return false;
    try {
      const created = await academicApi.createActivity(
        activeOrganization.id,
        newActivity.courseId,
        {
          subjectId: newActivity.subjectId,
          name: newActivity.name,
          type: newActivity.type,
          dueDate: newActivity.date,
          maxScore: newActivity.maxScore,
          academicPeriodId: newActivity.academicPeriodId,
          categoryId: newActivity.categoryId,
          evaluationSchemeId: newActivity.evaluationSchemeId,
        }
      );
      setActivities((prev) => [created, ...prev]);
      return true;
    } catch (err: any) {
      console.error('[Add Activity Error]:', err);
      alert(`Error al registrar actividad: ${err.message}`);
      return false;
    }
  };


  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#373A40] font-sans flex flex-col lg:flex-row antialiased selection:bg-indigo-500 selection:text-white">
      {/* 1. Fixed Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onOpenQuickAttendance={() => openQuickAttendance()}
        onOpenQuickGrade={() => setActiveTab('grades')}
        totalStudents={students.length}
        courseCount={courses.length}
        todaysClassesCount={dashboardData?.todaySessionsCount ?? dashboardData?.todaySessions?.length ?? classSessions.filter((session) => session.date === getLocalDateString()).length}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        currentUser={currentUser}
        activeOrganization={activeOrganization}
      />

      {/* 2. Main Workspace Layout Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 transition-all duration-300">
        {/* Contextual Top Header */}
        <TopHeader
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          currentUser={currentUser}
          activeOrganization={activeOrganization}
          userOrganizations={userOrganizations}
          onSelectOrganization={handleSelectOrganization}
        />

        {/* Banner de Estado / Errores */}
        {apiError && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-3 flex items-center justify-between text-xs text-rose-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{apiError}</span>
            </div>
            {activeOrganization && (
              <button
                onClick={() => handleSelectOrganization(activeOrganization.id)}
                className="px-2.5 py-1 bg-white border border-rose-300 rounded-lg hover:bg-rose-100 font-bold transition flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Reintentar
              </button>
            )}
          </div>
        )}

        {/* Banner de Sesión Expirada (HTTP 401) */}
        {!isAuthLoading && authExpired && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-xs">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold">Tu sesión ha expirado</p>
                <p className="text-amber-800">Inicia sesión nuevamente en el Core para continuar gestionando tus registros académicos sin perder tus datos.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigateToLogin()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <LogIn className="w-4 h-4" /> Iniciar Sesión
            </button>
          </div>
        )}

        {/* Banner de Permisos Insuficientes (HTTP 403) */}
        {!isAuthLoading && isForbidden && !authExpired && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-900 shadow-xs">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <p className="font-bold">Acceso restringido a la institución</p>
                <p className="text-rose-800">
                  {apiError || 'No tienes permisos asignados en esta institución o el módulo se encuentra restringido. Selecciona otra institución autorizada.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mensajes si no hay sesión activa inicial */}
        {!isAuthLoading && !currentUser && !authExpired && !apiError && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-xs">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold">Inicio de sesión requerido</p>
                <p className="text-amber-800">Para acceder al módulo docente y sincronizar tus cursos, por favor inicia sesión en la plataforma.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigateToLogin()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <LogIn className="w-4 h-4" /> Iniciar Sesión
            </button>
          </div>
        )}

        {!isAuthLoading && currentUser && !apiError && !activeOrganization && userOrganizations.length === 0 && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-800">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold">No tienes instituciones disponibles</p>
                <p className="text-amber-700">
                  Contacte a un administrador para vincular su cuenta a una institución educativa.
                </p>
              </div>
            </div>
          </div>
        )}

        {!isAuthLoading && currentUser && !apiError && !activeOrganization && userOrganizations.length > 1 && (
          <div className="bg-indigo-50 border-b border-indigo-200 px-6 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-900">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <p className="font-bold">Seleccione una Institución Educativa</p>
                <p className="text-indigo-700">
                  Por favor seleccione una institución en el menú superior para comenzar a gestionar sus clases.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Advertencia si el módulo TEACHING no está activo en la organización */}
        {activeOrganization && !isTeachingEnabled && !isAuthLoading && !apiError && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-800">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold">Módulo de Gestión Académica no habilitado</p>
                <p className="text-amber-700">
                  La institución <strong>{activeOrganization.name}</strong> no tiene activo el módulo TEACHING.
                </p>
              </div>
            </div>
            <button
              onClick={handleEnableTeachingModule}
              disabled={isActivatingModule}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shrink-0 flex items-center gap-2"
            >
              {isActivatingModule ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
              Habilitar Módulo en esta Institución
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
          {isDataLoading && courses.length === 0 && (
            <div className="flex items-center justify-center p-8 gap-2 text-indigo-600 text-xs font-semibold">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Sincronizando registros académicos con PostgreSQL...</span>
            </div>
          )}

          {!isAuthLoading && currentUser && activeOrganization && isTeachingEnabled && (
          <>
          {/* Tab 1: Dashboard */}
          {activeTab === 'dashboard' && (
            <TeacherDashboard
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenQuickAttendance={(context) => {
                if (context?.courseId) {
                  openQuickAttendance({
                    courseId: context.courseId,
                    subjectId: context.subjectId || '',
                    date: new Date().toISOString().split('T')[0],
                    sessionId: context.sessionId,
                  });
                } else {
                  openQuickAttendance();
                }
              }}
              onOpenQuickGrade={(_context) => setActiveTab('grades')}
              onOpenNewStudentModal={() => setIsNewStudentModalOpen(true)}
              students={students}
              courses={courses}
              classSessions={classSessions}
              grades={grades}
              dashboardData={dashboardData}
              currentUser={currentUser}
              isLoading={isDataLoading && !dashboardData}
            />
          )}

          {/* Tab 2: Estudiantes */}
          {activeTab === 'students' && (
            <StudentManagementView
              students={students}
              onAddStudent={handleAddStudent}
              onUpdateStudent={handleUpdateStudent}
              courses={courses}
              enrollments={enrollments}
              academicYears={academicYears}
              onAddEnrollment={handleAddEnrollment}
              attendanceHistory={attendanceHistory}
              grades={grades}
              activities={activities}
            />
          )}

          {/* Tab 3: Cursos y Materias */}
          {activeTab === 'courses' && (
            <CoursesView
              courses={courses}
              subjects={subjects}
              students={students}
              enrollments={enrollments}
              attendanceHistory={attendanceHistory}
              grades={grades}
              academicYears={academicYears}
              orgId={activeOrganization.id}
              onAddCourse={handleAddCourse}
              onUpdateCourse={handleUpdateCourse}
              onArchiveCourse={handleArchiveCourse}
              onReactivateCourse={handleReactivateCourse}
              onDeleteCourse={handleDeleteCourse}
              onAddSubject={handleAddSubject}
              onScheduleUpdated={() => loadAcademicData(activeOrganization.id, true)}
            />
          )}

          {/* Tab 4: Asistencia */}
          {activeTab === 'attendance' && (
            <AttendanceView
              students={students}
              attendanceHistory={attendanceHistory}
              courses={courses}
              onOpenQuickAttendance={() => openQuickAttendance()}
            />
          )}

          {/* Tab 5: Calificaciones */}
          {activeTab === 'grades' && (
            <GradesView
              currentUser={currentUser}
              organization={activeOrganization}
              students={students}
              grades={grades}
              onAddGrade={handleAddGrade}
              activities={activities}
              courses={courses}
              subjects={subjects}
              onAddActivity={handleAddActivity}
              enrollments={enrollments}
              onSaveGrades={handleSaveGrades}
              academicYears={academicYears}
              onReloadAcademicData={async () => {
                if (activeOrganization) await loadAcademicData(activeOrganization.id, true);
              }}
            />
          )}

          {/* Tab 6: Horario de Clases */}
          {activeTab === 'classes' && (
            <ClassScheduleView
              classes={dashboardData?.todaySessions?.length ? dashboardData.todaySessions : classSessions.filter((s) => s.date === getLocalDateString())}
              courses={courses}
              subjects={subjects}
              onOpenQuickAttendance={(session) =>
                openQuickAttendance({
                  courseId: session.courseId,
                  subjectId: session.subjectId,
                  date: session.date || getLocalDateString(),
                  sessionId: session.id,
                })
              }
              onOpenQuickGrade={() => setActiveTab('grades')}
            />
          )}

          {/* Tab 7: Reportes */}
          {activeTab === 'reports' && (
            <ReportsView
              organization={activeOrganization}
              courses={courses}
              subjects={subjects}
              students={students}
            />
          )}

          {/* Tab 8: Configuración */}
          {activeTab === 'settings' && (
            <SettingsView
              currentUser={currentUser}
              activeOrganization={activeOrganization}
            />
          )}
          </>
          )}

          {/* Estado Informativo Central si no hay usuario autenticado o la sesión expiró */}
          {!isAuthLoading && (!currentUser || authExpired) && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-center space-y-4">
                <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
                  <Lock className="w-7 h-7" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  {authExpired ? 'Sesión Expirada' : 'Autenticación Requerida'}
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {authExpired
                    ? 'Tu sesión de usuario ha caducado. Vuelve a iniciar sesión en el Core para sincronizar tus calificaciones, asistencias y materias.'
                    : 'Para acceder al módulo docente y gestionar tus clases, alumnos y calificaciones, debes identificarte en el Core de Profesionales Ecuador.'}
                </p>
                <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => navigateToLogin()}
                    className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" /> Iniciar Sesión en el Core
                  </button>
                  <button
                    type="button"
                    onClick={() => initAuth()}
                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Comprobar Conexión
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Global Quick Action Modals */}
      <QuickAttendanceModal
        isOpen={isQuickAttendanceOpen}
        onClose={() => setIsQuickAttendanceOpen(false)}
        students={students}
        courses={courses}
        subjects={subjects}
        enrollments={enrollments}
        attendanceHistory={attendanceHistory}
        context={attendanceContext}
        onSaveAttendance={handleSaveAttendance}
      />

      <StudentFormModal
        isOpen={isNewStudentModalOpen}
        onClose={() => setIsNewStudentModalOpen(false)}
        onSave={handleAddStudent}
      />
    </div>
  );
}

export default App;
