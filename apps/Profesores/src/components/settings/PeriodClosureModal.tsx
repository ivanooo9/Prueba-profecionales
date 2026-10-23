import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  BookOpen,
  Users,
  GraduationCap,
  Scale,
} from 'lucide-react';
import { AcademicPeriod, PeriodClosureReadinessDTO } from '../../types/teacher';
import { academicApi } from '../../services/api/academicApi';

interface PeriodClosureModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: number;
  period: AcademicPeriod | null;
  onSuccess: () => void;
}

export const PeriodClosureModal: React.FC<PeriodClosureModalProps> = ({
  isOpen,
  onClose,
  orgId,
  period,
  onSuccess,
}) => {
  const [readiness, setReadiness] = useState<PeriodClosureReadinessDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !period || !orgId) {
      setReadiness(null);
      setErrorMsg(null);
      return;
    }

    const fetchReadiness = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const data = await academicApi.getPeriodClosureReadiness(orgId, period.id);
        setReadiness(data);
      } catch (err: any) {
        setErrorMsg(err.message || 'Error al obtener diagnóstico de cierre del periodo.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReadiness();
  }, [isOpen, period, orgId]);

  if (!isOpen || !period) return null;

  const handleConfirmClose = async () => {
    if (!readiness || !readiness.canClose || isClosing) return;

    setIsClosing(true);
    setErrorMsg(null);
    try {
      await academicApi.changeAcademicPeriodStatus(orgId, period.id, 'CLOSED');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cerrar el periodo académico.');
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Cierre Definitivo de Periodo Académico
              </h3>
              <p className="text-xs text-slate-500">
                Periodo: <span className="font-semibold text-slate-700">{period.name}</span> ({period.type})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isClosing}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs text-slate-600">
          {isLoading && (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
              <p className="font-medium text-slate-500">
                Auditoría de cierre en progreso: verificando notas pendientes, estados ABSENT y esquemas de evaluación...
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!isLoading && readiness && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-500 font-medium mb-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Actividades</span>
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    {readiness.totalActivities}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-500 font-medium mb-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>Estudiantes</span>
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    {readiness.students.total}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {readiness.students.complete} completos
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-500 font-medium mb-1">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Calificaciones</span>
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    {readiness.totalGrades}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {readiness.gradeSummary.graded} GRADED · {readiness.gradeSummary.pending} PENDING
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-500 font-medium mb-1">
                    <Scale className="w-3.5 h-3.5" />
                    <span>Esquemas</span>
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    {readiness.schemes.total}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {readiness.schemes.valid + readiness.schemes.locked} válidos
                  </div>
                </div>
              </div>

              {/* Status Verdict Box */}
              {readiness.canClose ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Periodo Listo para Cierre Definitivo</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Todas las calificaciones han sido completadas y los esquemas de evaluación alcanzan el 100%. Al confirmar, el periodo pasará a estado <strong>CLOSED</strong> y ya no permitirá modificaciones de calificaciones ni cambios estructurales.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-rose-800">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Cierre Bloqueado — Requisitos Pendientes ({readiness.blockers.length})</span>
                  </div>
                  <p className="text-[11px] text-rose-700">
                    No es posible cerrar este periodo académico hasta que se resuelvan todos los bloqueos detectados:
                  </p>
                  <ul className="space-y-1 list-disc list-inside text-[11px] font-medium text-rose-800">
                    {readiness.blockers.map((b, i) => (
                      <li key={i}>{b.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings List */}
              {readiness.warnings.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-amber-800 text-[11px]">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Advertencias ({readiness.warnings.length})</span>
                  </div>
                  <ul className="space-y-1 list-disc list-inside text-[11px] text-amber-700">
                    {readiness.warnings.map((w, i) => (
                      <li key={i}>{w.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isClosing}
            className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold transition text-xs"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirmClose}
            disabled={isClosing || isLoading || !readiness?.canClose}
            className={`px-4 py-2 rounded-xl text-white font-bold transition text-xs flex items-center gap-2 shadow-xs ${
              readiness?.canClose
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-slate-300 cursor-not-allowed opacity-60'
            }`}
          >
            {isClosing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            <span>Confirmar Cierre de Periodo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
