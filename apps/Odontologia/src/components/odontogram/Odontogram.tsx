import React, { useState, useEffect } from 'react';
import { ToothCondition, ToothState, ToothSurface, DentalToothEvent } from '../../types';
import { dentalService } from '../../services/dentalService';
import {
  Check,
  Edit3,
  AlertCircle,
  Info,
  RefreshCw,
  Loader2,
  CheckCircle2,
  History,
  ChevronDown,
  ChevronUp,
  FilePlus,
} from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';
import { AddToTreatmentPlanModal } from './AddToTreatmentPlanModal';

interface OdontogramProps {
  patientId: string;
  readOnly?: boolean;
}

export const Odontogram: React.FC<OdontogramProps> = ({ patientId, readOnly = false }) => {
  const [selectedPiece, setSelectedPiece] = useState<number | null>(16);
  const [toothConditions, setToothConditions] = useState<ToothCondition[]>(() =>
    dentalService.getOdontogram(patientId)
  );
  const [toothHistory, setToothHistory] = useState<DentalToothEvent[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isTreatmentModalOpen, setIsTreatmentModalOpen] = useState(false);

  // Upper arch FDI: 18..11 and 21..28
  const upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
  const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28];

  // Lower arch FDI: 48..41 and 31..38
  const lowerRight = [48, 47, 46, 45, 44, 43, 42, 41];
  const lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];

  // Carga asíncrona de odontograma con bandera de cancelación (previene race conditions)
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    dentalService
      .loadOdontogram(patientId)
      .then((conditions) => {
        if (isCancelled) return;
        setToothConditions(conditions);
        setIsLoading(false);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error('[Odontogram] Error loading odontogram:', err);
        setErrorMessage(err.message || 'Error al cargar odontograma.');
        setIsLoading(false);
      });

    const unsubscribe = dentalService.subscribe(() => {
      if (!isCancelled) {
        setToothConditions(dentalService.getOdontogram(patientId));
      }
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [patientId]);

  const getConditionForPiece = (pieceNumber: number): ToothCondition | undefined => {
    return toothConditions.find((c) => c.pieceNumber === pieceNumber);
  };

  const selectedCondition = selectedPiece ? getConditionForPiece(selectedPiece) : undefined;

  // Form states for selected piece editor
  const [formState, setFormState] = useState<ToothState>('Sano');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formTreatment, setFormTreatment] = useState<string>('');
  const [formSurfaces, setFormSurfaces] = useState<Record<ToothSurface, boolean>>({
    occlusal: false,
    mesial: false,
    distal: false,
    vestibular: false,
    lingual: false,
  });

  // Sincronizar formulario al cambiar pieza seleccionada o condiciones
  useEffect(() => {
    if (!selectedPiece) return;
    const cond = getConditionForPiece(selectedPiece);
    setFormState(cond?.state || 'Sano');
    setFormNotes(cond?.notes || '');
    setFormTreatment(cond?.suggestedTreatment || '');
    setFormSurfaces({
      occlusal: cond?.surfaces?.occlusal || false,
      mesial: cond?.surfaces?.mesial || false,
      distal: cond?.surfaces?.distal || false,
      vestibular: cond?.surfaces?.vestibular || false,
      lingual: cond?.surfaces?.lingual || false,
    });
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [selectedPiece, toothConditions]);

  const loadPieceHistory = (pieceNumber: number) => {
    setIsLoadingHistory(true);
    dentalService
      .getToothHistory(patientId, pieceNumber)
      .then((history) => {
        setToothHistory(history);
      })
      .catch((err) => {
        console.error('[Odontogram] Error loading tooth history:', err);
        setToothHistory([]);
      })
      .finally(() => {
        setIsLoadingHistory(false);
      });
  };

  useEffect(() => {
    if (selectedPiece) {
      loadPieceHistory(selectedPiece);
    } else {
      setToothHistory([]);
    }
  }, [selectedPiece, patientId]);

  const handleSelectPiece = (piece: number) => {
    setSelectedPiece(piece);
  };

  const handleSaveCondition = async () => {
    if (!selectedPiece || isSaving) return;
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updated = await dentalService.updateToothCondition(patientId, {
        pieceNumber: selectedPiece,
        state: formState,
        notes: formNotes,
        suggestedTreatment: formTreatment,
        surfaces: formSurfaces,
      });
      setToothConditions(updated);
      loadPieceHistory(selectedPiece);
      setSuccessMessage(`Pieza #${selectedPiece} guardada correctamente.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar pieza en el odontograma.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatSurfaces = (surfaces?: Record<string, boolean> | null) => {
    if (!surfaces) return null;
    const active = Object.entries(surfaces)
      .filter(([_, val]) => Boolean(val))
      .map(([key]) => key.charAt(0).toUpperCase() + key.slice(1));
    return active.length > 0 ? active.join(', ') : 'Ninguna';
  };

  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('es-EC', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };


  const getStateColor = (state?: ToothState) => {
    switch (state) {
      case 'Sano': return '#10b981'; // Emerald green
      case 'Caries': return '#ef4444'; // Red
      case 'Restauracion': return '#06b6d4'; // Cyan
      case 'Ausente': return '#64748b'; // Slate gray
      case 'Tratamiento': return '#8b5cf6'; // Purple
      case 'Corona': return '#f59e0b'; // Amber
      case 'Extraccion_Indicada': return '#f97316'; // Orange
      case 'Fractura': return '#ec4899'; // Pink
      default: return '#e2e8f0'; // Default slate 200
    }
  };

  const renderToothSVG = (pieceNumber: number) => {
    const cond = getConditionForPiece(pieceNumber);
    const state = cond?.state || 'Sano';
    const isSelected = selectedPiece === pieceNumber;
    const baseColor = getStateColor(state);

    return (
      <button
        key={pieceNumber}
        type="button"
        onClick={() => handleSelectPiece(pieceNumber)}
        className={`flex flex-col items-center p-1.5 rounded-xl transition-all duration-150 relative ${
          isSelected 
            ? 'bg-cyan-100/80 ring-2 ring-cyan-500 scale-105 shadow-md z-10' 
            : 'hover:bg-slate-100 hover:scale-102'
        }`}
      >
        <span className="text-[11px] font-mono font-bold text-slate-700 mb-1">{pieceNumber}</span>
        
        {/* Tooth Schematic SVG */}
        <div className="w-9 h-10 relative">
          <svg viewBox="0 0 40 40" className="w-full h-full">
            {/* Vestibular (Top) */}
            <path
              d="M 5,5 L 35,5 L 28,12 L 12,12 Z"
              fill={cond?.surfaces?.vestibular ? baseColor : state !== 'Sano' ? `${baseColor}40` : '#f8fafc'}
              stroke="#94a3b8"
              strokeWidth="1.2"
            />
            {/* Distal (Right) */}
            <path
              d="M 35,5 L 35,35 L 28,28 L 28,12 Z"
              fill={cond?.surfaces?.distal ? baseColor : state !== 'Sano' ? `${baseColor}40` : '#f8fafc'}
              stroke="#94a3b8"
              strokeWidth="1.2"
            />
            {/* Lingual / Palatina (Bottom) */}
            <path
              d="M 5,35 L 35,35 L 28,28 L 12,28 Z"
              fill={cond?.surfaces?.lingual ? baseColor : state !== 'Sano' ? `${baseColor}40` : '#f8fafc'}
              stroke="#94a3b8"
              strokeWidth="1.2"
            />
            {/* Mesial (Left) */}
            <path
              d="M 5,5 L 5,35 L 12,28 L 12,12 Z"
              fill={cond?.surfaces?.mesial ? baseColor : state !== 'Sano' ? `${baseColor}40` : '#f8fafc'}
              stroke="#94a3b8"
              strokeWidth="1.2"
            />
            {/* Oclusal / Incisal (Center) */}
            <rect
              x="12"
              y="12"
              width="16"
              height="16"
              fill={cond?.surfaces?.occlusal || (state !== 'Sano' && !cond?.surfaces) ? baseColor : '#ffffff'}
              stroke="#64748b"
              strokeWidth="1.5"
              rx="2"
            />

            {/* Ausente X overlay */}
            {state === 'Ausente' && (
              <path d="M 4,4 L 36,36 M 36,4 L 4,36" stroke="#475569" strokeWidth="2.5" />
            )}
          </svg>
        </div>

        {/* Small Status Badge */}
        {cond && (
          <span 
            className="w-2 h-2 rounded-full mt-1" 
            style={{ backgroundColor: baseColor }}
            title={`${state}: ${cond.notes || 'Sin detalles'}`}
          />
        )}
      </button>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      {/* Legend & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            Odontograma Clínico Interactivo (32 Piezas FDI)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Haga clic en cualquier pieza dental para visualizar su estado, marcar superficies afectadas y actualizar su diagnóstico.
          </p>
        </div>

        {/* Color Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <span className="flex items-center gap-1.5 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Sano</span>
          <span className="flex items-center gap-1.5 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Caries</span>
          <span className="flex items-center gap-1.5 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span> Restauración</span>
          <span className="flex items-center gap-1.5 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span> Ausente</span>
          <span className="flex items-center gap-1.5 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Tratamiento</span>
          <span className="flex items-center gap-1.5 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Corona</span>
          <span className="flex items-center gap-1.5 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> Extracción</span>
        </div>
      </div>

      {/* Main Grid: Visual Chart + Inspector Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Dental Chart */}
        <div className="lg:col-span-2 space-y-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60 overflow-x-auto">
          
          {/* Upper Arch */}
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
              Arcada Superior (Cuadrantes 1 y 2)
            </div>
            <div className="flex items-center justify-center gap-1 min-w-[500px]">
              <div className="flex items-center gap-1 border-r-2 border-slate-300 pr-2">
                {upperRight.map(renderToothSVG)}
              </div>
              <div className="flex items-center gap-1 pl-2">
                {upperLeft.map(renderToothSVG)}
              </div>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-300 my-4 text-center text-[10px] font-mono text-slate-400">
            LÍNEA MEDIA OCLUSAL
          </div>

          {/* Lower Arch */}
          <div>
            <div className="flex items-center justify-center gap-1 min-w-[500px]">
              <div className="flex items-center gap-1 border-r-2 border-slate-300 pr-2">
                {lowerRight.map(renderToothSVG)}
              </div>
              <div className="flex items-center gap-1 pl-2">
                {lowerLeft.map(renderToothSVG)}
              </div>
            </div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-2 text-center">
              Arcada Inferior (Cuadrantes 4 y 3)
            </div>
          </div>
        </div>

        {/* Right Col: Piece Inspector & Editor Panel */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
          {selectedPiece ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Inspección Clínica</span>
                  <h4 className="text-lg font-bold text-slate-900 font-mono">Pieza Dental #{selectedPiece}</h4>
                </div>
                <StatusBadge status={formState} />
              </div>

              {successMessage && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-fade-in font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {errorMessage && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 animate-fade-in font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {!readOnly && (
                <>
                  {/* Select State */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Estado Dental</label>
                    <select
                      value={formState}
                      onChange={(e) => setFormState(e.target.value as ToothState)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                    >
                      <option value="Sano">Sano</option>
                      <option value="Caries">Caries</option>
                      <option value="Restauracion">Restauración</option>
                      <option value="Ausente">Ausente</option>
                      <option value="Tratamiento">Tratamiento de Conducto</option>
                      <option value="Corona">Corona Protésica</option>
                      <option value="Extraccion_Indicada">Extracción Indicada</option>
                      <option value="Fractura">Fractura</option>
                    </select>
                  </div>

                  {/* Superficies afectadas */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Superficies Afectadas</label>
                    <div className="grid grid-cols-3 gap-1.5 text-xs">
                      {(['occlusal', 'mesial', 'distal', 'vestibular', 'lingual'] as ToothSurface[]).map((surf) => (
                        <label
                          key={surf}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium cursor-pointer transition-colors ${
                            formSurfaces[surf]
                              ? 'bg-cyan-50 border-cyan-300 text-cyan-800 font-bold'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formSurfaces[surf]}
                            onChange={(e) => setFormSurfaces({ ...formSurfaces, [surf]: e.target.checked })}
                            className="hidden"
                          />
                          <span className="capitalize">{surf}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Observación */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Observación Clínica</label>
                    <textarea
                      rows={2}
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Ej: Caries cavitada profunda en oclusal..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 resize-none"
                    />
                  </div>

                  {/* Tratamiento sugerido */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tratamiento Sugerido</label>
                    <input
                      type="text"
                      value={formTreatment}
                      onChange={(e) => setFormTreatment(e.target.value)}
                      placeholder="Ej: Restauración en resina compuesta"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                    />
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={handleSaveCondition}
                    disabled={isSaving || isLoading}
                    className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all mt-2"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>{isSaving ? 'Guardando en Odontograma...' : 'Guardar en Odontograma'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsTreatmentModalOpen(true)}
                    disabled={isSaving || isLoading}
                    className="w-full py-2 bg-white hover:bg-cyan-50/80 border border-cyan-600/70 text-cyan-700 font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all mt-2"
                  >
                    <FilePlus className="w-3.5 h-3.5 text-cyan-600" />
                    <span>+ Agregar al Plan de Tratamiento</span>
                  </button>
                </>
              )}

              {/* Historial Clínico de la Pieza */}
              <div className="mt-5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full flex items-center justify-between text-left text-xs font-bold text-slate-800 hover:text-cyan-700 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-cyan-600" />
                    <span>Historial de la Pieza #{selectedPiece}</span>
                    {toothHistory.length > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-cyan-100 text-cyan-800 font-semibold rounded-full">
                        {toothHistory.length}
                      </span>
                    )}
                  </div>
                  {showHistory ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {showHistory && (
                  <div className="mt-3 space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {isLoadingHistory ? (
                      <div className="flex items-center justify-center py-4 text-slate-400 text-xs gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
                        <span>Cargando historial...</span>
                      </div>
                    ) : toothHistory.length === 0 ? (
                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-500 font-medium">
                        Sin historial registrado para esta pieza.
                      </div>
                    ) : (
                      toothHistory.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span className="font-mono font-medium">{formatDateTime(item.createdAt)}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-semibold uppercase">
                              {item.eventType}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {item.previousState || 'Sano'}
                            </span>
                            <span className="text-slate-400 font-mono">→</span>
                            <span
                              className="px-2 py-0.5 rounded text-white font-medium"
                              style={{ backgroundColor: getStateColor(item.newState as ToothState) }}
                            >
                              {item.newState}
                            </span>
                          </div>

                          {item.newSurfaces && formatSurfaces(item.newSurfaces) !== 'Ninguna' && (
                            <div className="text-[11px] text-slate-600">
                              <span className="font-medium text-slate-500">Superficies:</span>{' '}
                              <span className="font-semibold text-cyan-800">
                                {formatSurfaces(item.newSurfaces)}
                              </span>
                            </div>
                          )}

                          {item.notes && (
                            <div className="text-[11px] text-slate-600 italic bg-slate-50 p-1.5 rounded border border-slate-100">
                              "{item.notes}"
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400">
              <Info className="w-8 h-8 mb-2" />
              <p className="text-xs">Seleccione una pieza dental para inspeccionar su condición.</p>
            </div>
          )}
        </div>
      </div>

      {selectedPiece && (
        <AddToTreatmentPlanModal
          isOpen={isTreatmentModalOpen}
          onClose={() => setIsTreatmentModalOpen(false)}
          patientId={patientId}
          toothNumber={selectedPiece}
          initialSuggestedTreatment={formTreatment}
          initialNotes={formNotes}
          onSuccess={() => {
            setSuccessMessage(`Pieza #${selectedPiece} agregada al plan de tratamiento exitosamente.`);
          }}
        />
      )}
    </div>
  );
};
