import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { DentalConsent } from '../../types';
import { dentistryApi } from '../../services/api/dentistryApi';
import { dentalService } from '../../services/dentalService';
import { CheckCircle2, AlertCircle, RotateCcw, PenTool, ShieldCheck } from 'lucide-react';

interface SignConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  consent: DentalConsent;
  onSigned: () => void;
}

export const SignConsentModal: React.FC<SignConsentModalProps> = ({
  isOpen,
  onClose,
  consent,
  onSigned,
}) => {
  const [patientName, setPatientName] = useState(consent.patientNameSnapshot || '');
  const [professionalName, setProfessionalName] = useState(
    consent.professionalNameSnapshot || 'Dr. Odontólogo Tratante'
  );
  const [patientConfirmed, setPatientConfirmed] = useState(false);
  const [professionalConfirmed, setProfessionalConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);

  const orgId = dentalService.getOrganizationId() || 11;

  useEffect(() => {
    if (!isOpen) return;
    setPatientName(consent.patientNameSnapshot || '');
    setProfessionalName(consent.professionalNameSnapshot || 'Dr. Odontólogo Tratante');
    setPatientConfirmed(false);
    setProfessionalConfirmed(false);
    setHasDrawnSignature(false);
    setError(null);

    // Initialize canvas
    const timer = setTimeout(() => {
      clearCanvas();
    }, 100);
    return () => clearTimeout(timer);
  }, [isOpen, consent]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#0e7490'; // cyan-700
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setHasDrawnSignature(false);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
    setHasDrawnSignature(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientConfirmed || !professionalConfirmed) {
      setError('Ambas partes deben confirmar la suscripción y aceptación del consentimiento.');
      return;
    }

    if (!patientName.trim()) {
      setError('El nombre del paciente firmante es obligatorio.');
      return;
    }

    if (!professionalName.trim()) {
      setError('El nombre del profesional tratante es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    let signatureData: string | null = null;
    if (hasDrawnSignature && canvasRef.current) {
      signatureData = canvasRef.current.toDataURL('image/png');
    }

    try {
      await dentistryApi.signConsent(orgId, consent.id, {
        signedByPatientName: patientName.trim(),
        signedByProfessionalName: professionalName.trim(),
        patientSignatureData: signatureData,
      });

      onSigned();
      onClose();
    } catch (err: any) {
      console.error('Error al registrar firma:', err);
      setError(err.message || 'Error al registrar la firma del consentimiento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Suscripción y Firma de Consentimiento Informado"
      subtitle={`Consentimiento #${consent.id}: ${consent.title}`}
      maxWidth="2xl"
    >
      <form onSubmit={handleSign} className="space-y-4 text-left">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Resumen del documento congelado */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Paciente Snapshot:</span>
            <span className="font-bold text-slate-900">
              {consent.patientNameSnapshot} {consent.patientIdNumberSnapshot ? `(CI: ${consent.patientIdNumberSnapshot})` : ''}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Fecha de Emisión:</span>
            <span className="text-slate-600">
              {consent.issuedAt ? new Date(consent.issuedAt).toLocaleString() : 'Recientemente emitido'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-600 font-mono max-h-36 overflow-y-auto p-2.5 bg-white border border-slate-200 rounded-lg whitespace-pre-wrap leading-relaxed">
            {consent.contentSnapshot}
          </div>
        </div>

        {/* Sección de Firma del Paciente */}
        <div className="bg-cyan-50/50 border border-cyan-100 rounded-xl p-3.5 space-y-3">
          <h4 className="text-xs font-bold text-cyan-950 flex items-center gap-1.5">
            <PenTool className="w-3.5 h-3.5 text-cyan-600" />
            1. Conformidad y Firma del Paciente / Representante
          </h4>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre de quien suscribe como paciente o representante legal *
            </label>
            <input
              type="text"
              required
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Firma manuscrita en pantalla (Táctil o Ratón)</span>
              <button
                type="button"
                onClick={clearCanvas}
                className="text-[10px] text-cyan-700 hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Limpiar trazo
              </button>
            </label>
            <div className="border-2 border-dashed border-cyan-200 rounded-xl bg-white p-1">
              <canvas
                ref={canvasRef}
                width={500}
                height={120}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-28 cursor-crosshair rounded-lg touch-none"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {hasDrawnSignature
                ? '✓ Trazo registrado.'
                : 'Dibuje la firma aquí, o marque la aceptación expresa para firma presencial.'}
            </p>
          </div>

          <label className="flex items-start gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              required
              checked={patientConfirmed}
              onChange={(e) => setPatientConfirmed(e.target.checked)}
              className="mt-0.5 rounded text-cyan-600 focus:ring-cyan-500"
            />
            <span className="text-[11px] text-slate-700 leading-tight">
              <strong>Declaración del Paciente:</strong> Certifico que he sido informado detalladamente sobre el procedimiento, sus alternativas, riesgos y posibles complicaciones, y autorizo voluntariamente su realización.
            </span>
          </label>
        </div>

        {/* Sección del Profesional Tratante */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
            2. Suscripción del Profesional Tratante
          </h4>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre del Profesional Odontólogo Responsable *
            </label>
            <input
              type="text"
              required
              value={professionalName}
              onChange={(e) => setProfessionalName(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <label className="flex items-start gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              required
              checked={professionalConfirmed}
              onChange={(e) => setProfessionalConfirmed(e.target.checked)}
              className="mt-0.5 rounded text-cyan-600 focus:ring-cyan-500"
            />
            <span className="text-[11px] text-slate-700 leading-tight">
              <strong>Declaración del Profesional:</strong> Certifico que he informado al paciente de forma comprensible y veraz sobre el tratamiento a realizar.
            </span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !patientConfirmed || !professionalConfirmed}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isSubmitting ? 'Firmando...' : 'Firmar y Concluir (Inmutable)'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
