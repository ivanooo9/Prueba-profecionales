import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Hearing, LegalCase, HearingMode, HearingStatus } from '../../types';

export interface HearingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (hearingData: Omit<Hearing, 'id' | 'createdAt'>) => void;
  cases: LegalCase[];
  defaultCaseId?: string;
}

export const HearingModal: React.FC<HearingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  cases,
  defaultCaseId,
}) => {
  const [formData, setFormData] = useState({
    caseId: '',
    caseNumber: '',
    caseTitle: '',
    clientId: '',
    clientName: '',
    title: '',
    type: 'Audiencia de Juicio',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    location: 'Sala 102 - Unidad Judicial Civil',
    mode: 'Presencial' as HearingMode,
    responsible: 'Dr. Alejandro Benítez',
    status: 'Programada' as HearingStatus,
    notes: '',
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
        caseTitle: selected.title,
        clientId: selected.clientId,
        clientName: selected.clientName,
        responsible: selected.assignedLawyer,
        location: selected.courtName,
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
        caseTitle: selected.title,
        clientId: selected.clientId,
        clientName: selected.clientName,
        responsible: selected.assignedLawyer,
        location: selected.courtName,
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
      title="Programar Audiencia / Diligencia Judicial"
      subtitle="Registro de convocatoria judicial con fecha, hora y modalidad"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Expediente / Caso Asociado *
          </label>
          <select
            required
            value={formData.caseId}
            onChange={(e) => handleCaseChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.caseNumber} - {c.title} ({c.clientName})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nombre de la Audiencia / Diligencia *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ej. Audiencia Única de Juicio Laboral"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tipo de Audiencia
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
            >
              <option value="Audiencia de Juicio">Audiencia de Juicio</option>
              <option value="Audiencia Preliminar">Audiencia Preliminar</option>
              <option value="Conciliación">Conciliación y Mediación</option>
              <option value="Testimonial">Recepción de Pruebas Testimoniales</option>
              <option value="Medida Cautelar">Medidas Cautelares</option>
            </select>
          </div>
        </div>

        {/* Date, Time & Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Fecha *</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Hora *</label>
            <input
              type="time"
              required
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Modalidad *</label>
            <select
              value={formData.mode}
              onChange={(e) => setFormData({ ...formData, mode: e.target.value as HearingMode })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
            >
              <option value="Presencial">Presencial</option>
              <option value="Virtual">Virtual</option>
            </select>
          </div>
        </div>

        {/* Location & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Lugar / Sala o Enlace Telemático
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Ej. Sala 204 - Complejo Judicial Iñaquito"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Estado</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as HearingStatus })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
            >
              <option value="Programada">Programada</option>
              <option value="Celebrada">Celebrada</option>
              <option value="Suspendida">Suspendida</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Instrucciones u Observaciones para la Audiencia
          </label>
          <textarea
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Ej. Requerir cédula original del cliente 15 min antes en la sala de audiencias..."
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
            Programar Audiencia
          </button>
        </div>
      </form>
    </Modal>
  );
};
