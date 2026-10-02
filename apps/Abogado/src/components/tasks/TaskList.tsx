import React, { useState } from 'react';
import {
  CheckSquare,
  Search,
  Plus,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { LegalTask, LegalCase } from '../../types';
import { PriorityBadge } from '../ui/PriorityBadge';
import { EmptyState } from '../ui/EmptyState';

export interface TaskListProps {
  tasks: LegalTask[];
  cases: LegalCase[];
  onOpenNewTaskModal: () => void;
  onToggleTask: (id: string) => void;
  onSelectCase: (caseId: string) => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  cases,
  onOpenNewTaskModal,
  onToggleTask,
  onSelectCase,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.caseNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.assignedTo.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'todos'
        ? true
        : statusFilter === 'pendientes'
        ? t.status !== 'Completada'
        : t.status === 'Completada';

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-emerald-600" />
            Tareas Pendientes del Despacho
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestión operativa de actividades jurídicas cotidianas
          </p>
        </div>

        <button
          onClick={onOpenNewTaskModal}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Tarea</span>
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
            placeholder="Buscar por tarea o nro. expediente..."
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
            <option value="todos">Todas las Tareas</option>
            <option value="pendientes">Sólo Pendientes</option>
            <option value="completadas">Sólo Completadas</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          title="No hay tareas registradas"
          description="Cree una tarea operativa asignada a un expediente."
          actionLabel="Nueva Tarea"
          onAction={onOpenNewTaskModal}
          icon={CheckSquare}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden divide-y divide-slate-100">
          {filteredTasks.map((task) => {
            const isDone = task.status === 'Completada';
            return (
              <div
                key={task.id}
                className="p-4 hover:bg-slate-50/70 transition flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <button
                    onClick={() => onToggleTask(task.id)}
                    className="text-slate-300 hover:text-emerald-600 transition shrink-0"
                  >
                    <CheckCircle2
                      className={`w-6 h-6 ${
                        isDone ? 'text-emerald-600 fill-emerald-100' : ''
                      }`}
                    />
                  </button>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      {task.caseNumber && (
                        <span
                          onClick={() => task.caseId && onSelectCase(task.caseId)}
                          className="text-[10px] font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 cursor-pointer hover:underline"
                        >
                          {task.caseNumber}
                        </span>
                      )}
                      <PriorityBadge priority={task.priority} showIcon={false} />
                    </div>

                    <h3
                      className={`text-xs font-bold text-slate-900 leading-snug ${
                        isDone ? 'line-through text-slate-400' : ''
                      }`}
                    >
                      {task.title}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Vence: {task.dueDate} &bull; Asignado a: {task.assignedTo}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                      isDone
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
