import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { DocumentMetadata, Project, DocumentType, DocumentStatus } from '../../types';

interface DocumentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (doc: Partial<DocumentMetadata>, file?: File | null, initialNotes?: string) => void;
  projects: Project[];
  defaultProjectId?: string;
  initialData?: DocumentMetadata | null;
}

export const DocumentFormModal: React.FC<DocumentFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  projects,
  defaultProjectId,
  initialData
}) => {
  const [formData, setFormData] = useState<Partial<DocumentMetadata>>({
    projectId: defaultProjectId || String(projects[0]?.id || ''),
    stageId: undefined,
    name: '',
    type: 'Plano',
    version: 'v1.0',
    date: new Date().toISOString().split('T')[0],
    status: 'Borrador',
    description: '',
  });

  const [initialFile, setInitialFile] = useState<File | null>(null);
  const [initialNotes, setInitialNotes] = useState('');

  const selectedProject = projects.find((p) => String(p.id) === String(formData.projectId));
  const stages = selectedProject?.stages || [];

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        stageId: initialData.stageId ? String(initialData.stageId) : undefined,
      });
      setInitialFile(null);
      setInitialNotes('');
    } else {
      setFormData({
        projectId: defaultProjectId || String(projects[0]?.id || ''),
        stageId: undefined,
        name: '',
        type: 'Plano',
        version: 'v1.0',
        date: new Date().toISOString().split('T')[0],
        status: 'Borrador',
        description: '',
      });
      setInitialFile(null);
      setInitialNotes('');
    }
  }, [initialData, defaultProjectId, projects, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.projectId) return;
    onSave(formData, initialFile, initialNotes);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar Metadatos de Documento' : 'Registrar Documento Técnico'}
      subtitle="Gestione planos, renders, memorias y documentación técnica de proyectos"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Proyecto Asociado *</label>
            <select
              required
              value={formData.projectId || ''}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value, stageId: undefined })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            >
              <option value="">Seleccione proyecto...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Etapa del Proyecto (Opcional)</label>
            <select
              value={formData.stageId || ''}
              onChange={(e) => setFormData({ ...formData, stageId: e.target.value ? e.target.value : undefined })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            >
              <option value="">Sin etapa asignada (General)</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.order}. {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Nombre del Archivo / Documento *</label>
          <input
            type="text"
            required
            placeholder="Ej: PL-ARQ-01_Planta_Baja.pdf"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500 font-mono"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tipo de Documento</label>
            <select
              value={formData.type || formData.documentType || 'Plano'}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as DocumentType, documentType: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            >
              <option value="Plano">Plano</option>
              <option value="Memoria">Memoria</option>
              <option value="Render">Render</option>
              <option value="Permiso">Permiso</option>
              <option value="Especificación">Especificación</option>
              <option value="Contrato">Contrato</option>
              <option value="Presupuesto">Presupuesto</option>
              <option value="Informe">Informe</option>
              <option value="Presentación">Presentación</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Estado</label>
            <select
              value={formData.status || 'Borrador'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as DocumentStatus })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            >
              <option value="Borrador">Borrador</option>
              <option value="En revisión">En revisión</option>
              <option value="Aprobado">Aprobado</option>
              <option value="Rechazado">Rechazado</option>
              <option value="Obsoleto">Obsoleto</option>
              <option value="Archivado">Archivado</option>
            </select>
          </div>
        </div>

        {/* Upload file on creation */}
        {!initialData && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Archivo Físico Inicial (Opcional - genera v1)
              </label>
              <input
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setInitialFile(file);
                  if (file && (!formData.name || formData.name === '')) {
                    setFormData((prev) => ({ ...prev, name: file.name }));
                  }
                }}
                className="w-full text-xs text-slate-700 file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-arch-600 file:text-white hover:file:bg-arch-700 cursor-pointer border border-slate-300 rounded-lg bg-white"
              />
            </div>

            {initialFile && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Notas de Versión v1 (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Versión inicial para revisión municipal..."
                  value={initialNotes}
                  onChange={(e) => setInitialNotes(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500 bg-white"
                />
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Descripción / Notas</label>
          <textarea
            rows={2}
            placeholder="Resumen del contenido del documento..."
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2 font-semibold text-white bg-arch-600 hover:bg-arch-700 rounded-lg shadow-xs transition-colors"
          >
            {initialData ? 'Guardar Cambios' : 'Registrar Documento'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
