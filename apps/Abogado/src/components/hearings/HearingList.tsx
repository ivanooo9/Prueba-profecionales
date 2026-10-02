import React, { useState } from 'react';
import {
  Gavel,
  Search,
  Plus,
  Video,
  MapPin,
  Calendar,
  Clock,
  Filter,
  CheckCircle,
} from 'lucide-react';
import { Hearing, HearingStatus, LegalCase } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { EmptyState } from '../ui/EmptyState';

export interface HearingListProps {
  hearings: Hearing[];
  cases: LegalCase[];
  onOpenNewHearingModal: () => void;
  onUpdateStatus: (id: string, status: HearingStatus) => void;
  onSelectCase: (caseId: string) => void;
}

export const HearingList: React.FC<HearingListProps> = ({
  hearings,
  cases,
  onOpenNewHearingModal,
  onUpdateStatus,
  onSelectCase,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  const filteredHearings = hearings.filter((h) => {
    const matchesSearch =
      h.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'todos' ? true : h.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Gavel className="w-6 h-6 text-slate-800" />
            Agenda de Audiencias y Diligencias
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Programación de comparecencias judiciales presenciales y telemáticas
          </p>
        </div>

        <button
          onClick={onOpenNewHearingModal}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Programar Audiencia</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por audiencia, expediente o cliente..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="todos">Todos los Estados</option>
            <option value="Programada">Programada</option>
            <option value="Celebrada">Celebrada</option>
            <option value="Suspendida">Suspendida</option>
            <option value="Cancelada">Cancelada</option>
          </select>
        </div>
      </div>

      {/* List */}
      {filteredHearings.length === 0 ? (
        <EmptyState
          title="No hay audiencias registradas"
          description="Agende las comparecencias y diligencias con la Unidad Judicial."
          actionLabel="Programar Audiencia"
          onAction={onOpenNewHearingModal}
          icon={Gavel}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHearings.map((h) => (
            <div
              key={h.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 hover:border-slate-300 hover:shadow-sm transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    onClick={() => onSelectCase(h.caseId)}
                    className="text-[11px] font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 cursor-pointer hover:underline"
                  >
                    {h.caseNumber}
                  </span>
                  <StatusBadge status={h.status} size="sm" />
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug mb-1">{h.title}</h3>
                <p className="text-xs text-slate-700 font-semibold mb-3">{h.clientName}</p>

                <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-100 mb-4">
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>{h.date} a las {h.time}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {h.mode === 'Virtual' ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 text-[11px]">
                        <Video className="w-3.5 h-3.5" /> Virtual (Telemática)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                        <MapPin className="w-3.5 h-3.5" /> Presencial en Sala
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 font-medium truncate pt-1">
                    Lugar: {h.location}
                  </div>
                </div>

                {h.notes && (
                  <p className="text-xs text-slate-700 bg-amber-50/70 border border-amber-200 p-2.5 rounded-xl mb-4">
                    <strong>Notas:</strong> {h.notes}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">Resp: {h.responsible}</span>

                {h.status === 'Programada' && (
                  <button
                    onClick={() => onUpdateStatus(h.id, 'Celebrada')}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1 transition"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Marcar Celebrada</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
