import React, { useState } from 'react';
import {
  Clock,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle,
  Filter,
  Check,
} from 'lucide-react';
import { ProceduralDeadline, DeadlineStatus, LegalCase } from '../../types';
import { DeadlineBadge } from '../ui/DeadlineBadge';
import { PriorityBadge } from '../ui/PriorityBadge';
import { EmptyState } from '../ui/EmptyState';

export interface DeadlineListProps {
  deadlines: ProceduralDeadline[];
  cases: LegalCase[];
  onOpenNewDeadlineModal: () => void;
  onUpdateStatus: (id: string, status: DeadlineStatus) => void;
  onSelectCase: (caseId: string) => void;
}

export const DeadlineList: React.FC<DeadlineListProps> = ({
  deadlines,
  cases,
  onOpenNewDeadlineModal,
  onUpdateStatus,
  onSelectCase,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  const filteredDeadlines = deadlines.filter((d) => {
    const matchesSearch =
      d.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.caseTitle.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'todos' ? true : d.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const overdueCount = deadlines.filter((d) => d.status === 'Vencido').length;
  const pendingCount = deadlines.filter((d) => d.status === 'Pendiente' || d.status === 'En progreso').length;
  const completedCount = deadlines.filter((d) => d.status === 'Cumplido').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-slate-800" />
            Control de Plazos Procesales y Términos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoreo perentorio de fechas límites, vencimientos y escritos requeridos
          </p>
        </div>

        <button
          onClick={onOpenNewDeadlineModal}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Plazo</span>
        </button>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-rose-700">Plazos Vencidos</span>
            <div className="text-2xl font-black text-rose-950 mt-0.5">{overdueCount}</div>
          </div>
          <AlertTriangle className="w-8 h-8 text-rose-600 opacity-80" />
        </div>

        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-amber-800">Pendientes en Término</span>
            <div className="text-2xl font-black text-amber-950 mt-0.5">{pendingCount}</div>
          </div>
          <Clock className="w-8 h-8 text-amber-600 opacity-80" />
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-emerald-800">Cumplidos en Tiempo</span>
            <div className="text-2xl font-black text-emerald-950 mt-0.5">{completedCount}</div>
          </div>
          <CheckCircle className="w-8 h-8 text-emerald-600 opacity-80" />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por acto procesal o nro. de expediente..."
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
            <option value="Pendiente">Pendiente</option>
            <option value="En progreso">En progreso</option>
            <option value="Vencido">Vencido</option>
            <option value="Cumplido">Cumplido</option>
          </select>
        </div>
      </div>

      {/* Deadlines List */}
      {filteredDeadlines.length === 0 ? (
        <EmptyState
          title="No hay plazos registrados"
          description="Registre los plazos procesales perentorios para mantener notificaciones activas."
          actionLabel="Registrar Plazo"
          onAction={onOpenNewDeadlineModal}
          icon={Clock}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden divide-y divide-slate-100">
          {filteredDeadlines.map((dl) => (
            <div
              key={dl.id}
              className="p-5 hover:bg-slate-50/70 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    onClick={() => onSelectCase(dl.caseId)}
                    className="text-[11px] font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 cursor-pointer hover:underline"
                  >
                    {dl.caseNumber}
                  </span>
                  <PriorityBadge priority={dl.priority} />
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug">{dl.description}</h3>
                <p className="text-xs text-slate-500 truncate">{dl.caseTitle}</p>

                {dl.notes && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-2">
                    {dl.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                <DeadlineBadge dueDate={dl.dueDate} status={dl.status} />

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {dl.status !== 'Cumplido' ? (
                    <button
                      onClick={() => onUpdateStatus(dl.id, 'Cumplido')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1 transition shadow-xs"
                      title="Marcar como Cumplido"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Cumplido</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onUpdateStatus(dl.id, 'Pendiente')}
                      className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200 text-xs font-semibold transition"
                    >
                      Reabrir
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
