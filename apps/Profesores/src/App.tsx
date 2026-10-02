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
} from './types/teacher';

import { academicApi } from './services/api/academicApi';
import { organizationApi, Organization, UserSession } from './services/api/organizationApi';
import { getLocalDateString } from './utils/date';
import { AlertCircle, AlertTriangle, Building2, Loader2, RefreshCw } from 'lucide-react';

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
  const [classSessions, setClassSessions] = useState<ClassSession[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [dashboardData, setDashboardData] = useState<AcademicDashboardDTO | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Modales
  const [isQuickAttendanceOpen, setIsQuickAttendanceOpen] = useState(false);
  const [attendanceContext, setAttendanceContext] = useState<AttendanceContext | null>(null);
  const [isNewStudentModalOpen, setIsNewStudentModalOpen] = useState(false);

  // Carga de datos académicos F1, F2, F3 y F4 desde el API
  const loadAcademicData = useCallback(async (orgId: number) => {
    const requestId = ++academicRequestRef.current;
    setIsDataLoading(true);
    setApiError(null);
    try {
      const [
        fetchedCourses,
        fetchedStudents,
        fetchedEnrollments,
        fetchedSessions,
        fetchedAttendanceHistory,
        fetchedActivities,
        fetchedGrades,
        fetchedDashboard,
      ] = await Promise.all([
        academicApi.getCourses(orgId),
        academicApi.getStudents(orgId),
        academicApi.getEnrollments(orgId),
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
      setSubjects(flattenedSubjects);
      setClassSessions(fetchedSessions);
      setAttendanceHistory(fetchedAttendanceHistory);
      setActivities(fetchedActivities);
      setGrades(fetchedGrades);
      setDashboardData(fetchedDashboard);
    } catch (err: any) {
      if (requestId !== academicRequestRef.current) return;
      console.error('[Academic Load Error]:', err);
      setApiError(err.message || 'Error al conectar con la base de datos académica.');
      setCourses([]);
      setStudents([]);
      setEnrollments([]);
      setSubjects([]);
      setClassSessions([]);
      setAttendanceHistory([]);
      setActivities([]);
      setGrades([]);
      setDashboardData(null);
    } finally {
      if (requestId === academicRequestRef.current) setIsDataLoading(false);
    }
  }, []);



  // Inicialización de autenticación y organización
  const initAuth = useCallback(async () => {
    const requestId = ++organizationRequestRef.current;
    academicRequestRef.current += 1;
    setIsAuthLoading(true);
    setApiError(null);
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
        setApiError(err instanceof Error ? err.message : 'No se pudo inicializar la sesión académica.');
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

  const handleAddEnrollment = async (studentId: string, courseId: string) => {
    if (!activeOrganization) {
      throw new Error('Selecciona una institución antes de matricular.');
    }
    try {
      const newEnrollment = await academicApi.enrollStudent(
        activeOrganization.id,
        studentId,
        courseId
      );
      setEnrollments((prev) => [newEnrollment, ...prev]);

      const [coursesResult, studentsResult] = await Promise.allSettled([
        academicApi.getCourses(activeOrganization.id),
        academicApi.getStudents(activeOrganization.id),
      ]);
      if (coursesResult.status === 'fulfilled') setCourses(coursesResult.value);
      if (studentsResult.status === 'fulfilled') setStudents(studentsResult.value);
      if (coursesResult.status === 'rejected' || studentsResult.status === 'rejected') {
        setApiError('La matrícula se guardó, pero no se pudieron actualizar todos los datos visibles. Recarga la información.');
      }
    } catch (err: any) {
      throw new Error(err.message || 'Error al matricular al estudiante.');
    }
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

      if (!targetSessionId) {
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

      // Refrescar historial de asistencias y sesiones
      const [historyResult, sessionsResult] = await Promise.allSettled([
        academicApi.getAttendanceHistory(activeOrganization.id),
        academicApi.getSessions(activeOrganization.id),
      ]);
      if (historyResult.status === 'fulfilled') setAttendanceHistory(historyResult.value);
      if (sessionsResult.status === 'fulfilled') setClassSessions(sessionsResult.value);
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
        }
      );
      setActivities((prev) => [created, ...prev]);
      return true;
    } catch (err: any) {
      console.error('[Add Activity Error]:', err);
      alert(`Error al registrar evaluación: ${err.message}`);
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
        todaysClassesCount={classSessions.filter((session) => session.date === getLocalDateString() || (classSessions[0] && session.date === classSessions[0].date)).length}
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

        {/* Mensajes si no hay organización activa seleccionada */}
        {!isAuthLoading && !currentUser && !apiError && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-5 flex items-center justify-between gap-3 text-xs text-amber-900">
            <div>
              <p className="font-bold">No se detecta una sesión activa</p>
              <p className="text-amber-800">Inicia sesión en la plataforma y vuelve a cargar este módulo.</p>
            </div>
            <button onClick={() => window.location.reload()} className="px-3 py-2 rounded-lg bg-white border border-amber-300 font-bold hover:bg-amber-100">
              Recargar
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
          {isDataLoading && (
            <div className="flex items-center justify-center p-8 gap-2 text-indigo-600 text-xs font-semibold">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Sincronizando registros académicos con PostgreSQL...</span>
            </div>
          )}

          {!isAuthLoading && currentUser && activeOrganization && isTeachingEnabled && !isDataLoading && (
          <>
          {/* Tab 1: Dashboard */}
          {activeTab === 'dashboard' && (
            <TeacherDashboard
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenQuickAttendance={() => openQuickAttendance()}
              onOpenQuickGrade={() => setActiveTab('grades')}
              onOpenNewStudentModal={() => setIsNewStudentModalOpen(true)}
              students={students}
              courses={courses}
              classSessions={classSessions}
              grades={grades}
              dashboardData={dashboardData}
              currentUser={currentUser}
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
              onAddCourse={handleAddCourse}
              onAddSubject={handleAddSubject}
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
              students={students}
              grades={grades}
              onAddGrade={handleAddGrade}
              activities={activities}
              courses={courses}
              subjects={subjects}
              onAddActivity={handleAddActivity}
              enrollments={enrollments}
              onSaveGrades={handleSaveGrades}
            />
          )}

          {/* Tab 6: Horario de Clases */}
          {activeTab === 'classes' && (
            <ClassScheduleView
              classes={classSessions}
              onOpenQuickAttendance={(session) =>
                openQuickAttendance({
                  courseId: session.courseId,
                  subjectId: session.subjectId,
                  date: session.date,
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
