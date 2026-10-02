import React, { useState } from 'react';
import {
  Film,
  Plus,
  ExternalLink,
  Loader2,
  AlertCircle,
  X,
  Upload,
  Eye,
} from 'lucide-react';
import type { ImagingStudy } from '../../types/clinical.types';
import { clinicalStore } from '../../services/clinical/clinicalStore';

export interface ImagingStudyViewerProps {
  imagingStudies: ImagingStudy[];
  patientId: string;
}

export const ImagingStudyViewer: React.FC<ImagingStudyViewerProps> = ({ imagingStudies, patientId }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [studyType, setStudyType] = useState('Radiografía convencional');
  const [bodyPart, setBodyPart] = useState('');
  const [performedAt, setPerformedAt] = useState(() => new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'COMPLETED' | 'ORDERED' | 'REPORTED'>('COMPLETED');
  const [report, setReport] = useState('');
  const [conclusion, setConclusion] = useState('');

  // Archivo adjunto
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo excede el tamaño máximo permitido de 10MB.');
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Formato no permitido. Solo se aceptan archivos PDF o imágenes (JPG, PNG).');
      return;
    }

    setError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateStudy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studyType.trim()) {
      setError('El tipo de estudio es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await clinicalStore.addImagingStudy({
        patientId,
        studyType: studyType.trim(),
        bodyPart: bodyPart.trim() || undefined,
        performedAt,
        status,
        report: report.trim() || undefined,
        conclusion: conclusion.trim() || undefined,
        file: fileBase64,
        fileName: fileName || undefined,
      });

      // Limpiar formulario
      setStudyType('Radiografía convencional');
      setBodyPart('');
      setPerformedAt(new Date().toISOString().split('T')[0]);
      setStatus('COMPLETED');
      setReport('');
      setConclusion('');
      setFileBase64(null);
      setFileName(null);
      setIsCreating(false);
    } catch (err: any) {
      console.error('Error al guardar estudio de imagenología:', err);
      setError(err?.message || 'Error al registrar el estudio de imagenología.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra superior con contador y botón */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Film className="w-4 h-4 text-purple-600" />
            <span>Estudios de Imagenología Médica</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Radiografías, ecografías, tomografías e informes diagnósticos
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setIsCreating(!isCreating);
          }}
          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Estudio</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Formulario de Registro */}
      {isCreating && (
        <form onSubmit={handleCreateStudy} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Nuevo Estudio de Imagenología
            </h4>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Tipo de Estudio *</label>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:border-purple-500"
                value={studyType}
                onChange={(e) => setStudyType(e.target.value)}
              >
                <option value="Radiografía convencional">Radiografía convencional</option>
                <option value="Ecografía / Ultrasonido">Ecografía / Ultrasonido</option>
                <option value="Tomografía Computarizada (TAC)">Tomografía Computarizada (TAC)</option>
                <option value="Resonancia Magnética (RMN)">Resonancia Magnética (RMN)</option>
                <option value="Mamografía">Mamografía</option>
                <option value="Densitometría Ósea">Densitometría Ósea</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Región / Área Anatómica</label>
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:border-purple-500"
                placeholder="Ej. Tórax PA, Abdomen, Columna Lumbar"
                value={bodyPart}
                onChange={(e) => setBodyPart(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Fecha de Realización</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:border-purple-500"
                value={performedAt}
                onChange={(e) => setPerformedAt(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Estado</label>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:border-purple-500"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="COMPLETED">Completado</option>
                <option value="REPORTED">Informado</option>
                <option value="ORDERED">Ordenado / Solicitado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Informe / Hallazgos Radiológicos</label>
            <textarea
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500 min-h-16"
              placeholder="Descripción de estructuras, signos visualizados, densidades..."
              value={report}
              onChange={(e) => setReport(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Conclusión Diagnóstica</label>
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
              placeholder="Ej. Estudio radiográfico de tórax sin alteraciones pleuropulmonares agudas"
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
            />
          </div>

          {/* Adjuntar Archivo */}
          <div className="border border-dashed border-slate-300 rounded-xl p-3 bg-white text-xs space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
              <Upload className="w-4 h-4 text-purple-600" />
              <span>Adjuntar Imagen o Informe PDF (JPG, PNG, PDF, máx 10MB)</span>
              <input type="file" accept=".pdf,image/png,image/jpeg,image/jpg" className="hidden" onChange={handleFileChange} />
            </label>
            {fileName && (
              <div className="flex items-center justify-between text-xs text-purple-700 bg-purple-50 p-2 rounded-lg font-mono">
                <span>{fileName}</span>
                <button type="button" onClick={() => { setFileBase64(null); setFileName(null); }} className="text-rose-600 font-bold">
                  Eliminar
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Guardar Estudio</span>
            </button>
          </div>
        </form>
      )}

      {/* Estado Vacío */}
      {imagingStudies.length === 0 && !isCreating && (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 space-y-3">
          <Film className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold">No existen estudios de imagenología registrados en el historial.</p>
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
          >
            + Registrar primer estudio
          </button>
        </div>
      )}

      {/* Listado de Estudios */}
      {imagingStudies.length > 0 && (
        <div className="space-y-4">
          {imagingStudies.map((study) => (
            <div key={study.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <Film className="w-5 h-5 text-purple-600" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {study.studyType}
                      {study.bodyPart && <span className="text-slate-500 font-normal"> · {study.bodyPart}</span>}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Fecha: {new Date(study.performedAt).toLocaleString('es-EC')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {study.fileUrl && (
                    <a
                      href={study.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-[11px] font-bold flex items-center gap-1 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{study.fileName || 'Ver Estudio / Archivo'}</span>
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </a>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    {study.status}
                  </span>
                </div>
              </div>

              {study.report && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Informe Radiológico / Hallazgos
                  </span>
                  <p className="text-xs text-slate-800 whitespace-pre-wrap">{study.report}</p>
                </div>
              )}

              {study.conclusion && (
                <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 text-xs">
                  <span className="font-bold text-purple-900 block mb-0.5">Conclusión:</span>
                  <p className="text-purple-800 font-semibold">{study.conclusion}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
