import React, { useState } from 'react';
import { Diagnosis } from '../../types';
import { dentalService } from '../../services/dentalService';
import { Stethoscope, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';

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
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-cyan-600" />
          <span>Diagnósticos Odontológicos Diagnosticados</span>
        </h4>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Nuevo Diagnóstico
        </button>
      </div>

      {diagnoses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {diagnoses.map(d => (
            <div key={d.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{d.title}</span>
                <span className="text-[10px] font-mono bg-cyan-50 text-cyan-700 font-bold px-2 py-0.5 rounded">
                  {d.date}
                </span>
              </div>
              {d.pieceNumber && (
                <div className="text-[11px] font-semibold text-slate-600">
                  Pieza relacionada: <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">#{d.pieceNumber}</span>
                </div>
              )}
              <p className="text-xs text-slate-600">{d.description}</p>
              <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-2">
                Odontólogo: {d.dentist}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Stethoscope className="w-6 h-6" />}
          title="Sin diagnósticos específicos"
          description="Puede agregar diagnósticos asociados a piezas dentales o generales."
          actionLabel="Registrar Diagnóstico"
          onAction={() => setIsModalOpen(true)}
        />
      )}

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
