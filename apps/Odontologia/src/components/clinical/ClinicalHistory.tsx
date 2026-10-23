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
  ClipboardList
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

  // Estados de interfaz y feedback
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cargar ficha clínica del paciente
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    dentalService.loadDentalRecord(patientId)
      .then(history => {
        if (!isMounted) return;
        setAllergies(history.allergies || '');
        setMedicalBackground(history.medicalBackground || '');
        setCurrentMedication(history.currentMedication || '');
        setDentalBackground(history.dentalBackground || '');
        setChiefComplaint(history.chiefComplaint || '');
        setEvaluationNotes(history.evaluationNotes || '');
        setDiagnosisSummary(history.diagnosisSummary || '');
        setIsLoading(false);
      })
      .catch(err => {
        if (!isMounted) return;
        console.error('[ClinicalHistory] Error loading record:', err);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [patientId]);

  // Detección heurística de alergias activas (evita falsas alarmas ante expresiones negativas)
  const hasActiveAllergies = useMemo(() => {
    const clean = (allergies || '').trim().toLowerCase();
    if (!clean) return false;
    return !/^(ningun[oa]|niega|sin alergia|no refiere|no presenta|negativ[oa]|no\b)/i.test(clean);
  }, [allergies]);

  // Guardar en backend
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      await dentalService.updateClinicalHistory(patientId, {
        medicalBackground: medicalBackground.trim(),
        allergies: allergies.trim(),
        currentMedication: currentMedication.trim(),
        dentalBackground: dentalBackground.trim(),
        chiefComplaint: chiefComplaint.trim(),
        evaluationNotes: evaluationNotes.trim(),
        diagnosisSummary: diagnosisSummary.trim(),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar la historia clínica.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 animate-fade-in text-left">
      {/* Barra Superior: Título, Indicador de Riesgo y Botón Guardar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-700">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">Historia Clínica y Anamnesis</h3>
              <p className="text-[11px] text-slate-500">Expediente médico general y evolución odontológica</p>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-200 hidden md:block" />

          {/* Badge de Seguridad en Tiempo Real */}
          {hasActiveAllergies ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-xs">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>Alerta Médica: Alergias Activas</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sin alergias conocidas</span>
            </span>
          )}
        </div>

        {/* Botón Principal Guardar */}
        <button
          type="submit"
          disabled={isSaving || isLoading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? 'Guardando...' : 'Guardar Ficha Clínica'}</span>
        </button>
      </div>

      {/* Alertas de Feedback */}
      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between gap-2 shadow-xs animate-fade-in font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Historia clínica y datos del paciente guardados exitosamente.</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-mono font-bold">Actualizado</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs flex items-center gap-2 shadow-xs animate-fade-in font-medium">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BLOQUE 1: SEGURIDAD MÉDICA Y ANTECEDENTES (DATOS FIJOS DEL PACIENTE)       */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-rose-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              1. Seguridad Médica y Antecedentes Generales
            </h4>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Permanecen fijos en la ficha para seguridad del paciente
          </span>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Columna Izquierda: Alergias y Medicación */}
          <div className="space-y-4">
            {/* Alergias */}
            <div className={`p-4 rounded-xl border transition-colors ${
              hasActiveAllergies ? 'bg-rose-50/40 border-rose-200' : 'bg-slate-50/50 border-slate-200'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <AlertTriangle className={`w-3.5 h-3.5 ${hasActiveAllergies ? 'text-rose-600' : 'text-slate-400'}`} />
                  <span>Alergias Conocidas</span>
                </label>

                {/* Switch Rápido */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAllergies('Niega alergias a medicamentos o materiales dentales conocidos.')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                      !hasActiveAllergies
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ✓ Sin Alergias
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!hasActiveAllergies) setAllergies('');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                      hasActiveAllergies
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
                placeholder="Indique medicamentos o sustancias alérgenas (ej. Penicilina, Lidocaína, AINES, Látex)..."
                className={`w-full p-2.5 text-xs rounded-lg border resize-none focus:outline-none transition ${
                  hasActiveAllergies
                    ? 'bg-white border-rose-300 text-rose-950 font-semibold focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                    : 'bg-white border-slate-200 text-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100'
                }`}
              />
              {hasActiveAllergies && (
                <p className="text-[11px] text-rose-700 mt-1 font-medium">
                  ⚠️ Precaución clínica: Verifique anestésicos locales y farmacoterapia antes de prescribir.
                </p>
              )}
            </div>

            {/* Medicación Actual */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-amber-500" />
                <span>Medicación Actual Habitual</span>
              </label>
              <textarea
                rows={2}
                value={currentMedication}
                onChange={(e) => setCurrentMedication(e.target.value)}
                placeholder="Fármacos que consume regularmente con dosis y frecuencia (ej. Losartán 50mg/día, Aspirina 100mg)..."
                className="w-full p-2.5 text-xs bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl resize-none text-slate-800 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Columna Derecha: Antecedentes Médicos y Odontológicos */}
          <div className="space-y-4">
            {/* Antecedentes Médicos */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Antecedentes Médicos / Patologías Sistémicas</span>
                </label>
                <button
                  type="button"
                  onClick={() => setMedicalBackground('Sin patologías sistémicas de relevancia. Niega enfermedades crónicas.')}
                  className="text-[11px] text-cyan-700 hover:text-cyan-800 font-semibold hover:underline cursor-pointer"
                >
                  + Sin antecedentes
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

            {/* Antecedentes Odontológicos */}
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
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BLOQUE 2: CONSULTA DEL DÍA (EVOLUCIÓN, EXAMEN Y DIAGNÓSTICO)               */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-cyan-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              2. Consulta Actual y Diagnóstico
            </h4>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Registro de la cita, examen intraoral y diagnóstico general
          </span>
        </div>

        <div className="p-5 space-y-4">
          {/* Motivo de Consulta */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>Motivo de Consulta (en palabras del paciente) *</span>
            </label>
            <textarea
              rows={2}
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="Describa el motivo por el cual acude hoy a la consulta y tiempo de evolución (ej. Dolor al masticar desde hace 3 días, revisión de rutina, fractura dental)..."
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

      {/* Barra Inferior: Respaldo de Guardado */}
      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <span className="text-xs text-slate-500">
          Los antecedentes médicos y alergias se sincronizan automáticamente con la cabecera del paciente.
        </span>

        <button
          type="submit"
          disabled={isSaving || isLoading}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? 'Guardando...' : 'Guardar Historia Clínica'}</span>
        </button>
      </div>
    </form>
  );
};

export default ClinicalHistory;
