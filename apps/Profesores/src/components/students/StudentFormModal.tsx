import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save } from 'lucide-react';
import { Student } from '../../types/teacher';

export interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (student: Partial<Student>) => Promise<void> | void;
  initialData?: Student | null;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    identification: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    setErrorMessage(null);
    setIsSubmitting(false);
    if (initialData) {
      setFormData({
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        identification: initialData.identification || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        identification: '',
        email: '',
        phone: '',
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    const identification = formData.identification.trim();
    if (!firstName || !lastName || !identification || isSubmitting) {
      setErrorMessage('Nombres, apellidos e identificación son obligatorios.');
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await onSave({
        firstName,
        lastName,
        identification,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        attendancePercentage: initialData?.attendancePercentage ?? 100,
        averageGrade: initialData?.averageGrade ?? 10.0,
      });
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al guardar el estudiante. Por favor intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div role="dialog" aria-modal="true" aria-labelledby="student-form-title" className="bg-white rounded-3xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 id="student-form-title" className="text-base font-bold text-slate-900">
                {initialData ? 'Editar Ficha de Estudiante' : 'Registrar Nuevo Estudiante'}
              </h2>
              <p className="text-xs text-slate-500">
                Complete los datos personales del alumno. La matrícula se gestiona por separado.
              </p>
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
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs" aria-busy={isSubmitting}>
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <span className="font-bold">Error:</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="student-first-name" className="block font-bold text-slate-700 mb-1">Nombres *</label>
              <input
                id="student-first-name"
                type="text"
                required
                maxLength={80}
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="Ej. Mateo Javier"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="student-last-name" className="block font-bold text-slate-700 mb-1">Apellidos *</label>
              <input
                id="student-last-name"
                type="text"
                required
                maxLength={80}
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Ej. Andrade Salazar"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="student-identification" className="block font-bold text-slate-700 mb-1">Identificación / Cédula *</label>
              <input
                id="student-identification"
                type="text"
                required
                maxLength={20}
                value={formData.identification}
                onChange={(e) => setFormData({ ...formData, identification: e.target.value })}
                placeholder="Ej. 1726483920"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="student-email" className="block font-bold text-slate-700 mb-1">Correo Electrónico</label>
              <input
                id="student-email"
                type="email"
                maxLength={254}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="estudiante@correo.edu.ec"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="student-phone" className="block font-bold text-slate-700 mb-1">Teléfono de Contacto</label>
              <input
                id="student-phone"
                type="text"
                maxLength={20}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Ej. 0991234567"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
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
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar Estudiante'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
