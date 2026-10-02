import React, { useEffect, useState } from 'react';
import { BookOpen, Save, X } from 'lucide-react';

export interface CourseFormData {
  name: string;
  level: string;
  classroom?: string;
}

interface CourseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (course: CourseFormData) => Promise<void>;
}

export const CourseFormModal: React.FC<CourseFormModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [classroom, setClassroom] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setLevel('');
      setClassroom('');
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedLevel = level.trim();
    if (!trimmedName || !trimmedLevel || isSubmitting) return;

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await onSave({
        name: trimmedName,
        level: trimmedLevel,
        classroom: classroom.trim() || undefined,
      });
      onClose();
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo guardar el curso.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-form-title"
        className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden"
      >
        <header className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 text-orange-700 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 id="course-form-title" className="text-base font-bold text-slate-900">Registrar curso</h2>
              <p className="text-xs text-slate-500">Ingresa los datos del curso o paralelo.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar formulario"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMessage && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl">
              {errorMessage}
            </div>
          )}

          <div>
            <label htmlFor="course-name" className="block font-bold text-slate-700 mb-1">Nombre del curso o paralelo *</label>
            <input
              id="course-name"
              type="text"
              required
              autoFocus
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. 1ro A"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div>
            <label htmlFor="course-level" className="block font-bold text-slate-700 mb-1">Nivel educativo *</label>
            <input
              id="course-level"
              type="text"
              required
              maxLength={100}
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              placeholder="Ej. Educación General Básica"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div>
            <label htmlFor="course-classroom" className="block font-bold text-slate-700 mb-1">Aula o espacio</label>
            <input
              id="course-classroom"
              type="text"
              maxLength={100}
              value={classroom}
              onChange={(event) => setClassroom(event.target.value)}
              placeholder="Ej. Aula 204"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <footer className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || !level.trim()}
              className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar curso'}</span>
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
};