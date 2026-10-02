import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Client, ClientType, ClientStatus } from '../../types';

export interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void> | void;
  initialClient?: Client | null;
}

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialClient,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    identificationType: 'cedula' as Client['identificationType'],
    identification: '',
    email: '',
    phone: '',
    address: '',
    clientType: 'persona_natural' as ClientType,
    companyName: '',
    companyRuc: '',
    legalRepresentative: '',
    status: 'activo' as ClientStatus,
    notes: '',
  });

  useEffect(() => {
    setErrorMessage(null);
    setIsSubmitting(false);
    if (initialClient) {
      setFormData({
        name: initialClient.name,
        identificationType: initialClient.identificationType,
        identification: initialClient.identification,
        email: initialClient.email,
        phone: initialClient.phone,
        address: initialClient.address,
        clientType: initialClient.clientType,
        companyName: initialClient.companyName || '',
        companyRuc: initialClient.companyRuc || '',
        legalRepresentative: initialClient.legalRepresentative || '',
        status: initialClient.status,
        notes: initialClient.notes || '',
      });
    } else {
      setFormData({
        name: '',
        identificationType: 'cedula',
        identification: '',
        email: '',
        phone: '',
        address: '',
        clientType: 'persona_natural',
        companyName: '',
        companyRuc: '',
        legalRepresentative: '',
        status: 'activo',
        notes: '',
      });
    }
  }, [initialClient, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.identification || isSubmitting) return;
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al registrar el cliente. Por favor intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialClient ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
      subtitle="Complete la información del cliente del despacho jurídico"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
            <span className="font-bold">⚠️ Error:</span>
            <span>{errorMessage}</span>
          </div>
        )}
        {/* Client Type Selector */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, clientType: 'persona_natural', identificationType: 'cedula' })}
            className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
              formData.clientType === 'persona_natural'
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 ring-2 ring-indigo-500/20'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>Persona Natural</span>
            <span className="text-[10px] text-slate-500 font-normal">Cédula o Pasaporte</span>
          </button>

          <button
            type="button"
            onClick={() => setFormData({ ...formData, clientType: 'persona_juridica', identificationType: 'ruc' })}
            className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
              formData.clientType === 'persona_juridica'
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 ring-2 ring-indigo-500/20'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>Persona Jurídica</span>
            <span className="text-[10px] text-slate-500 font-normal">Empresa / RUC Corporativo</span>
          </button>
        </div>

        {/* Basic Data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {formData.clientType === 'persona_natural' ? 'Nombre Completo *' : 'Razón Social *'}
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={formData.clientType === 'persona_natural' ? 'Ej. Dra. María Espinoza' : 'Ej. Constructora Andes Sur S.A.'}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Identificación (Cédula / RUC) *
            </label>
            <div className="flex gap-2">
              <select
                value={formData.identificationType}
                onChange={(e) => setFormData({ ...formData, identificationType: e.target.value as any })}
                className="px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-bold"
              >
                <option value="cedula">Cédula</option>
                <option value="ruc">RUC</option>
                <option value="pasaporte">Pasaporte</option>
              </select>
              <input
                type="text"
                required
                value={formData.identification}
                onChange={(e) => setFormData({ ...formData, identification: e.target.value })}
                placeholder="1792348592001"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Corporate fields if persona_juridica */}
        {formData.clientType === 'persona_juridica' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-indigo-50/40 rounded-xl border border-indigo-100">
            <div>
              <label className="block text-xs font-bold text-indigo-900 mb-1">
                Representante Legal
              </label>
              <input
                type="text"
                value={formData.legalRepresentative}
                onChange={(e) => setFormData({ ...formData, legalRepresentative: e.target.value })}
                placeholder="Ej. Ing. Carlos Mendoza V."
                className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-indigo-900 mb-1">
                Nombre Comercial
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Ej. Andes Sur"
                className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs"
              />
            </div>
          </div>
        )}

        {/* Contact Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="cliente@ejemplo.com"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Teléfono de Contacto
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+593 99 123 4567"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Dirección Domiciliaria / Procesal
          </label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Av. de los Shyris N34-120 y Portugal, Quito"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Observaciones o Notas Confidenciales
          </label>
          <textarea
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Antecedentes del cliente, preferencias de contacto..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? 'Guardando...' : initialClient ? 'Guardar Cambios' : 'Registrar Cliente'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
