import React, { useState } from 'react';
import { Task, Project } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { PriorityBadge } from '../ui/PriorityBadge';
import { EmptyState } from '../ui/EmptyState';
import {
  CheckSquare,
  Plus,
  Search,
  CheckCircle2,
  Circle,
  Calendar,
  User,
  Edit,
} from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  projects: Project[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onToggleTask: (id: string | number) => void;
  onOpenCreateModal: () => void;
  onEditTask: (task: Task) => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  projects,
  searchQuery,
  onSearchChange,
  onToggleTask,
  onOpenCreateModal,
  onEditTask,
}) => {
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assignedTo.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProject = projectFilter === 'all' || String(t.projectId) === String(projectFilter);
    const effectiveStatus = t.isOverdue ? 'Atrasada' : t.status;
    const matchesStatus = statusFilter === 'all' || effectiveStatus === statusFilter;

    return matchesSearch && matchesProject && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar tarea, responsable o proyecto..."
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="all">Todos los Estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="En progreso">En progreso</option>
            <option value="Completada">Completada</option>
            <option value="Atrasada">Atrasada</option>
          </select>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-arch-600 hover:bg-arch-700 rounded-lg shadow-xs transition-colors self-end sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nueva Tarea
        </button>
      </div>

      {/* Task List Table */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No hay tareas que mostrar"
          description="Cree una tarea para dar seguimiento a los entregables y avances del estudio."
          actionLabel="Crear Tarea"
          onAction={onOpenCreateModal}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => onToggleTask(task.id)}
                    className="mt-0.5 text-slate-400 hover:text-arch-600 transition-colors"
                    title={task.status === 'Completada' ? 'Marcar como pendiente' : 'Marcar como completada'}
                  >
                    {task.status === 'Completada' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div className="space-y-0.5">
                    <p
                      className={`text-xs font-bold ${
                        task.status === 'Completada' ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      {task.title}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Proyecto: <span className="text-slate-800">{task.projectName}</span>
                    </p>
                    {task.description && (
                      <p className="text-[11px] text-slate-600 line-clamp-1">{task.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{task.assignedTo}</span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{task.dueDate}</span>
                  </div>

                  <PriorityBadge priority={task.priority} size="sm" />
                  <StatusBadge status={task.isOverdue ? 'Atrasada' : task.status} size="sm" />

                  <div className="flex items-center gap-1 pl-2 border-l border-slate-100">
                    <button
                      onClick={() => onEditTask(task)}
                      className="p-1 text-slate-400 hover:text-slate-700"
                      title="Editar"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
