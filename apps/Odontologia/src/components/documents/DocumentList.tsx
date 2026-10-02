import React, { useState, useEffect } from 'react';
import { DocumentItem, DocumentType } from '../../types';
import { dentalService } from '../../services/dentalService';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import { FileText, Plus, FileCode, Image, FileCheck, Download, Trash2 } from 'lucide-react';

interface DocumentListProps {
  patientIdFilter?: string;
}

export const DocumentList: React.FC<DocumentListProps> = ({ patientIdFilter }) => {
  const [documents, setDocuments] = useState<DocumentItem[]>(
    patientIdFilter ? dentalService.getDocumentsByPatient(patientIdFilter) : dentalService.getDocuments()
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<DocumentType>('Radiografía');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dentalService.loadRealDocuments(patientIdFilter).catch(console.error);
    const refresh = () => {
      setDocuments(
        patientIdFilter ? dentalService.getDocumentsByPatient(patientIdFilter) : dentalService.getDocuments()
      );
    };
    refresh();
    return dentalService.subscribe(refresh);
  }, [patientIdFilter]);

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await dentalService.createRealDocument(patientIdFilter || 'PAT-001', {
        title: title.trim(),
        type,
        date: new Date().toISOString().split('T')[0],
        description: description.trim() || null,
        fileName: `${title.trim().replace(/\s+/g, '_')}.pdf`,
        fileSize: '1.8 MB',
      });

      setTitle('');
      setDescription('');
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Error al guardar el documento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDocument = async (docId: string | number) => {
    if (!window.confirm('¿Está seguro de eliminar esta ficha documental?')) return;
    try {
      await dentalService.deleteRealDocument(docId, patientIdFilter);
    } catch (err: any) {
      alert(err.message || 'Error al eliminar el documento.');
    }
  };

  const getIconForType = (t: DocumentType) => {
    switch (t) {
      case 'Radiografía':
      case 'RADIOGRAPHY':
        return <FileCode className="w-5 h-5 text-cyan-600" />;
      case 'Fotografía':
      case 'PHOTOGRAPHY':
        return <Image className="w-5 h-5 text-amber-500" />;
      case 'Consentimiento':
      case 'CONSENT':
        return <FileCheck className="w-5 h-5 text-emerald-600" />;
      default:
        return <FileText className="w-5 h-5 text-slate-500" />;
    }
  };

  const formatDisplayType = (t: DocumentType) => {
    switch (t) {
      case 'RADIOGRAPHY': return 'Radiografía';
      case 'PHOTOGRAPHY': return 'Fotografía';
      case 'CONSENT': return 'Consentimiento';
      case 'REPORT': return 'Informe';
      case 'BUDGET_ATTACHMENT': return 'Presupuesto';
      case 'OTHER': return 'Otro';
      default: return t;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-base font-bold text-slate-900">Archivos del paciente</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Radiografías, fotografías, consentimientos e informes en un solo lugar.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Adjuntar archivo</span>
        </button>
      </div>

      {documents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map(doc => (
            <div key={doc.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  {getIconForType(doc.type)}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900">{doc.title}</h4>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {formatDisplayType(doc.type)} · {doc.date} · {doc.fileSize ? (typeof doc.fileSize === 'number' ? `${(doc.fileSize / (1024 * 1024)).toFixed(1)} MB` : doc.fileSize) : '1.5 MB'}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{doc.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button 
                  onClick={() => alert(`Simulando descarga de ${doc.fileName || doc.title}`)}
                  className="p-2 text-slate-400 hover:text-cyan-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Descargar archivo"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteDocument(doc.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Eliminar documento"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FileText className="w-8 h-8" />}
          title="Sin documentos adjuntos"
          description="Aún no se han registrado radiografías ni archivos para este expediente."
          actionLabel="Adjuntar archivo"
          onAction={() => setIsModalOpen(true)}
        />
      )}

      {/* Modal Adjuntar */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Ficha de Documento"
        subtitle="Agregue el título y tipo de estudio radiográfico o consentimiento."
        maxWidth="md"
      >
        <form onSubmit={handleAddDocument} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Título del Documento *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Radiografía Periapical Pieza 16"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Documento</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DocumentType)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
            >
              <option value="Radiografía">Radiografía Periapical / Panorámica</option>
              <option value="Fotografía">Fotografía Intraoral / Clínica</option>
              <option value="Consentimiento">Consentimiento Informado Firmado</option>
              <option value="Informe">Informe Clínico</option>
              <option value="Presupuesto">Presupuesto Adjunto</option>
              <option value="Otro">Otro Archivo</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción u Observaciones</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles del estudio radiológico..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-medium text-xs rounded-xl disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs rounded-xl shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Ficha'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
