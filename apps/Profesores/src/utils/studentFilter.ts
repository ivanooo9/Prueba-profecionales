/**
 * Utilidad de filtrado y normalización para búsqueda de estudiantes en el módulo Profesores.
 * Compatible con los tipos actuales sin requerir modificaciones en teacher.ts.
 */

export function normalizeSearchText(text?: string | null): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export interface SearchableStudent {
  firstName?: string;
  lastName?: string;
  studentName?: string;
  fullName?: string;
  name?: string;
  identification?: string;
  email?: string;
  [key: string]: any;
}

/**
 * Determina si un estudiante coincide con la consulta de búsqueda.
 * Busca por:
 * - Nombre (firstName)
 * - Apellido (lastName)
 * - Nombre completo (firstName + lastName y lastName + firstName)
 * - Nombre directo (studentName / fullName / name en históricos)
 * - Identificación / Cédula / Código (identification)
 * - Correo electrónico (email)
 */
export function matchesStudentQuery(
  student: SearchableStudent,
  query: string
): boolean {
  if (!query || !query.trim()) return true;

  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const firstName = normalizeSearchText(student.firstName);
  const lastName = normalizeSearchText(student.lastName);
  const studentName = normalizeSearchText(student.studentName || student.fullName || student.name);
  const fullName = normalizeSearchText(`${student.firstName || ''} ${student.lastName || ''}`);
  const reverseFullName = normalizeSearchText(`${student.lastName || ''} ${student.firstName || ''}`);
  const identification = normalizeSearchText(student.identification);
  const email = normalizeSearchText(student.email);

  return (
    firstName.includes(normalizedQuery) ||
    lastName.includes(normalizedQuery) ||
    studentName.includes(normalizedQuery) ||
    fullName.includes(normalizedQuery) ||
    reverseFullName.includes(normalizedQuery) ||
    identification.includes(normalizedQuery) ||
    email.includes(normalizedQuery)
  );
}
