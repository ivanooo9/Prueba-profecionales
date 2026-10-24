import React, { useState, useEffect, useMemo } from 'react';
import { dentalService } from '../../services/dentalService';
import {
  Save,
  AlertTriangle,
  Pill,
  Stethoscope,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ShieldAlert,
  HeartPulse,
  ClipboardList,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ClinicalHistoryProps {
  patientId: string;
}

export const ClinicalHistory: React.FC<ClinicalHistoryProps> = ({ patientId }) => {
  const initialHistory = dentalService.getClinicalHistory(patientId);

  // Estados de los 7 campos clínicos persistentes
  const [medicalBackground, setMedicalBackground] = useState(initialHistory.medicalBackground || '');
  const [allergies, setAllergies] = useState(initialHistory.allergies || '');
  const [currentMedication, setCurrentMedication] = useState(initialHistory.currentMedication || '');
  const [dentalBackground, setDentalBackground] = useState(initialHistory.dentalBackground || '');
  const [chiefComplaint, setChiefComplaint] = useState(initialHistory.chiefComplaint || '');
  const [evaluationNotes, setEvaluationNotes] = useState(initialHistory.evaluationNotes || '');
  const [diagnosisSummary, setDiagnosisSummary] = useState(initialHistory.diagnosisSummary || '');

  // Snapshot de los datos guardados para cálculo fiable de isDirty
  const [savedSnapshot, setSavedSnapshot] = useState({
    medicalBackground: initialHistory.medicalBackground || '',
    allergies: initialHistory.allergies || '',
    currentMedication: initialHistory.currentMedication || '',
    dentalBackground: initialHistory.dentalBackground || '',
    chiefComplaint: initialHistory.chiefComplaint || '',
    evaluationNotes: initialHistory.evaluationNotes || '',
    diagnosisSummary: initialHistory.diagnosisSummary || '',
  });

  // Estados de interfaz y feedback
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSecondaryBackgrounds, setShowSecondaryBackgrounds] = useState(false);

  // Cargar ficha clínica del paciente evitando carreras asíncronas
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    dentalService.loadDentalRecord(patientId)
      .then(history => {
        if (!isMounted) return;
        const snapshot = {
          allergies: history.allergies || '',
          medicalBackground: history.medicalBackground || '',
          currentMedication: history.currentMedication || '',
          dentalBackground: history.dentalBackground || '',
          chiefComplaint: history.chiefComplaint || '',
          evaluationNotes: history.evaluationNotes || '',
          diagnosisSummary: history.diagnosisSummary || '',
        };
        setSavedSnapshot(snapshot);
        setAllergies(snapshot.allergies);
        setMedicalBackground(snapshot.medicalBackground);
        setCurrentMedication(snapshot.currentMedication);
        setDentalBackground(snapshot.dentalBackground);
        setChiefComplaint(snapshot.chiefComplaint);
        setEvaluationNotes(snapshot.evaluationNotes);
        setDiagnosisSummary(snapshot.diagnosisSummary);

        // Si ya hay antecedentes secundarios registrados, expandir por conveniencia
        if (snapshot.medicalBackground || snapshot.dentalBackground) {
          setShowSecondaryBackgrounds(true);
        }
        setIsLoading(false);
      })
      .catch(err => {
        if (!isMounted) return;
        console.error('[ClinicalHistory] Error loading record:', err);
        setErrorMessage('Error al cargar la historia clínica desde el servidor.');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [patientId]);

  // Tri-state seguro de alergias (sin asumir que vacío equivale a sin alergias)
  type AllergyStateType = 'active' | 'none' | 'unconfirmed';

  const allergyState = useMemo<AllergyStateType>(() => {
    const clean = (allergies || '').trim();
    if (!clean) return 'unconfirmed';
    if (/^(ningun[oa]|niega|sin alergia|no refiere|no presenta|negativ[oa]|no\b)/i.test(clean)) {
      return 'none';
    }
    return 'active';
  }, [allergies]);

  // Detección de cambios sin guardar
  const isDirty = useMemo(() => {
    return (
      allergies.trim() !== savedSnapshot.allergies.trim() ||
      medicalBackground.trim() !== savedSnapshot.medicalBackground.trim() ||
      currentMedication.trim() !== savedSnapshot.currentMedication.trim() ||
      dentalBackground.trim() !== savedSnapshot.dentalBackground.trim() ||
      chiefComplaint.trim() !== savedSnapshot.chiefComplaint.trim() ||
      evaluationNotes.trim() !== savedSnapshot.evaluationNotes.trim() ||
      diagnosisSummary.trim() !== savedSnapshot.diagnosisSummary.trim()
    );
  }, [
    allergies,
    medicalBackground,
    currentMedication,
    dentalBackground,
    chiefComplaint,
    evaluationNotes,
    diagnosisSummary,
    savedSnapshot
  ]);

  // Conteo de campos secundarios completados para indicador visual
  const secondaryFieldsCount = useMemo(() => {
    let count = 0;
    if (medicalBackground.trim()) count++;
    if (dentalBackground.trim()) count++;
    return count;
  }, [medicalBackground, dentalBackground]);

  // Guardar en backend manteniendo datos tipeados si falla
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving || isLoading || !isDirty) return;

    setIsSaving(true);
    setErrorMessage(null);

    const payload = {
      medicalBackground: medicalBackground.trim(),
      allergies: allergies.trim(),
      currentMedication: currentMedication.trim(),
      dentalBackground: dentalBackground.trim(),
      chiefComplaint: chiefComplaint.trim(),
      evaluationNotes: evaluationNotes.trim(),
      diagnosisSummary: diagnosisSummary.trim(),
    };

    try {
      await dentalService.updateClinicalHistory(patientId, payload);
      // Solo tras confirmación del servidor actualizamos el snapshot guardado
      setSavedSnapshot(payload);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err: any) {
      console.error('[ClinicalHistory] Error saving record:', err);
      // Los datos tipeados por el usuario permanecen intactos en los estados
      setErrorMessage(err.message || 'Error al guardar la historia clínica en el servidor.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 animate-fade-in text-left">
      {/* Cabecera de la Sección: Título e Indicador de Alergias */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-700 shrink-0">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">Historia Clínica y Anamnesis</h3>
              <p className="text-[11px] text-slate-500">Expediente médico general y evolución odontológica</p>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-200 hidden md:block" />

          {/* Badge de Seguridad de Alergias Tri-State */}
          {allergyState === 'active' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-xs">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Alerta Médica: Alergias Activas</span>
            </span>
          )}

          {allergyState === 'none' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Sin alergias conocidas (Confirmado)</span>
            </span>
          )}

          {allergyState === 'unconfirmed' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Alergias: No evaluadas / Sin registrar</span>
            </span>
          )}

          {/* Tag de Cambios sin Guardar */}
          {isDirty && !isLoading && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
              Cambios sin guardar
            </span>
          )}
        </div>
      </div>

      {/* Alertas de Feedback Flotantes */}
      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between gap-2 shadow-xs animate-fade-in font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Historia clínica sincronizada y guardada exitosamente en el servidor.</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-mono font-bold">Guardado</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs flex items-center gap-2 shadow-xs animate-fade-in font-medium">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage} (Sus datos no se han perdido, verifique la conexión y vuelva a intentar).</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECCIÓN 1: ANTECEDENTES Y SEGURIDAD DEL PACIENTE                          */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-rose-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              1. Antecedentes y Seguridad del Paciente
            </h4>
          </div>
          <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
            Información médica basal crítica para la seguridad clínica
          </span>
        </div>

        <div className="p-5 space-y-4">
          {/* Bloque Superior: Alergias y Medicación Habitual */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tarjeta de Alergias Conocidas (Siempre Visible) */}
            <div className={`p-4 rounded-xl border transition-colors ${
              allergyState === 'active'
                ? 'bg-rose-50/40 border-rose-300'
                : allergyState === 'none'
                  ? 'bg-emerald-50/30 border-emerald-200'
                  : 'bg-amber-50/25 border-amber-200'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <AlertTriangle className={`w-3.5 h-3.5 ${
                    allergyState === 'active'
                      ? 'text-rose-600'
                      : allergyState === 'none'
                        ? 'text-emerald-600'
                        : 'text-amber-500'
                  }`} />
                  <span>Alergias Conocidas *</span>
                </label>

                {/* Asistentes Rápidos Clínicos */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAllergies('Niega alergias a medicamentos o materiales dentales conocidos.')}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                      allergyState === 'none'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ✓ Sin Alergias
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (allergyState !== 'active') setAllergies('');
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                      allergyState === 'active'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ⚠️ Registrar Alergia
                  </button>
                </div>
              </div>

              <textarea
                rows={2}
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="Indique medicamentos o sustancias alérgenas (ej. Penicilina, Lidocaína, Látex), o presione 'Sin Alergias' si el paciente las niega..."
                className={`w-full p-2.5 text-xs rounded-xl border resize-none focus:outline-none transition ${
                  allergyState === 'active'
                    ? 'bg-white border-rose-300 text-rose-950 font-semibold focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                    : allergyState === 'none'
                      ? 'bg-white border-emerald-200 text-emerald-950 font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                      : 'bg-white border-slate-200 text-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100'
                }`}
              />

              {allergyState === 'active' && (
                <p className="text-[11px] text-rose-700 mt-1 font-semibold">
                  ⚠️ Precaución médica: Verifique anestésicos locales y farmacoterapia antes de prescribir.
                </p>
              )}

              {allergyState === 'none' && (
                <p className="text-[11px] text-emerald-700 mt-1 font-medium">
                  ✓ Paciente refiere ausencia de reacciones adversas a fármacos o materiales dentales.
                </p>
              )}

              {allergyState === 'unconfirmed' && (
                <p className="text-[11px] text-amber-700 mt-1 font-medium">
                  ⚠️ Campo pendiente de evaluación clínica con el paciente.
                </p>
              )}
            </div>

            {/* Tarjeta de Medicación Actual Habitual */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-amber-500" />
                <span>Medicación Actual Habitual</span>
              </label>
              <textarea
                rows={2}
                value={currentMedication}
                onChange={(e) => setCurrentMedication(e.target.value)}
                placeholder="Fármacos que consume regularmente con dosis y frecuencia (ej. Losartán 50mg/día, Aspirina 100mg, Metformina)..."
                className="w-full p-2.5 text-xs bg-white hover:bg-white focus:bg-white border border-slate-200 rounded-xl resize-none text-slate-800 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 focus:outline-none transition"
              />
              <p className="text-[11px] text-slate-400">
                Interacciones farmacológicas potenciales con anestésicos y analgésicos.
              </p>
            </div>
          </div>

          {/* Toggle para Antecedentes Secundarios (Médicos Sistémicos y Odontológicos Previos) */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSecondaryBackgrounds(!showSecondaryBackgrounds)}
              className="w-full px-4 py-2.5 bg-slate-50/70 hover:bg-slate-100 flex items-center justify-between text-left transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {showSecondaryBackgrounds ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
                <span className="text-xs font-bold text-slate-700">
                  Antecedentes Secundarios (Médicos Sistémicos y Odontológicos Previos)
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  {secondaryFieldsCount > 0 ? `${secondaryFieldsCount} registrado(s)` : 'Opcional'}
                </span>
              </div>
              <span className="text-[11px] text-cyan-700 font-semibold">
                {showSecondaryBackgrounds ? 'Ocultar campos' : 'Desplegar campos'}
              </span>
            </button>

            {showSecondaryBackgrounds && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border-t border-slate-200 animate-fade-in">
                {/* Antecedentes Médicos Sistémicos */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <HeartPulse className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Patologías Médicas Sistémicas</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setMedicalBackground('Sin patologías sistémicas de relevancia. Niega enfermedades crónicas.')}
                      className="text-[11px] text-cyan-700 hover:text-cyan-800 font-semibold hover:underline cursor-pointer"
                    >
                      + Sin patologías
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={medicalBackground}
                    onChange={(e) => setMedicalBackground(e.target.value)}
                    placeholder="Hipertensión arterial, diabetes mellitus, cardiopatías, trastornos de coagulación, cirugías recientes..."
                    className="w-full p-2.5 text-xs bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl resize-none text-slate-800 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 focus:outline-none transition"
                  />
                </div>

                {/* Antecedentes Odontológicos Previos */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Antecedentes Odontológicos Previos</span>
                  </label>
                  <textarea
                    rows={2}
                    value={dentalBackground}
                    onChange={(e) => setDentalBackground(e.target.value)}
                    placeholder="Endodoncias previas, ortodoncia, cirugías dentales, implantes, experiencia con anestesia local..."
                    className="w-full p-2.5 text-xs bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl resize-none text-slate-800 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 focus:outline-none transition"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN 2: CONSULTA ACTUAL Y DIAGNÓSTICO                                  */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-cyan-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              2. Consulta Actual y Diagnóstico
            </h4>
          </div>
          <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
            Registro de la cita, examen intraoral y plan general
          </span>
        </div>

        <div className="p-5 space-y-4">
          {/* Motivo de Consulta (Ancho Completo) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>Motivo de Consulta (en palabras del paciente) *</span>
            </label>
            <textarea
              rows={2}
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="Describa el motivo principal por el cual acude hoy a la consulta y tiempo de evolución (ej. Dolor al masticar desde hace 3 días, revisión de rutina, fractura dental en premolar superior)..."
              className="w-full p-3 text-xs bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl resize-none text-slate-800 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 focus:outline-none font-medium transition"
            />
          </div>

          {/* Dos Columnas: Examen Clínico y Diagnóstico General */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Examen Clínico */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-cyan-600" />
                <span>Examen Clínico y Hallazgos Intraorales</span>
              </label>
              <textarea
                rows={3}
                value={evaluationNotes}
                onChange={(e) => setEvaluationNotes(e.target.value)}
                placeholder="Hallazgos en tejidos blandos, encías, oclusión, palpación, percusión, cálculo o movilidad dental..."
                className="w-full p-3 text-xs bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl resize-none text-slate-800 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 focus:outline-none transition"
              />
            </div>

            {/* Diagnóstico Odontológico */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-600" />
                <span>Diagnóstico Odontológico y Plan General</span>
              </label>
              <textarea
                rows={3}
                value={diagnosisSummary}
                onChange={(e) => setDiagnosisSummary(e.target.value)}
                placeholder="Diagnóstico clínico presuntivo o definitivo y plan terapéutico inmediato (ej. Caries de dentina en molar #16, gingivitis marginal)..."
                className="w-full p-3 text-xs bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl resize-none text-slate-800 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 focus:outline-none transition font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BARRA UNIFICADA DE GUARDADO                                               */}
      {/* ========================================================================= */}
      <div className="sticky bottom-3 z-10 flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-md">
        <div className="flex items-center gap-2 text-xs">
          {isLoading ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
              <span>Cargando expediente clínico...</span>
            </div>
          ) : isSaving ? (
            <div className="flex items-center gap-2 text-cyan-700 font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
              <span>Guardando cambios en el servidor...</span>
            </div>
          ) : isDirty ? (
            <div className="flex items-center gap-2 text-amber-800 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>Tiene cambios pendientes de guardar en la historia clínica.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-500">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Expediente clínico sincronizado con la ficha del paciente.</span>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSaving || isLoading || !isDirty}
          className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0 w-full sm:w-auto ${
            isDirty
              ? 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-cyan-600/20 shadow-md hover:scale-[1.02] active:scale-100'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : !isDirty ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
              <span>Ficha Sincronizada</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Guardar Historia Clínica</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default ClinicalHistory;
