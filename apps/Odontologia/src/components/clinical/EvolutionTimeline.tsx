import React, { useState } from 'react';
import { EvolutionEntry } from '../../types';
import { dentalService } from '../../services/dentalService';
import { Clock, Plus, Calendar, CheckCircle2, User, FileText } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';

interface EvolutionTimelineProps {
  patientId: string;
}

export const EvolutionTimeline: React.FC<EvolutionTimelineProps> = ({ patientId }) => {
  const evolutions = dentalService.getEvolution(patientId);
  const patient = dentalService.getPatientById(patientId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [consultationType, setConsultationType] = useState('Consulta de Control');
  const [procedureDone, setProcedureDone] = useState('');
  const [piecesInput, setPiecesInput] = useState('');
  const [notes, setNotes] = useState('');
  const [dentist, setDentist] = useState('Dra. Sofía Mendoza');
  const [outcomeStatus, setOutcomeStatus] = useState('Evolución favorable');

  const handleAddEvolution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!procedureDone.trim()) return;

    const pieces = piecesInput
      .split(',')
      .map(p => parseInt(p.trim(), 10))
      .filter(n => !isNaN(n));

    dentalService.addEvolutionEntry({
      patientId,
      date: new Date().toISOString().split('T')[0],
      consultationType,
      procedureDone,
      piecesInvolved: pieces.length > 0 ? pieces : undefined,
      notes,
      dentist,
      outcomeStatus
    });

    // Reset
    setProcedureDone('');
    setPiecesInput('');
    setNotes('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-base font-bold text-slate-900">Evolución Clínica y Cronología de Atención</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Histórico detallado de intervenciones, controles y procedimientos realizados en cada cita.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Evolución</span>
        </button>
      </div>

      {/* Timeline List */}
      {evolutions.length > 0 ? (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {evolutions.map(evo => (
            <div key={evo.id} className="relative group">
              {/* Timeline Dot */}
              <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center ring-4 ring-white shadow-sm text-[10px] font-bold">
                ✓
              </div>

              {/* Card Content */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-cyan-300 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded">
                        {evo.date}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">{evo.consultationType}</h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      {evo.outcomeStatus}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-700">
                  <div>
                    <span className="font-semibold text-slate-900">Procedimiento realizado: </span>
                    <span>{evo.procedureDone}</span>
                  </div>

                  {evo.piecesInvolved && evo.piecesInvolved.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="font-semibold text-slate-900">Piezas involucradas: </span>
                      {evo.piecesInvolved.map(p => (
                        <span key={p} className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-bold">
                          #{p}
                        </span>
                      ))}
                    </div>
                  )}

                  {evo.notes && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-slate-600 italic">
                      "{evo.notes}"
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 font-medium pt-1 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>Atendido por: {evo.dentist}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Clock className="w-8 h-8" />}
          title="Sin evoluciones registradas"
          description="Aún no se han ingresado notas de atención para este paciente."
          actionLabel="Registrar Primera Evolución"
          onAction={() => setIsModalOpen(true)}
        />
      )}

      {/* Modal Nueva Evolución */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Nueva Evolución Clínica"
        subtitle={`Paciente: ${patient?.names} ${patient?.surnames}`}
        maxWidth="lg"
      >
        <form onSubmit={handleAddEvolution} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Consulta / Atención</label>
            <input
              type="text"
              value={consultationType}
              onChange={(e) => setConsultationType(e.target.value)}
              placeholder="Ej: Consulta de Control, Sesión 1 Restauración..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Procedimiento Realizado *</label>
            <textarea
              rows={3}
              value={procedureDone}
              onChange={(e) => setProcedureDone(e.target.value)}
              placeholder="Describa detalladamente el procedimiento clínico..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Piezas Involucradas (Separar por coma)</label>
              <input
                type="text"
                value={piecesInput}
                onChange={(e) => setPiecesInput(e.target.value)}
                placeholder="Ej: 16, 21"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Estado / Resultado</label>
              <select
                value={outcomeStatus}
                onChange={(e) => setOutcomeStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              >
                <option value="Evolución favorable">Evolución favorable</option>
                <option value="En seguimiento">En seguimiento</option>
                <option value="Requiere ajuste">Requiere ajuste</option>
                <option value="Tratamiento completado">Tratamiento completado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ObservacionesAdicionales / Indicaciones al Paciente</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Indicaciones analgésicas, alimentos blandos, próxima cita..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-medium text-xs rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-cyan-600 text-white font-semibold text-xs rounded-xl shadow-sm"
            >
              Guardar Evolución
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
