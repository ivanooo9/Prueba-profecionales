import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { DentalConsent, DentalConsentTemplate, DentalTreatmentPlan } from '../../types';
import { dentistryApi } from '../../services/api/dentistryApi';
import { dentalService } from '../../services/dentalService';
import { FileText, Sparkles, Check, AlertCircle } from 'lucide-react';

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  consentToEdit?: DentalConsent | null;
  onSaved: () => void;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({
  isOpen,
  onClose,
  patientId,
  consentToEdit,
  onSaved,
}) => {
  const [templates, setTemplates] = useState<DentalConsentTemplate[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<DentalTreatmentPlan[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    consentToEdit?.templateId || null
  );
  const [title, setTitle] = useState(consentToEdit?.title || '');
  const [content, setContent] = useState(consentToEdit?.contentSnapshot || '');
  const [treatmentPlanId, setTreatmentPlanId] = useState<number | null>(
    consentToEdit?.treatmentPlanId || null
  );
  const [treatmentItemId, setTreatmentItemId] = useState<number | null>(
    consentToEdit?.treatmentItemId || null
  );
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orgId = dentalService.getOrganizationId() || 11;
  const numPatientId = parseInt(patientId, 10);

  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    if (consentToEdit) {
      setTitle(consentToEdit.title);
      setContent(consentToEdit.contentSnapshot);
      setSelectedTemplateId(consentToEdit.templateId || null);
      setTreatmentPlanId(consentToEdit.treatmentPlanId || null);
      setTreatmentItemId(consentToEdit.treatmentItemId || null);
    } else {
      setTitle('');
      setContent('');
      setSelectedTemplateId(null);
      setTreatmentPlanId(null);
      setTreatmentItemId(null);
    }

    // Cargar plantillas activas
    setIsLoadingTemplates(true);
    dentistryApi
      .getConsentTemplates(orgId, { isActive: true })
      .then((data) => setTemplates(data))
      .catch((err) => console.error('Error al cargar plantillas:', err))
      .finally(() => setIsLoadingTemplates(false));

    // Cargar planes de tratamiento si es paciente real
    if (!isNaN(numPatientId)) {
      dentistryApi
        .getTreatmentPlans(orgId, numPatientId)
        .then((plans) => setTreatmentPlans(plans))
        .catch((err) => console.error('Error al cargar planes de tratamiento:', err));
    }
  }, [isOpen, consentToEdit, orgId, numPatientId, patientId]);

  const handleSelectTemplate = (templateIdNum: number) => {
    setSelectedTemplateId(templateIdNum);
    const tmpl = templates.find((t) => t.id === templateIdNum);
    if (tmpl) {
      setTitle(tmpl.name);
      setContent(tmpl.content);
    }
  };

  const selectedPlan = treatmentPlans.find((p) => p.id === treatmentPlanId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('El título y el contenido son obligatorios.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (consentToEdit) {
        // Editar borrador
        await dentistryApi.updateConsentDraft(orgId, consentToEdit.id, {
          title: title.trim(),
          content: content.trim(),
          treatmentPlanId: treatmentPlanId || null,
          treatmentItemId: treatmentItemId || null,
        });
      } else {
        // Crear nuevo consentimiento
        await dentistryApi.createConsent(orgId, {
          patientId: numPatientId,
          templateId: selectedTemplateId,
          title: title.trim(),
          content: content.trim(),
          treatmentPlanId: treatmentPlanId || null,
          treatmentItemId: treatmentItemId || null,
        });
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Error al guardar consentimiento:', err);
      setError(err.message || 'Error al guardar el consentimiento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={consentToEdit ? 'Editar Borrador de Consentimiento' : 'Nuevo Consentimiento Informado'}
      subtitle="Generación estructurada con congelamiento de contenido e identidad"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!consentToEdit && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
              Seleccionar Plantilla Predefinida
            </label>
            <select
              value={selectedTemplateId || ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : null;
                if (val) handleSelectTemplate(val);
                else setSelectedTemplateId(null);
              }}
              className="w-full text-xs border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              disabled={isLoadingTemplates}
            >
              <option value="">-- Redacción personalizada o desde plantilla --</option>
              {templates.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.name} (v{tmpl.version}) {tmpl.category ? `· [${tmpl.category}]` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Título del Consentimiento *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Consentimiento para Extracción Quirúrgica de Terceros Molares"
            className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Plan de Tratamiento (Opcional)
            </label>
            <select
              value={treatmentPlanId || ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : null;
                setTreatmentPlanId(val);
                setTreatmentItemId(null);
              }}
              className="w-full text-xs border border-slate-300 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">-- Ninguno o General --</option>
              {treatmentPlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} (${p.totalEstimated?.toFixed(2) || '0.00'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Procedimiento Específico (Opcional)
            </label>
            <select
              value={treatmentItemId || ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : null;
                setTreatmentItemId(val);
              }}
              disabled={!treatmentPlanId}
              className="w-full text-xs border border-slate-300 rounded-xl p-2.5 bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">-- Todo el plan o ninguno --</option>
              {selectedPlan?.items?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.procedureName} {item.toothNumber ? `(Pieza #${item.toothNumber})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
            <span>Texto del Consentimiento Informado (Snapshot Inmutable) *</span>
            <span className="text-[10px] text-slate-400 font-normal">
              Se congelará de forma permanente al emitir
            </span>
          </label>
          <textarea
            required
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Ingrese el texto completo de información clínica, riesgos, beneficios y alternativas..."
            className="w-full text-xs font-mono border border-slate-300 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 leading-relaxed"
          />
        </div>

        <div className="bg-cyan-50/60 p-3 rounded-xl border border-cyan-100 text-[11px] text-cyan-800">
          <p className="font-semibold mb-0.5">Nota Clínica y Legal:</p>
          <p>
            Al guardar, el consentimiento quedará en estado <strong>DRAFT (Borrador)</strong>.
            Una vez revisado con el paciente, podrá <strong>Emitirlo</strong> para congelar el texto y proceder a la captura de firmas.
          </p>
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
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            {isSubmitting ? 'Guardando...' : consentToEdit ? 'Actualizar Borrador' : 'Guardar Borrador'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
