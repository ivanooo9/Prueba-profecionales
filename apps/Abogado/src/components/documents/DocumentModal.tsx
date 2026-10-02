import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { LegalDocument, LegalCase, DocumentStatus } from '../../types';

export interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (docData: Omit<LegalDocument, 'id' | 'createdAt'> & { file?: File | null }) => void;
  cases: LegalCase[];
  defaultCaseId?: string;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  cases,
  defaultCaseId,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    caseId: '',
    caseNumber: '',
    name: '',
    type: 'Demanda' as LegalDocument['type'],
    fileExtension: 'pdf' as LegalDocument['fileExtension'],
    description: '',
    uploadDate: new Date().toISOString().split('T')[0],
    uploadedBy: 'Dr. Alejandro Benítez',
    status: 'Final' as DocumentStatus,
  });

  useEffect(() => {
    if (cases.length > 0) {
      const selected = defaultCaseId
        ? cases.find((c) => c.id === defaultCaseId) || cases[0]
        : cases[0];

      setFormData((prev) => ({
        ...prev,
        caseId: selected.id,
        caseNumber: selected.caseNumber,
        uploadedBy: selected.assignedLawyer,
      }));
    }
    setSelectedFile(null);
  }, [isOpen, defaultCaseId, cases]);

  const handleCaseChange = (caseId: string) => {
    const selected = cases.find((c) => c.id === caseId);
    if (selected) {
      setFormData({
        ...formData,
        caseId: selected.id,
        caseNumber: selected.caseNumber,
        uploadedBy: selected.assignedLawyer,
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      setFormData((prev) => ({
        ...prev,
        fileExtension: ext as any,
        name: prev.name || file.name.replace(/\.[^/.]+$/, ''),
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.caseId) return;

    const selectedCase = cases.find((c) => c.id === formData.caseId);

    onSave({
      ...formData,
      caseTitle: selectedCase ? selectedCase.title : '',
      clientId: selectedCase ? selectedCase.clientId : '',
      date: formData.uploadDate,
      file: selectedFile,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Documento Legal"
      subtitle="Expediente digital con almacenamiento seguro y versionado"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Expediente Vinculado *
          </label>
          <select
            required
            value={formData.caseId}
            onChange={(e) => handleCaseChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.caseNumber} - {c.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Nombre del Documento / Pieza Procesal *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ej. Escrito de Demanda Inicial con Fe de Recepción"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Archivo Digital Adjunto (PDF, DOCX, XLSX, JPG, PNG)
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt"
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          {selectedFile && (
            <p className="text-[11px] text-emerald-600 font-medium mt-1">
              ✓ Archivo seleccionado: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
            >
              <option value="Demanda">Demanda</option>
              <option value="Contestación">Contestación</option>
              <option value="Providencia">Providencia / Auto</option>
              <option value="Prueba">Prueba / Peritaje</option>
              <option value="Sentencia">Sentencia / Acto</option>
              <option value="Contrato">Contrato / Minuta</option>
              <option value="Poder">Poder Procuratoria</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Formato</label>
            <select
              value={formData.fileExtension}
              onChange={(e) => setFormData({ ...formData, fileExtension: e.target.value as any })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase font-bold"
            >
              <option value="pdf">PDF Document</option>
              <option value="docx">Word (.docx)</option>
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="jpg">Imagen (.jpg)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de Registro</label>
            <input
              type="date"
              value={formData.uploadDate}
              onChange={(e) => setFormData({ ...formData, uploadDate: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Estado</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as DocumentStatus })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
            >
              <option value="Borrador">Borrador</option>
              <option value="En revisión">En revisión</option>
              <option value="Aprobado">Aprobado</option>
              <option value="Final">Final / Presentado</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Descripción / Fojas / Foja Electrónica</label>
          <textarea
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Resumen del documento, fojas 1 a 45..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm"
          >
            Registrar Metadatos
          </button>
        </div>
      </form>
    </Modal>
  );
};
