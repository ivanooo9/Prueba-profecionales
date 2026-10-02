import React, { useState } from 'react';
import { Settings, Key, User, Building, Save, CheckCircle, ShieldCheck } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-600" />
            <span>Configuración General del Consultorio</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gestión de credenciales médicas, certificado de firma electrónica SRI y personalización de atenciones.
          </p>
        </div>

        {savedSuccess && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Cambios Guardados</span>
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Perfil Profesional del Médico */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <User className="w-4 h-4 text-sky-600" />
            <span>Datos del Profesional Sanitario</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nombre Completo del Médico</label>
              <input
                type="text"
                defaultValue="Dr. Roberto Silva Mendoza"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Especialidad Principal</label>
                <input
                  type="text"
                  defaultValue="Medicina General y Familiar"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Registro MSP / Libro</label>
                <input
                  type="text"
                  defaultValue="174829-MSP-2022"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Correo Electrónico Médico</label>
                <input
                  type="email"
                  defaultValue="roberto.silva@profecionales.med.ec"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Teléfono de Contacto</label>
                <input
                  type="text"
                  defaultValue="+593 99 876 5432"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Firma Electrónica SRI (.p12) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Key className="w-4 h-4 text-teal-600" />
            <span>Firma Electrónica Ecuatoriana (.p12 / SRI)</span>
          </h3>

          <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-teal-900">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              <span>Certificado Validador Activo</span>
            </div>
            <p className="text-[11px] text-teal-800">
              Certificado expedido por Security Data / Banco Central para Dr. Roberto Silva. Válido hasta Octubre 2027.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Archivo de Certificado (.p12 / .pfx)</label>
              <input
                type="file"
                accept=".p12,.pfx"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-600 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contraseña de Firma Digital</label>
              <input
                type="password"
                defaultValue="••••••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Datos de Sede & Consultorio */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Building className="w-4 h-4 text-sky-600" />
            <span>Datos del Consultorio & RUC</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre Comercial Consultorio</label>
                <input
                  type="text"
                  defaultValue="Centro Médico Medicina General"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">RUC Emisor SRI</label>
                <input
                  type="text"
                  defaultValue="1792837492001"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Dirección del Consultorio</label>
              <input
                type="text"
                defaultValue="Av. Amazonas N34-120 y Rep. del Salvador, Piso 3, Of. 302, Quito"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="lg:col-span-2 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-2 transition shadow-md shadow-sky-600/20"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Configuración</span>
          </button>
        </div>
      </form>
    </div>
  );
};
