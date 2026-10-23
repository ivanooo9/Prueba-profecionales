/**
 * Utilidades centralizadas de fechas para el frontend de ARQ PRO STUDIO.
 * Distingue explícitamente entre:
 * 1. Fecha de calendario ("YYYY-MM-DD" local / neutral)
 * 2. Horas y formateo para interfaz de usuario
 * 3. Cálculos de cuadrícula para vistas de calendario mensual y agenda
 */

const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
];

const DAY_NAMES_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/**
 * Obtiene la fecha actual del sistema del usuario como string de calendario "YYYY-MM-DD".
 * Evita el problema de timezone drift de new Date().toISOString() en horas nocturnas locales.
 */
export function getTodayCalendarDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Determina si un año es bisiesto.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Retorna la cantidad exacta de días de un mes (month es 0-indexed: 0 = Enero, 1 = Febrero, ..., 11 = Diciembre).
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Añade o resta meses a un par { year, month } (month 0-indexed).
 */
export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return {
    year: d.getFullYear(),
    month: d.getMonth()
  };
}

/**
 * Formatea el título del mes y año en español (ej: "Octubre 2026").
 */
export function formatMonthYear(year: number, month: number): string {
  const name = MONTH_NAMES_ES[month] || '';
  return `${name} ${year}`;
}

export interface CalendarDayCell {
  dayNumber: number;
  dateString: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPrevMonth?: boolean;
  isNextMonth?: boolean;
}

/**
 * Genera la matriz de celdas para la cuadrícula mensual de 7 columnas (iniciando en Domingo = 0).
 */
export function getMonthMatrix(year: number, month: number): {
  year: number;
  month: number;
  monthName: string;
  totalDays: number;
  firstDayOfWeek: number;
  cells: CalendarDayCell[];
} {
  const totalDays = getDaysInMonth(year, month);
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Domingo, 1 = Lunes, ...
  const todayStr = getTodayCalendarDate();

  const prevMonthInfo = addMonths(year, month, -1);
  const prevMonthTotalDays = getDaysInMonth(prevMonthInfo.year, prevMonthInfo.month);

  const cells: CalendarDayCell[] = [];

  // 1. Celdas de relleno del mes anterior
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthTotalDays - i;
    const mStr = String(prevMonthInfo.month + 1).padStart(2, '0');
    const dStr = String(dayNum).padStart(2, '0');
    const dateString = `${prevMonthInfo.year}-${mStr}-${dStr}`;
    cells.push({
      dayNumber: dayNum,
      dateString,
      isCurrentMonth: false,
      isPrevMonth: true,
      isToday: dateString === todayStr
    });
  }

  // 2. Celdas del mes actual
  for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(dayNum).padStart(2, '0');
    const dateString = `${year}-${mStr}-${dStr}`;
    cells.push({
      dayNumber: dayNum,
      dateString,
      isCurrentMonth: true,
      isToday: dateString === todayStr
    });
  }

  // 3. Celdas de relleno del mes siguiente (para completar múltiplos de 7)
  const nextMonthInfo = addMonths(year, month, 1);
  const remainingCells = (7 - (cells.length % 7)) % 7;
  for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
    const mStr = String(nextMonthInfo.month + 1).padStart(2, '0');
    const dStr = String(dayNum).padStart(2, '0');
    const dateString = `${nextMonthInfo.year}-${mStr}-${dStr}`;
    cells.push({
      dayNumber: dayNum,
      dateString,
      isCurrentMonth: false,
      isNextMonth: true,
      isToday: dateString === todayStr
    });
  }

  return {
    year,
    month,
    monthName: MONTH_NAMES_ES[month],
    totalDays,
    firstDayOfWeek,
    cells
  };
}

/**
 * Formatea una fecha de calendario a texto legible en español.
 */
export function formatCalendarDateDisplay(dateStr?: string): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length !== 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;
  const monthName = MONTH_NAMES_ES[m] || '';
  return `${d} de ${monthName.toLowerCase()} de ${y}`;
}

export { MONTH_NAMES_ES, DAY_NAMES_ES };
