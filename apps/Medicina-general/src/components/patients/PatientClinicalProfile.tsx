import React, { useState } from 'react';
import {
  User,
  Activity,
  FileText,
  Pill,
  Clock,
  ShieldAlert,
  Film,
  FolderOpen,
  CheckSquare,
  ShieldCheck,
} from 'lucide-react';
import { useClinicalStore } from '../../services/clinical/clinicalStore';
import {
  getPatientById,
  getPatientAllergies,
  getPatientAlerts,
  getPatientDiagnoses,
  getLatestVitalSigns,
  getPatientTimeline,
  getPatientActiveMedications,
  getPatientMedications,
  getPatientLabs,
  getPatientImagingStudies,
  getPatientDocuments,
  getPatientFollowUps,
  getPatientPreventiveItems,
} from '../../services/clinical/clinicalSelectors';
import { calculateAge } from '../../services/clinical/clinicalSelectors';
import { PatientHeader } from './PatientHeader';
import { ClinicalAlertBadge } from '../ui/ClinicalAlertBadge';
import { LongitudinalTimeline } from '../clinical/LongitudinalTimeline';
import { MedicationManager } from '../medications/MedicationManager';
import { LabResultsViewer } from '../labs/LabResultsViewer';
import { ImagingStudyViewer } from '../imaging/ImagingStudyViewer';
import { ClinicalDocumentManager } from '../documents/ClinicalDocumentManager';
import { FollowUpTaskBoard } from '../tasks/FollowUpTaskBoard';
import { PreventiveCareSection } from '../prevention/PreventiveCareSection';

export interface PatientClinicalProfileProps {
  patientId: string;
  onBack: () => void;
  onOpenSoapModal: (patientId?: string, consultationId?: string) => void;
  onOpenPrescriptionModal: (patientId?: string, consultationId?: string, prescriptionId?: string) => void;
  onEditPatient: (patientId: string) => void;
}

export type ProfileTab =
  | 'SUMMARY'
  | 'TIMELINE'
  | 'MEDICATIONS'
  | 'LABS'
  | 'IMAGING'
  | 'DOCUMENTS'
  | 'TASKS'
  | 'PREVENTION';

export const PatientClinicalProfile: React.FC<PatientClinicalProfileProps> = ({
  patientId,
  onBack,
  onOpenSoapModal,
  onOpenPrescriptionModal,
  onEditPatient,
}) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('SUMMARY');

  const state = useClinicalStore((s) => s);
  const patient = getPatientById(state, patientId);

  if (!patient) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 shadow-xs">
        <p className="text-sm font-semibold">Paciente no encontrado ({patientId}).</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs rounded-xl transition font-bold"
        >
          Volver al Directorio
        </button>
      </div>
    );
  }

  const allergies = getPatientAllergies(state, patientId);
  const alerts = getPatientAlerts(state, patientId);
  const diagnoses = getPatientDiagnoses(state, patientId);
  const latestVitals = getLatestVitalSigns(state, patientId);
  const timeline = getPatientTimeline(state, patientId);
  const activeMedications = getPatientActiveMedications(state, patientId);
  const allMedications = getPatientMedications(state, patientId);
  const labs = getPatientLabs(state, patientId);
  const imaging = getPatientImagingStudies(state, patientId);
  const documents = getPatientDocuments(state, patientId);
  const tasks = getPatientFollowUps(state, patientId);
  const preventiveItems = getPatientPreventiveItems(state, patientId);

  const tabs: { id: ProfileTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'SUMMARY', label: 'Resumen Clínico', icon: <User className="w-4 h-4" /> },
    { id: 'TIMELINE', label: 'Historial', icon: <Clock className="w-4 h-4 text-sky-600" />, count: timeline.length },
    { id: 'MEDICATIONS', label: 'Tratamientos', icon: <Pill className="w-4 h-4 text-teal-600" />, count: activeMedications.length },
    { id: 'LABS', label: 'Laboratorios', icon: <Activity className="w-4 h-4 text-emerald-600" />, count: labs.length },
    { id: 'IMAGING', label: 'Imagenología', icon: <Film className="w-4 h-4 text-purple-600" />, count: imaging.length },
    { id: 'DOCUMENTS', label: 'Documentos', icon: <FolderOpen className="w-4 h-4 text-amber-600" />, count: documents.length },
    { id: 'TASKS', label: 'Seguimientos', icon: <CheckSquare className="w-4 h-4 text-blue-600" />, count: tasks.length },
    { id: 'PREVENTION', label: 'Prevención', icon: <ShieldCheck className="w-4 h-4 text-rose-600" />, count: preventiveItems.length },
  ];

  return (
    <div className="space-y-6">
      {/* Patient Header Banner */}
      <PatientHeader
        patient={patient}
        allergies={allergies}
        latestVitals={latestVitals}
        onBack={onBack}
        onOpenSoapModal={onOpenSoapModal}
        onOpenPrescriptionModal={onOpenPrescriptionModal}
      />

      {/* Navigation Tab Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-white p-2 rounded-2xl border border-slate-200 shadow-xs no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === tab.id
                ? 'bg-sky-50 text-sky-700 border border-sky-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === tab.id ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        {activeTab === 'SUMMARY' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between"><h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Datos del paciente</h4><button onClick={() => onEditPatient(patient.id)} className="text-xs font-semibold text-sky-700">Editar</button></div>
                <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                  <div><span className="block text-[10px] text-slate-400">Teléfono</span>{patient.phone || 'Sin información registrada.'}</div>
                  <div><span className="block text-[10px] text-slate-400">Correo</span>{patient.email || 'Sin información registrada.'}</div>
                  <div><span className="block text-[10px] text-slate-400">Nacimiento</span>{patient.birthDate || 'Sin información registrada.'}</div>
                  <div><span className="block text-[10px] text-slate-400">Edad</span>{patient.birthDate ? `${calculateAge(patient.birthDate)} años` : 'Sin información registrada.'}</div>
                  <div><span className="block text-[10px] text-slate-400">Sexo / Género</span>{patient.gender === 'FEMALE' ? 'Femenino' : patient.gender === 'MALE' ? 'Masculino' : 'Sin información registrada.'}</div>
                  <div><span className="block text-[10px] text-slate-400">Dirección</span>{patient.address || 'Sin información registrada.'}</div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between"><h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Datos anamnésticos</h4><button onClick={() => onEditPatient(patient.id)} className="text-xs font-semibold text-sky-700">Editar</button></div>
                {patient.anamnesis && Object.values(patient.anamnesis).some(Boolean) ? <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                  <div><span className="block text-[10px] text-slate-400">Altura</span>{patient.anamnesis.heightCm ? `${patient.anamnesis.heightCm} cm` : 'Sin información registrada.'}</div>
                  <div><span className="block text-[10px] text-slate-400">Peso</span>{patient.anamnesis.weightKg ? `${patient.anamnesis.weightKg} kg` : 'Sin información registrada.'}</div>
                  <div><span className="block text-[10px] text-slate-400">Tipo de sangre</span>{patient.bloodType || 'Sin información registrada.'}</div>
                  <div><span className="block text-[10px] text-slate-400">Alergias</span>{patient.anamnesis.allergies || 'Sin información registrada.'}</div>
                  <div className="col-span-2"><span className="block text-[10px] text-slate-400">Antecedentes y condiciones</span>{[patient.anamnesis.currentIllnesses, patient.anamnesis.chronicDiseases, patient.anamnesis.personalHistory].filter(Boolean).join(' · ') || 'Sin información registrada.'}</div>
                </div> : <p className="text-xs text-slate-500">Sin datos anamnésticos registrados.</p>}
              </section>

              <section className="rounded-xl border border-slate-200 p-4 lg:col-span-2">
                <div className="mb-3 flex items-center justify-between"><h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Contacto de emergencia</h4><button onClick={() => onEditPatient(patient.id)} className="text-xs font-semibold text-sky-700">Editar</button></div>
                {patient.emergencyContact ? <div className="grid grid-cols-1 gap-3 text-xs text-slate-600 sm:grid-cols-3"><div><span className="block text-[10px] text-slate-400">Nombre</span>{patient.emergencyContact.name || 'Sin información registrada.'}</div><div><span className="block text-[10px] text-slate-400">Teléfono</span>{patient.emergencyContact.phone || 'Sin información registrada.'}</div><div><span className="block text-[10px] text-slate-400">Parentesco</span>{patient.emergencyContact.relationship || 'Sin información registrada.'}</div></div> : <p className="text-xs text-slate-500">Sin contacto de emergencia registrado.</p>}
              </section>
            </div>

            {/* Active Alerts */}
            {alerts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" /> Alertas Clínicas Activas
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {alerts.map((alt) => (
                    <ClinicalAlertBadge
                      key={alt.id}
                      type={alt.type}
                      severity={alt.severity}
                      title={alt.title}
                      description={alt.description}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Active Diagnoses CIE-10 */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-sky-600" /> Diagnósticos Activos CIE-10
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {diagnoses.map((d) => (
                  <div key={d.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sky-800">{d.cie10Code}</span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-200 text-slate-700">
                        {d.type}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-900">{d.description}</p>
                    <span className="text-[10px] text-slate-500 font-mono block">Diagnosticado: {d.diagnosedAt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Medications Summary */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-amber-600" /> Tratamientos Farmacológicos Activos
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {activeMedications.map((m) => (
                  <div key={m.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>{m.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold">
                        ACTIVO
                      </span>
                    </div>
                    <p className="font-mono text-amber-800 text-[11px] font-medium">
                      {m.dose} | {m.frequency} ({m.route})
                    </p>
                    {m.indication && <p className="text-slate-500 text-[10px]">{m.indication}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'TIMELINE' && (
          <LongitudinalTimeline
            events={timeline}
            onOpenSoapModal={onOpenSoapModal}
            onOpenPrescriptionModal={onOpenPrescriptionModal}
          />
        )}

        {activeTab === 'MEDICATIONS' && (
          <MedicationManager
            medications={allMedications}
            onOpenPrescriptionModal={() => onOpenPrescriptionModal(patient.id)}
          />
        )}

        {activeTab === 'LABS' && <LabResultsViewer labResults={labs} patientId={patientId} />}

        {activeTab === 'IMAGING' && <ImagingStudyViewer imagingStudies={imaging} patientId={patientId} />}

        {activeTab === 'DOCUMENTS' && <ClinicalDocumentManager documents={documents} patientId={patientId} />}

        {activeTab === 'TASKS' && <FollowUpTaskBoard tasks={tasks} patientId={patientId} />}

        {activeTab === 'PREVENTION' && <PreventiveCareSection preventiveItems={preventiveItems} patientId={patientId} />}
      </div>
    </div>
  );
};
