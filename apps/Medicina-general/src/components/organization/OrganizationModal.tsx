import React, { useState } from 'react';
import { Building2, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { clinicalStore } from '../../services/clinical/clinicalStore';
import type { Organization } from '../../services/api/organizationApi';

export interface OrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (org: Organization) => void;
}

export const OrganizationModal: React.FC<OrganizationModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('CLINIC');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Por favor ingrese el nombre de la organización.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const createdOrg = await clinicalStore.createOrganization(name.trim(), type);
      setName('');
      setType('CLINIC');
      onCreated?.(createdOrg);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al crear la organización médica.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-100 text-sky-700 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Nueva Organización Médica</h2>
              <p className="text-[11px] text-slate-500">Registre un centro, clínica o consultorio privado</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nombre de la Organización / Clínica <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Clínica San José / Consultorio Médico"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition outline-none"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tipo de Entidad
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition outline-none"
              disabled={isSubmitting}
            >
              <option value="CLINIC">Clínica</option>
              <option value="OFFICE">Consultorio Privado</option>
              <option value="INDIVIDUAL">Práctica Individual</option>
              <option value="HOSPITAL">Hospital</option>
              <option value="OTHER">Otro</option>
            </select>
          </div>

          <div className="rounded-xl bg-sky-50/60 border border-sky-100 p-3 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-sky-800 leading-relaxed">
              El módulo clínico <strong>Medicina General (MEDICINE)</strong> será activado de manera automática al crear la organización.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs transition disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Crear Organización</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
