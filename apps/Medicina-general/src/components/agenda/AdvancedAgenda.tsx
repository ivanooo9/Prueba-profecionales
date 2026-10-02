import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Edit2,
  AlertCircle,
  CalendarDays,
  Loader2,
  FileText,
  X,
  Clock,
} from 'lucide-react';
import { useClinicalStore, clinicalStore } from '../../services/clinical/clinicalStore';
import type { Appointment } from '../../types/clinical.types';

export interface AdvancedAgendaProps {
  onOpenSoapModal: (
    patientId: string,
    consultationId?: string,
    appointmentId?: string,
    mode?: 'CREATE' | 'CONTINUE' | 'VIEW'
  ) => void;
  onOpenPrescriptionModal?: (patientId: string, consultationId?: string) => void;
  onSelectPatient?: (patientId: string) => void;
}

type AppointmentFilter = 'ALL' | 'PENDING' | 'WAITING_ROOM' | 'IN_CONSULTATION' | 'ATTENDED' | 'CANCELLED';

const STATUS_CONFIG: Record<
  Appointment['status'],
  { label: string; badgeClass: string; dotClass: string }
> = {
  PENDING: {
    label: 'Pendiente',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  WAITING_ROOM: {
    label: 'En sala de espera',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    dotClass: 'bg-orange-500 animate-pulse',
  },
  IN_CONSULTATION: {
    label: 'En consulta',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    dotClass: 'bg-sky-500 animate-pulse',
  },
  ATTENDED: {
    label: 'Atendida',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  CANCELLED: {
    label: 'Cancelada',
    badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
    dotClass: 'bg-slate-400',
  },
  CONFIRMED: {
    label: 'Confirmada',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    dotClass: 'bg-teal-500',
  },
  NO_SHOW: {
    label: 'No asistió',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
  },
};

const TYPE_CONFIG: Record<Appointment['type'], string> = {
  FIRST_CONSULTATION: 'Primera Consulta',
  FOLLOW_UP: 'Control / Seguimiento',
  EXAM_REVIEW: 'Revisión de Exámenes',
  URGENT: 'Urgencia',
};

function formatHumanDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const formatted = date.toLocaleDateString('es-EC', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch {
    return dateStr;
  }
}

export const AdvancedAgenda: React.FC<AdvancedAgendaProps> = ({
  onOpenSoapModal,
  onSelectPatient,
}) => {
  const getToday = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const state = useClinicalStore((s) => s);
  const { appointments, patients, consultations } = state;

  const [selectedDate, setSelectedDate] = useState<string>(() => getToday());
  const [filter, setFilter] = useState<AppointmentFilter>('ALL');

  // Menú contextual desplegable abierto
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Modal Nueva Cita
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newPatientId, setNewPatientId] = useState('');
  const [newDate, setNewDate] = useState(getToday());
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('09:30');
  const [newReason, setNewReason] = useState('');
  const [newType, setNewType] = useState<Appointment['type']>('FIRST_CONSULTATION');
  const [newRoom, setNewRoom] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);
  const [newError, setNewError] = useState<string | null>(null);

  // Modal Editar Cita
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [editStatus, setEditStatus] = useState<Appointment['status']>('PENDING');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Cerrar menú contextual al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.appointment-menu-container')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Mapa de pacientes
  const patientMap = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients]);

  // Citas del día ordenadas cronológicamente
  const dayAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.date === selectedDate)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [appointments, selectedDate]);

  // Conteo de citas por estado
  const counts = useMemo(() => {
    return {
      ALL: dayAppointments.length,
      PENDING: dayAppointments.filter((a) => a.status === 'PENDING' || a.status === 'CONFIRMED').length,
      WAITING_ROOM: dayAppointments.filter((a) => a.status === 'WAITING_ROOM').length,
      IN_CONSULTATION: dayAppointments.filter((a) => a.status === 'IN_CONSULTATION').length,
      ATTENDED: dayAppointments.filter((a) => a.status === 'ATTENDED').length,
      CANCELLED: dayAppointments.filter((a) => a.status === 'CANCELLED' || a.status === 'NO_SHOW').length,
    };
  }, [dayAppointments]);

  // Filtrado final
  const filteredAppointments = useMemo(() => {
    if (filter === 'ALL') return dayAppointments;
    if (filter === 'PENDING') return dayAppointments.filter((a) => a.status === 'PENDING' || a.status === 'CONFIRMED');
    if (filter === 'CANCELLED') return dayAppointments.filter((a) => a.status === 'CANCELLED' || a.status === 'NO_SHOW');
    return dayAppointments.filter((a) => a.status === filter);
  }, [dayAppointments, filter]);

  // Navegación de fecha
  const shiftDate = (days: number) => {
    const parts = selectedDate.split('-');
    const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    date.setDate(date.getDate() + days);
    const nextDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setSelectedDate(nextDate);
  };

  const jumpToToday = () => {
    setSelectedDate(getToday());
  };

  // Abrir modal nueva cita
  const handleOpenNewModal = () => {
    setNewPatientId(patients.length > 0 ? patients[0].id : '');
    setNewDate(selectedDate);
    setNewStartTime('09:00');
    setNewEndTime('09:30');
    setNewReason('');
    setNewType('FIRST_CONSULTATION');
    setNewRoom('Consultorio 1');
    setNewNotes('');
    setNewError(null);
    setIsNewModalOpen(true);
  };

  // Guardar nueva cita
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientId) {
      setNewError('Seleccione un paciente');
      return;
    }
    if (!newReason.trim()) {
      setNewError('Ingrese el motivo de la consulta');
      return;
    }
    if (!newStartTime) {
      setNewError('Ingrese la hora de inicio');
      return;
    }

    setIsSubmittingNew(true);
    setNewError(null);
    try {
      await clinicalStore.addAppointment({
        patientId: newPatientId,
        date: newDate,
        startTime: newStartTime,
        endTime: newEndTime || undefined,
        reason: newReason.trim(),
        type: newType,
        status: 'PENDING',
        room: newRoom.trim() || undefined,
        notes: newNotes.trim() || undefined,
      });

      setSelectedDate(newDate);
      setIsNewModalOpen(false);
    } catch (err: any) {
      console.error('[AdvancedAgenda.handleCreateAppointment] Error:', err);
      setNewError(err.message || 'Error al agendar la cita médica');
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Abrir modal editar cita
  const handleOpenEditModal = (apt: Appointment) => {
    setActiveMenuId(null);
    setEditingAppointment(apt);
    setEditStatus(apt.status);
    setEditStartTime(apt.startTime);
    setEditEndTime(apt.endTime || '');
    setEditRoom(apt.room || '');
    setEditReason(apt.reason);
    setEditNotes(apt.notes || '');
    setEditError(null);
  };

  // Guardar cambios de edición
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppointment) return;

    setIsSubmittingEdit(true);
    setEditError(null);
    try {
      await clinicalStore.updateAppointment(editingAppointment.id, {
        status: editStatus,
        startTime: editStartTime,
        endTime: editEndTime || undefined,
        room: editRoom.trim() || undefined,
        reason: editReason.trim(),
        notes: editNotes.trim() || undefined,
      });
      setEditingAppointment(null);
    } catch (err: any) {
      console.error('[AdvancedAgenda.handleSaveEdit] Error:', err);
      setEditError(err.message || 'Error al actualizar la cita');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // -------------------------------------------------------------
  // ACCIONES PRINCIPALES SEGÚN ESTADO
  // -------------------------------------------------------------

  // 1. Iniciar consulta (para PENDING, CONFIRMED, WAITING_ROOM)
  const handleStartConsultation = async (apt: Appointment) => {
    if (apt.status === 'PENDING' || apt.status === 'CONFIRMED' || apt.status === 'WAITING_ROOM') {
      clinicalStore.updateAppointmentStatus(apt.id, 'IN_CONSULTATION').catch((e) =>
        console.warn('No se pudo actualizar estado a IN_CONSULTATION:', e)
      );
    }
    onOpenSoapModal(apt.patientId, apt.consultationId, apt.id, 'CREATE');
  };

  // 2. Continuar consulta (para IN_CONSULTATION, reutiliza consulta existente)
  const handleContinueConsultation = (apt: Appointment) => {
    let targetConsultationId = apt.consultationId;
    if (!targetConsultationId) {
      // Reutilizar consulta existente de hoy para el paciente si existe
      const existing = consultations.find(
        (c) => String(c.patientId) === String(apt.patientId) && (c.date?.startsWith(selectedDate) || c.status === 'DRAFT')
      );
      if (existing) {
        targetConsultationId = existing.id;
        clinicalStore.updateAppointment(apt.id, { consultationId: targetConsultationId }).catch(console.warn);
      }
    }
    onOpenSoapModal(apt.patientId, targetConsultationId, apt.id, 'CONTINUE');
  };

  // 3. Ver consulta (para ATTENDED, abre la consulta existente)
  const handleViewConsultation = (apt: Appointment) => {
    let targetConsultationId = apt.consultationId;
    if (!targetConsultationId) {
      let existing = consultations.find(
        (c) => String(c.patientId) === String(apt.patientId) && c.date?.startsWith(selectedDate)
      );
      if (!existing) {
        const patientConsults = consultations.filter((c) => String(c.patientId) === String(apt.patientId));
        if (patientConsults.length > 0) {
          existing = patientConsults[patientConsults.length - 1];
        }
      }
      if (existing) {
        targetConsultationId = existing.id;
        clinicalStore.updateAppointment(apt.id, { consultationId: targetConsultationId }).catch(console.warn);
      }
    }
    onOpenSoapModal(apt.patientId, targetConsultationId, apt.id, 'VIEW');
  };

  // Cambio rápido de estado desde menú
  const handleStatusChangeFromMenu = (apt: Appointment, newStatus: Appointment['status']) => {
    setActiveMenuId(null);
    clinicalStore.updateAppointmentStatus(apt.id, newStatus).catch((e) =>
      console.error('Error al cambiar estado:', e)
    );
  };

  const isToday = selectedDate === getToday();

  return (
    <div className="space-y-4">
      {/* ========================================================= */}
      {/* 1. CABECERA PRINCIPAL Y SELECTOR DE FECHA                 */}
      {/* ========================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Agenda Médica
            </h1>
            {isToday && (
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide bg-sky-100 text-sky-700 rounded-full border border-sky-200">
                Hoy
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {formatHumanDate(selectedDate)}
          </p>
        </div>

        {/* Controles de navegación y acción */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Navegación de fecha */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => shiftDate(-1)}
              className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-lg transition shadow-xs"
              title="Día anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={jumpToToday}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                isToday
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => shiftDate(1)}
              className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-lg transition shadow-xs"
              title="Día siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Date Picker directo */}
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="py-1 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
            />
          </div>

          {/* Botón Nueva Cita */}
          <button
            type="button"
            onClick={handleOpenNewModal}
            className="flex items-center gap-1.5 py-1.5 px-3.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Cita</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. FILTROS POR ESTADO                                     */}
      {/* ========================================================= */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
            filter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>Todas</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === 'ALL' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {counts.ALL}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('PENDING')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
            filter === 'PENDING'
              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
              : 'bg-white text-amber-700 border-slate-200 hover:bg-amber-50/50'
          }`}
        >
          <span>Pendientes</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === 'PENDING' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800'}`}>
            {counts.PENDING}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('WAITING_ROOM')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
            filter === 'WAITING_ROOM'
              ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
              : 'bg-white text-orange-700 border-slate-200 hover:bg-orange-50/50'
          }`}
        >
          <span>En sala de espera</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === 'WAITING_ROOM' ? 'bg-orange-700 text-white' : 'bg-orange-100 text-orange-800'}`}>
            {counts.WAITING_ROOM}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('IN_CONSULTATION')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
            filter === 'IN_CONSULTATION'
              ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
              : 'bg-white text-sky-700 border-slate-200 hover:bg-sky-50/50'
          }`}
        >
          <span>En consulta</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === 'IN_CONSULTATION' ? 'bg-sky-700 text-white' : 'bg-sky-100 text-sky-800'}`}>
            {counts.IN_CONSULTATION}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('ATTENDED')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
            filter === 'ATTENDED'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-emerald-700 border-slate-200 hover:bg-emerald-50/50'
          }`}
        >
          <span>Atendidas</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === 'ATTENDED' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
            {counts.ATTENDED}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('CANCELLED')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
            filter === 'CANCELLED'
              ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>Canceladas</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === 'CANCELLED' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {counts.CANCELLED}
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* 3. LISTA SIMPLIFICADA DE CITAS                            */}
      {/* ========================================================= */}
      {filteredAppointments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-xs">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center mx-auto mb-2">
            <CalendarDays className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            No hay citas programadas para este día
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {filter === 'ALL'
              ? 'Haga clic en "+ Nueva Cita" para programar una consulta médica.'
              : 'Cambie el filtro para ver otras citas agendadas.'}
          </p>
          {filter === 'ALL' && (
            <button
              type="button"
              onClick={handleOpenNewModal}
              className="mt-3 inline-flex items-center gap-1.5 py-1.5 px-3.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Cita</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAppointments.map((apt) => {
            const patient = patientMap.get(apt.patientId);
            const statusCfg = STATUS_CONFIG[apt.status] || STATUS_CONFIG.PENDING;
            const typeLabel = TYPE_CONFIG[apt.type] || 'Consulta';

            // Línea secundaria discreta separada por puntos medios (·)
            const secondaryParts = [
              apt.endTime ? `${apt.startTime} - ${apt.endTime}` : apt.startTime,
              apt.room || null,
              typeLabel,
            ].filter(Boolean);
            const secondaryText = secondaryParts.join(' · ');

            const isMenuOpen = activeMenuId === apt.id;

            return (
              <div
                key={apt.id}
                className="bg-white border border-slate-200 rounded-2xl py-3 px-4 sm:px-5 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                {/* Bloque Izquierdo: Hora, Paciente, Motivo y Datos Secundarios */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  {/* 1. HORA DESTACADA */}
                  <div className="flex items-center justify-center w-16 py-1.5 bg-slate-50 rounded-xl border border-slate-200 shrink-0">
                    <span className="text-base font-black text-slate-900 tracking-tight">
                      {apt.startTime}
                    </span>
                  </div>

                  {/* 2. INFORMACIÓN PRINCIPAL Y SECUNDARIA */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    {/* Fila: Nombre del Paciente + Badge de Estado ÚNICO */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectPatient && onSelectPatient(apt.patientId)}
                        className="text-sm font-extrabold text-slate-900 hover:text-sky-600 transition text-left truncate"
                        title="Ver expediente del paciente"
                      >
                        {patient ? patient.name : `Paciente #${apt.patientId}`}
                      </button>

                      {/* Badge de Estado Único */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${statusCfg.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`} />
                        <span>{statusCfg.label}</span>
                      </span>
                    </div>

                    {/* 3. MOTIVO (Visible directamente, sin etiqueta redundant MOTIVO:) */}
                    <p className="text-xs font-semibold text-slate-700 truncate">
                      {apt.reason}
                    </p>

                    {/* 4. INFORMACIÓN SECUNDARIA DISCRETA */}
                    <p className="text-[11px] font-medium text-slate-400 truncate">
                      {secondaryText}
                    </p>
                  </div>
                </div>

                {/* Bloque Derecho: Acción Principal según Estado + Menú [ ⋯ ] */}
                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 justify-end appointment-menu-container relative">
                  {/* ACCIÓN PRINCIPAL POR ESTADO */}
                  {(apt.status === 'PENDING' || apt.status === 'CONFIRMED' || apt.status === 'WAITING_ROOM') && (
                    <button
                      type="button"
                      onClick={() => handleStartConsultation(apt)}
                      className="flex items-center gap-1.5 py-1.5 px-3.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95"
                    >
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>Iniciar consulta</span>
                    </button>
                  )}

                  {apt.status === 'IN_CONSULTATION' && (
                    <button
                      type="button"
                      onClick={() => handleContinueConsultation(apt)}
                      className="flex items-center gap-1.5 py-1.5 px-3.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95"
                    >
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>Continuar consulta</span>
                    </button>
                  )}

                  {apt.status === 'ATTENDED' && (
                    <button
                      type="button"
                      onClick={() => handleViewConsultation(apt)}
                      className="flex items-center gap-1.5 py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Ver consulta</span>
                    </button>
                  )}

                  {/* CANCELLED: NO muestra acción de iniciar consulta */}

                  {/* BOTÓN MENÚ CONTEXTUAL [ ⋯ ] */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(isMenuOpen ? null : apt.id);
                      }}
                      className={`p-1.5 rounded-xl border transition ${
                        isMenuOpen
                          ? 'bg-slate-200 border-slate-300 text-slate-800'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                      }`}
                      title="Opciones de la cita"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Desplegable Contextual */}
                    {isMenuOpen && (
                      <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                        {/* Editar Cita */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(apt)}
                          className="w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>Editar cita</span>
                        </button>

                        {/* Reprogramar */}
                        {(apt.status === 'CANCELLED' || apt.status === 'PENDING') && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(apt)}
                            className="w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Reprogramar</span>
                          </button>
                        )}

                        <div className="my-1 border-t border-slate-100" />
                        <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          Cambiar estado
                        </div>

                        {apt.status !== 'WAITING_ROOM' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChangeFromMenu(apt, 'WAITING_ROOM')}
                            className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-700 flex items-center gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                            <span>A sala de espera</span>
                          </button>
                        )}

                        {apt.status !== 'IN_CONSULTATION' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChangeFromMenu(apt, 'IN_CONSULTATION')}
                            className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-700 flex items-center gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                            <span>En consulta</span>
                          </button>
                        )}

                        {apt.status !== 'ATTENDED' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChangeFromMenu(apt, 'ATTENDED')}
                            className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Marcar atendida</span>
                          </button>
                        )}

                        {apt.status !== 'PENDING' && apt.status !== 'CONFIRMED' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChangeFromMenu(apt, 'PENDING')}
                            className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-700 flex items-center gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>Mover a pendiente</span>
                          </button>
                        )}

                        {apt.status !== 'CANCELLED' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChangeFromMenu(apt, 'CANCELLED')}
                            className="w-full px-3 py-1.5 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                          >
                            <X className="w-3.5 h-3.5 text-rose-500" />
                            <span>Cancelar cita</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. MODAL: NUEVA CITA                                      */}
      {/* ========================================================= */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">Agendar Nueva Cita</h3>
                  <p className="text-[11px] text-slate-500">
                    Registre la cita médica para la fecha seleccionada
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {newError && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{newError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAppointment} className="mt-4 space-y-3">
              {/* Selección de Paciente */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Paciente <span className="text-rose-500">*</span>
                </label>
                {patients.length === 0 ? (
                  <p className="text-xs text-rose-600">
                    No hay pacientes registrados en esta organización.
                  </p>
                ) : (
                  <select
                    value={newPatientId}
                    onChange={(e) => setNewPatientId(e.target.value)}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.idNumber ? `(CI: ${p.idNumber})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Fecha y Horario */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fecha <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hora Inicio <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hora Fin
                  </label>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Tipo y Consultorio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo de Cita
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as Appointment['type'])}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="FIRST_CONSULTATION">Primera Consulta</option>
                    <option value="FOLLOW_UP">Control / Seguimiento</option>
                    <option value="EXAM_REVIEW">Revisión de Exámenes</option>
                    <option value="URGENT">Urgencia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Consultorio / Sala
                  </label>
                  <input
                    type="text"
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    placeholder="Ej: Consultorio 1"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Motivo de la Consulta <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="Ej: Control de hipertensión arterial y cefalea"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notas Adicionales
                </label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={2}
                  placeholder="Instrucciones o recordatorios"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                />
              </div>

              {/* Botones */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  disabled={isSubmittingNew}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNew || patients.length === 0}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  {isSubmittingNew && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmittingNew ? 'Agendando...' : 'Agendar Cita'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. MODAL: EDITAR CITA                                     */}
      {/* ========================================================= */}
      {editingAppointment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">Editar Cita Médica</h3>
                  <p className="text-[11px] text-slate-500">
                    Paciente:{' '}
                    <span className="font-semibold text-slate-700">
                      {patientMap.get(editingAppointment.patientId)?.name || 'Paciente'}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAppointment(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3">
              {/* Estado de la Cita */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Estado de la Cita
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as Appointment['status'])}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="PENDING">Pendiente</option>
                  <option value="WAITING_ROOM">En sala de espera</option>
                  <option value="IN_CONSULTATION">En consulta</option>
                  <option value="ATTENDED">Atendida</option>
                  <option value="CANCELLED">Cancelada</option>
                </select>
              </div>

              {/* Horas */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hora Inicio
                  </label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hora Fin
                  </label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Consultorio y Motivo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Consultorio / Sala
                  </label>
                  <input
                    type="text"
                    value={editRoom}
                    onChange={(e) => setEditRoom(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Motivo
                  </label>
                  <input
                    type="text"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notas
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                />
              </div>

              {/* Botones */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAppointment(null)}
                  disabled={isSubmittingEdit}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  {isSubmittingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmittingEdit ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
