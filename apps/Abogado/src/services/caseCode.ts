import { LegalCase } from '../types';

export const generateNextCaseCode = (cases: LegalCase[], date = new Date()): string => {
  const year = date.getFullYear();
  const prefix = `CAS-${year}-`;
  const caseCodePattern = new RegExp(`^CAS-${year}-(\\d{4})$`, 'i');
  const highestSequence = cases.reduce((highest, caseItem) => {
    const match = caseItem.caseNumber.trim().match(caseCodePattern);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  return `${prefix}${String(highestSequence + 1).padStart(4, '0')}`;
};
