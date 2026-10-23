import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isLeapYear,
  getDaysInMonth,
  addMonths,
  formatMonthYear,
  getMonthMatrix,
  getTodayCalendarDate,
  formatCalendarDateDisplay
} from './dateUtils';

test('isLeapYear identifies leap years and common years accurately', () => {
  assert.equal(isLeapYear(2024), true, '2024 es bisiesto');
  assert.equal(isLeapYear(2028), true, '2028 es bisiesto');
  assert.equal(isLeapYear(2000), true, '2000 es bisiesto (múltiplo de 400)');
  assert.equal(isLeapYear(2026), false, '2026 no es bisiesto');
  assert.equal(isLeapYear(2027), false, '2027 no es bisiesto');
  assert.equal(isLeapYear(2100), false, '2100 no es bisiesto (múltiplo de 100 no divisible por 400)');
});

test('getDaysInMonth returns exact days for every month including leap Februaries', () => {
  // Febrero en bisiesto vs normal
  assert.equal(getDaysInMonth(2024, 1), 29, 'Febrero 2024 tiene 29 días');
  assert.equal(getDaysInMonth(2026, 1), 28, 'Febrero 2026 tiene 28 días');
  assert.equal(getDaysInMonth(2028, 1), 29, 'Febrero 2028 tiene 29 días');

  // Meses de 31 días
  assert.equal(getDaysInMonth(2026, 0), 31, 'Enero tiene 31 días');
  assert.equal(getDaysInMonth(2026, 2), 31, 'Marzo tiene 31 días');
  assert.equal(getDaysInMonth(2026, 4), 31, 'Mayo tiene 31 días');
  assert.equal(getDaysInMonth(2026, 6), 31, 'Julio tiene 31 días');
  assert.equal(getDaysInMonth(2026, 7), 31, 'Agosto tiene 31 días');
  assert.equal(getDaysInMonth(2026, 9), 31, 'Octubre tiene 31 días');
  assert.equal(getDaysInMonth(2026, 11), 31, 'Diciembre tiene 31 días');

  // Meses de 30 días
  assert.equal(getDaysInMonth(2026, 3), 30, 'Abril tiene 30 días');
  assert.equal(getDaysInMonth(2026, 5), 30, 'Junio tiene 30 días');
  assert.equal(getDaysInMonth(2026, 8), 30, 'Septiembre tiene 30 días');
  assert.equal(getDaysInMonth(2026, 10), 30, 'Noviembre tiene 30 días');
});

test('addMonths navigates seamlessly across months and year transitions', () => {
  // Navegación dentro del mismo año
  assert.deepEqual(addMonths(2026, 4, 1), { year: 2026, month: 5 }, 'Mayo a Junio');
  assert.deepEqual(addMonths(2026, 4, -1), { year: 2026, month: 3 }, 'Mayo a Abril');

  // Transición de Diciembre a Enero (avance de año)
  assert.deepEqual(addMonths(2026, 11, 1), { year: 2027, month: 0 }, 'Diciembre 2026 a Enero 2027');

  // Transición de Enero a Diciembre (retroceso de año)
  assert.deepEqual(addMonths(2026, 0, -1), { year: 2025, month: 11 }, 'Enero 2026 a Diciembre 2025');

  // Saltos múltiples de meses
  assert.deepEqual(addMonths(2026, 2, 14), { year: 2027, month: 4 }, 'Marzo 2026 + 14 meses = Mayo 2027');
});

test('formatMonthYear formats Spanish month and year names cleanly', () => {
  assert.equal(formatMonthYear(2026, 9), 'Octubre 2026');
  assert.equal(formatMonthYear(2027, 0), 'Enero 2027');
  assert.equal(formatMonthYear(2026, 1), 'Febrero 2026');
  assert.equal(formatMonthYear(2026, 11), 'Diciembre 2026');
});

test('getMonthMatrix generates a complete 7-column grid with exact padding and day offsets', () => {
  // Octubre 2026: 1 de Octubre 2026 es Jueves (getDay() = 4), 31 días
  const matrixOct2026 = getMonthMatrix(2026, 9);
  assert.equal(matrixOct2026.totalDays, 31);
  assert.equal(matrixOct2026.firstDayOfWeek, 4); // Jueves

  // Debe tener 4 celdas previas (Dom, Lun, Mar, Mié) del 27, 28, 29, 30 de Septiembre
  assert.equal(matrixOct2026.cells.length % 7, 0, 'La matriz debe ser múltiplo de 7 columnas');
  assert.equal(matrixOct2026.cells[0].isCurrentMonth, false);
  assert.equal(matrixOct2026.cells[0].dateString, '2026-09-27');
  assert.equal(matrixOct2026.cells[3].dateString, '2026-09-30');

  // El 1 de Octubre debe ser la 5ta celda (índice 4)
  assert.equal(matrixOct2026.cells[4].isCurrentMonth, true);
  assert.equal(matrixOct2026.cells[4].dayNumber, 1);
  assert.equal(matrixOct2026.cells[4].dateString, '2026-10-01');

  // El 31 de Octubre debe ser el último día del mes actual
  const currentMonthCells = matrixOct2026.cells.filter((c) => c.isCurrentMonth);
  assert.equal(currentMonthCells.length, 31);
  assert.equal(currentMonthCells[30].dayNumber, 31);
  assert.equal(currentMonthCells[30].dateString, '2026-10-31');

  // Febrero 2024 (Bisiesto): 1 de Febrero 2024 es Jueves (getDay() = 4), 29 días
  const matrixFeb2024 = getMonthMatrix(2024, 1);
  assert.equal(matrixFeb2024.totalDays, 29);
  const febCurrentCells = matrixFeb2024.cells.filter((c) => c.isCurrentMonth);
  assert.equal(febCurrentCells.length, 29);
  assert.equal(febCurrentCells[28].dayNumber, 29);
  assert.equal(febCurrentCells[28].dateString, '2024-02-29');
});

test('getTodayCalendarDate produces a standard YYYY-MM-DD string without timezone drift', () => {
  const today = getTodayCalendarDate();
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/, 'Debe cumplir formato YYYY-MM-DD');
  const [y, m, d] = today.split('-').map(Number);
  const now = new Date();
  assert.equal(y, now.getFullYear());
  assert.equal(m, now.getMonth() + 1);
  assert.equal(d, now.getDate());
});

test('formatCalendarDateDisplay formats human-readable Spanish dates', () => {
  assert.equal(formatCalendarDateDisplay('2026-10-03'), '3 de octubre de 2026');
  assert.equal(formatCalendarDateDisplay('2027-01-15'), '15 de enero de 2027');
});
