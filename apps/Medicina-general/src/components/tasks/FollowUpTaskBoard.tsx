import React, { useState } from 'react';
import { CheckSquare, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import type { FollowUpTask } from '../../types/clinical.types';
import { clinicalStore } from '../../services/clinical/clinicalStore';

export interface FollowUpTaskBoardProps {
  tasks: FollowUpTask[];
  patientId: string;
}

export const FollowUpTaskBoard: React.FC<FollowUpTaskBoardProps> = ({ tasks, patientId }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<FollowUpTask['priority']>('NORMAL');
  const [type, setType] = useState<FollowUpTask['type']>('CONTROL_CHECKUP');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTask = async (taskId: string, currentStatus: FollowUpTask['status']) => {
    const nextStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    setError(null);
    try {
      await clinicalStore.updateTaskStatus(taskId, nextStatus);
    } catch (err: any) {
      setError(err?.message || 'Error al actualizar el estado de la tarea.');
    }
  };

  const createTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !dueDate) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await clinicalStore.addFollowUpTask({
        id: `task-${Date.now()}`,
        patientId,
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate,
        priority,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });
      setTitle('');
      setDueDate('');
      setDescription('');
      setPriority('NORMAL');
      setType('CONTROL_CHECKUP');
      setIsCreating(false);
    } catch (err: any) {
      setError(err?.message || 'Error al guardar la tarea de seguimiento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500">
        <CheckSquare className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-semibold">No existen tareas pendientes registradas para este expediente.</p>
        {error && (
          <div className="mx-auto mt-3 max-w-lg flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-2 text-xs text-rose-700 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}
        {!isCreating && (
          <button
            onClick={() => {
              setError(null);
              setIsCreating(true);
            }}
            className="mt-3 rounded-lg bg-sky-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-sky-700 transition"
          >
            + Nuevo seguimiento
          </button>
        )}
        {isCreating && (
          <form onSubmit={createTask} className="mx-auto mt-4 max-w-xl text-left rounded-xl border border-sky-200 bg-sky-50/40 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Título del seguimiento *</label>
                <input
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ej. Control de presión arterial post-tratamiento"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Tipo</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                  disabled={isSubmitting}
                >
                  <option value="CONTROL_CHECKUP">Reconsulta / Cita</option>
                  <option value="REVIEW_LAB">Revisión de Laboratorio</option>
                  <option value="CALL_PATIENT">Llamada de Control</option>
                  <option value="RENEW_PRESCRIPTION">Renovación de Receta</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Prioridad</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                  disabled={isSubmitting}
                >
                  <option value="NORMAL">Normal</option>
                  <option value="URGENT">Urgente</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Fecha límite *</label>
                <input
                  required
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Detalles / Indicaciones</label>
                <input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Instrucciones al paciente o equipo..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-sky-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Guardar seguimiento
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-sky-600" />
          <span>Tareas Clínicas & Seguimientos Médicos</span>
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono">{tasks.length} Tareas</span>
          <button
            onClick={() => {
              setError(null);
              setIsCreating(true);
            }}
            className="rounded-lg bg-sky-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-sky-700 transition"
          >
            + Nuevo seguimiento
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {isCreating && (
        <form onSubmit={createTask} className="rounded-xl border border-sky-200 bg-sky-50/40 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="sm:col-span-2">
              <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Título del seguimiento *</label>
              <input
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ej. Control de presión arterial post-tratamiento"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                disabled={isSubmitting}
              >
                <option value="CONTROL_CHECKUP">Reconsulta / Cita</option>
                <option value="REVIEW_LAB">Revisión de Laboratorio</option>
                <option value="CALL_PATIENT">Llamada de Control</option>
                <option value="RENEW_PRESCRIPTION">Renovación de Receta</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Prioridad</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                disabled={isSubmitting}
              >
                <option value="NORMAL">Normal</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Fecha límite *</label>
              <input
                required
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Detalles / Indicaciones</label>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Instrucciones al paciente o equipo..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-sky-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Guardar seguimiento
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs transition ${
              task.status === 'COMPLETED'
                ? 'bg-slate-50 border-slate-200 opacity-60'
                : task.priority === 'URGENT'
                ? 'bg-rose-50 border-rose-200'
                : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => toggleTask(task.id, task.status)}
                className="mt-0.5 p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-sky-600 transition border border-slate-200"
              >
                <CheckCircle2 className={`w-4 h-4 ${task.status === 'COMPLETED' ? 'text-emerald-600 fill-emerald-100' : 'text-slate-400'}`} />
              </button>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${task.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    {task.title}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                      task.priority === 'URGENT'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-sky-50 text-sky-700 border border-sky-200'
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
                {task.description && <p className="text-slate-600 text-[11px] font-mono">{task.description}</p>}
              </div>
            </div>

            <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
              Vence: {new Date(task.dueDate).toLocaleString('es-EC')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
