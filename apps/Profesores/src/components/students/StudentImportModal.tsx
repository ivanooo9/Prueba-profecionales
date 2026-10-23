import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { Student } from '../../types/teacher';

export interface StudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportStudent: (student: Partial<Student>) => Promise<void>;
  onSuccess: () => void;
}

interface ParsedStudentRow {
  index: number;
  firstName: string;
  lastName: string;
  identification: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'warning';
  isValid: boolean;
  errors: string[];
}

export const StudentImportModal: React.FC<StudentImportModalProps> = ({
  isOpen,
  onClose,
  onImportStudent,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [importResults, setImportResults] = useState<{
    successCount: number;
    failedCount: number;
    errors: { identification: string; name: string; error: string }[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setIsProcessingFile(false);
    setIsImporting(false);
    setImportProgress({ current: 0, total: 0 });
    setImportResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (isImporting) return;
    handleReset();
    onClose();
  };

  // Descarga de plantilla CSV compatible con Microsoft Excel (con UTF-8 BOM para tildes y formato directo)
  const handleDownloadTemplate = () => {
    const headers = 'Nombres;Apellidos;Cédula;Correo;Teléfono;Estado';
    const sampleRows = [
      'Mateo Javier;Andrade Salazar;1726483920;mateo.andrade@colegio.edu.ec;0991234567;activo',
      'Sofía Valentina;Benítez Morales;1719874563;sofia.benitez@colegio.edu.ec;0987654321;activo',
      'Lucas Alejandro;Castillo Ramos;0928374651;lucas.castillo@colegio.edu.ec;0994443322;activo',
      'Camila Lucía;Delgado Mendoza;1750293847;camila.delgado@colegio.edu.ec;0998887766;activo',
      'Joaquín Eduardo;Flores Vega;0102938475;joaquin.flores@colegio.edu.ec;0981112233;activo',
    ];

    const csvContent = '\uFEFF' + [headers, ...sampleRows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'plantilla_importar_estudiantes.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Parser inteligente de texto CSV / Excel delimitado
  const parseFileContent = (content: string) => {
    const lines = content
      .split(/\r\n|\n|\r/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      alert('El archivo no contiene suficientes filas de datos.');
      return;
    }

    // Detectar delimitador (punto y coma, coma o tabulación)
    const firstLine = lines[0];
    let delimiter = ';';
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;

    if (tabCount > semiCount && tabCount > commaCount) {
      delimiter = '\t';
    } else if (commaCount > semiCount) {
      delimiter = ',';
    }

    const splitRow = (row: string) => {
      // Manejar valores entrecomillados si existen
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      return result;
    };

    const headerCols = splitRow(lines[0]).map((h) =>
      h
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
    );

    // Mapeo automático de índices de columnas
    let fnIdx = headerCols.findIndex((h) => h.includes('nombre') || h.includes('first'));
    let lnIdx = headerCols.findIndex((h) => h.includes('apellido') || h.includes('last'));
    let idIdx = headerCols.findIndex(
      (h) =>
        h.includes('cedula') ||
        h.includes('identifica') ||
        h.includes('dni') ||
        h.includes('documento') ||
        h.includes('pasaporte') ||
        h === 'id' ||
        h.startsWith('id_') ||
        h.endsWith('_id')
    );
    let emailIdx = headerCols.findIndex(
      (h) => h.includes('correo') || h.includes('email') || h.includes('mail')
    );
    let phoneIdx = headerCols.findIndex(
      (h) => h.includes('telefono') || h.includes('celular') || h.includes('phone') || h.includes('movil')
    );
    let statusIdx = headerCols.findIndex((h) => h.includes('estado') || h.includes('status'));

    // Fallback si los encabezados no coinciden por nombre: usar orden estándar (0: Nombres, 1: Apellidos, 2: Cédula, 3: Correo, 4: Teléfono, 5: Estado)
    if (fnIdx === -1) fnIdx = 0;
    if (lnIdx === -1) lnIdx = 1;
    if (idIdx === -1) idIdx = 2;
    if (emailIdx === -1) emailIdx = 3;
    if (phoneIdx === -1) phoneIdx = 4;
    if (statusIdx === -1) statusIdx = 5;

    const parsed: ParsedStudentRow[] = [];
    const seenIds = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const cols = splitRow(lines[i]);
      if (cols.length === 0 || (cols.length === 1 && !cols[0])) continue;

      const firstName = cols[fnIdx] || '';
      const lastName = cols[lnIdx] || '';
      const identification = cols[idIdx] || '';
      const email = cols[emailIdx] || '';
      const phone = cols[phoneIdx] || '';
      const rawStatus = (cols[statusIdx] || 'active').toLowerCase();

      let status: 'active' | 'inactive' | 'warning' = 'active';
      if (rawStatus.includes('inact') || rawStatus === 'inactive') status = 'inactive';
      else if (rawStatus.includes('riesg') || rawStatus.includes('advert') || rawStatus === 'warning')
        status = 'warning';

      const errors: string[] = [];
      if (!firstName) errors.push('Falta el nombre');
      if (!lastName) errors.push('Falta el apellido');
      if (!identification) {
        errors.push('Falta la cédula / identificación');
      } else if (seenIds.has(identification)) {
        errors.push('Cédula duplicada en el archivo');
      } else {
        seenIds.add(identification);
      }

      parsed.push({
        index: i,
        firstName,
        lastName,
        identification,
        email,
        phone,
        status,
        isValid: errors.length === 0,
        errors,
      });
    }

    setParsedRows(parsed);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsProcessingFile(true);
    setImportResults(null);

    try {
      const text = await selectedFile.text();
      parseFileContent(text);
    } catch (err: any) {
      console.error('Error al leer el archivo:', err);
      alert('Error al leer el archivo seleccionado. Asegúrese de que sea un archivo de texto o CSV legible.');
      setFile(null);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert('No hay filas válidas para importar.');
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: validRows.length });

    let success = 0;
    let failed = 0;
    const errorsList: { identification: string; name: string; error: string }[] = [];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      setImportProgress({ current: i + 1, total: validRows.length });

      try {
        await onImportStudent({
          firstName: row.firstName,
          lastName: row.lastName,
          identification: row.identification,
          email: row.email || undefined,
          phone: row.phone || undefined,
          status: row.status,
        });
        success++;
      } catch (err: any) {
        failed++;
        errorsList.push({
          identification: row.identification,
          name: `${row.firstName} ${row.lastName}`,
          error: err.message || 'Error al persistir el estudiante',
        });
      }
    }

    setIsImporting(false);
    setImportResults({
      successCount: success,
      failedCount: failed,
      errors: errorsList,
    });

    if (success > 0) {
      onSuccess();
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Importar Nómina de Estudiantes desde Excel / CSV
              </h2>
              <p className="text-xs text-slate-500">
                Cargue un archivo con los datos de sus alumnos para registrarlos masivamente.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isImporting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Plantilla & Descarga */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-indigo-900 text-xs flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                ¿Necesita el formato de columnas?
              </h4>
              <p className="text-[11px] text-indigo-700 mt-0.5">
                Descargue nuestra plantilla oficial compatible con Excel: <strong>Nombres, Apellidos, Cédula, Correo, Teléfono, Estado</strong>.
              </p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              type="button"
              className="px-3.5 py-2 bg-white hover:bg-indigo-100/60 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs transition flex items-center gap-1.5 shrink-0 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Plantilla Excel</span>
            </button>
          </div>

          {/* Estado Final de Importación */}
          {importResults && (
            <div
              className={`p-4 rounded-2xl border ${
                importResults.failedCount === 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm mb-1">
                {importResults.failedCount === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                )}
                <span>Resumen del Proceso de Importación</span>
              </div>
              <p className="text-xs">
                Se registraron exitosamente <strong>{importResults.successCount}</strong> estudiantes.{' '}
                {importResults.failedCount > 0 && (
                  <span>
                    Ocurrieron errores con <strong>{importResults.failedCount}</strong> registro(s).
                  </span>
                )}
              </p>

              {importResults.errors.length > 0 && (
                <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto bg-white/80 p-2.5 rounded-xl border border-amber-200 text-[11px]">
                  {importResults.errors.map((err, idx) => (
                    <div key={idx} className="text-rose-700 flex items-start gap-1">
                      <span className="font-bold">• {err.name} ({err.identification}):</span>
                      <span>{err.error}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Área de Carga / Drag & Drop */}
          {!importResults && (
            <div>
              <label
                htmlFor="student-file-upload"
                className={`border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition ${
                  file
                    ? 'border-indigo-400 bg-indigo-50/30'
                    : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
                }`}
              >
                <input
                  id="student-file-upload"
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .xlsx, .xls, .tsv, .txt"
                  onChange={handleFileChange}
                  disabled={isImporting}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                {file ? (
                  <div>
                    <p className="font-extrabold text-slate-800 text-sm">{file.name}</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      {(file.size / 1024).toFixed(1)} KB — Clic para cambiar archivo
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-bold text-slate-800 text-xs">
                      Haga clic o arrastre su archivo Excel / CSV aquí
                    </p>
                    <p className="text-slate-400 text-[11px] mt-1">
                      Formatos compatibles: .csv, .xlsx, .xls, .txt (delimitado por coma o punto y coma)
                    </p>
                  </div>
                )}
              </label>
            </div>
          )}

          {/* Vista previa de datos parseados */}
          {parsedRows.length > 0 && !importResults && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                  <span>Vista Previa de Alumnos ({parsedRows.length} filas detectadas)</span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                    {validCount} válidos
                  </span>
                  {invalidCount > 0 && (
                    <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                      {invalidCount} con observaciones
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold sticky top-0">
                    <tr>
                      <th className="py-2 px-3 w-10 text-center">#</th>
                      <th className="py-2 px-3">Estado</th>
                      <th className="py-2 px-3">Nombres</th>
                      <th className="py-2 px-3">Apellidos</th>
                      <th className="py-2 px-3">Cédula</th>
                      <th className="py-2 px-3">Correo</th>
                      <th className="py-2 px-3">Teléfono</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((row) => (
                      <tr
                        key={row.index}
                        className={`hover:bg-slate-50/70 transition ${
                          !row.isValid ? 'bg-rose-50/40' : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-slate-400 font-mono text-[11px] text-center">
                          {row.index}
                        </td>
                        <td className="py-2 px-3">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Listo
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200"
                              title={row.errors.join(', ')}
                            >
                              <AlertTriangle className="w-3 h-3" /> {row.errors[0]}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{row.firstName || '—'}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{row.lastName || '—'}</td>
                        <td className="py-2 px-3 font-mono text-slate-600">{row.identification || '—'}</td>
                        <td className="py-2 px-3 text-slate-500 text-[11px]">{row.email || '—'}</td>
                        <td className="py-2 px-3 font-mono text-slate-500 text-[11px]">{row.phone || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Progreso de Importación */}
          {isImporting && (
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  Importando estudiantes a la base de datos...
                </span>
                <span>
                  {importProgress.current} de {importProgress.total}
                </span>
              </div>
              <div className="w-full bg-indigo-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-200"
                  style={{
                    width: `${(importProgress.current / (importProgress.total || 1)) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          {parsedRows.length > 0 && !importResults ? (
            <button
              type="button"
              onClick={handleReset}
              disabled={isImporting}
              className="px-3.5 py-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 font-bold transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Cargar Otro Archivo</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isImporting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold transition disabled:opacity-50"
            >
              {importResults ? 'Cerrar' : 'Cancelar'}
            </button>

            {!importResults && (
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isImporting || validCount === 0 || isProcessingFile}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Importar {validCount} Estudiantes</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
