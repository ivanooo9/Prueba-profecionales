import React, { useState, useEffect } from 'react';
import { ClinicalHistory as ClinicalHistoryType } from '../../types';
import { dentalService } from '../../services/dentalService';
import { Save, AlertTriangle, Pill, Stethoscope, FileText, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface ClinicalHistoryProps {
  patientId: string;
}

export const ClinicalHistory: React.FC<ClinicalHistoryProps> = ({ patientId }) => {
  const initialHistory = dentalService.getClinicalHistory(patientId);
  
  const [medicalBackground, setMedicalBackground] = useState(initialHistory.medicalBackground);
  const [allergies, setAllergies] = useState(initialHistory.allergies);
  const [currentMedication, setCurrentMedication] = useState(initialHistory.currentMedication);
  const [dentalBackground, setDentalBackground] = useState(initialHistory.dentalBackground);
  const [chiefComplaint, setChiefComplaint] = useState(initialHistory.chiefComplaint);
  const [evaluationNotes, setEvaluationNotes] = useState(initialHistory.evaluationNotes);
  const [diagnosisSummary, setDiagnosisSummary] = useState(initialHistory.diagnosisSummary);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    dentalService.loadDentalRecord(patientId).then(history => {
      if (!isMounted) return;
      setMedicalBackground(history.medicalBackground || '');
      setAllergies(history.allergies || '');
      setCurrentMedication(history.currentMedication || '');
      setDentalBackground(history.dentalBackground || '');
      setChiefComplaint(history.chiefComplaint || '');
      setEvaluationNotes(history.evaluationNotes || '');
      setDiagnosisSummary(history.diagnosisSummary || '');
      setIsLoading(false);
    }).catch(err => {
      if (!isMounted) return;
      console.error('[ClinicalHistory] Error loading record:', err);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [patientId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      await dentalService.updateClinicalHistory(patientId, {
        medicalBackground,
        allergies,
        currentMedication,
        dentalBackground,
        chiefComplaint,
        evaluationNotes,
        diagnosisSummary
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar la historia clínica.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-fade-in font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Historia clínica actualizada correctamente.</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 animate-fade-in font-medium">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Antecedentes Médicos y Alergias */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Antecedentes Médicos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Stethoscope className="w-4 h-4 text-cyan-600" />
            <span>Antecedentes Médicos Relevantes</span>
          </div>
          <textarea
            rows={3}
            value={medicalBackground}
            onChange={(e) => setMedicalBackground(e.target.value)}
            placeholder="Enfermedades sistémicas (Hipertensión, Diabetes, etc)..."
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 resize-none"
          />
        </div>

        {/* Alergias */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>Alergias Conocidas</span>
          </div>
          <textarea
            rows={3}
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            placeholder="Alergias a Penicilina, Anestésicos, Látex, etc..."
            className="w-full p-3 bg-rose-50/40 border border-rose-200 text-rose-900 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none font-medium"
          />
        </div>
      </div>

      {/* Medicación y Antecedentes Odontológicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Medicación Actual */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Pill className="w-4 h-4 text-amber-500" />
            <span>Medicación Actual</span>
          </div>
          <textarea
            rows={3}
            value={currentMedication}
            onChange={(e) => setCurrentMedication(e.target.value)}
            placeholder="Fármacos que consume regularmente..."
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 resize-none"
          />
        </div>

        {/* Antecedentes Odontológicos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <FileText className="w-4 h-4 text-cyan-600" />
            <span>Antecedentes Odontológicos</span>
          </div>
          <textarea
            rows={3}
            value={dentalBackground}
            onChange={(e) => setDentalBackground(e.target.value)}
            placeholder="Tratamientos de endodoncia previa, ortodoncia, cirugías..."
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 resize-none"
          />
        </div>
      </div>

      {/* Consulta Actual y Diagnóstico General */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h4 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
          Consulta y Diagnóstico Clínico
        </h4>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo de Consulta (Palabras del paciente)</label>
          <input
            type="text"
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            placeholder="Ej: Dolor al masticar alimentos fríos en molar superior derecho..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Evaluación u Observaciones Clínicas</label>
            <textarea
              rows={3}
              value={evaluationNotes}
              onChange={(e) => setEvaluationNotes(e.target.value)}
              placeholder="Hallazgos en tejidos blandos, encías, examen intraoral..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Resumen del Diagnóstico</label>
            <textarea
              rows={3}
              value={diagnosisSummary}
              onChange={(e) => setDiagnosisSummary(e.target.value)}
              placeholder="Diagnóstico odontológico principal..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving || isLoading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-sm shadow-cyan-600/20 transition-all"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{isSaving ? 'Guardando...' : 'Guardar Historia Clínica'}</span>
        </button>
      </div>
    </form>
  );
};
