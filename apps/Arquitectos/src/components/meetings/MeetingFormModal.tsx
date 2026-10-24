import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Meeting, Project, Client, MeetingModality, MeetingStatus, ArchitectureAssignableUser } from '../../types';
import { OrganizationUserSelect } from '../ui/OrganizationUserSelect';
import { getTodayCalendarDate } from '../../utils/dateUtils';

interface MeetingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (meeting: Partial<Meeting>) => void;
  projects: Project[];
  clients: Client[];
  assignableUsers: ArchitectureAssignableUser[];
  defaultProjectId?: string | number;
  defaultDate?: string;
  initialData?: Meeting | null;
}

export const MeetingFormModal: React.FC<MeetingFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  projects,
  clients: _clients,
  assignableUsers,
  defaultProjectId,
  defaultDate,
  initialData
}) => {
  const todayStr = getTodayCalendarDate();
  const [error, setError] = useState<string | null>(null);
  const initialProjectId = defaultProjectId || String(projects[0]?.id || '');
  const matchingProject = projects.find((p) => String(p.id) === String(initialProjectId));

  const [formData, setFormData] = useState<Partial<Meeting>>({
    projectId: initialProjectId,
    clientId: matchingProject?.clientId ? String(matchingProject.clientId) : undefined,
    title: '',
    date: defaultDate || getTodayCalendarDate(),
    time: '10:00',
    location: 'Estudio de Arquitectura',
    modality: 'Presencial',
    leadArchitectUserId: undefined,
    status: 'Programada',
    notes: ''
  });

  useEffect(() => {
    setError(null);
    if (initialData) {
      setFormData({
        ...initialData,
        date: initialData.date ? initialData.date.slice(0, 10) : (defaultDate || getTodayCalendarDate()),
        time: initialData.time || '10:00',
      });
    } else {
      const selectedProjId = defaultProjectId || String(projects[0]?.id || '');
      const proj = projects.find((p) => String(p.id) === String(selectedProjId));
      setFormData({
        projectId: selectedProjId,
        clientId: proj?.clientId ? String(proj.clientId) : undefined,
        title: '',
        date: defaultDate || getTodayCalendarDate(),
        time: '10:00',
        location: 'Estudio de Arquitectura',
        modality: 'Presencial',
        leadArchitectUserId: undefined,
        status: 'Programada',
        notes: ''
      });
    }
  }, [initialData, defaultProjectId, defaultDate, projects, isOpen]);

  const handleProjectChange = (newProjectId: string) => {
    const selectedProj = projects.find((p) => String(p.id) === String(newProjectId));
    setFormData((prev) => ({
      ...prev,
      projectId: newProjectId,
      clientId: selectedProj?.clientId ? String(selectedProj.clientId) : undefined
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.projectId) return;
    if (formData.date && formData.date < todayStr) {
      setError('La fecha de la reunión no puede ser anterior a hoy.');
      return;
    }
    setError(null);

    const meetingData: Partial<Meeting> = {
      ...formData,
      projectId: Number(formData.projectId) || formData.projectId,
      clientId: formData.clientId ? Number(formData.clientId) : undefined
    };

    delete meetingData.leadArchitect;

    if (initialData && String(initialData.leadArchitectUserId || '') === String(formData.leadArchitectUserId || '')) {
      delete meetingData.leadArchitectUserId;
    } else {
      meetingData.leadArchitectUserId = formData.leadArchitectUserId ? Number(formData.leadArchitectUserId) : null;
    }

    onSave(meetingData);
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
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">
            {error}
          </div>
        )}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Proyecto Asociado *</label>
          <select
            required
            value={formData.projectId || ''}
            onChange={(e) => handleProjectChange(e.target.value)}
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
          <OrganizationUserSelect
            label="Responsable de reunión"
            users={assignableUsers}
            value={formData.leadArchitectUserId}
            currentName={initialData?.leadArchitect}
            responsibleOnly
            optional
            onChange={(userId) => setFormData({ ...formData, leadArchitectUserId: userId ? Number(userId) : undefined })}
          />
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Fecha</label>
            <input
              type="date"
              min={todayStr}
              value={formData.date || ''}
              onChange={(e) => {
                setError(null);
                setFormData({ ...formData, date: e.target.value });
              }}
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
