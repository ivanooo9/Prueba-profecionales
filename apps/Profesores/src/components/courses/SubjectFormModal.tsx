import React, { useEffect, useState } from 'react';
import { BookOpen, Save, X } from 'lucide-react';

export interface SubjectFormData {
  name: string;
  code?: string;
  hoursPerWeek?: number;
}

interface SubjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subject: SubjectFormData) => Promise<void>;
}

export const SubjectFormModal: React.FC<SubjectFormModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setCode('');
      setHoursPerWeek('');
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || isSubmitting) return;

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await onSave({
        name: trimmedName,
        code: code.trim() || undefined,
        hoursPerWeek: hoursPerWeek ? Number(hoursPerWeek) : undefined,
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
        className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden"
      >
        <header className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 text-orange-700 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 id="subject-form-title" className="text-base font-bold text-slate-900">Registrar materia</h2>
              <p className="text-xs text-slate-500">Añade una asignatura a este curso.</p>
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
            <label htmlFor="subject-name" className="block font-bold text-slate-700 mb-1">Nombre de la materia *</label>
            <input
              id="subject-name"
              type="text"
              required
              autoFocus
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. Matemáticas"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="subject-code" className="block font-bold text-slate-700 mb-1">Código</label>
              <input
                id="subject-code"
                type="text"
                maxLength={30}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Ej. MAT-101"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            <div>
              <label htmlFor="subject-hours" className="block font-bold text-slate-700 mb-1">Horas por semana</label>
              <input
                id="subject-hours"
                type="number"
                min="1"
                max="40"
                step="1"
                value={hoursPerWeek}
                onChange={(event) => setHoursPerWeek(event.target.value)}
                placeholder="Ej. 5"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
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
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar materia'}</span>
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
};