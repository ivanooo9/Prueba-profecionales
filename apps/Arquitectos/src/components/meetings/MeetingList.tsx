import React, { useState } from 'react';
import { Meeting, Project } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { EmptyState } from '../ui/EmptyState';
import {
  CalendarDays,
  Plus,
  Search,
  Clock,
  MapPin,
  User,
  Edit,
  XCircle,
  Video
} from 'lucide-react';

interface MeetingListProps {
  meetings: Meeting[];
  projects: Project[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenCreateModal: () => void;
  onEditMeeting: (meeting: Meeting) => void;
  onCancelMeeting: (id: string | number) => void;
}

export const MeetingList: React.FC<MeetingListProps> = ({
  meetings,
  projects,
  searchQuery,
  onSearchChange,
  onOpenCreateModal,
  onEditMeeting,
  onCancelMeeting
}) => {
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [modalityFilter, setModalityFilter] = useState<string>('all');

  const filteredMeetings = meetings.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProject = projectFilter === 'all' || String(m.projectId) === String(projectFilter);
    const matchesModality = modalityFilter === 'all' || m.modality === modalityFilter;

    return matchesSearch && matchesProject && matchesModality;
  });

  return (
    <div className="space-y-6">
      {/* Top Filter & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar reunión, cliente o lugar..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            />
          </div>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 max-w-[200px]"
          >
            <option value="all">Todos los Proyectos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={modalityFilter}
            onChange={(e) => setModalityFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="all">Todas las Modalidades</option>
            <option value="Presencial">Presencial</option>
            <option value="Virtual">Virtual</option>
          </select>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-arch-600 hover:bg-arch-700 rounded-lg shadow-xs transition-colors self-end sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Agendar Reunión
        </button>
      </div>

      {/* Meeting Cards List */}
      {filteredMeetings.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No hay reuniones agendadas"
          description="Agende citas presenciales o virtuales con clientes e ingenieros."
          actionLabel="Agendar Reunión"
          onAction={onOpenCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredMeetings.map((m) => (
            <div
              key={m.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-all duration-200 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md font-mono flex items-center gap-1 ${
                      m.modality === 'Virtual'
                        ? 'bg-purple-50 text-purple-700'
                        : 'bg-indigo-50 text-indigo-700'
                    }`}
                  >
                    {m.modality === 'Virtual' && <Video className="w-3 h-3" />}
                    {m.modality}
                  </span>
                  <StatusBadge status={m.status} size="sm" />
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug">{m.title}</h3>

                <p className="text-xs text-slate-600 font-medium">
                  Proyecto: <span className="text-slate-800 font-bold">{m.projectName}</span>
                </p>

                <div className="space-y-1 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Cliente: <strong className="text-slate-700">{m.clientName}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{m.location}</span>
                  </div>
                </div>

                {m.notes && (
                  <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 italic">
                    "{m.notes}"
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-mono font-semibold text-slate-800">
                  <Clock className="w-3.5 h-3.5 text-arch-600" />
                  <span>{m.date} a las {m.time}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEditMeeting(m)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  {m.status !== 'Cancelada' && m.status !== 'Realizada' && (
                    <button
                      onClick={() => onCancelMeeting(m.id)}
                      className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                      title="Cancelar reunión"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
