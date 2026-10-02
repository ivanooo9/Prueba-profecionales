import React, { useState } from 'react';
import { FileText, Download, Upload, ExternalLink, Loader2, AlertCircle, X, Plus } from 'lucide-react';
import type { ClinicalDocument } from '../../types/clinical.types';
import { clinicalStore } from '../../services/clinical/clinicalStore';
import { DataTable } from '../ui/DataTable';

export interface ClinicalDocumentManagerProps {
  documents: ClinicalDocument[];
  patientId: string;
}

export const ClinicalDocumentManager: React.FC<ClinicalDocumentManagerProps> = ({ documents, patientId }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ClinicalDocument['type']>('CERTIFICATE');
  const [author, setAuthor] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setError('El archivo excede el tamaño máximo permitido de 15MB.');
      return;
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Solo se admiten documentos en formato PDF.');
      return;
    }

    setError(null);
    setFileName(file.name);
    setFileSize(file.size);
    if (!title.trim()) {
      setTitle(file.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' '));
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('El título del documento es obligatorio.');
      return;
    }
    if (!fileBase64 || !fileName) {
      setError('Debe seleccionar un archivo PDF para adjuntar.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await clinicalStore.addDocument({
        patientId,
        title: title.trim(),
        type,
        author: author.trim() || undefined,
        date,
        fileName,
        file: fileBase64,
        fileSize: fileSize || undefined,
        mimeType: 'application/pdf',
      });

      // Limpiar formulario
      setTitle('');
      setType('CERTIFICATE');
      setAuthor('');
      setDate(new Date().toISOString().split('T')[0]);
      setFileBase64(null);
      setFileName(null);
      setFileSize(null);
      setIsUploading(false);
    } catch (err: any) {
      console.error('Error al subir documento:', err);
      setError(err?.message || 'Error al guardar el documento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Barra superior de encabezado y acción */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-600" />
            <span>Documentos, Certificados y Anexos Clínicos</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Archivos PDF, certificados de reposo MSP, informes externos, consentimientos y placas
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setIsUploading(true);
          }}
          className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Adjuntar Documento PDF</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Modal / Formulario de Carga de PDF */}
      {isUploading && (
        <form onSubmit={handleUploadSubmit} className="bg-slate-50 border border-sky-200 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-600" />
              <span>Adjuntar Nuevo Documento PDF al Expediente</span>
            </h4>
            <button
              type="button"
              onClick={() => setIsUploading(false)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Título del Documento *</label>
              <input
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:border-sky-500"
                placeholder="Ej. Certificado Médico MSP, Consentimiento Informado..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Tipo de Documento</label>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:border-sky-500"
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                disabled={isSubmitting}
              >
                <option value="CERTIFICATE">Certificado Médico / Reposo</option>
                <option value="LAB_REPORT">Informe de Laboratorio</option>
                <option value="IMAGING_REPORT">Informe de Imagenología</option>
                <option value="REFERRAL">Referencia / Derivación</option>
                <option value="INTERCONSULTATION">Interconsulta de Especialidad</option>
                <option value="CONSENT">Consentimiento Informado</option>
                <option value="OTHER">Otro Documento</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Emisor / Autor</label>
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:border-sky-500"
                placeholder="Ej. Dr. Roberto Silva, Hospital Eugenio Espejo..."
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Fecha del Documento</label>
              <input
                type="date"
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:border-sky-500"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Selector de Archivo PDF */}
          <div className="border border-dashed border-sky-300 rounded-xl p-4 bg-white text-xs space-y-2">
            <label className="flex flex-col items-center justify-center gap-1 cursor-pointer font-bold text-slate-700 py-3">
              <Upload className="w-6 h-6 text-sky-600 mb-1" />
              <span>Haga clic para seleccionar el archivo PDF</span>
              <span className="text-[10px] text-slate-400 font-normal">Máximo 15MB · Formato .pdf</span>
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleFileChange}
                disabled={isSubmitting}
              />
            </label>

            {fileName && (
              <div className="flex items-center justify-between text-xs text-sky-800 bg-sky-50 border border-sky-200 p-2.5 rounded-lg font-mono">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-600 shrink-0" />
                  <div>
                    <span className="font-bold">{fileName}</span>
                    {fileSize && <span className="text-slate-500 text-[10px] ml-2">({formatFileSize(fileSize)})</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFileBase64(null);
                    setFileName(null);
                    setFileSize(null);
                  }}
                  className="text-rose-600 font-bold hover:underline"
                  disabled={isSubmitting}
                >
                  Cambiar
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsUploading(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !fileBase64}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Subir y Guardar Documento</span>
            </button>
          </div>
        </form>
      )}

      {/* Lista de Documentos */}
      {documents.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 space-y-3">
          <FileText className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold">No hay documentos PDF registrados para este paciente.</p>
          {!isUploading && (
            <button
              type="button"
              onClick={() => setIsUploading(true)}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Adjuntar primer PDF</span>
            </button>
          )}
        </div>
      ) : (
        <DataTable<ClinicalDocument>
          columns={[
            {
              header: 'Documento',
              cell: (r) => (
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-lg bg-sky-50 text-sky-600 border border-sky-100 shrink-0 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-xs">{r.title}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {r.fileName || 'documento.pdf'}
                      {r.fileSize ? ` · ${formatFileSize(r.fileSize)}` : ''}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              header: 'Categoría',
              cell: (r) => (
                <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 font-mono text-[10px] font-bold">
                  {r.type}
                </span>
              ),
            },
            {
              header: 'Fecha & Emisor',
              cell: (r) => (
                <div className="text-xs text-slate-700 font-mono">
                  <div>{r.date}</div>
                  <div className="text-[10px] text-slate-500">{r.author || 'ECE Ecuador'}</div>
                </div>
              ),
            },
            {
              header: 'Acción',
              cell: (r) => (
                <div className="flex items-center gap-1.5">
                  {r.fileUrl ? (
                    <>
                      <a
                        href={r.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold flex items-center gap-1 border border-sky-200 transition"
                      >
                        <ExternalLink className="w-3 h-3 text-sky-600" /> Ver PDF
                      </a>
                      <a
                        href={r.fileUrl}
                        download={r.fileName || 'documento.pdf'}
                        className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        title="Descargar archivo"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400">Sin archivo adjunto</span>
                  )}
                </div>
              ),
            },
          ]}
          data={documents}
        />
      )}
    </div>
  );
};
