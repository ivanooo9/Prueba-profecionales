import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Client, ClientType, ClientStatus } from '../../types';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Partial<Client>) => Promise<void> | void;
  initialData?: Client | null;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Client>>({
    name: '',
    contactPerson: '',
    taxId: '',
    email: '',
    phone: '',
    address: '',
    type: 'Persona',
    status: 'Activo',
    notes: ''
  });

  useEffect(() => {
    setErrorMessage(null);
    setIsSubmitting(false);
    if (initialData) {
      setFormData({ ...initialData });
    } else {
      setFormData({
        name: '',
        contactPerson: '',
        taxId: '',
        email: '',
        phone: '',
        address: '',
        type: 'Persona',
        status: 'Activo',
        notes: ''
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || isSubmitting) return;
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al guardar el cliente. Por favor intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
      subtitle="Ingrese los datos de contacto y facturación del cliente"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
            <span className="font-bold">⚠️ Error:</span>
            <span>{errorMessage}</span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">
              Nombre o Razón Social *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Inmobiliaria Urbano S.A. o Familia Ríos"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tipo de Cliente</label>
            <select
              value={formData.type || 'Persona'}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as ClientType })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            >
              <option value="Persona">Persona Natural</option>
              <option value="Empresa">Empresa / Razón Social</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">RUC / Cédula</label>
            <input
              type="text"
              placeholder="Ej: 1792345678001"
              value={formData.taxId || ''}
              onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Persona de Contacto</label>
            <input
              type="text"
              placeholder="Ej: Ing. Carlos Mendoza"
              value={formData.contactPerson || ''}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Teléfono / WhatsApp</label>
            <input
              type="text"
              placeholder="Ej: +593 99 123 4567"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500 font-mono"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">Correo Electrónico</label>
            <input
              type="email"
              placeholder="cliente@ejemplo.com"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500 font-mono"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">Dirección</label>
            <input
              type="text"
              placeholder="Ej: Av. República del Salvador N34-127, Quito"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Estado</label>
            <select
              value={formData.status || 'Activo'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as ClientStatus })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">Observaciones</label>
            <textarea
              rows={2}
              placeholder="Detalles particulares del cliente..."
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 font-semibold text-white bg-arch-600 hover:bg-arch-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? 'Guardando...' : initialData ? 'Guardar Cambios' : 'Registrar Cliente'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
