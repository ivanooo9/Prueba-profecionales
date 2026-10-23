import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Scale,
  Clock,
  Gavel,
  CheckSquare,
  FileText,
  History,
  Plus,
  Building,
  UserCheck,
  DollarSign,
  Calendar,
  AlertTriangle,
  Send,
  Video,
  MapPin,
  CheckCircle2,
  Download,
  UploadCloud,
  CreditCard,
  Receipt,
  Trash2,
  Copy,
  ExternalLink,
  Check,
  Edit,
  User,
  Mail,
  Phone,
  Info,
} from 'lucide-react';
import {
  LegalCase,
  ProceduralDeadline,
  Hearing,
  LegalTask,
  LegalDocument,
  CaseActivity,
  Client,
  CaseStatus,
  LegalFeeAgreement,
  LegalPayment,
  ClosureCheckDTO,
} from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { PriorityBadge } from '../ui/PriorityBadge';
import { DeadlineBadge } from '../ui/DeadlineBadge';
import { legalService } from '../../services/legalService';

export interface CaseDetailViewProps {
  caseItem: LegalCase;
  client: Client | undefined;
  deadlines: ProceduralDeadline[];
  hearings: Hearing[];
  tasks: LegalTask[];
  documents: LegalDocument[];
  activities: CaseActivity[];
  onBack: () => void;
  onUpdateStatus: (caseId: string, status: CaseStatus) => void;
  onOpenNewDeadline: (caseId: string) => void;
  onOpenNewHearing: (caseId: string) => void;
  onOpenNewTask: (caseId: string) => void;
  onOpenNewDocument: (caseId: string) => void;
  onAddActivity: (caseId: string, activity: { type: CaseActivity['type']; title: string; description: string; performedBy: string }) => void;
  onToggleTask: (taskId: string) => void;
  onEditCase?: (caseItem: LegalCase) => void;
}

export const CaseDetailView: React.FC<CaseDetailViewProps> = ({
  caseItem,
  client,
  deadlines,
  hearings,
  tasks,
  documents,
  activities,
  onBack,
  onUpdateStatus,
  onOpenNewDeadline,
  onOpenNewHearing,
  onOpenNewTask,
  onOpenNewDocument,
  onAddActivity,
  onToggleTask,
  onEditCase,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'deadlines' | 'hearings' | 'tasks' | 'documents' | 'timeline' | 'finances'>('info');
  const [copiedCaratula, setCopiedCaratula] = useState(false);
  const [copiedSatje, setCopiedSatje] = useState(false);
  const [copiedDescription, setCopiedDescription] = useState(false);

  // Fee agreements & payments state
  const [feeAgreements, setFeeAgreements] = useState<LegalFeeAgreement[]>([]);
  const [isLoadingAgreements, setIsLoadingAgreements] = useState(false);
  const [showNewAgreementModal, setShowNewAgreementModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAgreementForPayment, setSelectedAgreementForPayment] = useState<LegalFeeAgreement | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isSubmittingAgreement, setIsSubmittingAgreement] = useState(false);

  const [agreementForm, setAgreementForm] = useState({
    title: '',
    description: '',
    billingType: 'FIXED_FEE',
    currency: 'USD',
    notes: '',
    items: [{ description: 'Honorarios profesionales por patrocinio legal', category: 'HONORARIOS', quantity: 1, unitPrice: 500, notes: '' }],
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'TRANSFERENCIA',
    reference: '',
    notes: '',
    paidAt: new Date().toISOString().split('T')[0],
    clientOperationId: '',
  });

  // Closure & Archive state (Fase 8)
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [closureCheck, setClosureCheck] = useState<ClosureCheckDTO | null>(null);
  const [isLoadingClosureCheck, setIsLoadingClosureCheck] = useState(false);
  const [isSubmittingClosure, setIsSubmittingClosure] = useState(false);
  const [closureForm, setClosureForm] = useState({
    reason: 'Sentencia favorable',
    notes: '',
  });
  const [archiveForm, setArchiveForm] = useState({
    reason: 'Traslado a archivo pasivo definitivo',
  });
  const [closureError, setClosureError] = useState<string | null>(null);

  const handleOpenCloseModal = async () => {
    setShowCloseModal(true);
    setIsLoadingClosureCheck(true);
    setClosureError(null);
    try {
      const check = await legalService.getClosureCheck(caseItem.id);
      setClosureCheck(check);
    } catch (err: any) {
      console.error('Error fetching closure check:', err);
      setClosureError(err.message || 'Error al obtener diagnóstico de cierre');
    } finally {
      setIsLoadingClosureCheck(false);
    }
  };

  const handleConfirmClose = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingClosure(true);
    setClosureError(null);
    try {
      await legalService.closeCase(caseItem.id, closureForm);
      onUpdateStatus(caseItem.id, 'Cerrado');
      setShowCloseModal(false);
    } catch (err: any) {
      console.error('Error closing case:', err);
      setClosureError(err.message || 'Error al cerrar el expediente');
    } finally {
      setIsSubmittingClosure(false);
    }
  };

  const handleOpenArchiveModal = () => {
    setShowArchiveModal(true);
    setClosureError(null);
  };

  const handleConfirmArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingClosure(true);
    setClosureError(null);
    try {
      await legalService.archiveCase(caseItem.id, archiveForm);
      onUpdateStatus(caseItem.id, 'Archivado');
      setShowArchiveModal(false);
    } catch (err: any) {
      console.error('Error archiving case:', err);
      setClosureError(err.message || 'Error al archivar el expediente');
    } finally {
      setIsSubmittingClosure(false);
    }
  };

  const loadAgreements = async () => {
    setIsLoadingAgreements(true);
    try {
      const list = await legalService.fetchCaseFeeAgreements(caseItem.id);
      setFeeAgreements(list);
    } catch (err) {
      console.error('[CaseDetailView] Error cargando acuerdos:', err);
    } finally {
      setIsLoadingAgreements(false);
    }
  };

  useEffect(() => {
    loadAgreements();
  }, [caseItem.id]);

  const handleAddItemToForm = () => {
    setAgreementForm((prev) => ({
      ...prev,
      items: [...prev.items, { description: '', category: 'HONORARIOS', quantity: 1, unitPrice: 0, notes: '' }],
    }));
  };

  const handleRemoveItemFromForm = (idx: number) => {
    setAgreementForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleItemChange = (idx: number, field: string, val: any) => {
    setAgreementForm((prev) => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: val };
      return { ...prev, items };
    });
  };

  const handleCreateAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingAgreement) return;

    if (!agreementForm.title.trim()) {
      alert('El título del acuerdo es obligatorio');
      return;
    }
    if (agreementForm.items.length === 0) {
      alert('Debe incluir al menos un concepto en el acuerdo');
      return;
    }
    for (const item of agreementForm.items) {
      if (!item.description.trim()) {
        alert('Todos los conceptos deben tener descripción');
        return;
      }
      if (item.unitPrice < 0) {
        alert('El precio unitario no puede ser negativo');
        return;
      }
    }

    setIsSubmittingAgreement(true);
    try {
      await legalService.addFeeAgreement(caseItem.id, agreementForm);
      setShowNewAgreementModal(false);
      setAgreementForm({
        title: '',
        description: '',
        billingType: 'FIXED_FEE',
        currency: 'USD',
        notes: '',
        items: [{ description: 'Honorarios profesionales por patrocinio legal', category: 'HONORARIOS', quantity: 1, unitPrice: 500, notes: '' }],
      });
      await loadAgreements();
    } catch (err: any) {
      alert(err.message || 'Error al crear acuerdo');
    } finally {
      setIsSubmittingAgreement(false);
    }
  };

  const handleOpenPaymentModal = (agreement: LegalFeeAgreement) => {
    setSelectedAgreementForPayment(agreement);
    // Generar clave de idempotencia estable por operación lógica de pago
    const stableIdempotencyKey = `pay_${agreement.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    setPaymentForm({
      amount: String(agreement.balance),
      method: 'TRANSFERENCIA',
      reference: '',
      notes: '',
      paidAt: new Date().toISOString().split('T')[0],
      clientOperationId: stableIdempotencyKey,
    });
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgreementForPayment || isSubmittingPayment) return;
    const amountNum = parseFloat(String(paymentForm.amount));
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('El monto del pago debe ser mayor a 0');
      return;
    }
    if (amountNum > selectedAgreementForPayment.balance) {
      alert(`El monto ($${amountNum}) no puede superar el saldo pendiente ($${selectedAgreementForPayment.balance})`);
      return;
    }

    setIsSubmittingPayment(true);
    try {
      await legalService.recordFeePayment(caseItem.id, String(selectedAgreementForPayment.id), {
        amount: amountNum,
        paymentMethod: paymentForm.method,
        method: paymentForm.method,
        reference: paymentForm.reference,
        notes: paymentForm.notes,
        paidAt: paymentForm.paidAt,
        idempotencyKey: paymentForm.clientOperationId,
      });
      setShowPaymentModal(false);
      setSelectedAgreementForPayment(null);
      await loadAgreements();
    } catch (err: any) {
      alert(err.message || 'Error al registrar el pago');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Modal / Form state for appending a timeline activity
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [activityForm, setActivityForm] = useState({
    type: 'Notificación' as CaseActivity['type'],
    title: '',
    description: '',
    performedBy: caseItem.assignedLawyer,
  });

  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityForm.title) return;
    onAddActivity(caseItem.id, activityForm);
    setShowAddActivityModal(false);
    setActivityForm({
      type: 'Notificación',
      title: '',
      description: '',
      performedBy: caseItem.assignedLawyer,
    });
  };

  // Copy actions for Ecuadorian legal practice
  const handleCopySatje = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!caseItem.judicialProcessNumber) return;
    navigator.clipboard.writeText(caseItem.judicialProcessNumber);
    setCopiedSatje(true);
    setTimeout(() => setCopiedSatje(false), 2000);
  };

  const handleCopyCaratula = () => {
    const lines = [
      `SEÑOR(A) JUEZ(A) DE LA ${caseItem.courtName ? caseItem.courtName.toUpperCase() : 'UNIDAD JUDICIAL'}`,
      `JUICIO No.: ${caseItem.judicialProcessNumber || caseItem.caseNumber}`,
      `ACTOR / ACCIONANTE: ${caseItem.clientName}${client?.identification ? ` (C.C./RUC: ${client.identification})` : ''}`,
      `DEMANDADO / ACCIONADO: ${caseItem.opposingParty || 'CONTRAPARTE POR DETERMINAR'}`,
      `MATERIA / VÍA PROCESAL: ${caseItem.legalArea.toUpperCase()} - ${caseItem.processType.toUpperCase()}`,
      `CUANTÍA: ${caseItem.claimAmount || 'INDETERMINADA'}`,
      `ABOGADO PATROCINADOR: ${caseItem.assignedLawyer.toUpperCase()}`,
      `CASILLERO ELECTRÓNICO / CONTACTO: ${client?.email || 'defensa@despacho.ec'}`
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedCaratula(true);
    setTimeout(() => setCopiedCaratula(false), 2500);
  };

  const handleCopyDescription = () => {
    if (!caseItem.description) return;
    navigator.clipboard.writeText(caseItem.description);
    setCopiedDescription(true);
    setTimeout(() => setCopiedDescription(false), 2000);
  };

  // Financial calculations
  const totalAgreed = feeAgreements.reduce((sum, a) => sum + (Number(a.total) || 0), 0);
  const totalPaid = feeAgreements.reduce((sum, a) => sum + (Number(a.paidAmount) || 0), 0);
  const totalBalance = Math.max(0, totalAgreed - totalPaid);
  const collectionPercentage = totalAgreed > 0 ? Math.round((totalPaid / totalAgreed) * 100) : 0;

  // Urgent pending deadlines
  const pendingDeadlines = [...deadlines]
    .filter((d) => d.status === 'Pendiente' || d.status === 'En progreso')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const nextDeadline = pendingDeadlines[0];

  const getDeadlineDiffDays = (dueDate: string) => {
    const target = new Date(dueDate + 'T23:59:59').getTime();
    const now = new Date().getTime();
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  };

  // Upcoming scheduled hearings
  const upcomingHearings = [...hearings]
    .filter((h) => h.status === 'Programada')
    .sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`).getTime() - new Date(`${b.date}T${b.time || '00:00'}`).getTime());
  const nextHearing = upcomingHearings[0];

  return (
    <div className="space-y-6">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs w-fit"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Volver al listado de casos</span>
        </button>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick Action: Copiar Carátula para Escrito */}
          <button
            onClick={handleCopyCaratula}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition shadow-xs border ${
              copiedCaratula
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Copiar encabezado formal para escritos judiciales en Word"
          >
            {copiedCaratula ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copiedCaratula ? '¡Carátula Copiada!' : 'Copiar Carátula'}</span>
          </button>

          {/* Edit Case Button */}
          {onEditCase && (
            <button
              onClick={() => onEditCase(caseItem)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition shadow-xs"
              title="Modificar datos del expediente, juzgado, cuantía o número SATJE"
            >
              <Edit className="w-3.5 h-3.5 text-slate-500" />
              <span>Editar Caso</span>
            </button>
          )}

          {/* Close / Archive Case Button */}
          {caseItem.status !== 'Cerrado' && caseItem.status !== 'Archivado' && (
            <button
              onClick={handleOpenCloseModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Cerrar Expediente</span>
            </button>
          )}

          {caseItem.status === 'Cerrado' && (
            <button
              onClick={handleOpenArchiveModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition shadow-xs"
            >
              <History className="w-3.5 h-3.5" />
              <span>Archivar Expediente</span>
            </button>
          )}

          {caseItem.status === 'Archivado' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold">
              <History className="w-3.5 h-3.5" />
              <span>Expediente Archivado</span>
            </span>
          )}

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Quick status selector */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-semibold text-slate-500">Estado:</label>
            <select
              value={caseItem.status}
              onChange={(e) => {
                const val = e.target.value as CaseStatus;
                if (val === 'Cerrado') {
                  handleOpenCloseModal();
                } else if (val === 'Archivado') {
                  handleOpenArchiveModal();
                } else {
                  onUpdateStatus(caseItem.id, val);
                }
              }}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none shadow-xs"
            >
              <option value="Nuevo">Nuevo</option>
              <option value="En proceso">En proceso</option>
              <option value="En espera">En espera</option>
              <option value="Audiencia">Audiencia</option>
              <option value="Cerrado">Cerrado</option>
              <option value="Archivado">Archivado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Case Main Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 border-b border-slate-100 pb-6 mb-6">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                EXP: {caseItem.caseNumber}
              </span>

              {caseItem.judicialProcessNumber ? (
                <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-900 px-3 py-1 rounded-lg text-xs font-mono font-bold">
                  <span>SATJE: {caseItem.judicialProcessNumber}</span>
                  <button
                    type="button"
                    onClick={handleCopySatje}
                    className="p-0.5 hover:text-indigo-600 transition"
                    title="Copiar número de juicio SATJE"
                  >
                    {copiedSatje ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-indigo-500" />}
                  </button>
                  <a
                    href="https://procesosjudiciales.funcionjudicial.gob.ec/busqueda-filtros"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-0.5 hover:text-indigo-600 transition text-indigo-500"
                    title="Consultar en portal web de la Función Judicial (SATJE)"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : (
                <span className="text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-200 px-2.5 py-1 rounded-lg italic">
                  SATJE: Pendiente de sorteo
                </span>
              )}

              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                {caseItem.legalArea}
              </span>
              <span className="text-xs font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                {caseItem.processType}
              </span>
              <StatusBadge status={caseItem.status} />
              <PriorityBadge priority={caseItem.priority} />
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {caseItem.title}
            </h1>

            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <Building className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{caseItem.courtName || 'Unidad Judicial no especificada'}</span>
              </span>
              {caseItem.judgeName && (
                <>
                  <span className="text-slate-300">&bull;</span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <Gavel className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Juez / Ponente: <strong className="text-slate-800">{caseItem.judgeName}</strong></span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Quick Subject Summary Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 shrink-0 lg:w-72">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center justify-between">
                <span>Cliente Patrocinado</span>
                <span className="text-[9px] bg-slate-200/80 text-slate-700 px-1.5 py-0.5 rounded font-mono">ACTOR</span>
              </div>
              <div className="font-extrabold text-xs text-slate-900 mt-1">{caseItem.clientName}</div>
              {client && (
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  {client.identificationType.toUpperCase()}: {client.identification}
                </div>
              )}
            </div>

            {caseItem.opposingParty && (
              <div className="pt-2 border-t border-slate-200/80">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center justify-between">
                  <span>Contraparte</span>
                  <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono">DEMANDADO</span>
                </div>
                <div className="font-bold text-xs text-slate-800 mt-0.5">{caseItem.opposingParty}</div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Abogado:</span>
              <span className="font-bold text-slate-900 truncate max-w-[150px]">{caseItem.assignedLawyer}</span>
            </div>
          </div>
        </div>

        {/* Closure / Archive Banner */}
        {caseItem.status === 'Cerrado' && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
            <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-900">Expediente Formalmente Cerrado</div>
              <p className="text-amber-800 mt-0.5">
                Las tareas y plazos ordinarios han cesado. La consulta de documentos y el cobro de honorarios pendientes permanecen habilitados.
              </p>
              {caseItem.closureReason && (
                <div className="mt-1 text-[11px] text-amber-700">
                  <strong>Motivo:</strong> {caseItem.closureReason} {caseItem.closedAt ? `(${new Date(caseItem.closedAt).toLocaleDateString()})` : ''}
                  {caseItem.closureNotes ? ` — ${caseItem.closureNotes}` : ''}
                </div>
              )}
            </div>
          </div>
        )}

        {caseItem.status === 'Archivado' && (
          <div className="mb-6 p-4 bg-slate-100 border border-slate-300 rounded-2xl flex items-start gap-3 text-xs text-slate-800">
            <History className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-900">Expediente en Archivo Definitivo</div>
              <p className="text-slate-700 mt-0.5">
                Custodia histórica permanente en solo consulta.
              </p>
              {caseItem.archiveReason && (
                <div className="mt-1 text-[11px] text-slate-600">
                  <strong>Motivo:</strong> {caseItem.archiveReason} {caseItem.archivedAt ? `(${new Date(caseItem.archivedAt).toLocaleDateString()})` : ''}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
          {[
            { id: 'info', label: 'Ficha Información', icon: Scale },
            { id: 'deadlines', label: `Plazos Procesales (${deadlines.length})`, icon: Clock, badge: deadlines.some(d => d.status === 'Vencido') ? 'CRÍTICO' : null },
            { id: 'hearings', label: `Audiencias (${hearings.length})`, icon: Gavel },
            { id: 'tasks', label: `Tareas (${tasks.length})`, icon: CheckSquare },
            { id: 'documents', label: `Documentos (${documents.length})`, icon: FileText },
            { id: 'timeline', label: `Cronología (${activities.length})`, icon: History },
            { id: 'finances', label: `Honorarios y Pagos (${feeAgreements.length})`, icon: DollarSign },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-2 shrink-0 ${
                  isActive
                    ? 'bg-slate-900 text-white font-extrabold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[9px] bg-rose-500 text-white px-1.5 py-0.5 rounded font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Panels */}
      <div>
        {/* 1. FICHA INFORMACIÓN / DASHBOARD EJECUTIVO DEL EXPEDIENTE */}
        {activeTab === 'info' && (
          <div className="space-y-6">
            {/* BLOQUE A: SUJETOS PROCESALES Y RADICACIÓN JUDICIAL */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-slate-700" />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Sujetos Procesales y Radicación Judicial
                  </h3>
                </div>
                {onEditCase && (
                  <button
                    onClick={() => onEditCase(caseItem)}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Modificar Ficha</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Actor / Patrocinado */}
                <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Sujeto Activo (Actor)
                    </span>
                    <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">
                      PATROCINADO
                    </span>
                  </div>
                  <div className="font-extrabold text-sm text-slate-900">{caseItem.clientName}</div>
                  <div className="text-[11px] text-slate-600 space-y-1">
                    {client && (
                      <p className="font-mono text-slate-700">
                        {client.identificationType.toUpperCase()}: <strong>{client.identification}</strong>
                      </p>
                    )}
                    {client?.email && (
                      <p className="flex items-center gap-1 truncate text-slate-600" title={client.email}>
                        <Mail className="w-3 h-3 shrink-0 text-slate-400" />
                        <span>{client.email}</span>
                      </p>
                    )}
                    {client?.phone && (
                      <p className="flex items-center gap-1 text-slate-600">
                        <Phone className="w-3 h-3 shrink-0 text-slate-400" />
                        <span>{client.phone}</span>
                      </p>
                    )}
                    {client?.address && (
                      <p className="flex items-start gap-1 text-slate-500 pt-1 border-t border-slate-200/60">
                        <MapPin className="w-3 h-3 shrink-0 text-slate-400 mt-0.5" />
                        <span className="line-clamp-2">{client.address}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Demandado / Contraparte */}
                <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Sujeto Pasivo (Demandado)
                    </span>
                    <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono font-bold">
                      CONTRAPARTE
                    </span>
                  </div>
                  <div className="font-extrabold text-sm text-slate-900">
                    {caseItem.opposingParty || 'Por determinar / citar'}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {caseItem.opposingParty
                      ? 'Parte procesal demandada en la controversia sustanciada ante la Función Judicial.'
                      : 'No se ha registrado una contraparte específica. Puede asignarla editando el expediente.'}
                  </p>
                  <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
                    <span className="text-slate-400">Patrocinio propio:</span>{' '}
                    <strong className="text-slate-800">{caseItem.assignedLawyer}</strong>
                  </div>
                </div>

                {/* Radicación Judicial y Procedimiento */}
                <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Radicación Judicial
                    </span>
                    <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-bold">
                      COGEP
                    </span>
                  </div>
                  <div className="font-extrabold text-xs text-slate-900 leading-snug">
                    {caseItem.courtName || 'Unidad Judicial no especificada'}
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-1">
                    <p>
                      <span className="text-slate-400">Juez / Ponente:</span>{' '}
                      <strong className="text-slate-800">{caseItem.judgeName || 'Por sortear en SATJE'}</strong>
                    </p>
                    <p>
                      <span className="text-slate-400">Vía Procesal:</span>{' '}
                      <span className="font-bold text-slate-800">{caseItem.processType}</span>
                    </p>
                    <p>
                      <span className="text-slate-400">Materia:</span>{' '}
                      <span className="font-semibold text-slate-800">{caseItem.legalArea}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* BLOQUE B: ALERTAS PROCESALES INMEDIATAS (TÉRMINOS FATALES Y AUDIENCIAS) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Alerta de Término Fatal */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-800">
                      <Clock className="w-4 h-4 text-slate-600" />
                      <span>Próximo Término Perentorio</span>
                    </div>
                    {nextDeadline && (() => {
                      const diff = getDeadlineDiffDays(nextDeadline.dueDate);
                      if (diff < 0) {
                        return (
                          <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded-full font-black animate-pulse">
                            VENCIDO HACE {Math.abs(diff)} DÍAS
                          </span>
                        );
                      }
                      if (diff === 0) {
                        return (
                          <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded-full font-black animate-pulse">
                            ¡VENCE HOY!
                          </span>
                        );
                      }
                      if (diff <= 3) {
                        return (
                          <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-extrabold">
                            ¡VENCE EN {diff} DÍAS!
                          </span>
                        );
                      }
                      return (
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                          En {diff} días
                        </span>
                      );
                    })()}
                  </div>

                  {nextDeadline ? (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-slate-900">{nextDeadline.description}</span>
                        <PriorityBadge priority={nextDeadline.priority} />
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-between">
                        <span>Vencimiento: <strong className="font-mono text-slate-800">{nextDeadline.dueDate}</strong></span>
                        <span>Resp: <strong className="text-slate-800">{nextDeadline.responsible}</strong></span>
                      </div>
                      {nextDeadline.notes && (
                        <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded border border-slate-100">
                          {nextDeadline.notes}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 text-xs text-emerald-800 flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-bold text-emerald-900">Sin plazos fatales pendientes</div>
                        <p className="text-[11px] text-emerald-700 mt-0.5">Todos los términos del expediente se encuentran al día.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">Total plazos registrados: {deadlines.length}</span>
                  <button
                    onClick={() => setActiveTab('deadlines')}
                    className="font-bold text-slate-900 hover:text-blue-600 transition inline-flex items-center gap-1 text-[11px]"
                  >
                    <span>Ver todos los plazos &rarr;</span>
                  </button>
                </div>
              </div>

              {/* Alerta de Próxima Audiencia */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-800">
                      <Gavel className="w-4 h-4 text-slate-600" />
                      <span>Próxima Diligencia / Audiencia</span>
                    </div>
                    {nextHearing && (
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold">
                        {nextHearing.type}
                      </span>
                    )}
                  </div>

                  {nextHearing ? (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-slate-900">{nextHearing.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                          {nextHearing.mode}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <strong>{nextHearing.date}</strong> a las <strong>{nextHearing.time || 'Hora por definir'}</strong>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{nextHearing.location}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2.5">
                      <Calendar className="w-5 h-5 text-slate-400 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-800">Sin audiencias programadas</div>
                        <p className="text-[11px] text-slate-500 mt-0.5">Expediente a la espera de auto judicial de convocatoria.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">Total audiencias: {hearings.length}</span>
                  <button
                    onClick={() => setActiveTab('hearings')}
                    className="font-bold text-slate-900 hover:text-blue-600 transition inline-flex items-center gap-1 text-[11px]"
                  >
                    <span>Ver todas las audiencias &rarr;</span>
                  </button>
                </div>
              </div>
            </div>

            {/* BLOQUE C: RESUMEN FINANCIERO EJECUTIVO (HONORARIOS Y RECAUDACIÓN) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-slate-700" />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Resumen Financiero del Expediente
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('finances')}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Gestionar Honorarios &rarr;</span>
                </button>
              </div>

              {feeAgreements.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Total Pactado</span>
                      <p className="font-mono font-black text-sm text-slate-900 mt-1">
                        $ {totalAgreed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                      <span className="text-emerald-700 font-bold uppercase text-[10px]">Cobrado / Recaudado</span>
                      <p className="font-mono font-black text-sm text-emerald-800 mt-1">
                        $ {totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80">
                      <span className="text-amber-700 font-bold uppercase text-[10px]">Saldo Pendiente</span>
                      <p className="font-mono font-black text-sm text-amber-900 mt-1">
                        $ {totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Tasa de Cobranza</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono font-black text-sm text-slate-900">{collectionPercentage}%</span>
                        <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${collectionPercentage === 100 ? 'bg-emerald-500' : 'bg-slate-900'}`}
                            style={{ width: `${Math.min(100, collectionPercentage)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="text-slate-600">
                    <p className="font-semibold text-slate-800">No se ha establecido un acuerdo formal de honorarios para este caso.</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Registre el contrato o pacto de honorarios para llevar el control de facturación y cobro.</p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('finances');
                      setShowNewAgreementModal(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-xs shrink-0"
                  >
                    + Pactar Honorarios
                  </button>
                </div>
              )}
            </div>

            {/* BLOQUE D: OBJETO DE LA CONTROVERSIA, CUANTÍA Y RESUMEN JURÍDICO */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-700" />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Objeto de la Controversia y Pretensiones
                  </h3>
                </div>
                {caseItem.description && (
                  <button
                    onClick={handleCopyDescription}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition"
                  >
                    {copiedDescription ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedDescription ? 'Copiado' : 'Copiar Síntesis'}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Vía / Tipo de Trámite</span>
                  <p className="font-bold text-slate-900 mt-1">{caseItem.processType}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Cuantía Determinada</span>
                  <p className="font-mono font-bold text-slate-900 mt-1">
                    {caseItem.claimAmount || 'Indeterminada'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Fecha de Presentación / Hechos</span>
                  <p className="font-mono font-bold text-slate-900 mt-1">{caseItem.startDate}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2">Fundamentación Jurídica y Hechos de la Demanda</h4>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-line font-normal">
                  {caseItem.description || 'Sin resumen registrado para este caso.'}
                </div>
              </div>
            </div>

            {/* BLOQUE E: CARÁTULA OFICIAL PARA ESCRITOS JUDICIALES */}
            <div className="bg-slate-900 rounded-2xl p-6 text-white space-y-3 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                    Encabezado Formal para Escritos Procesales (Word)
                  </h4>
                </div>
                <button
                  onClick={handleCopyCaratula}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
                    copiedCaratula
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  }`}
                >
                  {copiedCaratula ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCaratula ? '¡Copiado al Portapapeles!' : 'Copiar Carátula'}</span>
                </button>
              </div>

              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 leading-relaxed overflow-x-auto space-y-1">
                <div>SEÑOR(A) JUEZ(A) DE LA {caseItem.courtName ? caseItem.courtName.toUpperCase() : 'UNIDAD JUDICIAL'}</div>
                <div>JUICIO No.: <span className="text-amber-400 font-bold">{caseItem.judicialProcessNumber || caseItem.caseNumber}</span></div>
                <div>ACTOR: {caseItem.clientName}{client?.identification ? ` (C.C./RUC: ${client.identification})` : ''}</div>
                <div>DEMANDADO: {caseItem.opposingParty || 'CONTRAPARTE POR DETERMINAR'}</div>
                <div>MATERIA / VÍA: {caseItem.legalArea.toUpperCase()} - {caseItem.processType.toUpperCase()}</div>
                <div>CUANTÍA: {caseItem.claimAmount || 'INDETERMINADA'}</div>
                <div>ABOGADO PATROCINADOR: {caseItem.assignedLawyer.toUpperCase()}</div>
                <div>CASILLERO / CONTACTO: {client?.email || 'defensa@despacho.ec'}</div>
              </div>
            </div>
          </div>
        )}

        {/* 2. PLAZOS PROCESALES */}
        {activeTab === 'deadlines' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Plazos Procesales Vinculados ({deadlines.length})
                </h3>
                <p className="text-xs text-slate-500">Control estricto de términos procesales perentorios</p>
              </div>
              <button
                onClick={() => onOpenNewDeadline(caseItem.id)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span> Registrar Plazo</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {deadlines.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No existen plazos procesales configurados para este caso.
                </div>
              ) : (
                deadlines.map((dl) => (
                  <div key={dl.id} className="p-4 hover:bg-slate-50 transition flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <PriorityBadge priority={dl.priority} />
                        <span className="text-xs font-bold text-slate-900">{dl.description}</span>
                      </div>
                      <p className="text-xs text-slate-500">Responsable: {dl.responsible}</p>
                      {dl.notes && <p className="text-[11px] text-amber-900 bg-amber-50/70 p-1.5 rounded border border-amber-200">{dl.notes}</p>}
                    </div>
                    <DeadlineBadge dueDate={dl.dueDate} status={dl.status} />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 3. AUDIENCIAS */}
        {activeTab === 'hearings' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Audiencias y Citas Judiciales ({hearings.length})
                </h3>
                <p className="text-xs text-slate-500">Diligencias de juzgado asociadas a la causa</p>
              </div>
              <button
                onClick={() => onOpenNewHearing(caseItem.id)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span> Programar Audiencia</span>
              </button>
            </div>

            <div className="space-y-3">
              {hearings.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs border border-slate-200 rounded-xl">
                  No hay audiencias programadas para este expediente.
                </div>
              ) : (
                hearings.map((h) => (
                  <div key={h.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900">{h.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                          {h.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <strong>{h.date}</strong> a las <strong>{h.time}</strong> &bull; {h.location}
                      </p>
                    </div>
                    <StatusBadge status={h.status} />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 4. TAREAS */}
        {activeTab === 'tasks' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Tareas y Actividades Pendientes ({tasks.length})
                </h3>
              </div>
              <button
                onClick={() => onOpenNewTask(caseItem.id)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span> Crear Tarea</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {tasks.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">Sin tareas pendientes.</div>
              ) : (
                tasks.map((t) => (
                  <div key={t.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition">
                    <div className="flex items-center gap-3">
                      <button onClick={() => onToggleTask(t.id)} className="text-slate-300 hover:text-emerald-600 transition">
                        <CheckCircle2 className={`w-5 h-5 ${t.status === 'Completada' ? 'text-emerald-600 fill-emerald-100' : ''}`} />
                      </button>
                      <div>
                        <span className={`text-xs font-bold text-slate-900 ${t.status === 'Completada' ? 'line-through text-slate-400' : ''}`}>
                          {t.title}
                        </span>
                        <p className="text-[11px] text-slate-500">Vence: {t.dueDate} &bull; Asignado: {t.assignedTo}</p>
                      </div>
                    </div>
                    <PriorityBadge priority={t.priority} showIcon={false} />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 5. DOCUMENTOS */}
        {activeTab === 'documents' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Expediente Documental ({documents.length})</h3>
                <p className="text-xs text-slate-500 mt-0.5">Piezas procesales con control de versiones y almacenamiento seguro</p>
              </div>
              <button
                onClick={() => onOpenNewDocument(caseItem.id)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span> Registrar Documento</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
              {documents.length === 0 ? (
                <div className="p-6 text-center text-slate-400">Sin documentos registrados en este expediente.</div>
              ) : (
                documents.map((doc) => {
                  const currentVer = doc.latestVersion?.versionNumber || (doc.versions && doc.versions.length ? doc.versions[0].versionNumber : 1);
                  const downloadUrl = doc.fileUrl || doc.latestVersion?.fileUrl;

                  return (
                    <div key={doc.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-700 shrink-0" />
                          <span className="font-bold text-slate-900">{doc.name}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">{doc.type}</span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            v{currentVer}
                          </span>
                          {(doc.versionCount && doc.versionCount > 1) && (
                            <span className="text-[10px] text-slate-400">
                              ({doc.versionCount} versiones)
                            </span>
                          )}
                        </div>
                        {doc.description && (
                          <p className="text-[11px] text-slate-500">{doc.description}</p>
                        )}
                        {doc.latestVersion?.fileName && (
                          <p className="text-[10px] text-slate-400 font-mono">
                            Archivo: {doc.latestVersion.fileName} • {doc.latestVersion.fileSize ? `${(doc.latestVersion.fileSize / 1024).toFixed(1)} KB` : ''}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {downloadUrl && (
                          <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition"
                            title="Descargar archivo"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-500" />
                            <span>Descargar</span>
                          </a>
                        )}
                        <StatusBadge status={doc.status} size="sm" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 6. CRONOLOGÍA PROCESAL */}
        {activeTab === 'timeline' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Línea de Tiempo Procesal y Cronología del Caso
                </h3>
                <p className="text-xs text-slate-500">Historial secuencial de acontecimientos importantes</p>
              </div>

              <button
                onClick={() => setShowAddActivityModal(true)}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span> Registrar Actividad</span>
              </button>
            </div>

            <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 py-2">
              {activities.length === 0 ? (
                <div className="pl-6 text-xs text-slate-400">No hay actividades registradas en la cronología.</div>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="relative pl-6">
                    <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-slate-900 border-2 border-white shadow-xs" />
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-900">{act.title}</span>
                        <span className="text-[10px] font-mono text-slate-800 bg-slate-200/80 px-2 py-0.5 rounded border border-slate-300 font-semibold">
                          {act.date}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{act.description}</p>
                      <div className="text-[10px] text-slate-400 pt-1 font-semibold">
                        Registrado por: {act.performedBy}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 7. HONORARIOS PROFESIONALES Y PAGOS */}
        {activeTab === 'finances' && (
          <div className="space-y-6">
            {/* Finances Header */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Convenios de Honorarios y Liquidación de Pagos
                </h3>
                <p className="text-xs text-slate-500">
                  Control económico del caso, cuotas pactadas, recaudación y saldos pendientes
                </p>
              </div>

              <button
                onClick={() => setShowNewAgreementModal(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-xs shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Convenio de Honorarios</span>
              </button>
            </div>

            {/* Financial Overview KPIs */}
            {(() => {
              const totalAgreed = feeAgreements.reduce((sum, a) => sum + (a.total || 0), 0);
              const totalPaid = feeAgreements.reduce((sum, a) => sum + (a.paidAmount || 0), 0);
              const totalBalance = Math.round((totalAgreed - totalPaid) * 100) / 100;
              return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Pactado</div>
                    <div className="text-2xl font-black text-slate-900 mt-1">
                      ${totalAgreed.toFixed(2)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      En {feeAgreements.length} convenio{feeAgreements.length === 1 ? '' : 's'}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
                    <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Total Recaudado</div>
                    <div className="text-2xl font-black text-emerald-700 mt-1">
                      ${totalPaid.toFixed(2)}
                    </div>
                    <div className="text-[11px] text-emerald-600/80 mt-1">
                      {totalAgreed > 0 ? `${((totalPaid / totalAgreed) * 100).toFixed(0)}% cobrado` : 'Sin cuotas'}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
                    <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Saldo Pendiente</div>
                    <div className="text-2xl font-black text-amber-700 mt-1">
                      ${totalBalance.toFixed(2)}
                    </div>
                    <div className="text-[11px] text-amber-600/80 mt-1">
                      Por liquidar por el cliente
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Agreements List */}
            <div className="space-y-4">
              {isLoadingAgreements ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                  Cargando acuerdos económicos...
                </div>
              ) : feeAgreements.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-3">
                  <DollarSign className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">
                    No se han registrado convenios de honorarios para este expediente.
                  </p>
                  <button
                    onClick={() => setShowNewAgreementModal(true)}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition"
                  >
                    Crear Primer Convenio
                  </button>
                </div>
              ) : (
                feeAgreements.map((agreement) => {
                  const isCancelled = agreement.status === 'CANCELLED';

                  return (
                    <div
                      key={agreement.id}
                      className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden"
                    >
                      {/* Agreement Card Header */}
                      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                              REF: {agreement.id}
                            </span>
                            <span className="text-xs font-bold text-slate-900">{agreement.title}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {agreement.billingType === 'FIXED_FEE' ? 'Tarifa Fija' :
                               agreement.billingType === 'HOURLY' ? 'Por Horas' :
                               agreement.billingType === 'RETAINER' ? 'Retainer / Iguala' :
                               agreement.billingType === 'SUCCESS_FEE' ? 'Cuota Litis' : 'Mixto'}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                                agreement.status === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : agreement.status === 'COMPLETED'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : agreement.status === 'CANCELLED'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                              }`}
                            >
                              {agreement.status}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                                agreement.paymentStatus === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : agreement.paymentStatus === 'PARTIALLY_PAID'
                                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                                  : 'bg-rose-100 text-rose-800 border-rose-300'
                              }`}
                            >
                              {agreement.paymentStatus === 'PAID'
                                ? 'PAGADO TOTAL'
                                : agreement.paymentStatus === 'PARTIALLY_PAID'
                                ? 'ABONO PARCIAL'
                                : 'PENDIENTE DE PAGO'}
                            </span>
                          </div>
                          {agreement.description && (
                            <p className="text-xs text-slate-500">{agreement.description}</p>
                          )}
                        </div>

                        {/* Agreement Financial Bar */}
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Total / Saldo</div>
                            <div className="text-xs font-mono">
                              <span className="font-extrabold text-slate-900">${agreement.total.toFixed(2)}</span>
                              <span className="text-slate-400 mx-1">/</span>
                              <span className={`font-black ${agreement.balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                ${agreement.balance.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {!isCancelled && agreement.balance > 0 && (
                            <button
                              onClick={() => handleOpenPaymentModal(agreement)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-xs"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Registrar Pago</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Items Breakdown Table */}
                      <div className="p-5 border-b border-slate-100 space-y-2">
                        <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                          Conceptos y Rubros Pactados
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-slate-400 border-b border-slate-100 text-left">
                                <th className="py-1.5 font-bold">Concepto</th>
                                <th className="py-1.5 font-bold">Categoría</th>
                                <th className="py-1.5 font-bold text-center">Cant.</th>
                                <th className="py-1.5 font-bold text-right">P. Unitario</th>
                                <th className="py-1.5 font-bold text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {(agreement.items || []).map((item, idx) => (
                                <tr key={item.id || idx} className="text-slate-700">
                                  <td className="py-2 font-medium">{item.description}</td>
                                  <td className="py-2 text-[10px] font-mono text-slate-500 uppercase">{item.category || 'HONORARIOS'}</td>
                                  <td className="py-2 text-center">{item.quantity}</td>
                                  <td className="py-2 text-right font-mono">${item.unitPrice.toFixed(2)}</td>
                                  <td className="py-2 text-right font-mono font-bold text-slate-900">${item.totalPrice.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Recorded Payments List */}
                      <div className="p-5 bg-slate-50/50 space-y-2">
                        <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                          <span>Historial de Pagos y Abonos Registrados ({agreement.payments?.length || 0})</span>
                          <span className="text-xs font-mono font-bold text-emerald-700">
                            Total Pagado: ${agreement.paidAmount.toFixed(2)}
                          </span>
                        </div>

                        {(!agreement.payments || agreement.payments.length === 0) ? (
                          <p className="text-xs text-slate-400 py-2">
                            Aún no se registran pagos en este convenio.
                          </p>
                        ) : (
                          <div className="space-y-2 pt-1">
                            {agreement.payments.map((p) => (
                              <div
                                key={p.id}
                                className="bg-white p-3 rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="font-bold text-slate-900">${p.amount.toFixed(2)}</span>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                      {p.paymentMethod || p.method || 'TRANSFERENCIA'}
                                    </span>
                                    {p.reference && (
                                      <span className="text-[10px] font-mono text-slate-500">
                                        Ref: {p.reference}
                                      </span>
                                    )}
                                  </div>
                                  {p.notes && (
                                    <p className="text-[11px] text-slate-500 pl-5.5">{p.notes}</p>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono text-right shrink-0">
                                  {p.paidAt ? p.paidAt.split('T')[0] : 'Fecha no registrada'}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal for Appending Timeline Activity */}
      {showAddActivityModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-extrabold text-slate-900">Registrar Evento en la Cronología</h3>
            <form onSubmit={handleCreateActivity} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Evento</label>
                <select
                  value={activityForm.type}
                  onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="Notificación">Notificación Recepcionada</option>
                  <option value="Presentación Escrito">Presentación de Escrito</option>
                  <option value="Llamada">Llamada / Contacto Cliente</option>
                  <option value="Reunión">Reunión de Coordinación</option>
                  <option value="Audiencia">Diligencia / Audiencia</option>
                  <option value="Nota Interna">Nota Confidencial Interna</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Título del Evento *</label>
                <input
                  type="text"
                  required
                  value={activityForm.title}
                  onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                  placeholder="Ej. Ingreso de escrito con pruebas documentales"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción</label>
                <textarea
                  rows={3}
                  value={activityForm.description}
                  onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                  placeholder="Detalles sobre la providencia, fe de recepción o notas..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddActivityModal(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs"
                >
                  Guardar en Cronología
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nuevo Convenio de Honorarios */}
      {showNewAgreementModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-extrabold text-slate-900">Nuevo Convenio de Honorarios</h3>
            <form onSubmit={handleCreateAgreement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Título del Convenio *</label>
                <input
                  type="text"
                  required
                  value={agreementForm.title}
                  onChange={(e) => setAgreementForm({ ...agreementForm, title: e.target.value })}
                  placeholder="Ej. Patrocinio Integral de Demanda Laboral"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Modalidad de Facturación</label>
                  <select
                    value={agreementForm.billingType}
                    onChange={(e) => setAgreementForm({ ...agreementForm, billingType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="FIXED_FEE">Tarifa Fija / Suma Global</option>
                    <option value="HOURLY">Por Horas Dedicadas</option>
                    <option value="RETAINER">Retainer / Iguala Mensual</option>
                    <option value="SUCCESS_FEE">Cuota Litis / Éxito</option>
                    <option value="MIXED">Mixto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Moneda</label>
                  <input
                    type="text"
                    disabled
                    value={agreementForm.currency}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción / Alcance</label>
                <textarea
                  rows={2}
                  value={agreementForm.description}
                  onChange={(e) => setAgreementForm({ ...agreementForm, description: e.target.value })}
                  placeholder="Detalles sobre los servicios incluidos, instancias o condiciones especiales..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Items Section */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">Conceptos Económicos *</label>
                  <button
                    type="button"
                    onClick={handleAddItemToForm}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Concepto</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {agreementForm.items.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Descripción del concepto (ej. Elaboración de escrito judicial)"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                        />
                        {agreementForm.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemFromForm(idx)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold">Categoría</label>
                          <select
                            value={item.category}
                            onChange={(e) => handleItemChange(idx, 'category', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                          >
                            <option value="HONORARIOS">Honorarios</option>
                            <option value="GASTOS_PROCESALES">Gastos Procesales</option>
                            <option value="VIATICOS">Viáticos</option>
                            <option value="TASAS_JUDICIALES">Tasas Judiciales</option>
                            <option value="PERITAJE">Peritaje</option>
                            <option value="OTRO">Otro</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold">Cantidad</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold">P. Unitario ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-right font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 text-right">
                  <span className="text-xs text-slate-500 font-bold">Total Estimado: </span>
                  <span className="text-sm font-black text-slate-900 font-mono">
                    ${agreementForm.items.reduce((s, it) => s + (it.quantity * it.unitPrice), 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewAgreementModal(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAgreement}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs"
                >
                  {isSubmittingAgreement ? 'Creando Convenio...' : 'Crear Convenio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Pago / Abono */}
      {showPaymentModal && selectedAgreementForPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-extrabold text-slate-900">Registrar Pago de Honorarios</h3>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
              <div className="font-bold text-slate-900">{selectedAgreementForPayment.title}</div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Total Convenio: <strong>${selectedAgreementForPayment.total.toFixed(2)}</strong></span>
                <span>Saldo Pendiente: <strong className="text-amber-700 font-mono">${selectedAgreementForPayment.balance.toFixed(2)}</strong></span>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Monto a Pagar ($) *</label>
                  <button
                    type="button"
                    onClick={() => setPaymentForm({ ...paymentForm, amount: String(selectedAgreementForPayment.balance) })}
                    className="text-[10px] text-blue-600 hover:underline font-bold"
                  >
                    Pagar Saldo Completo
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  max={selectedAgreementForPayment.balance}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Método de Pago</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TARJETA">Tarjeta de Débito / Crédito</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="DEPOSITO">Depósito Bancario</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nº Comprobante / Ref</label>
                  <input
                    type="text"
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                    placeholder="Ej. DEP-94812"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha de Pago</label>
                  <input
                    type="date"
                    required
                    value={paymentForm.paidAt}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paidAt: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones / Notas</label>
                <textarea
                  rows={2}
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Detalles sobre el pago o recibo..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs flex items-center gap-1.5"
                >
                  {isSubmittingPayment ? 'Registrando Pago...' : 'Registrar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cierre Formal (Fase 8) */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Cierre Formal del Expediente</h3>
                  <p className="text-xs text-slate-500">Auditoría previa y formalización de término</p>
                </div>
              </div>
              <button
                onClick={() => setShowCloseModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {isLoadingClosureCheck ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Verificando estado operativo y financiero del expediente...
              </div>
            ) : (
              <form onSubmit={handleConfirmClose} className="space-y-4">
                {closureError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                    {closureError}
                  </div>
                )}

                {closureCheck && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Tareas Pendientes</span>
                        <p className={`font-bold text-sm ${closureCheck.summary.pendingTasksCount > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                          {closureCheck.summary.pendingTasksCount}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Plazos Procesales</span>
                        <p className={`font-bold text-sm ${closureCheck.summary.pendingDeadlinesCount > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                          {closureCheck.summary.pendingDeadlinesCount}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Audiencias Prog.</span>
                        <p className={`font-bold text-sm ${closureCheck.summary.upcomingHearingsCount > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                          {closureCheck.summary.upcomingHearingsCount}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Saldo Pendiente</span>
                        <p className={`font-bold text-sm ${closureCheck.summary.outstandingBalance > 0 ? 'text-indigo-600' : 'text-emerald-600'}`}>
                          ${closureCheck.summary.outstandingBalance.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {closureCheck.warnings.length > 0 && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Advertencias Informativas (No impiden el cierre):</span>
                        </div>
                        <ul className="list-disc list-inside text-[11px] text-amber-700 space-y-0.5">
                          {closureCheck.warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo del Cierre *</label>
                  <select
                    value={closureForm.reason}
                    onChange={(e) => setClosureForm({ ...closureForm, reason: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                    required
                  >
                    <option value="Sentencia favorable">Sentencia favorable</option>
                    <option value="Sentencia condenatoria / desfavorable">Sentencia desfavorable</option>
                    <option value="Conciliación o mediación">Conciliación o mediación</option>
                    <option value="Desistimiento de la acción">Desistimiento de la acción</option>
                    <option value="Caducidad / Prescripción">Caducidad / Prescripción</option>
                    <option value="Cierre ordinario de causa">Cierre ordinario de causa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones / Notas de Cierre</label>
                  <textarea
                    rows={3}
                    value={closureForm.notes}
                    onChange={(e) => setClosureForm({ ...closureForm, notes: e.target.value })}
                    placeholder="Detalles procesales sobre la resolución final, número de foja, etc..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCloseModal(false)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    disabled={isSubmittingClosure}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingClosure}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isSubmittingClosure ? 'Cerrando...' : 'Confirmar Cierre Formal'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Archivado Definitivo (Fase 8) */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Archivado del Expediente</h3>
                  <p className="text-xs text-slate-500">Traslado al archivo pasivo permanente</p>
                </div>
              </div>
              <button
                onClick={() => setShowArchiveModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleConfirmArchive} className="space-y-4">
              {closureError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  {closureError}
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed">
                El expediente debe estar formalmente cerrado. El archivado no borra ningún documento ni registro, manteniéndolo accesible en modo de solo consulta histórica.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo / Ubicación de Archivo</label>
                <input
                  type="text"
                  required
                  value={archiveForm.reason}
                  onChange={(e) => setArchiveForm({ ...archiveForm, reason: e.target.value })}
                  placeholder="Ej. Traslado a archivo pasivo definitivo - Casillero B12"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowArchiveModal(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  disabled={isSubmittingClosure}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClosure}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold text-xs transition flex items-center gap-1.5"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>{isSubmittingClosure ? 'Archivando...' : 'Confirmar Archivado'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
