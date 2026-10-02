import React, { useState, useEffect } from 'react';
import { Stethoscope, Loader2, AlertCircle, AlertTriangle, Building2, Plus } from 'lucide-react';
import { Sidebar } from './components/layout/Sidebar';
import type { NavigationTab } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { MedicalGeneralDashboard } from './components/dashboard/MedicalGeneralDashboard';
import { AdvancedAgenda } from './components/agenda/AdvancedAgenda';
import { PatientRecordsView } from './components/patients/PatientRecordsView';
import { PatientClinicalProfile } from './components/patients/PatientClinicalProfile';
import { PatientRegistrationModal } from './components/patients/PatientRegistrationModal';
import { SoapConsultationModal } from './components/consultation/SoapConsultationModal';
import { SriPrescriptionModal } from './components/prescription/SriPrescriptionModal';
import { OrganizationModal } from './components/organization/OrganizationModal';
import { BillingView } from './components/billing/BillingView';
import { SettingsView } from './components/settings/SettingsView';
import { clinicalStore, useClinicalStore } from './services/clinical/clinicalStore';
import { getSystemNotifications } from './services/clinical/clinicalSelectors';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isSoapOpen, setIsSoapOpen] = useState<boolean>(false);
  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState<boolean>(false);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState<boolean>(false);
  const [isOrgModalOpen, setIsOrgModalOpen] = useState<boolean>(false);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedConsultationId, setSelectedConsultationId] = useState<string | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [soapModalMode, setSoapModalMode] = useState<'CREATE' | 'CONTINUE' | 'VIEW' | undefined>(undefined);
  const [prescriptionPatientId, setPrescriptionPatientId] = useState<string | null>(null);
  const [prescriptionConsultationId, setPrescriptionConsultationId] = useState<string | null>(null);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string | null>(null);

  const state = useClinicalStore((currentState) => currentState);
  const {
    patients,
    currentUser,
    userOrganizations,
    activeOrganization,
    isMedicineEnabled,
    isInitialized,
    error,
  } = state;

  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId) ?? null;
  const prescriptionPatient =
    (prescriptionPatientId ? patients.find((patient) => patient.id === prescriptionPatientId) : null) ||
    selectedPatient ||
    (patients.length === 1 ? patients[0] : null);
  const notifications = getSystemNotifications(state);

  useEffect(() => {
    clinicalStore.init();
  }, []);

  const handleOpenPrescription = (
    patientId?: string,
    consultationId?: string,
    prescriptionId?: string
  ) => {
    const targetPatientId =
      patientId || selectedPatientId || (patients.length === 1 ? patients[0].id : null);
    if (targetPatientId) {
      setSelectedPatientId(targetPatientId);
      setPrescriptionPatientId(targetPatientId);
    } else {
      setPrescriptionPatientId(null);
    }
    setPrescriptionConsultationId(consultationId || null);
    setSelectedPrescriptionId(prescriptionId || null);
    setIsPrescriptionOpen(true);
  };

  const handleStartConsultation = (
    patientId?: string,
    consultationId?: string,
    appointmentId?: string,
    mode?: 'CREATE' | 'CONTINUE' | 'VIEW'
  ) => {
    if (patientId) {
      setSelectedPatientId(patientId);
    }
    setSelectedConsultationId(consultationId || null);
    setSelectedAppointmentId(appointmentId || null);
    setSoapModalMode(mode);
    setIsSoapOpen(true);
  };

  // 1. Pantalla de carga inicial mientras se conecta con Core y DB
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-cyan-500 text-slate-950 rounded-2xl shadow-lg shadow-cyan-500/20 animate-pulse">
            <Stethoscope className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-extrabold text-base text-white tracking-tight">MEDICINA GENERAL</h1>
            <p className="text-[10px] text-cyan-300 font-mono tracking-wider">ESTACIÓN CLÍNICA MULTI-TENANT</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Conectando con el Core y PostgreSQL...</span>
        </div>
      </div>
    );
  }

  // 2. Pantalla de sesión requerida si no hay cookie de sesión activa
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-4">
          <div className="w-14 h-14 bg-sky-500/10 border border-sky-500/30 text-sky-400 rounded-2xl flex items-center justify-center mx-auto">
            <Stethoscope className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-white">Sesión Requerida</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Debe iniciar sesión en el Core de Profesionales Ecuador para acceder a la estación clínica de Medicina General.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <a
              href="/login"
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-md transition text-center"
            >
              Iniciar Sesión en el Core
            </a>
            <button
              onClick={() => clinicalStore.init()}
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
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col lg:flex-row antialiased selection:bg-sky-500 selection:text-white">
      {/* Barra lateral con Modo Médico */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Área central */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 transition-all duration-300">
        <TopHeader
          onOpenMobileMenu={() => setIsSidebarOpen(true)}
          onOpenPatient={() => { setEditingPatientId(null); setIsRegistrationOpen(true); }}
          onOpenConsultation={() => setIsSoapOpen(true)}
          notifications={notifications}
          onMarkNotificationRead={clinicalStore.markNotificationRead}
          onMarkAllNotificationsRead={() => clinicalStore.markAllNotificationsRead(notifications)}
        />

        <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
          {error && (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => clinicalStore.setState((prev) => ({ ...prev, error: null }))}
                className="text-[11px] font-bold text-rose-800 hover:text-rose-950 underline"
              >
                Cerrar
              </button>
            </div>
          )}

          {userOrganizations.length === 0 && (
            <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50/70 p-6 text-center space-y-3">
              <Building2 className="w-10 h-10 text-sky-600 mx-auto" />
              <h3 className="font-bold text-sm text-slate-900">
                Bienvenido a la Estación Clínica de Medicina General
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Para comenzar a gestionar pacientes, citas y recetas electrónicas SRI, cree o configure su primera organización médica.
              </p>
              <button
                type="button"
                onClick={() => setIsOrgModalOpen(true)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Primera Organización</span>
              </button>
            </div>
          )}

          {activeOrganization && !isMedicineEnabled && (
            <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5 text-amber-900 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-amber-950">
                    Módulo Medicina General Inactivo para &ldquo;{activeOrganization.name}&rdquo;
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Para registrar pacientes, diagnósticos CIE-10 y recetas SRI en esta organización, active el módulo clínico.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => clinicalStore.enableMedicineModule()}
                className="shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                Activar Módulo MEDICINE
              </button>
            </div>
          )}

          {currentTab === 'dashboard' && (
            <MedicalGeneralDashboard
              onStartConsultation={handleStartConsultation}
              onViewAgenda={() => setCurrentTab('agenda')}
              onViewPatients={() => setCurrentTab('patients')}
            />
          )}

          {currentTab === 'agenda' && (
            <AdvancedAgenda
              onSelectPatient={(id: string) => {
                setSelectedPatientId(id);
                setCurrentTab('history');
              }}
              onOpenSoapModal={(patientId, consultationId, appointmentId, mode) =>
                handleStartConsultation(patientId, consultationId, appointmentId, mode)
              }
              onOpenPrescriptionModal={handleOpenPrescription}
            />
          )}

          {currentTab === 'patients' && (
            <PatientRecordsView
              onOpenRegistration={() => setIsRegistrationOpen(true)}
              onSelectPatient={(id: string) => {
                setSelectedPatientId(id);
                setCurrentTab('history');
              }}
              onOpenSoapModal={(patientId) => handleStartConsultation(patientId, undefined, undefined, 'CREATE')}
              onOpenPrescriptionModal={handleOpenPrescription}
            />
          )}

          {currentTab === 'history' && (
            <PatientClinicalProfile
              patientId={selectedPatient?.id || ''}
              onBack={() => setCurrentTab('patients')}
              onOpenSoapModal={(patientId, consultationId) =>
                handleStartConsultation(
                  patientId || selectedPatient?.id,
                  consultationId,
                  undefined,
                  consultationId ? 'VIEW' : 'CREATE'
                )
              }
              onOpenPrescriptionModal={handleOpenPrescription}
              onEditPatient={(patientId: string) => { setEditingPatientId(patientId); setIsRegistrationOpen(true); }}
            />
          )}

          {currentTab === 'billing' && (
            <BillingView />
          )}

          {currentTab === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>

      {/* Modal Consulta SOAP */}
      <SoapConsultationModal
        key={`soap-${selectedPatientId || 'none'}-${selectedConsultationId || 'new'}-${selectedAppointmentId || 'none'}-${soapModalMode || 'default'}-${isSoapOpen ? 'open' : 'closed'}`}
        isOpen={isSoapOpen}
        onClose={() => {
          setIsSoapOpen(false);
          setSelectedConsultationId(null);
          setSelectedAppointmentId(null);
          setSoapModalMode(undefined);
        }}
        patient={selectedPatient}
        consultationId={selectedConsultationId}
        appointmentId={selectedAppointmentId}
        mode={soapModalMode}
        onOpenPrescription={handleOpenPrescription}
      />

      {/* Modal Receta */}
      <SriPrescriptionModal
        key={`prescription-${prescriptionPatient?.id || selectedPatientId || 'none'}-${selectedPrescriptionId || 'new'}-${isPrescriptionOpen ? 'open' : 'closed'}`}
        isOpen={isPrescriptionOpen}
        onClose={() => {
          setIsPrescriptionOpen(false);
          setSelectedPrescriptionId(null);
          setPrescriptionConsultationId(null);
          setPrescriptionPatientId(null);
        }}
        patient={prescriptionPatient}
        consultationId={prescriptionConsultationId}
        prescriptionId={selectedPrescriptionId}
      />

      <PatientRegistrationModal
        key={`patient-form-${editingPatientId || 'new'}-${isRegistrationOpen ? 'open' : 'closed'}`}
        isOpen={isRegistrationOpen}
        onClose={() => setIsRegistrationOpen(false)}
        patient={editingPatientId ? patients.find((patient) => patient.id === editingPatientId) : null}
        onRegistered={(patientId) => {
          setSelectedPatientId(patientId);
          setCurrentTab('history');
        }}
      />

      <OrganizationModal
        isOpen={isOrgModalOpen}
        onClose={() => setIsOrgModalOpen(false)}
      />
    </div>
  );
};

export default App;