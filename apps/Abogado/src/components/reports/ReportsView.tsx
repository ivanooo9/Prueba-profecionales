import React, { useState } from 'react';
import {
  BarChart3,
  Printer,
  Scale,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  RotateCw,
  Clock,
  CheckCircle2,
  FileText,
  Filter,
  Users
} from 'lucide-react';
import { LegalCase, ProceduralDeadline, Hearing, Client, LegalReportsDTO } from '../../types';

export interface ReportsViewProps {
  cases: LegalCase[];
  deadlines: ProceduralDeadline[];
  hearings: Hearing[];
  clients: Client[];
  reportsData?: LegalReportsDTO | null;
  isLoading?: boolean;
  error?: string | null;
  onFilterChange?: (from?: string, to?: string) => void;
  onRefresh?: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  cases,
  deadlines,
  hearings,
  clients,
  reportsData,
  isLoading = false,
  error = null,
  onFilterChange,
  onRefresh,
}) => {
  const [fromDate, setFromDate] = useState<string>(reportsData?.period?.from ? reportsData.period.from.split('T')[0] : '');
  const [toDate, setToDate] = useState<string>(reportsData?.period?.to ? reportsData.period.to.split('T')[0] : '');

  const handlePrint = () => {
    window.print();
  };

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (onFilterChange) {
      onFilterChange(fromDate ? new Date(fromDate).toISOString() : undefined, toDate ? new Date(toDate).toISOString() : undefined);
    }
  };

  const handleClearFilter = () => {
    setFromDate('');
    setToDate('');
    if (onFilterChange) {
      onFilterChange(undefined, undefined);
    }
  };

  // Manejo de Error sin fallback a datos simulados
  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-rose-900">Error al cargar el Reporte Operativo</h3>
            <p className="text-xs text-rose-700">{error}</p>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Reintentar</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Manejo de Loading
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-xl w-1/3"></div>
        <div className="h-16 bg-slate-200 rounded-2xl w-full"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="h-28 bg-slate-200 rounded-2xl"></div>
          <div className="h-28 bg-slate-200 rounded-2xl"></div>
          <div className="h-28 bg-slate-200 rounded-2xl"></div>
          <div className="h-28 bg-slate-200 rounded-2xl"></div>
        </div>
        <div className="h-64 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  // Stock Metrics (autoridad: reportsData si existe, o cálculo derivado de props)
  const activeCasesCount = reportsData ? reportsData.cases.activeStock : cases.filter((c) => c.status !== 'Cerrado' && c.status !== 'Archivado').length;
  const totalClientsCount = reportsData ? reportsData.clients.totalStock : clients.length;
  const pendingDeadlinesCount = reportsData ? reportsData.workload.pendingDeadlines : deadlines.filter((d) => d.status === 'Pendiente' || d.status === 'En progreso').length;
  const overdueDeadlinesCount = reportsData ? reportsData.workload.overdueDeadlines : deadlines.filter((d) => d.status === 'Vencido').length;

  // Flow Metrics en Período
  const createdInPeriod = reportsData?.cases.createdInPeriod ?? 0;
  const completedTasksPeriod = reportsData?.workload.completedInPeriodTasks ?? 0;
  const hearingsPeriod = reportsData?.workload.totalHearingsInPeriod ?? hearings.length;
  const activitiesPeriod = reportsData?.activitiesInPeriod ?? 0;

  // Financial Metrics
  const agreedPeriod = reportsData?.finances.agreedInPeriod ?? 0;
  const collectedPeriod = reportsData?.finances.collectedInPeriod ?? 0;
  const totalOutstandingStock = reportsData?.finances.totalOutstandingStock ?? 0;

  // Legal area distribution
  const areaDistribution: Array<{ legalArea: string; count: number }> = reportsData?.cases?.byLegalArea ?? Object.entries(
    cases.reduce((acc, c) => {
      acc[c.legalArea] = (acc[c.legalArea] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([legalArea, count]) => ({ legalArea, count }));

  const activeCasesList = cases.filter((c) => c.status !== 'Cerrado' && c.status !== 'Archivado');

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-slate-800" />
            Reporte Ejecutivo y Métricas Operativas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Informe consolidado de stock procesal, cumplimiento de términos y flujo financiero del despacho
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
              title="Actualizar datos"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs print:hidden">
        <form onSubmit={handleApplyFilter} className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700">Filtrar Flujo por Período:</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold text-slate-500">Desde:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold text-slate-500">Hasta:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <button
            type="submit"
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition cursor-pointer"
          >
            Aplicar Filtro
          </button>

          {(fromDate || toDate) && (
            <button
              type="button"
              onClick={handleClearFilter}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              Restablecer
            </button>
          )}

          <div className="ml-auto text-[11px] text-slate-400">
            {reportsData?.period?.from || reportsData?.period?.to ? (
              <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Filtro activo: {fromDate || 'Inicio'} → {toDate || 'Hoy'}
              </span>
            ) : (
              <span>Mostrando histórico completo</span>
            )}
          </div>
        </form>
      </div>

      {/* Report Document Box */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6 print:shadow-none print:border-none print:p-0">
        {/* Document Header for Print */}
        <div className="border-b border-slate-200 pb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-900 text-white rounded-2xl">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">ABOGADO PRO - ESTUDIO JURÍDICO</h2>
              <p className="text-xs text-slate-500 font-mono">
                Reporte Consolidado al {new Date().toLocaleDateString('es-EC')}
                {reportsData?.period?.from && ` | Rango: ${new Date(reportsData.period.from).toLocaleDateString('es-EC')} a ${reportsData?.period?.to ? new Date(reportsData.period.to).toLocaleDateString('es-EC') : 'Presente'}`}
              </p>
            </div>
          </div>

          <div className="text-right text-xs">
            <div className="font-bold text-slate-900">Dr. Alejandro Benítez</div>
            <div className="text-slate-500 text-[11px]">Matrícula Foro Abogados #17-2018-94</div>
          </div>
        </div>

        {/* SECTION 1: Stock Metrics (Estado Actual Acumulado) */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-slate-900"></span>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">
              Stock Procesal Acumulado (Estado Actual)
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Casos Activos</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{activeCasesCount}</div>
              <span className="text-[10px] text-slate-500">En litigio / asesoría</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Clientes Totales</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{totalClientsCount}</div>
              <span className="text-[10px] text-slate-500">Registrados en cartera</span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <span className="text-[10px] font-extrabold uppercase text-amber-800">Plazos Pendientes</span>
              <div className="text-2xl font-black text-amber-950 mt-1">{pendingDeadlinesCount}</div>
              <span className="text-[10px] text-amber-700">Por vencer en término</span>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
              <span className="text-[10px] font-extrabold uppercase text-rose-800">Plazos Vencidos</span>
              <div className="text-2xl font-black text-rose-950 mt-1">{overdueDeadlinesCount}</div>
              <span className="text-[10px] text-rose-700">Revisión procesal urgente</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: Flow Metrics in Period */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">
              Flujo Operativo en Período Seleccionado
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
              <span className="text-[10px] font-extrabold uppercase text-blue-800">Casos Nuevos</span>
              <div className="text-2xl font-black text-blue-950 mt-1">{createdInPeriod}</div>
              <span className="text-[10px] text-blue-600">Aperturados en rango</span>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
              <span className="text-[10px] font-extrabold uppercase text-blue-800">Actuaciones</span>
              <div className="text-2xl font-black text-blue-950 mt-1">{activitiesPeriod}</div>
              <span className="text-[10px] text-blue-600">Registradas en expediente</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
              <span className="text-[10px] font-extrabold uppercase text-emerald-800">Tareas Resueltas</span>
              <div className="text-2xl font-black text-emerald-950 mt-1">{completedTasksPeriod}</div>
              <span className="text-[10px] text-emerald-600">Completadas en rango</span>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
              <span className="text-[10px] font-extrabold uppercase text-indigo-800">Audiencias Período</span>
              <div className="text-2xl font-black text-indigo-950 mt-1">{hearingsPeriod}</div>
              <span className="text-[10px] text-indigo-600">Convocadas en término</span>
            </div>
          </div>
        </div>

        {/* SECTION 3: Financial Flow & Balance */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-amber-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
              Rendimiento Económico y Cobranzas
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Honorarios Acordados (Período)</span>
              <div className="text-2xl font-black text-white mt-1">
                ${agreedPeriod.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-400">Contratados en el rango</span>
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase text-emerald-400">Total Recaudado (Período)</span>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                ${collectedPeriod.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-400">Pagos recibidos con fecha efectiva</span>
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase text-amber-400">Saldo Cartera Pendiente (Stock)</span>
              <div className="text-2xl font-black text-amber-400 mt-1">
                ${totalOutstandingStock.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-400">Por cobrar acumulado global</span>
            </div>
          </div>
        </div>

        {/* SECTION 4: Cases Distribution by Legal Area */}
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 mb-3">
            Distribución de Expedientes por Especialidad Jurídica
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {areaDistribution.map((item) => (
              <div key={item.legalArea} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">{item.legalArea}</span>
                <span className="text-xs font-mono font-semibold text-slate-800 bg-slate-200/80 px-2 py-0.5 rounded border border-slate-300">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 5: Detailed Active Cases Table */}
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 mb-3">
            Resumen Procesal de Expedientes Activos
          </h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-black uppercase text-slate-600">
                <tr>
                  <th className="p-3">Expediente</th>
                  <th className="p-3">Título / Demanda</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Área</th>
                  <th className="p-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeCasesList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-400">
                      No hay expedientes activos para mostrar
                    </td>
                  </tr>
                ) : (
                  activeCasesList.map((c) => (
                    <tr key={c.id}>
                      <td className="p-3 font-mono font-semibold text-slate-900">{c.caseNumber}</td>
                      <td className="p-3 font-bold text-slate-900">{c.title}</td>
                      <td className="p-3 font-medium text-slate-700">{c.clientName}</td>
                      <td className="p-3 font-semibold text-slate-600">{c.legalArea}</td>
                      <td className="p-3 font-bold text-slate-800">{c.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Note */}
        <div className="pt-4 border-t border-slate-200 text-center text-xs text-slate-400">
          Documento generado automáticamente por el Sistema Legal Abogado Pro. Confidencial.
        </div>
      </div>
    </div>
  );
};
