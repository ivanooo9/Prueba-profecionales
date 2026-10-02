import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { DocumentMetadata, DocumentVersion } from '../../types';
import { architectureApi } from '../../services/api/architectureApi';
import {
  FileText,
  Upload,
  Download,
  Clock,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface DocumentVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentMetadata | null;
  organizationId: number;
  onVersionUploaded?: () => void;
}

export const DocumentVersionModal: React.FC<DocumentVersionModalProps> = ({
  isOpen,
  onClose,
  document,
  organizationId,
  onVersionUploaded,
}) => {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadVersions = async () => {
    if (!document) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await architectureApi.getDocumentVersions(
        organizationId,
        document.id
      );
      setVersions(data);
    } catch (err: any) {
      console.error('Error al cargar versiones:', err);
      setError(err.message || 'Error al cargar el historial de versiones.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && document) {
      setSelectedFile(null);
      setNotes('');
      setError(null);
      setSuccessMsg(null);
      loadVersions();
    }
  }, [isOpen, document]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document || !selectedFile) {
      setError('Seleccione un archivo para la nueva versión.');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      setSuccessMsg(null);

      await architectureApi.addDocumentVersion(
        organizationId,
        document.id,
        selectedFile,
        notes,
        document.projectId
      );

      setSuccessMsg('Nueva versión subida exitosamente con integridad verificada.');
      setSelectedFile(null);
      setNotes('');
      await loadVersions();
      if (onVersionUploaded) {
        onVersionUploaded();
      }
    } catch (err: any) {
      console.error('Error al subir versión:', err);
      setError(err.message || 'Error al subir la nueva versión.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = (versionId?: number) => {
    if (!document) return;
    const url = architectureApi.getDownloadUrl(organizationId, document.id, versionId);
    window.open(url, '_blank');
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (!document) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Historial de Versiones: ${document.name}`}
      subtitle={`Proyecto: ${document.projectName} | Tipo: ${document.type || document.documentType || 'Plano'}`}
      maxWidth="lg"
    >
      <div className="space-y-6 text-xs">
        {/* Alerts */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Upload New Version Section */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <Upload className="w-4 h-4 text-arch-600" />
            Subir Nueva Versión Inmutable
          </h4>
          <form onSubmit={handleUpload} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Archivo (PDF, CAD/BIM, Imagen, Office - máx 50MB) *
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-arch-600 file:text-white hover:file:bg-arch-700 cursor-pointer border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Notas de Control de Cambios / Revisión
                </label>
                <input
                  type="text"
                  placeholder="Ej: Corrección de cotas en fachada norte..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500 bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isUploading || !selectedFile}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-arch-600 hover:bg-arch-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                {isUploading ? 'Subiendo y verificando SHA-256...' : 'Subir Versión'}
              </button>
            </div>
          </form>
        </div>

        {/* Version List */}
        <div>
          <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            Historial de Versiones Anteriores ({versions.length})
          </h4>

          {isLoading ? (
            <div className="py-8 text-center text-slate-400">Cargando versiones...</div>
          ) : versions.length === 0 ? (
            <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-lg border border-slate-100">
              No hay versiones registradas aún para este documento.
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {versions.map((ver, idx) => (
                <div
                  key={ver.id}
                  className={`p-3 rounded-lg border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    idx === 0
                      ? 'bg-arch-50/40 border-arch-200'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold px-2 py-0.5 bg-slate-200 text-slate-800 rounded text-[11px]">
                        v{ver.versionNumber}
                      </span>
                      {idx === 0 && (
                        <span className="px-1.5 py-0.5 bg-arch-600 text-white rounded text-[10px] font-semibold">
                          Vigente
                        </span>
                      )}
                      <span className="font-mono font-semibold text-slate-900">
                        {ver.originalFilename}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-slate-500 text-[11px]">
                      <span>{formatFileSize(ver.fileSize)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {ver.createdAt ? new Date(ver.createdAt).toLocaleString('es-EC') : ''}
                      </span>
                      {ver.uploadedByName && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            {ver.uploadedByName}
                          </span>
                        </>
                      )}
                      <span className="flex items-center gap-1 text-slate-400 font-mono text-[10px]">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        SHA-256: {ver.checksumSha256 ? ver.checksumSha256.substring(0, 10) : ''}...
                      </span>
                    </div>

                    {ver.notes && (
                      <p className="text-slate-600 italic text-[11px] mt-0.5">
                        « {ver.notes} »
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleDownload(ver.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-arch-700 bg-arch-100 hover:bg-arch-200 rounded-lg transition-colors shrink-0 self-end sm:self-auto"
                    title="Descargar archivo físico protegido"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};
