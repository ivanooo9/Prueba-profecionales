import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Meeting, Project, Client, MeetingModality, MeetingStatus } from '../../types';

interface MeetingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (meeting: Partial<Meeting>) => void;
  projects: Project[];
  clients: Client[];
  defaultProjectId?: string | number;
  initialData?: Meeting | null;
}

export const MeetingFormModal: React.FC<MeetingFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  projects,
  clients,
  defaultProjectId,
  initialData
}) => {
  const [formData, setFormData] = useState<Partial<Meeting>>({
    projectId: defaultProjectId || String(projects[0]?.id || ''),
    clientId: String(clients[0]?.id || ''),
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    location: 'Estudio de Arquitectura',
    modality: 'Presencial',
    leadArchitect: 'Arq. Esteban Guarderas',
    status: 'Programada',
    notes: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    } else {
      setFormData({
        projectId: defaultProjectId || String(projects[0]?.id || ''),
        clientId: String(clients[0]?.id || ''),
        title: '',
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        location: 'Estudio de Arquitectura',
        modality: 'Presencial',
        leadArchitect: 'Arq. Esteban Guarderas',
        status: 'Programada',
        notes: ''
      });
    }
  }, [initialData, defaultProjectId, projects, clients, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.projectId) return;
    onSave(formData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar Reunión' : 'Agendar Nueva Reunión / Cita'}
      subtitle="Registrar cita con cliente, revisión de proyecto o inspección en obra"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Proyecto Asociado *</label>
          <select
            required
            value={formData.projectId || ''}
            onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
          >
            <option value="">Seleccione proyecto...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Título de la Reunión *</label>
          <input
            type="text"
            required
            placeholder="Ej: Revisión de Renders y Acabados de Cocina"
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Fecha</label>
            <input
              type="date"
              value={formData.date || ''}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Hora</label>
            <input
              type="time"
              value={formData.time || '10:00'}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Modalidad</label>
            <select
              value={formData.modality || 'Presencial'}
              onChange={(e) => setFormData({ ...formData, modality: e.target.value as MeetingModality })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            >
              <option value="Presencial">Presencial</option>
              <option value="Virtual">Virtual</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Estado</label>
            <select
              value={formData.status || 'Programada'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as MeetingStatus })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            >
              <option value="Programada">Programada</option>
              <option value="Realizada">Realizada</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Lugar / Plataforma</label>
          <input
            type="text"
            placeholder="Ej: Sala B del Estudio o Enlace Meet/Zoom"
            value={formData.location || ''}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Observaciones / Minuta</label>
          <textarea
            rows={2}
            placeholder="Temas a tratar o compromisos resultantes..."
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2 font-semibold text-white bg-arch-600 hover:bg-arch-700 rounded-lg shadow-xs transition-colors"
          >
            {initialData ? 'Guardar Cambios' : 'Agendar Reunión'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
