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
  const [patients, setPatients] = useState(dentalService.getPatients());
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patientIdFilter || '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<DocumentType>('Radiografía');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | number | null>(null);

  useEffect(() => {
    dentalService.loadRealDocuments(patientIdFilter).catch(console.error);

    const currentPatients = dentalService.getPatients();
    setPatients(currentPatients);
    if (!patientIdFilter && currentPatients.length === 0 && dentalService.getOrganizationId()) {
      dentalService.loadPatients().then(pts => {
        setPatients(pts);
        if (pts.length > 0 && !selectedPatientId) {
          setSelectedPatientId(pts[0].id);
        }
      }).catch(console.error);
    } else if (!patientIdFilter && currentPatients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(currentPatients[0].id);
    }

    const refresh = () => {
      setDocuments(
        patientIdFilter ? dentalService.getDocumentsByPatient(patientIdFilter) : dentalService.getDocuments()
      );
      setPatients(dentalService.getPatients());
    };
    refresh();
    return dentalService.subscribe(refresh);
  }, [patientIdFilter]);

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    const targetPatientId = patientIdFilter || selectedPatientId;
    if (!targetPatientId) {
      alert('Debe seleccionar un paciente para asociar el documento.');
      return;
    }

    if (selectedFile && selectedFile.size > 25 * 1024 * 1024) {
      alert('El archivo seleccionado excede el tamaño máximo permitido de 25 MB.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', title.trim());
        formData.append('type', type);
        formData.append('date', new Date().toISOString().split('T')[0]);
        formData.append('fileName', selectedFile.name);
        formData.append('fileSize', String(selectedFile.size));
        formData.append('mimeType', selectedFile.type || 'application/octet-stream');
        if (description.trim()) {
          formData.append('description', description.trim());
        }
        await dentalService.createRealDocument(targetPatientId, formData, {
          file: selectedFile,
          title: title.trim(),
          type,
          fileName: selectedFile.name,
          fileSize: `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`,
          mimeType: selectedFile.type || 'application/octet-stream',
          description: description.trim() || undefined,
          date: new Date().toISOString().split('T')[0],
        });
      } else {
        await dentalService.createRealDocument(targetPatientId, {
          title: title.trim(),
          type,
          date: new Date().toISOString().split('T')[0],
          description: description.trim() || null,
          fileName: `${title.trim().replace(/\s+/g, '_')}.pdf`,
          fileSize: 1024,
          mimeType: 'application/pdf',
        });
      }

      setTitle('');
      setDescription('');
      setSelectedFile(null);
      setIsModalOpen(false);

      // Refrescar documentos inmediatamente
      await dentalService.loadRealDocuments(patientIdFilter);
      setDocuments(
        patientIdFilter ? dentalService.getDocumentsByPatient(patientIdFilter) : dentalService.getDocuments()
      );
    } catch (err: any) {
      alert(err.message || 'Error al guardar el documento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadDocument = async (doc: DocumentItem) => {
    try {
      setIsDownloading(doc.id);
      const blob = await dentalService.downloadRealDocument(doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Respetar estrictamente el nombre y la extensión con la que se subió (jpg, png, pdf, etc.)
      let downloadFileName = doc.fileName;
      if (!downloadFileName) {
        let ext = '.pdf';
        if (blob.type.includes('png')) ext = '.png';
        else if (blob.type.includes('jpeg') || blob.type.includes('jpg')) ext = '.jpg';
        else if (blob.type.includes('webp')) ext = '.webp';
        else if (blob.type.includes('text')) ext = '.txt';
        downloadFileName = `${doc.title.replace(/\s+/g, '_')}${ext}`;
      }

      a.download = downloadFileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Error al descargar el archivo físico.');
    } finally {
      setIsDownloading(null);
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
                  {!patientIdFilter && (doc.patientName || (doc as any).patient?.name) && (
                    <div className="mt-1">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-cyan-50 text-cyan-700 font-semibold border border-cyan-100">
                        Paciente: {doc.patientName || (doc as any).patient?.name}
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-slate-600 mt-1">{doc.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button 
                  onClick={() => handleDownloadDocument(doc)}
                  disabled={isDownloading === doc.id}
                  className="p-2 text-slate-400 hover:text-cyan-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                  title="Descargar archivo físico"
                >
                  <Download className={`w-4 h-4 ${isDownloading === doc.id ? 'animate-bounce text-cyan-600' : ''}`} />
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
        subtitle="Suba el archivo digital o radiografía y agregue detalles clínicos."
        maxWidth="md"
      >
        <form onSubmit={handleAddDocument} className="space-y-3">
          {!patientIdFilter && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Paciente Asociado *</label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                required
              >
                <option value="">-- Seleccionar Paciente --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.names} {p.surnames} ({p.identification ? `CI: ${p.identification}` : 'Sin CI'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Archivo Digital (PDF, Imagen, Radiografía)</label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.tiff,.tif,.dcm,.docx,.doc,.xlsx,.xls,.txt"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const maxBytes = 25 * 1024 * 1024;
                  if (f.size > maxBytes) {
                    alert(`El archivo seleccionado (${(f.size / (1024 * 1024)).toFixed(1)} MB) excede el tamaño máximo permitido de 25 MB.`);
                    e.target.value = '';
                    setSelectedFile(null);
                    return;
                  }
                  setSelectedFile(f);
                  if (!title.trim()) {
                    setTitle(f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
                  }
                }
              }}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100 cursor-pointer border border-slate-200 rounded-lg p-1"
            />
            {selectedFile && (
              <span className="text-[10px] text-cyan-600 font-mono mt-1 block">
                Seleccionado: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
              </span>
            )}
          </div>

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
