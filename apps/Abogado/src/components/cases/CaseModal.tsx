import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { LegalCase, Client, LegalArea, CaseStatus, Priority } from '../../types';
import { generateNextCaseCode } from '../../services/caseCode';

export interface CaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (caseData: Omit<LegalCase, 'id' | 'createdAt' | 'updatedAt'>) => void;
  clients: Client[];
  cases: LegalCase[];
  initialCase?: LegalCase | null;
  onOpenNewClientModal?: () => void;
  newlyCreatedClientId?: string | null;
}

export const CaseModal: React.FC<CaseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  clients,
  cases,
  initialCase,
  onOpenNewClientModal,
  newlyCreatedClientId,
}) => {
  const [validationMessage, setValidationMessage] = useState('');
  const [formData, setFormData] = useState({
    caseNumber: '',
    title: '',
    clientId: '',
    clientName: '',
    processType: 'Ordinario Civil',
    legalArea: 'Civil' as LegalArea,
    status: 'Nuevo' as CaseStatus,
    priority: 'Media' as Priority,
    assignedLawyer: 'Dr. Alejandro Benítez',
    courtName: '',
    judgeName: '',
    startDate: new Date().toISOString().split('T')[0],
    expectedEndDate: '',
    claimAmount: '',
    description: '',
  });

  useEffect(() => {
    if (initialCase) {
      setFormData({
        caseNumber: initialCase.caseNumber,
        title: initialCase.title,
        clientId: initialCase.clientId,
        clientName: initialCase.clientName,
        processType: initialCase.processType,
        legalArea: initialCase.legalArea,
        status: initialCase.status,
        priority: initialCase.priority,
        assignedLawyer: initialCase.assignedLawyer,
        courtName: initialCase.courtName,
        judgeName: initialCase.judgeName || '',
        startDate: initialCase.startDate,
        expectedEndDate: initialCase.expectedEndDate || '',
        claimAmount: initialCase.claimAmount || '',
        description: initialCase.description,
      });
    } else {
      setFormData({
        caseNumber: generateNextCaseCode(cases),
        title: '',
        clientId: '',
        clientName: '',
        processType: 'Ordinario Civil',
        legalArea: 'Civil',
        status: 'Nuevo',
        priority: 'Media',
        assignedLawyer: 'Dr. Alejandro Benítez',
        courtName: 'Unidad Judicial Civil del Cantón Quito',
        judgeName: '',
        startDate: new Date().toISOString().split('T')[0],
        expectedEndDate: '',
        claimAmount: '',
        description: '',
      });
    }
  }, [initialCase, isOpen]);

  useEffect(() => {
    if (!newlyCreatedClientId) return;
    const selected = clients.find((client) => client.id === newlyCreatedClientId);
    if (!selected) return;

    setFormData((current) => ({
      ...current,
      clientId: selected.id,
      clientName: selected.name,
    }));
    setValidationMessage('');
  }, [clients, newlyCreatedClientId]);

  const handleClientChange = (clientId: string) => {
    const selected = clients.find((c) => c.id === clientId);
    setFormData({
      ...formData,
      clientId,
      clientName: selected ? selected.name : '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedCaseNumber = formData.caseNumber.trim();
    if (!formData.title || !normalizedCaseNumber) {
      if (!normalizedCaseNumber) {
        setValidationMessage('Debes ingresar un código interno para el caso.');
      }
      return;
    }
    if (!formData.clientId) {
      setValidationMessage('Debes seleccionar o registrar un cliente antes de crear el caso.');
      return;
    }

    const duplicatedCase = cases.some(
      (caseItem) =>
        caseItem.id !== initialCase?.id &&
        caseItem.caseNumber.trim().toLowerCase() === normalizedCaseNumber.toLowerCase(),
    );
    if (duplicatedCase) {
      setValidationMessage('Ya existe un caso con este código interno.');
      return;
    }

    setValidationMessage('');
    onSave({ ...formData, caseNumber: normalizedCaseNumber });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialCase ? 'Editar Expediente Digital' : 'Registrar Nuevo Caso / Expediente'}
      subtitle="Apertura de proceso judicial y asignación de términos"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Case Number & Legal Area */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Código interno del caso *
            </label>
            <input
              type="text"
              value={formData.caseNumber}
              onChange={(e) => setFormData({ ...formData, caseNumber: e.target.value })}
              placeholder="Ej. CAS-2026-0001"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Área Jurídica *
            </label>
            <select
              value={formData.legalArea}
              onChange={(e) => setFormData({ ...formData, legalArea: e.target.value as LegalArea })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              <option value="Civil">Civil</option>
              <option value="Penal">Penal</option>
              <option value="Laboral">Laboral</option>
              <option value="Familia">Familia</option>
              <option value="Mercantil">Mercantil</option>
              <option value="Administrativo">Administrativo</option>
              <option value="Constitucional">Constitucional</option>
            </select>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Título o Carátula del Proceso *
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ej. Impugnación de Glosa Contencioso Administrativo SRI"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Client & Process Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Cliente Asociado *
            </label>
            <select
              aria-required="true"
              value={formData.clientId}
              onChange={(e) => handleClientChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
            >
              <option value="">Seleccionar cliente...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.identification})
                </option>
              ))}
            </select>
            {onOpenNewClientModal && (
              <button
                type="button"
                onClick={onOpenNewClientModal}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                <span>+</span>
                Registrar nuevo cliente
              </button>
            )}
            {validationMessage && (
              <p className="mt-2 text-xs font-semibold text-rose-600" role="alert">
                {validationMessage}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tipo de Trámite / Proceso *
            </label>
            <input
              type="text"
              required
              value={formData.processType}
              onChange={(e) => setFormData({ ...formData, processType: e.target.value })}
              placeholder="Ej. Sumario Laboral, Ordinario Civil, Contencioso"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Court & Judge */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Juzgado / Tribunal o Unidad Judicial
            </label>
            <input
              type="text"
              value={formData.courtName}
              onChange={(e) => setFormData({ ...formData, courtName: e.target.value })}
              placeholder="Ej. Tribunal Distrital de lo Contencioso Administrativo"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Juez o Ponente a Cargo
            </label>
            <input
              type="text"
              value={formData.judgeName}
              onChange={(e) => setFormData({ ...formData, judgeName: e.target.value })}
              placeholder="Ej. Dr. Fernando Salazar"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Status, Priority & Lawyer */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Estado del Caso</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as CaseStatus })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
            >
              <option value="Nuevo">Nuevo</option>
              <option value="En proceso">En proceso</option>
              <option value="En espera">En espera</option>
              <option value="Audiencia">Audiencia</option>
              <option value="Cerrado">Cerrado</option>
              <option value="Archivado">Archivado</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Prioridad Procesal</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
            >
              <option value="Baja">Baja</option>
              <option value="Media">Media</option>
              <option value="Alta">Alta</option>
              <option value="Urgente">Urgente</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Abogado Responsable</label>
            <select
              value={formData.assignedLawyer}
              onChange={(e) => setFormData({ ...formData, assignedLawyer: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            >
              <option value="Dr. Alejandro Benítez">Dr. Alejandro Benítez</option>
              <option value="Dra. Gabriela Paredes">Dra. Gabriela Paredes</option>
            </select>
          </div>
        </div>

        {/* Start Date & Claim Amount */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de Inicio / Demanda</label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Cuantía Reclamada</label>
            <input
              type="text"
              value={formData.claimAmount}
              onChange={(e) => setFormData({ ...formData, claimAmount: e.target.value })}
              placeholder="Ej. $ 245,000.00"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Resumen o Descripción de la Litis
          </label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Detalles sobre pretensiones de la demanda, antecedentes de hecho y pretensión jurídica..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-xs"
          >
            {initialCase ? 'Guardar Cambios' : 'Aperturar Caso'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
