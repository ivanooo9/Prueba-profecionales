import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Plus,
  FileText,
  ExternalLink,
  Loader2,
  AlertCircle,
  X,
  Upload,
} from 'lucide-react';
import type { LabResult } from '../../types/clinical.types';
import { clinicalStore } from '../../services/clinical/clinicalStore';

export interface LabResultsViewerProps {
  labResults: LabResult[];
  patientId: string;
}

export const LabResultsViewer: React.FC<LabResultsViewerProps> = ({ labResults, patientId }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [testName, setTestName] = useState('');
  const [category, setCategory] = useState('Bioquímica Clínica');
  const [laboratory, setLaboratory] = useState('');
  const [resultDate, setResultDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'READY' | 'PENDING'>('READY');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ name: string; value: string; unit: string; referenceText: string; abnormality: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL' }[]>([]);

  // Item dinámico temporal
  const [paramName, setParamName] = useState('');
  const [paramValue, setParamValue] = useState('');
  const [paramUnit, setParamUnit] = useState('');
  const [paramRef, setParamRef] = useState('');
  const [paramAbnormality, setParamAbnormality] = useState<'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL'>('NORMAL');

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

  const addParamItem = () => {
    if (!paramName.trim() || !paramValue.trim()) return;
    setItems((prev) => [
      ...prev,
      {
        name: paramName.trim(),
        value: paramValue.trim(),
        unit: paramUnit.trim(),
        referenceText: paramRef.trim() || 'N/A',
        abnormality: paramAbnormality,
      },
    ]);
    setParamName('');
    setParamValue('');
    setParamUnit('');
    setParamRef('');
    setParamAbnormality('NORMAL');
  };

  const removeParamItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateLab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testName.trim()) {
      setError('El nombre del examen es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await clinicalStore.addLabResult({
        patientId,
        testName: testName.trim(),
        category: category.trim() || undefined,
        laboratory: laboratory.trim() || undefined,
        resultDate,
        status,
        notes: notes.trim() || undefined,
        items: items.length > 0 ? items : undefined,
        file: fileBase64,
        fileName: fileName || undefined,
      });

      // Limpiar formulario
      setTestName('');
      setCategory('Bioquímica Clínica');
      setLaboratory('');
      setResultDate(new Date().toISOString().split('T')[0]);
      setStatus('READY');
      setNotes('');
      setItems([]);
      setFileBase64(null);
      setFileName(null);
      setIsCreating(false);
    } catch (err: any) {
      console.error('Error al guardar laboratorio:', err);
      setError(err?.message || 'Error al guardar el resultado de laboratorio.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAbnormalityBadge = (abnormality?: string) => {
    switch (abnormality) {
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-mono font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-rose-600" /> ALTO
          </span>
        );
      case 'LOW':
        return (
          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-mono font-bold flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-amber-600" /> BAJO
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-mono font-extrabold text-[10px] flex items-center gap-1 animate-pulse">
            <AlertTriangle className="w-3 h-3" /> CRÍTICO
          </span>
        );
      case 'NORMAL':
      default:
        return (
          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> NORMAL
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra superior con contador y botón */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600" />
            <span>Resultados de Laboratorio Clínico</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Exámenes paraclínicos, analítica sanguínea y reportes microbiológicos
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setIsCreating(!isCreating);
          }}
          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Laboratorio</span>
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
        <form onSubmit={handleCreateLab} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Nuevo Resultado de Laboratorio
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
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Nombre del Examen *</label>
              <input
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                placeholder="Ej. Biometría Hemática Completa, Glucosa"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Categoría</label>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Bioquímica Clínica">Bioquímica Clínica</option>
                <option value="Hematología">Hematología</option>
                <option value="Inmunología">Inmunología</option>
                <option value="Microbiología">Microbiología</option>
                <option value="Uroanálisis">Uroanálisis</option>
                <option value="Coprología">Coprología</option>
                <option value="Endocrinología">Endocrinología</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Laboratorio / Proveedor</label>
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                placeholder="Ej. Laboratorio Central MSP, Lab San José"
                value={laboratory}
                onChange={(e) => setLaboratory(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Fecha</label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                  value={resultDate}
                  onChange={(e) => setResultDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Estado</label>
                <select
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <option value="READY">Listo / Completado</option>
                  <option value="PENDING">Pendiente</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Observaciones / Conclusión</label>
            <textarea
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 min-h-16"
              placeholder="Interpretación o notas relevantes del laboratorio..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Sub-formulario para agregar parámetros cuantitativos */}
          <div className="border border-slate-200 bg-white rounded-xl p-3 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
              Parámetros Analíticos (Opcional)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
              <input
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs col-span-1 sm:col-span-2"
                placeholder="Parámetro (ej. Glucosa)"
                value={paramName}
                onChange={(e) => setParamName(e.target.value)}
              />
              <input
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                placeholder="Valor (ej. 95)"
                value={paramValue}
                onChange={(e) => setParamValue(e.target.value)}
              />
              <input
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                placeholder="Unidad (ej. mg/dL)"
                value={paramUnit}
                onChange={(e) => setParamUnit(e.target.value)}
              />
              <select
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                value={paramAbnormality}
                onChange={(e) => setParamAbnormality(e.target.value as any)}
              >
                <option value="NORMAL">Normal</option>
                <option value="HIGH">Alto</option>
                <option value="LOW">Bajo</option>
                <option value="CRITICAL">Crítico</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <input
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs flex-1 mr-2"
                placeholder="Rango de referencia (ej. 70 - 100 mg/dL)"
                value={paramRef}
                onChange={(e) => setParamRef(e.target.value)}
              />
              <button
                type="button"
                onClick={addParamItem}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shrink-0"
              >
                + Agregar Parámetro
              </button>
            </div>

            {items.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                {items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs">
                    <span className="font-semibold text-slate-800">{it.name}: <strong>{it.value} {it.unit}</strong> <span className="text-slate-500 font-mono text-[10px]">({it.referenceText})</span></span>
                    <button
                      type="button"
                      onClick={() => removeParamItem(idx)}
                      className="text-slate-400 hover:text-rose-600 font-bold ml-2 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Adjuntar Archivo */}
          <div className="border border-dashed border-slate-300 rounded-xl p-3 bg-white text-xs space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Adjuntar Informe / Documento (PDF o Imagen, máx 10MB)</span>
              <input type="file" accept=".pdf,image/png,image/jpeg,image/jpg" className="hidden" onChange={handleFileChange} />
            </label>
            {fileName && (
              <div className="flex items-center justify-between text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg font-mono">
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
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Guardar Resultado</span>
            </button>
          </div>
        </form>
      )}

      {/* Estado Vacío */}
      {labResults.length === 0 && !isCreating && (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 space-y-3">
          <Activity className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold">No hay resultados de laboratorio registrados para este paciente.</p>
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
          >
            + Registrar primer resultado
          </button>
        </div>
      )}

      {/* Listado de Resultados */}
      {labResults.length > 0 && (
        <div className="space-y-6">
          {labResults.map((lab) => (
            <div key={lab.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <span>{lab.testName}</span>
                    {lab.category && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 font-normal">
                        {lab.category}
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Fecha: {new Date(lab.resultDate).toLocaleString('es-EC')}
                    {lab.laboratory && ` · Lab: ${lab.laboratory}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {lab.fileUrl && (
                    <a
                      href={lab.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 text-[11px] font-bold flex items-center gap-1 transition"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{lab.fileName || 'Ver Adjunto'}</span>
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </a>
                  )}
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {lab.status}
                  </span>
                </div>
              </div>

              {/* Items analíticos cuantitativos */}
              {lab.items && lab.items.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {lab.items.map((item) => (
                    <div key={item.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">{item.name}</span>
                        {getAbnormalityBadge(item.abnormality)}
                      </div>
                      <div className="flex items-baseline justify-between pt-1">
                        <span className="text-base font-extrabold font-mono text-sky-800">
                          {item.value} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Ref: {item.referenceLow !== undefined && item.referenceHigh !== undefined ? `${item.referenceLow} - ${item.referenceHigh} ${item.unit || ''}` : item.referenceText || 'N/A'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Informe narrativo / clínico si no tiene desglose de parámetros */}
              {(!lab.items || lab.items.length === 0) && lab.notes && (
                <div className="p-4 bg-emerald-50/40 border border-emerald-200/70 rounded-xl space-y-1.5">
                  <div className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Informe & Conclusiones del Laboratorio:</span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-line">
                    {lab.notes}
                  </p>
                </div>
              )}

              {/* Observaciones complementarias cuando sí tiene parámetros */}
              {lab.items && lab.items.length > 0 && lab.notes && (
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="font-semibold text-slate-900 block mb-0.5">Observaciones Clínicas Adicionales:</span>
                  {lab.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
