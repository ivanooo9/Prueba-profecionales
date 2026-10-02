import type { BankAccount } from "@prisma/client";

import { db } from "./db";

type BankAccountClient = {
  bankAccount: {
    findMany: typeof db.bankAccount.findMany;
    findFirst: typeof db.bankAccount.findFirst;
  };
};

const publicBankAccountSelect = {
  id: true,
  type: true,
  institution: true,
  accountType: true,
  accountNumber: true,
  taxId: true,
  beneficiaryName: true,
  qrImageUrl: true,
} as const;

export function formatBankAccountLabel(account: Pick<BankAccount, "type" | "institution" | "accountType" | "accountNumber">): string {
  if (account.type.toUpperCase() === "QR") {
    return `${account.institution} - QR`;
  }

  return [account.institution, account.accountType, account.accountNumber].filter(Boolean).join(" - ");
}

export function buildBankAccountSnapshot(account: Pick<BankAccount, "id" | "type" | "institution" | "accountType" | "accountNumber" | "taxId" | "beneficiaryName" | "qrImageUrl">) {
  return {
    id: account.id,
    type: account.type,
    institution: account.institution,
    accountType: account.accountType,
    accountNumber: account.accountNumber,
    taxId: account.taxId,
    beneficiaryName: account.beneficiaryName,
    qrImageUrl: account.qrImageUrl,
  };
}

export async function getActiveBankAccounts(client: BankAccountClient = db) {
  return client.bankAccount.findMany({
    where: { isActive: true, deletedAt: null },
    select: publicBankAccountSelect,
    orderBy: [{ institution: "asc" }, { id: "asc" }],
  });
}

export function parseSubmittedBankAccountId(body: Record<string, unknown>): number | null {
  const raw = body.bankAccountId ?? body.paymentBankAccountId;
  if (typeof raw !== "string" && typeof raw !== "number") {
    return null;
  }

  const parsed = parseInt(String(raw), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function findActiveBankAccountById(client: BankAccountClient, id: number) {
  return client.bankAccount.findFirst({
    where: { id, isActive: true, deletedAt: null },
    select: publicBankAccountSelect,
  });
}
