import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Pill,
  AlertTriangle,
  Search,
  Loader2,
  Lock,
} from 'lucide-react';
import { clinicalStore, useClinicalStore } from '../../services/clinical/clinicalStore';
import { getPatientActiveMedications, getPatientAllergies } from '../../services/clinical/clinicalSelectors';
import type { Consultation, Diagnosis, Patient, VitalSigns } from '../../types/clinical.types';
import { medicineApi } from '../../services/api/medicineApi';

interface SoapModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  consultationId?: string | null;
  appointmentId?: string | null;
  mode?: 'CREATE' | 'CONTINUE' | 'VIEW';
  onOpenPrescription?: (patientId?: string, consultationId?: string) => void;
}

export const SoapConsultationModal: React.FC<SoapModalProps> = ({
  isOpen,
  onClose,
  patient,
  consultationId,
  appointmentId,
  mode,
  onOpenPrescription,
}) => {
  const state = useClinicalStore((currentState) => currentState);
  const activeOrgId = state.activeOrganization?.id;

  const targetAppointment = appointmentId
    ? state.appointments.find((apt) => String(apt.id) === String(appointmentId))
    : undefined;
  const effectiveConsultationId = consultationId || targetAppointment?.consultationId || null;
  const isExisting = Boolean(effectiveConsultationId);

  // Buscar la consulta en el store si existe
  const initialConsultation = effectiveConsultationId
    ? state.consultations.find((c) => String(c.id) === String(effectiveConsultationId))
    : undefined;

  const effectiveMode: 'CREATE' | 'CONTINUE' | 'VIEW' =
    mode ||
    (isExisting
      ? initialConsultation?.status === 'SIGNED'
        ? 'VIEW'
        : 'CONTINUE'
      : 'CREATE');

  const initialVitals = initialConsultation?.vitalSignsId
    ? state.vitalSigns.find((vital) => String(vital.id) === String(initialConsultation.vitalSignsId))
    : effectiveConsultationId
    ? state.vitalSigns.find((vital) => String(vital.consultationId) === String(effectiveConsultationId))
    : undefined;

  const initialDiagnosis = initialConsultation?.diagnosisIds[0]
    ? state.diagnoses.find((item) => item.id === initialConsultation.diagnosisIds[0])
    : undefined;

  const getInitialCie10 = (c?: Consultation, d?: Diagnosis): string => {
    if (c?.cie10Code) {
      return `${c.cie10Code} - ${c.cie10Description || c.assessment || ''}`.trim();
    }
    if (d?.cie10Code) {
      return `${d.cie10Code} - ${d.description || ''}`.trim();
    }
    return c?.assessment || '';
  };

  const [isLoading, setIsLoading] = useState<boolean>(() => isExisting && !initialConsultation);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Estado del formulario
  const [reason, setReason] = useState<string>(initialConsultation?.reason || '');
  const [subjective, setSubjective] = useState<string>(initialConsultation?.subjective || '');
  const [objective, setObjective] = useState<string>(initialConsultation?.objective || '');
  const [bloodPressure, setBloodPressure] = useState<string>(
    initialVitals?.bloodPressureSystolic !== undefined && initialVitals?.bloodPressureDiastolic !== undefined
      ? `${initialVitals.bloodPressureSystolic}/${initialVitals.bloodPressureDiastolic}`
      : ''
  );
  const [heartRate, setHeartRate] = useState<string>(
    initialVitals?.heartRate !== undefined ? String(initialVitals.heartRate) : ''
  );
  const [temperature, setTemperature] = useState<string>(
    initialVitals?.temperatureC !== undefined ? String(initialVitals.temperatureC) : ''
  );
  const [weight, setWeight] = useState<string>(
    initialVitals?.weightKg !== undefined ? String(initialVitals.weightKg) : ''
  );
  const [cie10, setCie10] = useState<string>(getInitialCie10(initialConsultation, initialDiagnosis));
  const [plan, setPlan] = useState<string>(initialConsultation?.plan || '');
  const [status, setStatus] = useState<Consultation['status']>(initialConsultation?.status || 'DRAFT');
  const [signedBy, setSignedBy] = useState<string | undefined>(initialConsultation?.signedBy);
  const [signedAt, setSignedAt] = useState<string | undefined>(initialConsultation?.signedAt);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Carga asíncrona de consulta existente desde la API para garantizar datos completos de PostgreSQL
  useEffect(() => {
    let isCancelled = false;

    if (isOpen && isExisting && effectiveConsultationId && activeOrgId) {
      if (!initialConsultation) {
        setIsLoading(true);
      }
      setLoadError(null);

      medicineApi
        .getConsultationById(activeOrgId, effectiveConsultationId)
        .then((apiC) => {
          if (isCancelled || !apiC) return;

          setReason(apiC.reason || '');
          setSubjective(apiC.subjective || '');
          setObjective(apiC.objective || '');
          setPlan(apiC.plan || '');
          setStatus((apiC.status as Consultation['status']) || 'DRAFT');
          setSignedBy(apiC.signedBy || undefined);
          setSignedAt(apiC.signedAt || undefined);

          if (apiC.cie10Code) {
            setCie10(`${apiC.cie10Code} - ${apiC.cie10Description || apiC.assessment || ''}`.trim());
          } else {
            setCie10(apiC.assessment || '');
          }

          if (apiC.vitalSigns && apiC.vitalSigns.length > 0) {
            const v = apiC.vitalSigns[0];
            if (
              v.bloodPressureSystolic !== null &&
              v.bloodPressureDiastolic !== null &&
              v.bloodPressureSystolic !== undefined
            ) {
              setBloodPressure(`${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`);
            }
            if (v.heartRate !== null && v.heartRate !== undefined) {
              setHeartRate(String(v.heartRate));
            }
            if (v.temperatureC !== null && v.temperatureC !== undefined) {
              setTemperature(String(v.temperatureC));
            }
            if (v.weightKg !== null && v.weightKg !== undefined) {
              setWeight(String(v.weightKg));
            }
          }
          setIsLoading(false);
        })
        .catch((err) => {
          if (isCancelled) return;
          console.error('[SoapConsultationModal] Error recuperando consulta:', err);
          if (!initialConsultation) {
            setLoadError('No se pudo recuperar la consulta médica desde el servidor.');
          }
          setIsLoading(false);
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [isOpen, effectiveConsultationId, isExisting, activeOrgId]);

  if (!isOpen || !patient) return null;

  const allergies = getPatientAllergies(state, patient.id).filter((allergy) => allergy.status === 'ACTIVE');
  const activeMedications = getPatientActiveMedications(state, patient.id);
  const patientDoc = patient.idNumber || 'No registrada';
  const isSigned = status === 'SIGNED';
  const isReadOnly = effectiveMode === 'VIEW' || isSigned;

  const parseNumber = (value: string): number | undefined => {
    const parsed = Number(value.replace(',', '.'));
    return value.trim() && Number.isFinite(parsed) ? parsed : undefined;
  };

  const parseBloodPressure = (): { systolic?: number; diastolic?: number } => {
    const [systolic, diastolic] = bloodPressure.split('/').map((value) => parseNumber(value));
    return { systolic, diastolic };
  };

  const saveConsultation = async (targetStatus: Consultation['status']) => {
    if (!patient || !reason.trim() || isSaving) return;
    setIsSaving(true);
    setErrorMessage(null);

    const now = new Date().toISOString();
    const diagnosisText = cie10.trim();
    const [cie10Code, ...descriptionParts] = diagnosisText.split(' - ');
    const diagnosisDescription = descriptionParts.join(' - ').trim() || cie10Code.trim();

    const currentConsultationId = effectiveConsultationId || `cns-${Date.now()}`;

    const diagnosis: Diagnosis | undefined = diagnosisText
      ? {
          id: initialConsultation?.diagnosisIds[0] || `diag-${currentConsultationId}`,
          patientId: patient.id,
          consultationId: currentConsultationId,
          cie10Code: cie10Code.trim(),
          description: diagnosisDescription,
          type: 'PRIMARY',
          status: 'ACTIVE',
          diagnosedAt: now,
        }
      : undefined;

    const bloodPressureValues = parseBloodPressure();
    const vitalSigns: VitalSigns | undefined = bloodPressure || heartRate || temperature || weight
      ? {
          id: initialConsultation?.vitalSignsId || `vital-${currentConsultationId}`,
          patientId: patient.id,
          consultationId: currentConsultationId,
          bloodPressureSystolic: bloodPressureValues.systolic,
          bloodPressureDiastolic: bloodPressureValues.diastolic,
          heartRate: parseNumber(heartRate),
          temperatureC: parseNumber(temperature),
          weightKg: parseNumber(weight),
          measuredAt: now,
        }
      : undefined;

    try {
      if (isExisting && effectiveConsultationId) {
        const updatedConsultation: Consultation = {
          ...initialConsultation,
          id: effectiveConsultationId,
          patientId: patient.id,
          date: initialConsultation?.date || now,
          reason: reason.trim(),
          subjective: subjective.trim(),
          objective: objective.trim(),
          assessment: diagnosisDescription || undefined,
          plan: plan.trim(),
          cie10Code: cie10Code.trim() || undefined,
          cie10Description: diagnosisDescription || undefined,
          status: targetStatus,
          createdBy: initialConsultation?.createdBy || 'Profesional Médico',
          createdAt: initialConsultation?.createdAt || now,
          signedBy: targetStatus === 'SIGNED' ? (state.currentUser?.name || 'Dr. Roberto Silva') : undefined,
          signedAt: targetStatus === 'SIGNED' ? now : undefined,
          vitalSignsId: vitalSigns?.id || initialConsultation?.vitalSignsId,
          diagnosisIds: diagnosis ? [diagnosis.id] : initialConsultation?.diagnosisIds || [],
        };

        await clinicalStore.updateConsultation(updatedConsultation, vitalSigns, diagnosis);

        if (appointmentId) {
          await clinicalStore.updateAppointment(appointmentId, {
            consultationId: effectiveConsultationId,
            status: targetStatus === 'SIGNED' ? 'ATTENDED' : 'IN_CONSULTATION',
          }).catch((err) => console.warn('[SoapConsultationModal] Error actualizando cita vinculada:', err));
        }
      } else {
        const newConsultation: Consultation = {
          id: `cns-${Date.now()}`,
          patientId: patient.id,
          date: now,
          reason: reason.trim(),
          subjective: subjective.trim(),
          objective: objective.trim(),
          assessment: diagnosisDescription || undefined,
          plan: plan.trim(),
          cie10Code: cie10Code.trim() || undefined,
          cie10Description: diagnosisDescription || undefined,
          status: targetStatus,
          createdBy: state.currentUser?.name || 'Profesional Médico',
          createdAt: now,
          signedBy: targetStatus === 'SIGNED' ? (state.currentUser?.name || 'Dr. Roberto Silva') : undefined,
          signedAt: targetStatus === 'SIGNED' ? now : undefined,
          vitalSignsId: vitalSigns?.id,
          diagnosisIds: diagnosis ? [diagnosis.id] : [],
        };

        const created = await clinicalStore.addConsultation(newConsultation, vitalSigns, diagnosis);

        if (appointmentId) {
          await clinicalStore.updateAppointment(appointmentId, {
            consultationId: created.id,
            status: targetStatus === 'SIGNED' ? 'ATTENDED' : 'IN_CONSULTATION',
          }).catch((err) => console.warn('[SoapConsultationModal] Error vinculando cita a nueva consulta:', err));
        }
      }
      onClose();
    } catch (err: any) {
      console.error('Error al guardar consulta:', err);
      setErrorMessage(err.message || 'Error al guardar la consulta.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = isReadOnly
    ? 'w-full p-2.5 sm:p-3 bg-slate-100 text-slate-700 rounded-xl text-xs border border-slate-200 cursor-default select-text'
    : 'w-full p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white transition';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabecera Estación Clínica */}
        <div className="p-4 sm:px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{patient.name}</h2>
              <span className="text-xs text-slate-500 font-mono">ID / HC: {patientDoc}</span>
              {isSigned ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  FIRMADA · Inmutable
                </span>
              ) : effectiveMode === 'VIEW' ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-500" />
                  CONSULTA FINALIZADA
                </span>
              ) : effectiveMode === 'CONTINUE' || isExisting ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  BORRADOR · Editable
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-100 text-sky-800 border border-sky-300">
                  NUEVA CONSULTA
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isSigned
                ? 'Expediente de Consulta Externa (Lectura Inmutable)'
                : effectiveMode === 'VIEW'
                ? 'Consulta médica SOAP (Modo Lectura)'
                : effectiveMode === 'CONTINUE' || isExisting
                ? 'Continuar Registro de Consulta Médica SOAP'
                : 'Registro de Nueva Consulta SOAP'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner de error de guardado */}
        {errorMessage && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {errorMessage}
          </div>
        )}

        {/* Banner informativo de consulta firmada */}
        {isSigned && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Consulta médica firmada por <strong>{signedBy || 'Profesional Médico'}</strong>
                {signedAt ? ` el ${new Date(signedAt).toLocaleString('es-EC')}` : ''}. Este registro es inmutable.
              </span>
            </div>
          </div>
        )}

        {/* Estado de carga */}
        {isLoading && (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600 mx-auto" />
            <p className="text-xs text-slate-600 font-medium">Recuperando datos de la consulta clínica...</p>
          </div>
        )}

        {/* Estado de error de lectura */}
        {!isLoading && loadError && (
          <div className="p-8 text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">Error al cargar consulta</h3>
            <p className="text-xs text-rose-600">{loadError}</p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Cuerpo de la Estación */}
        {!isLoading && !loadError && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Panel Izquierdo: Contexto Clínico */}
            <div className="md:col-span-4 space-y-4 border-b md:border-b-0 md:border-r border-slate-200 md:pr-6">
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Alertas y Alergias</span>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Alergias Conocidas</span>
                  </div>
                  <p className="text-xs text-rose-700">
                    {allergies.length > 0
                      ? allergies.map((allergy) => allergy.substance).join(', ')
                      : 'Sin alergias registradas'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Antecedentes Médicos
                </span>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1">
                  <div>
                    <span className="font-semibold">Antecedentes:</span>{' '}
                    {patient.anamnesis?.personalHistory ||
                      patient.anamnesis?.chronicDiseases ||
                      'Sin antecedentes registrados'}
                  </div>
                  <div>
                    <span className="font-semibold">Medicación activa:</span>{' '}
                    {activeMedications.length > 0
                      ? activeMedications.map((medication) => medication.name).join(', ')
                      : 'Sin medicación activa'}
                  </div>
                </div>
              </div>

              {/* Acciones Rápidas desde la consulta */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Acciones en Consulta
                </span>
                <button
                  type="button"
                  onClick={() => patient && onOpenPrescription?.(patient.id, effectiveConsultationId || undefined)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 text-xs font-bold flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-teal-600" />
                    <span>+ Prescribir Receta</span>
                  </div>
                  <span className="text-[10px] font-mono bg-teal-200/60 px-1.5 py-0.5 rounded">SRI</span>
                </button>
              </div>
            </div>

            {/* Panel Derecho: Formulario SOAP */}
            <div className="md:col-span-8 space-y-4">
              {/* Signos Vitales */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Constantes Vitales
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <label className="text-[10px] text-slate-500 font-bold block">PA (mmHg)</label>
                    <input
                      type="text"
                      value={bloodPressure}
                      readOnly={isReadOnly}
                      placeholder="Ej: 120/80"
                      onChange={(e) => setBloodPressure(e.target.value)}
                      className={`w-full text-xs font-bold bg-transparent focus:outline-none ${
                        isReadOnly ? 'text-slate-600 cursor-default' : 'text-slate-800'
                      }`}
                    />
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <label className="text-[10px] text-slate-500 font-bold block">FC (lpm)</label>
                    <input
                      type="text"
                      value={heartRate}
                      readOnly={isReadOnly}
                      placeholder="Ej: 75"
                      onChange={(e) => setHeartRate(e.target.value)}
                      className={`w-full text-xs font-bold bg-transparent focus:outline-none ${
                        isReadOnly ? 'text-slate-600 cursor-default' : 'text-slate-800'
                      }`}
                    />
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <label className="text-[10px] text-slate-500 font-bold block">Temp (°C)</label>
                    <input
                      type="text"
                      value={temperature}
                      readOnly={isReadOnly}
                      placeholder="Ej: 36.5"
                      onChange={(e) => setTemperature(e.target.value)}
                      className={`w-full text-xs font-bold bg-transparent focus:outline-none ${
                        isReadOnly ? 'text-slate-600 cursor-default' : 'text-slate-800'
                      }`}
                    />
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <label className="text-[10px] text-slate-500 font-bold block">Peso (kg)</label>
                    <input
                      type="text"
                      value={weight}
                      readOnly={isReadOnly}
                      placeholder="Ej: 70"
                      onChange={(e) => setWeight(e.target.value)}
                      className={`w-full text-xs font-bold bg-transparent focus:outline-none ${
                        isReadOnly ? 'text-slate-600 cursor-default' : 'text-slate-800'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Motivo & Evolución */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Motivo de Consulta *</label>
                <input
                  value={reason}
                  readOnly={isReadOnly}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Motivo principal de la consulta..."
                  className={inputClass}
                />
                <textarea
                  rows={3}
                  value={subjective}
                  readOnly={isReadOnly}
                  onChange={(e) => setSubjective(e.target.value)}
                  placeholder="Describa el cuadro clínico del paciente (Subjetivo)..."
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Examen Físico / Objetivo</label>
                <textarea
                  rows={2}
                  value={objective}
                  readOnly={isReadOnly}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Registre los hallazgos objetivos..."
                  className={inputClass}
                />
              </div>

              {/* Diagnóstico CIE-10 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Diagnóstico Principal (CIE-10)</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={cie10}
                    readOnly={isReadOnly}
                    onChange={(e) => setCie10(e.target.value)}
                    className={`pl-9 font-mono ${inputClass}`}
                    placeholder="Código CIE-10 o descripción..."
                  />
                </div>
              </div>

              {/* Plan de Tratamiento */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Plan de Tratamiento / Indicaciones</label>
                <textarea
                  rows={2}
                  value={plan}
                  readOnly={isReadOnly}
                  onChange={(e) => setPlan(e.target.value)}
                  placeholder="Indicaciones higiénico-dietéticas, reposo o cuidados..."
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {!isLoading && !loadError && (
          <div className="p-4 sm:px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
            {isReadOnly ? (
              <div className="flex items-center justify-between w-full">
                <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    {isSigned
                      ? 'Registro clínico firmado e inalterable'
                      : 'Consulta médica finalizada (modo lectura)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
                >
                  Cerrar Consulta
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => saveConsultation('DRAFT')}
                  disabled={isSaving}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Guardando...' : 'Guardar Borrador y Salir'}
                </button>

                <button
                  type="button"
                  onClick={() => saveConsultation('SIGNED')}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSaving ? 'Guardando...' : 'Finalizar Consulta'}</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};