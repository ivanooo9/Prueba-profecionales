import React from "react";
import { Inbox, ChevronLeft, ChevronRight } from "lucide-react";

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyText?: string;
  onRowClick?: (item: T) => void;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectRow?: (id: string) => void;
  onSelectAll?: () => void;
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  isLoading = false,
  emptyText = "No hay registros disponibles",
  onRowClick,
  page = 1,
  totalPages = 1,
  onPageChange,
  selectable = false,
  selectedIds = [],
  onSelectRow,
  onSelectAll,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-500">Cargando datos clínicos...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <tr>
              {selectable && (
                <th className="px-4 py-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={data.length > 0 && selectedIds.length === data.length}
                    onChange={() => onSelectAll && onSelectAll()}
                    className="rounded border-slate-300 bg-white text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col, idx) => (
                <th key={idx} className={`px-5 py-3.5 ${col.className || ""}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Inbox className="w-9 h-9 stroke-[1.5]" />
                    <p className="text-xs font-medium">{emptyText}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, rowIdx) => {
                const itemId = String(item.id || rowIdx);
                const isSelected = selectedIds.includes(itemId);
                return (
                  <tr
                    key={itemId}
                    onClick={() => onRowClick && onRowClick(item)}
                    className={`hover:bg-slate-50 transition-colors ${
                      isSelected ? "bg-sky-50/60" : ""
                    } ${onRowClick ? "cursor-pointer" : ""}`}
                  >
                    {selectable && (
                      <td className="px-4 py-3.5 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelectRow && onSelectRow(itemId)}
                          className="rounded border-slate-300 bg-white text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map((col, colIdx) => (
                      <td key={colIdx} className={`px-5 py-3.5 ${col.className || ""}`}>
                        {col.cell ? col.cell(item) : col.accessorKey ? String(item[col.accessorKey] ?? "-") : "-"}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && onPageChange && (
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Página <strong className="font-semibold text-slate-800">{page}</strong> de{" "}
            <strong className="font-semibold text-slate-800">{totalPages}</strong>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="p-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="p-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
