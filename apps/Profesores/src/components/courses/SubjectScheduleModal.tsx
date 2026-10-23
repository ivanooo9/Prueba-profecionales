import React, { useEffect, useState } from 'react';
import {
  CalendarDays,
  Plus,
  Trash2,
  Save,
  X,
  History,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Subject, AcademicYear, ScheduleSlot, SubjectScheduleStatus } from '../../types/teacher';
import { academicApi } from '../../services/api/academicApi';
import { getLocalDateString } from '../../utils/date';

interface SubjectScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: number;
  subject: Subject | null;
  academicYears: AcademicYear[];
  onSaved: () => void;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' },
];

export const SubjectScheduleModal: React.FC<SubjectScheduleModalProps> = ({
  isOpen,
  onClose,
  orgId,
  subject,
  academicYears,
  onSaved,
}) => {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [academicYearId, setAcademicYearId] = useState<string>('');
  const [effectiveFrom, setEffectiveFrom] = useState<string>(getLocalDateString());
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [historySlots, setHistorySlots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !subject) return;

    setActiveTab('current');
    setErrorMessage(null);
    setSuccessMessage(null);
    setEffectiveFrom(getLocalDateString());

    // Seleccionar año lectivo activo por defecto
    const activeYear = academicYears.find((y) => y.status === 'ACTIVE') || academicYears[0];
    if (activeYear) {
      setAcademicYearId(String(activeYear.id));
    }

    const loadSchedule = async () => {
      setIsLoading(true);
      try {
        const data = await academicApi.getSubjectSchedule(orgId, subject.id, {
          includeHistory: true,
        });

        if (data.activeSlots && data.activeSlots.length > 0) {
          setSlots(
            data.activeSlots.map((s: any) => ({
              id: s.id,
              dayOfWeek: s.dayOfWeek,
              startTime: s.startTime,
              endTime: s.endTime,
              pedagogicalHours: s.pedagogicalHours || 2,
              room: s.room || '',
              teacherUserId: s.teacherUserId ? String(s.teacherUserId) : undefined,
            }))
          );
        } else {
          // Inicializar con 1 bloque por defecto
          setSlots([
            {
              dayOfWeek: 1,
              startTime: '07:00',
              endTime: '08:30',
              pedagogicalHours: 2,
              room: '',
            },
          ]);
        }

        setHistorySlots(data.history || []);
      } catch (err: any) {
        setErrorMessage(err.message || 'Error al cargar el horario de la materia.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSchedule();
  }, [isOpen, subject, orgId, academicYears]);

  if (!isOpen || !subject) return null;

  const totalConfiguredHours = slots.reduce(
    (sum, s) => sum + (Number(s.pedagogicalHours) || 0),
    0
  );
  const requiredHours = subject.hoursPerWeek || 0;

  let scheduleStatus: SubjectScheduleStatus = 'no_schedule';
  if (totalConfiguredHours === 0) {
    scheduleStatus = 'no_schedule';
  } else if (requiredHours === 0 || totalConfiguredHours === requiredHours) {
    scheduleStatus = 'complete';
  } else if (totalConfiguredHours < requiredHours) {
    scheduleStatus = 'incomplete';
  } else {
    scheduleStatus = 'excess';
  }

  const handleAddSlot = () => {
    setSlots((prev) => [
      ...prev,
      {
        dayOfWeek: 1,
        startTime: '07:00',
        endTime: '08:30',
        pedagogicalHours: 2,
        room: '',
      },
    ]);
  };

  const handleRemoveSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSlotChange = (index: number, field: keyof ScheduleSlot, value: any) => {
    setSlots((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || !academicYearId) return;

    if (requiredHours > 0 && totalConfiguredHours > requiredHours) {
      setErrorMessage(`La suma de períodos pedagógicos configurados (${totalConfiguredHours} hrs) no puede exceder las horas semanales permitidas (${requiredHours} hrs).`);
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      await academicApi.saveSubjectSchedule(orgId, subject.id, {
        academicYearId: Number(academicYearId),
        effectiveFrom: effectiveFrom || undefined,
        slots: slots.map((s) => ({
          dayOfWeek: Number(s.dayOfWeek),
          startTime: s.startTime.trim(),
          endTime: s.endTime.trim(),
          pedagogicalHours: Number(s.pedagogicalHours) || 2,
          room: s.room?.trim() || null,
        })),
      });

      setSuccessMessage('Horario guardado correctamente con versionamiento histórico.');
      setTimeout(() => {
        onSaved();
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar el horario.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-modal-title"
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <header className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-2xl">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 id="schedule-modal-title" className="text-base font-extrabold text-slate-900">
                Horario Semanal — {subject.name}
              </h2>
              <p className="text-xs text-slate-500">
                {subject.courseName} · Docente: {subject.teacherName} · Carga: {requiredHours} períodos/sem
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 bg-white border-b border-slate-200 flex items-center gap-4 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('current')}
            className={`pb-2.5 border-b-2 transition cursor-pointer ${
              activeTab === 'current'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Configuración Vigente
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Historial de Versiones ({historySlots.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {errorMessage && (
            <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div role="status" className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {activeTab === 'current' ? (
            <form id="subject-schedule-form" onSubmit={handleSave} className="space-y-5">
              {/* Context bar: Academic Year & Effective Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <label htmlFor="schedule-academic-year" className="block font-bold text-slate-700 mb-1">
                    Año Lectivo *
                  </label>
                  <select
                    id="schedule-academic-year"
                    required
                    value={academicYearId}
                    onChange={(e) => setAcademicYearId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="" disabled>Seleccione año lectivo</option>
                    {academicYears.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name} ({year.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="schedule-effective-from" className="block font-bold text-slate-700 mb-1">
                    Inicio de Vigencia de este Horario
                  </label>
                  <input
                    id="schedule-effective-from"
                    type="date"
                    required
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                  </input>
                </div>
              </div>

              {/* Teaching load counter & status banner */}
              <div className="p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white shadow-2xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Carga Horaria Semanal
                  </span>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                    {totalConfiguredHours} de {requiredHours} períodos pedagógicos configurados
                  </div>
                </div>

                <div>
                  {scheduleStatus === 'no_schedule' && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      Sin horario
                    </span>
                  )}
                  {scheduleStatus === 'incomplete' && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Incompleto ({totalConfiguredHours}/{requiredHours} hrs)
                    </span>
                  )}
                  {scheduleStatus === 'complete' && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Completo ({totalConfiguredHours} hrs)
                    </span>
                  )}
                  {scheduleStatus === 'excess' && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Exceso de horas (+{totalConfiguredHours - requiredHours} hrs)
                    </span>
                  )}
                </div>
              </div>

              {/* Schedule Slots Rows */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Franjas Horarias Semanales ({slots.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddSlot}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar bloque
                  </button>
                </div>

                {slots.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-500">
                    No hay franjas horarias configuradas. Haz clic en “Agregar bloque” para registrar los días y horas de clase.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {slots.map((slot, index) => (
                      <div
                        key={index}
                        className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                      >
                        {/* Day of Week */}
                        <div className="sm:col-span-3">
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Día</label>
                          <select
                            value={slot.dayOfWeek}
                            onChange={(e) => handleSlotChange(index, 'dayOfWeek', Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          >
                            {DAYS_OF_WEEK.map((day) => (
                              <option key={day.value} value={day.value}>
                                {day.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Start Time */}
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Inicio</label>
                          <input
                            type="time"
                            required
                            value={slot.startTime}
                            onChange={(e) => handleSlotChange(index, 'startTime', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>

                        {/* End Time */}
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Fin</label>
                          <input
                            type="time"
                            required
                            value={slot.endTime}
                            onChange={(e) => handleSlotChange(index, 'endTime', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>

                        {/* Pedagogical Hours */}
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Períodos</label>
                          <input
                            type="number"
                            min="1"
                            max="6"
                            value={slot.pedagogicalHours}
                            onChange={(e) => handleSlotChange(index, 'pedagogicalHours', Number(e.target.value))}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>

                        {/* Room */}
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Aula (Opcional)</label>
                          <input
                            type="text"
                            placeholder="Aula..."
                            value={slot.room || ''}
                            onChange={(e) => handleSlotChange(index, 'room', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>

                        {/* Remove Action */}
                        <div className="sm:col-span-1 flex justify-end pt-3 sm:pt-0">
                          <button
                            type="button"
                            onClick={() => handleRemoveSlot(index)}
                            aria-label="Eliminar franja"
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="text-xs text-slate-500">
                Registro inmutable de versiones de horario previas aplicadas a esta materia.
              </div>

              {historySlots.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-500">
                  No hay versiones históricas registradas para esta materia.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {historySlots.map((h: any, idx: number) => {
                    const dayObj = DAYS_OF_WEEK.find((d) => d.value === h.dayOfWeek);
                    const fromStr = h.effectiveFrom ? new Date(h.effectiveFrom).toLocaleDateString('es-EC') : 'Inicio';
                    const toStr = h.effectiveTo ? new Date(h.effectiveTo).toLocaleDateString('es-EC') : 'Vigente';

                    return (
                      <div key={idx} className="p-3.5 bg-white flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span>{dayObj?.label || `Día ${h.dayOfWeek}`}: {h.startTime} – {h.endTime}</span>
                            <span className="font-mono text-[10px] text-slate-500">({h.pedagogicalHours || 2} períodos)</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Vigencia: {fromStr} hasta {toStr} · Docente: {h.teacherUser?.name || 'Asignado'}
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            h.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {h.status === 'ACTIVE' ? 'Activo' : 'Reemplazado'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <footer className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs transition disabled:opacity-50 cursor-pointer"
          >
            Cerrar
          </button>
          {activeTab === 'current' && (
            <button
              type="submit"
              form="subject-schedule-form"
              disabled={isSaving || isLoading || !academicYearId}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Guardando...' : 'Guardar Horario'}</span>
            </button>
          )}
        </footer>
      </section>
    </div>
  );
};
