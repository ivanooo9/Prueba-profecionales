import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, AlertCircle, AlertTriangle, Building2 } from 'lucide-react';
import { ActiveView, Patient } from './types';
import { dentalService } from './services/dentalService';
import { organizationApi, UserSession, Organization } from './services/api/organizationApi';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { DashboardView } from './components/dashboard/DashboardView';
import { PatientList } from './components/patients/PatientList';
import { PatientDetailView } from './components/patients/PatientDetailView';
import { PatientFormModal } from './components/patients/PatientFormModal';
import { AgendaView } from './components/appointments/AgendaView';
import { AppointmentFormModal } from './components/appointments/AppointmentFormModal';
import { TreatmentList } from './components/treatments/TreatmentList';
import { BudgetList } from './components/budgets/BudgetList';
import { DocumentList } from './components/documents/DocumentList';
import { ReportsView } from './components/reports/ReportsView';

const ToothIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M7.2 4.1C8.4 3.3 9.5 4 12 4s3.6-.7 4.8.1c2.1 1.4 2.2 4.1 1.7 6.4-.5 2.1-1.4 3.3-1.8 5.7-.3 1.8-.8 4.3-2.2 4.3-1.2 0-1.5-1.7-2.5-4.3-.4-1.1-1.6-1.1-2 0-1 2.6-1.3 4.3-2.5 4.3-1.4 0-1.9-2.5-2.2-4.3-.4-2.4-1.3-3.6-1.8-5.7-.5-2.3-.4-5 1.7-6.4Z" />
    <path d="M8.5 7.2c.8-.5 1.7-.5 2.5 0M13 7.2c.8-.5 1.7-.5 2.5 0" />
  </svg>
);

export function App() {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [appointmentDefaultPatient, setAppointmentDefaultPatient] = useState<string | undefined>(undefined);
  const [, setTick] = useState(0);

  // Estados de autenticación, organización y módulo Core
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<Organization[]>([]);
  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(null);
  const [isDentistryEnabled, setIsDentistryEnabled] = useState(false);
  const [isEnablingModule, setIsEnablingModule] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initAuth = useCallback(async () => {
    try {
      setError(null);
      const user = await organizationApi.getCurrentUser();
      setCurrentUser(user);

      if (!user) {
        setIsInitialized(true);
        return;
      }

      const orgs = await organizationApi.getUserOrganizations();
      setUserOrganizations(orgs);

      if (orgs.length > 0) {
        const savedOrgId = localStorage.getItem('odontologia_active_org_id');
        const selectedOrg = orgs.find((o) => String(o.id) === savedOrgId) || orgs[0];
        setActiveOrganization(selectedOrg);
        localStorage.setItem('odontologia_active_org_id', String(selectedOrg.id));

        // Sincronizar organización con dentalService y cargar datos compartidos
        dentalService.setOrganizationId(selectedOrg.id);
        await Promise.all([
          dentalService.loadPatients(selectedOrg.id),
          dentalService.loadAppointments(selectedOrg.id),
        ]);

        const enabled = await organizationApi.isDentistryModuleEnabled(selectedOrg.id);
        setIsDentistryEnabled(enabled);
      } else {
        setActiveOrganization(null);
        setIsDentistryEnabled(false);
      }
    } catch (err: any) {
      console.error('[Odontologia App] Init error:', err);
      setError(err?.message || 'Error al conectar con el servidor.');
    } finally {
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    const unsubscribe = dentalService.subscribe(() => setTick((value) => value + 1));
    return unsubscribe;
  }, []);

  const handleSelectOrganization = async (orgId: number) => {
    const org = userOrganizations.find((o) => o.id === orgId);
    if (!org) return;
    setActiveOrganization(org);
    localStorage.setItem('odontologia_active_org_id', String(org.id));

    dentalService.setOrganizationId(org.id);
    await Promise.all([
      dentalService.loadPatients(org.id),
      dentalService.loadAppointments(org.id),
    ]);

    try {
      const enabled = await organizationApi.isDentistryModuleEnabled(org.id);
      setIsDentistryEnabled(enabled);
    } catch (err: any) {
      console.error('[Odontologia App] Error checking module for org:', err);
      setIsDentistryEnabled(false);
    }
  };

  const handleEnableDentistry = async () => {
    if (!activeOrganization) return;
    setIsEnablingModule(true);
    setError(null);
    try {
      await organizationApi.enableDentistryModule(activeOrganization.id);
      dentalService.setOrganizationId(activeOrganization.id);
      await Promise.all([
        dentalService.loadPatients(activeOrganization.id),
        dentalService.loadAppointments(activeOrganization.id),
      ]);
      const enabled = await organizationApi.isDentistryModuleEnabled(activeOrganization.id);
      setIsDentistryEnabled(enabled);
    } catch (err: any) {
      console.error('[Odontologia App] Error enabling DENTISTRY module:', err);
      setError(
        err?.message ||
          'No se pudo activar el módulo DENTISTRY. Verifique sus permisos (OWNER/ADMIN) en la organización.'
      );
    } finally {
      setIsEnablingModule(false);
    }
  };

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    setActiveView('patient-detail');
  };

  const handleOpenEditPatient = (patientId: string) => {
    const patient = dentalService.getPatientById(patientId);
    if (patient) {
      setPatientToEdit(patient);
      setIsPatientModalOpen(true);
    }
  };

  const handleOpenNewAppointment = (patientId?: string) => {
    setAppointmentDefaultPatient(patientId);
    setIsAppointmentModalOpen(true);
  };

  const handleChangeView = (view: ActiveView) => {
    setActiveView(view);
    if (view !== 'patient-detail') setSelectedPatientId(null);
  };

  // 1. Pantalla de carga inicial
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-cyan-500 text-slate-950 rounded-2xl shadow-lg shadow-cyan-500/20 animate-pulse">
            <ToothIcon className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-extrabold text-base text-white tracking-tight">ODONTOLOGÍA</h1>
            <p className="text-[10px] text-cyan-300 font-mono tracking-wider">CONSULTORIO DENTAL MULTI-TENANT</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Conectando con el Core de Profesionales Ecuador...</span>
        </div>
      </div>
    );
  }

  // 2. AuthGate: Sesión requerida si no está autenticado
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-4">
          <div className="w-14 h-14 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-2xl flex items-center justify-center mx-auto">
            <ToothIcon className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-white">Sesión Requerida</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Debe iniciar sesión en el Core de Profesionales Ecuador para acceder a la estación clínica de Odontología.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <a
              href="/login"
              className="w-full py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-md transition text-center"
            >
              Iniciar Sesión en el Core
            </a>
            <button
              type="button"
              onClick={initAuth}
              className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition"
            >
              Reintentar Conexión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        activeView={activeView}
        setActiveView={handleChangeView}
        isOpenMobile={isOpenMobile}
        setIsOpenMobile={setIsOpenMobile}
        currentUser={currentUser}
        activeOrganization={activeOrganization}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <TopHeader
          onToggleMobile={() => setIsOpenMobile(!isOpenMobile)}
          onOpenNewPatient={() => {
            setPatientToEdit(null);
            setIsPatientModalOpen(true);
          }}
          onOpenNewAppointment={() => handleOpenNewAppointment()}
          onSelectPatient={handleSelectPatient}
          currentUser={currentUser}
          activeOrganization={activeOrganization}
          userOrganizations={userOrganizations}
          onSelectOrganization={handleSelectOrganization}
        />

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          {error && (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-[11px] font-bold text-rose-800 hover:text-rose-950 underline"
              >
                Cerrar
              </button>
            </div>
          )}

          {userOrganizations.length === 0 && (
            <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50/70 p-6 text-center space-y-3">
              <Building2 className="w-10 h-10 text-cyan-600 mx-auto" />
              <h3 className="font-bold text-sm text-slate-900">
                Sin organizaciones asignadas
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                No pertenece a ninguna organización activa en Profesionales Ecuador. Cree una organización en el Core o solicite acceso a un administrador.
              </p>
            </div>
          )}

          {activeOrganization && !isDentistryEnabled && (
            <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5 text-amber-900 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-amber-950">
                    Módulo Odontología inactivo para &ldquo;{activeOrganization.name}&rdquo;
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Para habilitar la gestión odontológica, odontogramas y tratamientos en esta organización, active el módulo DENTISTRY.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleEnableDentistry}
                disabled={isEnablingModule}
                className="shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
              >
                {isEnablingModule ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Activando...</span>
                  </>
                ) : (
                  <span>Activar Módulo DENTISTRY</span>
                )}
              </button>
            </div>
          )}

          {activeView === 'dashboard' && (
            <DashboardView
              onNavigate={handleChangeView}
              onSelectPatient={handleSelectPatient}
              onOpenNewPatient={() => {
                setPatientToEdit(null);
                setIsPatientModalOpen(true);
              }}
              onOpenNewAppointment={() => handleOpenNewAppointment()}
              currentUser={currentUser}
            />
          )}

          {activeView === 'patients' && (
            <PatientList
              onSelectPatient={handleSelectPatient}
              onOpenNewPatientModal={() => {
                setPatientToEdit(null);
                setIsPatientModalOpen(true);
              }}
            />
          )}

          {activeView === 'patient-detail' && selectedPatientId && (
            <PatientDetailView
              patientId={selectedPatientId}
              onBack={() => handleChangeView('patients')}
              onOpenEditModal={handleOpenEditPatient}
              onOpenNewAppointment={handleOpenNewAppointment}
            />
          )}

          {activeView === 'agenda' && (
            <AgendaView
              onSelectPatient={handleSelectPatient}
              onOpenNewAppointmentModal={() => handleOpenNewAppointment()}
            />
          )}

          {activeView === 'treatments' && <TreatmentList onSelectPatient={handleSelectPatient} />}
          {activeView === 'budgets' && <BudgetList onSelectPatient={handleSelectPatient} />}
          {activeView === 'documents' && <DocumentList />}
          {activeView === 'reports' && <ReportsView />}
        </main>
      </div>

      <PatientFormModal
        isOpen={isPatientModalOpen}
        onClose={() => {
          setIsPatientModalOpen(false);
          setPatientToEdit(null);
        }}
        patientToEdit={patientToEdit}
        onSaved={(patient) => handleSelectPatient(patient.id)}
      />

      <AppointmentFormModal
        isOpen={isAppointmentModalOpen}
        onClose={() => {
          setIsAppointmentModalOpen(false);
          setAppointmentDefaultPatient(undefined);
        }}
        defaultPatientId={appointmentDefaultPatient}
      />
    </div>
  );
}

export default App;
