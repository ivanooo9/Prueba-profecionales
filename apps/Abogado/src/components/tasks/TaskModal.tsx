import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { LegalTask, LegalCase, Priority, TaskStatus } from '../../types';

export interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Omit<LegalTask, 'id' | 'createdAt'>) => void;
  cases: LegalCase[];
  defaultCaseId?: string;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  cases,
  defaultCaseId,
}) => {
  const [formData, setFormData] = useState({
    caseId: '',
    caseNumber: '',
    title: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'Media' as Priority,
    status: 'Pendiente' as TaskStatus,
    assignedTo: 'Dr. Alejandro Benítez',
  });

  useEffect(() => {
    if (cases.length > 0) {
      const selected = defaultCaseId
        ? cases.find((c) => c.id === defaultCaseId) || cases[0]
        : cases[0];

      setFormData((prev) => ({
        ...prev,
        caseId: selected.id,
        caseNumber: selected.caseNumber,
        assignedTo: selected.assignedLawyer,
      }));
    }
  }, [isOpen, defaultCaseId, cases]);

  const handleCaseChange = (caseId: string) => {
    const selected = cases.find((c) => c.id === caseId);
    if (selected) {
      setFormData({
        ...formData,
        caseId: selected.id,
        caseNumber: selected.caseNumber,
        assignedTo: selected.assignedLawyer,
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.caseId) return;
    onSave(formData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Asignar Tarea Operativa"
      subtitle="Registro de pendiente para la gestión interna del caso"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Expediente Vinculado *
          </label>
          <select
            required
            value={formData.caseId}
            onChange={(e) => handleCaseChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.caseNumber} - {c.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Título de la Tarea *
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ej. Redactar minuta de contrato, Solicitar peritaje"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Fecha Límite</label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Prioridad</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
            >
              <option value="Baja">Baja</option>
              <option value="Media">Media</option>
              <option value="Alta">Alta</option>
              <option value="Urgente">Urgente</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Responsable</label>
          <input
            type="text"
            value={formData.assignedTo}
            onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Detalles Adicionales</label>
          <textarea
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Indicaciones para la tarea..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm"
          >
            Crear Tarea
          </button>
        </div>
      </form>
    </Modal>
  );
};
