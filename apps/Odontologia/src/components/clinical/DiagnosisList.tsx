import React, { useState } from 'react';
import { Diagnosis } from '../../types';
import { dentalService } from '../../services/dentalService';
import { Stethoscope, Plus } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface DiagnosisListProps {
  patientId: string;
}

export const DiagnosisList: React.FC<DiagnosisListProps> = ({ patientId }) => {
  const diagnoses = dentalService.getDiagnoses(patientId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [pieceNumber, setPieceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [dentist, setDentist] = useState('Dra. Sofía Mendoza');

  const handleAddDiagnosis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    dentalService.addDiagnosis({
      patientId,
      date: new Date().toISOString().split('T')[0],
      title,
      pieceNumber: pieceNumber ? parseInt(pieceNumber, 10) : undefined,
      description,
      dentist,
      status: 'Activo'
    });

    setTitle('');
    setPieceNumber('');
    setDescription('');
    setIsModalOpen(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden text-left">
      {/* Cabecera Sección 3 */}
      <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-700 shrink-0">
            <Stethoscope className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              3. Diagnósticos Específicos por Pieza o Patología
            </h4>
            <p className="text-[11px] text-slate-500">
              Diagnósticos clínicos detallados y piezas dentales afectadas
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Nuevo Diagnóstico
        </button>
      </div>

      <div className="p-4 sm:p-5">
        {diagnoses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {diagnoses.map(d => (
              <div key={d.id} className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 truncate">{d.title}</span>
                  <span className="text-[10px] font-mono bg-cyan-50 text-cyan-700 font-bold px-2 py-0.5 rounded border border-cyan-100 shrink-0">
                    {d.date}
                  </span>
                </div>
                {d.pieceNumber && (
                  <div className="text-[11px] font-semibold text-slate-600">
                    Pieza dental: <span className="font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-800">#{d.pieceNumber}</span>
                  </div>
                )}
                {d.description && <p className="text-xs text-slate-600">{d.description}</p>}
                <div className="text-[10px] text-slate-400 border-t border-slate-200/60 pt-1.5 mt-1.5">
                  Odontólogo: {d.dentist}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Estado Vacío Compacto (~70px) */
          <div className="p-3.5 sm:p-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-700">Sin diagnósticos específicos adicionales registrados</p>
                <p className="text-[11px] text-slate-400">Puede agregar diagnósticos focalizados por pieza dental o patología.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-cyan-700 hover:text-cyan-800 hover:bg-cyan-50 rounded-xl border border-cyan-200 transition-colors cursor-pointer shrink-0"
            >
              + Añadir diagnóstico
            </button>
          </div>
        )}
      </div>

      {/* Modal Nuevo Diagnóstico */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Diagnóstico Odontológico"
        subtitle="Complete los detalles del diagnóstico clínico."
        maxWidth="md"
      >
        <form onSubmit={handleAddDiagnosis} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre / Título del Diagnóstico *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Caries Dentinaria Profunda, Pulpitis Irreversible..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Pieza Dental Relacionada (Opcional)</label>
            <input
              type="number"
              value={pieceNumber}
              onChange={(e) => setPieceNumber(e.target.value)}
              placeholder="Ej: 16"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción / Observaciones</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles radiográficos, sintomatología reported por paciente..."
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
              Guardar Diagnóstico
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
