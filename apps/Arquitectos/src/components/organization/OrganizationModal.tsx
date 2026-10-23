import React, { useState } from 'react';
import { Compass, X, Loader2, AlertCircle, Building2, User, Briefcase, Landmark } from 'lucide-react';
import { architectureApi } from '../../services/api/architectureApi';
import type { ArchitectureOrganization } from '../../types';

export interface OrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (org: ArchitectureOrganization) => void;
}

const ORGANIZATION_TYPES = [
  {
    value: 'OFFICE',
    label: 'Estudio / Taller de Arquitectura',
    description: 'Ideal para firmas arquitectónicas, despachos de diseño y talleres colaborativos.',
    icon: Compass,
  },
  {
    value: 'INDIVIDUAL',
    label: 'Profesional Independiente',
    description: 'Para arquitectos autónomos o consultores de obra independientes.',
    icon: User,
  },
  {
    value: 'BUSINESS',
    label: 'Constructora / Empresa de Diseño',
    description: 'Para empresas de construcción, contratistas y firmas multidisciplinarias.',
    icon: Briefcase,
  },
  {
    value: 'INSTITUTION',
    label: 'Institución / Sector Público',
    description: 'Para departamentos de planificación urbana, universidades u organismos públicos.',
    icon: Landmark,
  },
];

export const OrganizationModal: React.FC<OrganizationModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('OFFICE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Por favor ingresa el nombre de tu estudio u organización.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const createdOrg = await architectureApi.createOrganization({
        name: name.trim(),
        type,
      });

      setName('');
      setType('OFFICE');
      onCreated?.(createdOrg);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al crear el estudio arquitectónico.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Nuevo Estudio Arquitectónico</h2>
              <p className="text-xs text-slate-400">Crea un espacio de trabajo para tus proyectos y obras</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nombre del Estudio / Despacho <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Estudio Peralta Arquitectos / Taller Urbano"
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:bg-slate-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition outline-none"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Tipo de Organización
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ORGANIZATION_TYPES.map((orgType) => {
                const Icon = orgType.icon;
                const isSelected = type === orgType.value;
                return (
                  <button
                    key={orgType.value}
                    type="button"
                    onClick={() => setType(orgType.value)}
                    className={`flex flex-col text-left p-3 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'border-amber-400 bg-amber-400/10 text-white'
                        : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:border-slate-700 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                      <span className="text-xs font-semibold">{orgType.label}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                      {orgType.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-400/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creando estudio...</span>
                </>
              ) : (
                <>
                  <Compass className="w-4 h-4" />
                  <span>Crear Estudio</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
