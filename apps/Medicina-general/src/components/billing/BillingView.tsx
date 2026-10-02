import React, { useState } from 'react';
import { CreditCard, DollarSign, FileCheck, CheckCircle2, Clock, Download, Plus, Search } from 'lucide-react';
import { MetricCard } from '../ui/MetricCard';

export const BillingView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const invoices = [
    { id: 'FAC-2026-001', patient: 'María López', date: '2026-08-20 10:30', amount: '$35.00', concept: 'Consulta Medicina General + Receta', paymentMethod: 'Efectivo', sriStatus: 'AUTORIZADO' },
    { id: 'FAC-2026-002', patient: 'Carlos Vega', date: '2026-08-20 11:15', amount: '$45.00', concept: 'Consulta + Certificado Médico', paymentMethod: 'Tarjeta de Débito', sriStatus: 'AUTORIZADO' },
    { id: 'FAC-2026-003', patient: 'Ana Martínez', date: '2026-08-20 12:00', amount: '$70.00', concept: 'Consulta + Interpretación Lab + EKG', paymentMethod: 'Transferencia', sriStatus: 'AUTORIZADO' },
    { id: 'FAC-2026-004', patient: 'Roberto Morales', date: '2026-08-20 14:00', amount: '$35.00', concept: 'Revisión Control Hipertensión', paymentMethod: 'Efectivo', sriStatus: 'PENDIENTE' },
  ];

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.concept.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-sky-600" />
            <span>Gestión de Facturación y Comprobantes SRI</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Emisión de facturas electrónicas, control de caja diaria y validaciones ante el SRI Ecuador.
          </p>
        </div>

        <button className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-2 transition shadow-xs">
          <Plus className="w-4 h-4" />
          <span>Nueva Factura / RIDE</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Ingresos del Día (Hoy)"
          value="$540.00"
          change="+$65.00"
          isPositive={true}
          subtext="14 transacciones completadas"
          icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
        />
        <MetricCard
          title="Ticket Promedio Consulta"
          value="$35.00"
          change="+$2.50"
          isPositive={true}
          subtext="Estándar Medicina General"
          icon={<CreditCard className="w-4 h-4 text-sky-600" />}
        />
        <MetricCard
          title="Comprobantes Autorizados SRI"
          value="13 / 14"
          change="92.8%"
          isPositive={true}
          subtext="1 pendiente de firma"
          icon={<FileCheck className="w-4 h-4 text-teal-600" />}
        />
        <MetricCard
          title="Cobros Pendientes"
          value="$35.00"
          change="1 paciente"
          isPositive={false}
          subtext="Seguimiento de caja"
          icon={<Clock className="w-4 h-4 text-amber-600" />}
        />
      </div>

      {/* Invoices Data Table */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900">
            Registro de Comprobantes del Día
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por paciente o No. Factura..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50">
                <th className="py-3 px-4">No. Comprobante</th>
                <th className="py-3 px-4">Paciente</th>
                <th className="py-3 px-4">Concepto</th>
                <th className="py-3 px-4">Forma de Pago</th>
                <th className="py-3 px-4">Monto</th>
                <th className="py-3 px-4">Estado SRI</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-mono font-bold text-sky-700">{inv.id}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{inv.patient}</td>
                  <td className="py-3 px-4 text-slate-600">{inv.concept}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                      {inv.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">{inv.amount}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        inv.sriStatus === 'AUTORIZADO'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {inv.sriStatus === 'AUTORIZADO' ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Clock className="w-3 h-3 text-amber-600" />
                      )}
                      <span>{inv.sriStatus}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      className="p-1.5 rounded-lg text-slate-600 hover:text-sky-600 hover:bg-sky-50 transition"
                      title="Descargar RIDE / PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
