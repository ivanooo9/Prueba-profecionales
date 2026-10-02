import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Treatment, Patient } from '../../types';
import { dentalService } from '../../services/dentalService';

interface TreatmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPatientId?: string;
}

export const TreatmentFormModal: React.FC<TreatmentFormModalProps> = ({
  isOpen,
  onClose,
  defaultPatientId
}) => {
  const patients = dentalService.getPatients();
  const [patientId, setPatientId] = useState(defaultPatientId || patients[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [piecesInput, setPiecesInput] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('85.00');
  const [targetDate, setTargetDate] = useState('2026-09-15');
  const [dentist, setDentist] = useState('Dra. Sofía Mendoza');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !patientId) return;

    const patient = dentalService.getPatientById(patientId);
    const pieces = piecesInput
      .split(',')
      .map(p => parseInt(p.trim(), 10))
      .filter(n => !isNaN(n));

    dentalService.addTreatment({
      patientId,
      patientName: patient ? `${patient.names} ${patient.surnames}` : 'Paciente',
      title,
      description,
      pieceNumbers: pieces.length > 0 ? pieces : undefined,
      startDate: new Date().toISOString().split('T')[0],
      targetDate,
      progress: 0,
      status: 'En progreso',
      estimatedCost: parseFloat(estimatedCost) || 0,
      dentist
    });

    setTitle('');
    setDescription('');
    setPiecesInput('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nuevo Plan de Tratamiento Odontológico"
      subtitle="Defina las piezas involucradas, costo estimado y objetivo del tratamiento."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Paciente */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Paciente *</label>
          <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
            required
          >
            {patients.map(p => (
              <option key={p.id} value={p.id}>
                {p.names} {p.surnames} (CI: {p.identification})
              </option>
            ))}
          </select>
        </div>

        {/* Título */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Título del Tratamiento *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Restauración Estética Molar 16, Ortodoncia Correctiva..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800"
            required
          />
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción del Procedimiento</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Pasos clínicos, anestesia, materiales a utilizar..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 resize-none"
          />
        </div>

        {/* Piezas y Costo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Piezas Dentales (ej: 16, 21)</label>
            <input
              type="text"
              value={piecesInput}
              onChange={(e) => setPiecesInput(e.target.value)}
              placeholder="16, 21"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Costo Estimado ($)</label>
            <input
              type="number"
              step="0.01"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Estimada Fin</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 font-medium text-xs rounded-xl"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs rounded-xl shadow-sm"
          >
            Crear Tratamiento
          </button>
        </div>
      </form>
    </Modal>
  );
};
