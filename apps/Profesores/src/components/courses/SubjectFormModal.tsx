import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  Plus,
  Trash2,
  Save,
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  Subject,
  AcademicYear,
  SubjectFormData,
  ScheduleSlotFormData,
  SubjectScheduleStatus,
} from '../../types/teacher';
import { getLocalDateString } from '../../utils/date';

export type { SubjectFormData };

interface SubjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subject: SubjectFormData) => Promise<void>;
  initialData?: Subject | null;
  academicYears?: AcademicYear[];
  courseName?: string;
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

export const SubjectFormModal: React.FC<SubjectFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  academicYears = [],
  courseName,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState('');
  const [academicYearId, setAcademicYearId] = useState<string>('');
  const [slots, setSlots] = useState<ScheduleSlotFormData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setIsSubmitting(false);

      // Default active academic year
      const activeYear = academicYears.find((y) => y.status === 'ACTIVE') || academicYears[0];
      if (activeYear) {
        setAcademicYearId(String(activeYear.id));
      } else {
        setAcademicYearId('');
      }

      if (initialData) {
        setName(initialData.name || '');
        setCode(initialData.code || '');
        setHoursPerWeek(initialData.hoursPerWeek ? String(initialData.hoursPerWeek) : '');
        if (initialData.activeSlots && initialData.activeSlots.length > 0) {
          setSlots(
            initialData.activeSlots.map((s) => ({
              id: s.id,
              dayOfWeek: s.dayOfWeek,
              startTime: s.startTime,
              endTime: s.endTime,
              pedagogicalHours: s.pedagogicalHours || 2,
              room: s.room || '',
              teacherUserId: s.teacherUserId,
            }))
          );
        } else {
          setSlots([]);
        }
      } else {
        setName('');
        setCode('');
        setHoursPerWeek('');
        setSlots([]);
      }
    }
  }, [isOpen, initialData, academicYears]);

  if (!isOpen) return null;

  const totalConfiguredHours = slots.reduce(
    (sum, s) => sum + (Number(s.pedagogicalHours) || 0),
    0
  );
  const reqHours = hoursPerWeek ? Number(hoursPerWeek) : 0;

  let scheduleStatus: SubjectScheduleStatus = 'no_schedule';
  if (totalConfiguredHours === 0) {
    scheduleStatus = 'no_schedule';
  } else if (reqHours === 0 || totalConfiguredHours === reqHours) {
    scheduleStatus = 'complete';
  } else if (totalConfiguredHours < reqHours) {
    scheduleStatus = 'incomplete';
  } else {
    scheduleStatus = 'excess';
  }

  const handleAddSlot = () => {
    // Sugerir día basado en la cantidad actual de slots
    const nextDay = Math.min(slots.length + 1, 5);
    setSlots((prev) => [
      ...prev,
      {
        dayOfWeek: nextDay,
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

  const handleSlotChange = (index: number, field: keyof ScheduleSlotFormData, value: any) => {
    setSlots((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const validateForm = (): string | null => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return 'El nombre de la materia es obligatorio.';
    }

    // Validar formato de slots si hay configurados
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (!s.startTime || !s.endTime) {
        return `Debe especificar hora de inicio y fin en el bloque #${i + 1}.`;
      }
      if (s.startTime >= s.endTime) {
        return `La hora de inicio (${s.startTime}) no puede ser mayor o igual a la hora de fin (${s.endTime}) en el bloque #${i + 1}.`;
      }
      if (!s.pedagogicalHours || s.pedagogicalHours < 1) {
        return `Los períodos pedagógicos deben ser al menos 1 en el bloque #${i + 1}.`;
      }
    }

    // Validar solapamientos internos entre slots del mismo día
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i];
        const b = slots[j];
        if (a.dayOfWeek === b.dayOfWeek) {
          const overlaps = a.startTime < b.endTime && a.endTime > b.startTime;
          if (overlaps) {
            const dayLabel = DAYS_OF_WEEK.find((d) => d.value === a.dayOfWeek)?.label || `Día ${a.dayOfWeek}`;
            return `Conflicto interno: Los bloques de ${a.startTime}-${a.endTime} y ${b.startTime}-${b.endTime} del ${dayLabel} se superponen.`;
          }
        }
      }
    }

    // Validar que la suma de períodos no exceda las horas permitidas
    if (reqHours > 0 && totalConfiguredHours > reqHours) {
      return `La suma de períodos pedagógicos configurados (${totalConfiguredHours} hrs) no puede exceder las horas semanales permitidas (${reqHours} hrs).`;
    }

    return null;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await onSave({
        name: name.trim(),
        code: code.trim() || undefined,
        hoursPerWeek: hoursPerWeek ? Number(hoursPerWeek) : undefined,
        academicYearId: academicYearId ? Number(academicYearId) : undefined,
        effectiveFrom: getLocalDateString(),
        scheduleSlots: slots.length > 0 ? slots.map((s) => ({
          dayOfWeek: Number(s.dayOfWeek),
          startTime: s.startTime.trim(),
          endTime: s.endTime.trim(),
          pedagogicalHours: Number(s.pedagogicalHours) || 2,
          room: s.room?.trim() || undefined,
        })) : [],
      });
      onClose();
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo guardar la materia.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="subject-form-title"
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <header className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-100 text-orange-700 rounded-2xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 id="subject-form-title" className="text-base font-extrabold text-slate-900">
                {initialData ? 'Editar materia' : 'Registrar materia'}
              </h2>
              <p className="text-xs text-slate-500">
                {courseName ? `Curso: ${courseName} · ` : ''}Configure los datos académicos y horarios semanales.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar formulario"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Scrollable Form Body */}
        <form id="subject-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {errorMessage && (
            <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Información General */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              1. Información de la Asignatura
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-7">
                <label htmlFor="subject-name" className="block font-bold text-slate-700 mb-1">
                  Nombre de la materia *
                </label>
                <input
                  id="subject-name"
                  type="text"
                  required
                  autoFocus
                  maxLength={100}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ej. Matemáticas, Lengua y Literatura"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="sm:col-span-5">
                <label htmlFor="subject-code" className="block font-bold text-slate-700 mb-1">
                  Código
                </label>
                <input
                  id="subject-code"
                  type="text"
                  maxLength={30}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Ej. MAT-101"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="subject-hours" className="block font-bold text-slate-700 mb-1">
                  Carga horaria requerida (períodos/semana)
                </label>
                <input
                  id="subject-hours"
                  type="number"
                  min="1"
                  max="40"
                  step="1"
                  value={hoursPerWeek}
                  onChange={(event) => setHoursPerWeek(event.target.value)}
                  placeholder="Ej. 4"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label htmlFor="subject-academic-year" className="block font-bold text-slate-700 mb-1">
                  Año Lectivo
                </label>
                <select
                  id="subject-academic-year"
                  value={academicYearId}
                  onChange={(e) => setAcademicYearId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  {academicYears.length === 0 ? (
                    <option value="">Año lectivo actual</option>
                  ) : (
                    academicYears.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name} ({year.status})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Días y Horarios de Clase */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-orange-600" />
                  2. Días y Horarios Semanales ({slots.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Configure los días y horas de clase para el control de asistencia.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddSlot}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar horario
              </button>
            </div>

            {/* Load indicator badge */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="text-[11px] text-slate-600">
                <span className="font-bold text-slate-900">{totalConfiguredHours}</span> de{' '}
                <span className="font-bold text-slate-900">{reqHours || '—'}</span> períodos pedagógicos programados
              </div>

              <div>
                {scheduleStatus === 'no_schedule' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                    Sin horario
                  </span>
                )}
                {scheduleStatus === 'incomplete' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Incompleto ({totalConfiguredHours}/{reqHours} hrs)
                  </span>
                )}
                {scheduleStatus === 'complete' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Completo ({totalConfiguredHours} hrs)
                  </span>
                )}
                {scheduleStatus === 'excess' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Exceso de horas (+{totalConfiguredHours - reqHours} hrs)
                  </span>
                )}
              </div>
            </div>

            {/* Slots list */}
            {slots.length === 0 ? (
              <div className="p-6 text-center bg-slate-50/60 border border-dashed border-slate-200 rounded-2xl text-slate-500 space-y-2">
                <CalendarDays className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="text-xs">
                  No se han configurado franjas horarias para esta materia.
                </div>
                <p className="text-[11px] text-slate-400">
                  Puedes guardarla sin horario ahora y configurarlo más tarde, o pulsar “Agregar horario” para definir los días de clase.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {slots.map((slot, index) => (
                  <div
                    key={index}
                    className="p-3 bg-white border border-slate-200 rounded-2xl grid grid-cols-1 sm:grid-cols-12 gap-2 items-center shadow-2xs"
                  >
                    {/* Day selector */}
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Día</label>
                      <select
                        value={slot.dayOfWeek}
                        onChange={(e) => handleSlotChange(index, 'dayOfWeek', Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      >
                        {DAYS_OF_WEEK.map((day) => (
                          <option key={day.value} value={day.value}>
                            {day.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Start time */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Inicio</label>
                      <input
                        type="time"
                        required
                        value={slot.startTime}
                        onChange={(e) => handleSlotChange(index, 'startTime', e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>

                    {/* End time */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Fin</label>
                      <input
                        type="time"
                        required
                        value={slot.endTime}
                        onChange={(e) => handleSlotChange(index, 'endTime', e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>

                    {/* Pedagogical hours */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Períodos</label>
                      <input
                        type="number"
                        min="1"
                        max="6"
                        value={slot.pedagogicalHours}
                        onChange={(e) => handleSlotChange(index, 'pedagogicalHours', Number(e.target.value))}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>

                    {/* Room */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Aula</label>
                      <input
                        type="text"
                        placeholder="Opcional"
                        value={slot.room || ''}
                        onChange={(e) => handleSlotChange(index, 'room', e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>

                    {/* Remove */}
                    <div className="sm:col-span-1 flex justify-end pt-2 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(index)}
                        aria-label="Eliminar horario"
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
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

        {/* Footer */}
        <footer className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold transition disabled:opacity-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="subject-form"
            disabled={isSubmitting || !name.trim()}
            className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Guardando...' : initialData ? 'Actualizar materia' : 'Guardar materia'}</span>
          </button>
        </footer>
      </section>
    </div>
  );
};