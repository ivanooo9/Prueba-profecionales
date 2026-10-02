import React, { useState } from 'react';
import { Appointment, AppointmentStatus } from '../../types';
import { dentalService } from '../../services/dentalService';
import { StatusBadge } from '../ui/StatusBadge';
import { SearchFilter } from '../ui/SearchFilter';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import { CalendarCheck, Plus, Clock, User, AlertCircle, Sparkles } from 'lucide-react';

interface AppointmentListProps {
  onSelectPatient: (patientId: string) => void;
  onOpenNewAppointmentModal: () => void;
  embedded?: boolean;
}

export const AppointmentList: React.FC<AppointmentListProps> = ({
  onSelectPatient,
  onOpenNewAppointmentModal,
  embedded = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal para motivo obligatorio de cancelación
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isSubmittingCancellation, setIsSubmittingCancellation] = useState(false);

  const appointments = dentalService.getAppointments();

  const filteredAppointments = appointments.filter(a => {
    const matchesQuery = 
      a.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.dentist.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !statusFilter || a.status === statusFilter;
    const matchesDate = !selectedDate || a.date === selectedDate;

    return matchesQuery && matchesStatus && matchesDate;
  });

  const handleStatusChange = async (id: string, newStatus: AppointmentStatus) => {
    setErrorMessage(null);
    if (newStatus === 'Cancelada') {
      setCancellingAppointmentId(id);
      setCancellationReason('');
      return;
    }

    try {
      await dentalService.updateAppointmentStatus(id, newStatus);
    } catch (err: any) {
      console.error('[AppointmentList] Error updating status:', err);
      const msg = err.response?.data?.error || err.message || 'No se pudo actualizar el estado de la cita.';
      setErrorMessage(msg);
    }
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingAppointmentId) return;

    if (!cancellationReason.trim()) {
      setErrorMessage('El motivo de cancelación es obligatorio.');
      return;
    }

    setIsSubmittingCancellation(true);
    try {
      await dentalService.cancelAppointment(cancellingAppointmentId, cancellationReason.trim());
      setCancellingAppointmentId(null);
      setCancellationReason('');
    } catch (err: any) {
      console.error('[AppointmentList] Error cancelling appointment:', err);
      const msg = err.response?.data?.error || err.message || 'No se pudo cancelar la cita.';
      setErrorMessage(msg);
    } finally {
      setIsSubmittingCancellation(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Agenda de citas</h2>
            <p className="text-xs text-slate-500 mt-1">Consultas, controles y procedimientos programados.</p>
          </div>

          <button
            onClick={onOpenNewAppointmentModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs rounded-xl shadow-sm shadow-cyan-600/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva cita</span>
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-500 font-bold hover:underline">
            Cerrar
          </button>
        </div>
      )}

      {/* Search & Date Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <SearchFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder="Buscar por paciente, procedimiento u odontólogo..."
          filterOptions={[
            { label: 'Programada', value: 'Programada' },
            { label: 'Confirmada', value: 'Confirmada' },
            { label: 'En espera', value: 'En espera' },
            { label: 'Atendida', value: 'Atendida' },
            { label: 'Cancelada', value: 'Cancelada' },
            { label: 'No asistió', value: 'No asistió' },
          ]}
          selectedFilter={statusFilter}
          onFilterChange={setStatusFilter}
        />

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Filtrar Fecha:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
          />
          {selectedDate && (
            <button 
              onClick={() => setSelectedDate('')}
              className="text-xs text-cyan-600 font-semibold underline whitespace-nowrap"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Appointments List / Cards */}
      {filteredAppointments.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {filteredAppointments.map(apt => (
            <div 
              key={apt.id}
              className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
            >
              {/* Left: Time & Patient */}
              <div className="flex items-start gap-4">
                <div className="bg-cyan-50 border border-cyan-200 p-3 rounded-xl text-center min-w-[75px]">
                  <span className="text-[10px] font-mono text-cyan-800 font-bold uppercase block">{apt.date}</span>
                  <span className="text-sm font-bold font-mono text-cyan-900 block mt-0.5">{apt.time}</span>
                  <span className="text-[9px] text-cyan-600 block">{apt.durationMinutes} min</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => onSelectPatient(apt.patientId)}
                      className="text-sm font-bold text-slate-900 hover:text-cyan-600 transition-colors text-left"
                    >
                      {apt.patientName}
                    </button>
                    <StatusBadge status={apt.status} />

                    {apt.treatmentPlanTitle && (
                      <span className="text-[10px] bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-md font-medium border border-cyan-200/60">
                        Plan: {apt.treatmentPlanTitle}
                      </span>
                    )}
                    {apt.treatmentItemProcedure && (
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-medium border border-blue-200/60">
                        Item: {apt.treatmentItemProcedure}
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-semibold text-cyan-800">
                    Tipo: {apt.type}
                  </div>

                  <p className="text-xs text-slate-500 max-w-xl">
                    {apt.notes || 'Sin observaciones especificadas.'}
                  </p>

                  {apt.status === 'Cancelada' && apt.cancellationReason && (
                    <div className="text-[11px] text-red-600 font-medium italic">
                      Motivo de cancelación: {apt.cancellationReason}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>Odontólogo tratante: <strong className="text-slate-600">{apt.dentist}</strong></span>
                  </div>
                </div>
              </div>

              {/* Right: Quick Status Actions */}
              <div className="flex items-center gap-2 self-end md:self-center">
                <select
                  value={apt.status}
                  onChange={(e) => handleStatusChange(apt.id, e.target.value as AppointmentStatus)}
                  disabled={apt.status === 'Atendida' || apt.status === 'Cancelada' || apt.status === 'No asistió'}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="Programada">Programada</option>
                  <option value="Confirmada">Confirmada</option>
                  <option value="En espera">En espera</option>
                  <option value="Atendida">Atendida (Completada)</option>
                  <option value="Cancelada">Cancelada</option>
                  <option value="No asistió">No asistió</option>
                </select>

                <button
                  onClick={() => onSelectPatient(apt.patientId)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                >
                  Ver Ficha
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CalendarCheck className="w-8 h-8" />}
          title="Sin citas registradas"
          description="No existen citas que coincidan con la fecha o filtros aplicados."
          actionLabel="Agendar Nueva Cita"
          onAction={onOpenNewAppointmentModal}
        />
      )}

      {/* Modal de Cancelación con Motivo Obligatorio */}
      <Modal
        isOpen={!!cancellingAppointmentId}
        onClose={() => setCancellingAppointmentId(null)}
        title="Cancelar Cita Odontológica"
        subtitle="Especifique el motivo por el cual se cancela la cita. Esta acción liberará el horario del profesional."
        maxWidth="md"
      >
        <form onSubmit={handleConfirmCancel} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Motivo de Cancelación *
            </label>
            <textarea
              rows={3}
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="Ej: Paciente solicitó postergación por motivos laborales..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs resize-none"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCancellingAppointmentId(null)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-medium text-xs rounded-xl hover:bg-slate-200"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={isSubmittingCancellation || !cancellationReason.trim()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl shadow-sm disabled:opacity-50"
            >
              {isSubmittingCancellation ? 'Cancelando...' : 'Confirmar Cancelación'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
